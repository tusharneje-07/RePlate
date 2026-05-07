"""Seller module APIs backed by real database tables."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_seller
from app.core.impact_constants import co2_from_food_kg

# Default food weight per listing unit used when a seller does not specify
# their own CO₂ figure.  Keeps impact stats non-zero for all listings.
_DEFAULT_FOOD_WEIGHT_KG_PER_UNIT: float = 0.5
from app.models.food import (
    FoodListing,
    Order,
    OrderStatus,
    SellerListingStatus,
    SellerNotification,
    SellerNotificationType,
    SellerReview,
)
from app.models.user import User
from app.repositories.profile_repository import SellerProfileRepository
from app.services.seller_service import SellerService

router = APIRouter(prefix="/seller", tags=["seller"])


class SellerListingCreateIn(BaseModel):
    name: str
    description: str = ""
    images: list[str] = Field(default_factory=list)
    category: str
    dietary_tags: list[str] = Field(default_factory=list)
    allergens: list[str] = Field(default_factory=list)
    original_price: float
    discounted_price: float
    discount_percent: int = 0
    total_quantity: int = 1
    quantity_available: int = 1
    unit: str = "item"
    pickup_start: str | None = None
    pickup_end: str | None = None
    expires_at: str | None = None
    status: str = "active"
    co2_saved_per_unit: float = 0.0


class SellerListingUpdateIn(BaseModel):
    name: str | None = None
    description: str | None = None
    images: list[str] | None = None
    category: str | None = None
    dietary_tags: list[str] | None = None
    allergens: list[str] | None = None
    original_price: float | None = None
    discounted_price: float | None = None
    discount_percent: int | None = None
    total_quantity: int | None = None
    quantity_available: int | None = None
    unit: str | None = None
    pickup_start: str | None = None
    pickup_end: str | None = None
    expires_at: str | None = None
    status: str | None = None
    co2_saved_per_unit: float | None = None


class SellerOrderStatusUpdateIn(BaseModel):
    status: str
    cancel_reason: str | None = None


class SellerReviewReplyIn(BaseModel):
    message: str = Field(min_length=2, max_length=1000)


def _safe_json_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        value = json.loads(raw)
        if isinstance(value, list):
            return [str(item) for item in value if item]
    except Exception:
        pass
    return [raw]


def _comma_to_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def _listing_status(listing: FoodListing) -> str:
    if listing.seller_status is not None:
        return (
            listing.seller_status.value
            if hasattr(listing.seller_status, "value")
            else str(listing.seller_status)
        )
    return SellerService.infer_listing_status(listing.is_active, listing.quantity_available).value


def _map_listing(listing: FoodListing) -> dict:
    total_quantity = int(listing.total_quantity or listing.quantity_available or 0)
    quantity_available = int(listing.quantity_available or 0)
    quantity_sold = int(listing.quantity_sold or max(total_quantity - quantity_available, 0))
    return {
        "id": listing.id,
        "name": listing.title,
        "description": listing.description or "",
        "images": _safe_json_list(listing.images),
        "category": listing.category,
        "dietary_tags": _comma_to_list(listing.dietary_tags),
        "allergens": _comma_to_list(listing.allergens),
        "original_price": float(listing.original_price),
        "discounted_price": float(listing.discounted_price),
        "discount_percent": int(listing.discount_percent),
        "total_quantity": total_quantity,
        "quantity_available": quantity_available,
        "quantity_sold": quantity_sold,
        "unit": listing.quantity_unit,
        "pickup_start": listing.pickup_start,
        "pickup_end": listing.pickup_end,
        "expires_at": listing.expires_at,
        "status": _listing_status(listing),
        "co2_saved_per_unit": float(listing.co2_saved_per_unit or 0),
        "views": int(listing.view_count or 0),
        "add_to_cart_count": int(listing.cart_add_count or 0),
        "conversion_rate": 0,
        "expiry_rate": 0,
        "moderation_status": listing.moderation_status
        if hasattr(listing, "moderation_status")
        else None,
        "created_at": listing.created_at.isoformat(),
        "updated_at": listing.updated_at.isoformat(),
    }


async def _map_order(order: Order, service: SellerService) -> dict:
    customer_name = "Customer"
    customer_avatar = None
    customer_phone = None

    if order.consumer_id:
        consumer = await service.orders.get_consumer_for_order(order.consumer_id)
        if consumer is not None:
            full_name = " ".join(part for part in [consumer.first_name, consumer.last_name] if part)
            customer_name = full_name.strip() or consumer.email.split("@")[0]
            customer_avatar = consumer.profile_picture_url

    status_value = order.status.value if hasattr(order.status, "value") else str(order.status)
    return {
        "id": order.id,
        "order_number": order.order_number,
        "status": status_value,
        "customer": {
            "id": order.consumer_id,
            "name": customer_name,
            "avatar": customer_avatar,
            "phone": customer_phone,
            "total_orders_with_seller": 0,
        },
        "items": [
            {
                "listing_id": item.food_listing_id,
                "listing_name": item.listing_title,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "subtotal": float(item.subtotal),
                "image": item.listing_image,
            }
            for item in (order.items or [])
        ],
        "total_amount": float(order.total_amount),
        "total_items": sum(int(i.quantity) for i in (order.items or [])),
        "pickup_time": order.pickup_time,
        "pickup_window_end": order.pickup_time,
        "qr_code": order.qr_code,
        "placed_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "cancel_reason": order.cancel_reason,
    }


def _map_notification(notif: SellerNotification) -> dict:
    event_type = (
        notif.event_type.value if hasattr(notif.event_type, "value") else str(notif.event_type)
    )
    return {
        "id": notif.id,
        "type": event_type,
        "title": notif.title,
        "message": notif.message,
        "is_read": notif.is_read,
        "created_at": notif.created_at.isoformat(),
        "action_url": notif.action_url,
        "metadata": {
            "order_id": notif.order_id,
            "listing_id": notif.food_listing_id,
        },
    }


def _map_review(review: SellerReview, customer_name: str, listing_name: str) -> dict:
    return {
        "id": review.id,
        "order_id": review.order_id,
        "customer_id": review.consumer_id,
        "customer_name": customer_name,
        "customer_avatar": None,
        "listing_name": listing_name,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at.isoformat(),
        "seller_reply": review.seller_reply,
        "seller_replied_at": review.seller_replied_at.isoformat()
        if review.seller_replied_at
        else None,
    }


@router.get("/listings")
async def list_seller_listings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    listings = await service.listings.list_for_seller(current_user.id)
    return [_map_listing(l) for l in listings]


@router.post("/listings", status_code=status.HTTP_201_CREATED)
async def create_seller_listing(
    body: SellerListingCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    profile = await SellerProfileRepository(db).get_by_user_id(current_user.id)

    status_value = (
        body.status if body.status in {s.value for s in SellerListingStatus} else "active"
    )
    payload = {
        "seller_id": current_user.id,
        "title": body.name,
        "description": body.description,
        "category": body.category,
        "images": json.dumps(body.images),
        "original_price": body.original_price,
        "discounted_price": body.discounted_price,
        "discount_percent": body.discount_percent,
        "total_quantity": body.total_quantity,
        "quantity_available": body.quantity_available,
        "quantity_sold": max(body.total_quantity - body.quantity_available, 0),
        "quantity_unit": body.unit,
        "dietary_tags": ",".join(body.dietary_tags),
        "allergens": ",".join(body.allergens),
        "pickup_start": body.pickup_start,
        "pickup_end": body.pickup_end,
        "expires_at": body.expires_at,
        "co2_saved_per_unit": body.co2_saved_per_unit
        if body.co2_saved_per_unit and body.co2_saved_per_unit > 0
        else co2_from_food_kg(_DEFAULT_FOOD_WEIGHT_KG_PER_UNIT),
        "seller_name": profile.business_name
        if profile and profile.business_name
        else (current_user.email.split("@")[0]),
        "seller_address": profile.address_line1 if profile else None,
        "seller_logo_url": profile.logo_url if profile else None,
        "seller_lat": profile.lat if profile else None,
        "seller_lng": profile.lng if profile else None,
        "seller_category": profile.business_type if profile else None,
        "seller_status": status_value,
        "is_active": status_value not in {"paused", "draft"},
    }
    listing = await service.listings.create(payload)
    return _map_listing(listing)


@router.patch("/listings/{listing_id}")
async def update_seller_listing(
    listing_id: str,
    body: SellerListingUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    listing = await service.listings.get_for_seller(current_user.id, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    updates = body.model_dump(exclude_unset=True)
    if "name" in updates:
        listing.title = updates["name"]
    if "description" in updates:
        listing.description = updates["description"]
    if "images" in updates:
        listing.images = json.dumps(updates["images"] or [])
    if "category" in updates:
        listing.category = updates["category"]
    if "dietary_tags" in updates:
        listing.dietary_tags = ",".join(updates["dietary_tags"] or [])
    if "allergens" in updates:
        listing.allergens = ",".join(updates["allergens"] or [])
    if "original_price" in updates:
        listing.original_price = updates["original_price"]
    if "discounted_price" in updates:
        listing.discounted_price = updates["discounted_price"]
    if "discount_percent" in updates:
        listing.discount_percent = updates["discount_percent"]
    if "total_quantity" in updates:
        listing.total_quantity = updates["total_quantity"]
    if "quantity_available" in updates:
        listing.quantity_available = updates["quantity_available"]
    if "unit" in updates:
        listing.quantity_unit = updates["unit"]
    if "pickup_start" in updates:
        listing.pickup_start = updates["pickup_start"]
    if "pickup_end" in updates:
        listing.pickup_end = updates["pickup_end"]
    if "expires_at" in updates:
        listing.expires_at = updates["expires_at"]
    if "co2_saved_per_unit" in updates:
        listing.co2_saved_per_unit = updates["co2_saved_per_unit"]
    if "status" in updates and updates["status"] in {s.value for s in SellerListingStatus}:
        listing.seller_status = SellerListingStatus(updates["status"])
        listing.is_active = updates["status"] not in {"paused", "draft"}

    if listing.total_quantity < listing.quantity_available:
        listing.total_quantity = listing.quantity_available
    listing.quantity_sold = max(int(listing.total_quantity) - int(listing.quantity_available), 0)

    listing = await service.listings.save(listing)
    return _map_listing(listing)


@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_seller_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    listing = await service.listings.get_for_seller(current_user.id, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    await service.listings.delete(listing)


@router.get("/orders")
async def list_seller_orders(
    status: str | None = Query(default=None),
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    orders = await service.orders.list_for_seller(
        current_user.id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return [await _map_order(o, service) for o in orders]


@router.get("/orders/{order_id}")
async def get_seller_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    order = await service.orders.get_for_seller(current_user.id, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return await _map_order(order, service)


@router.patch("/orders/{order_id}/status")
async def update_seller_order_status(
    order_id: str,
    body: SellerOrderStatusUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    order = await service.orders.get_for_seller(current_user.id, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    try:
        new_status = OrderStatus(body.status)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status"
        ) from exc

    order = await service.orders.set_status(order, new_status, body.cancel_reason)
    return await _map_order(order, service)


@router.get("/analytics")
async def get_seller_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    return await service.get_analytics(current_user.id)


@router.get("/notifications")
async def list_seller_notifications(
    unread_only: bool = Query(default=False),
    event_type: str | None = Query(default=None),
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    event = None
    if event_type:
        try:
            event = SellerNotificationType(event_type)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid notification type"
            ) from exc

    notifications = await service.notifications.list_for_seller(
        current_user.id,
        unread_only=unread_only,
        event_type=event,
        limit=limit,
        offset=offset,
    )
    unread_count = await service.notifications.unread_count(current_user.id)
    return {
        "notifications": [_map_notification(n) for n in notifications],
        "unread_count": unread_count,
    }


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    notif = await service.notifications.get_for_seller(current_user.id, notification_id)
    if notif is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notif = await service.notifications.mark_read(notif)
    unread_count = await service.notifications.unread_count(current_user.id)
    return {"notification": _map_notification(notif), "unread_count": unread_count}


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    updated = await service.notifications.mark_all_read(current_user.id)
    return {"updated_count": updated, "unread_count": 0}


@router.get("/reviews")
async def list_seller_reviews(
    rating: int | None = Query(default=None, ge=1, le=5),
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    reviews = await service.reviews.list_for_seller(
        current_user.id,
        rating=rating,
        limit=limit,
        offset=offset,
    )
    avg_rating, total_reviews = await service.reviews.get_review_stats(current_user.id)

    # Build customer and listing lookup in one pass for readability.
    customer_cache: dict[str, str] = {}
    listing_cache: dict[str, str] = {}
    mapped_reviews: list[dict] = []
    for review in reviews:
        customer_name = "Anonymous"
        if review.consumer_id:
            if review.consumer_id not in customer_cache:
                user = await service.orders.get_consumer_for_order(review.consumer_id)
                if user is not None:
                    full_name = " ".join(part for part in [user.first_name, user.last_name] if part)
                    customer_cache[review.consumer_id] = (
                        full_name.strip() or user.email.split("@")[0]
                    )
                else:
                    customer_cache[review.consumer_id] = "Anonymous"
            customer_name = customer_cache[review.consumer_id]

        listing_name = "Listing"
        if review.food_listing_id:
            if review.food_listing_id not in listing_cache:
                listing = await service.listings.get_for_seller(
                    current_user.id, review.food_listing_id
                )
                listing_cache[review.food_listing_id] = (
                    listing.title if listing is not None else "Listing"
                )
            listing_name = listing_cache[review.food_listing_id]

        mapped_reviews.append(_map_review(review, customer_name, listing_name))

    return {
        "rating": round(avg_rating, 1),
        "review_count": total_reviews,
        "reviews": mapped_reviews,
    }


@router.post("/reviews/{review_id}/reply")
async def reply_seller_review(
    review_id: str,
    body: SellerReviewReplyIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerService(db)
    review = await service.reviews.get_for_seller(current_user.id, review_id)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    review = await service.reviews.reply(review, body.message)
    return {
        "id": review.id,
        "seller_reply": review.seller_reply,
        "seller_replied_at": review.seller_replied_at.isoformat()
        if review.seller_replied_at
        else datetime.now(timezone.utc).isoformat(),
    }


# ── Inspection Request ────────────────────────────────────────────────────────


@router.post("/listings/{listing_id}/request-inspection", status_code=status.HTTP_200_OK)
async def request_listing_inspection(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    """
    Seller submits a listing for food-inspector review.
    Sets moderation_status = 'pending_inspection' and pauses the listing
    from public view until the inspector approves it.
    """
    service = SellerService(db)
    listing = await service.listings.get_for_seller(current_user.id, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if listing.moderation_status == "pending_inspection":
        return {
            "success": True,
            "data": _map_listing(listing),
            "message": "Inspection already requested — awaiting inspector review",
        }

    if listing.moderation_status == "approved":
        return {
            "success": True,
            "data": _map_listing(listing),
            "message": "Listing is already approved by inspector",
        }

    # Mark as pending inspection and remove from public browse
    listing.moderation_status = "pending_inspection"
    listing.seller_status = SellerListingStatus.PAUSED
    listing.is_active = False
    listing = await service.listings.save(listing)

    return {
        "success": True,
        "data": _map_listing(listing),
        "message": "Inspection request submitted — listing paused until approved",
    }


@router.get("/listings/{listing_id}/inspection-status", status_code=status.HTTP_200_OK)
async def get_listing_inspection_status(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    """Returns the current inspection/moderation status of a listing."""
    service = SellerService(db)
    listing = await service.listings.get_for_seller(current_user.id, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    return {
        "success": True,
        "data": {
            "listing_id": listing.id,
            "moderation_status": listing.moderation_status or "not_submitted",
            "seller_status": listing.seller_status.value
            if hasattr(listing.seller_status, "value")
            else str(listing.seller_status),
            "is_active": listing.is_active,
        },
    }


# ---------------------------------------------------------------------------
# AI Pricing endpoint
# ---------------------------------------------------------------------------


class AiPriceRequest(BaseModel):
    food_name: str
    food_type: str | None = None
    base_price: float = Field(..., gt=0)
    expires_at: datetime
    total_quantity: int = Field(..., gt=0)


def _run_ai_pricing(
    food_name: str,
    original_price: float,
    expires_at: datetime,
    total_quantity: int,
    food_type: str | None = None,
) -> dict:
    """Pure sync function — safe to call via asyncio.to_thread."""
    from agent_systems.food_rescue_strategy_agent import (
        ListingContext,
        WeatherContext,
        _load_env,
        _remaining_hours,
        _priority_level,
        _discount_range,
        _build_llm_prompt,
        _call_groq,
        _normalize_llm_output,
        _failsafe_strategy,
        _ngo_fallback,
        _now,
    )

    _load_env()
    now = _now()

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    listing = ListingContext(
        food_id="new-listing",
        food_name=food_name,
        category=food_type or "General",
        quantity_available=total_quantity,
        original_price=original_price,
        current_price=original_price,
        manufacturing_time=now,
        expiry_time=expires_at,
        seller_id="unknown",
        orders_today=0,
    )
    weather = WeatherContext(temperature=30.0, weather_condition="Clear")

    remaining = _remaining_hours(expires_at, now)
    priority = _priority_level(remaining, total_quantity)
    discount_range = _discount_range(priority)
    prompt = _build_llm_prompt(listing, weather, remaining, priority, discount_range)

    try:
        llm_output = _call_groq(prompt)
        strategy = _normalize_llm_output(llm_output, listing, remaining, priority, discount_range)
    except Exception:
        strategy = _failsafe_strategy(listing, remaining, priority)

    strategy["remaining_shelf_life_hours"] = round(remaining, 2)
    return strategy


@router.post("/ai-price")
async def calculate_ai_price(
    payload: AiPriceRequest,
    current_user: User = Depends(require_seller),
):
    """Call the dynamic pricing agent and return suggested price + breakdown."""
    expires_at = payload.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    try:
        result = await asyncio.to_thread(
            _run_ai_pricing,
            payload.food_name,
            payload.base_price,
            expires_at,
            payload.total_quantity,
            payload.food_type,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pricing agent error: {exc}",
        )

    suggested_price = result["suggested_price"]
    discount_percent = round(result["recommended_discount"] * 100, 1)

    ngo_fallback = result.get("ngo_fallback")
    ngo_priority = isinstance(ngo_fallback, str) and ngo_fallback.startswith("Trigger")

    return {
        "success": True,
        "data": {
            "discounted_price": suggested_price,
            "discount_percent": discount_percent,
            "remaining_shelf_life_hours": result["remaining_shelf_life_hours"],
            "pricing_factors": {
                "category": result.get("priority_level", "N/A"),
                "category_source": "agent",
                "expiry_discount": result["recommended_discount"],
                "inventory_discount": 0.0,
                "urgency_discount": 0.0,
                "distance_discount": 0.0,
                "demand_adjustment": 0.0,
                "weather_adjustment": 0.0,
                "time_of_day_adjustment": 0.0,
                "ngo_priority": ngo_priority,
                "ngo_action": ngo_fallback if isinstance(ngo_fallback, str) else None,
                "reprice_interval_minutes": 30,
                "promotion_strategy": result.get("promotion_strategy", []),
            },
        },
    }
