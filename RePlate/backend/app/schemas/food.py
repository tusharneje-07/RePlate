"""Pydantic schemas for food listings, orders, favorites, and impact stats."""

from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, field_validator


# ── Shared ─────────────────────────────────────────────────────────────────────

class SellerSummaryOut(BaseModel):
    id: str
    name: str
    logo: str | None = None
    category: str | None = None
    distance: float | None = None
    rating: float | None = None
    address: str | None = None

    model_config = {"from_attributes": True}


# ── Food Listing ───────────────────────────────────────────────────────────────

class FoodListingOut(BaseModel):
    id: str
    title: str
    description: str | None = None
    category: str
    images: list[str]
    original_price: float
    discounted_price: float
    discount_percent: int
    quantity_available: int
    quantity_unit: str
    dietary_tags: list[str]
    allergens: list[str]
    pickup_start: str | None = None
    pickup_end: str | None = None
    expires_at: str | None = None
    co2_saved_per_unit: float | None = None
    is_active: bool
    rating: float | None = None
    review_count: int
    seller: SellerSummaryOut
    is_favorited: bool = False

    model_config = {"from_attributes": True}


class FoodListingCreate(BaseModel):
    """Used by sellers to create a listing (internal/admin use for now)."""
    title: str
    description: str | None = None
    category: str
    images: list[str] = []
    original_price: float
    discounted_price: float
    discount_percent: int = 0
    quantity_available: int = 1
    quantity_unit: str = "item"
    dietary_tags: list[str] = []
    allergens: list[str] = []
    pickup_start: str | None = None
    pickup_end: str | None = None
    expires_at: str | None = None
    co2_saved_per_unit: float | None = None
    seller_name: str | None = None
    seller_address: str | None = None
    seller_logo_url: str | None = None
    seller_distance_km: float | None = None
    seller_rating: float | None = None
    seller_category: str | None = None


# ── Order ──────────────────────────────────────────────────────────────────────

class OrderItemOut(BaseModel):
    id: str
    food_listing_id: str | None = None
    listing_title: str
    listing_image: str | None = None
    listing_unit: str
    listing_pickup_start: str | None = None
    quantity: int
    unit_price: float
    subtotal: float
    co2_saved: float

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: str
    order_number: str
    status: str
    total_amount: float
    total_savings: float
    total_co2_saved: float
    platform_fee: float
    payment_method: str
    pickup_time: str | None = None
    pickup_address: str | None = None
    cancel_reason: str | None = None
    qr_code: str | None = None
    placed_at: str
    updated_at: str
    seller: SellerSummaryOut
    items: list[OrderItemOut]

    model_config = {"from_attributes": True}


class PlaceOrderItemIn(BaseModel):
    food_listing_id: str
    quantity: int


class PlaceOrderIn(BaseModel):
    items: list[PlaceOrderItemIn]
    payment_method: str = "cod"


# ── Favorite ──────────────────────────────────────────────────────────────────

class FavoriteOut(BaseModel):
    id: str
    favorite_type: str
    food_listing: FoodListingOut | None = None
    seller_id: str | None = None
    seller_name: str | None = None
    seller_logo: str | None = None

    model_config = {"from_attributes": True}


class AddFavoriteIn(BaseModel):
    favorite_type: str  # "food" | "seller"
    food_listing_id: str | None = None
    seller_id: str | None = None


# ── Impact ────────────────────────────────────────────────────────────────────

class MonthlyImpactOut(BaseModel):
    month: str
    co2_saved: float
    money_saved: float
    orders_count: int
    food_weight_saved: float


class ImpactStatsOut(BaseModel):
    total_orders: int
    total_co2_saved: float
    total_money_saved: float
    total_meals_rescued: int
    total_food_weight_saved: float
    streak: int
    level: str
    next_level_progress: int
    monthly_data: list[MonthlyImpactOut]

    model_config = {"from_attributes": True}
