"""NGO-specific tables: distributions, environmental impact, notifications, service areas."""

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


def _vc(enum_cls):
    """Return enum values (not names) for SAEnum — fixes MySQL lowercase mismatch."""
    return [e.value for e in enum_cls]


class NGONotificationType(str, enum.Enum):
    DONATION_REQUEST_APPROVED = "DONATION_REQUEST_APPROVED"
    DONATION_REQUEST_REJECTED = "DONATION_REQUEST_REJECTED"
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED"
    PICKUP_COMPLETED = "PICKUP_COMPLETED"
    NEW_NEARBY_DONATION = "NEW_NEARBY_DONATION"


class NGODistributionRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Records a single food distribution event carried out by an NGO."""

    __tablename__ = "ngo_distribution_records"

    ngo_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    donation_request_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("ngo_listing_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    food_quantity_received: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, default=0)
    beneficiaries_served: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    distribution_location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    distribution_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class NGOEnvironmentalImpact(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Environmental impact record auto-created when an NGO pickup is completed."""

    __tablename__ = "ngo_environmental_impact"

    ngo_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    donation_request_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("ngo_listing_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    food_saved_kg: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, default=0)
    # co2 = food_saved_kg * 2.5
    co2_reduction_kg: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, default=0)
    # landfill = food_saved_kg * 0.8
    landfill_waste_reduction_kg: Mapped[float] = mapped_column(
        Numeric(10, 3), nullable=False, default=0
    )


class NGONotification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """In-app notification for NGO users."""

    __tablename__ = "ngo_notifications"

    ngo_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[NGONotificationType] = mapped_column(
        SAEnum(NGONotificationType, values_callable=_vc, name="ngo_notification_type"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    # Generic FK-like reference (stores any entity id)
    reference_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)


class NGOServiceArea(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Operational areas configured by an NGO for targeted food discovery."""

    __tablename__ = "ngo_service_areas"

    ngo_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    coverage_radius_km: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False, default=10.0)
