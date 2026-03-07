"""Food-related tables: listings, orders, order items, favorites, impact stats."""

import enum
from datetime import datetime


# MySQL stores enum values by their .value strings (lowercase), not .name.
# This callable tells SQLAlchemy to use the enum's .value instead of .name.
def _vc(enum_cls):  # values_callable helper
    return [e.value for e in enum_cls]


from sqlalchemy import (
    Boolean,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    DateTime,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


# ── Enums ──────────────────────────────────────────────────────────────────────


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FavoriteType(str, enum.Enum):
    FOOD = "food"
    SELLER = "seller"


class ImpactLevel(str, enum.Enum):
    SEEDLING = "seedling"
    SPROUT = "sprout"
    SAPLING = "sapling"
    TREE = "tree"
    FOREST = "forest"


class SellerListingStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    SOLD_OUT = "sold_out"
    EXPIRED = "expired"
    DRAFT = "draft"
    SCHEDULED = "scheduled"


class SellerNotificationType(str, enum.Enum):
    NEW_ORDER = "new_order"
    NGO_PICKUP_REQUEST = "ngo_pickup_request"
    ORDER_CANCELLED = "order_cancelled"
    ORDER_COMPLETED = "order_completed"
    PICKUP_REMINDER = "pickup_reminder"
    LISTING_EXPIRY = "listing_expiry"
    LOW_STOCK = "low_stock"
    NEW_REVIEW = "new_review"
    PAYMENT_RECEIVED = "payment_received"
    SYSTEM = "system"


class FoodType(str, enum.Enum):
    VEG = "veg"
    NONVEG = "nonveg"
    VEGAN = "vegan"


class DonorRole(str, enum.Enum):
    SELLER = "seller"
    CONSUMER = "consumer"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class DonationApprovalStatus(str, enum.Enum):
    REQUESTED = "requested"
    APPROVED = "approved"
    REJECTED = "rejected"
    PICKED_UP = "picked_up"


class PickupStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class VerificationMethod(str, enum.Enum):
    QR = "qr"
    CODE = "code"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class InspectionType(str, enum.Enum):
    RANDOM = "random"
    REPORT = "report"
    COMPLAINT = "complaint"


class InspectionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    VIOLATION_FOUND = "violation_found"


class ViolationType(str, enum.Enum):
    EXPIRED_FOOD = "expired_food"
    UNSAFE_HANDLING = "unsafe_handling"
    FAKE_LISTING = "fake_listing"
    OTHER = "other"


class ViolationSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EnforcementAction(str, enum.Enum):
    WARNING = "warning"
    LISTING_REMOVED = "listing_removed"
    ACCOUNT_SUSPENDED = "account_suspended"


class ComplaintType(str, enum.Enum):
    FOOD_QUALITY = "food_quality"
    MISLEADING_INFO = "misleading_info"
    HYGIENE = "hygiene"
    OTHER = "other"


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class InspectionScheduleType(str, enum.Enum):
    ROUTINE = "routine"
    COMPLAINT_BASED = "complaint_based"


class InspectionScheduleStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ModerationStatus(str, enum.Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    ACTION_TAKEN = "action_taken"


class InspectorNotificationType(str, enum.Enum):
    NEW_SELLER_VERIFICATION = "new_seller_verification_request"
    NEW_NGO_VERIFICATION = "new_ngo_verification_request"
    NEW_COMPLAINT = "new_complaint_reported"
    VIOLATION_DETECTED = "violation_detected"
    INSPECTION_DUE = "inspection_due"


# ── Food Listing ───────────────────────────────────────────────────────────────


class FoodListing(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A surplus food item posted by a seller."""

    __tablename__ = "food_listings"

    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Core listing info ──────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # JSON array of image URLs stored as Text
    images: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Pricing ───────────────────────────────────────────────────────────────
    original_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discounted_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Quantity ──────────────────────────────────────────────────────────────
    quantity_available: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    total_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    quantity_sold: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    quantity_unit: Mapped[str] = mapped_column(String(50), nullable=False, default="item")

    # ── Dietary / tags ────────────────────────────────────────────────────────
    # Comma-separated dietary tags (e.g. "veg,vegan,gluten-free")
    dietary_tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Comma-separated allergens
    allergens: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Pickup window ─────────────────────────────────────────────────────────
    pickup_start: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pickup_end: Mapped[str | None] = mapped_column(String(50), nullable=True)
    expires_at: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Sustainability ────────────────────────────────────────────────────────
    co2_saved_per_unit: Mapped[float | None] = mapped_column(Numeric(8, 3), nullable=True)
    is_donation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    donor_role: Mapped[DonorRole] = mapped_column(
        SAEnum(DonorRole, name="donor_role", values_callable=_vc),
        default=DonorRole.SELLER,
        nullable=False,
        index=True,
    )
    food_type: Mapped[FoodType] = mapped_column(
        SAEnum(FoodType, name="food_type", values_callable=_vc),
        default=FoodType.VEG,
        nullable=False,
    )

    # ── Seller denormalized snapshot (avoids joins on browse) ──────────────────
    seller_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    seller_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    seller_logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    seller_lat: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True, index=True)
    seller_lng: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True, index=True)
    seller_distance_km: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    seller_rating: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    seller_category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Listing state ─────────────────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    seller_status: Mapped[SellerListingStatus] = mapped_column(
        SAEnum(SellerListingStatus, name="seller_listing_status", values_callable=_vc),
        default=SellerListingStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cart_add_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rating: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # ── Discovery metadata ────────────────────────────────────────────────────
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    cuisine_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    distance_from_user: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    freshness_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    popularity_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)

    # ── Soft-delete ───────────────────────────────────────────────────────────
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    moderation_status: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)

    def __repr__(self) -> str:
        return f"<FoodListing id={self.id} title={self.title!r}>"


# ── Order ──────────────────────────────────────────────────────────────────────


class Order(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A consumer's purchase order."""

    __tablename__ = "orders"

    consumer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    status: Mapped[OrderStatus] = mapped_column(
        SAEnum(OrderStatus, name="order_status", values_callable=_vc),
        default=OrderStatus.PENDING,
        nullable=False,
        index=True,
    )

    # ── Financials ────────────────────────────────────────────────────────────
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_savings: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total_co2_saved: Mapped[float] = mapped_column(Numeric(8, 3), nullable=False, default=0)
    platform_fee: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False, default="cod")
    payment_status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus, name="payment_status", values_callable=_vc),
        default=PaymentStatus.PENDING,
        nullable=False,
        index=True,
    )

    # ── Pickup ────────────────────────────────────────────────────────────────
    pickup_time: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pickup_address: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Seller snapshot ───────────────────────────────────────────────────────
    seller_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    seller_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    seller_logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    seller_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    seller_rating: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    seller_category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Cancellation ─────────────────────────────────────────────────────────
    cancel_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── QR code for pickup verification ──────────────────────────────────────
    qr_code: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Order id={self.id} number={self.order_number} status={self.status}>"


# ── Order Item ────────────────────────────────────────────────────────────────


class OrderItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """One line-item within an order."""

    __tablename__ = "order_items"

    order_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    food_listing_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("food_listings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Snapshot of the listing at order time (so it survives listing deletion)
    listing_title: Mapped[str] = mapped_column(String(200), nullable=False)
    listing_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    listing_unit: Mapped[str] = mapped_column(String(50), nullable=False, default="item")
    listing_pickup_start: Mapped[str | None] = mapped_column(String(50), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    co2_saved: Mapped[float] = mapped_column(Numeric(8, 3), nullable=False, default=0)

    # ── Back-ref ──────────────────────────────────────────────────────────────
    order: Mapped["Order"] = relationship("Order", back_populates="items")

    def __repr__(self) -> str:
        return f"<OrderItem id={self.id} order={self.order_id} qty={self.quantity}>"


# ── Favorite ──────────────────────────────────────────────────────────────────


class Favorite(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A consumer's favorited food listing or seller."""

    __tablename__ = "favorites"

    consumer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    favorite_type: Mapped[FavoriteType] = mapped_column(
        SAEnum(FavoriteType, name="favorite_type", values_callable=_vc),
        nullable=False,
    )
    # Only one of these two is set depending on favorite_type
    food_listing_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("food_listings.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    seller_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint("consumer_id", "food_listing_id", name="uq_favorite_food"),
        UniqueConstraint("consumer_id", "seller_id", name="uq_favorite_seller"),
    )

    def __repr__(self) -> str:
        return f"<Favorite id={self.id} consumer={self.consumer_id} type={self.favorite_type}>"


# ── Impact Stat ───────────────────────────────────────────────────────────────


class ImpactStat(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Aggregated sustainability stats for a consumer — one row per consumer."""

    __tablename__ = "impact_stats"

    consumer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    total_orders: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_co2_saved: Mapped[float] = mapped_column(Numeric(10, 3), default=0, nullable=False)
    total_money_saved: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    total_meals_rescued: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_food_weight_saved: Mapped[float] = mapped_column(
        Numeric(10, 3), default=0, nullable=False
    )
    streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    level: Mapped[ImpactLevel] = mapped_column(
        SAEnum(ImpactLevel, name="impact_level", values_callable=_vc),
        default=ImpactLevel.SEEDLING,
        nullable=False,
    )
    next_level_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # JSON array of MonthlyImpact objects stored as Text
    monthly_data: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<ImpactStat consumer={self.consumer_id} level={self.level}>"


# ── Seller Review ─────────────────────────────────────────────────────────────


class SellerReview(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Review left by a consumer for a seller/order."""

    __tablename__ = "seller_reviews"

    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    consumer_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    order_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    food_listing_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("food_listings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    seller_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    seller_replied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


# ── Seller Notification ───────────────────────────────────────────────────────


class SellerNotification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Seller-facing in-app notifications."""

    __tablename__ = "seller_notifications"

    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[SellerNotificationType] = mapped_column(
        SAEnum(SellerNotificationType, name="seller_notification_type", values_callable=_vc),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    action_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    order_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    food_listing_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("food_listings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )


class InventoryTracking(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Stock tracking snapshot for each listing."""

    __tablename__ = "inventory_tracking"

    listing_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("food_listings.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    initial_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class NGOListingRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """NGO pickup requests for donation listings."""

    __tablename__ = "ngo_listing_requests"

    ngo_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    listing_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("food_listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requested_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    pickup_time: Mapped[str | None] = mapped_column(String(50), nullable=True)
    approval_status: Mapped[DonationApprovalStatus] = mapped_column(
        SAEnum(DonationApprovalStatus, name="donation_approval_status", values_callable=_vc),
        default=DonationApprovalStatus.REQUESTED,
        nullable=False,
        index=True,
    )


class PickupRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Pickup verification records for orders and donations."""

    __tablename__ = "pickup_records"

    order_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    donation_request_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("ngo_listing_requests.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pickup_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    pickup_status: Mapped[PickupStatus] = mapped_column(
        SAEnum(PickupStatus, name="pickup_status", values_callable=_vc),
        default=PickupStatus.PENDING,
        nullable=False,
        index=True,
    )
    pickup_time: Mapped[str | None] = mapped_column(String(50), nullable=True)
    verification_method: Mapped[VerificationMethod] = mapped_column(
        SAEnum(VerificationMethod, name="verification_method", values_callable=_vc),
        default=VerificationMethod.CODE,
        nullable=False,
    )


class EnvironmentalImpactRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Environmental impact generated per order."""

    __tablename__ = "environmental_impact_records"

    order_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    food_saved_kg: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, default=0)
    co2_reduction_kg: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, default=0)
    landfill_waste_reduction: Mapped[float] = mapped_column(
        Numeric(10, 3), nullable=False, default=0
    )


class InspectorJurisdiction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Jurisdiction assigned to inspectors."""

    __tablename__ = "inspector_jurisdictions"

    inspector_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    city: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    pincode_range: Mapped[str | None] = mapped_column(String(50), nullable=True)


class SellerVerification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Seller verification records handled by inspectors."""

    __tablename__ = "seller_verifications"

    inspector_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fssai_license_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    business_registration_doc: Mapped[str | None] = mapped_column(Text, nullable=True)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus, name="verification_status", values_callable=_vc),
        default=VerificationStatus.PENDING,
        nullable=False,
        index=True,
    )
    verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class NGOVerification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """NGO verification records handled by inspectors."""

    __tablename__ = "ngo_verifications"

    inspector_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ngo_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    registration_document: Mapped[str | None] = mapped_column(Text, nullable=True)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus, name="verification_status", values_callable=_vc),
        default=VerificationStatus.PENDING,
        nullable=False,
        index=True,
    )
    verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class FoodInspection(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Food inspection records for listings/sellers."""

    __tablename__ = "food_inspections"

    inspector_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    listing_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("food_listings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    inspection_type: Mapped[InspectionType] = mapped_column(
        SAEnum(InspectionType, name="inspection_type", values_callable=_vc),
        default=InspectionType.RANDOM,
        nullable=False,
    )
    inspection_status: Mapped[InspectionStatus] = mapped_column(
        SAEnum(InspectionStatus, name="inspection_status", values_callable=_vc),
        default=InspectionStatus.PENDING,
        nullable=False,
        index=True,
    )
    inspection_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    violation_type: Mapped[ViolationType | None] = mapped_column(
        SAEnum(ViolationType, name="violation_type", values_callable=_vc), nullable=True
    )
    inspection_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    report_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class ViolationRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Violation enforcement records."""

    __tablename__ = "violation_records"

    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    inspector_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    listing_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("food_listings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    violation_type: Mapped[ViolationType] = mapped_column(
        SAEnum(ViolationType, name="violation_type", values_callable=_vc), nullable=False
    )
    violation_severity: Mapped[ViolationSeverity] = mapped_column(
        SAEnum(ViolationSeverity, name="violation_severity", values_callable=_vc), nullable=False
    )
    action_taken: Mapped[EnforcementAction] = mapped_column(
        SAEnum(EnforcementAction, name="enforcement_action", values_callable=_vc), nullable=False
    )
    violation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class ComplaintRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Complaint records from consumers/NGOs."""

    __tablename__ = "complaint_records"

    reporter_user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    seller_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    listing_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("food_listings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    complaint_type: Mapped[ComplaintType] = mapped_column(
        SAEnum(ComplaintType, name="complaint_type", values_callable=_vc), nullable=False
    )
    complaint_description: Mapped[str] = mapped_column(Text, nullable=False)
    complaint_status: Mapped[ComplaintStatus] = mapped_column(
        SAEnum(ComplaintStatus, name="complaint_status", values_callable=_vc),
        default=ComplaintStatus.OPEN,
        nullable=False,
        index=True,
    )
    inspector_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class InspectionSchedule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Inspection scheduling for sellers."""

    __tablename__ = "inspection_schedules"

    inspector_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scheduled_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    inspection_type: Mapped[InspectionScheduleType] = mapped_column(
        SAEnum(InspectionScheduleType, name="inspection_schedule_type", values_callable=_vc),
        default=InspectionScheduleType.ROUTINE,
        nullable=False,
    )
    schedule_status: Mapped[InspectionScheduleStatus] = mapped_column(
        SAEnum(InspectionScheduleStatus, name="inspection_schedule_status", values_callable=_vc),
        default=InspectionScheduleStatus.SCHEDULED,
        nullable=False,
        index=True,
    )


class ListingModeration(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Listing moderation queue flagged by system rules."""

    __tablename__ = "listing_moderations"

    listing_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("food_listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    flagged_reason: Mapped[str] = mapped_column(Text, nullable=False)
    moderation_status: Mapped[ModerationStatus] = mapped_column(
        SAEnum(ModerationStatus, name="moderation_status", values_callable=_vc),
        default=ModerationStatus.PENDING,
        nullable=False,
        index=True,
    )
    inspector_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action_taken: Mapped[EnforcementAction | None] = mapped_column(
        SAEnum(EnforcementAction, name="moderation_action", values_callable=_vc), nullable=True
    )


class InspectorNotification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Notifications for inspectors."""

    __tablename__ = "inspector_notifications"

    inspector_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[InspectorNotificationType] = mapped_column(
        SAEnum(InspectorNotificationType, name="inspector_notification_type", values_callable=_vc),
        nullable=False,
        index=True,
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
