"""merge_donor_role_and_password_hash

Revision ID: cd9d50548025
Revises: 1c6b2b7f3f66, a2b3c4d5e6f7
Create Date: 2026-03-07 10:36:20.303733

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cd9d50548025'
down_revision: Union[str, None] = ('1c6b2b7f3f66', 'a2b3c4d5e6f7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
