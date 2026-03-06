"""Repository for food listings, orders, favorites, and impact stats."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.food import (
    FoodListing,
    Order,
    OrderItem,
    Favorite,
    FavoriteType,
    ImpactStat,
    ImpactLevel,
    OrderStatus,
)


def _new_id() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Food Listing Repository ───────────────────────────────────────────────────


class FoodListingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, listing_id: str) -> FoodListing | None:
        return await self.db.get(FoodListing, listing_id)

    async def list_active(
        self,
        *,
        category: str | None = None,
        dietary_tags: list[str] | None = None,
        max_price: float | None = None,
        min_discount: int | None = None,
        query: str | None = None,
        sort_by: str | None = None,
        max_distance_km: float | None = None,
        origin_lat: float | None = None,
        origin_lng: float | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[FoodListing]:
        stmt = select(FoodListing).where(
            FoodListing.is_active == True,  # noqa: E712
            FoodListing.quantity_available > 0,
        )
        distance_expr = None
        if max_distance_km is not None and origin_lat is not None and origin_lng is not None:
            lat_rad = func.radians(origin_lat)
            distance_expr = func.sqrt(
                func.pow((FoodListing.seller_lat - origin_lat) * 111.0, 2)
                + func.pow(
                    (FoodListing.seller_lng - origin_lng) * (111.0 * func.cos(lat_rad)),
                    2,
                )
            )
            stmt = stmt.where(
                FoodListing.seller_lat.isnot(None), FoodListing.seller_lng.isnot(None)
            )
            stmt = stmt.where(distance_expr <= max_distance_km)
        if category:
            stmt = stmt.where(FoodListing.category == category)
        if max_price is not None:
            stmt = stmt.where(FoodListing.discounted_price <= max_price)
        if min_discount is not None:
            stmt = stmt.where(FoodListing.discount_percent >= min_discount)
        if query:
            q = f"%{query}%"
            stmt = stmt.where(
                or_(
                    FoodListing.title.ilike(q),
                    FoodListing.description.ilike(q),
                    FoodListing.seller_name.ilike(q),
                )
            )
        if sort_by == "price":
            stmt = stmt.order_by(FoodListing.discounted_price)
        elif sort_by == "discount":
            stmt = stmt.order_by(FoodListing.discount_percent.desc())
        elif sort_by == "rating":
            stmt = stmt.order_by(FoodListing.rating.desc().nullslast())
        elif sort_by == "distance":
            if distance_expr is not None:
                stmt = stmt.order_by(distance_expr.asc())
            else:
                stmt = stmt.order_by(FoodListing.seller_distance_km.asc().nullslast())
        else:
            stmt = stmt.order_by(FoodListing.created_at.desc())

        stmt = stmt.offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        listings = list(result.scalars().all())

        # Post-filter by dietary tags (comma-separated in DB)
        if dietary_tags:
            filtered = []
            for listing in listings:
                if listing.dietary_tags:
                    tags = [t.strip() for t in listing.dietary_tags.split(",")]
                    if any(dt in tags for dt in dietary_tags):
                        filtered.append(listing)
            return filtered
        return listings

    async def create(self, data: dict) -> FoodListing:
        listing = FoodListing(id=_new_id(), **data)
        self.db.add(listing)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing


# ── Order Repository ──────────────────────────────────────────────────────────


class OrderRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, order_id: str) -> Order | None:
        return await self.db.get(Order, order_id)

    async def get_by_id_and_consumer(self, order_id: str, consumer_id: str) -> Order | None:
        result = await self.db.execute(
            select(Order).where(and_(Order.id == order_id, Order.consumer_id == consumer_id))
        )
        return result.scalar_one_or_none()

    async def list_for_consumer(
        self,
        consumer_id: str,
        *,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Order]:
        stmt = select(Order).where(Order.consumer_id == consumer_id)
        if status:
            stmt = stmt.where(Order.status == status)
        stmt = stmt.order_by(Order.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: dict, items_data: list[dict]) -> Order:
        async with self.db.begin():
            order = Order(id=_new_id(), **data)
            self.db.add(order)
            await self.db.flush()  # get order.id

            for item_data in items_data:
                item = OrderItem(id=_new_id(), order_id=order.id, **item_data)
                self.db.add(item)

        await self.db.refresh(order)
        return order

    async def generate_order_number(self) -> str:
        from datetime import date

        today = date.today().strftime("%Y%m%d")
        # Count orders today for a sequence number
        result = await self.db.execute(
            select(Order).where(Order.order_number.like(f"RPL-{today}-%"))
        )
        count = len(list(result.scalars().all()))
        return f"RPL-{today}-{count + 1:03d}"


# ── Favorite Repository ────────────────────────────────────────────────────────


class FavoriteRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_food_favorites(self, consumer_id: str) -> list[Favorite]:
        result = await self.db.execute(
            select(Favorite).where(
                and_(
                    Favorite.consumer_id == consumer_id,
                    Favorite.favorite_type == FavoriteType.FOOD,
                )
            )
        )
        return list(result.scalars().all())

    async def get_seller_favorites(self, consumer_id: str) -> list[Favorite]:
        result = await self.db.execute(
            select(Favorite).where(
                and_(
                    Favorite.consumer_id == consumer_id,
                    Favorite.favorite_type == FavoriteType.SELLER,
                )
            )
        )
        return list(result.scalars().all())

    async def get_all_for_consumer(self, consumer_id: str) -> list[Favorite]:
        result = await self.db.execute(select(Favorite).where(Favorite.consumer_id == consumer_id))
        return list(result.scalars().all())

    async def find_food_favorite(self, consumer_id: str, food_listing_id: str) -> Favorite | None:
        result = await self.db.execute(
            select(Favorite).where(
                and_(
                    Favorite.consumer_id == consumer_id,
                    Favorite.food_listing_id == food_listing_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def find_seller_favorite(self, consumer_id: str, seller_id: str) -> Favorite | None:
        result = await self.db.execute(
            select(Favorite).where(
                and_(
                    Favorite.consumer_id == consumer_id,
                    Favorite.seller_id == seller_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, favorite_id: str) -> Favorite | None:
        return await self.db.get(Favorite, favorite_id)

    async def get_favorited_listing_ids(self, consumer_id: str) -> set[str]:
        result = await self.db.execute(
            select(Favorite.food_listing_id).where(
                and_(
                    Favorite.consumer_id == consumer_id,
                    Favorite.favorite_type == FavoriteType.FOOD,
                    Favorite.food_listing_id.isnot(None),
                )
            )
        )
        return {row for row in result.scalars().all() if row}

    async def add(self, consumer_id: str, favorite_type: FavoriteType, **kwargs) -> Favorite:
        fav = Favorite(
            id=_new_id(),
            consumer_id=consumer_id,
            favorite_type=favorite_type,
            **kwargs,
        )
        self.db.add(fav)
        await self.db.commit()
        await self.db.refresh(fav)
        return fav

    async def delete(self, favorite: Favorite) -> None:
        await self.db.delete(favorite)
        await self.db.commit()


# ── Impact Stat Repository ────────────────────────────────────────────────────


class ImpactStatRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_consumer(self, consumer_id: str) -> ImpactStat | None:
        result = await self.db.execute(
            select(ImpactStat).where(ImpactStat.consumer_id == consumer_id)
        )
        return result.scalar_one_or_none()

    async def get_or_create(self, consumer_id: str) -> ImpactStat:
        stat = await self.get_by_consumer(consumer_id)
        if stat is None:
            stat = ImpactStat(
                id=_new_id(),
                consumer_id=consumer_id,
                monthly_data=json.dumps([]),
            )
            self.db.add(stat)
            await self.db.commit()
            await self.db.refresh(stat)
        return stat

    async def update_after_order(
        self,
        consumer_id: str,
        order_amount: float,
        savings: float,
        co2_saved: float,
        meals_rescued: int = 1,
        food_weight_kg: float = 0.5,
    ) -> ImpactStat:
        stat = await self.get_or_create(consumer_id)

        stat.total_orders += 1
        stat.total_money_saved = float(stat.total_money_saved) + savings
        stat.total_co2_saved = float(stat.total_co2_saved) + co2_saved
        stat.total_meals_rescued += meals_rescued
        stat.total_food_weight_saved = float(stat.total_food_weight_saved) + food_weight_kg

        # Update streak (simple: just increment — a real impl would check dates)
        stat.streak += 1

        # Compute level based on total orders
        total = stat.total_orders
        if total < 5:
            stat.level = ImpactLevel.SEEDLING
            stat.next_level_progress = int((total / 5) * 100)
        elif total < 15:
            stat.level = ImpactLevel.SPROUT
            stat.next_level_progress = int(((total - 5) / 10) * 100)
        elif total < 30:
            stat.level = ImpactLevel.SAPLING
            stat.next_level_progress = int(((total - 15) / 15) * 100)
        elif total < 60:
            stat.level = ImpactLevel.TREE
            stat.next_level_progress = int(((total - 30) / 30) * 100)
        else:
            stat.level = ImpactLevel.FOREST
            stat.next_level_progress = 100

        # Update monthly data
        from datetime import date

        month_label = date.today().strftime("%b")
        monthly = json.loads(stat.monthly_data or "[]")
        # Find or create entry for this month
        entry = next((m for m in monthly if m.get("month") == month_label), None)
        if entry is None:
            entry = {
                "month": month_label,
                "co2_saved": 0.0,
                "money_saved": 0.0,
                "orders_count": 0,
                "food_weight_saved": 0.0,
            }
            monthly.append(entry)
        entry["co2_saved"] = round(entry["co2_saved"] + co2_saved, 3)
        entry["money_saved"] = round(entry["money_saved"] + savings, 2)
        entry["orders_count"] += 1
        entry["food_weight_saved"] = round(entry["food_weight_saved"] + food_weight_kg, 3)
        # Keep last 7 months
        stat.monthly_data = json.dumps(monthly[-7:])

        await self.db.commit()
        await self.db.refresh(stat)
        return stat
