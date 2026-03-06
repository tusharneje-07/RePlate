"""Inspector backend repositories with jurisdiction filtering."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.food import (
    ComplaintRecord,
    ComplaintStatus,
    EnforcementAction,
    FoodInspection,
    InspectionSchedule,
    InspectionScheduleStatus,
    InspectionScheduleType,
    InspectionStatus,
    InspectionType,
    InspectorJurisdiction,
    InspectorNotification,
    InspectorNotificationType,
    ListingModeration,
    ModerationStatus,
    NGOVerification,
    EnvironmentalImpactRecord,
    SellerVerification,
    VerificationStatus,
    ViolationRecord,
    ViolationSeverity,
    ViolationType,
)
from app.models.profiles import InspectorProfile
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


class InspectorProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_or_create(self, user_id: str) -> InspectorProfile:
        result = await self.db.execute(
            select(InspectorProfile).where(InspectorProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        if profile is None:
            profile = InspectorProfile(id=_new_id(), user_id=user_id)
            self.db.add(profile)
            await self.db.commit()
            await self.db.refresh(profile)
        return profile

    async def update(self, profile: InspectorProfile, updates: dict) -> InspectorProfile:
        for key, value in updates.items():
            if hasattr(profile, key):
                setattr(profile, key, value)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def get_jurisdictions(self, inspector_id: str) -> list[InspectorJurisdiction]:
        result = await self.db.execute(
            select(InspectorJurisdiction).where(InspectorJurisdiction.inspector_id == inspector_id)
        )
        return list(result.scalars().all())


class SellerVerificationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_pending(self, limit: int, offset: int) -> tuple[list[SellerVerification], int]:
        stmt = select(SellerVerification).where(
            SellerVerification.verification_status == VerificationStatus.PENDING
        )
        count_stmt = select(func.count(SellerVerification.id)).where(
            SellerVerification.verification_status == VerificationStatus.PENDING
        )
        result = await self.db.execute(
            stmt.order_by(SellerVerification.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def get(self, verification_id: str) -> SellerVerification | None:
        return await self.db.get(SellerVerification, verification_id)

    async def update_status(
        self,
        verification: SellerVerification,
        inspector_id: str,
        status: VerificationStatus,
        notes: str | None,
    ) -> SellerVerification:
        verification.inspector_id = inspector_id
        verification.verification_status = status
        verification.verification_notes = notes
        verification.verified_at = _now()
        await self.db.commit()
        await self.db.refresh(verification)
        return verification


class NGOVerificationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_pending(self, limit: int, offset: int) -> tuple[list[NGOVerification], int]:
        stmt = select(NGOVerification).where(
            NGOVerification.verification_status == VerificationStatus.PENDING
        )
        count_stmt = select(func.count(NGOVerification.id)).where(
            NGOVerification.verification_status == VerificationStatus.PENDING
        )
        result = await self.db.execute(
            stmt.order_by(NGOVerification.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def get(self, verification_id: str) -> NGOVerification | None:
        return await self.db.get(NGOVerification, verification_id)

    async def update_status(
        self,
        verification: NGOVerification,
        inspector_id: str,
        status: VerificationStatus,
        notes: str | None,
    ) -> NGOVerification:
        verification.inspector_id = inspector_id
        verification.verification_status = status
        verification.verification_notes = notes
        verification.verified_at = _now()
        await self.db.commit()
        await self.db.refresh(verification)
        return verification


class InspectionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, inspector_id: str, data: dict) -> FoodInspection:
        inspection = FoodInspection(id=_new_id(), inspector_id=inspector_id, **data)
        self.db.add(inspection)
        await self.db.commit()
        await self.db.refresh(inspection)
        return inspection

    async def list(
        self,
        inspector_id: str,
        status_filter: InspectionStatus | None,
        limit: int,
        offset: int,
    ) -> tuple[list[FoodInspection], int]:
        stmt = select(FoodInspection).where(FoodInspection.inspector_id == inspector_id)
        count_stmt = select(func.count(FoodInspection.id)).where(
            FoodInspection.inspector_id == inspector_id
        )
        if status_filter:
            stmt = stmt.where(FoodInspection.inspection_status == status_filter)
            count_stmt = count_stmt.where(FoodInspection.inspection_status == status_filter)
        result = await self.db.execute(
            stmt.order_by(FoodInspection.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def get(self, inspection_id: str) -> FoodInspection | None:
        return await self.db.get(FoodInspection, inspection_id)

    async def update_status(
        self,
        inspection: FoodInspection,
        status: InspectionStatus,
        notes: str | None,
        violation_type: ViolationType | None,
    ) -> FoodInspection:
        inspection.inspection_status = status
        inspection.inspection_notes = notes or inspection.inspection_notes
        inspection.violation_type = violation_type
        inspection.inspection_date = inspection.inspection_date or _now()
        await self.db.commit()
        await self.db.refresh(inspection)
        return inspection


class ViolationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, inspector_id: str, data: dict) -> ViolationRecord:
        record = ViolationRecord(id=_new_id(), inspector_id=inspector_id, **data)
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def list(
        self,
        inspector_id: str,
        limit: int,
        offset: int,
    ) -> tuple[list[ViolationRecord], int]:
        stmt = select(ViolationRecord).where(ViolationRecord.inspector_id == inspector_id)
        count_stmt = select(func.count(ViolationRecord.id)).where(
            ViolationRecord.inspector_id == inspector_id
        )
        result = await self.db.execute(
            stmt.order_by(ViolationRecord.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total


class ComplaintRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, reporter_user_id: str, data: dict) -> ComplaintRecord:
        record = ComplaintRecord(id=_new_id(), reporter_user_id=reporter_user_id, **data)
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def list(
        self,
        status_filter: ComplaintStatus | None,
        limit: int,
        offset: int,
    ) -> tuple[list[ComplaintRecord], int]:
        stmt = select(ComplaintRecord)
        count_stmt = select(func.count(ComplaintRecord.id))
        if status_filter:
            stmt = stmt.where(ComplaintRecord.complaint_status == status_filter)
            count_stmt = count_stmt.where(ComplaintRecord.complaint_status == status_filter)
        result = await self.db.execute(
            stmt.order_by(ComplaintRecord.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def get(self, complaint_id: str) -> ComplaintRecord | None:
        return await self.db.get(ComplaintRecord, complaint_id)

    async def update_status(
        self,
        complaint: ComplaintRecord,
        inspector_id: str,
        status: ComplaintStatus,
        resolution_notes: str | None,
    ) -> ComplaintRecord:
        complaint.complaint_status = status
        complaint.inspector_id = inspector_id
        complaint.resolution_notes = resolution_notes
        if status == ComplaintStatus.RESOLVED:
            complaint.resolved_at = _now()
        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint


class ScheduleRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, inspector_id: str, data: dict) -> InspectionSchedule:
        schedule = InspectionSchedule(id=_new_id(), inspector_id=inspector_id, **data)
        self.db.add(schedule)
        await self.db.commit()
        await self.db.refresh(schedule)
        return schedule

    async def list(
        self, inspector_id: str, limit: int, offset: int
    ) -> tuple[list[InspectionSchedule], int]:
        stmt = select(InspectionSchedule).where(InspectionSchedule.inspector_id == inspector_id)
        count_stmt = select(func.count(InspectionSchedule.id)).where(
            InspectionSchedule.inspector_id == inspector_id
        )
        result = await self.db.execute(
            stmt.order_by(InspectionSchedule.scheduled_date.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def get(self, schedule_id: str) -> InspectionSchedule | None:
        return await self.db.get(InspectionSchedule, schedule_id)

    async def update_status(
        self, schedule: InspectionSchedule, status: InspectionScheduleStatus
    ) -> InspectionSchedule:
        schedule.schedule_status = status
        await self.db.commit()
        await self.db.refresh(schedule)
        return schedule


class ModerationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, inspector_id: str | None, data: dict) -> ListingModeration:
        row = ListingModeration(id=_new_id(), inspector_id=inspector_id, **data)
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def list(
        self, status_filter: ModerationStatus | None, limit: int, offset: int
    ) -> tuple[list[ListingModeration], int]:
        stmt = select(ListingModeration)
        count_stmt = select(func.count(ListingModeration.id))
        if status_filter:
            stmt = stmt.where(ListingModeration.moderation_status == status_filter)
            count_stmt = count_stmt.where(ListingModeration.moderation_status == status_filter)
        result = await self.db.execute(
            stmt.order_by(ListingModeration.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total

    async def get(self, moderation_id: str) -> ListingModeration | None:
        return await self.db.get(ListingModeration, moderation_id)

    async def update_status(
        self,
        moderation: ListingModeration,
        status: ModerationStatus,
        action: EnforcementAction | None,
        inspector_id: str,
    ) -> ListingModeration:
        moderation.moderation_status = status
        moderation.action_taken = action
        moderation.inspector_id = inspector_id
        await self.db.commit()
        await self.db.refresh(moderation)
        return moderation


class InspectorNotificationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        inspector_id: str,
        event_type: InspectorNotificationType,
        message: str,
        reference_id: str | None = None,
    ) -> InspectorNotification:
        item = InspectorNotification(
            id=_new_id(),
            inspector_id=inspector_id,
            event_type=event_type,
            message=message,
            reference_id=reference_id,
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def list(
        self, inspector_id: str, limit: int, offset: int
    ) -> tuple[list[InspectorNotification], int]:
        stmt = select(InspectorNotification).where(
            InspectorNotification.inspector_id == inspector_id
        )
        count_stmt = select(func.count(InspectorNotification.id)).where(
            InspectorNotification.inspector_id == inspector_id
        )
        result = await self.db.execute(
            stmt.order_by(InspectorNotification.created_at.desc()).offset(offset).limit(limit)
        )
        total = int((await self.db.execute(count_stmt)).scalar() or 0)
        return list(result.scalars().all()), total


class InspectorAnalyticsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def compute(self, range_key: str) -> dict:
        start = _range_start(range_key)

        seller_verified = await self.db.execute(
            select(func.count(SellerVerification.id)).where(
                SellerVerification.verification_status == VerificationStatus.APPROVED,
                SellerVerification.verified_at >= start,
            )
        )
        ngo_verified = await self.db.execute(
            select(func.count(NGOVerification.id)).where(
                NGOVerification.verification_status == VerificationStatus.APPROVED,
                NGOVerification.verified_at >= start,
            )
        )
        inspections_completed = await self.db.execute(
            select(func.count(FoodInspection.id)).where(
                FoodInspection.inspection_status == InspectionStatus.COMPLETED,
                FoodInspection.created_at >= start,
            )
        )
        violations_count = await self.db.execute(
            select(func.count(ViolationRecord.id)).where(
                ViolationRecord.created_at >= start,
            )
        )
        complaints_total = await self.db.execute(
            select(func.count(ComplaintRecord.id)).where(
                ComplaintRecord.created_at >= start,
            )
        )
        complaints_resolved = await self.db.execute(
            select(func.count(ComplaintRecord.id)).where(
                ComplaintRecord.created_at >= start,
                ComplaintRecord.complaint_status == ComplaintStatus.RESOLVED,
            )
        )
        suspended_sellers = await self.db.execute(
            select(func.count(ViolationRecord.id)).where(
                ViolationRecord.created_at >= start,
                ViolationRecord.action_taken == EnforcementAction.ACCOUNT_SUSPENDED,
            )
        )
        removed_listings = await self.db.execute(
            select(func.count(ViolationRecord.id)).where(
                ViolationRecord.created_at >= start,
                ViolationRecord.action_taken == EnforcementAction.LISTING_REMOVED,
            )
        )

        return {
            "total_sellers_verified": int(seller_verified.scalar() or 0),
            "total_ngos_verified": int(ngo_verified.scalar() or 0),
            "total_inspections_completed": int(inspections_completed.scalar() or 0),
            "total_violations_detected": int(violations_count.scalar() or 0),
            "total_complaints_received": int(complaints_total.scalar() or 0),
            "resolved_complaints": int(complaints_resolved.scalar() or 0),
            "suspended_sellers": int(suspended_sellers.scalar() or 0),
            "removed_listings": int(removed_listings.scalar() or 0),
        }


class EnvironmentalImpactRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def compute(self, range_key: str) -> dict:
        start = _range_start(range_key)
        result = await self.db.execute(
            select(
                func.coalesce(func.sum(EnvironmentalImpactRecord.food_saved_kg), 0),
                func.coalesce(func.sum(EnvironmentalImpactRecord.co2_reduction_kg), 0),
                func.coalesce(func.sum(EnvironmentalImpactRecord.landfill_waste_reduction), 0),
            ).where(EnvironmentalImpactRecord.created_at >= start)
        )
        food_saved, co2, landfill = result.one()

        # No donation distribution record yet; placeholder for future join
        return {
            "total_food_saved_kg": float(food_saved or 0),
            "total_co2_reduction_kg": float(co2 or 0),
            "total_landfill_waste_reduction_kg": float(landfill or 0),
            "food_distributed_by_ngos": 0.0,
            "food_sold_by_sellers": float(food_saved or 0),
        }
