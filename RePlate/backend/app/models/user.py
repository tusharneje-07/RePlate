"""Central users table — one record per human across all roles."""

import enum

from sqlalchemy import Boolean, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class UserRole(str, enum.Enum):
    CONSUMER = "CONSUMER"
    SELLER = "SELLER"
    NGO = "NGO"
    INSPECTOR = "INSPECTOR"
    ADMIN = "ADMIN"


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Single canonical user record.

    WorkOS owns the identity (email, password, OAuth) in production.
    When SKIP_WORKOS=true we store a bcrypt password_hash locally.
    """

    __tablename__ = "users"

    # ── WorkOS identity (nullable when SKIP_WORKOS=true) ──────────────────────
    workos_user_id: Mapped[str | None] = mapped_column(
        String(128), unique=True, nullable=True, index=True
    )

    # ── Local email/password (used when SKIP_WORKOS=true) ─────────────────────
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Basic identity (kept in sync with WorkOS) ──────────────────────────────
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    profile_picture_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Role & state ───────────────────────────────────────────────────────────
    role: Mapped[UserRole | None] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=True, default=None
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # True once the user has completed role-specific onboarding
    is_onboarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Profile relationships (1-to-1) ─────────────────────────────────────────
    # passive_deletes=True tells SQLAlchemy to rely on the DB-level ON DELETE CASCADE
    # rather than issuing UPDATE ... SET user_id=NULL before the parent DELETE.
    consumer_profile: Mapped["ConsumerProfile | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "ConsumerProfile",
        back_populates="user",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    seller_profile: Mapped["SellerProfile | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "SellerProfile",
        back_populates="user",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    ngo_profile: Mapped["NGOProfile | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "NGOProfile",
        back_populates="user",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    inspector_profile: Mapped["InspectorProfile | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "InspectorProfile",
        back_populates="user",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
