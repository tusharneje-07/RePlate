"""Schemas for inspector backend module."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class PaginationOut(BaseModel):
    total: int
    limit: int
    offset: int


class InspectorProfileOut(BaseModel):
    inspector_id: str
    user_id: str
    name: str
    employee_id: str | None = None
    department: str | None = None
    phone: str | None = None
    email: str
    assigned_city: str | None = None
    assigned_state: str | None = None
    created_at: datetime
    updated_at: datetime


class InspectorProfileUpdateIn(BaseModel):
    phone: str | None = None
    department: str | None = None
    assigned_city: str | None = None
    assigned_state: str | None = None


class JurisdictionOut(BaseModel):
    id: str
    inspector_id: str
    city: str | None = None
    state: str | None = None
    pincode_range: str | None = None


class VerificationOut(BaseModel):
    id: str
    inspector_id: str | None = None
    entity_id: str
    verification_status: str
    verification_notes: str | None = None
    verified_at: datetime | None = None
    created_at: datetime


class VerificationUpdateIn(BaseModel):
    status: str
    notes: str | None = None


class InspectionCreateIn(BaseModel):
    seller_id: str
    listing_id: str | None = None
    inspection_type: str
    inspection_notes: str | None = None
    violation_type: str | None = None
    inspection_date: datetime | None = None
    report_url: str | None = None


class InspectionOut(BaseModel):
    id: str
    inspector_id: str | None = None
    seller_id: str
    listing_id: str | None = None
    inspection_type: str
    inspection_status: str
    inspection_notes: str | None = None
    violation_type: str | None = None
    inspection_date: datetime | None = None
    report_url: str | None = None
    created_at: datetime


class InspectionStatusUpdateIn(BaseModel):
    status: str
    notes: str | None = None
    violation_type: str | None = None


class ViolationCreateIn(BaseModel):
    seller_id: str
    listing_id: str | None = None
    violation_type: str
    violation_severity: str
    action_taken: str
    violation_notes: str | None = None


class ViolationOut(BaseModel):
    id: str
    seller_id: str
    inspector_id: str | None = None
    listing_id: str | None = None
    violation_type: str
    violation_severity: str
    action_taken: str
    violation_notes: str | None = None
    created_at: datetime


class ComplaintCreateIn(BaseModel):
    seller_id: str | None = None
    listing_id: str | None = None
    complaint_type: str
    complaint_description: str


class ComplaintOut(BaseModel):
    id: str
    reporter_user_id: str | None = None
    seller_id: str | None = None
    listing_id: str | None = None
    complaint_type: str
    complaint_description: str
    complaint_status: str
    inspector_id: str | None = None
    resolution_notes: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None


class ComplaintStatusUpdateIn(BaseModel):
    status: str
    resolution_notes: str | None = None


class ScheduleCreateIn(BaseModel):
    seller_id: str
    scheduled_date: datetime
    inspection_type: str


class ScheduleOut(BaseModel):
    id: str
    inspector_id: str | None = None
    seller_id: str
    scheduled_date: datetime
    inspection_type: str
    schedule_status: str
    created_at: datetime


class ScheduleUpdateIn(BaseModel):
    status: str


class ModerationCreateIn(BaseModel):
    listing_id: str
    seller_id: str
    flagged_reason: str


class ModerationOut(BaseModel):
    id: str
    listing_id: str
    seller_id: str
    flagged_reason: str
    moderation_status: str
    inspector_id: str | None = None
    action_taken: str | None = None
    created_at: datetime


class ModerationUpdateIn(BaseModel):
    status: str
    action_taken: str | None = None


class AnalyticsOut(BaseModel):
    total_sellers_verified: int
    total_ngos_verified: int
    total_inspections_completed: int
    total_violations_detected: int
    total_complaints_received: int
    resolved_complaints: int
    suspended_sellers: int
    removed_listings: int


class ImpactOverviewOut(BaseModel):
    total_food_saved_kg: float
    total_co2_reduction_kg: float
    total_landfill_waste_reduction_kg: float
    food_distributed_by_ngos: float
    food_sold_by_sellers: float


class InspectorNotificationOut(BaseModel):
    id: str
    inspector_id: str
    event_type: str
    message: str
    reference_id: str | None = None
    is_read: bool
    created_at: datetime
