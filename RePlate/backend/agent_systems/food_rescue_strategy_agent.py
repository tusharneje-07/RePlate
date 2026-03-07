"""FoodRescueStrategyAgent: generate food rescue strategies using Groq."""

from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import create_engine, text

from app.core.config import settings


ENV_PATH = os.path.join(os.path.dirname(__file__), ".env.groq")
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


@dataclass
class ListingContext:
    food_id: str
    food_name: str
    category: str
    quantity_available: int
    original_price: float
    current_price: float
    manufacturing_time: datetime
    expiry_time: datetime
    seller_id: str
    orders_today: int


@dataclass
class WeatherContext:
    temperature: float
    weather_condition: str


def _load_env() -> None:
    if not os.path.exists(ENV_PATH):
        return
    with open(ENV_PATH, "r", encoding="utf-8") as handle:
        for raw in handle:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


def _groq_headers() -> dict[str, str]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is missing. Set it in agent_systems/.env.groq")
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _priority_level(remaining_hours: float, quantity: int) -> str:
    if remaining_hours < 3 and quantity >= 10:
        return "HIGH"
    if remaining_hours < 3:
        # Low quantity but time-critical — still MEDIUM urgency
        return "MEDIUM"
    if 3 <= remaining_hours <= 6:
        return "MEDIUM"
    return "LOW"


def _discount_range(priority: str) -> tuple[float, float]:
    if priority == "HIGH":
        return (0.30, 0.50)
    if priority == "MEDIUM":
        return (0.20, 0.30)
    return (0.10, 0.20)


def _failsafe_discount(remaining_hours: float) -> float:
    if remaining_hours < 3:
        return 0.40
    if remaining_hours <= 6:
        return 0.25
    return 0.15


def _promotion_strategy(priority: str) -> list[str]:
    if priority == "HIGH":
        return ["Flash sale", "Expiring soon section", "Push notification"]
    if priority == "MEDIUM":
        return ["Highlight listing to nearby users", "Expiring soon section"]
    return ["Highlight listing to nearby users", "Bundle offers"]


def _ngo_fallback(remaining_hours: float, orders_today: int) -> str:
    if remaining_hours < 2 and orders_today == 0:
        return "Trigger NGO donation"
    return "No NGO fallback"


def _remaining_hours(expiry_time: datetime, now: datetime) -> float:
    return max(0.0, (expiry_time - now).total_seconds() / 3600)


def _build_llm_prompt(
    listing: ListingContext,
    weather: WeatherContext,
    remaining_hours: float,
    priority: str,
    discount_range: tuple[float, float],
) -> str:
    return (
        "You are a food rescue strategy planner. Create a JSON response with keys: "
        "priority_level, recommended_discount, suggested_price, promotion_strategy, ngo_fallback. "
        "Use numeric discount (0-1). Suggested price is original_price*(1-discount). "
        "Keep discount within range.\n\n"
        f"Food: {listing.food_name} (category: {listing.category})\n"
        f"Quantity: {listing.quantity_available}\n"
        f"Original price: {listing.original_price}\n"
        f"Current price: {listing.current_price}\n"
        f"Orders today: {listing.orders_today}\n"
        f"Remaining hours: {remaining_hours:.2f}\n"
        f"Priority level: {priority}\n"
        f"Discount range: {discount_range[0]} to {discount_range[1]}\n"
        f"Weather: {weather.weather_condition}, {weather.temperature}C\n"
    )


def _call_groq(prompt: str) -> dict[str, Any]:
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "Return only JSON without code fences."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 300,
    }
    with httpx.Client(timeout=12.0) as client:
        response = client.post(GROQ_ENDPOINT, headers=_groq_headers(), json=payload)
        response.raise_for_status()
        data = response.json()
    content = data["choices"][0]["message"]["content"].strip()
    return json.loads(content)


def _normalize_llm_output(
    llm_output: dict[str, Any],
    listing: ListingContext,
    remaining_hours: float,
    priority: str,
    discount_range: tuple[float, float],
) -> dict[str, Any]:
    discount = float(llm_output.get("recommended_discount", 0.0))
    discount = max(discount_range[0], min(discount_range[1], discount))
    suggested_price = round(listing.original_price * (1 - discount), 2)
    promotion = llm_output.get("promotion_strategy")
    if not promotion:
        promotion = _promotion_strategy(priority)
    if isinstance(promotion, str):
        promotion = [promotion]
    # Always enforce rule-based NGO check — LLM does not know orders_today
    ngo = _ngo_fallback(remaining_hours, listing.orders_today)
    return {
        "priority_level": llm_output.get("priority_level", priority),
        "recommended_discount": round(discount, 2),
        "suggested_price": suggested_price,
        "promotion_strategy": promotion,
        "ngo_fallback": ngo,
    }


def _failsafe_strategy(
    listing: ListingContext, remaining_hours: float, priority: str
) -> dict[str, Any]:
    discount = _failsafe_discount(remaining_hours)
    suggested_price = round(listing.original_price * (1 - discount), 2)
    return {
        "priority_level": priority,
        "recommended_discount": round(discount, 2),
        "suggested_price": suggested_price,
        "promotion_strategy": _promotion_strategy(priority),
        "ngo_fallback": _ngo_fallback(remaining_hours, listing.orders_today),
    }


def fetch_listing_context(food_id: str) -> ListingContext:
    engine = create_engine(settings.sync_database_url)
    sql = text(
        """
        SELECT
            f.id AS food_id,
            f.title AS food_name,
            f.category AS category,
            f.quantity_available,
            f.original_price,
            f.discounted_price AS current_price,
            f.pickup_start AS manufacturing_time,
            f.expires_at AS expiry_time,
            f.seller_id,
            COUNT(o.id) AS orders_today
        FROM food_listings f
        LEFT JOIN order_items oi ON oi.food_listing_id = f.id
        LEFT JOIN orders o ON o.id = oi.order_id AND DATE(o.created_at) = CURDATE()
        WHERE f.id = :food_id
        GROUP BY f.id
        """
    )
    with engine.connect() as conn:
        row = conn.execute(sql, {"food_id": food_id}).mappings().first()
    if row is None:
        raise ValueError(f"Food listing {food_id} not found")
    manufacturing_time = (
        _parse_datetime(row["manufacturing_time"]) if row["manufacturing_time"] else _now()
    )
    expiry_time = _parse_datetime(row["expiry_time"]) if row["expiry_time"] else _now()
    return ListingContext(
        food_id=row["food_id"],
        food_name=row["food_name"],
        category=row["category"],
        quantity_available=int(row["quantity_available"]),
        original_price=float(row["original_price"]),
        current_price=float(row["current_price"]),
        manufacturing_time=manufacturing_time,
        expiry_time=expiry_time,
        seller_id=row["seller_id"],
        orders_today=int(row["orders_today"] or 0),
    )


def fetch_weather(lat: float, lon: float) -> WeatherContext:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}&current_weather=true"
    )
    with httpx.Client(timeout=10.0) as client:
        response = client.get(url)
        response.raise_for_status()
        data = response.json()
    weather = data.get("current_weather", {})
    temperature = float(weather.get("temperature", 0.0))
    condition = str(weather.get("weathercode", "unknown"))
    return WeatherContext(temperature=temperature, weather_condition=condition)


def store_strategy(food_id: str, strategy: dict[str, Any]) -> None:
    engine = create_engine(settings.sync_database_url)
    sql = text(
        """
        INSERT INTO ai_rescue_strategy
            (strategy_id, food_id, priority_level, recommended_discount, suggested_price,
             promotion_strategy, ngo_fallback, generated_at)
        VALUES
            (:strategy_id, :food_id, :priority_level, :recommended_discount, :suggested_price,
             :promotion_strategy, :ngo_fallback, :generated_at)
        """
    )
    payload = {
        "strategy_id": str(uuid.uuid4()),
        "food_id": food_id,
        "priority_level": strategy["priority_level"],
        "recommended_discount": strategy["recommended_discount"],
        "suggested_price": strategy["suggested_price"],
        "promotion_strategy": json.dumps(strategy["promotion_strategy"]),
        "ngo_fallback": strategy["ngo_fallback"],
        "generated_at": _now(),
    }
    with engine.begin() as conn:
        conn.execute(sql, payload)


def apply_suggested_price(food_id: str, suggested_price: float) -> None:
    engine = create_engine(settings.sync_database_url)
    sql = text("UPDATE food_listings SET discounted_price = :price WHERE id = :food_id")
    with engine.begin() as conn:
        conn.execute(sql, {"price": suggested_price, "food_id": food_id})


def generate_strategy(food_id: str, *, lat: float, lon: float) -> dict[str, Any]:
    _load_env()
    listing = fetch_listing_context(food_id)
    weather = fetch_weather(lat, lon)
    now = _now()
    remaining_hours = _remaining_hours(listing.expiry_time, now)
    priority = _priority_level(remaining_hours, listing.quantity_available)
    discount_range = _discount_range(priority)
    prompt = _build_llm_prompt(listing, weather, remaining_hours, priority, discount_range)

    try:
        llm_output = _call_groq(prompt)
        strategy = _normalize_llm_output(
            llm_output, listing, remaining_hours, priority, discount_range
        )
    except Exception:
        strategy = _failsafe_strategy(listing, remaining_hours, priority)

    store_strategy(food_id, strategy)
    return strategy


def _parse_datetime(value: str) -> datetime:
    if isinstance(value, datetime):
        return value
    value = str(value)
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


if __name__ == "__main__":
    demo_food_id = os.environ.get("FOOD_ID")
    demo_lat = float(os.environ.get("LAT", "16.6938"))
    demo_lon = float(os.environ.get("LON", "74.4567"))
    if not demo_food_id:
        raise SystemExit("Set FOOD_ID environment variable to run this agent.")
    result = generate_strategy(demo_food_id, lat=demo_lat, lon=demo_lon)
    print(json.dumps(result, indent=2))
