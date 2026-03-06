"""Inspector backend module router."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_inspector
from app.models.user import User
from app.schemas.inspector_backend import (
    ComplaintCreateIn,
    ComplaintStatusUpdateIn,
    InspectionCreateIn,
    InspectionStatusUpdateIn,
    InspectorProfileUpdateIn,
    ModerationCreateIn,
    ModerationUpdateIn,
    ScheduleCreateIn,
    ScheduleUpdateIn,
    VerificationUpdateIn,
    ViolationCreateIn,
)
from app.services.inspector_backend_service import (
    AnalyticsService,
    ComplaintService,
    ImpactService,
    InspectionService,
    InspectorNotificationService,
    InspectorProfileService,
    ModerationService,
    ScheduleService,
    VerificationService,
    ViolationService,
)

router = APIRouter(prefix="/inspector-backend", tags=["inspector-backend"])


@router.get("/profile")
async def get_inspector_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    profile, jurisdictions = await InspectorProfileService(db).get_profile(current_user.id)
    return {"success": True, "data": profile, "jurisdictions": jurisdictions}


@router.patch("/profile")
async def update_inspector_profile(
    body: InspectorProfileUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    profile = await InspectorProfileService(db).update_profile(current_user.id, body)
    return {"success": True, "data": profile, "message": "Profile updated"}


@router.get("/seller-verifications")
async def list_seller_verifications(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    rows, total = await VerificationService(db).list_pending_sellers(limit, offset)
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.patch("/seller-verifications/{verification_id}")
async def update_seller_verification(
    verification_id: str,
    body: VerificationUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await VerificationService(db).update_seller(current_user.id, verification_id, body)
    return {"success": True, "data": data, "message": "Seller verification updated"}


@router.get("/ngo-verifications")
async def list_ngo_verifications(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    rows, total = await VerificationService(db).list_pending_ngos(limit, offset)
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.patch("/ngo-verifications/{verification_id}")
async def update_ngo_verification(
    verification_id: str,
    body: VerificationUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await VerificationService(db).update_ngo(current_user.id, verification_id, body)
    return {"success": True, "data": data, "message": "NGO verification updated"}


@router.post("/inspections")
async def create_inspection(
    body: InspectionCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await InspectionService(db).create(current_user.id, body)
    return {"success": True, "data": data, "message": "Inspection created"}


@router.get("/inspections")
async def list_inspections(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    rows, total = await InspectionService(db).list(current_user.id, status_filter, limit, offset)
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.patch("/inspections/{inspection_id}")
async def update_inspection_status(
    inspection_id: str,
    body: InspectionStatusUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await InspectionService(db).update_status(inspection_id, body)
    return {"success": True, "data": data, "message": "Inspection updated"}


@router.post("/violations")
async def create_violation(
    body: ViolationCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await ViolationService(db).create(current_user.id, body)
    return {"success": True, "data": data, "message": "Violation recorded"}


@router.get("/violations")
async def list_violations(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    rows, total = await ViolationService(db).list(current_user.id, limit, offset)
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.post("/complaints")
async def create_complaint(
    body: ComplaintCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await ComplaintService(db).create(current_user.id, body)
    return {"success": True, "data": data, "message": "Complaint created"}


@router.get("/complaints")
async def list_complaints(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    rows, total = await ComplaintService(db).list(status_filter, limit, offset)
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.patch("/complaints/{complaint_id}")
async def update_complaint_status(
    complaint_id: str,
    body: ComplaintStatusUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await ComplaintService(db).update_status(current_user.id, complaint_id, body)
    return {"success": True, "data": data, "message": "Complaint updated"}


@router.post("/schedules")
async def create_schedule(
    body: ScheduleCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await ScheduleService(db).create(current_user.id, body)
    return {"success": True, "data": data, "message": "Schedule created"}


@router.get("/schedules")
async def list_schedules(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    rows, total = await ScheduleService(db).list(current_user.id, limit, offset)
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.patch("/schedules/{schedule_id}")
async def update_schedule_status(
    schedule_id: str,
    body: ScheduleUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await ScheduleService(db).update_status(schedule_id, body)
    return {"success": True, "data": data, "message": "Schedule updated"}


@router.post("/moderations")
async def create_moderation(
    body: ModerationCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await ModerationService(db).create(current_user.id, body)
    return {"success": True, "data": data, "message": "Moderation created"}


@router.get("/moderations")
async def list_moderations(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    rows, total = await ModerationService(db).list(status_filter, limit, offset)
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.patch("/moderations/{moderation_id}")
async def update_moderation_status(
    moderation_id: str,
    body: ModerationUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await ModerationService(db).update_status(moderation_id, current_user.id, body)
    return {"success": True, "data": data, "message": "Moderation updated"}


@router.get("/analytics")
async def get_inspector_analytics(
    range_key: str = Query(default="today", alias="range"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await AnalyticsService(db).get_metrics(range_key)
    return {"success": True, "data": data}


@router.get("/impact")
async def get_environmental_impact(
    range_key: str = Query(default="today", alias="range"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    data = await ImpactService(db).get_overview(range_key)
    return {"success": True, "data": data}


@router.get("/notifications")
async def list_inspector_notifications(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inspector),
):
    rows, total = await InspectorNotificationService(db).list(current_user.id, limit, offset)
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }
