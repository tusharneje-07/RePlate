"""Favorites API — add, list, and remove consumer favorites."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_consumer
from app.models.food import FavoriteType
from app.models.user import User
from app.repositories.food_repository import FavoriteRepository, FoodListingRepository
from app.schemas.food import FavoriteOut, AddFavoriteIn, FoodListingOut, SellerSummaryOut

router = APIRouter(prefix="/favorites", tags=["favorites"])


def _listing_to_out(listing, favorited_ids: set[str] | None = None) -> FoodListingOut:
    """Reuse logic from listings module."""
    from app.api.v1.listings import _build_listing_out
    return _build_listing_out(listing, favorited_ids)


@router.get("", response_model=list[FavoriteOut])
async def list_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """Return all favorites for the current consumer."""
    fav_repo = FavoriteRepository(db)
    listing_repo = FoodListingRepository(db)
    favorites = await fav_repo.get_all_for_consumer(current_user.id)
    favorited_ids = await fav_repo.get_favorited_listing_ids(current_user.id)

    result: list[FavoriteOut] = []
    for fav in favorites:
        listing_out = None
        if fav.favorite_type == FavoriteType.FOOD and fav.food_listing_id:
            listing = await listing_repo.get_by_id(fav.food_listing_id)
            if listing and listing.is_active:
                listing_out = _listing_to_out(listing, favorited_ids)

        result.append(
            FavoriteOut(
                id=fav.id,
                favorite_type=fav.favorite_type.value if hasattr(fav.favorite_type, "value") else str(fav.favorite_type),
                food_listing=listing_out,
                seller_id=fav.seller_id,
            )
        )

    return result


@router.post("", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    data: AddFavoriteIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """Add a food listing or seller to favorites."""
    fav_repo = FavoriteRepository(db)

    if data.favorite_type == "food":
        if not data.food_listing_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="food_listing_id required for food favorites",
            )
        existing = await fav_repo.find_food_favorite(current_user.id, data.food_listing_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already favorited",
            )
        fav = await fav_repo.add(
            current_user.id,
            FavoriteType.FOOD,
            food_listing_id=data.food_listing_id,
        )
    elif data.favorite_type == "seller":
        if not data.seller_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="seller_id required for seller favorites",
            )
        existing = await fav_repo.find_seller_favorite(current_user.id, data.seller_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already favorited",
            )
        fav = await fav_repo.add(
            current_user.id,
            FavoriteType.SELLER,
            seller_id=data.seller_id,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="favorite_type must be 'food' or 'seller'",
        )

    return FavoriteOut(
        id=fav.id,
        favorite_type=fav.favorite_type.value if hasattr(fav.favorite_type, "value") else str(fav.favorite_type),
        seller_id=fav.seller_id,
    )


@router.delete("/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    favorite_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """Remove a favorite by its ID."""
    fav_repo = FavoriteRepository(db)
    fav = await fav_repo.get_by_id(favorite_id)
    if fav is None or fav.consumer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found")
    await fav_repo.delete(fav)


@router.delete("/food/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_food_favorite_by_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """Remove a food favorite by listing ID (convenience endpoint)."""
    fav_repo = FavoriteRepository(db)
    fav = await fav_repo.find_food_favorite(current_user.id, listing_id)
    if fav is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found")
    await fav_repo.delete(fav)
