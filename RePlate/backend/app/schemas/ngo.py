"""Pydantic schemas for the NGO backend module."""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Profile ────────────────────────────────────────────────────────────────────


class NGOProfileOut(BaseModel):
    id: str
    organization_name: Optional[str] = None
    registration_number: Optional[str] = None
    mission_statement: Optional[str] = None
    phone: Optional[str] = None
    email: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str
    serving_capacity: Optional[int] = None
    logo_url: Optional[str] = None
    is_verified: bool
    completion_status: str
    # Extended
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    operating_radius_km: Optional[float] = None
    ngo_type: Optional[str] = None
    verification_status: str
    document_url: Optional[str] = None
    contact_person_name: Optional[str] = None
    vehicle_type: Optional[str] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    closed_days: Optional[list[str]] = None


class NGOProfileUpdateIn(BaseModel):
    organization_name: Optional[str] = None
    registration_number: Optional[str] = None
    mission_statement: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    serving_capacity: Optional[int] = None
    logo_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    operating_radius_km: Optional[float] = None
    ngo_type: Optional[str] = None
    contact_person_name: Optional[str] = None
    vehicle_type: Optional[str] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    closed_days: Optional[list[str]] = None


# ── Discovery ──────────────────────────────────────────────────────────────────


class DonationListingOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: str
    food_type: str
    donor_role: str = "seller"
    quantity_available: int
    quantity_unit: str
    original_price: float
    discounted_price: float
    pickup_start: Optional[str] = None
    pickup_end: Optional[str] = None
    expires_at: Optional[str] = None
    seller_id: str
    seller_name: Optional[str] = None
    seller_address: Optional[str] = None
    seller_logo_url: Optional[str] = None
    is_active: bool
    distance_from_ngo: Optional[float] = None
    images: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    created_at: datetime


# ── Donation Requests ─────────────────────────────────────────────────────────


class DonationRequestCreateIn(BaseModel):
    listing_id: str
    requested_quantity: int = Field(ge=1)
    pickup_time: Optional[str] = None


class DonationRequestOut(BaseModel):
    id: str
    ngo_id: str
    listing_id: str
    seller_id: str
    requested_quantity: int
    pickup_time: Optional[str] = None
    approval_status: str
    created_at: datetime
    updated_at: datetime
    # Listing snapshot (included in detail view)
    listing_title: Optional[str] = None
    listing_quantity_unit: Optional[str] = None
    listing_category: Optional[str] = None
    seller_name: Optional[str] = None
    # Auto-created pickup info (returned immediately after claim)
    pickup_id: Optional[str] = None
    pickup_code: Optional[str] = None


# ── Pickup Management ──────────────────────────────────────────────────────────


class PickupScheduleIn(BaseModel):
    donation_request_id: str
    pickup_time: Optional[str] = None


class NGOPickupOut(BaseModel):
    id: str
    donation_request_id: Optional[str] = None
    seller_id: str
    pickup_code: str
    pickup_status: str
    pickup_time: Optional[str] = None
    verification_method: str
    created_at: datetime
    # Enriched listing / donor details
    listing_id: Optional[str] = None
    listing_title: Optional[str] = None
    listing_description: Optional[str] = None
    listing_category: Optional[str] = None
    listing_images: Optional[list[str]] = None
    listing_quantity: Optional[int] = None
    listing_quantity_unit: Optional[str] = None
    listing_expires_at: Optional[str] = None
    listing_pickup_start: Optional[str] = None
    listing_pickup_end: Optional[str] = None
    seller_name: Optional[str] = None
    seller_address: Optional[str] = None
    seller_lat: Optional[float] = None
    seller_lng: Optional[float] = None


# ── Distribution Tracking ─────────────────────────────────────────────────────


class DistributionCreateIn(BaseModel):
    donation_request_id: Optional[str] = None
    food_quantity_received: float = Field(ge=0)
    beneficiaries_served: int = Field(ge=0)
    distribution_location: Optional[str] = None
    distribution_date: Optional[date] = None
    notes: Optional[str] = None


class DistributionUpdateIn(BaseModel):
    food_quantity_received: Optional[float] = Field(default=None, ge=0)
    beneficiaries_served: Optional[int] = Field(default=None, ge=0)
    distribution_location: Optional[str] = None
    distribution_date: Optional[date] = None
    notes: Optional[str] = None


class DistributionOut(BaseModel):
    id: str
    ngo_id: str
    donation_request_id: Optional[str] = None
    food_quantity_received: float
    beneficiaries_served: int
    distribution_location: Optional[str] = None
    distribution_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ── Analytics Dashboard ────────────────────────────────────────────────────────


class NGODashboardOut(BaseModel):
    total_food_collected_kg: float
    total_food_distributed_kg: float
    total_pickups_completed: int
    total_sellers_supported: int
    total_beneficiaries_served: int
    co2_reduction_total: float
    landfill_waste_reduction_total: float
    total_requests: int
    approved_requests: int
    pending_requests: int


# ── Environmental Impact ───────────────────────────────────────────────────────


class NGOImpactOut(BaseModel):
    id: str
    ngo_id: str
    donation_request_id: str
    food_saved_kg: float
    co2_reduction_kg: float
    landfill_waste_reduction_kg: float
    created_at: datetime


# ── Notifications ──────────────────────────────────────────────────────────────


class NGONotificationOut(BaseModel):
    id: str
    ngo_id: str
    event_type: str
    title: str
    message: str
    reference_id: Optional[str] = None
    is_read: bool
    created_at: datetime


# ── Service Areas ──────────────────────────────────────────────────────────────


class ServiceAreaCreateIn(BaseModel):
    city: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    coverage_radius_km: float = Field(default=10.0, ge=0.1)


class ServiceAreaOut(BaseModel):
    id: str
    ngo_id: str
    city: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    coverage_radius_km: float
    created_at: datetime
