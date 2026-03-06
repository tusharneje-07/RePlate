"""Repositories for the NGO backend module."""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.impact_constants import co2_from_food_kg, landfill_from_food_kg

from app.models.food import (
    DonationApprovalStatus,
    FoodListing,
    NGOListingRequest,
    PickupRecord,
    PickupStatus,
    VerificationMethod,
)
from app.models.ngo import (
    NGODistributionRecord,
    NGOEnvironmentalImpact,
    NGONotification,
    NGONotificationType,
    NGOServiceArea,
)
from app.models.profiles import NGOProfile, NGOVerificationStatus
from app.models.user import User


def _new_id() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _range_start(range_key: str) -> datetime:
    now = _now()
    if range_key == "weekly":
        return now - timedelta(days=7)
    if range_key == "monthly":
        return now - timedelta(days=30)
    if range_key == "yearly":
        return now - timedelta(days=365)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Profile ────────────────────────────────────────────────────────────────────


class NGOProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, ngo_id: str) -> tuple[User, NGOProfile]:
        user = await self.db.get(User, ngo_id)
        if user is None:
            raise ValueError("NGO user not found")
        result = await self.db.execute(select(NGOProfile).where(NGOProfile.user_id == ngo_id))
        profile = result.scalar_one_or_none()
        if profile is None:
            profile = NGOProfile(
                id=_new_id(),
                user_id=ngo_id,
                verification_status=NGOVerificationStatus.PENDING,
            )
            self.db.add(profile)
            await self.db.commit()
            await self.db.refresh(profile)
        return user, profile

    async def update(self, profile: NGOProfile, values: dict) -> NGOProfile:
        for key, value in values.items():
            if hasattr(profile, key):
                setattr(profile, key, value)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile


# ── Discovery ──────────────────────────────────────────────────────────────────


class NGODiscoveryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def browse_donations(
        self,
        *,
        city: Optional[str],
        food_type: Optional[str],
        category: Optional[str],
        query: Optional[str],
        min_quantity: Optional[int],
        ngo_lat: Optional[float],
        ngo_lng: Optional[float],
        max_distance_km: Optional[float],
        limit: int,
        offset: int,
    ) -> tuple[list[dict], int]:
        from app.models.profiles import SellerProfile

        stmt = (
            select(FoodListing, SellerProfile)
            .join(SellerProfile, SellerProfile.user_id == FoodListing.seller_id, isouter=True)
            .where(
                FoodListing.is_donation == True,  # noqa: E712
                FoodListing.is_active == True,  # noqa: E712
                FoodListing.deleted_at.is_(None),
            )
        )

        if city:
            stmt = stmt.where(SellerProfile.city.ilike(f"%{city}%"))
        if food_type:
            stmt = stmt.where(FoodListing.food_type == food_type)
        if category:
            stmt = stmt.where(FoodListing.category.ilike(f"%{category}%"))
        if query:
            stmt = stmt.where(
                FoodListing.title.ilike(f"%{query}%") | FoodListing.description.ilike(f"%{query}%")
            )
        if min_quantity is not None:
            stmt = stmt.where(FoodListing.quantity_available >= min_quantity)

        result = await self.db.execute(stmt.order_by(FoodListing.created_at.desc()))
        all_rows = result.all()

        # Haversine post-filter + annotation
        annotated: list[dict] = []
        for listing, seller in all_rows:
            dist: Optional[float] = None
            if (
                ngo_lat is not None
                and ngo_lng is not None
                and seller is not None
                and seller.lat is not None
                and seller.lng is not None
            ):
                dist = round(
                    _haversine_km(
                        float(ngo_lat),
                        float(ngo_lng),
                        float(seller.lat),
                        float(seller.lng),
                    ),
                    2,
                )
                if max_distance_km is not None and dist > max_distance_km:
                    continue
            annotated.append({"listing": listing, "seller": seller, "distance_from_ngo": dist})

        total = len(annotated)
        page = annotated[offset : offset + limit]
        return page, total


# ── Donation Requests ─────────────────────────────────────────────────────────


class NGODonationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_request(
        self,
        ngo_id: str,
        listing: FoodListing,
        requested_quantity: int,
        pickup_time: Optional[str],
    ) -> NGOListingRequest:
        async with self.db.begin():
            # Prevent duplicate active request
            dup = await self.db.execute(
                select(NGOListingRequest).where(
                    NGOListingRequest.ngo_id == ngo_id,
                    NGOListingRequest.listing_id == listing.id,
                    NGOListingRequest.approval_status == DonationApprovalStatus.REQUESTED,
                )
            )
            if dup.scalar_one_or_none():
                raise ValueError("An active request already exists for this listing")

            if listing.quantity_available < requested_quantity:
                raise ValueError(
                    f"Only {listing.quantity_available} units available; "
                    f"requested {requested_quantity}"
                )

            req = NGOListingRequest(
                id=_new_id(),
                ngo_id=ngo_id,
                listing_id=listing.id,
                seller_id=listing.seller_id,
                requested_quantity=requested_quantity,
                pickup_time=pickup_time,
                approval_status=DonationApprovalStatus.REQUESTED,
            )
            self.db.add(req)

        await self.db.refresh(req)
        return req

    async def list_requests(
        self,
        ngo_id: str,
        approval_status: Optional[str],
        limit: int,
        offset: int,
    ) -> tuple[list[NGOListingRequest], int]:
        stmt = select(NGOListingRequest).where(NGOListingRequest.ngo_id == ngo_id)
        count_stmt = select(func.count(NGOListingRequest.id)).where(
            NGOListingRequest.ngo_id == ngo_id
        )
        if approval_status:
            stmt = stmt.where(NGOListingRequest.approval_status == approval_status)
            count_stmt = count_stmt.where(NGOListingRequest.approval_status == approval_status)
        result = await self.db.execute(
            stmt.order_by(NGOListingRequest.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def get_request(self, ngo_id: str, request_id: str) -> Optional[NGOListingRequest]:
        result = await self.db.execute(
            select(NGOListingRequest).where(
                NGOListingRequest.id == request_id,
                NGOListingRequest.ngo_id == ngo_id,
            )
        )
        return result.scalar_one_or_none()

    async def cancel_request(self, req: NGOListingRequest) -> NGOListingRequest:
        req.approval_status = DonationApprovalStatus.REJECTED
        await self.db.commit()
        await self.db.refresh(req)
        return req

    async def get_listing(self, listing_id: str) -> Optional[FoodListing]:
        return await self.db.get(FoodListing, listing_id)


# ── Pickup Management ──────────────────────────────────────────────────────────


class NGOPickupRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def schedule(
        self,
        donation_request: NGOListingRequest,
        pickup_time: Optional[str],
    ) -> PickupRecord:
        # Check if record already exists
        result = await self.db.execute(
            select(PickupRecord).where(PickupRecord.donation_request_id == donation_request.id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            if pickup_time:
                existing.pickup_time = pickup_time
                await self.db.commit()
                await self.db.refresh(existing)
            return existing

        record = PickupRecord(
            id=_new_id(),
            donation_request_id=donation_request.id,
            seller_id=donation_request.seller_id,
            pickup_code=f"DN-{uuid.uuid4().hex[:8].upper()}",
            pickup_status=PickupStatus.PENDING,
            pickup_time=pickup_time,
            verification_method=VerificationMethod.CODE,
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def list_pickups(
        self,
        ngo_id: str,
        pickup_status: Optional[str],
        limit: int,
        offset: int,
    ) -> tuple[list[PickupRecord], int]:
        # Join with donation requests to filter by ngo_id
        stmt = (
            select(PickupRecord)
            .join(
                NGOListingRequest,
                NGOListingRequest.id == PickupRecord.donation_request_id,
            )
            .where(NGOListingRequest.ngo_id == ngo_id)
        )
        count_stmt = (
            select(func.count(PickupRecord.id))
            .join(
                NGOListingRequest,
                NGOListingRequest.id == PickupRecord.donation_request_id,
            )
            .where(NGOListingRequest.ngo_id == ngo_id)
        )
        if pickup_status:
            stmt = stmt.where(PickupRecord.pickup_status == pickup_status)
            count_stmt = count_stmt.where(PickupRecord.pickup_status == pickup_status)
        result = await self.db.execute(
            stmt.order_by(PickupRecord.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def get_pickup_for_ngo(self, ngo_id: str, pickup_id: str) -> Optional[PickupRecord]:
        result = await self.db.execute(
            select(PickupRecord)
            .join(
                NGOListingRequest,
                NGOListingRequest.id == PickupRecord.donation_request_id,
            )
            .where(
                PickupRecord.id == pickup_id,
                NGOListingRequest.ngo_id == ngo_id,
            )
        )
        return result.scalar_one_or_none()

    async def complete_pickup(self, pickup: PickupRecord) -> PickupRecord:
        pickup.pickup_status = PickupStatus.COMPLETED
        pickup.pickup_time = _now().isoformat()
        # Also mark the donation request as PICKED_UP
        if pickup.donation_request_id:
            req = await self.db.get(NGOListingRequest, pickup.donation_request_id)
            if req:
                req.approval_status = DonationApprovalStatus.PICKED_UP
        await self.db.commit()
        await self.db.refresh(pickup)
        return pickup


# ── Distribution Tracking ─────────────────────────────────────────────────────


class NGODistributionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, ngo_id: str, values: dict) -> NGODistributionRecord:
        record = NGODistributionRecord(id=_new_id(), ngo_id=ngo_id, **values)
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def update(self, record: NGODistributionRecord, values: dict) -> NGODistributionRecord:
        for key, value in values.items():
            if hasattr(record, key):
                setattr(record, key, value)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def get(self, ngo_id: str, distribution_id: str) -> Optional[NGODistributionRecord]:
        result = await self.db.execute(
            select(NGODistributionRecord).where(
                NGODistributionRecord.id == distribution_id,
                NGODistributionRecord.ngo_id == ngo_id,
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self, ngo_id: str, limit: int, offset: int
    ) -> tuple[list[NGODistributionRecord], int]:
        stmt = select(NGODistributionRecord).where(NGODistributionRecord.ngo_id == ngo_id)
        count_stmt = select(func.count(NGODistributionRecord.id)).where(
            NGODistributionRecord.ngo_id == ngo_id
        )
        result = await self.db.execute(
            stmt.order_by(NGODistributionRecord.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total


# ── Analytics ──────────────────────────────────────────────────────────────────


class NGOAnalyticsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def compute(self, ngo_id: str, range_key: str) -> dict:
        start = _range_start(range_key)

        # Donation requests
        req_result = await self.db.execute(
            select(NGOListingRequest).where(
                NGOListingRequest.ngo_id == ngo_id,
                NGOListingRequest.created_at >= start,
            )
        )
        requests = list(req_result.scalars().all())

        total_requests = len(requests)
        approved = sum(
            1
            for r in requests
            if r.approval_status
            in {DonationApprovalStatus.APPROVED, DonationApprovalStatus.PICKED_UP}
        )
        pending = sum(1 for r in requests if r.approval_status == DonationApprovalStatus.REQUESTED)

        # Completed pickups
        pickup_result = await self.db.execute(
            select(PickupRecord)
            .join(
                NGOListingRequest,
                NGOListingRequest.id == PickupRecord.donation_request_id,
            )
            .where(
                NGOListingRequest.ngo_id == ngo_id,
                PickupRecord.pickup_status == PickupStatus.COMPLETED,
                PickupRecord.created_at >= start,
            )
        )
        completed_pickups = list(pickup_result.scalars().all())

        # Environmental impact
        impact_result = await self.db.execute(
            select(NGOEnvironmentalImpact).where(
                NGOEnvironmentalImpact.ngo_id == ngo_id,
                NGOEnvironmentalImpact.created_at >= start,
            )
        )
        impacts = list(impact_result.scalars().all())

        food_collected = sum(float(i.food_saved_kg or 0) for i in impacts)
        co2_total = sum(float(i.co2_reduction_kg or 0) for i in impacts)
        landfill_total = sum(float(i.landfill_waste_reduction_kg or 0) for i in impacts)

        # Distribution
        dist_result = await self.db.execute(
            select(NGODistributionRecord).where(
                NGODistributionRecord.ngo_id == ngo_id,
                NGODistributionRecord.created_at >= start,
            )
        )
        distributions = list(dist_result.scalars().all())
        food_distributed = sum(float(d.food_quantity_received or 0) for d in distributions)
        beneficiaries = sum(int(d.beneficiaries_served or 0) for d in distributions)

        # Unique sellers
        sellers = {r.seller_id for r in requests if r.seller_id}

        return {
            "total_food_collected_kg": round(food_collected, 3),
            "total_food_distributed_kg": round(food_distributed, 3),
            "total_pickups_completed": len(completed_pickups),
            "total_sellers_supported": len(sellers),
            "total_beneficiaries_served": beneficiaries,
            "co2_reduction_total": round(co2_total, 3),
            "landfill_waste_reduction_total": round(landfill_total, 3),
            "total_requests": total_requests,
            "approved_requests": approved,
            "pending_requests": pending,
        }


# ── Environmental Impact ───────────────────────────────────────────────────────


class NGOImpactRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_for_pickup(
        self, ngo_id: str, donation_request_id: str, food_kg: float
    ) -> NGOEnvironmentalImpact:
        # idempotent — skip if already exists
        existing = await self.db.execute(
            select(NGOEnvironmentalImpact).where(
                NGOEnvironmentalImpact.donation_request_id == donation_request_id
            )
        )
        if existing.scalar_one_or_none():
            return existing.scalar_one_or_none()  # type: ignore[return-value]

        impact = NGOEnvironmentalImpact(
            id=_new_id(),
            ngo_id=ngo_id,
            donation_request_id=donation_request_id,
            food_saved_kg=food_kg,
            co2_reduction_kg=co2_from_food_kg(food_kg),
            landfill_waste_reduction_kg=landfill_from_food_kg(food_kg),
        )
        self.db.add(impact)
        await self.db.commit()
        await self.db.refresh(impact)
        return impact


# ── Notifications ──────────────────────────────────────────────────────────────


class NGONotificationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        ngo_id: str,
        event_type: NGONotificationType,
        title: str,
        message: str,
        reference_id: Optional[str] = None,
    ) -> NGONotification:
        notif = NGONotification(
            id=_new_id(),
            ngo_id=ngo_id,
            event_type=event_type,
            title=title,
            message=message,
            reference_id=reference_id,
        )
        self.db.add(notif)
        await self.db.commit()
        await self.db.refresh(notif)
        return notif

    async def list(
        self,
        ngo_id: str,
        unread_only: bool,
        limit: int,
        offset: int,
    ) -> tuple[list[NGONotification], int]:
        stmt = select(NGONotification).where(NGONotification.ngo_id == ngo_id)
        count_stmt = select(func.count(NGONotification.id)).where(NGONotification.ngo_id == ngo_id)
        if unread_only:
            stmt = stmt.where(NGONotification.is_read == False)  # noqa: E712
            count_stmt = count_stmt.where(NGONotification.is_read == False)  # noqa: E712
        result = await self.db.execute(
            stmt.order_by(NGONotification.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def mark_read(self, ngo_id: str, notification_id: str) -> bool:
        result = await self.db.execute(
            select(NGONotification).where(
                NGONotification.id == notification_id,
                NGONotification.ngo_id == ngo_id,
            )
        )
        notif = result.scalar_one_or_none()
        if notif is None:
            return False
        notif.is_read = True
        await self.db.commit()
        return True

    async def mark_all_read(self, ngo_id: str) -> int:
        result = await self.db.execute(
            select(NGONotification).where(
                NGONotification.ngo_id == ngo_id,
                NGONotification.is_read == False,  # noqa: E712
            )
        )
        unread = result.scalars().all()
        for n in unread:
            n.is_read = True
        if unread:
            await self.db.commit()
        return len(unread)


# ── Service Areas ──────────────────────────────────────────────────────────────


class NGOServiceAreaRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(self, ngo_id: str) -> list[NGOServiceArea]:
        result = await self.db.execute(
            select(NGOServiceArea)
            .where(NGOServiceArea.ngo_id == ngo_id)
            .order_by(NGOServiceArea.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, ngo_id: str, values: dict) -> NGOServiceArea:
        area = NGOServiceArea(id=_new_id(), ngo_id=ngo_id, **values)
        self.db.add(area)
        await self.db.commit()
        await self.db.refresh(area)
        return area

    async def delete(self, ngo_id: str, area_id: str) -> bool:
        result = await self.db.execute(
            select(NGOServiceArea).where(
                NGOServiceArea.id == area_id,
                NGOServiceArea.ngo_id == ngo_id,
            )
        )
        area = result.scalar_one_or_none()
        if area is None:
            return False
        await self.db.delete(area)
        await self.db.commit()
        return True
