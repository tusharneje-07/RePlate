"""Seller listings management module router."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_seller
from app.models.user import User
from app.schemas.seller_backend import ListingCreateIn, ListingUpdateIn
from app.services.seller_backend_service import SellerListingsService

router = APIRouter(prefix="/seller-backend/listings", tags=["seller-listings"])


@router.get("")
async def list_seller_listings(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerListingsService(db)
    rows, total = await service.list_listings(current_user.id, status_filter, limit, offset)
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_seller_listing(
    body: ListingCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    data = await SellerListingsService(db).create_listing(current_user, body)
    return {"success": True, "data": data, "message": "Listing created"}


@router.patch("/{listing_id}")
async def update_seller_listing(
    listing_id: str,
    body: ListingUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    data = await SellerListingsService(db).update_listing(current_user.id, listing_id, body)
    return {"success": True, "data": data, "message": "Listing updated"}


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_seller_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    await SellerListingsService(db).delete_listing(current_user.id, listing_id)


@router.post("/{listing_id}/sold-out")
async def mark_listing_sold_out(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    service = SellerListingsService(db)
    data = await service.update_listing(
        current_user.id,
        listing_id,
        ListingUpdateIn(quantity_available=0, status="sold_out"),
    )
    return {"success": True, "data": data, "message": "Listing marked sold out"}


@router.post("/auto-expire")
async def auto_expire_listings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    changed = await SellerListingsService(db).repo.auto_mark_expired(current_user.id)
    return {"success": True, "data": {"expired_count": changed}}
