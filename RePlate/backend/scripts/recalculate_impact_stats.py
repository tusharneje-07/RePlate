"""
Recalculate impact stats from existing orders.
This script rebuilds the impact_stats table based on actual order data.
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import get_db
from app.models.food import ImpactStat
from app.core.impact_constants import CO2_PER_KG_FOOD
from sqlalchemy import text


async def recalculate_impact_stats():
    """Recalculate impact stats for all users based on their completed orders."""
    db = await anext(get_db())

    try:
        print("🔍 Fetching all completed orders...")

        # Get all users who have completed orders
        query = text("""
            SELECT 
                o.consumer_id,
                COUNT(*) as total_orders,
                SUM(o.total_price) as total_money_saved,
                SUM(o.total_price) as total_meals_rescued,
                SUM(
                    CASE 
                        WHEN fl.co2_saved_per_unit IS NOT NULL 
                        THEN fl.co2_saved_per_unit * oi.quantity
                        ELSE (0.5 * oi.quantity * 2.5)
                    END
                ) as total_co2_saved,
                DATE_FORMAT(o.created_at, '%Y-%m') as order_month
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN food_listings fl ON oi.food_item_id = fl.id
            WHERE o.status = 'completed'
            GROUP BY o.consumer_id, DATE_FORMAT(o.created_at, '%Y-%m')
        """)

        result = await db.execute(query)
        monthly_data = result.fetchall()

        if not monthly_data:
            print("✅ No completed orders found. Nothing to recalculate.")
            return

        print(f"📊 Found orders from {len(monthly_data)} user-month combinations")

        # Group by consumer_id
        user_stats = {}
        for row in monthly_data:
            consumer_id = row[0]
            if consumer_id not in user_stats:
                user_stats[consumer_id] = {
                    "total_orders": 0,
                    "total_money_saved": Decimal("0"),
                    "total_meals_rescued": 0,
                    "total_co2_saved": Decimal("0"),
                    "monthly": [],
                }

            user_stats[consumer_id]["total_orders"] += row[1]
            user_stats[consumer_id]["total_money_saved"] += row[2] or Decimal("0")
            user_stats[consumer_id]["total_meals_rescued"] += row[3] or 0
            user_stats[consumer_id]["total_co2_saved"] += row[4] or Decimal("0")
            user_stats[consumer_id]["monthly"].append(
                {
                    "month": row[5],
                    "orders": row[1],
                    "co2": row[4] or Decimal("0"),
                    "money": row[2] or Decimal("0"),
                }
            )

        # Delete existing impact stats
        print("🗑️  Deleting old impact stats...")
        await db.execute(text("DELETE FROM impact_stats"))

        # Create new impact stats for each user
        for consumer_id, stats in user_stats.items():
            print(f"\n👤 Creating impact stats for user {consumer_id}:")
            print(f"   Orders: {stats['total_orders']}")
            print(f"   CO₂ Saved: {stats['total_co2_saved']:.2f} kg")
            print(f"   Money Saved: ₹{stats['total_money_saved']:.2f}")
            print(f"   Monthly data: {len(stats['monthly'])} months")

            # Create the impact stat record
            insert_query = text("""
                INSERT INTO impact_stats (
                    consumer_id,
                    total_orders,
                    total_co2_saved,
                    total_money_saved,
                    total_meals_rescued,
                    monthly_data,
                    created_at,
                    updated_at
                ) VALUES (
                    :consumer_id,
                    :total_orders,
                    :total_co2_saved,
                    :total_money_saved,
                    :total_meals_rescued,
                    :monthly_data,
                    :created_at,
                    :updated_at
                )
            """)

            # Format monthly data as JSON
            import json

            monthly_json = json.dumps(
                [
                    {
                        "month": m["month"],
                        "orders": m["orders"],
                        "co2_saved": float(m["co2"]),
                        "money_saved": float(m["money"]),
                    }
                    for m in stats["monthly"]
                ]
            )

            now = datetime.utcnow()
            await db.execute(
                insert_query,
                {
                    "consumer_id": consumer_id,
                    "total_orders": stats["total_orders"],
                    "total_co2_saved": float(stats["total_co2_saved"]),
                    "total_money_saved": float(stats["total_money_saved"]),
                    "total_meals_rescued": stats["total_meals_rescued"],
                    "monthly_data": monthly_json,
                    "created_at": now,
                    "updated_at": now,
                },
            )

        await db.commit()
        print(f"\n✅ Successfully recalculated impact stats for {len(user_stats)} users!")

    except Exception as e:
        await db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        await db.close()


if __name__ == "__main__":
    print("🔄 Starting impact stats recalculation...\n")
    asyncio.run(recalculate_impact_stats())
    print("\n🎉 Done!")
