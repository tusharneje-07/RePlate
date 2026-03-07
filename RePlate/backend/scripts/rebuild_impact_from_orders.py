"""
Rebuild impact stats from existing completed orders.
This is a simple SQL-based approach that doesn't rely on complex ORM queries.
"""

import asyncio
import sys
from pathlib import Path
import json
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal


async def rebuild_impact_stats():
    """Rebuild impact stats for each consumer based on their completed orders."""
    async with AsyncSessionLocal() as db:
        try:
            print("🔍 Finding all consumers with completed orders...")

            # Get list of consumers with completed orders
            result = await db.execute(
                text("""
                SELECT DISTINCT consumer_id
                FROM orders
                WHERE status = 'completed'
            """)
            )
            consumer_ids = [row[0] for row in result.fetchall()]

            if not consumer_ids:
                print("✅ No completed orders found.")
                return

            print(f"📊 Found {len(consumer_ids)} consumers with completed orders")

            # Delete all existing impact stats
            print("🗑️  Deleting old impact stats...")
            await db.execute(text("DELETE FROM impact_stats"))

            # For each consumer, calculate their total impact
            for consumer_id in consumer_ids:
                # Get aggregate stats for this consumer
                result = await db.execute(
                    text("""
                    SELECT 
                        COUNT(DISTINCT o.id) as total_orders,
                        SUM(o.total_amount) as total_amount,
                        SUM(o.total_savings) as total_savings,
                        SUM(o.total_co2_saved) as total_co2
                    FROM orders o
                    WHERE o.consumer_id = :consumer_id
                      AND o.status = 'completed'
                """),
                    {"consumer_id": consumer_id},
                )

                row = result.fetchone()
                total_orders = row[0] or 0
                total_amount = float(row[1] or 0)
                total_savings = float(row[2] or 0)
                total_co2 = float(row[3] or 0)

                print(f"\n👤 Consumer {consumer_id[:8]}:")
                print(f"   Orders: {total_orders}")
                print(f"   Amount: ₹{total_amount:.2f}")
                print(f"   Savings: ₹{total_savings:.2f}")
                print(f"   CO₂: {total_co2:.3f} kg")

                # Calculate level and progress
                if total_orders < 5:
                    level = "seedling"
                    progress = int((total_orders / 5) * 100)
                elif total_orders < 15:
                    level = "sprout"
                    progress = int(((total_orders - 5) / 10) * 100)
                elif total_orders < 30:
                    level = "sapling"
                    progress = int(((total_orders - 15) / 15) * 100)
                elif total_orders < 60:
                    level = "tree"
                    progress = int(((total_orders - 30) / 30) * 100)
                else:
                    level = "forest"
                    progress = 100

                # Get monthly breakdown
                result = await db.execute(
                    text("""
                    SELECT 
                        DATE_FORMAT(o.created_at, '%%b') as month,
                        COUNT(DISTINCT o.id) as orders_count,
                        SUM(o.total_co2_saved) as co2_saved,
                        SUM(o.total_savings) as money_saved
                    FROM orders o
                    WHERE o.consumer_id = :consumer_id
                      AND o.status = 'completed'
                    GROUP BY DATE_FORMAT(o.created_at, '%%Y-%%m'), DATE_FORMAT(o.created_at, '%%b')
                    ORDER BY MAX(o.created_at) DESC
                    LIMIT 7
                """),
                    {"consumer_id": consumer_id},
                )

                monthly = []
                for mrow in result.fetchall():
                    monthly.append(
                        {
                            "month": mrow[0],
                            "orders_count": mrow[1] or 0,
                            "co2_saved": float(mrow[2] or 0),
                            "money_saved": float(mrow[3] or 0),
                            "food_weight_saved": 0.5 * (mrow[1] or 0),  # Estimate
                        }
                    )

                monthly_json = json.dumps(monthly)

                # Insert the impact stat
                from uuid import uuid4

                impact_id = str(uuid4())

                await db.execute(
                    text("""
                    INSERT INTO impact_stats (
                        id,
                        consumer_id,
                        total_orders,
                        total_co2_saved,
                        total_money_saved,
                        total_meals_rescued,
                        total_food_weight_saved,
                        level,
                        next_level_progress,
                        streak,
                        monthly_data,
                        created_at,
                        updated_at
                    ) VALUES (
                        :id,
                        :consumer_id,
                        :total_orders,
                        :total_co2_saved,
                        :total_money_saved,
                        :total_meals_rescued,
                        :total_food_weight_saved,
                        :level,
                        :next_level_progress,
                        :streak,
                        :monthly_data,
                        NOW(),
                        NOW()
                    )
                """),
                    {
                        "id": impact_id,
                        "consumer_id": consumer_id,
                        "total_orders": total_orders,
                        "total_co2_saved": total_co2,
                        "total_money_saved": total_savings,
                        "total_meals_rescued": total_orders,  # Assume 1 meal per order
                        "total_food_weight_saved": 0.5 * total_orders,  # Estimate 0.5kg per order
                        "level": level,
                        "next_level_progress": progress,
                        "streak": 0,  # Reset streak
                        "monthly_data": monthly_json,
                    },
                )

            await db.commit()
            print(f"\n✅ Successfully rebuilt impact stats for {len(consumer_ids)} consumers!")

        except Exception as e:
            await db.rollback()
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
            raise


if __name__ == "__main__":
    from sqlalchemy import text

    print("🔄 Rebuilding impact stats from completed orders...\n")
    asyncio.run(rebuild_impact_stats())
    print("\n🎉 Done!")
