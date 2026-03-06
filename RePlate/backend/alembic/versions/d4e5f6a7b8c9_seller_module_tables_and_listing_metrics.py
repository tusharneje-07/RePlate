"""seller_module_tables_and_listing_metrics

Revision ID: d4e5f6a7b8c9
Revises: a1b2c3d4e5f6
Create Date: 2026-03-06 11:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # food_listings: seller-facing metrics and richer status support
    op.add_column(
        "food_listings",
        sa.Column("total_quantity", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "food_listings",
        sa.Column("quantity_sold", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "food_listings",
        sa.Column(
            "seller_status",
            sa.Enum(
                "active",
                "paused",
                "sold_out",
                "expired",
                "draft",
                "scheduled",
                name="seller_listing_status",
            ),
            nullable=False,
            server_default="active",
        ),
    )
    op.add_column(
        "food_listings",
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "food_listings",
        sa.Column("cart_add_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_food_listings_seller_status", "food_listings", ["seller_status"])
    op.create_index(
        "ix_food_listings_seller_is_active",
        "food_listings",
        ["seller_id", "is_active", "created_at"],
    )

    # Backfill total_quantity for existing rows
    op.execute(
        "UPDATE food_listings SET total_quantity = quantity_available WHERE total_quantity = 1"
    )

    # orders: improve seller query performance
    op.create_index(
        "ix_orders_seller_status_created", "orders", ["seller_id", "status", "created_at"]
    )

    # seller reviews
    op.create_table(
        "seller_reviews",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column("consumer_id", sa.String(length=36), nullable=True),
        sa.Column("order_id", sa.String(length=36), nullable=True),
        sa.Column("food_listing_id", sa.String(length=36), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("seller_reply", sa.Text(), nullable=True),
        sa.Column("seller_replied_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["consumer_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["food_listing_id"], ["food_listings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_seller_reviews_seller_id", "seller_reviews", ["seller_id"])
    op.create_index("ix_seller_reviews_consumer_id", "seller_reviews", ["consumer_id"])
    op.create_index("ix_seller_reviews_order_id", "seller_reviews", ["order_id"])
    op.create_index("ix_seller_reviews_food_listing_id", "seller_reviews", ["food_listing_id"])
    op.create_index(
        "ix_seller_reviews_seller_created", "seller_reviews", ["seller_id", "created_at"]
    )

    # seller notifications
    op.create_table(
        "seller_notifications",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column(
            "event_type",
            sa.Enum(
                "new_order",
                "order_cancelled",
                "pickup_reminder",
                "listing_expiry",
                "low_stock",
                "new_review",
                "payment_received",
                "system",
                name="seller_notification_type",
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("action_url", sa.String(length=255), nullable=True),
        sa.Column("order_id", sa.String(length=36), nullable=True),
        sa.Column("food_listing_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["food_listing_id"], ["food_listings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_seller_notifications_seller_id", "seller_notifications", ["seller_id"])
    op.create_index("ix_seller_notifications_event_type", "seller_notifications", ["event_type"])
    op.create_index("ix_seller_notifications_is_read", "seller_notifications", ["is_read"])
    op.create_index("ix_seller_notifications_order_id", "seller_notifications", ["order_id"])
    op.create_index(
        "ix_seller_notifications_food_listing_id", "seller_notifications", ["food_listing_id"]
    )
    op.create_index(
        "ix_seller_notifications_seller_read_created",
        "seller_notifications",
        ["seller_id", "is_read", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_seller_notifications_seller_read_created", table_name="seller_notifications")
    op.drop_index("ix_seller_notifications_food_listing_id", table_name="seller_notifications")
    op.drop_index("ix_seller_notifications_order_id", table_name="seller_notifications")
    op.drop_index("ix_seller_notifications_is_read", table_name="seller_notifications")
    op.drop_index("ix_seller_notifications_event_type", table_name="seller_notifications")
    op.drop_index("ix_seller_notifications_seller_id", table_name="seller_notifications")
    op.drop_table("seller_notifications")

    op.drop_index("ix_seller_reviews_seller_created", table_name="seller_reviews")
    op.drop_index("ix_seller_reviews_food_listing_id", table_name="seller_reviews")
    op.drop_index("ix_seller_reviews_order_id", table_name="seller_reviews")
    op.drop_index("ix_seller_reviews_consumer_id", table_name="seller_reviews")
    op.drop_index("ix_seller_reviews_seller_id", table_name="seller_reviews")
    op.drop_table("seller_reviews")

    op.drop_index("ix_orders_seller_status_created", table_name="orders")

    op.drop_index("ix_food_listings_seller_is_active", table_name="food_listings")
    op.drop_index("ix_food_listings_seller_status", table_name="food_listings")
    op.drop_column("food_listings", "cart_add_count")
    op.drop_column("food_listings", "view_count")
    op.drop_column("food_listings", "seller_status")
    op.drop_column("food_listings", "quantity_sold")
    op.drop_column("food_listings", "total_quantity")
