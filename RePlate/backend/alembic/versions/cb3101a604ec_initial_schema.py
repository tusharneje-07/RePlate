"""initial_schema

Revision ID: cb3101a604ec
Revises: 
Create Date: 2026-03-05 20:31:23.900516

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'cb3101a604ec'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ────────────────────────────────────────────────────────────────
    op.create_table('users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('workos_user_id', sa.String(length=128), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('profile_picture_url', sa.Text(), nullable=True),
        sa.Column('role', sa.Enum('CONSUMER', 'SELLER', 'NGO', 'INSPECTOR', 'ADMIN', name='user_role'), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('is_email_verified', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('is_onboarded', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_workos_user_id', 'users', ['workos_user_id'], unique=True)

    # ── consumer_profiles ────────────────────────────────────────────────────
    op.create_table('consumer_profiles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('address_line1', sa.String(length=255), nullable=True),
        sa.Column('address_line2', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('postal_code', sa.String(length=20), nullable=True),
        sa.Column('country', sa.String(length=2), nullable=False, server_default='IN'),
        sa.Column('dietary_preferences', sa.Text(), nullable=True),
        sa.Column('completion_status', sa.Enum('INCOMPLETE', 'PENDING_REVIEW', 'COMPLETE', name='consumer_profile_status'), nullable=False, server_default='INCOMPLETE'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_consumer_profiles_user_id', 'consumer_profiles', ['user_id'], unique=True)

    # ── seller_profiles ──────────────────────────────────────────────────────
    op.create_table('seller_profiles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('business_name', sa.String(length=200), nullable=True),
        sa.Column('business_type', sa.String(length=100), nullable=True),
        sa.Column('license_number', sa.String(length=100), nullable=True),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('address_line1', sa.String(length=255), nullable=True),
        sa.Column('address_line2', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('postal_code', sa.String(length=20), nullable=True),
        sa.Column('country', sa.String(length=2), nullable=False, server_default='IN'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.Text(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('completion_status', sa.Enum('INCOMPLETE', 'PENDING_REVIEW', 'COMPLETE', name='seller_profile_status'), nullable=False, server_default='INCOMPLETE'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_seller_profiles_user_id', 'seller_profiles', ['user_id'], unique=True)

    # ── ngo_profiles ─────────────────────────────────────────────────────────
    op.create_table('ngo_profiles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('organization_name', sa.String(length=200), nullable=True),
        sa.Column('registration_number', sa.String(length=100), nullable=True),
        sa.Column('mission_statement', sa.Text(), nullable=True),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('address_line1', sa.String(length=255), nullable=True),
        sa.Column('address_line2', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('postal_code', sa.String(length=20), nullable=True),
        sa.Column('country', sa.String(length=2), nullable=False, server_default='IN'),
        sa.Column('serving_capacity', sa.Integer(), nullable=True),
        sa.Column('logo_url', sa.Text(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('completion_status', sa.Enum('INCOMPLETE', 'PENDING_REVIEW', 'COMPLETE', name='ngo_profile_status'), nullable=False, server_default='INCOMPLETE'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ngo_profiles_user_id', 'ngo_profiles', ['user_id'], unique=True)

    # ── inspector_profiles ───────────────────────────────────────────────────
    op.create_table('inspector_profiles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('badge_number', sa.String(length=50), nullable=True),
        sa.Column('department', sa.String(length=200), nullable=True),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('assigned_region', sa.String(length=200), nullable=True),
        sa.Column('assigned_city', sa.String(length=100), nullable=True),
        sa.Column('government_id', sa.String(length=100), nullable=True),
        sa.Column('is_active_duty', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('completion_status', sa.Enum('INCOMPLETE', 'PENDING_REVIEW', 'COMPLETE', name='inspector_profile_status'), nullable=False, server_default='INCOMPLETE'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_inspector_profiles_user_id', 'inspector_profiles', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_inspector_profiles_user_id', table_name='inspector_profiles')
    op.drop_table('inspector_profiles')
    op.drop_index('ix_ngo_profiles_user_id', table_name='ngo_profiles')
    op.drop_table('ngo_profiles')
    op.drop_index('ix_seller_profiles_user_id', table_name='seller_profiles')
    op.drop_table('seller_profiles')
    op.drop_index('ix_consumer_profiles_user_id', table_name='consumer_profiles')
    op.drop_table('consumer_profiles')
    op.drop_index('ix_users_workos_user_id', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
