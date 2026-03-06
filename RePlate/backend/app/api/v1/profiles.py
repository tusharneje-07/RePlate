"""Profile endpoints — create and update role-specific profiles."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import (
    get_current_user,
    require_consumer,
    require_ngo,
    require_seller,
    require_inspector,
)
from app.models.user import User
from app.schemas.user import (
    ConsumerProfileIn,
    ConsumerProfileOut,
    NGOProfileIn,
    NGOProfileOut,
    SellerProfileIn,
    SellerProfileOut,
    InspectorProfileIn,
    InspectorProfileOut,
)
from app.services.profile_service import ProfileService

router = APIRouter(prefix="/profiles", tags=["Profiles"])


# ── Consumer ───────────────────────────────────────────────────────────────────

@router.get("/consumer/me", response_model=ConsumerProfileOut)
async def get_consumer_profile(
    current_user: User = Depends(require_consumer),
    db: AsyncSession = Depends(get_db),
):
    service = ProfileService(db)
    profile = await service.get_or_create_consumer_profile(current_user)
    return profile


@router.patch("/consumer/me", response_model=ConsumerProfileOut)
async def update_consumer_profile(
    body: ConsumerProfileIn,
    current_user: User = Depends(require_consumer),
    db: AsyncSession = Depends(get_db),
):
    service = ProfileService(db)
    profile = await service.update_consumer_profile(
        current_user,
        body.model_dump(exclude_none=True),
    )
    return profile


# ── Seller ─────────────────────────────────────────────────────────────────────

@router.get("/seller/me", response_model=SellerProfileOut)
async def get_seller_profile(
    current_user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    service = ProfileService(db)
    profile = await service.get_or_create_seller_profile(current_user)
    return profile


@router.patch("/seller/me", response_model=SellerProfileOut)
async def update_seller_profile(
    body: SellerProfileIn,
    current_user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    service = ProfileService(db)
    profile = await service.update_seller_profile(
        current_user,
        body.model_dump(exclude_none=True),
    )
    return profile


# ── NGO ────────────────────────────────────────────────────────────────────────

@router.get("/ngo/me", response_model=NGOProfileOut)
async def get_ngo_profile(
    current_user: User = Depends(require_ngo),
    db: AsyncSession = Depends(get_db),
):
    service = ProfileService(db)
    profile = await service.get_or_create_ngo_profile(current_user)
    return profile


@router.patch("/ngo/me", response_model=NGOProfileOut)
async def update_ngo_profile(
    body: NGOProfileIn,
    current_user: User = Depends(require_ngo),
    db: AsyncSession = Depends(get_db),
):
    service = ProfileService(db)
    profile = await service.update_ngo_profile(
        current_user,
        body.model_dump(exclude_none=True),
    )
    return profile


# ── Inspector (self-view/update) ───────────────────────────────────────────────

@router.get("/inspector/me", response_model=InspectorProfileOut)
async def get_inspector_profile(
    current_user: User = Depends(require_inspector),
    db: AsyncSession = Depends(get_db),
):
    service = ProfileService(db)
    profile = await service.get_inspector_profile(current_user)
    if profile is None:
        raise HTTPException(status_code=404, detail="Inspector profile not found")
    return profile


@router.patch("/inspector/me", response_model=InspectorProfileOut)
async def update_inspector_profile(
    body: InspectorProfileIn,
    current_user: User = Depends(require_inspector),
    db: AsyncSession = Depends(get_db),
):
    service = ProfileService(db)
    profile = await service.update_inspector_profile(
        current_user,
        body.model_dump(exclude_none=True),
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Inspector profile not found")
    return profile
