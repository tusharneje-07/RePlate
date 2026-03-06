"""merge_alembic_heads

Revision ID: c1d2e3f4a5b6
Revises: f2c3d4e5f6a7, 8017926abc6d
Create Date: 2026-03-06 19:10:00.000000

"""

from typing import Sequence, Union


revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = ("f2c3d4e5f6a7", "8017926abc6d")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
