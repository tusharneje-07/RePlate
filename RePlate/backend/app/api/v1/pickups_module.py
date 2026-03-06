"""Seller pickup verification module router."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_seller
from app.models.user import User
from app.schemas.seller_backend import PickupVerifyIn
from app.services.seller_backend_service import SellerPickupService

router = APIRouter(prefix="/seller-backend/pickups", tags=["seller-pickups"])


class CreatePickupIn(BaseModel):
    order_id: str


@router.post("")
async def create_pickup_code(
    body: CreatePickupIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    data = await SellerPickupService(db).create_order_pickup(current_user.id, body.order_id)
    return {"success": True, "data": data, "message": "Pickup code generated"}


@router.post("/verify")
async def verify_pickup(
    body: PickupVerifyIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    data = await SellerPickupService(db).verify_pickup(
        current_user.id,
        body.pickup_code,
        body.verification_method,
    )
    return {"success": True, "data": data, "message": "Pickup verified"}
