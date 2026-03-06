"""Seller analytics module router."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_seller
from app.models.user import User
from app.services.seller_backend_service import SellerAnalyticsService

router = APIRouter(prefix="/seller-backend/analytics", tags=["seller-analytics"])


@router.get("")
async def get_seller_analytics(
    range_key: str = Query(default="today", alias="range"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    data = await SellerAnalyticsService(db).get_metrics(current_user.id, range_key)
    return {"success": True, "data": data}
