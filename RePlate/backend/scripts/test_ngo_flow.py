"""End-to-end NGO backend flow test (seed + request + pickup + complete)."""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, UTC

sys.path.insert(0, ".")

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.food import FoodListing, FoodType, SellerListingStatus
from app.models.profiles import NGOProfile, ProfileCompletionStatus, SellerProfile
from app.models.user import User, UserRole
from app.schemas.ngo import DonationRequestCreateIn, PickupScheduleIn
from app.services.ngo_service import NGODonationService, NGOPickupService
from app.services.seller_backend_service import SellerDonationsService
from app.repositories.ngo_repository import NGONotificationRepository
from app.repositories.seller_backend_repository import SellerNotificationRepository


SELLER_EMAIL = "ngo_test_seller@replate.dev"
NGO_EMAIL = "ngo_test@replate.dev"
LISTING_TITLE = "NGO Test Donation Box"


def _future(hours: int) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


async def _get_or_create_user(session: AsyncSession, email: str, role: UserRole) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        return user
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        password_hash=None,
        first_name=email.split("@")[0],
        last_name="Test",
        role=role,
        is_email_verified=True,
        is_onboarded=True,
        workos_user_id=None,
    )
    session.add(user)
    await session.flush()
    return user


async def _get_or_create_seller_profile(session: AsyncSession, seller: User) -> None:
    result = await session.execute(select(SellerProfile).where(SellerProfile.user_id == seller.id))
    if result.scalar_one_or_none():
        return
    session.add(
        SellerProfile(
            id=str(uuid.uuid4()),
            user_id=seller.id,
            business_name="NGO Test Seller",
            business_type="Meals",
            city="Ichalkaranji",
            state="MH",
            address_line1="Zenda Chowk",
            postal_code="416115",
            phone_number="+91-9000000000",
            lat=16.6938,
            lng=74.4567,
            completion_status=ProfileCompletionStatus.COMPLETE,
            is_verified=True,
        )
    )


async def _get_or_create_ngo_profile(session: AsyncSession, ngo: User) -> None:
    result = await session.execute(select(NGOProfile).where(NGOProfile.user_id == ngo.id))
    if result.scalar_one_or_none():
        return
    session.add(
        NGOProfile(
            id=str(uuid.uuid4()),
            user_id=ngo.id,
            organization_name="NGO Test",
            city="Ichalkaranji",
            state="MH",
            postal_code="416115",
            lat=16.6922,
            lng=74.4625,
            completion_status=ProfileCompletionStatus.COMPLETE,
            is_verified=True,
        )
    )


async def _get_or_create_donation_listing(session: AsyncSession, seller: User) -> FoodListing:
    result = await session.execute(
        select(FoodListing).where(
            FoodListing.seller_id == seller.id, FoodListing.title == LISTING_TITLE
        )
    )
    listing = result.scalar_one_or_none()
    if listing:
        listing.expires_at = _future(6)
        listing.pickup_start = _future(1)
        listing.pickup_end = _future(4)
        listing.quantity_available = max(int(listing.quantity_available or 0), 12)
        listing.is_donation = True
        listing.is_active = True
        listing.seller_status = SellerListingStatus.ACTIVE
        await session.flush()
        return listing

    listing = FoodListing(
        id=str(uuid.uuid4()),
        seller_id=seller.id,
        title=LISTING_TITLE,
        description="Surplus meal box for donation",
        category="Meals",
        original_price=200.0,
        discounted_price=0.0,
        discount_percent=100,
        quantity_available=12,
        total_quantity=12,
        quantity_unit="box",
        food_type=FoodType.VEG,
        seller_name="NGO Test Seller",
        seller_address="Zenda Chowk, Ichalkaranji",
        seller_lat=16.6938,
        seller_lng=74.4567,
        expires_at=_future(6),
        pickup_start=_future(1),
        pickup_end=_future(4),
        is_donation=True,
        is_active=True,
        seller_status=SellerListingStatus.ACTIVE,
    )
    session.add(listing)
    await session.flush()
    return listing


async def run() -> None:
    os.environ["PYTHONPATH"] = os.environ.get("PYTHONPATH", ".")
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        seller = await _get_or_create_user(session, SELLER_EMAIL, UserRole.SELLER)
        ngo = await _get_or_create_user(session, NGO_EMAIL, UserRole.NGO)
        await _get_or_create_seller_profile(session, seller)
        await _get_or_create_ngo_profile(session, ngo)
        listing = await _get_or_create_donation_listing(session, seller)
        await session.commit()

        donation_service = NGODonationService(session)
        pickup_service = NGOPickupService(session)
        seller_donations = SellerDonationsService(session)

        await session.execute(
            FoodListing.__table__.update()
            .where(FoodListing.id == listing.id)
            .values(quantity_available=12)
        )
        await session.execute(
            text(
                "UPDATE ngo_listing_requests SET approval_status='picked_up' "
                "WHERE listing_id = :listing_id AND ngo_id = :ngo_id"
            ),
            {"listing_id": listing.id, "ngo_id": ngo.id},
        )
        await session.commit()

        request = await donation_service.create_request(
            ngo.id, DonationRequestCreateIn(listing_id=listing.id, requested_quantity=4)
        )

        approved = await seller_donations.update_status(seller.id, request.id, "approved")

        pickup = await pickup_service.schedule_pickup(
            ngo.id, PickupScheduleIn(donation_request_id=approved.id)
        )

        completed = await pickup_service.complete_pickup(ngo.id, pickup.id)

        await session.refresh(listing)

        ngo_notifs, _ = await NGONotificationRepository(session).list(
            ngo.id, unread_only=False, limit=10, offset=0
        )
        seller_notifs, _ = await SellerNotificationRepository(session).list(
            seller.id, limit=10, offset=0
        )

        print("NGO request id:", request.id)
        print("Pickup id:", pickup.id)
        print("Pickup status:", completed.pickup_status)
        print("Listing remaining quantity:", listing.quantity_available)
        print("NGO notifications:", len(ngo_notifs))
        print("Seller notifications:", len(seller_notifs))

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
