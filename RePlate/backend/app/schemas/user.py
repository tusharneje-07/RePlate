"""Pydantic schemas for User and Profile endpoints."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr


# ── User schemas ───────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    """Public representation of the current user — safe to send to frontend."""
    id: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    profile_picture_url: str | None = None
    role: str | None = None
    is_active: bool
    is_email_verified: bool
    is_onboarded: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Consumer profile schemas ───────────────────────────────────────────────────

class ConsumerProfileIn(BaseModel):
    phone_number: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    dietary_preferences: str | None = None


class ConsumerProfileOut(ConsumerProfileIn):
    id: str
    user_id: str
    completion_status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Seller profile schemas ─────────────────────────────────────────────────────

class SellerProfileIn(BaseModel):
    # Core identity
    business_name: str | None = None
    business_type: str | None = None
    license_number: str | None = None
    phone_number: str | None = None
    # Address
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    description: str | None = None
    # Media
    logo_url: str | None = None
    cover_image_url: str | None = None
    # Geo coordinates
    lat: Decimal | None = None
    lng: Decimal | None = None
    # Operating hours
    open_time: str | None = None
    close_time: str | None = None
    # JSON array string, e.g. '["Sunday", "Monday"]'
    closed_days: str | None = None
    # Compliance
    gst_number: str | None = None
    fssai_certificate_url: str | None = None
    bank_statement_url: str | None = None
    # Bank / payout
    bank_account: str | None = None
    ifsc: str | None = None


class SellerProfileOut(SellerProfileIn):
    id: str
    user_id: str
    is_verified: bool
    completion_status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── NGO profile schemas ────────────────────────────────────────────────────────

class NGOProfileIn(BaseModel):
    organization_name: str | None = None
    registration_number: str | None = None
    mission_statement: str | None = None
    phone_number: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    serving_capacity: int | None = None
    logo_url: str | None = None


class NGOProfileOut(NGOProfileIn):
    id: str
    user_id: str
    is_verified: bool
    completion_status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Inspector profile schemas ──────────────────────────────────────────────────

class InspectorProfileIn(BaseModel):
    badge_number: str | None = None
    department: str | None = None
    phone_number: str | None = None
    assigned_region: str | None = None
    assigned_city: str | None = None
    government_id: str | None = None


class InspectorProfileOut(InspectorProfileIn):
    id: str
    user_id: str
    is_active_duty: bool
    completion_status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Admin: create inspector ────────────────────────────────────────────────────

class CreateInspectorRequest(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    badge_number: str
    department: str
    assigned_region: str
    assigned_city: str
