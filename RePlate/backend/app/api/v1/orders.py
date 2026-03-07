"""Orders API — place and retrieve consumer orders."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_consumer
from app.core.impact_constants import co2_from_food_kg, food_kg_from_co2

# Default assumed food weight (kg) per listing unit when the seller has not
# provided a co2_saved_per_unit value.  0.5 kg/unit is the same conservative
# baseline used throughout the rest of the codebase.
_DEFAULT_FOOD_WEIGHT_KG_PER_UNIT: float = 0.5
from app.models.food import Order, OrderItem
from app.models.user import User
from app.repositories.food_repository import (
    FoodListingRepository,
    OrderRepository,
    ImpactStatRepository,
)
from app.schemas.food import OrderOut, OrderItemOut, PlaceOrderIn, SellerSummaryOut

router = APIRouter(prefix="/orders", tags=["orders"])


def _build_order_out(order: Order) -> OrderOut:
    items_out = [
        OrderItemOut(
            id=item.id,
            food_listing_id=item.food_listing_id,
            listing_title=item.listing_title,
            listing_image=item.listing_image,
            listing_unit=item.listing_unit,
            listing_pickup_start=item.listing_pickup_start,
            quantity=item.quantity,
            unit_price=float(item.unit_price),
            subtotal=float(item.subtotal),
            co2_saved=float(item.co2_saved),
        )
        for item in (order.items or [])
    ]

    seller = SellerSummaryOut(
        id=order.seller_id or "",
        name=order.seller_name or "Unknown Seller",
        logo=order.seller_logo_url,
        category=order.seller_category,
        rating=float(order.seller_rating) if order.seller_rating is not None else 0.0,
        address=order.seller_address,
    )

    return OrderOut(
        id=order.id,
        order_number=order.order_number,
        status=order.status.value if hasattr(order.status, "value") else str(order.status),
        total_amount=float(order.total_amount),
        total_savings=float(order.total_savings),
        total_co2_saved=float(order.total_co2_saved),
        platform_fee=float(order.platform_fee),
        payment_method=order.payment_method,
        pickup_time=order.pickup_time,
        pickup_address=order.pickup_address,
        cancel_reason=order.cancel_reason,
        qr_code=order.qr_code,
        placed_at=order.created_at.isoformat(),
        updated_at=order.updated_at.isoformat(),
        seller=seller,
        items=items_out,
    )


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def place_order(
    data: PlaceOrderIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """Place a new order from the consumer's cart."""
    if not data.items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Order must contain at least one item",
        )

    listing_repo = FoodListingRepository(db)
    order_repo = OrderRepository(db)
    impact_repo = ImpactStatRepository(db)

    total_amount = 0.0
    total_savings = 0.0
    total_co2 = 0.0
    items_data: list[dict] = []

    # Snapshot of first seller (we currently support single-seller carts)
    first_listing = None

    for item_in in data.items:
        listing = await listing_repo.get_by_id(item_in.food_listing_id)
        if listing is None or not listing.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Listing {item_in.food_listing_id} not found or unavailable",
            )
        if listing.quantity_available < item_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Not enough stock for '{listing.title}'",
            )

        unit_price = float(listing.discounted_price)
        original = float(listing.original_price)
        subtotal = unit_price * item_in.quantity
        savings = (original - unit_price) * item_in.quantity
        # Use the listing's stated co2_saved_per_unit when available and
        # non-zero; otherwise fall back to the canonical formula applied to
        # the default food weight so no order ever credits zero CO₂.
        co2_per_unit = float(listing.co2_saved_per_unit or 0)
        if co2_per_unit <= 0:
            co2_per_unit = co2_from_food_kg(_DEFAULT_FOOD_WEIGHT_KG_PER_UNIT)
        co2 = co2_per_unit * item_in.quantity

        total_amount += subtotal
        total_savings += savings
        total_co2 += co2

        # Get first image
        listing_image: str | None = None
        if listing.images:
            try:
                imgs = json.loads(listing.images)
                listing_image = imgs[0] if imgs else None
            except Exception:
                listing_image = listing.images

        items_data.append(
            {
                "food_listing_id": listing.id,
                "listing_title": listing.title,
                "listing_image": listing_image,
                "listing_unit": listing.quantity_unit,
                "listing_pickup_start": listing.pickup_start,
                "quantity": item_in.quantity,
                "unit_price": unit_price,
                "subtotal": subtotal,
                "co2_saved": co2,
            }
        )

        if first_listing is None:
            first_listing = listing

        # Decrement available quantity
        listing.quantity_available -= item_in.quantity

    order_number = await order_repo.generate_order_number()

    order_data: dict = {
        "consumer_id": current_user.id,
        "order_number": order_number,
        "total_amount": round(total_amount, 2),
        "total_savings": round(total_savings, 2),
        "total_co2_saved": round(total_co2, 3),
        "platform_fee": 0.0,
        "payment_method": data.payment_method,
        "qr_code": f"RPL-QR-{order_number}",
    }

    if first_listing:
        order_data.update(
            {
                "seller_id": first_listing.seller_id,
                "seller_name": first_listing.seller_name,
                "seller_logo_url": first_listing.seller_logo_url,
                "seller_address": first_listing.seller_address,
                "seller_rating": float(first_listing.seller_rating)
                if first_listing.seller_rating
                else None,
                "seller_category": first_listing.seller_category,
                "pickup_time": first_listing.pickup_end,
                "pickup_address": first_listing.seller_address,
            }
        )

    order = await order_repo.create(order_data, items_data)
    await db.commit()

    # Update impact stats
    meals = len(data.items)
    # Derive food weight from CO₂ saved using the canonical inverse: food_kg = co2 / 2.5
    food_weight = food_kg_from_co2(total_co2)
    await impact_repo.update_after_order(
        current_user.id,
        order_amount=total_amount,
        savings=total_savings,
        co2_saved=total_co2,
        meals_rescued=meals,
        food_weight_kg=food_weight,
    )

    return _build_order_out(order)


@router.get("", response_model=list[OrderOut])
async def list_orders(
    status: str | None = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """List all orders for the current consumer."""
    order_repo = OrderRepository(db)
    orders = await order_repo.list_for_consumer(
        current_user.id, status=status, limit=limit, offset=offset
    )
    return [_build_order_out(o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """Get a specific order by ID (must belong to current consumer)."""
    order_repo = OrderRepository(db)
    order = await order_repo.get_by_id_and_consumer(order_id, current_user.id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _build_order_out(order)


from app.models.food import OrderStatus as _OrderStatus  # noqa: E402


@router.post("/{order_id}/cancel", response_model=OrderOut)
async def cancel_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """Cancel a pending or confirmed order (consumer-initiated)."""
    order_repo = OrderRepository(db)
    order = await order_repo.get_by_id_and_consumer(order_id, current_user.id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    current_status = order.status.value if hasattr(order.status, "value") else str(order.status)
    if current_status not in ("pending", "confirmed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel an order with status '{current_status}'",
        )

    order.status = _OrderStatus.CANCELLED
    order.cancel_reason = "Cancelled by customer"
    await db.commit()
    await db.refresh(order)
    return _build_order_out(order)
