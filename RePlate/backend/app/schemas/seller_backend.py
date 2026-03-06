"""Schemas for seller backend modules."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class PaginationIn(BaseModel):
    limit: int = Field(default=20, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class PaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int


class SellerProfileOut(BaseModel):
    business_name: str | None = None
    business_type: str | None = None
    owner_name: str | None = None
    phone: str | None = None
    email: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    opening_time: str | None = None
    closing_time: str | None = None
    fssai_license_number: str | None = None
    verification_status: str
    fssai_certificate_url: str | None = None


class SellerProfileUpdateIn(BaseModel):
    business_name: str | None = None
    business_type: str | None = None
    owner_name: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    opening_time: str | None = None
    closing_time: str | None = None
    fssai_license_number: str | None = None


class ListingCreateIn(BaseModel):
    item_name: str
    category: str
    description: str | None = None
    quantity_available: int = Field(default=1, ge=1)
    unit: str = "item"
    price: float = Field(ge=0)
    original_price: float = Field(ge=0)
    expiry_time: str | None = None
    pickup_start_time: str | None = None
    pickup_end_time: str | None = None
    is_donation: bool = False
    image_url: str | None = None
    food_type: str = "veg"
    tags: list[str] = Field(default_factory=list)
    cuisine_type: str | None = None
    freshness_score: float | None = None
    popularity_score: float | None = None


class ListingUpdateIn(BaseModel):
    item_name: str | None = None
    category: str | None = None
    description: str | None = None
    quantity_available: int | None = Field(default=None, ge=0)
    unit: str | None = None
    price: float | None = Field(default=None, ge=0)
    original_price: float | None = Field(default=None, ge=0)
    expiry_time: str | None = None
    pickup_start_time: str | None = None
    pickup_end_time: str | None = None
    is_donation: bool | None = None
    image_url: str | None = None
    food_type: str | None = None
    status: str | None = None
    tags: list[str] | None = None
    cuisine_type: str | None = None
    freshness_score: float | None = None
    popularity_score: float | None = None


class ListingOut(BaseModel):
    id: str
    item_name: str
    category: str
    description: str | None = None
    quantity_available: int
    unit: str
    price: float
    original_price: float
    expiry_time: str | None = None
    pickup_start_time: str | None = None
    pickup_end_time: str | None = None
    is_donation: bool
    image_url: str | None = None
    food_type: str
    status: str
    tags: list[str] = Field(default_factory=list)
    cuisine_type: str | None = None
    distance_from_user: float | None = None
    freshness_score: float | None = None
    popularity_score: float | None = None
    created_at: datetime
    updated_at: datetime


class InventoryOut(BaseModel):
    listing_id: str
    initial_quantity: int
    remaining_quantity: int
    last_updated: datetime


class InventoryAdjustIn(BaseModel):
    quantity_delta: int


class OrderStatusUpdateIn(BaseModel):
    order_status: str
    cancel_reason: str | None = None


class OrderOut(BaseModel):
    order_id: str
    listing_id: str | None = None
    consumer_id: str
    quantity: int
    total_price: float
    order_time: datetime
    pickup_time: str | None = None
    order_status: str
    payment_status: str


class DonationRequestOut(BaseModel):
    id: str
    ngo_id: str
    listing_id: str
    requested_quantity: int
    pickup_time: str | None = None
    approval_status: str
    created_at: datetime


class DonationStatusUpdateIn(BaseModel):
    approval_status: str


class PickupOut(BaseModel):
    id: str
    order_id: str | None = None
    donation_request_id: str | None = None
    pickup_code: str
    pickup_status: str
    pickup_time: str | None = None
    verification_method: str


class PickupVerifyIn(BaseModel):
    pickup_code: str
    verification_method: str = "code"


class NotificationOut(BaseModel):
    id: str
    event_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime


class AnalyticsRangeIn(BaseModel):
    range: str = Field(default="today")


class SellerAnalyticsOut(BaseModel):
    total_surplus_food_listed: int
    total_food_sold: int
    total_food_donated: int
    number_of_orders: int
    number_of_consumers_served: int
    number_of_ngos_served: int
    revenue_generated: float
    waste_reduced: float
    co2_reduction: float
