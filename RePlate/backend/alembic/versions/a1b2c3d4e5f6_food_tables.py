"""food_tables

Revision ID: a1b2c3d4e5f6
Revises: cb3101a604ec
Create Date: 2026-03-05 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'cb3101a604ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── food_listings ─────────────────────────────────────────────────────────
    op.create_table('food_listings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('seller_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('images', sa.Text(), nullable=True),
        sa.Column('original_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('discounted_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('discount_percent', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('quantity_available', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('quantity_unit', sa.String(length=50), nullable=False, server_default='item'),
        sa.Column('dietary_tags', sa.Text(), nullable=True),
        sa.Column('allergens', sa.Text(), nullable=True),
        sa.Column('pickup_start', sa.String(length=50), nullable=True),
        sa.Column('pickup_end', sa.String(length=50), nullable=True),
        sa.Column('expires_at', sa.String(length=50), nullable=True),
        sa.Column('co2_saved_per_unit', sa.Numeric(8, 3), nullable=True),
        sa.Column('seller_name', sa.String(length=200), nullable=True),
        sa.Column('seller_address', sa.String(length=500), nullable=True),
        sa.Column('seller_logo_url', sa.Text(), nullable=True),
        sa.Column('seller_distance_km', sa.Numeric(8, 2), nullable=True),
        sa.Column('seller_rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('seller_category', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('review_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_food_listings_seller_id', 'food_listings', ['seller_id'])
    op.create_index('ix_food_listings_category', 'food_listings', ['category'])

    # ── orders ────────────────────────────────────────────────────────────────
    op.create_table('orders',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('consumer_id', sa.String(length=36), nullable=False),
        sa.Column('order_number', sa.String(length=50), nullable=False),
        sa.Column('status', sa.Enum(
            'pending', 'confirmed', 'preparing', 'ready_for_pickup', 'completed', 'cancelled',
            name='order_status'
        ), nullable=False, server_default='pending'),
        sa.Column('total_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('total_savings', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('total_co2_saved', sa.Numeric(8, 3), nullable=False, server_default='0'),
        sa.Column('platform_fee', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('payment_method', sa.String(length=50), nullable=False, server_default='cod'),
        sa.Column('pickup_time', sa.String(length=50), nullable=True),
        sa.Column('pickup_address', sa.String(length=500), nullable=True),
        sa.Column('seller_id', sa.String(length=36), nullable=True),
        sa.Column('seller_name', sa.String(length=200), nullable=True),
        sa.Column('seller_logo_url', sa.Text(), nullable=True),
        sa.Column('seller_address', sa.String(length=500), nullable=True),
        sa.Column('seller_rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('seller_category', sa.String(length=50), nullable=True),
        sa.Column('cancel_reason', sa.Text(), nullable=True),
        sa.Column('qr_code', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['consumer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_orders_consumer_id', 'orders', ['consumer_id'])
    op.create_index('ix_orders_seller_id', 'orders', ['seller_id'])
    op.create_index('ix_orders_status', 'orders', ['status'])
    op.create_index('ix_orders_order_number', 'orders', ['order_number'], unique=True)

    # ── order_items ───────────────────────────────────────────────────────────
    op.create_table('order_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('order_id', sa.String(length=36), nullable=False),
        sa.Column('food_listing_id', sa.String(length=36), nullable=True),
        sa.Column('listing_title', sa.String(length=200), nullable=False),
        sa.Column('listing_image', sa.Text(), nullable=True),
        sa.Column('listing_unit', sa.String(length=50), nullable=False, server_default='item'),
        sa.Column('listing_pickup_start', sa.String(length=50), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('subtotal', sa.Numeric(10, 2), nullable=False),
        sa.Column('co2_saved', sa.Numeric(8, 3), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['food_listing_id'], ['food_listings.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])
    op.create_index('ix_order_items_food_listing_id', 'order_items', ['food_listing_id'])

    # ── favorites ─────────────────────────────────────────────────────────────
    op.create_table('favorites',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('consumer_id', sa.String(length=36), nullable=False),
        sa.Column('favorite_type', sa.Enum('food', 'seller', name='favorite_type'), nullable=False),
        sa.Column('food_listing_id', sa.String(length=36), nullable=True),
        sa.Column('seller_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['consumer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['food_listing_id'], ['food_listings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('consumer_id', 'food_listing_id', name='uq_favorite_food'),
        sa.UniqueConstraint('consumer_id', 'seller_id', name='uq_favorite_seller'),
    )
    op.create_index('ix_favorites_consumer_id', 'favorites', ['consumer_id'])
    op.create_index('ix_favorites_food_listing_id', 'favorites', ['food_listing_id'])
    op.create_index('ix_favorites_seller_id', 'favorites', ['seller_id'])

    # ── impact_stats ──────────────────────────────────────────────────────────
    op.create_table('impact_stats',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('consumer_id', sa.String(length=36), nullable=False),
        sa.Column('total_orders', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_co2_saved', sa.Numeric(10, 3), nullable=False, server_default='0'),
        sa.Column('total_money_saved', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('total_meals_rescued', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_food_weight_saved', sa.Numeric(10, 3), nullable=False, server_default='0'),
        sa.Column('streak', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('level', sa.Enum(
            'seedling', 'sprout', 'sapling', 'tree', 'forest',
            name='impact_level'
        ), nullable=False, server_default='seedling'),
        sa.Column('next_level_progress', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('monthly_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['consumer_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_impact_stats_consumer_id', 'impact_stats', ['consumer_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_impact_stats_consumer_id', table_name='impact_stats')
    op.drop_table('impact_stats')

    op.drop_index('ix_favorites_seller_id', table_name='favorites')
    op.drop_index('ix_favorites_food_listing_id', table_name='favorites')
    op.drop_index('ix_favorites_consumer_id', table_name='favorites')
    op.drop_table('favorites')

    op.drop_index('ix_order_items_food_listing_id', table_name='order_items')
    op.drop_index('ix_order_items_order_id', table_name='order_items')
    op.drop_table('order_items')

    op.drop_index('ix_orders_order_number', table_name='orders')
    op.drop_index('ix_orders_status', table_name='orders')
    op.drop_index('ix_orders_seller_id', table_name='orders')
    op.drop_index('ix_orders_consumer_id', table_name='orders')
    op.drop_table('orders')

    op.drop_index('ix_food_listings_category', table_name='food_listings')
    op.drop_index('ix_food_listings_seller_id', table_name='food_listings')
    op.drop_table('food_listings')

    # Drop enums explicitly (MySQL handles this automatically but being explicit)
    op.execute("DROP TABLE IF EXISTS food_listings")
