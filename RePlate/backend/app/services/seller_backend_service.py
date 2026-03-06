"""Service layer for seller backend modules."""

from __future__ import annotations

import json

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.food import (
    DonationApprovalStatus,
    FoodType,
    OrderStatus,
    SellerListingStatus,
    SellerNotificationType,
    VerificationMethod,
)
from app.models.user import User
from app.repositories.seller_backend_repository import (
    DonationRepository,
    InventoryRepository,
    PickupRepository,
    SellerAnalyticsRepository,
    SellerListingRepository,
    SellerNotificationRepository,
    SellerOrderRepository,
    SellerProfileRepository,
)
from app.schemas.seller_backend import (
    DonationRequestOut,
    InventoryOut,
    ListingCreateIn,
    ListingOut,
    ListingUpdateIn,
    NotificationOut,
    OrderOut,
    PickupOut,
    SellerProfileOut,
    SellerProfileUpdateIn,
)


def _listing_to_out(item) -> ListingOut:
    images = []
    if item.images:
        try:
            parsed = json.loads(item.images)
            if isinstance(parsed, list):
                images = [str(v) for v in parsed if v]
        except Exception:
            images = [item.images]
    tags = []
    if item.tags:
        tags = [part.strip() for part in item.tags.split(",") if part.strip()]
    return ListingOut(
        id=item.id,
        item_name=item.title,
        category=item.category,
        description=item.description,
        quantity_available=int(item.quantity_available),
        unit=item.quantity_unit,
        price=float(item.discounted_price),
        original_price=float(item.original_price),
        expiry_time=item.expires_at,
        pickup_start_time=item.pickup_start,
        pickup_end_time=item.pickup_end,
        is_donation=bool(item.is_donation),
        image_url=images[0] if images else None,
        food_type=item.food_type.value if hasattr(item.food_type, "value") else str(item.food_type),
        status=item.seller_status.value
        if hasattr(item.seller_status, "value")
        else str(item.seller_status),
        tags=tags,
        cuisine_type=item.cuisine_type,
        distance_from_user=float(item.distance_from_user)
        if item.distance_from_user is not None
        else None,
        freshness_score=float(item.freshness_score) if item.freshness_score is not None else None,
        popularity_score=float(item.popularity_score)
        if item.popularity_score is not None
        else None,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


class SellerProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = SellerProfileRepository(db)

    async def get_profile(self, seller_id: str) -> SellerProfileOut:
        user, profile = await self.repo.get(seller_id)
        return SellerProfileOut(
            business_name=profile.business_name,
            business_type=profile.business_type,
            owner_name=profile.owner_name,
            phone=profile.phone_number,
            email=user.email,
            address=profile.address_line1,
            city=profile.city,
            state=profile.state,
            pincode=profile.postal_code,
            latitude=float(profile.lat) if profile.lat is not None else None,
            longitude=float(profile.lng) if profile.lng is not None else None,
            opening_time=profile.open_time,
            closing_time=profile.close_time,
            fssai_license_number=profile.license_number,
            verification_status=(
                profile.verification_status.value
                if hasattr(profile.verification_status, "value")
                else str(profile.verification_status)
            ),
            fssai_certificate_url=profile.fssai_certificate_url,
        )

    async def update_profile(self, seller_id: str, body: SellerProfileUpdateIn) -> SellerProfileOut:
        _, profile = await self.repo.get(seller_id)
        data = body.model_dump(exclude_unset=True)
        mapped = {
            "business_name": data.get("business_name"),
            "business_type": data.get("business_type"),
            "owner_name": data.get("owner_name"),
            "phone_number": data.get("phone"),
            "address_line1": data.get("address"),
            "city": data.get("city"),
            "state": data.get("state"),
            "postal_code": data.get("pincode"),
            "lat": data.get("latitude"),
            "lng": data.get("longitude"),
            "open_time": data.get("opening_time"),
            "close_time": data.get("closing_time"),
            "license_number": data.get("fssai_license_number"),
        }
        cleaned = {k: v for k, v in mapped.items() if v is not None}
        await self.repo.update(profile, cleaned)
        return await self.get_profile(seller_id)


class SellerListingsService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = SellerListingRepository(db)
        self.inventory_repo = InventoryRepository(db)
        self.notification_repo = SellerNotificationRepository(db)

    async def create_listing(self, seller: User, body: ListingCreateIn) -> ListingOut:
        status_value = SellerListingStatus.ACTIVE
        if body.quantity_available <= 0:
            status_value = SellerListingStatus.SOLD_OUT

        payload = {
            "title": body.item_name,
            "description": body.description,
            "category": body.category,
            "images": json.dumps([body.image_url] if body.image_url else []),
            "original_price": body.original_price,
            "discounted_price": body.price,
            "discount_percent": int(
                round(((body.original_price - body.price) / body.original_price) * 100)
            )
            if body.original_price > 0
            else 0,
            "quantity_available": body.quantity_available,
            "total_quantity": body.quantity_available,
            "quantity_sold": 0,
            "quantity_unit": body.unit,
            "pickup_start": body.pickup_start_time,
            "pickup_end": body.pickup_end_time,
            "expires_at": body.expiry_time,
            "is_donation": body.is_donation,
            "food_type": FoodType(body.food_type),
            "seller_status": status_value,
            "is_active": status_value == SellerListingStatus.ACTIVE,
            "seller_name": seller.email.split("@")[0],
            "tags": ",".join(body.tags),
            "cuisine_type": body.cuisine_type,
            "freshness_score": body.freshness_score,
            "popularity_score": body.popularity_score,
        }
        created = await self.repo.create(seller.id, payload)
        return _listing_to_out(created)

    async def list_listings(
        self, seller_id: str, status_filter: str | None, limit: int, offset: int
    ) -> tuple[list[ListingOut], int]:
        rows, total = await self.repo.list(
            seller_id, status=status_filter, limit=limit, offset=offset
        )
        return [_listing_to_out(row) for row in rows], total

    async def update_listing(
        self, seller_id: str, listing_id: str, body: ListingUpdateIn
    ) -> ListingOut:
        listing = await self.repo.get(seller_id, listing_id)
        if listing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

        data = body.model_dump(exclude_unset=True)
        updates: dict = {}
        if "item_name" in data:
            updates["title"] = data["item_name"]
        if "description" in data:
            updates["description"] = data["description"]
        if "category" in data:
            updates["category"] = data["category"]
        if "quantity_available" in data:
            updates["quantity_available"] = data["quantity_available"]
        if "unit" in data:
            updates["quantity_unit"] = data["unit"]
        if "price" in data:
            updates["discounted_price"] = data["price"]
        if "original_price" in data:
            updates["original_price"] = data["original_price"]
        if "expiry_time" in data:
            updates["expires_at"] = data["expiry_time"]
        if "pickup_start_time" in data:
            updates["pickup_start"] = data["pickup_start_time"]
        if "pickup_end_time" in data:
            updates["pickup_end"] = data["pickup_end_time"]
        if "is_donation" in data:
            updates["is_donation"] = data["is_donation"]
        if "image_url" in data:
            updates["images"] = json.dumps([data["image_url"]] if data["image_url"] else [])
        if "food_type" in data and data["food_type"]:
            updates["food_type"] = FoodType(data["food_type"])
        if "status" in data and data["status"]:
            updates["seller_status"] = SellerListingStatus(data["status"])
            updates["is_active"] = data["status"] == SellerListingStatus.ACTIVE.value
        if "tags" in data and data["tags"] is not None:
            updates["tags"] = ",".join(data["tags"])
        if "cuisine_type" in data:
            updates["cuisine_type"] = data["cuisine_type"]
        if "freshness_score" in data:
            updates["freshness_score"] = data["freshness_score"]
        if "popularity_score" in data:
            updates["popularity_score"] = data["popularity_score"]

        if "quantity_available" in updates:
            delta = int(updates["quantity_available"]) - int(listing.quantity_available)
            if delta > 0:
                updates["total_quantity"] = int(listing.total_quantity) + delta

        if "original_price" in updates or "discounted_price" in updates:
            original = float(updates.get("original_price", listing.original_price))
            discounted = float(updates.get("discounted_price", listing.discounted_price))
            updates["discount_percent"] = (
                int(round(((original - discounted) / original) * 100)) if original > 0 else 0
            )

        updated = await self.repo.update(listing, updates)
        tracking = await self.inventory_repo.get(updated.id)
        if tracking:
            await self.inventory_repo.update_remaining(tracking, int(updated.quantity_available))
        return _listing_to_out(updated)

    async def delete_listing(self, seller_id: str, listing_id: str) -> None:
        listing = await self.repo.get(seller_id, listing_id)
        if listing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
        await self.repo.soft_delete(listing)


class SellerInventoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.listing_repo = SellerListingRepository(db)
        self.inventory_repo = InventoryRepository(db)

    async def get_inventory(self, seller_id: str, listing_id: str) -> InventoryOut:
        listing = await self.listing_repo.get(seller_id, listing_id)
        if listing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
        tracking = await self.inventory_repo.get(listing_id)
        if tracking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found"
            )
        return InventoryOut(
            listing_id=tracking.listing_id,
            initial_quantity=tracking.initial_quantity,
            remaining_quantity=tracking.remaining_quantity,
            last_updated=tracking.last_updated,
        )

    async def adjust_inventory(
        self, seller_id: str, listing_id: str, quantity_delta: int
    ) -> InventoryOut:
        listing = await self.listing_repo.get(seller_id, listing_id)
        if listing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
        tracking = await self.inventory_repo.get(listing_id)
        if tracking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found"
            )

        new_remaining = max(int(tracking.remaining_quantity) + quantity_delta, 0)
        await self.inventory_repo.update_remaining(tracking, new_remaining)
        await self.listing_repo.update(
            listing,
            {
                "quantity_available": new_remaining,
                "seller_status": SellerListingStatus.SOLD_OUT
                if new_remaining == 0
                else SellerListingStatus.ACTIVE,
                "is_active": new_remaining > 0,
            },
        )
        return InventoryOut(
            listing_id=tracking.listing_id,
            initial_quantity=tracking.initial_quantity,
            remaining_quantity=new_remaining,
            last_updated=tracking.last_updated,
        )


class SellerOrdersService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = SellerOrderRepository(db)
        self.notification_repo = SellerNotificationRepository(db)

    @staticmethod
    def _order_to_out(order) -> OrderOut:
        first_item = order.items[0] if order.items else None
        quantity = sum(int(i.quantity) for i in order.items)
        return OrderOut(
            order_id=order.id,
            listing_id=first_item.food_listing_id if first_item else None,
            consumer_id=order.consumer_id,
            quantity=quantity,
            total_price=float(order.total_amount),
            order_time=order.created_at,
            pickup_time=order.pickup_time,
            order_status=order.status.value
            if hasattr(order.status, "value")
            else str(order.status),
            payment_status=(
                order.payment_status.value
                if hasattr(order.payment_status, "value")
                else str(order.payment_status)
            ),
        )

    async def list_orders(
        self,
        seller_id: str,
        *,
        status_filter: str | None,
        start_date,
        end_date,
        limit: int,
        offset: int,
    ) -> tuple[list[OrderOut], int]:
        rows, total = await self.repo.list(
            seller_id,
            status=status_filter,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset,
        )
        return [self._order_to_out(row) for row in rows], total

    async def update_status(
        self,
        seller_id: str,
        order_id: str,
        status_value: str,
        cancel_reason: str | None,
    ) -> OrderOut:
        try:
            status_enum = OrderStatus(status_value)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid order status"
            ) from exc

        try:
            order = await self.repo.transition_status(
                seller_id,
                order_id,
                next_status=status_enum,
                cancel_reason=cancel_reason,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        if status_enum == OrderStatus.COMPLETED:
            try:
                await self.repo.create_or_update_impact(order)
            except ValueError:
                pass
            await self.notification_repo.create(
                seller_id,
                SellerNotificationType.ORDER_COMPLETED,
                "Order completed",
                f"Order {order.order_number} marked as completed.",
                order_id=order.id,
            )
        elif status_enum == OrderStatus.CANCELLED:
            await self.notification_repo.create(
                seller_id,
                SellerNotificationType.ORDER_CANCELLED,
                "Order cancelled",
                f"Order {order.order_number} has been cancelled.",
                order_id=order.id,
            )

        return self._order_to_out(order)


class SellerDonationsService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = DonationRepository(db)
        self.notification_repo = SellerNotificationRepository(db)

    @staticmethod
    def _map(row) -> DonationRequestOut:
        return DonationRequestOut(
            id=row.id,
            ngo_id=row.ngo_id,
            listing_id=row.listing_id,
            requested_quantity=row.requested_quantity,
            pickup_time=row.pickup_time,
            approval_status=(
                row.approval_status.value
                if hasattr(row.approval_status, "value")
                else str(row.approval_status)
            ),
            created_at=row.created_at,
        )

    async def list_requests(
        self, seller_id: str, limit: int, offset: int
    ) -> tuple[list[DonationRequestOut], int]:
        rows, total = await self.repo.list_for_seller(seller_id, limit, offset)
        return [self._map(row) for row in rows], total

    async def update_status(
        self, seller_id: str, request_id: str, status_value: str
    ) -> DonationRequestOut:
        row = await self.repo.get_for_seller(seller_id, request_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Donation request not found"
            )

        try:
            enum_value = DonationApprovalStatus(status_value)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid donation status"
            ) from exc

        updated = await self.repo.update_status(row, enum_value)
        if enum_value in {DonationApprovalStatus.APPROVED, DonationApprovalStatus.REJECTED}:
            await self.notification_repo.create(
                seller_id,
                SellerNotificationType.NGO_PICKUP_REQUEST,
                "Donation request updated",
                f"NGO request {updated.id} marked as {enum_value.value}.",
                listing_id=updated.listing_id,
            )
        return self._map(updated)


class SellerPickupService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = PickupRepository(db)

    @staticmethod
    def _map(row) -> PickupOut:
        return PickupOut(
            id=row.id,
            order_id=row.order_id,
            donation_request_id=row.donation_request_id,
            pickup_code=row.pickup_code,
            pickup_status=row.pickup_status.value
            if hasattr(row.pickup_status, "value")
            else str(row.pickup_status),
            pickup_time=row.pickup_time,
            verification_method=(
                row.verification_method.value
                if hasattr(row.verification_method, "value")
                else str(row.verification_method)
            ),
        )

    async def create_order_pickup(self, seller_id: str, order_id: str) -> PickupOut:
        row = await self.repo.create_for_order(seller_id, order_id)
        return self._map(row)

    async def verify_pickup(
        self, seller_id: str, pickup_code: str, verification_method: str
    ) -> PickupOut:
        row = await self.repo.get_by_code(seller_id, pickup_code)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Pickup code not found"
            )
        try:
            method = VerificationMethod(verification_method)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid verification method",
            ) from exc
        updated = await self.repo.verify_and_complete(row, method)
        return self._map(updated)


class SellerNotificationsService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = SellerNotificationRepository(db)

    async def list_notifications(
        self, seller_id: str, limit: int, offset: int
    ) -> tuple[list[NotificationOut], int]:
        rows, total = await self.repo.list(seller_id, limit, offset)
        data = [
            NotificationOut(
                id=row.id,
                event_type=row.event_type.value
                if hasattr(row.event_type, "value")
                else str(row.event_type),
                title=row.title,
                message=row.message,
                is_read=row.is_read,
                created_at=row.created_at,
            )
            for row in rows
        ]
        return data, total


class SellerAnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = SellerAnalyticsRepository(db)

    async def get_metrics(self, seller_id: str, range_key: str) -> dict:
        return await self.repo.compute(seller_id, range_key)
