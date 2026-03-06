"""seller_profile_extended_fields

Adds geo coordinates, operating hours, compliance document URLs, GST,
cover image, and bank/IFSC columns to seller_profiles.

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-03-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Geo coordinates ───────────────────────────────────────────────────────
    op.add_column('seller_profiles', sa.Column('lat', sa.Numeric(10, 7), nullable=True))
    op.add_column('seller_profiles', sa.Column('lng', sa.Numeric(10, 7), nullable=True))

    # ── Operating hours ───────────────────────────────────────────────────────
    op.add_column('seller_profiles', sa.Column('open_time', sa.String(8), nullable=True))
    op.add_column('seller_profiles', sa.Column('close_time', sa.String(8), nullable=True))
    # JSON array of day names, e.g. '["Sunday", "Monday"]'
    op.add_column('seller_profiles', sa.Column('closed_days', sa.Text(), nullable=True))

    # ── Compliance ────────────────────────────────────────────────────────────
    op.add_column('seller_profiles', sa.Column('gst_number', sa.String(50), nullable=True))
    op.add_column('seller_profiles', sa.Column('fssai_certificate_url', sa.Text(), nullable=True))
    op.add_column('seller_profiles', sa.Column('bank_statement_url', sa.Text(), nullable=True))

    # ── Media ─────────────────────────────────────────────────────────────────
    op.add_column('seller_profiles', sa.Column('cover_image_url', sa.Text(), nullable=True))

    # ── Bank / payout ─────────────────────────────────────────────────────────
    # Store masked/hashed in production; plain text acceptable for dev MVP.
    op.add_column('seller_profiles', sa.Column('bank_account', sa.String(50), nullable=True))
    op.add_column('seller_profiles', sa.Column('ifsc', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('seller_profiles', 'ifsc')
    op.drop_column('seller_profiles', 'bank_account')
    op.drop_column('seller_profiles', 'cover_image_url')
    op.drop_column('seller_profiles', 'bank_statement_url')
    op.drop_column('seller_profiles', 'fssai_certificate_url')
    op.drop_column('seller_profiles', 'gst_number')
    op.drop_column('seller_profiles', 'closed_days')
    op.drop_column('seller_profiles', 'close_time')
    op.drop_column('seller_profiles', 'open_time')
    op.drop_column('seller_profiles', 'lng')
    op.drop_column('seller_profiles', 'lat')
