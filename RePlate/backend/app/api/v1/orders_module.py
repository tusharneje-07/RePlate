"""Seller order management module router."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_seller
from app.models.user import User
from app.schemas.seller_backend import OrderStatusUpdateIn
from app.services.seller_backend_service import SellerOrdersService

router = APIRouter(prefix="/seller-backend/orders", tags=["seller-orders"])


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@router.get("")
async def list_orders(
    status_filter: str | None = Query(default=None, alias="status"),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerOrdersService(db)
    rows, total = await service.list_orders(
        current_user.id,
        status_filter=status_filter,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
        limit=limit,
        offset=offset,
    )
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    body: OrderStatusUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    data = await SellerOrdersService(db).update_status(
        current_user.id,
        order_id,
        body.order_status,
        body.cancel_reason,
    )
    return {"success": True, "data": data, "message": "Order status updated"}
