"""Food listings API — browse and view individual listings."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_optional_user, get_current_user
from app.models.food import FoodListing
from app.models.user import User
from app.repositories.food_repository import FoodListingRepository, FavoriteRepository
from app.schemas.food import FoodListingOut, SellerSummaryOut, FoodListingCreate

router = APIRouter(prefix="/listings", tags=["listings"])


def _build_listing_out(
    listing: FoodListing,
    favorited_ids: set[str] | None = None,
) -> FoodListingOut:
    """Map ORM model → Pydantic output schema."""
    images: list[str] = []
    if listing.images:
        try:
            images = json.loads(listing.images)
        except Exception:
            images = [listing.images]

    dietary_tags: list[str] = []
    if listing.dietary_tags:
        dietary_tags = [t.strip() for t in listing.dietary_tags.split(",") if t.strip()]

    allergens: list[str] = []
    if listing.allergens:
        allergens = [t.strip() for t in listing.allergens.split(",") if t.strip()]

    seller = SellerSummaryOut(
        id=listing.seller_id,
        name=listing.seller_name or "Unknown Seller",
        logo=listing.seller_logo_url,
        category=listing.seller_category,
        distance=float(listing.seller_distance_km)
        if listing.seller_distance_km is not None
        else None,
        rating=float(listing.seller_rating) if listing.seller_rating is not None else 0.0,
        address=listing.seller_address,
    )

    return FoodListingOut(
        id=listing.id,
        title=listing.title,
        description=listing.description,
        category=listing.category,
        images=images,
        original_price=float(listing.original_price),
        discounted_price=float(listing.discounted_price),
        discount_percent=listing.discount_percent,
        quantity_available=listing.quantity_available,
        quantity_unit=listing.quantity_unit,
        dietary_tags=dietary_tags,
        allergens=allergens,
        pickup_start=listing.pickup_start,
        pickup_end=listing.pickup_end,
        expires_at=listing.expires_at,
        co2_saved_per_unit=float(listing.co2_saved_per_unit)
        if listing.co2_saved_per_unit is not None
        else None,
        is_active=listing.is_active,
        rating=float(listing.rating) if listing.rating is not None else None,
        review_count=listing.review_count,
        seller=seller,
        is_favorited=(listing.id in favorited_ids) if favorited_ids is not None else False,
    )


@router.get("", response_model=list[FoodListingOut])
async def browse_listings(
    category: str | None = Query(None),
    dietary_tags: str | None = Query(None, description="Comma-separated dietary tags"),
    max_price: float | None = Query(None),
    min_discount: int | None = Query(None),
    query: str | None = Query(None),
    sort_by: str | None = Query(None, description="distance|price|discount|rating|expiry"),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius_km: float | None = Query(None, ge=0),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Browse active food listings with optional filters."""
    tag_list = [t.strip() for t in dietary_tags.split(",") if t.strip()] if dietary_tags else None

    listing_repo = FoodListingRepository(db)
    listings = await listing_repo.list_active(
        category=category,
        dietary_tags=tag_list,
        max_price=max_price,
        min_discount=min_discount,
        query=query,
        sort_by=sort_by,
        max_distance_km=radius_km,
        origin_lat=lat,
        origin_lng=lng,
        limit=limit,
        offset=offset,
    )

    # Fetch user's favorited IDs if authenticated
    favorited_ids: set[str] = set()
    if current_user is not None:
        fav_repo = FavoriteRepository(db)
        favorited_ids = await fav_repo.get_favorited_listing_ids(current_user.id)

    return [_build_listing_out(l, favorited_ids) for l in listings]


@router.get("/{listing_id}", response_model=FoodListingOut)
async def get_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Get a single food listing by ID."""
    listing_repo = FoodListingRepository(db)
    listing = await listing_repo.get_by_id(listing_id)
    if listing is None or not listing.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    favorited_ids: set[str] = set()
    if current_user is not None:
        fav_repo = FavoriteRepository(db)
        favorited_ids = await fav_repo.get_favorited_listing_ids(current_user.id)

    return _build_listing_out(listing, favorited_ids)


@router.post("", response_model=FoodListingOut, status_code=status.HTTP_201_CREATED)
async def create_listing(
    data: FoodListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new food listing (seller use)."""
    listing_repo = FoodListingRepository(db)
    listing_data = data.model_dump()
    # Serialize lists to comma-separated / JSON
    listing_data["images"] = json.dumps(listing_data.pop("images", []))
    listing_data["dietary_tags"] = ",".join(listing_data.pop("dietary_tags", []))
    listing_data["allergens"] = ",".join(listing_data.pop("allergens", []))
    listing_data["seller_id"] = current_user.id

    listing = await listing_repo.create(listing_data)
    return _build_listing_out(listing)
