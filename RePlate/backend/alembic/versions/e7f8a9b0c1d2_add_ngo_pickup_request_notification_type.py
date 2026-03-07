"""add_ngo_pickup_request_notification_type

Revision ID: e7f8a9b0c1d2
Revises: c1d2e3f4a5b6
Create Date: 2026-03-06 20:05:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE seller_notifications "
        "MODIFY COLUMN event_type "
        "ENUM('new_order','ngo_pickup_request','order_cancelled','pickup_reminder',"
        "'listing_expiry','low_stock','new_review','payment_received','system') NOT NULL"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE seller_notifications "
        "MODIFY COLUMN event_type "
        "ENUM('new_order','order_cancelled','pickup_reminder','listing_expiry',"
        "'low_stock','new_review','payment_received','system') NOT NULL"
    )
