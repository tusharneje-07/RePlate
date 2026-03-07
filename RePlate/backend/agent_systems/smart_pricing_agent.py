"""SmartPricingAgent: AI-powered dynamic pricing for expiring food listings.

Improvement over the original food_rescue_strategy_agent.py:
- Uses the central Groq client (reads key from Settings, not a separate .env)
- Fully async — compatible with FastAPI's async endpoints
- Includes the ai_rescue_strategy table DDL (auto-created on first use)
- Fetches real weather via Open-Meteo
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from agent_systems.groq_client import call_groq_async


@dataclass
class ListingSnapshot:
    food_id: str
    food_name: str
    category: str
    quantity_available: int
    original_price: float
    current_price: float
    expiry_time: datetime
    seller_id: str
    orders_today: int


# ── Helpers ───────────────────────────────────────────────────────────────────


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    s = str(value)
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    parsed = datetime.fromisoformat(s)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _remaining_hours(expiry: datetime) -> float:
    return max(0.0, (expiry - _now()).total_seconds() / 3600)


def _priority(hours: float, qty: int) -> str:
    if hours < 3 and qty >= 5:
        return "CRITICAL"
    if hours < 3:
        return "HIGH"
    if hours <= 6:
        return "MEDIUM"
    return "LOW"


def _discount_range(priority: str) -> tuple[float, float]:
    return {
        "CRITICAL": (0.40, 0.60),
        "HIGH": (0.30, 0.50),
        "MEDIUM": (0.20, 0.30),
        "LOW": (0.10, 0.20),
    }.get(priority, (0.10, 0.20))


def _failsafe_discount(hours: float) -> float:
    if hours < 2:
        return 0.50
    if hours < 3:
        return 0.40
    if hours <= 6:
        return 0.25
    return 0.15


def _promotion_strategies(priority: str) -> list[str]:
    strategies = {
        "CRITICAL": [
            "Flash sale",
            "Emergency NGO alert",
            "Push notification to nearby users",
            "Expiring soon banner",
        ],
        "HIGH": ["Flash sale", "Expiring soon section", "Push notification to nearby users"],
        "MEDIUM": ["Expiring soon section", "Highlight to nearby users", "Bundle offer"],
        "LOW": ["Highlight to nearby users", "Bundle offers"],
    }
    return strategies.get(priority, ["Standard promotion"])


def _ngo_fallback(hours: float, orders_today: int) -> str:
    if hours < 2 and orders_today == 0:
        return "Auto-trigger NGO donation request immediately"
    if hours < 4 and orders_today < 2:
        return "Alert nearby NGOs for potential donation"
    return "No NGO fallback needed"


# ── Weather ───────────────────────────────────────────────────────────────────


async def fetch_weather_async(lat: float, lon: float) -> dict[str, Any]:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}&current_weather=true"
    )
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
        cw = data.get("current_weather", {})
        return {
            "temperature": float(cw.get("temperature", 28.0)),
            "condition": str(cw.get("weathercode", "0")),
        }
    except Exception:
        return {"temperature": 28.0, "condition": "unknown"}


# ── DB helpers ────────────────────────────────────────────────────────────────


ENSURE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS ai_rescue_strategy (
    strategy_id VARCHAR(36) PRIMARY KEY,
    food_id     VARCHAR(36) NOT NULL,
    priority_level VARCHAR(20) NOT NULL,
    recommended_discount DECIMAL(5,4) NOT NULL,
    suggested_price DECIMAL(10,2) NOT NULL,
    promotion_strategy TEXT NOT NULL,
    ngo_fallback TEXT NOT NULL,
    reasoning TEXT,
    generated_at DATETIME NOT NULL,
    INDEX idx_ars_food (food_id),
    INDEX idx_ars_gen (generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""


async def _ensure_table(db: AsyncSession) -> None:
    await db.execute(text(ENSURE_TABLE_SQL))
    await db.commit()


async def fetch_listing(db: AsyncSession, food_id: str) -> ListingSnapshot:
    sql = text(
        """
        SELECT
            f.id AS food_id, f.title AS food_name, f.category,
            f.quantity_available, f.original_price,
            f.discounted_price AS current_price,
            f.expires_at AS expiry_time, f.seller_id,
            COALESCE(
                (SELECT COUNT(*) FROM order_items oi
                 JOIN orders o ON o.id = oi.order_id
                 WHERE oi.food_listing_id = f.id AND DATE(o.created_at) = CURDATE()),
                0
            ) AS orders_today
        FROM food_listings f
        WHERE f.id = :fid
        """
    )
    result = await db.execute(sql, {"fid": food_id})
    row = result.mappings().first()
    if row is None:
        raise ValueError(f"Food listing '{food_id}' not found")
    expiry = _parse_dt(row["expiry_time"]) if row["expiry_time"] else _now()
    return ListingSnapshot(
        food_id=str(row["food_id"]),
        food_name=str(row["food_name"]),
        category=str(row["category"]),
        quantity_available=int(row["quantity_available"]),
        original_price=float(row["original_price"]),
        current_price=float(row["current_price"]),
        expiry_time=expiry,
        seller_id=str(row["seller_id"]),
        orders_today=int(row["orders_today"]),
    )


async def save_strategy(db: AsyncSession, food_id: str, strategy: dict[str, Any]) -> None:
    await _ensure_table(db)
    sql = text(
        """
        INSERT INTO ai_rescue_strategy
            (strategy_id, food_id, priority_level, recommended_discount, suggested_price,
             promotion_strategy, ngo_fallback, reasoning, generated_at)
        VALUES
            (:sid, :fid, :priority, :discount, :price, :promo, :ngo, :reason, :gen_at)
        """
    )
    await db.execute(
        sql,
        {
            "sid": str(uuid.uuid4()),
            "fid": food_id,
            "priority": strategy["priority_level"],
            "discount": strategy["recommended_discount"],
            "price": strategy["suggested_price"],
            "promo": json.dumps(strategy["promotion_strategy"]),
            "ngo": strategy["ngo_fallback"],
            "reason": strategy.get("reasoning", ""),
            "gen_at": _now(),
        },
    )
    await db.commit()


async def apply_price(db: AsyncSession, food_id: str, price: float, discount_pct: int) -> None:
    sql = text(
        "UPDATE food_listings SET discounted_price = :price, discount_percent = :pct WHERE id = :fid"
    )
    await db.execute(sql, {"price": price, "pct": discount_pct, "fid": food_id})
    await db.commit()


# ── Main entry ────────────────────────────────────────────────────────────────


async def generate_pricing_strategy(
    db: AsyncSession,
    food_id: str,
    *,
    lat: float,
    lon: float,
    auto_apply: bool = False,
) -> dict[str, Any]:
    """Generate an AI pricing strategy for a food listing.

    Args:
        db: async SQLAlchemy session
        food_id: UUID of the food_listings row
        lat / lon: seller coordinates for weather context
        auto_apply: if True, also update discounted_price in the DB

    Returns:
        strategy dict with keys: priority_level, recommended_discount,
        suggested_price, promotion_strategy, ngo_fallback, reasoning
    """
    listing = await fetch_listing(db, food_id)
    weather = await fetch_weather_async(lat, lon)
    hours = _remaining_hours(listing.expiry_time)
    priority = _priority(hours, listing.quantity_available)
    disc_range = _discount_range(priority)

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert food rescue pricing strategist for a surplus food platform called RePlate. "
                "Your goal: maximise food rescue (prevent waste) while keeping sellers profitable. "
                "Return a JSON object with exactly these keys: "
                "priority_level (string), recommended_discount (float 0-1), suggested_price (float), "
                "promotion_strategy (array of strings), ngo_fallback (string), reasoning (one sentence string)."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Food: {listing.food_name} (category: {listing.category})\n"
                f"Quantity available: {listing.quantity_available}\n"
                f"Original price: ₹{listing.original_price:.2f}\n"
                f"Current discounted price: ₹{listing.current_price:.2f}\n"
                f"Orders placed today: {listing.orders_today}\n"
                f"Hours until expiry: {hours:.2f}\n"
                f"Priority classification: {priority}\n"
                f"Allowed discount range: {disc_range[0] * 100:.0f}% – {disc_range[1] * 100:.0f}%\n"
                f"Weather: {weather['condition']} at {weather['temperature']}°C\n\n"
                "Generate an optimised pricing strategy. Keep discount within the allowed range."
            ),
        },
    ]

    try:
        llm = await call_groq_async(messages, temperature=0.2, max_tokens=400)
        discount = float(llm.get("recommended_discount", 0.0))
        discount = max(disc_range[0], min(disc_range[1], discount))
        suggested = round(listing.original_price * (1 - discount), 2)
        promo = llm.get("promotion_strategy") or _promotion_strategies(priority)
        if isinstance(promo, str):
            promo = [promo]
        strategy = {
            "priority_level": llm.get("priority_level", priority),
            "recommended_discount": round(discount, 4),
            "suggested_price": suggested,
            "promotion_strategy": promo,
            "ngo_fallback": llm.get("ngo_fallback", _ngo_fallback(hours, listing.orders_today)),
            "reasoning": llm.get("reasoning", "AI-generated strategy."),
            "original_price": listing.original_price,
            "current_price": listing.current_price,
            "hours_remaining": round(hours, 2),
            "weather": weather,
        }
    except Exception:
        # Failsafe: rule-based strategy when Groq is unavailable
        discount = _failsafe_discount(hours)
        suggested = round(listing.original_price * (1 - discount), 2)
        strategy = {
            "priority_level": priority,
            "recommended_discount": round(discount, 4),
            "suggested_price": suggested,
            "promotion_strategy": _promotion_strategies(priority),
            "ngo_fallback": _ngo_fallback(hours, listing.orders_today),
            "reasoning": "Rule-based fallback (AI unavailable).",
            "original_price": listing.original_price,
            "current_price": listing.current_price,
            "hours_remaining": round(hours, 2),
            "weather": weather,
        }

    await save_strategy(db, food_id, strategy)

    if auto_apply:
        discount_pct = int(round(strategy["recommended_discount"] * 100))
        await apply_price(db, food_id, strategy["suggested_price"], discount_pct)
        strategy["price_applied"] = True

    return strategy
