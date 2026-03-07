"""DemandForecastAgent: AI-powered demand forecasting for sellers.

Analyses a seller's historical order patterns to:
1. Predict peak demand hours for today
2. Recommend optimal listing quantities
3. Suggest best times to post new listings for maximum pickup
4. Forecast which categories will sell best this week
5. Alert on potential waste (overstocked items about to expire)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from agent_systems.groq_client import call_groq_async


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _fetch_seller_order_patterns(db: AsyncSession, seller_id: str) -> dict[str, Any]:
    """Fetch hourly/daily order distribution for last 30 days."""
    sql = text(
        """
        SELECT
            HOUR(o.created_at) AS order_hour,
            DAYOFWEEK(o.created_at) AS day_of_week,
            f.category,
            COUNT(oi.id) AS order_count,
            SUM(oi.quantity) AS total_qty
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN food_listings f ON f.id = oi.food_listing_id
        WHERE f.seller_id = :sid
          AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND o.status IN ('completed', 'confirmed', 'preparing', 'ready_for_pickup')
        GROUP BY HOUR(o.created_at), DAYOFWEEK(o.created_at), f.category
        ORDER BY order_count DESC
        """
    )
    result = await db.execute(sql, {"sid": seller_id})
    rows = result.mappings().all()

    hourly: dict[int, int] = {}
    daily: dict[int, int] = {}
    categories: dict[str, int] = {}

    for row in rows:
        h = int(row["order_hour"])
        d = int(row["day_of_week"])
        cat = str(row["category"])
        cnt = int(row["order_count"])
        hourly[h] = hourly.get(h, 0) + cnt
        daily[d] = daily.get(d, 0) + cnt
        categories[cat] = categories.get(cat, 0) + cnt

    return {
        "hourly_distribution": hourly,
        "daily_distribution": daily,
        "category_demand": categories,
        "total_orders_30d": sum(hourly.values()),
    }


async def _fetch_seller_waste_risk(db: AsyncSession, seller_id: str) -> list[dict[str, Any]]:
    """Find listings at high waste risk (expiring soon, lots of stock left)."""
    sql = text(
        """
        SELECT
            f.id, f.title, f.category, f.quantity_available,
            f.original_price, f.discounted_price,
            f.expires_at,
            COALESCE(
                (SELECT COUNT(*) FROM order_items oi
                 JOIN orders o ON o.id = oi.order_id
                 WHERE oi.food_listing_id = f.id AND DATE(o.created_at) = CURDATE()),
                0
            ) AS orders_today
        FROM food_listings f
        WHERE f.seller_id = :sid
          AND f.is_active = TRUE
          AND f.quantity_available >= 3
          AND f.deleted_at IS NULL
          AND f.expires_at IS NOT NULL
        ORDER BY f.expires_at ASC
        LIMIT 10
        """
    )
    result = await db.execute(sql, {"sid": seller_id})
    rows = result.mappings().all()

    at_risk = []
    for row in rows:
        expiry_hours = 999.0
        if row["expires_at"]:
            try:
                dt = datetime.fromisoformat(str(row["expires_at"]).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                expiry_hours = max(0.0, (dt - _now()).total_seconds() / 3600)
            except Exception:
                pass
        if expiry_hours < 12:
            at_risk.append(
                {
                    "listing_id": str(row["id"]),
                    "title": str(row["title"]),
                    "category": str(row["category"]),
                    "quantity_remaining": int(row["quantity_available"]),
                    "expiry_hours": round(expiry_hours, 1),
                    "orders_today": int(row["orders_today"]),
                    "current_price": float(row["discounted_price"]),
                }
            )
    return at_risk


async def _fetch_seller_profile(db: AsyncSession, seller_id: str) -> dict[str, Any]:
    sql = text(
        """
        SELECT s.business_name, s.business_type, s.city
        FROM seller_profiles s WHERE s.user_id = :sid
        """
    )
    result = await db.execute(sql, {"sid": seller_id})
    row = result.mappings().first()
    if row is None:
        return {"business_name": "Seller", "business_type": "restaurant", "city": ""}
    return {
        "business_name": str(row["business_name"] or "Seller"),
        "business_type": str(row["business_type"] or "restaurant"),
        "city": str(row["city"] or ""),
    }


def _day_name(day_of_week: int) -> str:
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
        day_of_week % 7
    ]


def _rule_based_forecast(
    patterns: dict[str, Any], waste_risk: list[dict[str, Any]]
) -> dict[str, Any]:
    hourly = patterns["hourly_distribution"]
    if hourly:
        peak_hour = max(hourly, key=lambda h: hourly[h])
        peak_label = f"{peak_hour:02d}:00 – {(peak_hour + 1) % 24:02d}:00"
    else:
        peak_label = "12:00 – 13:00"
        peak_hour = 12

    top_cats = sorted(patterns["category_demand"].items(), key=lambda x: -x[1])[:3]

    return {
        "peak_hours": [peak_label],
        "optimal_listing_time": f"Post listings 1 hour before peak: {(peak_hour - 1) % 24:02d}:00",
        "top_demand_categories": [c for c, _ in top_cats],
        "waste_risk_alerts": waste_risk,
        "restock_recommendations": [
            f"Consider restocking {c} — it's your top-selling category" for c, _ in top_cats[:2]
        ],
        "weekly_forecast": "Weekend demand is typically 30% higher for restaurant food categories.",
        "summary": f"Based on {patterns['total_orders_30d']} orders in the last 30 days.",
        "ai_powered": False,
    }


async def generate_demand_forecast(
    db: AsyncSession,
    seller_id: str,
) -> dict[str, Any]:
    """Generate AI demand forecast and waste risk alerts for a seller.

    Returns:
        {
            peak_hours: list[str],
            optimal_listing_time: str,
            top_demand_categories: list[str],
            waste_risk_alerts: list[dict],
            restock_recommendations: list[str],
            weekly_forecast: str,
            summary: str,
            ai_powered: bool,
        }
    """
    profile = await _fetch_seller_profile(db, seller_id)
    patterns = await _fetch_seller_order_patterns(db, seller_id)
    waste_risk = await _fetch_seller_waste_risk(db, seller_id)

    today_day = _day_name(_now().isoweekday() % 7)  # Python isoweekday: 1=Mon, MySQL: 1=Sun
    current_hour = _now().hour

    # Build human-readable hour distribution
    hourly = patterns["hourly_distribution"]
    hourly_text = (
        ", ".join(
            f"{h:02d}:00={cnt}orders" for h, cnt in sorted(hourly.items(), key=lambda x: -x[1])[:8]
        )
        or "No data yet"
    )

    daily = patterns["daily_distribution"]
    daily_text = (
        ", ".join(
            f"{_day_name(d)}={cnt}" for d, cnt in sorted(daily.items(), key=lambda x: -x[1])[:4]
        )
        or "No data yet"
    )

    cats = patterns["category_demand"]
    cats_text = (
        ", ".join(f"{c}={cnt}" for c, cnt in sorted(cats.items(), key=lambda x: -x[1])[:5])
        or "No data yet"
    )

    waste_text = (
        "\n".join(
            f"- {w['title']}: {w['quantity_remaining']} units left, expires in {w['expiry_hours']}h, {w['orders_today']} orders today"
            for w in waste_risk
        )
        or "No immediate waste risk detected."
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a food business analytics AI for RePlate. "
                "Analyse seller order patterns and generate actionable demand forecasts. "
                "Focus on: when to list food for maximum sales, what categories sell best, "
                "and how to prevent food waste. "
                "Return JSON: peak_hours (array of strings like '12:00-13:00'), "
                "optimal_listing_time (string advice), "
                "top_demand_categories (array of strings), "
                "restock_recommendations (array of strings, max 3), "
                "weekly_forecast (2 sentences), "
                "summary (1 sentence), "
                "waste_risk_action (string — specific advice for at-risk items if any)."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Seller: {profile['business_name']} ({profile['business_type']}, {profile['city']})\n"
                f"Today: {today_day}, current hour: {current_hour:02d}:00\n"
                f"Total orders last 30 days: {patterns['total_orders_30d']}\n\n"
                f"Hourly order distribution (top 8): {hourly_text}\n"
                f"Daily distribution (top 4): {daily_text}\n"
                f"Category demand: {cats_text}\n\n"
                f"Waste risk items (expiring < 12h with stock remaining):\n{waste_text}\n\n"
                "Generate a demand forecast with actionable insights. "
                "If there are waste risk items, give specific advice on how to move them."
            ),
        },
    ]

    try:
        llm = await call_groq_async(messages, temperature=0.3, max_tokens=600)
        top_cats = sorted(cats.items(), key=lambda x: -x[1])
        return {
            "peak_hours": llm.get("peak_hours", ["12:00-13:00", "18:00-19:00"]),
            "optimal_listing_time": llm.get(
                "optimal_listing_time", "Post 1 hour before peak demand."
            ),
            "top_demand_categories": llm.get("top_demand_categories", [c for c, _ in top_cats[:3]]),
            "waste_risk_alerts": waste_risk,
            "waste_risk_action": llm.get(
                "waste_risk_action", "Consider discounting or donating expiring items."
            ),
            "restock_recommendations": llm.get("restock_recommendations", []),
            "weekly_forecast": llm.get(
                "weekly_forecast", "Forecast based on recent order history."
            ),
            "summary": llm.get("summary", f"{patterns['total_orders_30d']} orders analysed."),
            "total_orders_30d": patterns["total_orders_30d"],
            "ai_powered": True,
        }
    except Exception:
        result = _rule_based_forecast(patterns, waste_risk)
        result["total_orders_30d"] = patterns["total_orders_30d"]
        return result
