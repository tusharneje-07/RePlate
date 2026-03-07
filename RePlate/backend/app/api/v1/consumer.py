"""Consumer backend module — surplus donation endpoints for consumer role."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_consumer
from app.models.food import DonorRole, FoodListing, FoodType, SellerListingStatus
from app.models.user import User

router = APIRouter(prefix="/consumer", tags=["consumer"])


# ── Schemas ────────────────────────────────────────────────────────────────────


class SurplusDonationCreateIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = Field(..., min_length=1, max_length=50)
    food_type: str = "veg"  # "veg" | "nonveg" | "vegan"
    dietary_tags: Optional[list[str]] = None
    quantity_kg: float = Field(..., gt=0)
    servings: Optional[int] = None
    cooked_at: Optional[str] = None
    pickup_start: Optional[str] = None
    pickup_end: Optional[str] = None
    expires_at: Optional[str] = None
    pickup_address: str = Field(..., min_length=1)
    storage_type: Optional[str] = None
    packaging_condition: Optional[str] = None
    images: Optional[list[str]] = None


class SurplusDonationOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: str
    food_type: str
    donor_role: str
    quantity_available: int
    quantity_unit: str
    pickup_start: Optional[str] = None
    pickup_end: Optional[str] = None
    expires_at: Optional[str] = None
    seller_address: Optional[str] = None
    is_active: bool
    is_donation: bool
    created_at: datetime
    images: Optional[list[str]] = None


def _listing_to_out(row: FoodListing) -> SurplusDonationOut:
    images: list[str] | None = None
    if row.images:
        try:
            import json

            parsed = json.loads(row.images)
            if isinstance(parsed, list):
                images = [str(v) for v in parsed if v]
        except Exception:
            images = [row.images]

    return SurplusDonationOut(
        id=row.id,
        title=row.title,
        description=row.description,
        category=row.category,
        food_type=row.food_type.value if hasattr(row.food_type, "value") else str(row.food_type),
        donor_role=row.donor_role.value
        if hasattr(row.donor_role, "value")
        else str(row.donor_role),
        quantity_available=int(row.quantity_available),
        quantity_unit=row.quantity_unit,
        pickup_start=row.pickup_start,
        pickup_end=row.pickup_end,
        expires_at=row.expires_at,
        seller_address=row.seller_address,
        is_active=bool(row.is_active),
        is_donation=bool(row.is_donation),
        created_at=row.created_at,
        images=images,
    )


# ── Geocoding helper ───────────────────────────────────────────────────────────


async def _geocode_address(address: str) -> tuple[float | None, float | None]:
    """Attempt to geocode a free-text address via Nominatim.

    Returns (lat, lng) on success, (None, None) on any failure.
    Never raises — listing creation must never be blocked by geocoding.
    """
    try:
        import httpx

        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": address, "format": "json", "limit": 1, "countrycodes": "in"}
        headers = {"User-Agent": "RePlate/1.0 (food-redistribution-platform)"}
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params, headers=headers)
        if resp.status_code == 200:
            results = resp.json()
            if results:
                return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception:
        pass
    return None, None


# ── Endpoints ──────────────────────────────────────────────────────────────────


@router.post("/surplus-donations", status_code=201)
async def create_surplus_donation(
    body: SurplusDonationCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """Consumer submits a surplus food donation listing visible to NGOs."""
    import json as _json

    # Resolve food_type enum
    try:
        food_type_enum = FoodType(body.food_type.lower())
    except ValueError:
        food_type_enum = FoodType.VEG

    # Build description from structured fields
    desc_parts: list[str] = []
    if body.description:
        desc_parts.append(body.description)
    if body.storage_type:
        desc_parts.append(f"Storage: {body.storage_type}")
    if body.packaging_condition:
        desc_parts.append(f"Packaging: {body.packaging_condition}")
    if body.cooked_at:
        desc_parts.append(f"Cooked at: {body.cooked_at}")
    description = " | ".join(desc_parts) if desc_parts else None

    # Bug 5 fix: also store storage_type and packaging_condition as structured
    # tags so the NGO discover page can render them as filterable badge labels
    # without losing the structured data inside the description blob.
    tag_parts: list[str] = []
    if body.storage_type:
        tag_parts.append(f"storage:{body.storage_type}")
    if body.packaging_condition:
        tag_parts.append(f"packaging:{body.packaging_condition}")
    tags_str = ",".join(tag_parts) if tag_parts else None

    images_json = _json.dumps(body.images) if body.images else None
    dietary_tags_str = ",".join(body.dietary_tags) if body.dietary_tags else None

    quantity = max(1, round(body.quantity_kg))

    # Bug 6 fix: geocode the pickup address so browse_donations() can compute
    # real Haversine distance for consumer listings (seller_lat/lng are already
    # denormalised columns on FoodListing — we just need to populate them).
    geo_lat, geo_lng = await _geocode_address(body.pickup_address)

    listing = FoodListing(
        id=str(uuid.uuid4()),
        seller_id=current_user.id,  # reuse seller_id as generic donor_id
        title=body.title,
        description=description,
        category=body.category,
        food_type=food_type_enum,
        donor_role=DonorRole.CONSUMER,
        is_donation=True,
        original_price=0,
        discounted_price=0,
        discount_percent=0,
        quantity_available=quantity,
        total_quantity=quantity,
        quantity_sold=0,
        quantity_unit="kg",
        dietary_tags=dietary_tags_str,
        pickup_start=body.pickup_start,
        pickup_end=body.pickup_end,
        expires_at=body.expires_at,
        seller_address=body.pickup_address,
        seller_name=f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
        or "Consumer Donor",
        seller_lat=geo_lat,
        seller_lng=geo_lng,
        images=images_json,
        tags=tags_str,
        is_active=True,
        seller_status=SellerListingStatus.ACTIVE,
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)

    return {
        "success": True,
        "data": _listing_to_out(listing),
        "message": "Surplus donation listed successfully",
    }


@router.get("/surplus-donations")
async def list_my_surplus_donations(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """Consumer retrieves their own surplus donation listings."""
    stmt = (
        select(FoodListing)
        .where(
            FoodListing.seller_id == current_user.id,
            FoodListing.is_donation == True,  # noqa: E712
            FoodListing.donor_role == DonorRole.CONSUMER,
            FoodListing.deleted_at.is_(None),
        )
        .order_by(FoodListing.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    return {
        "success": True,
        "data": [_listing_to_out(r) for r in rows],
        "pagination": {"total": len(rows), "limit": limit, "offset": offset},
    }


@router.get("/surplus-donations/{listing_id}")
async def get_surplus_donation(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_consumer),
):
    """Get a single surplus donation listing owned by the consumer."""
    listing = await db.get(FoodListing, listing_id)
    if listing is None or listing.seller_id != current_user.id or not listing.is_donation:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation not found")

    return {"success": True, "data": _listing_to_out(listing)}
