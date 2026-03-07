"""add_password_hash_nullable_workos

Revision ID: 1c6b2b7f3f66
Revises: c1d2e3f4a5b6
Create Date: 2026-03-06 23:24:46.910690

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "1c6b2b7f3f66"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make workos_user_id nullable (was NOT NULL before)
    op.alter_column(
        "users",
        "workos_user_id",
        existing_type=sa.String(128),
        nullable=True,
    )
    # Add password_hash column for local auth
    op.add_column(
        "users",
        sa.Column("password_hash", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "password_hash")
    op.alter_column(
        "users",
        "workos_user_id",
        existing_type=sa.String(128),
        nullable=False,
    )
