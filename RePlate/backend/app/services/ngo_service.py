"""Service layer for the NGO backend module."""

from __future__ import annotations

import json
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.food import DonationApprovalStatus
from app.models.ngo import NGONotificationType
from app.models.profiles import NGOVerificationStatus, NGOType
from app.repositories.ngo_repository import (
    NGOAnalyticsRepository,
    NGODiscoveryRepository,
    NGODistributionRepository,
    NGODonationRepository,
    NGOImpactRepository,
    NGONotificationRepository,
    NGOPickupRepository,
    NGOProfileRepository,
    NGOServiceAreaRepository,
)
from app.schemas.ngo import (
    DonationListingOut,
    DonationRequestCreateIn,
    DonationRequestOut,
    DistributionCreateIn,
    DistributionOut,
    DistributionUpdateIn,
    NGODashboardOut,
    NGOImpactOut,
    NGONotificationOut,
    NGOPickupOut,
    NGOProfileOut,
    NGOProfileUpdateIn,
    PickupScheduleIn,
    ServiceAreaCreateIn,
    ServiceAreaOut,
)


def _profile_to_out(user, profile) -> NGOProfileOut:
    closed_days: list[str] = []
    if profile.closed_days:
        try:
            parsed = json.loads(profile.closed_days)
            if isinstance(parsed, list):
                closed_days = [str(d) for d in parsed]
        except Exception:
            closed_days = []

    return NGOProfileOut(
        id=profile.id,
        organization_name=profile.organization_name,
        registration_number=profile.registration_number,
        mission_statement=profile.mission_statement,
        phone=profile.phone_number,
        email=user.email,
        address=profile.address_line1,
        city=profile.city,
        state=profile.state,
        postal_code=profile.postal_code,
        country=profile.country,
        serving_capacity=profile.serving_capacity,
        logo_url=profile.logo_url,
        is_verified=profile.is_verified,
        completion_status=(
            profile.completion_status.value
            if hasattr(profile.completion_status, "value")
            else str(profile.completion_status)
        ),
        latitude=float(profile.lat) if profile.lat is not None else None,
        longitude=float(profile.lng) if profile.lng is not None else None,
        operating_radius_km=float(profile.operating_radius_km)
        if profile.operating_radius_km is not None
        else None,
        ngo_type=(
            profile.ngo_type.value
            if hasattr(profile.ngo_type, "value")
            else (str(profile.ngo_type) if profile.ngo_type else None)
        ),
        verification_status=(
            profile.verification_status.value
            if hasattr(profile.verification_status, "value")
            else str(profile.verification_status)
        ),
        document_url=profile.document_url,
        contact_person_name=profile.contact_person_name,
        vehicle_type=profile.vehicle_type,
        open_time=profile.open_time,
        close_time=profile.close_time,
        closed_days=closed_days if closed_days else None,
    )


def _request_to_out(row, listing=None) -> DonationRequestOut:
    return DonationRequestOut(
        id=row.id,
        ngo_id=row.ngo_id,
        listing_id=row.listing_id,
        seller_id=row.seller_id,
        requested_quantity=row.requested_quantity,
        pickup_time=row.pickup_time,
        approval_status=(
            row.approval_status.value
            if hasattr(row.approval_status, "value")
            else str(row.approval_status)
        ),
        created_at=row.created_at,
        updated_at=row.updated_at,
        listing_title=listing.title if listing else None,
        listing_quantity_unit=listing.quantity_unit if listing else None,
        listing_category=listing.category if listing else None,
        seller_name=listing.seller_name if listing else None,
    )


def _pickup_to_out(row) -> NGOPickupOut:
    return NGOPickupOut(
        id=row.id,
        donation_request_id=row.donation_request_id,
        seller_id=row.seller_id,
        pickup_code=row.pickup_code,
        pickup_status=(
            row.pickup_status.value
            if hasattr(row.pickup_status, "value")
            else str(row.pickup_status)
        ),
        pickup_time=row.pickup_time,
        verification_method=(
            row.verification_method.value
            if hasattr(row.verification_method, "value")
            else str(row.verification_method)
        ),
        created_at=row.created_at,
    )


def _dist_to_out(row) -> DistributionOut:
    return DistributionOut(
        id=row.id,
        ngo_id=row.ngo_id,
        donation_request_id=row.donation_request_id,
        food_quantity_received=float(row.food_quantity_received),
        beneficiaries_served=int(row.beneficiaries_served),
        distribution_location=row.distribution_location,
        distribution_date=row.distribution_date,
        notes=row.notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _listing_row_to_out(item, distance: Optional[float]) -> DonationListingOut:
    images: list[str] = []
    if item.images:
        try:
            parsed = json.loads(item.images)
            if isinstance(parsed, list):
                images = [str(v) for v in parsed if v]
        except Exception:
            images = [item.images]
    tags: list[str] = []
    if item.tags:
        tags = [t.strip() for t in item.tags.split(",") if t.strip()]
    return DonationListingOut(
        id=item.id,
        title=item.title,
        description=item.description,
        category=item.category,
        food_type=item.food_type.value if hasattr(item.food_type, "value") else str(item.food_type),
        quantity_available=int(item.quantity_available),
        quantity_unit=item.quantity_unit,
        original_price=float(item.original_price),
        discounted_price=float(item.discounted_price),
        pickup_start=item.pickup_start,
        pickup_end=item.pickup_end,
        expires_at=item.expires_at,
        seller_id=item.seller_id,
        seller_name=item.seller_name,
        seller_address=item.seller_address,
        seller_logo_url=item.seller_logo_url,
        is_active=bool(item.is_active),
        distance_from_ngo=distance,
        images=images,
        tags=tags,
        created_at=item.created_at,
    )


# ── Service classes ────────────────────────────────────────────────────────────


class NGOProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = NGOProfileRepository(db)

    async def get_profile(self, ngo_id: str) -> NGOProfileOut:
        user, profile = await self.repo.get(ngo_id)
        return _profile_to_out(user, profile)

    async def update_profile(self, ngo_id: str, body: NGOProfileUpdateIn) -> NGOProfileOut:
        _, profile = await self.repo.get(ngo_id)
        data = body.model_dump(exclude_unset=True)
        mapped: dict = {}
        if "organization_name" in data:
            mapped["organization_name"] = data["organization_name"]
        if "registration_number" in data:
            mapped["registration_number"] = data["registration_number"]
        if "mission_statement" in data:
            mapped["mission_statement"] = data["mission_statement"]
        if "phone" in data:
            mapped["phone_number"] = data["phone"]
        if "address" in data:
            mapped["address_line1"] = data["address"]
        if "city" in data:
            mapped["city"] = data["city"]
        if "state" in data:
            mapped["state"] = data["state"]
        if "postal_code" in data:
            mapped["postal_code"] = data["postal_code"]
        if "serving_capacity" in data:
            mapped["serving_capacity"] = data["serving_capacity"]
        if "logo_url" in data:
            mapped["logo_url"] = data["logo_url"]
        if "latitude" in data:
            mapped["lat"] = data["latitude"]
        if "longitude" in data:
            mapped["lng"] = data["longitude"]
        if "operating_radius_km" in data:
            mapped["operating_radius_km"] = data["operating_radius_km"]
        if "ngo_type" in data and data["ngo_type"]:
            try:
                mapped["ngo_type"] = NGOType(data["ngo_type"])
            except ValueError:
                pass
        if "contact_person_name" in data:
            mapped["contact_person_name"] = data["contact_person_name"]
        if "vehicle_type" in data:
            mapped["vehicle_type"] = data["vehicle_type"]
        if "open_time" in data:
            mapped["open_time"] = data["open_time"]
        if "close_time" in data:
            mapped["close_time"] = data["close_time"]
        if "closed_days" in data and data["closed_days"] is not None:
            mapped["closed_days"] = json.dumps(data["closed_days"])

        await self.repo.update(profile, mapped)
        return await self.get_profile(ngo_id)

    async def set_document_url(self, ngo_id: str, url: str) -> NGOProfileOut:
        _, profile = await self.repo.get(ngo_id)
        await self.repo.update(profile, {"document_url": url})
        return await self.get_profile(ngo_id)


class NGODiscoveryService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = NGODiscoveryRepository(db)
        self.profile_repo = NGOProfileRepository(db)

    async def browse(
        self,
        ngo_id: str,
        *,
        city: Optional[str],
        food_type: Optional[str],
        category: Optional[str],
        query: Optional[str],
        min_quantity: Optional[int],
        max_distance_km: Optional[float],
        limit: int,
        offset: int,
    ) -> tuple[list[DonationListingOut], int]:
        _, profile = await self.profile_repo.get(ngo_id)
        ngo_lat = float(profile.lat) if profile.lat is not None else None
        ngo_lng = float(profile.lng) if profile.lng is not None else None

        rows, total = await self.repo.browse_donations(
            city=city,
            food_type=food_type,
            category=category,
            query=query,
            min_quantity=min_quantity,
            ngo_lat=ngo_lat,
            ngo_lng=ngo_lng,
            max_distance_km=max_distance_km,
            limit=limit,
            offset=offset,
        )
        out = [_listing_row_to_out(r["listing"], r["distance_from_ngo"]) for r in rows]
        return out, total


class NGODonationService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = NGODonationRepository(db)
        self.notif_repo = NGONotificationRepository(db)

    async def create_request(
        self, ngo_id: str, body: DonationRequestCreateIn
    ) -> DonationRequestOut:
        listing = await self.repo.get_listing(body.listing_id)
        if listing is None or listing.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
        if not listing.is_donation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Listing is not a donation"
            )
        if not listing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Listing is no longer active"
            )
        try:
            req = await self.repo.create_request(
                ngo_id, listing, body.requested_quantity, body.pickup_time
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        return _request_to_out(req, listing)

    async def list_requests(
        self,
        ngo_id: str,
        approval_status: Optional[str],
        limit: int,
        offset: int,
    ) -> tuple[list[DonationRequestOut], int]:
        rows, total = await self.repo.list_requests(ngo_id, approval_status, limit, offset)
        return [_request_to_out(r) for r in rows], total

    async def get_request(self, ngo_id: str, request_id: str) -> DonationRequestOut:
        row = await self.repo.get_request(ngo_id, request_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        listing = await self.repo.get_listing(row.listing_id)
        return _request_to_out(row, listing)

    async def cancel_request(self, ngo_id: str, request_id: str) -> DonationRequestOut:
        row = await self.repo.get_request(ngo_id, request_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        if row.approval_status != DonationApprovalStatus.REQUESTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only REQUESTED requests can be cancelled",
            )
        updated = await self.repo.cancel_request(row)
        return _request_to_out(updated)


class NGOPickupService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = NGOPickupRepository(db)
        self.donation_repo = NGODonationRepository(db)
        self.impact_repo = NGOImpactRepository(db)
        self.notif_repo = NGONotificationRepository(db)

    async def schedule_pickup(self, ngo_id: str, body: PickupScheduleIn) -> NGOPickupOut:
        req = await self.donation_repo.get_request(ngo_id, body.donation_request_id)
        if req is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Donation request not found"
            )
        if req.approval_status not in {
            DonationApprovalStatus.APPROVED,
            DonationApprovalStatus.PICKED_UP,
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pickup can only be scheduled for approved requests",
            )
        record = await self.repo.schedule(req, body.pickup_time)
        await self.notif_repo.create(
            ngo_id,
            NGONotificationType.PICKUP_SCHEDULED,
            "Pickup scheduled",
            f"Pickup code {record.pickup_code} generated for request {req.id}.",
            reference_id=record.id,
        )
        return _pickup_to_out(record)

    async def list_pickups(
        self,
        ngo_id: str,
        pickup_status: Optional[str],
        limit: int,
        offset: int,
    ) -> tuple[list[NGOPickupOut], int]:
        rows, total = await self.repo.list_pickups(ngo_id, pickup_status, limit, offset)
        return [_pickup_to_out(r) for r in rows], total

    async def get_pickup(self, ngo_id: str, pickup_id: str) -> NGOPickupOut:
        row = await self.repo.get_pickup_for_ngo(ngo_id, pickup_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pickup not found")
        return _pickup_to_out(row)

    async def complete_pickup(self, ngo_id: str, pickup_id: str) -> NGOPickupOut:
        row = await self.repo.get_pickup_for_ngo(ngo_id, pickup_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pickup not found")
        completed = await self.repo.complete_pickup(row)

        # Auto-create environmental impact record
        if completed.donation_request_id:
            req = await self.donation_repo.get_request(ngo_id, completed.donation_request_id)
            if req:
                food_kg = float(req.requested_quantity)
                try:
                    await self.impact_repo.create_for_pickup(
                        ngo_id, completed.donation_request_id, food_kg
                    )
                except Exception:
                    pass

        await self.notif_repo.create(
            ngo_id,
            NGONotificationType.PICKUP_COMPLETED,
            "Pickup completed",
            f"Pickup {pickup_id} has been marked as completed.",
            reference_id=pickup_id,
        )
        return _pickup_to_out(completed)


class NGODistributionService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = NGODistributionRepository(db)

    async def create(self, ngo_id: str, body: DistributionCreateIn) -> DistributionOut:
        values = body.model_dump(exclude_unset=True)
        record = await self.repo.create(ngo_id, values)
        return _dist_to_out(record)

    async def update(
        self, ngo_id: str, distribution_id: str, body: DistributionUpdateIn
    ) -> DistributionOut:
        record = await self.repo.get(ngo_id, distribution_id)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Distribution record not found"
            )
        values = body.model_dump(exclude_unset=True)
        updated = await self.repo.update(record, values)
        return _dist_to_out(updated)

    async def list(self, ngo_id: str, limit: int, offset: int) -> tuple[list[DistributionOut], int]:
        rows, total = await self.repo.list(ngo_id, limit, offset)
        return [_dist_to_out(r) for r in rows], total


class NGOAnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = NGOAnalyticsRepository(db)

    async def get_dashboard(self, ngo_id: str, range_key: str) -> NGODashboardOut:
        data = await self.repo.compute(ngo_id, range_key)
        return NGODashboardOut(**data)


class NGONotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = NGONotificationRepository(db)

    async def list_notifications(
        self, ngo_id: str, unread_only: bool, limit: int, offset: int
    ) -> tuple[list[NGONotificationOut], int]:
        rows, total = await self.repo.list(ngo_id, unread_only, limit, offset)
        out = [
            NGONotificationOut(
                id=r.id,
                ngo_id=r.ngo_id,
                event_type=(
                    r.event_type.value if hasattr(r.event_type, "value") else str(r.event_type)
                ),
                title=r.title,
                message=r.message,
                reference_id=r.reference_id,
                is_read=r.is_read,
                created_at=r.created_at,
            )
            for r in rows
        ]
        return out, total

    async def mark_read(self, ngo_id: str, notification_id: str) -> bool:
        found = await self.repo.mark_read(ngo_id, notification_id)
        if not found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
            )
        return True

    async def mark_all_read(self, ngo_id: str) -> int:
        return await self.repo.mark_all_read(ngo_id)


class NGOServiceAreaService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = NGOServiceAreaRepository(db)

    async def list(self, ngo_id: str) -> list[ServiceAreaOut]:
        rows = await self.repo.list(ngo_id)
        return [
            ServiceAreaOut(
                id=r.id,
                ngo_id=r.ngo_id,
                city=r.city,
                pincode=r.pincode,
                latitude=float(r.latitude) if r.latitude is not None else None,
                longitude=float(r.longitude) if r.longitude is not None else None,
                coverage_radius_km=float(r.coverage_radius_km),
                created_at=r.created_at,
            )
            for r in rows
        ]

    async def create(self, ngo_id: str, body: ServiceAreaCreateIn) -> ServiceAreaOut:
        values = body.model_dump(exclude_unset=True)
        area = await self.repo.create(ngo_id, values)
        return ServiceAreaOut(
            id=area.id,
            ngo_id=area.ngo_id,
            city=area.city,
            pincode=area.pincode,
            latitude=float(area.latitude) if area.latitude is not None else None,
            longitude=float(area.longitude) if area.longitude is not None else None,
            coverage_radius_km=float(area.coverage_radius_km),
            created_at=area.created_at,
        )

    async def delete(self, ngo_id: str, area_id: str) -> None:
        deleted = await self.repo.delete(ngo_id, area_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Service area not found"
            )
