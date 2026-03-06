"""Business logic for seller module APIs."""

from __future__ import annotations

from collections import Counter

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.food import OrderStatus, SellerListingStatus
from app.models.user import User
from app.repositories.seller_repository import (
    SellerAnalyticsRepository,
    SellerListingRepository,
    SellerNotificationRepository,
    SellerOrderRepository,
    SellerReviewRepository,
)


class SellerService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.listings = SellerListingRepository(db)
        self.orders = SellerOrderRepository(db)
        self.reviews = SellerReviewRepository(db)
        self.notifications = SellerNotificationRepository(db)
        self.analytics = SellerAnalyticsRepository(db)

    async def get_analytics(self, seller_id: str) -> dict:
        orders = await self.analytics.order_rows(seller_id)
        daily_revenue = await self.analytics.daily_revenue_last_week(seller_id)
        weekly_revenue = await self.analytics.weekly_revenue_last_month(seller_id)
        top_rows = await self.analytics.order_items_for_seller(seller_id)
        avg_rating, review_count = await self.reviews.get_review_stats(seller_id)
        listing_count, total_units_sold = await self.analytics.listing_counts(seller_id)

        status_counter = Counter(
            (o.status.value if hasattr(o.status, "value") else str(o.status)) for o in orders
        )

        total_revenue = sum(
            float(o.total_amount or 0) for o in orders if o.status != OrderStatus.CANCELLED
        )
        total_orders = len(orders)
        avg_order_value = (total_revenue / total_orders) if total_orders > 0 else 0.0
        unique_customers = len({o.consumer_id for o in orders if o.consumer_id})

        day_values = [value for _, value, _ in daily_revenue]
        revenue_change = 0.0
        if len(day_values) >= 2 and day_values[-2] > 0:
            revenue_change = ((day_values[-1] - day_values[-2]) / day_values[-2]) * 100

        day_orders = [count for _, _, count in daily_revenue]
        orders_change = 0.0
        if len(day_orders) >= 2 and day_orders[-2] > 0:
            orders_change = ((day_orders[-1] - day_orders[-2]) / day_orders[-2]) * 100

        top_listings = [
            {
                "listing_id": listing_id,
                "name": name,
                "image": image,
                "units_sold": qty,
                "revenue": revenue,
                "rating": avg_rating if review_count > 0 else 0.0,
            }
            for listing_id, name, image, qty, revenue in top_rows
        ]

        # Keep categories lightweight by grouping listing title prefixes.
        category_split = []
        if total_revenue > 0:
            category_revenue: Counter[str] = Counter()
            for _, name, _, _, revenue in top_rows:
                bucket = (
                    "Breads"
                    if "bread" in name.lower()
                    else "Pastries"
                    if "pastr" in name.lower() or "croissant" in name.lower()
                    else "Specials"
                )
                category_revenue[bucket] += revenue
            for category, revenue in category_revenue.items():
                category_split.append(
                    {
                        "category": category,
                        "percent": round((revenue / total_revenue) * 100),
                        "revenue": float(revenue),
                    }
                )

        return {
            "total_revenue": round(total_revenue, 2),
            "total_orders": total_orders,
            "avg_order_value": round(avg_order_value, 2),
            "total_customers": unique_customers,
            "revenue_change": round(revenue_change, 1),
            "orders_change": round(orders_change, 1),
            "customers_change": 0.0,
            "total_food_saved_kg": float(total_units_sold),
            "total_co2_prevented_kg": float(total_units_sold) * 1.2,
            "total_meals_served": int(total_units_sold * 4),
            "daily_revenue": [
                {"day": day, "revenue": revenue, "orders": count}
                for day, revenue, count in daily_revenue
            ],
            "weekly_revenue": [
                {"week": week, "revenue": revenue, "orders": count}
                for week, revenue, count in weekly_revenue
            ],
            "order_breakdown": {
                "pending": status_counter.get(OrderStatus.PENDING.value, 0),
                "confirmed": status_counter.get(OrderStatus.CONFIRMED.value, 0),
                "preparing": status_counter.get(OrderStatus.PREPARING.value, 0),
                "ready": status_counter.get(OrderStatus.READY_FOR_PICKUP.value, 0),
                "completed": status_counter.get(OrderStatus.COMPLETED.value, 0),
                "cancelled": status_counter.get(OrderStatus.CANCELLED.value, 0),
            },
            "top_listings": top_listings,
            "category_split": category_split,
            "rating": round(avg_rating, 1),
            "review_count": review_count,
            "listing_count": listing_count,
        }

    @staticmethod
    def infer_listing_status(is_active: bool, quantity_available: int) -> SellerListingStatus:
        if not is_active:
            return SellerListingStatus.PAUSED
        if quantity_available <= 0:
            return SellerListingStatus.SOLD_OUT
        return SellerListingStatus.ACTIVE

    async def get_seller_display_name(self, user: User) -> str:
        if user.seller_profile and user.seller_profile.business_name:
            return user.seller_profile.business_name
        full_name = " ".join(part for part in [user.first_name, user.last_name] if part)
        return full_name.strip() or user.email.split("@")[0]
