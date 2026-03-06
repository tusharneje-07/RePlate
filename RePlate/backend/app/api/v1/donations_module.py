"""Seller NGO donation request management module router."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_seller
from app.models.user import User
from app.schemas.seller_backend import DonationStatusUpdateIn
from app.services.seller_backend_service import SellerDonationsService

router = APIRouter(prefix="/seller-backend/donations", tags=["seller-donations"])


@router.get("")
async def list_donation_requests(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    rows, total = await SellerDonationsService(db).list_requests(current_user.id, limit, offset)
    return {
        "success": True,
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.patch("/{request_id}/status")
async def update_donation_request_status(
    request_id: str,
    body: DonationStatusUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    data = await SellerDonationsService(db).update_status(
        current_user.id,
        request_id,
        body.approval_status,
    )
    return {"success": True, "data": data, "message": "Donation request updated"}
