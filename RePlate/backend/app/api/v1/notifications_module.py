"""Seller notification module router."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_seller
from app.models.user import User
from app.services.seller_backend_service import SellerNotificationsService

router = APIRouter(prefix="/seller-backend/notifications", tags=["seller-notifications"])


@router.get("")
async def list_notifications(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    rows, total = await SellerNotificationsService(db).list_notifications(
        current_user.id,
        limit,
        offset,
    )
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }
