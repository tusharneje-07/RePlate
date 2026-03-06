"""seller_backend_domain_expansion

Revision ID: f7a8b9c0d1e2
Revises: d4e5f6a7b8c9
Create Date: 2026-03-06 15:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # seller_profiles enhancements
    op.add_column("seller_profiles", sa.Column("owner_name", sa.String(length=200), nullable=True))
    op.add_column(
        "seller_profiles",
        sa.Column(
            "verification_status",
            sa.Enum("pending", "verified", "rejected", name="seller_verification_status"),
            nullable=False,
            server_default="pending",
        ),
    )

    # food_listings enhancements for donation/search/soft-delete
    op.add_column(
        "food_listings",
        sa.Column("is_donation", sa.Boolean(), nullable=False, server_default="0"),
    )
    op.add_column(
        "food_listings",
        sa.Column(
            "food_type",
            sa.Enum("veg", "nonveg", "vegan", name="food_type"),
            nullable=False,
            server_default="veg",
        ),
    )
    op.add_column("food_listings", sa.Column("tags", sa.Text(), nullable=True))
    op.add_column("food_listings", sa.Column("cuisine_type", sa.String(length=80), nullable=True))
    op.add_column("food_listings", sa.Column("distance_from_user", sa.Numeric(8, 2), nullable=True))
    op.add_column("food_listings", sa.Column("freshness_score", sa.Numeric(5, 2), nullable=True))
    op.add_column("food_listings", sa.Column("popularity_score", sa.Numeric(5, 2), nullable=True))
    op.add_column("food_listings", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.create_index("ix_food_listings_deleted_at", "food_listings", ["deleted_at"])
    op.create_index("ix_food_listings_is_donation", "food_listings", ["is_donation"])

    # orders payment status
    op.add_column(
        "orders",
        sa.Column(
            "payment_status",
            sa.Enum("pending", "paid", "failed", "refunded", name="payment_status"),
            nullable=False,
            server_default="pending",
        ),
    )
    op.create_index("ix_orders_payment_status", "orders", ["payment_status"])

    # inventory tracking
    op.create_table(
        "inventory_tracking",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("initial_quantity", sa.Integer(), nullable=False),
        sa.Column("remaining_quantity", sa.Integer(), nullable=False),
        sa.Column("last_updated", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["food_listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id"),
    )
    op.create_index("ix_inventory_tracking_listing_id", "inventory_tracking", ["listing_id"])

    # ngo donation requests
    op.create_table(
        "ngo_listing_requests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("ngo_id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column("requested_quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("pickup_time", sa.String(length=50), nullable=True),
        sa.Column(
            "approval_status",
            sa.Enum(
                "requested", "approved", "rejected", "picked_up", name="donation_approval_status"
            ),
            nullable=False,
            server_default="requested",
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["food_listings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ngo_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ngo_listing_requests_listing_id", "ngo_listing_requests", ["listing_id"])
    op.create_index("ix_ngo_listing_requests_ngo_id", "ngo_listing_requests", ["ngo_id"])
    op.create_index("ix_ngo_listing_requests_seller_id", "ngo_listing_requests", ["seller_id"])
    op.create_index(
        "ix_ngo_listing_requests_approval_status", "ngo_listing_requests", ["approval_status"]
    )

    # pickup records
    op.create_table(
        "pickup_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("order_id", sa.String(length=36), nullable=True),
        sa.Column("donation_request_id", sa.String(length=36), nullable=True),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column("pickup_code", sa.String(length=64), nullable=False),
        sa.Column(
            "pickup_status",
            sa.Enum("pending", "verified", "completed", "cancelled", name="pickup_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("pickup_time", sa.String(length=50), nullable=True),
        sa.Column(
            "verification_method",
            sa.Enum("qr", "code", name="verification_method"),
            nullable=False,
            server_default="code",
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["donation_request_id"], ["ngo_listing_requests.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pickup_records_order_id", "pickup_records", ["order_id"])
    op.create_index(
        "ix_pickup_records_donation_request_id", "pickup_records", ["donation_request_id"]
    )
    op.create_index("ix_pickup_records_seller_id", "pickup_records", ["seller_id"])
    op.create_index("ix_pickup_records_pickup_code", "pickup_records", ["pickup_code"])
    op.create_index("ix_pickup_records_pickup_status", "pickup_records", ["pickup_status"])

    # environmental impact per order
    op.create_table(
        "environmental_impact_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("order_id", sa.String(length=36), nullable=False),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column("food_saved_kg", sa.Numeric(10, 3), nullable=False, server_default="0"),
        sa.Column("co2_reduction_kg", sa.Numeric(10, 3), nullable=False, server_default="0"),
        sa.Column(
            "landfill_waste_reduction", sa.Numeric(10, 3), nullable=False, server_default="0"
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_id"),
    )
    op.create_index(
        "ix_environmental_impact_records_order_id", "environmental_impact_records", ["order_id"]
    )
    op.create_index(
        "ix_environmental_impact_records_seller_id", "environmental_impact_records", ["seller_id"]
    )


def downgrade() -> None:
    op.drop_index(
        "ix_environmental_impact_records_seller_id", table_name="environmental_impact_records"
    )
    op.drop_index(
        "ix_environmental_impact_records_order_id", table_name="environmental_impact_records"
    )
    op.drop_table("environmental_impact_records")

    op.drop_index("ix_pickup_records_pickup_status", table_name="pickup_records")
    op.drop_index("ix_pickup_records_pickup_code", table_name="pickup_records")
    op.drop_index("ix_pickup_records_seller_id", table_name="pickup_records")
    op.drop_index("ix_pickup_records_donation_request_id", table_name="pickup_records")
    op.drop_index("ix_pickup_records_order_id", table_name="pickup_records")
    op.drop_table("pickup_records")

    op.drop_index("ix_ngo_listing_requests_approval_status", table_name="ngo_listing_requests")
    op.drop_index("ix_ngo_listing_requests_seller_id", table_name="ngo_listing_requests")
    op.drop_index("ix_ngo_listing_requests_ngo_id", table_name="ngo_listing_requests")
    op.drop_index("ix_ngo_listing_requests_listing_id", table_name="ngo_listing_requests")
    op.drop_table("ngo_listing_requests")

    op.drop_index("ix_inventory_tracking_listing_id", table_name="inventory_tracking")
    op.drop_table("inventory_tracking")

    op.drop_index("ix_orders_payment_status", table_name="orders")
    op.drop_column("orders", "payment_status")

    op.drop_index("ix_food_listings_is_donation", table_name="food_listings")
    op.drop_index("ix_food_listings_deleted_at", table_name="food_listings")
    op.drop_column("food_listings", "deleted_at")
    op.drop_column("food_listings", "popularity_score")
    op.drop_column("food_listings", "freshness_score")
    op.drop_column("food_listings", "distance_from_user")
    op.drop_column("food_listings", "cuisine_type")
    op.drop_column("food_listings", "tags")
    op.drop_column("food_listings", "food_type")
    op.drop_column("food_listings", "is_donation")

    op.drop_column("seller_profiles", "verification_status")
    op.drop_column("seller_profiles", "owner_name")
