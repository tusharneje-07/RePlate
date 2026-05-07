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
    # seller_lat and seller_lng are already added by f9b0c1d2e3f4 (inspector_backend_tables).
    # This migration is a no-op kept for Alembic chain integrity.
    pass


def downgrade() -> None:
    pass
