"""Impact stats API — consumer sustainability metrics."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_consumer
from app.models.user import User
from app.repositories.food_repository import ImpactStatRepository
from app.schemas.food import ImpactStatsOut, MonthlyImpactOut

router = APIRouter(prefix="/impact", tags=["impact"])


def _build_impact_out(stat) -> ImpactStatsOut:
    monthly_raw = []
    if stat.monthly_data:
        try:
            monthly_raw = json.loads(stat.monthly_data)
        except Exception:
            monthly_raw = []

    monthly = [
        MonthlyImpactOut(
            month=m.get("month", ""),
            co2_saved=m.get("co2_saved", 0.0),
            money_saved=m.get("money_saved", 0.0),
            orders_count=m.get("orders_count", 0),
            food_weight_saved=m.get("food_weight_saved", 0.0),
        )
        for m in monthly_raw
    ]

    return ImpactStatsOut(
        total_orders=stat.total_orders,
        total_co2_saved=float(stat.total_co2_saved),
        total_money_saved=float(stat.total_money_saved),
        total_meals_rescued=stat.total_meals_rescued,
        total_food_weight_saved=float(stat.total_food_weight_saved),
        streak=stat.streak,
        level=stat.level.value if hasattr(stat.level, "value") else str(stat.level),
        next_level_progress=stat.next_level_progress,
        monthly_data=monthly,
    )


@router.get("/me", response_model=ImpactStatsOut)
async def get_my_impact(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """Get the current consumer's impact statistics."""
    repo = ImpactStatRepository(db)
    stat = await repo.get_or_create(current_user.id)
    return _build_impact_out(stat)
