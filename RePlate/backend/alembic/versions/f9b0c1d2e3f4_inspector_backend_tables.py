"""inspector_backend_tables

Revision ID: f9b0c1d2e3f4
Revises: f7a8b9c0d1e2
Create Date: 2026-03-06 17:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f9b0c1d2e3f4"
down_revision: Union[str, None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # food_listings moderation status
    op.add_column(
        "food_listings", sa.Column("moderation_status", sa.String(length=50), nullable=True)
    )
    op.create_index("ix_food_listings_moderation_status", "food_listings", ["moderation_status"])

    # food listings seller geo columns
    op.add_column("food_listings", sa.Column("seller_lat", sa.Numeric(10, 7), nullable=True))
    op.add_column("food_listings", sa.Column("seller_lng", sa.Numeric(10, 7), nullable=True))
    op.create_index("ix_food_listings_seller_lat", "food_listings", ["seller_lat"])
    op.create_index("ix_food_listings_seller_lng", "food_listings", ["seller_lng"])

    # inspector jurisdictions
    op.create_table(
        "inspector_jurisdictions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("inspector_id", sa.String(length=36), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("pincode_range", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_inspector_jurisdictions_inspector_id", "inspector_jurisdictions", ["inspector_id"]
    )
    op.create_index("ix_inspector_jurisdictions_city", "inspector_jurisdictions", ["city"])
    op.create_index("ix_inspector_jurisdictions_state", "inspector_jurisdictions", ["state"])

    # seller verifications
    op.create_table(
        "seller_verifications",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("inspector_id", sa.String(length=36), nullable=True),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column("fssai_license_number", sa.String(length=120), nullable=True),
        sa.Column("business_registration_doc", sa.Text(), nullable=True),
        sa.Column(
            "verification_status",
            sa.Enum("pending", "approved", "rejected", name="verification_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("verification_notes", sa.Text(), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_seller_verifications_seller_id", "seller_verifications", ["seller_id"])
    op.create_index(
        "ix_seller_verifications_inspector_id", "seller_verifications", ["inspector_id"]
    )
    op.create_index(
        "ix_seller_verifications_status", "seller_verifications", ["verification_status"]
    )

    # ngo verifications
    op.create_table(
        "ngo_verifications",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("inspector_id", sa.String(length=36), nullable=True),
        sa.Column("ngo_id", sa.String(length=36), nullable=False),
        sa.Column("registration_document", sa.Text(), nullable=True),
        sa.Column(
            "verification_status",
            sa.Enum("pending", "approved", "rejected", name="verification_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("verification_notes", sa.Text(), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["ngo_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ngo_verifications_ngo_id", "ngo_verifications", ["ngo_id"])
    op.create_index("ix_ngo_verifications_inspector_id", "ngo_verifications", ["inspector_id"])
    op.create_index("ix_ngo_verifications_status", "ngo_verifications", ["verification_status"])

    # food inspections
    op.create_table(
        "food_inspections",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("inspector_id", sa.String(length=36), nullable=True),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=True),
        sa.Column(
            "inspection_type",
            sa.Enum("random", "report", "complaint", name="inspection_type"),
            nullable=False,
            server_default="random",
        ),
        sa.Column(
            "inspection_status",
            sa.Enum("pending", "completed", "violation_found", name="inspection_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("inspection_notes", sa.Text(), nullable=True),
        sa.Column(
            "violation_type",
            sa.Enum(
                "expired_food", "unsafe_handling", "fake_listing", "other", name="violation_type"
            ),
            nullable=True,
        ),
        sa.Column("inspection_date", sa.DateTime(), nullable=True),
        sa.Column("report_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["listing_id"], ["food_listings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_food_inspections_seller_id", "food_inspections", ["seller_id"])
    op.create_index("ix_food_inspections_inspector_id", "food_inspections", ["inspector_id"])
    op.create_index("ix_food_inspections_listing_id", "food_inspections", ["listing_id"])
    op.create_index("ix_food_inspections_status", "food_inspections", ["inspection_status"])

    # violations
    op.create_table(
        "violation_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column("inspector_id", sa.String(length=36), nullable=True),
        sa.Column("listing_id", sa.String(length=36), nullable=True),
        sa.Column(
            "violation_type",
            sa.Enum(
                "expired_food", "unsafe_handling", "fake_listing", "other", name="violation_type"
            ),
            nullable=False,
        ),
        sa.Column(
            "violation_severity",
            sa.Enum("low", "medium", "high", name="violation_severity"),
            nullable=False,
        ),
        sa.Column(
            "action_taken",
            sa.Enum("warning", "listing_removed", "account_suspended", name="enforcement_action"),
            nullable=False,
        ),
        sa.Column("violation_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["listing_id"], ["food_listings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_violation_records_seller_id", "violation_records", ["seller_id"])
    op.create_index("ix_violation_records_inspector_id", "violation_records", ["inspector_id"])
    op.create_index("ix_violation_records_listing_id", "violation_records", ["listing_id"])
    op.create_index("ix_violation_records_created_at", "violation_records", ["created_at"])

    # complaints
    op.create_table(
        "complaint_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("reporter_user_id", sa.String(length=36), nullable=True),
        sa.Column("seller_id", sa.String(length=36), nullable=True),
        sa.Column("listing_id", sa.String(length=36), nullable=True),
        sa.Column(
            "complaint_type",
            sa.Enum("food_quality", "misleading_info", "hygiene", "other", name="complaint_type"),
            nullable=False,
        ),
        sa.Column("complaint_description", sa.Text(), nullable=False),
        sa.Column(
            "complaint_status",
            sa.Enum("open", "investigating", "resolved", "rejected", name="complaint_status"),
            nullable=False,
            server_default="open",
        ),
        sa.Column("inspector_id", sa.String(length=36), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["listing_id"], ["food_listings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reporter_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_complaint_records_seller_id", "complaint_records", ["seller_id"])
    op.create_index("ix_complaint_records_listing_id", "complaint_records", ["listing_id"])
    op.create_index("ix_complaint_records_inspector_id", "complaint_records", ["inspector_id"])
    op.create_index("ix_complaint_records_status", "complaint_records", ["complaint_status"])
    op.create_index("ix_complaint_records_created_at", "complaint_records", ["created_at"])

    # inspection schedules
    op.create_table(
        "inspection_schedules",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("inspector_id", sa.String(length=36), nullable=True),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column("scheduled_date", sa.DateTime(), nullable=False),
        sa.Column(
            "inspection_type",
            sa.Enum("routine", "complaint_based", name="inspection_schedule_type"),
            nullable=False,
            server_default="routine",
        ),
        sa.Column(
            "schedule_status",
            sa.Enum("scheduled", "completed", "cancelled", name="inspection_schedule_status"),
            nullable=False,
            server_default="scheduled",
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_inspection_schedules_inspector_id", "inspection_schedules", ["inspector_id"]
    )
    op.create_index("ix_inspection_schedules_seller_id", "inspection_schedules", ["seller_id"])
    op.create_index("ix_inspection_schedules_status", "inspection_schedules", ["schedule_status"])

    # listing moderations
    op.create_table(
        "listing_moderations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column("flagged_reason", sa.Text(), nullable=False),
        sa.Column(
            "moderation_status",
            sa.Enum("pending", "reviewed", "action_taken", name="moderation_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("inspector_id", sa.String(length=36), nullable=True),
        sa.Column(
            "action_taken",
            sa.Enum("warning", "listing_removed", "account_suspended", name="moderation_action"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["listing_id"], ["food_listings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_listing_moderations_listing_id", "listing_moderations", ["listing_id"])
    op.create_index("ix_listing_moderations_seller_id", "listing_moderations", ["seller_id"])
    op.create_index("ix_listing_moderations_status", "listing_moderations", ["moderation_status"])

    # inspector notifications
    op.create_table(
        "inspector_notifications",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("inspector_id", sa.String(length=36), nullable=False),
        sa.Column(
            "event_type",
            sa.Enum(
                "new_seller_verification_request",
                "new_ngo_verification_request",
                "new_complaint_reported",
                "violation_detected",
                "inspection_due",
                name="inspector_notification_type",
            ),
            nullable=False,
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("reference_id", sa.String(length=36), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_inspector_notifications_inspector_id", "inspector_notifications", ["inspector_id"]
    )
    op.create_index("ix_inspector_notifications_is_read", "inspector_notifications", ["is_read"])
    op.create_index(
        "ix_inspector_notifications_created_at", "inspector_notifications", ["created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_inspector_notifications_created_at", table_name="inspector_notifications")
    op.drop_index("ix_inspector_notifications_is_read", table_name="inspector_notifications")
    op.drop_index("ix_inspector_notifications_inspector_id", table_name="inspector_notifications")
    op.drop_table("inspector_notifications")

    op.drop_index("ix_listing_moderations_status", table_name="listing_moderations")
    op.drop_index("ix_listing_moderations_seller_id", table_name="listing_moderations")
    op.drop_index("ix_listing_moderations_listing_id", table_name="listing_moderations")
    op.drop_table("listing_moderations")

    op.drop_index("ix_inspection_schedules_status", table_name="inspection_schedules")
    op.drop_index("ix_inspection_schedules_seller_id", table_name="inspection_schedules")
    op.drop_index("ix_inspection_schedules_inspector_id", table_name="inspection_schedules")
    op.drop_table("inspection_schedules")

    op.drop_index("ix_complaint_records_created_at", table_name="complaint_records")
    op.drop_index("ix_complaint_records_status", table_name="complaint_records")
    op.drop_index("ix_complaint_records_inspector_id", table_name="complaint_records")
    op.drop_index("ix_complaint_records_listing_id", table_name="complaint_records")
    op.drop_index("ix_complaint_records_seller_id", table_name="complaint_records")
    op.drop_table("complaint_records")

    op.drop_index("ix_violation_records_created_at", table_name="violation_records")
    op.drop_index("ix_violation_records_listing_id", table_name="violation_records")
    op.drop_index("ix_violation_records_inspector_id", table_name="violation_records")
    op.drop_index("ix_violation_records_seller_id", table_name="violation_records")
    op.drop_table("violation_records")

    op.drop_index("ix_food_inspections_status", table_name="food_inspections")
    op.drop_index("ix_food_inspections_listing_id", table_name="food_inspections")
    op.drop_index("ix_food_inspections_inspector_id", table_name="food_inspections")
    op.drop_index("ix_food_inspections_seller_id", table_name="food_inspections")
    op.drop_table("food_inspections")

    op.drop_index("ix_ngo_verifications_status", table_name="ngo_verifications")
    op.drop_index("ix_ngo_verifications_inspector_id", table_name="ngo_verifications")
    op.drop_index("ix_ngo_verifications_ngo_id", table_name="ngo_verifications")
    op.drop_table("ngo_verifications")

    op.drop_index("ix_seller_verifications_status", table_name="seller_verifications")
    op.drop_index("ix_seller_verifications_inspector_id", table_name="seller_verifications")
    op.drop_index("ix_seller_verifications_seller_id", table_name="seller_verifications")
    op.drop_table("seller_verifications")

    op.drop_index("ix_inspector_jurisdictions_state", table_name="inspector_jurisdictions")
    op.drop_index("ix_inspector_jurisdictions_city", table_name="inspector_jurisdictions")
    op.drop_index("ix_inspector_jurisdictions_inspector_id", table_name="inspector_jurisdictions")
    op.drop_table("inspector_jurisdictions")

    op.drop_index("ix_food_listings_moderation_status", table_name="food_listings")
    op.drop_column("food_listings", "moderation_status")
    op.drop_index("ix_food_listings_seller_lng", table_name="food_listings")
    op.drop_index("ix_food_listings_seller_lat", table_name="food_listings")
    op.drop_column("food_listings", "seller_lng")
    op.drop_column("food_listings", "seller_lat")
