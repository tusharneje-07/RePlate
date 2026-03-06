"""NGO backend module — all NGO-side API endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_ngo
from app.models.user import User
from app.schemas.ngo import (
    DonationRequestCreateIn,
    DistributionCreateIn,
    DistributionUpdateIn,
    NGOProfileUpdateIn,
    PickupScheduleIn,
    ServiceAreaCreateIn,
)
from app.services.ngo_service import (
    NGOAnalyticsService,
    NGODiscoveryService,
    NGODistributionService,
    NGODonationService,
    NGONotificationService,
    NGOPickupService,
    NGOProfileService,
    NGOServiceAreaService,
)

router = APIRouter(prefix="/ngo-backend", tags=["ngo"])


# ── Profile ────────────────────────────────────────────────────────────────────


@router.get("/profile")
async def get_ngo_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGOProfileService(db).get_profile(current_user.id)
    return {"success": True, "data": data}


@router.patch("/profile")
async def update_ngo_profile(
    body: NGOProfileUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGOProfileService(db).update_profile(current_user.id, body)
    return {"success": True, "data": data, "message": "Profile updated"}


class DocumentUploadIn:
    """Inline body for document URL upload."""

    pass


from pydantic import BaseModel as _BaseModel


class DocumentUploadBody(_BaseModel):
    document_url: str


@router.post("/profile/document")
async def upload_ngo_document(
    body: DocumentUploadBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGOProfileService(db).set_document_url(current_user.id, body.document_url)
    return {"success": True, "data": data, "message": "Document URL saved"}


# ── Discovery ──────────────────────────────────────────────────────────────────


@router.get("/discovery/donations")
async def browse_donations(
    city: Optional[str] = Query(default=None),
    food_type: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    query: Optional[str] = Query(default=None),
    min_quantity: Optional[int] = Query(default=None, ge=1),
    max_distance_km: Optional[float] = Query(default=None, gt=0),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    rows, total = await NGODiscoveryService(db).browse(
        current_user.id,
        city=city,
        food_type=food_type,
        category=category,
        query=query,
        min_quantity=min_quantity,
        max_distance_km=max_distance_km,
        limit=limit,
        offset=offset,
    )
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


# ── Donation Request Management ────────────────────────────────────────────────


@router.post("/donations/request")
async def create_donation_request(
    body: DonationRequestCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGODonationService(db).create_request(current_user.id, body)
    return {"success": True, "data": data, "message": "Donation request created"}


@router.get("/donations/requests")
async def list_donation_requests(
    approval_status: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    rows, total = await NGODonationService(db).list_requests(
        current_user.id, approval_status, limit, offset
    )
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.get("/donations/requests/{request_id}")
async def get_donation_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGODonationService(db).get_request(current_user.id, request_id)
    return {"success": True, "data": data}


@router.patch("/donations/requests/{request_id}/cancel")
async def cancel_donation_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGODonationService(db).cancel_request(current_user.id, request_id)
    return {"success": True, "data": data, "message": "Donation request cancelled"}


# ── Pickup Management ──────────────────────────────────────────────────────────


@router.post("/pickups/schedule")
async def schedule_pickup(
    body: PickupScheduleIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGOPickupService(db).schedule_pickup(current_user.id, body)
    return {"success": True, "data": data, "message": "Pickup scheduled"}


@router.get("/pickups")
async def list_pickups(
    pickup_status: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    rows, total = await NGOPickupService(db).list_pickups(
        current_user.id, pickup_status, limit, offset
    )
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.get("/pickups/{pickup_id}")
async def get_pickup(
    pickup_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGOPickupService(db).get_pickup(current_user.id, pickup_id)
    return {"success": True, "data": data}


@router.post("/pickups/{pickup_id}/complete")
async def complete_pickup(
    pickup_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGOPickupService(db).complete_pickup(current_user.id, pickup_id)
    return {"success": True, "data": data, "message": "Pickup marked as completed"}


# ── Distribution Tracking ──────────────────────────────────────────────────────


@router.post("/distributions")
async def create_distribution(
    body: DistributionCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGODistributionService(db).create(current_user.id, body)
    return {"success": True, "data": data, "message": "Distribution record created"}


@router.patch("/distributions/{distribution_id}")
async def update_distribution(
    distribution_id: str,
    body: DistributionUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGODistributionService(db).update(current_user.id, distribution_id, body)
    return {"success": True, "data": data, "message": "Distribution record updated"}


@router.get("/distributions")
async def list_distributions(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    rows, total = await NGODistributionService(db).list(current_user.id, limit, offset)
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


# ── Dashboard Analytics ────────────────────────────────────────────────────────


@router.get("/analytics/dashboard")
async def get_dashboard(
    range: str = Query(default="weekly", pattern="^(today|weekly|monthly|yearly)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGOAnalyticsService(db).get_dashboard(current_user.id, range)
    return {"success": True, "data": data}


# ── Notifications ──────────────────────────────────────────────────────────────


@router.get("/notifications")
async def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    rows, total = await NGONotificationService(db).list_notifications(
        current_user.id, unread_only, limit, offset
    )
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    await NGONotificationService(db).mark_read(current_user.id, notification_id)
    return {"success": True, "message": "Notification marked as read"}


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    count = await NGONotificationService(db).mark_all_read(current_user.id)
    return {"success": True, "message": f"{count} notification(s) marked as read"}


# ── Service Areas ──────────────────────────────────────────────────────────────


@router.get("/service-areas")
async def list_service_areas(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGOServiceAreaService(db).list(current_user.id)
    return {"success": True, "data": data}


@router.post("/service-areas")
async def create_service_area(
    body: ServiceAreaCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    data = await NGOServiceAreaService(db).create(current_user.id, body)
    return {"success": True, "data": data, "message": "Service area added"}


@router.delete("/service-areas/{area_id}")
async def delete_service_area(
    area_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ngo),
):
    await NGOServiceAreaService(db).delete(current_user.id, area_id)
    return {"success": True, "message": "Service area removed"}
