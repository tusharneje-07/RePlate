"""Seller inventory/stock tracking module router."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_seller
from app.models.user import User
from app.schemas.seller_backend import InventoryAdjustIn
from app.services.seller_backend_service import SellerInventoryService

router = APIRouter(prefix="/seller-backend/inventory", tags=["seller-inventory"])


@router.get("/{listing_id}")
async def get_inventory(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    data = await SellerInventoryService(db).get_inventory(current_user.id, listing_id)
    return {"success": True, "data": data}


@router.patch("/{listing_id}")
async def adjust_inventory(
    listing_id: str,
    body: InventoryAdjustIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    data = await SellerInventoryService(db).adjust_inventory(
        current_user.id,
        listing_id,
        body.quantity_delta,
    )
    return {"success": True, "data": data, "message": "Inventory updated"}
