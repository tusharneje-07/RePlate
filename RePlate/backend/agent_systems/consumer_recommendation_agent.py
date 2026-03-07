"""ConsumerRecommendationAgent: AI-powered personalised food suggestions.

Analyses a consumer's order history, favorites, dietary preferences, and
the currently available listings to generate:
1. Personalised food recommendations with match reasons
2. "You might also like" cross-category suggestions
3. Sustainability tip based on their impact stats
4. Trending picks in their city
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from agent_systems.groq_client import call_groq_async


async def _fetch_consumer_history(db: AsyncSession, consumer_id: str) -> dict[str, Any]:
    """Fetch the consumer's order history and preferences."""
    sql = text(
        """
        SELECT
            oi.listing_title,
            f.category,
            f.food_type,
            f.dietary_tags,
            f.cuisine_type,
            o.created_at
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN food_listings f ON f.id = oi.food_listing_id
        WHERE o.consumer_id = :cid
          AND o.status IN ('completed', 'confirmed', 'preparing', 'ready_for_pickup')
        ORDER BY o.created_at DESC
        LIMIT 30
        """
    )
    result = await db.execute(sql, {"cid": consumer_id})
    rows = result.mappings().all()

    categories: dict[str, int] = {}
    food_types: dict[str, int] = {}
    cuisines: dict[str, int] = {}
    tags: dict[str, int] = {}

    for row in rows:
        cat = str(row["category"] or "")
        if cat:
            categories[cat] = categories.get(cat, 0) + 1
        ft = str(row["food_type"] or "")
        if ft:
            food_types[ft] = food_types.get(ft, 0) + 1
        cu = str(row["cuisine_type"] or "")
        if cu:
            cuisines[cu] = cuisines.get(cu, 0) + 1
        for tag in (row["dietary_tags"] or "").split(","):
            t = tag.strip()
            if t:
                tags[t] = tags.get(t, 0) + 1

    return {
        "order_count": len(rows),
        "top_categories": sorted(categories.items(), key=lambda x: -x[1])[:3],
        "top_food_types": sorted(food_types.items(), key=lambda x: -x[1])[:2],
        "top_cuisines": sorted(cuisines.items(), key=lambda x: -x[1])[:3],
        "top_tags": sorted(tags.items(), key=lambda x: -x[1])[:5],
    }


async def _fetch_consumer_impact(db: AsyncSession, consumer_id: str) -> dict[str, Any]:
    sql = text(
        """
        SELECT total_orders, total_co2_saved, total_meals_rescued, level
        FROM impact_stats WHERE consumer_id = :cid LIMIT 1
        """
    )
    result = await db.execute(sql, {"cid": consumer_id})
    row = result.mappings().first()
    if row is None:
        return {"total_orders": 0, "total_co2_saved": 0.0, "level": "seedling"}
    return {
        "total_orders": int(row["total_orders"]),
        "total_co2_saved": float(row["total_co2_saved"]),
        "total_meals_rescued": int(row["total_meals_rescued"]),
        "level": str(row["level"]),
    }


async def _fetch_available_listings(
    db: AsyncSession,
    limit: int = 20,
    consumer_lat: float = 0.0,
    consumer_lon: float = 0.0,
) -> list[dict[str, Any]]:
    sql = text(
        """
        SELECT
            f.id, f.title, f.category, f.food_type,
            f.discounted_price AS price, f.discount_percent,
            f.dietary_tags, f.cuisine_type,
            f.seller_name, f.rating,
            COALESCE(f.expires_at, '') AS expires_at,
            COALESCE(f.seller_distance_km, 5.0) AS distance_km,
            f.freshness_score, f.popularity_score
        FROM food_listings f
        WHERE f.is_active = TRUE
          AND f.quantity_available > 0
          AND f.deleted_at IS NULL
          AND f.is_donation = FALSE
        ORDER BY f.popularity_score DESC, f.discount_percent DESC
        LIMIT :lim
        """
    )
    result = await db.execute(sql, {"lim": limit})
    rows = result.mappings().all()
    return [
        {
            "id": str(r["id"]),
            "title": str(r["title"]),
            "category": str(r["category"]),
            "food_type": str(r["food_type"] or "veg"),
            "price": float(r["price"]),
            "discount_percent": int(r["discount_percent"]),
            "dietary_tags": str(r["dietary_tags"] or ""),
            "cuisine_type": str(r["cuisine_type"] or ""),
            "seller_name": str(r["seller_name"] or ""),
            "rating": float(r["rating"] or 0.0),
            "distance_km": float(r["distance_km"] or 5.0),
            "freshness_score": float(r["freshness_score"] or 50.0),
            "popularity_score": float(r["popularity_score"] or 50.0),
        }
        for r in rows
    ]


def _rule_based_recommendations(
    listings: list[dict[str, Any]],
    history: dict[str, Any],
) -> list[dict[str, Any]]:
    """Simple rule-based recs when AI is unavailable."""
    top_cats = {c for c, _ in history.get("top_categories", [])}
    recs = []
    for l in listings[:8]:
        match = l["category"] in top_cats
        recs.append(
            {
                "listing_id": l["id"],
                "title": l["title"],
                "category": l["category"],
                "match_score": 85 if match else 60,
                "match_reason": "Matches your favourite category."
                if match
                else "Popular near you.",
                "price": l["price"],
                "discount_percent": l["discount_percent"],
                "seller_name": l["seller_name"],
                "distance_km": l["distance_km"],
                "tag": "Favourite Category" if match else "Trending",
            }
        )
    recs.sort(key=lambda x: -x["match_score"])
    return recs[:6]


async def get_personalised_recommendations(
    db: AsyncSession,
    consumer_id: str,
    *,
    consumer_lat: float = 0.0,
    consumer_lon: float = 0.0,
    limit: int = 6,
) -> dict[str, Any]:
    """Generate AI-personalised food recommendations for a consumer.

    Returns:
        {
            recommendations: [...],
            sustainability_tip: str,
            trending_picks: [...],
            ai_powered: bool,
        }
    """
    history = await _fetch_consumer_history(db, consumer_id)
    impact = await _fetch_consumer_impact(db, consumer_id)
    listings = await _fetch_available_listings(
        db, limit=20, consumer_lat=consumer_lat, consumer_lon=consumer_lon
    )

    if not listings:
        return {
            "recommendations": [],
            "sustainability_tip": "No food listings available right now. Check back soon!",
            "trending_picks": [],
            "ai_powered": False,
        }

    listings_text = "\n".join(
        f"[{i + 1}] ID={l['id']} | {l['title']} | {l['category']} | {l['food_type']} | "
        f"₹{l['price']} ({l['discount_percent']}% off) | {l['distance_km']:.1f}km | "
        f"Rating: {l['rating']:.1f} | Tags: {l['dietary_tags']}"
        for i, l in enumerate(listings)
    )

    history_text = (
        f"Ordered {history['order_count']} times.\n"
        f"Favourite categories: {', '.join(c for c, _ in history['top_categories']) or 'None yet'}.\n"
        f"Food preference: {', '.join(ft for ft, _ in history['top_food_types']) or 'Not determined'}.\n"
        f"Dietary tags: {', '.join(t for t, _ in history['top_tags']) or 'None'}.\n"
        f"Impact level: {impact['level']}, CO₂ saved: {impact['total_co2_saved']:.1f}kg"
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a food recommendation AI for RePlate, a surplus food platform. "
                "Personalise food suggestions based on purchase history, dietary preferences, and sustainability impact. "
                "Return JSON: "
                "recommendations (array, max 6 items, each: listing_id, title, category, match_score 0-100, "
                "match_reason string, price float, discount_percent int, seller_name, distance_km, tag string), "
                "sustainability_tip (one actionable sentence based on their impact level), "
                "trending_picks (array of 3 listing_ids from the most popular/discounted options)."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Consumer history:\n{history_text}\n\n"
                f"Available listings:\n{listings_text}\n\n"
                f"Pick the top {limit} personalised recommendations. "
                "Explain the match reason briefly. Suggest a sustainability tip based on their level."
            ),
        },
    ]

    try:
        llm = await call_groq_async(messages, temperature=0.4, max_tokens=900)
        recs = llm.get("recommendations", [])
        if not recs:
            recs = _rule_based_recommendations(listings, history)
        trending = llm.get("trending_picks", [l["id"] for l in listings[:3]])
        tip = llm.get(
            "sustainability_tip",
            f"You've saved {impact['total_co2_saved']:.1f}kg of CO₂ — keep going!",
        )
        return {
            "recommendations": recs[:limit],
            "sustainability_tip": tip,
            "trending_picks": trending[:3],
            "consumer_level": impact["level"],
            "ai_powered": True,
        }
    except Exception:
        recs = _rule_based_recommendations(listings, history)
        return {
            "recommendations": recs,
            "sustainability_tip": f"You've saved {impact['total_co2_saved']:.1f}kg of CO₂ — keep ordering sustainably!",
            "trending_picks": [l["id"] for l in listings[:3]],
            "consumer_level": impact["level"],
            "ai_powered": False,
        }
