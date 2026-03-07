"""AI Features Router — /api/v1/ai/*

Exposes all five RePlate AI agents as FastAPI endpoints.

Endpoints:
  POST /ai/pricing/{food_id}          — Smart dynamic pricing (Seller)
  GET  /ai/ngo-match                  — NGO-to-donation smart matching (NGO)
  POST /ai/safety/triage              — Complaint triage (Inspector/Admin)
  GET  /ai/safety/score/{listing_id}  — Food listing safety score (Inspector/Admin)
  GET  /ai/recommendations            — Personalised food picks (Consumer)
  GET  /ai/forecast                   — Demand forecast & waste alerts (Seller)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import (
    get_current_user,
    require_consumer,
    require_inspector_or_admin,
    require_ngo,
    require_seller,
)
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["AI Features"])


# ── 1. Smart Pricing ──────────────────────────────────────────────────────────


class PricingRequest(BaseModel):
    lat: float = Field(19.076, description="Seller latitude for weather context")
    lon: float = Field(72.877, description="Seller longitude for weather context")
    auto_apply: bool = Field(False, description="Automatically update the listing price")


@router.post(
    "/pricing/{food_id}",
    summary="AI Smart Pricing",
    description=(
        "Generate an AI-powered dynamic pricing strategy for a food listing "
        "based on expiry countdown, weather, order velocity, and demand signals. "
        "Pass auto_apply=true to immediately update the listing price."
    ),
)
async def ai_pricing(
    food_id: str,
    body: PricingRequest,
    seller: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    try:
        from agent_systems.smart_pricing_agent import generate_pricing_strategy

        strategy = await generate_pricing_strategy(
            db,
            food_id,
            lat=body.lat,
            lon=body.lon,
            auto_apply=body.auto_apply,
        )
        return {"success": True, "data": strategy}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pricing agent error: {exc}",
        )


# ── 2. NGO Smart Match ────────────────────────────────────────────────────────


@router.get(
    "/ngo-match",
    summary="AI NGO-Donation Matching",
    description=(
        "Use AI to match the authenticated NGO to the most suitable food donations "
        "currently available within the specified radius. Returns ranked matches "
        "with urgency scores and an optimal pickup sequence."
    ),
)
async def ai_ngo_match(
    radius_km: float = Query(50.0, ge=1.0, le=200.0, description="Search radius in km"),
    ngo: User = Depends(require_ngo),
    db: AsyncSession = Depends(get_db),
):
    try:
        from agent_systems.ngo_matching_agent import match_ngo_to_donations

        result = await match_ngo_to_donations(db, ngo.id, radius_km=radius_km)
        return {"success": True, "data": result}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"NGO matching agent error: {exc}",
        )


# ── 3. Food Safety — Complaint Triage ─────────────────────────────────────────


class ComplaintTriageRequest(BaseModel):
    complaint_text: str = Field(..., min_length=10, description="Full complaint description")
    complaint_type: str = Field(
        ..., description="One of: food_quality, hygiene, misleading_info, other"
    )
    listing_title: str = Field("", description="Title of the food listing (optional)")
    seller_name: str = Field("", description="Seller business name (optional)")
    previous_violations: int = Field(
        0, ge=0, description="Number of past violations by this seller"
    )


@router.post(
    "/safety/triage",
    summary="AI Complaint Triage",
    description=(
        "Use AI to triage a food safety complaint. Returns a severity score (0-10), "
        "urgency level, recommended action, extracted safety signals, and "
        "a flag indicating if automatic listing suspension is warranted."
    ),
)
async def ai_complaint_triage(
    body: ComplaintTriageRequest,
    inspector: User = Depends(require_inspector_or_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        from agent_systems.food_safety_agent import triage_complaint

        result = await triage_complaint(
            body.complaint_text,
            body.complaint_type,
            listing_title=body.listing_title,
            seller_name=body.seller_name,
            previous_violations=body.previous_violations,
        )
        return {"success": True, "data": result}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Safety triage agent error: {exc}",
        )


# ── 4. Food Safety — Listing Safety Score ─────────────────────────────────────


@router.get(
    "/safety/score/{listing_id}",
    summary="AI Food Listing Safety Score",
    description=(
        "Score the safety profile of a food listing (0-100, where 100 = perfectly safe). "
        "Considers expiry, complaint history, seller violation history, and description quality."
    ),
)
async def ai_safety_score(
    listing_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        from agent_systems.food_safety_agent import score_food_listing_safety

        result = await score_food_listing_safety(listing_id, db)
        if "error" in result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Safety scoring agent error: {exc}",
        )


# ── 5. Consumer Recommendations ───────────────────────────────────────────────


@router.get(
    "/recommendations",
    summary="AI Personalised Food Recommendations",
    description=(
        "Generate AI-personalised food recommendations for the authenticated consumer "
        "based on their order history, dietary preferences, and sustainability impact. "
        "Returns ranked picks with match reasons plus a sustainability tip."
    ),
)
async def ai_recommendations(
    lat: float = Query(0.0, description="Consumer latitude (optional)"),
    lon: float = Query(0.0, description="Consumer longitude (optional)"),
    limit: int = Query(6, ge=1, le=20, description="Number of recommendations to return"),
    consumer: User = Depends(require_consumer),
    db: AsyncSession = Depends(get_db),
):
    try:
        from agent_systems.consumer_recommendation_agent import get_personalised_recommendations

        result = await get_personalised_recommendations(
            db, consumer.id, consumer_lat=lat, consumer_lon=lon, limit=limit
        )
        return {"success": True, "data": result}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recommendation agent error: {exc}",
        )


# ── 6. Demand Forecast ────────────────────────────────────────────────────────


@router.get(
    "/forecast",
    summary="AI Demand Forecast & Waste Alerts",
    description=(
        "Generate an AI-powered demand forecast for the authenticated seller. "
        "Returns peak demand hours, optimal listing times, top-selling categories, "
        "restock recommendations, and waste risk alerts for expiring inventory."
    ),
)
async def ai_demand_forecast(
    seller: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    try:
        from agent_systems.demand_forecast_agent import generate_demand_forecast

        result = await generate_demand_forecast(db, seller.id)
        return {"success": True, "data": result}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demand forecast agent error: {exc}",
        )


# ── 7. AI Health Check ────────────────────────────────────────────────────────


@router.get(
    "/health",
    summary="AI System Health",
    description="Check if the Groq AI backend is reachable and the API key is configured.",
)
async def ai_health(user: User = Depends(get_current_user)):
    from app.core.config import settings

    configured = bool(settings.GROQ_API_KEY)
    return {
        "success": True,
        "data": {
            "groq_configured": configured,
            "model": settings.GROQ_MODEL,
            "agents": [
                "SmartPricingAgent",
                "NGOMatchingAgent",
                "FoodSafetyAgent",
                "ConsumerRecommendationAgent",
                "DemandForecastAgent",
            ],
        },
    }
