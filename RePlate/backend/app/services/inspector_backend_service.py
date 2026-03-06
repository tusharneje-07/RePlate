"""Service layer for inspector backend module."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.food import (
    ComplaintStatus,
    EnforcementAction,
    InspectionScheduleStatus,
    InspectionScheduleType,
    InspectionStatus,
    InspectionType,
    ModerationStatus,
    VerificationStatus,
    ViolationSeverity,
    ViolationType,
)
from app.repositories.inspector_backend_repository import (
    ComplaintRepository,
    EnvironmentalImpactRepository,
    InspectionRepository,
    InspectorAnalyticsRepository,
    InspectorNotificationRepository,
    InspectorProfileRepository,
    ModerationRepository,
    NGOVerificationRepository,
    ScheduleRepository,
    SellerVerificationRepository,
    ViolationRepository,
)
from app.schemas.inspector_backend import (
    AnalyticsOut,
    ComplaintCreateIn,
    ComplaintOut,
    ComplaintStatusUpdateIn,
    ImpactOverviewOut,
    InspectionCreateIn,
    InspectionOut,
    InspectionStatusUpdateIn,
    InspectorNotificationOut,
    InspectorProfileOut,
    InspectorProfileUpdateIn,
    JurisdictionOut,
    ModerationCreateIn,
    ModerationOut,
    ModerationUpdateIn,
    ScheduleCreateIn,
    ScheduleOut,
    ScheduleUpdateIn,
    VerificationOut,
    VerificationUpdateIn,
    ViolationCreateIn,
    ViolationOut,
)


class InspectorProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = InspectorProfileRepository(db)

    async def get_profile(self, user_id: str) -> tuple[InspectorProfileOut, list[JurisdictionOut]]:
        profile = await self.repo.get_or_create(user_id)
        jurisdictions = await self.repo.get_jurisdictions(user_id)
        user_name = "Inspector"
        if profile.user and (profile.user.first_name or profile.user.last_name):
            user_name = " ".join(
                part for part in [profile.user.first_name, profile.user.last_name] if part
            )
        data = InspectorProfileOut(
            inspector_id=profile.id,
            user_id=profile.user_id,
            name=user_name,
            employee_id=profile.badge_number,
            department=profile.department,
            phone=profile.phone_number,
            email=profile.user.email if profile.user else "",
            assigned_city=profile.assigned_city,
            assigned_state=profile.assigned_region,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )
        return data, [
            JurisdictionOut(
                id=j.id,
                inspector_id=j.inspector_id,
                city=j.city,
                state=j.state,
                pincode_range=j.pincode_range,
            )
            for j in jurisdictions
        ]

    async def update_profile(
        self, user_id: str, body: InspectorProfileUpdateIn
    ) -> InspectorProfileOut:
        profile = await self.repo.get_or_create(user_id)
        updates = body.model_dump(exclude_unset=True)
        mapped = {
            "phone_number": updates.get("phone"),
            "department": updates.get("department"),
            "assigned_city": updates.get("assigned_city"),
            "assigned_region": updates.get("assigned_state"),
        }
        await self.repo.update(profile, {k: v for k, v in mapped.items() if v is not None})
        return (await self.get_profile(user_id))[0]


class VerificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.seller_repo = SellerVerificationRepository(db)
        self.ngo_repo = NGOVerificationRepository(db)

    async def list_pending_sellers(
        self, limit: int, offset: int
    ) -> tuple[list[VerificationOut], int]:
        rows, total = await self.seller_repo.list_pending(limit, offset)
        return [
            VerificationOut(
                id=row.id,
                inspector_id=row.inspector_id,
                entity_id=row.seller_id,
                verification_status=row.verification_status.value,
                verification_notes=row.verification_notes,
                verified_at=row.verified_at,
                created_at=row.created_at,
            )
            for row in rows
        ], total

    async def update_seller(
        self, inspector_id: str, verification_id: str, body: VerificationUpdateIn
    ) -> VerificationOut:
        row = await self.seller_repo.get(verification_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Seller verification not found"
            )
        try:
            status_enum = VerificationStatus(body.status)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status"
            ) from exc
        updated = await self.seller_repo.update_status(row, inspector_id, status_enum, body.notes)
        return VerificationOut(
            id=updated.id,
            inspector_id=updated.inspector_id,
            entity_id=updated.seller_id,
            verification_status=updated.verification_status.value,
            verification_notes=updated.verification_notes,
            verified_at=updated.verified_at,
            created_at=updated.created_at,
        )

    async def list_pending_ngos(self, limit: int, offset: int) -> tuple[list[VerificationOut], int]:
        rows, total = await self.ngo_repo.list_pending(limit, offset)
        return [
            VerificationOut(
                id=row.id,
                inspector_id=row.inspector_id,
                entity_id=row.ngo_id,
                verification_status=row.verification_status.value,
                verification_notes=row.verification_notes,
                verified_at=row.verified_at,
                created_at=row.created_at,
            )
            for row in rows
        ], total

    async def update_ngo(
        self, inspector_id: str, verification_id: str, body: VerificationUpdateIn
    ) -> VerificationOut:
        row = await self.ngo_repo.get(verification_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="NGO verification not found"
            )
        try:
            status_enum = VerificationStatus(body.status)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status"
            ) from exc
        updated = await self.ngo_repo.update_status(row, inspector_id, status_enum, body.notes)
        return VerificationOut(
            id=updated.id,
            inspector_id=updated.inspector_id,
            entity_id=updated.ngo_id,
            verification_status=updated.verification_status.value,
            verification_notes=updated.verification_notes,
            verified_at=updated.verified_at,
            created_at=updated.created_at,
        )


class InspectionService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = InspectionRepository(db)

    async def create(self, inspector_id: str, body: InspectionCreateIn) -> InspectionOut:
        try:
            inspection_type = InspectionType(body.inspection_type)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid inspection type"
            ) from exc

        violation_type = None
        if body.violation_type:
            try:
                violation_type = ViolationType(body.violation_type)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid violation type",
                ) from exc

        row = await self.repo.create(
            inspector_id,
            {
                "seller_id": body.seller_id,
                "listing_id": body.listing_id,
                "inspection_type": inspection_type,
                "inspection_status": InspectionStatus.PENDING,
                "inspection_notes": body.inspection_notes,
                "violation_type": violation_type,
                "inspection_date": body.inspection_date,
                "report_url": body.report_url,
            },
        )
        return InspectionOut(
            id=row.id,
            inspector_id=row.inspector_id,
            seller_id=row.seller_id,
            listing_id=row.listing_id,
            inspection_type=row.inspection_type.value,
            inspection_status=row.inspection_status.value,
            inspection_notes=row.inspection_notes,
            violation_type=row.violation_type.value if row.violation_type else None,
            inspection_date=row.inspection_date,
            report_url=row.report_url,
            created_at=row.created_at,
        )

    async def list(
        self, inspector_id: str, status_filter: str | None, limit: int, offset: int
    ) -> tuple[list[InspectionOut], int]:
        status_enum = None
        if status_filter:
            try:
                status_enum = InspectionStatus(status_filter)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status filter"
                ) from exc
        rows, total = await self.repo.list(inspector_id, status_enum, limit, offset)
        return [
            InspectionOut(
                id=row.id,
                inspector_id=row.inspector_id,
                seller_id=row.seller_id,
                listing_id=row.listing_id,
                inspection_type=row.inspection_type.value,
                inspection_status=row.inspection_status.value,
                inspection_notes=row.inspection_notes,
                violation_type=row.violation_type.value if row.violation_type else None,
                inspection_date=row.inspection_date,
                report_url=row.report_url,
                created_at=row.created_at,
            )
            for row in rows
        ], total

    async def update_status(
        self, inspection_id: str, body: InspectionStatusUpdateIn
    ) -> InspectionOut:
        row = await self.repo.get(inspection_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found"
            )
        try:
            status_enum = InspectionStatus(body.status)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status"
            ) from exc

        violation_type = None
        if body.violation_type:
            try:
                violation_type = ViolationType(body.violation_type)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid violation type",
                ) from exc

        updated = await self.repo.update_status(row, status_enum, body.notes, violation_type)
        return InspectionOut(
            id=updated.id,
            inspector_id=updated.inspector_id,
            seller_id=updated.seller_id,
            listing_id=updated.listing_id,
            inspection_type=updated.inspection_type.value,
            inspection_status=updated.inspection_status.value,
            inspection_notes=updated.inspection_notes,
            violation_type=updated.violation_type.value if updated.violation_type else None,
            inspection_date=updated.inspection_date,
            report_url=updated.report_url,
            created_at=updated.created_at,
        )


class ViolationService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = ViolationRepository(db)

    async def create(self, inspector_id: str, body: ViolationCreateIn) -> ViolationOut:
        try:
            violation_type = ViolationType(body.violation_type)
            severity = ViolationSeverity(body.violation_severity)
            action = EnforcementAction(body.action_taken)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid violation fields"
            ) from exc

        row = await self.repo.create(
            inspector_id,
            {
                "seller_id": body.seller_id,
                "listing_id": body.listing_id,
                "violation_type": violation_type,
                "violation_severity": severity,
                "action_taken": action,
                "violation_notes": body.violation_notes,
            },
        )
        return ViolationOut(
            id=row.id,
            seller_id=row.seller_id,
            inspector_id=row.inspector_id,
            listing_id=row.listing_id,
            violation_type=row.violation_type.value,
            violation_severity=row.violation_severity.value,
            action_taken=row.action_taken.value,
            violation_notes=row.violation_notes,
            created_at=row.created_at,
        )

    async def list(
        self, inspector_id: str, limit: int, offset: int
    ) -> tuple[list[ViolationOut], int]:
        rows, total = await self.repo.list(inspector_id, limit, offset)
        return [
            ViolationOut(
                id=row.id,
                seller_id=row.seller_id,
                inspector_id=row.inspector_id,
                listing_id=row.listing_id,
                violation_type=row.violation_type.value,
                violation_severity=row.violation_severity.value,
                action_taken=row.action_taken.value,
                violation_notes=row.violation_notes,
                created_at=row.created_at,
            )
            for row in rows
        ], total


class ComplaintService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = ComplaintRepository(db)

    async def create(self, reporter_id: str, body: ComplaintCreateIn) -> ComplaintOut:
        row = await self.repo.create(
            reporter_id,
            {
                "seller_id": body.seller_id,
                "listing_id": body.listing_id,
                "complaint_type": body.complaint_type,
                "complaint_description": body.complaint_description,
                "complaint_status": ComplaintStatus.OPEN,
            },
        )
        return ComplaintOut(
            id=row.id,
            reporter_user_id=row.reporter_user_id,
            seller_id=row.seller_id,
            listing_id=row.listing_id,
            complaint_type=row.complaint_type.value,
            complaint_description=row.complaint_description,
            complaint_status=row.complaint_status.value,
            inspector_id=row.inspector_id,
            resolution_notes=row.resolution_notes,
            created_at=row.created_at,
            resolved_at=row.resolved_at,
        )

    async def list(
        self, status_filter: str | None, limit: int, offset: int
    ) -> tuple[list[ComplaintOut], int]:
        status_enum = None
        if status_filter:
            try:
                status_enum = ComplaintStatus(status_filter)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status filter"
                ) from exc
        rows, total = await self.repo.list(status_enum, limit, offset)
        return [
            ComplaintOut(
                id=row.id,
                reporter_user_id=row.reporter_user_id,
                seller_id=row.seller_id,
                listing_id=row.listing_id,
                complaint_type=row.complaint_type.value,
                complaint_description=row.complaint_description,
                complaint_status=row.complaint_status.value,
                inspector_id=row.inspector_id,
                resolution_notes=row.resolution_notes,
                created_at=row.created_at,
                resolved_at=row.resolved_at,
            )
            for row in rows
        ], total

    async def update_status(
        self, inspector_id: str, complaint_id: str, body: ComplaintStatusUpdateIn
    ) -> ComplaintOut:
        row = await self.repo.get(complaint_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
        try:
            status_enum = ComplaintStatus(body.status)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status"
            ) from exc
        updated = await self.repo.update_status(
            row, inspector_id, status_enum, body.resolution_notes
        )
        return ComplaintOut(
            id=updated.id,
            reporter_user_id=updated.reporter_user_id,
            seller_id=updated.seller_id,
            listing_id=updated.listing_id,
            complaint_type=updated.complaint_type.value,
            complaint_description=updated.complaint_description,
            complaint_status=updated.complaint_status.value,
            inspector_id=updated.inspector_id,
            resolution_notes=updated.resolution_notes,
            created_at=updated.created_at,
            resolved_at=updated.resolved_at,
        )


class ScheduleService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = ScheduleRepository(db)

    async def create(self, inspector_id: str, body: ScheduleCreateIn) -> ScheduleOut:
        try:
            schedule_type = InspectionScheduleType(body.inspection_type)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid schedule type"
            ) from exc
        row = await self.repo.create(
            inspector_id,
            {
                "seller_id": body.seller_id,
                "scheduled_date": body.scheduled_date,
                "inspection_type": schedule_type,
                "schedule_status": InspectionScheduleStatus.SCHEDULED,
            },
        )
        return ScheduleOut(
            id=row.id,
            inspector_id=row.inspector_id,
            seller_id=row.seller_id,
            scheduled_date=row.scheduled_date,
            inspection_type=row.inspection_type.value,
            schedule_status=row.schedule_status.value,
            created_at=row.created_at,
        )

    async def list(
        self, inspector_id: str, limit: int, offset: int
    ) -> tuple[list[ScheduleOut], int]:
        rows, total = await self.repo.list(inspector_id, limit, offset)
        return [
            ScheduleOut(
                id=row.id,
                inspector_id=row.inspector_id,
                seller_id=row.seller_id,
                scheduled_date=row.scheduled_date,
                inspection_type=row.inspection_type.value,
                schedule_status=row.schedule_status.value,
                created_at=row.created_at,
            )
            for row in rows
        ], total

    async def update_status(self, schedule_id: str, body: ScheduleUpdateIn) -> ScheduleOut:
        row = await self.repo.get(schedule_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
        try:
            status_enum = InspectionScheduleStatus(body.status)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status"
            ) from exc
        updated = await self.repo.update_status(row, status_enum)
        return ScheduleOut(
            id=updated.id,
            inspector_id=updated.inspector_id,
            seller_id=updated.seller_id,
            scheduled_date=updated.scheduled_date,
            inspection_type=updated.inspection_type.value,
            schedule_status=updated.schedule_status.value,
            created_at=updated.created_at,
        )


class ModerationService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = ModerationRepository(db)

    async def create(self, inspector_id: str, body: ModerationCreateIn) -> ModerationOut:
        row = await self.repo.create(
            inspector_id,
            {
                "listing_id": body.listing_id,
                "seller_id": body.seller_id,
                "flagged_reason": body.flagged_reason,
                "moderation_status": ModerationStatus.PENDING,
            },
        )
        return ModerationOut(
            id=row.id,
            listing_id=row.listing_id,
            seller_id=row.seller_id,
            flagged_reason=row.flagged_reason,
            moderation_status=row.moderation_status.value,
            inspector_id=row.inspector_id,
            action_taken=row.action_taken.value if row.action_taken else None,
            created_at=row.created_at,
        )

    async def list(
        self, status_filter: str | None, limit: int, offset: int
    ) -> tuple[list[ModerationOut], int]:
        status_enum = None
        if status_filter:
            try:
                status_enum = ModerationStatus(status_filter)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status filter"
                ) from exc
        rows, total = await self.repo.list(status_enum, limit, offset)
        return [
            ModerationOut(
                id=row.id,
                listing_id=row.listing_id,
                seller_id=row.seller_id,
                flagged_reason=row.flagged_reason,
                moderation_status=row.moderation_status.value,
                inspector_id=row.inspector_id,
                action_taken=row.action_taken.value if row.action_taken else None,
                created_at=row.created_at,
            )
            for row in rows
        ], total

    async def update_status(
        self, moderation_id: str, inspector_id: str, body: ModerationUpdateIn
    ) -> ModerationOut:
        row = await self.repo.get(moderation_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Moderation record not found"
            )
        try:
            status_enum = ModerationStatus(body.status)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status"
            ) from exc
        action = None
        if body.action_taken:
            try:
                action = EnforcementAction(body.action_taken)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid action"
                ) from exc
        updated = await self.repo.update_status(row, status_enum, action, inspector_id)
        return ModerationOut(
            id=updated.id,
            listing_id=updated.listing_id,
            seller_id=updated.seller_id,
            flagged_reason=updated.flagged_reason,
            moderation_status=updated.moderation_status.value,
            inspector_id=updated.inspector_id,
            action_taken=updated.action_taken.value if updated.action_taken else None,
            created_at=updated.created_at,
        )


class AnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = InspectorAnalyticsRepository(db)

    async def get_metrics(self, range_key: str) -> AnalyticsOut:
        data = await self.repo.compute(range_key)
        return AnalyticsOut(**data)


class ImpactService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = EnvironmentalImpactRepository(db)

    async def get_overview(self, range_key: str) -> ImpactOverviewOut:
        data = await self.repo.compute(range_key)
        return ImpactOverviewOut(**data)


class InspectorNotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = InspectorNotificationRepository(db)

    async def list(
        self, inspector_id: str, limit: int, offset: int
    ) -> tuple[list[InspectorNotificationOut], int]:
        rows, total = await self.repo.list(inspector_id, limit, offset)
        return [
            InspectorNotificationOut(
                id=row.id,
                inspector_id=row.inspector_id,
                event_type=row.event_type.value,
                message=row.message,
                reference_id=row.reference_id,
                is_read=row.is_read,
                created_at=row.created_at,
            )
            for row in rows
        ], total
