"""Repository for seller module queries and mutations."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.food import (
    FoodListing,
    Order,
    OrderItem,
    OrderStatus,
    SellerListingStatus,
    SellerNotification,
    SellerNotificationType,
    SellerReview,
)
from app.models.user import User


def _new_id() -> str:
    return str(uuid.uuid4())


class SellerListingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_seller(self, seller_id: str) -> list[FoodListing]:
        result = await self.db.execute(
            select(FoodListing)
            .where(FoodListing.seller_id == seller_id)
            .order_by(desc(FoodListing.created_at))
        )
        return list(result.scalars().all())

    async def get_for_seller(self, seller_id: str, listing_id: str) -> FoodListing | None:
        result = await self.db.execute(
            select(FoodListing).where(
                and_(FoodListing.id == listing_id, FoodListing.seller_id == seller_id)
            )
        )
        return result.scalar_one_or_none()

    async def create(self, payload: dict) -> FoodListing:
        listing = FoodListing(id=_new_id(), **payload)
        self.db.add(listing)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def save(self, listing: FoodListing) -> FoodListing:
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def delete(self, listing: FoodListing) -> None:
        await self.db.delete(listing)
        await self.db.commit()


class SellerOrderRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_seller(
        self,
        seller_id: str,
        *,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Order]:
        stmt = select(Order).where(Order.seller_id == seller_id)
        if status:
            stmt = stmt.where(Order.status == status)
        stmt = stmt.order_by(desc(Order.created_at)).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_for_seller(self, seller_id: str, order_id: str) -> Order | None:
        result = await self.db.execute(
            select(Order).where(and_(Order.id == order_id, Order.seller_id == seller_id))
        )
        return result.scalar_one_or_none()

    async def get_consumer_for_order(self, consumer_id: str) -> User | None:
        return await self.db.get(User, consumer_id)

    async def set_status(
        self,
        order: Order,
        status: OrderStatus,
        cancel_reason: str | None = None,
    ) -> Order:
        order.status = status
        if status == OrderStatus.CANCELLED:
            order.cancel_reason = cancel_reason or order.cancel_reason
        await self.db.commit()
        await self.db.refresh(order)
        return order


class SellerReviewRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_seller(
        self,
        seller_id: str,
        *,
        rating: int | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[SellerReview]:
        stmt = select(SellerReview).where(SellerReview.seller_id == seller_id)
        if rating:
            stmt = stmt.where(SellerReview.rating == rating)
        stmt = stmt.order_by(desc(SellerReview.created_at)).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_for_seller(self, seller_id: str, review_id: str) -> SellerReview | None:
        result = await self.db.execute(
            select(SellerReview).where(
                and_(SellerReview.id == review_id, SellerReview.seller_id == seller_id)
            )
        )
        return result.scalar_one_or_none()

    async def reply(self, review: SellerReview, message: str) -> SellerReview:
        review.seller_reply = message
        review.seller_replied_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(review)
        return review

    async def get_review_stats(self, seller_id: str) -> tuple[float, int]:
        result = await self.db.execute(
            select(func.avg(SellerReview.rating), func.count(SellerReview.id)).where(
                SellerReview.seller_id == seller_id
            )
        )
        avg_rating, total = result.one()
        return float(avg_rating or 0.0), int(total or 0)


class SellerNotificationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_seller(
        self,
        seller_id: str,
        *,
        unread_only: bool = False,
        event_type: SellerNotificationType | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[SellerNotification]:
        stmt = select(SellerNotification).where(SellerNotification.seller_id == seller_id)
        if unread_only:
            stmt = stmt.where(SellerNotification.is_read == False)  # noqa: E712
        if event_type:
            stmt = stmt.where(SellerNotification.event_type == event_type)
        stmt = stmt.order_by(desc(SellerNotification.created_at)).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_for_seller(
        self, seller_id: str, notification_id: str
    ) -> SellerNotification | None:
        result = await self.db.execute(
            select(SellerNotification).where(
                and_(
                    SellerNotification.id == notification_id,
                    SellerNotification.seller_id == seller_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def mark_read(self, notification: SellerNotification) -> SellerNotification:
        notification.is_read = True
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def mark_all_read(self, seller_id: str) -> int:
        rows = await self.db.execute(
            select(SellerNotification).where(
                and_(
                    SellerNotification.seller_id == seller_id,
                    SellerNotification.is_read == False,  # noqa: E712
                )
            )
        )
        notifications = list(rows.scalars().all())
        for notif in notifications:
            notif.is_read = True
        await self.db.commit()
        return len(notifications)

    async def unread_count(self, seller_id: str) -> int:
        result = await self.db.execute(
            select(func.count(SellerNotification.id)).where(
                and_(
                    SellerNotification.seller_id == seller_id,
                    SellerNotification.is_read == False,  # noqa: E712
                )
            )
        )
        return int(result.scalar() or 0)


class SellerAnalyticsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def listing_counts(self, seller_id: str) -> tuple[int, int]:
        result = await self.db.execute(
            select(
                func.count(FoodListing.id),
                func.coalesce(func.sum(FoodListing.quantity_sold), 0),
            ).where(FoodListing.seller_id == seller_id)
        )
        total, sold = result.one()
        return int(total or 0), int(sold or 0)

    async def order_rows(self, seller_id: str) -> list[Order]:
        result = await self.db.execute(
            select(Order).where(Order.seller_id == seller_id).order_by(desc(Order.created_at))
        )
        return list(result.scalars().all())

    async def order_items_for_seller(
        self, seller_id: str
    ) -> list[tuple[str, str, str | None, int, float]]:
        """Return listing aggregate rows: listing_id, title, image, qty_sold, revenue."""
        result = await self.db.execute(
            select(
                OrderItem.food_listing_id,
                OrderItem.listing_title,
                OrderItem.listing_image,
                func.coalesce(func.sum(OrderItem.quantity), 0),
                func.coalesce(func.sum(OrderItem.subtotal), 0),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .where(
                and_(
                    Order.seller_id == seller_id,
                    Order.status.in_(
                        [
                            OrderStatus.CONFIRMED,
                            OrderStatus.PREPARING,
                            OrderStatus.READY_FOR_PICKUP,
                            OrderStatus.COMPLETED,
                        ]
                    ),
                )
            )
            .group_by(OrderItem.food_listing_id, OrderItem.listing_title, OrderItem.listing_image)
            .order_by(desc(func.sum(OrderItem.subtotal)))
            .limit(10)
        )
        return [
            (
                str(row[0] or "unknown"),
                str(row[1] or "Untitled"),
                row[2],
                int(row[3] or 0),
                float(row[4] or 0),
            )
            for row in result.all()
        ]

    async def daily_revenue_last_week(self, seller_id: str) -> list[tuple[str, float, int]]:
        now = datetime.now(timezone.utc)
        start = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self.db.execute(
            select(
                func.date(Order.created_at),
                func.coalesce(func.sum(Order.total_amount), 0),
                func.count(Order.id),
            )
            .where(
                and_(
                    Order.seller_id == seller_id,
                    Order.created_at >= start,
                    Order.status != OrderStatus.CANCELLED,
                )
            )
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
        )
        rows = {str(r[0]): (float(r[1] or 0), int(r[2] or 0)) for r in result.all()}

        output: list[tuple[str, float, int]] = []
        for i in range(7):
            day = (start + timedelta(days=i)).date()
            key = str(day)
            revenue, orders = rows.get(key, (0.0, 0))
            output.append((day.strftime("%a"), revenue, orders))
        return output

    async def weekly_revenue_last_month(self, seller_id: str) -> list[tuple[str, float, int]]:
        now = datetime.now(timezone.utc)
        buckets: list[tuple[datetime, datetime, str]] = []
        for i in range(4):
            end = (now - timedelta(days=i * 7)).replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
            start = (end - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
            label = f"W{4 - i}"
            buckets.append((start, end, label))
        buckets.reverse()

        output: list[tuple[str, float, int]] = []
        for start, end, label in buckets:
            result = await self.db.execute(
                select(
                    func.coalesce(func.sum(Order.total_amount), 0),
                    func.count(Order.id),
                ).where(
                    and_(
                        Order.seller_id == seller_id,
                        Order.created_at >= start,
                        Order.created_at <= end,
                        Order.status != OrderStatus.CANCELLED,
                    )
                )
            )
            revenue, count = result.one()
            output.append((label, float(revenue or 0), int(count or 0)))
        return output
