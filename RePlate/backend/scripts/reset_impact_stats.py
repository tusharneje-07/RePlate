"""Reset impact stats for consumer@replate.dev to zero.

This script deletes the fake impact stats created by seed.py so that
the consumer's impact metrics will only reflect actual orders placed.

Usage:
    cd backend/
    .venv/bin/python scripts/reset_impact_stats.py
"""

import asyncio
import sys

sys.path.insert(0, ".")  # ensure app is importable

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User
from app.models.food import ImpactStat


async def reset():
    print("🔄 Resetting impact stats for consumer@replate.dev...\n")

    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Find consumer user
        result = await session.execute(select(User).where(User.email == "consumer@replate.dev"))
        consumer = result.scalar_one_or_none()

        if not consumer:
            print("❌ Consumer user not found!")
            return

        print(f"✓ Found consumer: {consumer.email} (ID: {consumer.id})")

        # Delete their impact stats
        result = await session.execute(
            delete(ImpactStat).where(ImpactStat.consumer_id == consumer.id)
        )
        await session.commit()

        deleted_count = result.rowcount
        print(f"✓ Deleted {deleted_count} impact stat record(s)")
        print("\n✅ Reset complete!")
        print("   Impact stats will now be created fresh when orders are placed.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(reset())
