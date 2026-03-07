"""add_donor_role_to_food_listing

Revision ID: a2b3c4d5e6f7
Revises: e7f8a9b0c1d2
Create Date: 2026-03-07 00:00:00.000000

Adds a `donor_role` ENUM column to `food_listings` so NGOs can distinguish
between surplus food listed by sellers vs. consumers.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the donor_role enum column with default 'seller' so existing rows are
    # correctly classified as seller-origin donations.
    op.execute(
        "ALTER TABLE food_listings "
        "ADD COLUMN donor_role ENUM('seller', 'consumer') NOT NULL DEFAULT 'seller'"
    )
    op.execute("CREATE INDEX ix_food_listings_donor_role ON food_listings (donor_role)")


def downgrade() -> None:
    op.execute("DROP INDEX ix_food_listings_donor_role ON food_listings")
    op.execute("ALTER TABLE food_listings DROP COLUMN donor_role")
