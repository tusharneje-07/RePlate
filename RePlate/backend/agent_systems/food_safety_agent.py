"""FoodSafetyAgent: AI-powered complaint triage and food safety scoring.

For each complaint submitted, this agent:
1. Assigns a severity score (0-10)
2. Determines the urgency level (CRITICAL / HIGH / MEDIUM / LOW)
3. Recommends an action (immediate suspension, warning, investigation, dismiss)
4. Extracts key safety signals from the complaint text
5. Provides a concise triage summary for inspectors

Also provides a standalone food safety scoring endpoint for sellers.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from agent_systems.groq_client import call_groq_async


def _now() -> datetime:
    return datetime.now(timezone.utc)


SEVERITY_RULES = {
    "food_quality": {
        "base": 5,
        "keywords": {"mold": 3, "rotten": 3, "spoiled": 2, "smell": 1, "stale": 1},
    },
    "hygiene": {
        "base": 6,
        "keywords": {"cockroach": 4, "rat": 4, "pest": 3, "dirty": 2, "unclean": 2},
    },
    "misleading_info": {
        "base": 4,
        "keywords": {"expired": 3, "fake": 3, "wrong": 1, "incorrect": 1},
    },
    "other": {"base": 3, "keywords": {}},
}


def _rule_based_severity(complaint_type: str, description: str) -> int:
    desc_lower = description.lower()
    rule = SEVERITY_RULES.get(complaint_type, SEVERITY_RULES["other"])
    score = rule["base"]
    for kw, delta in rule["keywords"].items():
        if kw in desc_lower:
            score += delta
    return min(10, score)


def _urgency_from_score(score: int) -> str:
    if score >= 8:
        return "CRITICAL"
    if score >= 6:
        return "HIGH"
    if score >= 4:
        return "MEDIUM"
    return "LOW"


def _recommended_action(urgency: str, complaint_type: str) -> str:
    if urgency == "CRITICAL":
        return "Immediately suspend listing and notify inspector for emergency inspection"
    if urgency == "HIGH" and complaint_type == "hygiene":
        return "Flag listing for urgent hygiene inspection within 24 hours"
    if urgency == "HIGH":
        return "Escalate to inspector — investigate within 48 hours"
    if urgency == "MEDIUM":
        return "Queue for routine inspection — notify seller with warning"
    return "Log complaint — monitor for repeat reports"


async def triage_complaint(
    complaint_text: str,
    complaint_type: str,
    *,
    listing_title: str = "",
    seller_name: str = "",
    previous_violations: int = 0,
) -> dict[str, Any]:
    """Use AI to triage a food safety complaint.

    Returns:
        {
            severity_score: int (0-10),
            urgency: str,
            recommended_action: str,
            safety_signals: list[str],
            triage_summary: str,
            auto_suspend: bool,
            ai_powered: bool,
        }
    """
    context_parts = []
    if listing_title:
        context_parts.append(f"Food listing: {listing_title}")
    if seller_name:
        context_parts.append(f"Seller: {seller_name}")
    if previous_violations > 0:
        context_parts.append(f"Previous violations by this seller: {previous_violations}")
    context = " | ".join(context_parts)

    messages = [
        {
            "role": "system",
            "content": (
                "You are a food safety inspector AI for RePlate, a food redistribution platform. "
                "Your task: triage food safety complaints and flag genuine safety risks. "
                "Be conservative — when in doubt, escalate. "
                "Return JSON with: severity_score (int 0-10), urgency (CRITICAL/HIGH/MEDIUM/LOW), "
                "recommended_action (string), safety_signals (array of strings, max 5), "
                "triage_summary (2 sentences), auto_suspend (bool — true only for score >= 8)."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Complaint type: {complaint_type}\n"
                f"Context: {context}\n"
                f"Complaint description:\n{complaint_text}\n\n"
                "Triage this complaint. Identify specific safety signals from the text."
            ),
        },
    ]

    try:
        llm = await call_groq_async(messages, temperature=0.1, max_tokens=400)
        severity = int(llm.get("severity_score", 5))
        severity = max(0, min(10, severity))
        urgency = llm.get("urgency", _urgency_from_score(severity))
        action = llm.get("recommended_action", _recommended_action(urgency, complaint_type))
        signals = llm.get("safety_signals", [])
        if not isinstance(signals, list):
            signals = [str(signals)]
        # Bump severity if seller has prior violations
        if previous_violations >= 3 and severity < 8:
            severity = min(10, severity + 2)
            urgency = _urgency_from_score(severity)
        return {
            "severity_score": severity,
            "urgency": urgency,
            "recommended_action": action,
            "safety_signals": signals[:5],
            "triage_summary": llm.get("triage_summary", "AI-generated triage."),
            "auto_suspend": bool(llm.get("auto_suspend", severity >= 8)),
            "ai_powered": True,
        }
    except Exception:
        severity = _rule_based_severity(complaint_type, complaint_text)
        if previous_violations >= 3:
            severity = min(10, severity + 2)
        urgency = _urgency_from_score(severity)
        return {
            "severity_score": severity,
            "urgency": urgency,
            "recommended_action": _recommended_action(urgency, complaint_type),
            "safety_signals": ["Rule-based triage (AI unavailable)"],
            "triage_summary": f"Rule-based triage: {urgency} severity complaint about {complaint_type}.",
            "auto_suspend": severity >= 8,
            "ai_powered": False,
        }


async def score_food_listing_safety(
    listing_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Score the safety profile of an existing food listing.

    Considers: expiry, description quality, seller violation history,
    complaint count, and food category risk.
    """
    sql = text(
        """
        SELECT
            f.title, f.category, f.expires_at, f.description,
            f.food_type, f.dietary_tags, f.seller_name,
            COALESCE(
                (SELECT COUNT(*) FROM complaint_records cr
                 WHERE cr.listing_id = f.id AND cr.complaint_status != 'rejected'),
                0
            ) AS open_complaints,
            COALESCE(
                (SELECT COUNT(*) FROM violation_records vr WHERE vr.seller_id = f.seller_id),
                0
            ) AS seller_violations
        FROM food_listings f
        WHERE f.id = :lid
        """
    )
    result = await db.execute(sql, {"lid": listing_id})
    row = result.mappings().first()
    if row is None:
        return {"error": "Listing not found"}

    # Calculate expiry hours
    expiry_hours = 999.0
    if row["expires_at"]:
        try:
            from datetime import timezone as tz

            expiry_dt = datetime.fromisoformat(str(row["expires_at"]).replace("Z", "+00:00"))
            if expiry_dt.tzinfo is None:
                expiry_dt = expiry_dt.replace(tzinfo=tz.utc)
            expiry_hours = max(0.0, (expiry_dt - _now()).total_seconds() / 3600)
        except Exception:
            pass

    open_complaints = int(row["open_complaints"])
    seller_violations = int(row["seller_violations"])

    messages = [
        {
            "role": "system",
            "content": (
                "You are a food safety AI for RePlate. Score a food listing's safety profile. "
                "Return JSON: safety_score (int 0-100, 100=perfectly safe), risk_level (LOW/MEDIUM/HIGH/CRITICAL), "
                "risk_factors (array of strings), recommendations (array of strings), summary (one sentence)."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Listing: {row['title']}\n"
                f"Category: {row['category']}\n"
                f"Food type: {row['food_type']}\n"
                f"Description: {str(row['description'] or '')[:300]}\n"
                f"Expiry in hours: {expiry_hours:.1f}\n"
                f"Open complaints: {open_complaints}\n"
                f"Seller past violations: {seller_violations}\n"
                "Assess safety. Lower score = more risk."
            ),
        },
    ]

    try:
        llm = await call_groq_async(messages, temperature=0.1, max_tokens=350)
        return {
            "listing_id": listing_id,
            "title": str(row["title"]),
            "safety_score": int(llm.get("safety_score", 70)),
            "risk_level": llm.get("risk_level", "MEDIUM"),
            "risk_factors": llm.get("risk_factors", []),
            "recommendations": llm.get("recommendations", []),
            "summary": llm.get("summary", ""),
            "expiry_hours_remaining": round(expiry_hours, 1),
            "open_complaints": open_complaints,
            "seller_violations": seller_violations,
            "ai_powered": True,
        }
    except Exception:
        # Rule-based fallback
        score = 80
        risk_factors = []
        if expiry_hours < 3:
            score -= 30
            risk_factors.append("Expiring very soon (< 3 hours)")
        elif expiry_hours < 6:
            score -= 15
            risk_factors.append("Expiring soon (< 6 hours)")
        if open_complaints > 0:
            score -= open_complaints * 10
            risk_factors.append(f"{open_complaints} open complaint(s)")
        if seller_violations > 0:
            score -= seller_violations * 5
            risk_factors.append(f"Seller has {seller_violations} past violation(s)")
        score = max(0, min(100, score))
        return {
            "listing_id": listing_id,
            "title": str(row["title"]),
            "safety_score": score,
            "risk_level": "CRITICAL"
            if score < 40
            else ("HIGH" if score < 60 else ("MEDIUM" if score < 75 else "LOW")),
            "risk_factors": risk_factors,
            "recommendations": ["Rule-based assessment — AI unavailable"],
            "summary": f"Rule-based safety score: {score}/100",
            "expiry_hours_remaining": round(expiry_hours, 1),
            "open_complaints": open_complaints,
            "seller_violations": seller_violations,
            "ai_powered": False,
        }
