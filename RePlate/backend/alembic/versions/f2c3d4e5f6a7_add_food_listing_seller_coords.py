"""add_food_listing_seller_coords

Revision ID: f2c3d4e5f6a7
Revises: f9b0c1d2e3f4
Create Date: 2026-03-06 18:25:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f2c3d4e5f6a7"
down_revision: Union[str, None] = "f9b0c1d2e3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("food_listings", sa.Column("seller_lat", sa.Numeric(10, 7), nullable=True))
    op.add_column("food_listings", sa.Column("seller_lng", sa.Numeric(10, 7), nullable=True))
    op.create_index("ix_food_listings_seller_lat", "food_listings", ["seller_lat"])
    op.create_index("ix_food_listings_seller_lng", "food_listings", ["seller_lng"])


def downgrade() -> None:
    op.drop_index("ix_food_listings_seller_lng", table_name="food_listings")
    op.drop_index("ix_food_listings_seller_lat", table_name="food_listings")
    op.drop_column("food_listings", "seller_lng")
    op.drop_column("food_listings", "seller_lat")
