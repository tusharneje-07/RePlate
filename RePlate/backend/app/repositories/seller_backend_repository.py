"""Repositories for modular seller backend features."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import Select, and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.impact_constants import co2_from_food_kg, landfill_from_food_kg

from app.models.food import (
    DonationApprovalStatus,
    EnvironmentalImpactRecord,
    FoodListing,
    FoodType,
    NGOListingRequest,
    Order,
    OrderStatus,
    PaymentStatus,
    PickupRecord,
    PickupStatus,
    SellerListingStatus,
    SellerNotification,
    SellerNotificationType,
    VerificationMethod,
    InventoryTracking,
)
from app.models.profiles import SellerProfile, SellerVerificationStatus
from app.models.user import User


def _new_id() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_utc(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _range_start(range_key: str) -> datetime:
    now = _now()
    if range_key == "weekly":
        return now - timedelta(days=7)
    if range_key == "monthly":
        return now - timedelta(days=30)
    if range_key == "yearly":
        return now - timedelta(days=365)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


class SellerProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, seller_id: str) -> tuple[User, SellerProfile]:
        user = await self.db.get(User, seller_id)
        if user is None:
            raise ValueError("Seller user not found")

        result = await self.db.execute(
            select(SellerProfile).where(SellerProfile.user_id == seller_id)
        )
        profile = result.scalar_one_or_none()
        if profile is None:
            profile = SellerProfile(
                id=_new_id(),
                user_id=seller_id,
                verification_status=SellerVerificationStatus.PENDING,
            )
            self.db.add(profile)
            await self.db.commit()
            await self.db.refresh(profile)
        return user, profile

    async def update(self, profile: SellerProfile, values: dict) -> SellerProfile:
        for key, value in values.items():
            if hasattr(profile, key):
                setattr(profile, key, value)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile


class SellerListingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, seller_id: str, values: dict) -> FoodListing:
        listing = FoodListing(id=_new_id(), seller_id=seller_id, **values)
        self.db.add(listing)
        await self.db.flush()

        tracking = InventoryTracking(
            id=_new_id(),
            listing_id=listing.id,
            initial_quantity=listing.quantity_available,
            remaining_quantity=listing.quantity_available,
        )
        self.db.add(tracking)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def get(self, seller_id: str, listing_id: str) -> FoodListing | None:
        result = await self.db.execute(
            select(FoodListing).where(
                and_(
                    FoodListing.id == listing_id,
                    FoodListing.seller_id == seller_id,
                    FoodListing.deleted_at.is_(None),
                )
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        seller_id: str,
        *,
        status: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[FoodListing], int]:
        await self.auto_mark_expired(seller_id)
        stmt = select(FoodListing).where(
            FoodListing.seller_id == seller_id,
            FoodListing.deleted_at.is_(None),
        )
        if status:
            stmt = stmt.where(FoodListing.seller_status == status)

        count_stmt = (
            select(func.count(FoodListing.id))
            .select_from(FoodListing)
            .where(
                FoodListing.seller_id == seller_id,
                FoodListing.deleted_at.is_(None),
            )
        )
        if status:
            count_stmt = count_stmt.where(FoodListing.seller_status == status)

        result = await self.db.execute(
            stmt.order_by(FoodListing.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def update(self, listing: FoodListing, values: dict) -> FoodListing:
        for key, value in values.items():
            if hasattr(listing, key):
                setattr(listing, key, value)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def soft_delete(self, listing: FoodListing) -> None:
        listing.deleted_at = _now()
        listing.is_active = False
        listing.seller_status = SellerListingStatus.EXPIRED
        await self.db.commit()

    async def auto_mark_expired(self, seller_id: str) -> int:
        result = await self.db.execute(
            select(FoodListing).where(
                FoodListing.seller_id == seller_id,
                FoodListing.deleted_at.is_(None),
                FoodListing.seller_status.in_(
                    [
                        SellerListingStatus.ACTIVE,
                        SellerListingStatus.SCHEDULED,
                    ]
                ),
            )
        )
        changed = 0
        for listing in result.scalars().all():
            expiry = _parse_utc(listing.expires_at)
            if expiry and expiry <= _now():
                listing.seller_status = SellerListingStatus.EXPIRED
                listing.is_active = False
                changed += 1
        if changed:
            await self.db.commit()
        return changed


class InventoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, listing_id: str) -> InventoryTracking | None:
        result = await self.db.execute(
            select(InventoryTracking).where(InventoryTracking.listing_id == listing_id)
        )
        return result.scalar_one_or_none()

    async def update_remaining(
        self, tracking: InventoryTracking, quantity: int
    ) -> InventoryTracking:
        tracking.remaining_quantity = max(quantity, 0)
        tracking.last_updated = _now()
        await self.db.commit()
        await self.db.refresh(tracking)
        return tracking


class SellerOrderRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def _base(self, seller_id: str) -> Select[tuple[Order]]:
        return select(Order).options(selectinload(Order.items)).where(Order.seller_id == seller_id)

    async def list(
        self,
        seller_id: str,
        *,
        status: str | None,
        start_date: datetime | None,
        end_date: datetime | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Order], int]:
        stmt = self._base(seller_id)
        count_stmt = select(func.count(Order.id)).where(Order.seller_id == seller_id)

        if status:
            stmt = stmt.where(Order.status == status)
            count_stmt = count_stmt.where(Order.status == status)
        if start_date:
            stmt = stmt.where(Order.created_at >= start_date)
            count_stmt = count_stmt.where(Order.created_at >= start_date)
        if end_date:
            stmt = stmt.where(Order.created_at <= end_date)
            count_stmt = count_stmt.where(Order.created_at <= end_date)

        result = await self.db.execute(
            stmt.order_by(Order.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def get(self, seller_id: str, order_id: str) -> Order | None:
        result = await self.db.execute(self._base(seller_id).where(Order.id == order_id))
        return result.scalar_one_or_none()

    async def transition_status(
        self,
        seller_id: str,
        order_id: str,
        *,
        next_status: OrderStatus,
        cancel_reason: str | None = None,
    ) -> Order:
        order = await self.get(seller_id, order_id)
        if order is None:
            raise ValueError("Order not found")

        async with self.db.begin():
            if next_status == OrderStatus.CONFIRMED and order.status == OrderStatus.PENDING:
                for item in order.items:
                    listing = await self.db.get(FoodListing, item.food_listing_id)
                    if listing is None or listing.deleted_at is not None:
                        raise ValueError("Listing missing for order item")
                    if listing.quantity_available < item.quantity:
                        raise ValueError("Insufficient inventory for confirmation")
                    listing.quantity_available -= item.quantity
                    listing.quantity_sold += item.quantity
                    if listing.quantity_available <= 0:
                        listing.quantity_available = 0
                        listing.seller_status = SellerListingStatus.SOLD_OUT
                        listing.is_active = False

                    tracking_result = await self.db.execute(
                        select(InventoryTracking).where(InventoryTracking.listing_id == listing.id)
                    )
                    tracking = tracking_result.scalar_one_or_none()
                    if tracking:
                        tracking.remaining_quantity = listing.quantity_available
                        tracking.last_updated = _now()

            order.status = next_status
            if next_status == OrderStatus.CANCELLED:
                order.cancel_reason = cancel_reason
            if next_status == OrderStatus.COMPLETED:
                order.payment_status = PaymentStatus.PAID

        await self.db.refresh(order)
        return order

    async def create_or_update_impact(self, order: Order) -> EnvironmentalImpactRecord:
        if not order.seller_id:
            raise ValueError("Order missing seller id")
        result = await self.db.execute(
            select(EnvironmentalImpactRecord).where(EnvironmentalImpactRecord.order_id == order.id)
        )
        impact = result.scalar_one_or_none()
        total_food_saved = 0.0
        for item in order.items:
            qty = float(item.quantity)
            total_food_saved += qty
        # Apply canonical formula: CO₂ = food_saved_kg × 2.5, landfill = food_saved_kg × 0.8
        total_co2 = co2_from_food_kg(total_food_saved)
        landfill = landfill_from_food_kg(total_food_saved)

        if impact is None:
            impact = EnvironmentalImpactRecord(
                id=_new_id(),
                order_id=order.id,
                seller_id=order.seller_id,
                food_saved_kg=total_food_saved,
                co2_reduction_kg=total_co2,
                landfill_waste_reduction=landfill,
            )
            self.db.add(impact)
        else:
            impact.food_saved_kg = total_food_saved
            impact.co2_reduction_kg = total_co2
            impact.landfill_waste_reduction = landfill

        await self.db.commit()
        await self.db.refresh(impact)
        return impact


class DonationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_seller(
        self, seller_id: str, limit: int, offset: int
    ) -> tuple[list[NGOListingRequest], int]:
        stmt = select(NGOListingRequest).where(NGOListingRequest.seller_id == seller_id)
        count_stmt = select(func.count(NGOListingRequest.id)).where(
            NGOListingRequest.seller_id == seller_id
        )
        result = await self.db.execute(
            stmt.order_by(NGOListingRequest.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def get_for_seller(self, seller_id: str, request_id: str) -> NGOListingRequest | None:
        result = await self.db.execute(
            select(NGOListingRequest).where(
                and_(NGOListingRequest.id == request_id, NGOListingRequest.seller_id == seller_id)
            )
        )
        return result.scalar_one_or_none()

    async def update_status(
        self,
        request: NGOListingRequest,
        status: DonationApprovalStatus,
    ) -> NGOListingRequest:
        request.approval_status = status
        await self.db.commit()
        await self.db.refresh(request)
        return request


class PickupRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_for_order(self, seller_id: str, order_id: str) -> PickupRecord:
        pickup = PickupRecord(
            id=_new_id(),
            seller_id=seller_id,
            order_id=order_id,
            pickup_code=f"PK-{uuid.uuid4().hex[:8].upper()}",
            verification_method=VerificationMethod.CODE,
        )
        self.db.add(pickup)
        await self.db.commit()
        await self.db.refresh(pickup)
        return pickup

    async def get_by_code(self, seller_id: str, code: str) -> PickupRecord | None:
        result = await self.db.execute(
            select(PickupRecord).where(
                and_(PickupRecord.seller_id == seller_id, PickupRecord.pickup_code == code)
            )
        )
        return result.scalar_one_or_none()

    async def verify_and_complete(
        self, pickup: PickupRecord, method: VerificationMethod
    ) -> PickupRecord:
        pickup.verification_method = method
        pickup.pickup_status = PickupStatus.COMPLETED
        pickup.pickup_time = _now().isoformat()
        await self.db.commit()
        await self.db.refresh(pickup)
        return pickup


class SellerNotificationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        seller_id: str,
        event_type: SellerNotificationType,
        title: str,
        message: str,
        order_id: str | None = None,
        listing_id: str | None = None,
    ) -> SellerNotification:
        item = SellerNotification(
            id=_new_id(),
            seller_id=seller_id,
            event_type=event_type,
            title=title,
            message=message,
            order_id=order_id,
            food_listing_id=listing_id,
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def list(
        self, seller_id: str, limit: int, offset: int
    ) -> tuple[list[SellerNotification], int]:
        stmt = select(SellerNotification).where(SellerNotification.seller_id == seller_id)
        count_stmt = select(func.count(SellerNotification.id)).where(
            SellerNotification.seller_id == seller_id
        )
        result = await self.db.execute(
            stmt.order_by(SellerNotification.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total


class SellerAnalyticsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def compute(self, seller_id: str, range_key: str) -> dict:
        start = _range_start(range_key)

        listing_result = await self.db.execute(
            select(FoodListing).where(
                FoodListing.seller_id == seller_id,
                FoodListing.deleted_at.is_(None),
                FoodListing.created_at >= start,
            )
        )
        listings = list(listing_result.scalars().all())

        order_result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.seller_id == seller_id, Order.created_at >= start)
        )
        orders = list(order_result.scalars().all())

        donation_result = await self.db.execute(
            select(NGOListingRequest).where(
                NGOListingRequest.seller_id == seller_id,
                NGOListingRequest.created_at >= start,
                NGOListingRequest.approval_status.in_(
                    [DonationApprovalStatus.APPROVED, DonationApprovalStatus.PICKED_UP]
                ),
            )
        )
        donation_requests = list(donation_result.scalars().all())

        impact_result = await self.db.execute(
            select(EnvironmentalImpactRecord).where(
                EnvironmentalImpactRecord.seller_id == seller_id,
                EnvironmentalImpactRecord.created_at >= start,
            )
        )
        impacts = list(impact_result.scalars().all())

        total_surplus = sum(int(l.total_quantity or 0) for l in listings)
        sold = sum(int(l.quantity_sold or 0) for l in listings)
        donated = sum(int(req.requested_quantity or 0) for req in donation_requests)
        order_count = len(orders)
        consumers_served = len({o.consumer_id for o in orders if o.consumer_id})
        ngos_served = len({d.ngo_id for d in donation_requests})
        revenue = sum(
            float(o.total_amount or 0) for o in orders if o.status != OrderStatus.CANCELLED
        )
        waste_reduced = sum(float(i.food_saved_kg or 0) for i in impacts)
        co2_reduction = sum(float(i.co2_reduction_kg or 0) for i in impacts)

        return {
            "total_surplus_food_listed": total_surplus,
            "total_food_sold": sold,
            "total_food_donated": donated,
            "number_of_orders": order_count,
            "number_of_consumers_served": consumers_served,
            "number_of_ngos_served": ngos_served,
            "revenue_generated": round(revenue, 2),
            "waste_reduced": round(waste_reduced, 3),
            "co2_reduction": round(co2_reduction, 3),
        }
