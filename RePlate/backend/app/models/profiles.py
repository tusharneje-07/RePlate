"""Role-specific profile tables.

Each profile holds only the data relevant to that role.
All profiles reference users.id via a foreign key (1-to-1).
"""

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
import enum


class NGOVerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class NGOType(str, enum.Enum):
    FOOD_BANK = "food_bank"
    SHELTER = "shelter"
    COMMUNITY_KITCHEN = "community_kitchen"
    ORPHANAGE = "orphanage"
    OLD_AGE_HOME = "old_age_home"
    OTHER = "other"


# ── Shared enums ───────────────────────────────────────────────────────────────


class ProfileCompletionStatus(str, enum.Enum):
    INCOMPLETE = "INCOMPLETE"
    PENDING_REVIEW = "PENDING_REVIEW"
    COMPLETE = "COMPLETE"


class SellerVerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


# ── Consumer Profile ───────────────────────────────────────────────────────────


class ConsumerProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "consumer_profiles"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="IN", nullable=False)
    # Dietary / preference tags (stored as comma-separated or JSON string)
    dietary_preferences: Mapped[str | None] = mapped_column(Text, nullable=True)
    completion_status: Mapped[ProfileCompletionStatus] = mapped_column(
        SAEnum(ProfileCompletionStatus, name="consumer_profile_status"),
        default=ProfileCompletionStatus.INCOMPLETE,
        nullable=False,
    )

    user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", back_populates="consumer_profile"
    )


# ── Seller Profile ─────────────────────────────────────────────────────────────


class SellerProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "seller_profiles"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    business_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    business_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    owner_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # FSSAI / food license number — sensitive
    license_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="IN", nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Extended fields (migration b3c4d5e6f7a8) ──────────────────────────────
    # Geo coordinates
    lat: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    lng: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    # Operating hours
    open_time: Mapped[str | None] = mapped_column(String(8), nullable=True)
    close_time: Mapped[str | None] = mapped_column(String(8), nullable=True)
    # JSON array of closed day names, e.g. '["Sunday"]'
    closed_days: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Compliance
    gst_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fssai_certificate_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    bank_statement_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Media
    cover_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Bank / payout
    bank_account: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ifsc: Mapped[str | None] = mapped_column(String(20), nullable=True)

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_status: Mapped[SellerVerificationStatus] = mapped_column(
        SAEnum(SellerVerificationStatus, name="seller_verification_status"),
        default=SellerVerificationStatus.PENDING,
        nullable=False,
    )
    completion_status: Mapped[ProfileCompletionStatus] = mapped_column(
        SAEnum(ProfileCompletionStatus, name="seller_profile_status"),
        default=ProfileCompletionStatus.INCOMPLETE,
        nullable=False,
    )

    user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", back_populates="seller_profile"
    )


# ── NGO Profile ────────────────────────────────────────────────────────────────


class NGOProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ngo_profiles"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    organization_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mission_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="IN", nullable=False)
    # Serving capacity (people per day)
    serving_capacity: Mapped[int | None] = mapped_column(nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completion_status: Mapped[ProfileCompletionStatus] = mapped_column(
        SAEnum(ProfileCompletionStatus, name="ngo_profile_status"),
        default=ProfileCompletionStatus.INCOMPLETE,
        nullable=False,
    )

    # ── Extended fields (ngo_module migration) ────────────────────────────────
    lat: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    lng: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    operating_radius_km: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    ngo_type: Mapped[NGOType | None] = mapped_column(
        SAEnum(NGOType, name="ngo_type"), nullable=True
    )
    verification_status: Mapped[NGOVerificationStatus] = mapped_column(
        SAEnum(NGOVerificationStatus, name="ngo_verification_status"),
        default=NGOVerificationStatus.PENDING,
        nullable=False,
    )
    document_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_person_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    vehicle_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    open_time: Mapped[str | None] = mapped_column(String(8), nullable=True)
    close_time: Mapped[str | None] = mapped_column(String(8), nullable=True)
    # JSON array of closed day names e.g. '["Sunday"]'
    closed_days: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", back_populates="ngo_profile"
    )


# ── Inspector Profile ──────────────────────────────────────────────────────────


class InspectorProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "inspector_profiles"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    badge_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Geographic assignment (city / region)
    assigned_region: Mapped[str | None] = mapped_column(String(200), nullable=True)
    assigned_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Government ID — stored encrypted in future; nullable for now
    government_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active_duty: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    completion_status: Mapped[ProfileCompletionStatus] = mapped_column(
        SAEnum(ProfileCompletionStatus, name="inspector_profile_status"),
        default=ProfileCompletionStatus.INCOMPLETE,
        nullable=False,
    )

    user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", back_populates="inspector_profile"
    )
