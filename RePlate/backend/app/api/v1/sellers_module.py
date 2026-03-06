"""Seller profile management module router."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_seller
from app.models.user import User
from app.schemas.seller_backend import SellerProfileUpdateIn
from app.services.seller_backend_service import SellerProfileService

router = APIRouter(prefix="/seller-backend/profile", tags=["seller-profile"])


class DocumentUpdateIn(BaseModel):
    fssai_certificate_url: str


@router.get("")
async def get_seller_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    data = await SellerProfileService(db).get_profile(current_user.id)
    return {"success": True, "data": data}


@router.patch("")
async def update_seller_profile(
    body: SellerProfileUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    data = await SellerProfileService(db).update_profile(current_user.id, body)
    return {"success": True, "data": data, "message": "Profile updated"}


@router.patch("/documents/fssai")
async def update_seller_license_document(
    body: DocumentUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerProfileService(db)
    _, profile = await service.repo.get(current_user.id)
    await service.repo.update(profile, {"fssai_certificate_url": body.fssai_certificate_url})
    data = await service.get_profile(current_user.id)
    return {"success": True, "data": data, "message": "FSSAI document updated"}
