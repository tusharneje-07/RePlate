"""NGOMatchingAgent: AI-powered smart matching of NGOs to available food donations.

Given an NGO's profile and a list of nearby food listings marked as donations,
this agent uses Groq to:
1. Score and rank donations by suitability for the NGO
2. Explain why each match is good (or not)
3. Flag time-critical donations needing immediate attention
4. Suggest an optimal pickup sequence
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from agent_systems.groq_client import call_groq_async


@dataclass
class NGOContext:
    ngo_id: str
    org_name: str
    ngo_type: str
    city: str
    serving_capacity_kg: float
    lat: float
    lon: float


@dataclass
class DonationContext:
    listing_id: str
    title: str
    category: str
    quantity_kg: float
    food_type: str  # veg / nonveg / vegan
    dietary_tags: list[str]
    distance_km: float
    expiry_hours: float
    seller_name: str
    is_halal: bool
    description: str


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    s = str(value)
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    parsed = datetime.fromisoformat(s)
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed


def _hours_until(dt: datetime) -> float:
    return max(0.0, (dt - _now()).total_seconds() / 3600)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Simple haversine distance calculation."""
    from math import radians, cos, sin, asin, sqrt

    R = 6371.0
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * R * asin(sqrt(a))


async def fetch_ngo_context(db: AsyncSession, ngo_user_id: str) -> NGOContext:
    sql = text(
        """
        SELECT
            u.id AS ngo_id,
            n.organization_name AS org_name,
            n.ngo_type,
            n.city,
            COALESCE(n.serving_capacity, 100) AS serving_capacity_kg,
            COALESCE(n.lat, 19.076) AS lat,
            COALESCE(n.lng, 72.877) AS lon
        FROM users u
        JOIN ngo_profiles n ON n.user_id = u.id
        WHERE u.id = :uid
        """
    )
    result = await db.execute(sql, {"uid": ngo_user_id})
    row = result.mappings().first()
    if row is None:
        raise ValueError(f"NGO profile not found for user {ngo_user_id}")
    return NGOContext(
        ngo_id=str(row["ngo_id"]),
        org_name=str(row["org_name"] or "NGO"),
        ngo_type=str(row["ngo_type"] or "OTHER"),
        city=str(row["city"] or ""),
        serving_capacity_kg=float(row["serving_capacity_kg"]),
        lat=float(row["lat"]),
        lon=float(row["lon"]),
    )


async def fetch_nearby_donations(
    db: AsyncSession, lat: float, lon: float, radius_km: float = 50.0, limit: int = 15
) -> list[DonationContext]:
    sql = text(
        """
        SELECT
            f.id AS listing_id,
            f.title,
            f.category,
            COALESCE(f.quantity_available, 1) AS quantity_kg,
            f.food_type,
            COALESCE(f.dietary_tags, '') AS dietary_tags,
            COALESCE(f.seller_lat, 0) AS seller_lat,
            COALESCE(f.seller_lng, 0) AS seller_lng,
            COALESCE(f.expires_at, '') AS expires_at,
            COALESCE(f.seller_name, 'Unknown Seller') AS seller_name,
            COALESCE(f.description, '') AS description,
            (
                6371 * ACOS(
                    COS(RADIANS(:lat)) * COS(RADIANS(COALESCE(f.seller_lat, 0)))
                    * COS(RADIANS(COALESCE(f.seller_lng, 0)) - RADIANS(:lon))
                    + SIN(RADIANS(:lat)) * SIN(RADIANS(COALESCE(f.seller_lat, 0)))
                )
            ) AS distance_km
        FROM food_listings f
        WHERE f.is_donation = TRUE
          AND f.is_active = TRUE
          AND f.quantity_available > 0
          AND f.deleted_at IS NULL
        HAVING distance_km <= :radius
        ORDER BY distance_km ASC
        LIMIT :lim
        """
    )
    result = await db.execute(sql, {"lat": lat, "lon": lon, "radius": radius_km, "lim": limit})
    rows = result.mappings().all()

    donations: list[DonationContext] = []
    for row in rows:
        expiry_hours = 0.0
        if row["expires_at"]:
            try:
                expiry_hours = _hours_until(_parse_dt(row["expires_at"]))
            except Exception:
                expiry_hours = 24.0

        tags_raw = str(row["dietary_tags"])
        tags = [t.strip() for t in tags_raw.split(",") if t.strip()]
        is_halal = "halal" in tags_raw.lower()

        donations.append(
            DonationContext(
                listing_id=str(row["listing_id"]),
                title=str(row["title"]),
                category=str(row["category"]),
                quantity_kg=float(row["quantity_kg"]),
                food_type=str(row["food_type"] or "veg"),
                dietary_tags=tags,
                distance_km=float(row["distance_km"]),
                expiry_hours=expiry_hours,
                seller_name=str(row["seller_name"]),
                is_halal=is_halal,
                description=str(row["description"])[:200],
            )
        )
    return donations


def _fallback_ranking(donations: list[DonationContext], ngo: NGOContext) -> list[dict[str, Any]]:
    """Rule-based ranking when AI is unavailable."""
    scored = []
    for d in donations:
        # Score: closer + more urgent = higher score
        urgency = max(0.0, 1.0 - d.expiry_hours / 24.0)
        proximity = max(0.0, 1.0 - d.distance_km / 50.0)
        score = round((urgency * 0.6 + proximity * 0.4) * 100, 1)
        scored.append(
            {
                "listing_id": d.listing_id,
                "title": d.title,
                "match_score": score,
                "urgency": "CRITICAL"
                if d.expiry_hours < 3
                else ("HIGH" if d.expiry_hours < 6 else "MEDIUM"),
                "distance_km": round(d.distance_km, 1),
                "expiry_hours": round(d.expiry_hours, 1),
                "quantity_kg": d.quantity_kg,
                "seller_name": d.seller_name,
                "match_reason": "Rule-based: prioritised by urgency and proximity.",
                "pickup_priority": 1 if d.expiry_hours < 3 else (2 if d.expiry_hours < 6 else 3),
            }
        )
    scored.sort(key=lambda x: (-x["match_score"], x["distance_km"]))
    return scored


async def match_ngo_to_donations(
    db: AsyncSession,
    ngo_user_id: str,
    *,
    radius_km: float = 50.0,
) -> dict[str, Any]:
    """Match an NGO to the best available food donations using AI.

    Returns:
        {
            "ngo": {...},
            "matches": [...ranked donation list with AI scores...],
            "pickup_sequence": [...ordered listing_ids...],
            "summary": "...",
            "ai_powered": bool,
        }
    """
    ngo = await fetch_ngo_context(db, ngo_user_id)
    donations = await fetch_nearby_donations(db, ngo.lat, ngo.lon, radius_km=radius_km)

    if not donations:
        return {
            "ngo": {"org_name": ngo.org_name, "ngo_type": ngo.ngo_type, "city": ngo.city},
            "matches": [],
            "pickup_sequence": [],
            "summary": "No donation listings available in your area right now.",
            "ai_powered": False,
        }

    # Build compact listing summaries for LLM
    listings_text = "\n".join(
        f"[{i + 1}] ID={d.listing_id} | {d.title} | {d.category} | {d.quantity_kg}kg | "
        f"{d.food_type} | {d.distance_km:.1f}km away | {d.expiry_hours:.1f}h until expiry | "
        f"Seller: {d.seller_name} | Halal: {d.is_halal}"
        for i, d in enumerate(donations)
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are an AI food rescue coordinator for RePlate. "
                "Your job: match NGOs to the most suitable food donations, maximising food rescue. "
                "Consider: NGO type, capacity, dietary restrictions compatibility, urgency, and distance. "
                "Return a JSON object with: "
                "matches (array of objects with listing_id, title, match_score 0-100, urgency string, "
                "distance_km, expiry_hours, quantity_kg, seller_name, match_reason string, pickup_priority int 1-5), "
                "pickup_sequence (array of listing_ids in optimal pickup order), "
                "summary (2-sentence overview)."
            ),
        },
        {
            "role": "user",
            "content": (
                f"NGO: {ngo.org_name}\n"
                f"Type: {ngo.ngo_type}\n"
                f"City: {ngo.city}\n"
                f"Serving capacity: {ngo.serving_capacity_kg}kg\n\n"
                f"Available donations nearby (within {radius_km}km):\n{listings_text}\n\n"
                "Rank and match these donations to this NGO. Prioritise critical expiry first, "
                "then by suitability for the NGO type. Include all listings in matches array."
            ),
        },
    ]

    try:
        llm = await call_groq_async(messages, temperature=0.3, max_tokens=800)
        matches = llm.get("matches", [])
        # Merge in any listing_id fields the LLM might have dropped
        seen_ids = {m.get("listing_id") for m in matches}
        for d in donations:
            if d.listing_id not in seen_ids:
                matches.append(
                    {
                        "listing_id": d.listing_id,
                        "title": d.title,
                        "match_score": 50,
                        "urgency": "MEDIUM",
                        "distance_km": round(d.distance_km, 1),
                        "expiry_hours": round(d.expiry_hours, 1),
                        "quantity_kg": d.quantity_kg,
                        "seller_name": d.seller_name,
                        "match_reason": "Added by fallback — not scored by AI.",
                        "pickup_priority": 3,
                    }
                )
        return {
            "ngo": {"org_name": ngo.org_name, "ngo_type": ngo.ngo_type, "city": ngo.city},
            "matches": matches,
            "pickup_sequence": llm.get("pickup_sequence", [m["listing_id"] for m in matches]),
            "summary": llm.get("summary", "AI-powered donation matches generated."),
            "ai_powered": True,
        }
    except Exception:
        matches = _fallback_ranking(donations, ngo)
        return {
            "ngo": {"org_name": ngo.org_name, "ngo_type": ngo.ngo_type, "city": ngo.city},
            "matches": matches,
            "pickup_sequence": [m["listing_id"] for m in matches],
            "summary": "Rule-based matches (AI temporarily unavailable).",
            "ai_powered": False,
        }
