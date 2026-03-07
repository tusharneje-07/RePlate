"""Seed script — creates demo users and food listings.

Usage:
    cd backend/
    .venv/bin/python scripts/seed.py

Creates:
  consumer@replate.dev  / password: consumer123  (Consumer, onboarded)
  seller@replate.dev    / password: seller123    (Seller, onboarded)
  seller2@replate.dev   / password: seller123    (Seller 2, onboarded)
  ngo@replate.dev       / password: ngo123       (NGO, onboarded)
  + 15 food listings from seller / 5 from seller2
"""

import asyncio
import json
import sys
import uuid
from datetime import datetime, timedelta, UTC

sys.path.insert(0, ".")  # ensure app is importable

import bcrypt as _bcrypt_lib
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.base import Base
from app.models.user import User, UserRole
from app.models.profiles import (
    ConsumerProfile,
    SellerProfile,
    NGOProfile,
    ProfileCompletionStatus,
    NGOType,
)
from app.models.food import FoodListing, FoodType, SellerListingStatus


def _hash_pw(plain: str) -> str:
    return _bcrypt_lib.hashpw(plain.encode(), _bcrypt_lib.gensalt()).decode()


# ── Demo accounts ────────────────────────────────────────────────────────────

CONSUMER = {
    "email": "consumer@replate.dev",
    "password": "consumer123",
    "first_name": "Arjun",
    "last_name": "Sharma",
    "role": UserRole.CONSUMER,
}

SELLER1 = {
    "email": "seller@replate.dev",
    "password": "seller123",
    "first_name": "Priya",
    "last_name": "Mehta",
    "role": UserRole.SELLER,
    "business_name": "Green Bites Kitchen",
    "business_type": "Restaurant",
    "city": "Mumbai",
    "state": "Maharashtra",
    "address_line1": "42, Carter Road, Bandra West",
    "postal_code": "400050",
    "phone_number": "+91-9876543210",
    "lat": 19.0596,
    "lng": 72.8295,
    "description": "A farm-to-table restaurant reducing food waste since 2019.",
    "open_time": "09:00",
    "close_time": "22:00",
}

SELLER2 = {
    "email": "seller2@replate.dev",
    "password": "seller123",
    "first_name": "Rahul",
    "last_name": "Joshi",
    "role": UserRole.SELLER,
    "business_name": "Spice Route Bakery",
    "business_type": "Bakery",
    "city": "Mumbai",
    "state": "Maharashtra",
    "address_line1": "8, Hill Road, Bandra",
    "postal_code": "400050",
    "phone_number": "+91-9988776655",
    "lat": 19.0505,
    "lng": 72.8333,
    "description": "Artisan bakery specialising in fresh bread and pastries.",
    "open_time": "07:00",
    "close_time": "20:00",
}

NGO_USER = {
    "email": "ngo@replate.dev",
    "password": "ngo123",
    "first_name": "Sunita",
    "last_name": "Rao",
    "role": UserRole.NGO,
    "organization_name": "Mumbai Food Relief",
    "mission_statement": "Distributing surplus food to underprivileged communities in Mumbai.",
    "phone_number": "+91-9123456789",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400001",
    "serving_capacity": 500,
    "lat": 19.0760,
    "lng": 72.8777,
}

# ── Listings ─────────────────────────────────────────────────────────────────


def future(hours: int) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


def listing_data(
    seller_id: str, seller_name: str, address: str, lat: float, lng: float
) -> list[dict]:
    now = datetime.now(UTC)
    return [
        {
            "title": "Mixed Veg Thali",
            "description": "Full thali with 4 sabzis, dal, rice, 2 rotis — must pick up today.",
            "category": "Meals",
            "original_price": 280.0,
            "discounted_price": 120.0,
            "discount_percent": 57,
            "quantity_available": 8,
            "total_quantity": 10,
            "quantity_unit": "plate",
            "dietary_tags": "veg,gluten-free",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.5,
            "co2_saved_per_unit": 0.6,
            "expires_at": future(6),
            "pickup_start": future(1),
            "pickup_end": future(4),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400"]
            ),
        },
        {
            "title": "Chicken Biryani Box",
            "description": "Hyderabadi-style biryani with raita — limited stock.",
            "category": "Meals",
            "original_price": 350.0,
            "discounted_price": 180.0,
            "discount_percent": 49,
            "quantity_available": 5,
            "total_quantity": 8,
            "quantity_unit": "box",
            "dietary_tags": "non-veg",
            "food_type": FoodType.NONVEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.5,
            "co2_saved_per_unit": 0.8,
            "expires_at": future(5),
            "pickup_start": future(1),
            "pickup_end": future(3),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1563379091339-03246963d29a?w=400"]
            ),
        },
        {
            "title": "Masala Chai + Snack Combo",
            "description": "2 cups of chai with biscuits and banana chips.",
            "category": "Beverages",
            "original_price": 80.0,
            "discounted_price": 35.0,
            "discount_percent": 56,
            "quantity_available": 15,
            "total_quantity": 20,
            "quantity_unit": "combo",
            "dietary_tags": "veg",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.5,
            "co2_saved_per_unit": 0.2,
            "expires_at": future(3),
            "pickup_start": future(0),
            "pickup_end": future(2),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=400"]
            ),
        },
        {
            "title": "Fresh Fruit Bowl",
            "description": "Seasonal fruit bowl — papaya, banana, apple and melon.",
            "category": "Snacks",
            "original_price": 150.0,
            "discounted_price": 60.0,
            "discount_percent": 60,
            "quantity_available": 12,
            "total_quantity": 15,
            "quantity_unit": "bowl",
            "dietary_tags": "vegan,gluten-free",
            "food_type": FoodType.VEGAN,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.5,
            "co2_saved_per_unit": 0.4,
            "expires_at": future(8),
            "pickup_start": future(1),
            "pickup_end": future(5),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400"]
            ),
        },
        {
            "title": "Paneer Butter Masala + Naan",
            "description": "Restaurant-style paneer curry with 2 butter naans.",
            "category": "Meals",
            "original_price": 320.0,
            "discounted_price": 150.0,
            "discount_percent": 53,
            "quantity_available": 6,
            "total_quantity": 8,
            "quantity_unit": "plate",
            "dietary_tags": "veg",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.5,
            "co2_saved_per_unit": 0.7,
            "expires_at": future(4),
            "pickup_start": future(1),
            "pickup_end": future(3),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1626040045045-6a2001d1cc69?w=400"]
            ),
        },
        {
            "title": "Vada Pav Bundle (5 pcs)",
            "description": "Mumbai street food classic — 5 vada pavs with green chutney.",
            "category": "Snacks",
            "original_price": 100.0,
            "discounted_price": 40.0,
            "discount_percent": 60,
            "quantity_available": 20,
            "total_quantity": 30,
            "quantity_unit": "bundle",
            "dietary_tags": "veg",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.5,
            "co2_saved_per_unit": 0.3,
            "expires_at": future(5),
            "pickup_start": future(0),
            "pickup_end": future(3),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400"]
            ),
        },
        {
            "title": "Dal Makhani + Rice",
            "description": "Slow-cooked creamy dal with steamed basmati rice.",
            "category": "Meals",
            "original_price": 220.0,
            "discounted_price": 95.0,
            "discount_percent": 57,
            "quantity_available": 10,
            "total_quantity": 12,
            "quantity_unit": "plate",
            "dietary_tags": "veg,gluten-free",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.5,
            "co2_saved_per_unit": 0.55,
            "expires_at": future(6),
            "pickup_start": future(1),
            "pickup_end": future(4),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?w=400"]
            ),
        },
        {
            "title": "Samosa (4 pcs)",
            "description": "Crispy fried samosas with mint chutney — just made.",
            "category": "Snacks",
            "original_price": 60.0,
            "discounted_price": 25.0,
            "discount_percent": 58,
            "quantity_available": 25,
            "total_quantity": 40,
            "quantity_unit": "piece",
            "dietary_tags": "veg",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.5,
            "co2_saved_per_unit": 0.15,
            "expires_at": future(3),
            "pickup_start": future(0),
            "pickup_end": future(2),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400"]
            ),
        },
        {
            "title": "Chole Bhature",
            "description": "Punjabi-style spiced chickpeas with 2 fluffy bhaturas.",
            "category": "Meals",
            "original_price": 200.0,
            "discounted_price": 90.0,
            "discount_percent": 55,
            "quantity_available": 7,
            "total_quantity": 10,
            "quantity_unit": "plate",
            "dietary_tags": "veg",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.5,
            "co2_saved_per_unit": 0.5,
            "expires_at": future(5),
            "pickup_start": future(1),
            "pickup_end": future(3),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400"]
            ),
        },
        {
            "title": "Grilled Chicken Wrap",
            "description": "Whole-wheat wrap with grilled chicken, lettuce, and chipotle sauce.",
            "category": "Meals",
            "original_price": 260.0,
            "discounted_price": 130.0,
            "discount_percent": 50,
            "quantity_available": 9,
            "total_quantity": 12,
            "quantity_unit": "wrap",
            "dietary_tags": "non-veg",
            "food_type": FoodType.NONVEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.5,
            "co2_saved_per_unit": 0.65,
            "expires_at": future(4),
            "pickup_start": future(1),
            "pickup_end": future(3),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400"]
            ),
        },
    ]


def seller2_listings(
    seller_id: str, seller_name: str, address: str, lat: float, lng: float
) -> list[dict]:
    return [
        {
            "title": "Whole Wheat Sourdough Loaf",
            "description": "Freshly baked sourdough — best before tonight.",
            "category": "Bakery",
            "original_price": 180.0,
            "discounted_price": 80.0,
            "discount_percent": 56,
            "quantity_available": 6,
            "total_quantity": 10,
            "quantity_unit": "loaf",
            "dietary_tags": "veg",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.3,
            "co2_saved_per_unit": 0.45,
            "expires_at": future(8),
            "pickup_start": future(1),
            "pickup_end": future(5),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400"]
            ),
        },
        {
            "title": "Assorted Pastry Box (6 pcs)",
            "description": "Mix of croissants, pain au chocolat, and almond Danish.",
            "category": "Bakery",
            "original_price": 320.0,
            "discounted_price": 140.0,
            "discount_percent": 56,
            "quantity_available": 4,
            "total_quantity": 8,
            "quantity_unit": "box",
            "dietary_tags": "veg",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.3,
            "co2_saved_per_unit": 0.55,
            "expires_at": future(6),
            "pickup_start": future(1),
            "pickup_end": future(4),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=400"]
            ),
        },
        {
            "title": "Mango Cake Slice",
            "description": "Fresh mango sponge cake — 2 slices, today only.",
            "category": "Desserts",
            "original_price": 120.0,
            "discounted_price": 50.0,
            "discount_percent": 58,
            "quantity_available": 8,
            "total_quantity": 12,
            "quantity_unit": "slice",
            "dietary_tags": "veg",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.3,
            "co2_saved_per_unit": 0.3,
            "expires_at": future(5),
            "pickup_start": future(0),
            "pickup_end": future(3),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=400"]
            ),
        },
        {
            "title": "Banana Walnut Muffin (4 pcs)",
            "description": "Soft banana muffins with crunchy walnut topping.",
            "category": "Bakery",
            "original_price": 160.0,
            "discounted_price": 70.0,
            "discount_percent": 56,
            "quantity_available": 10,
            "total_quantity": 16,
            "quantity_unit": "pack",
            "dietary_tags": "veg",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.3,
            "co2_saved_per_unit": 0.35,
            "expires_at": future(7),
            "pickup_start": future(1),
            "pickup_end": future(5),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400"]
            ),
        },
        {
            "title": "Chocolate Brownie Box (4 pcs)",
            "description": "Fudgy dark chocolate brownies — last box today.",
            "category": "Desserts",
            "original_price": 200.0,
            "discounted_price": 90.0,
            "discount_percent": 55,
            "quantity_available": 3,
            "total_quantity": 6,
            "quantity_unit": "box",
            "dietary_tags": "veg",
            "food_type": FoodType.VEG,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_address": address,
            "seller_lat": lat,
            "seller_lng": lng,
            "seller_rating": 4.3,
            "co2_saved_per_unit": 0.4,
            "expires_at": future(4),
            "pickup_start": future(0),
            "pickup_end": future(2),
            "images": json.dumps(
                ["https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400"]
            ),
        },
    ]


async def seed():
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # ── Helper: get or create user ─────────────────────────────────────────

        async def get_or_create_user(data: dict) -> User:
            result = await session.execute(select(User).where(User.email == data["email"]))
            user = result.scalar_one_or_none()
            if user:
                print(f"  ✓ User already exists: {data['email']}")
                return user

            user = User(
                id=str(uuid.uuid4()),
                email=data["email"],
                password_hash=_hash_pw(data["password"]),
                first_name=data.get("first_name"),
                last_name=data.get("last_name"),
                role=data["role"],
                is_email_verified=True,
                is_onboarded=True,
                workos_user_id=None,
            )
            session.add(user)
            await session.flush()
            print(f"  + Created user: {data['email']}")
            return user

        # ── Consumer ──────────────────────────────────────────────────────────
        print("\n[1/4] Consumer")
        consumer = await get_or_create_user(CONSUMER)
        result = await session.execute(
            select(ConsumerProfile).where(ConsumerProfile.user_id == consumer.id)
        )
        if not result.scalar_one_or_none():
            session.add(
                ConsumerProfile(
                    id=str(uuid.uuid4()),
                    user_id=consumer.id,
                    city="Mumbai",
                    state="Maharashtra",
                    postal_code="400050",
                    country="IN",
                )
            )
            print("  + Created consumer profile")

        # ── Seller 1 ──────────────────────────────────────────────────────────
        print("\n[2/4] Seller 1")
        seller1 = await get_or_create_user(SELLER1)
        result = await session.execute(
            select(SellerProfile).where(SellerProfile.user_id == seller1.id)
        )
        if not result.scalar_one_or_none():
            session.add(
                SellerProfile(
                    id=str(uuid.uuid4()),
                    user_id=seller1.id,
                    business_name=SELLER1["business_name"],
                    business_type=SELLER1["business_type"],
                    city=SELLER1["city"],
                    state=SELLER1["state"],
                    address_line1=SELLER1["address_line1"],
                    postal_code=SELLER1["postal_code"],
                    phone_number=SELLER1["phone_number"],
                    lat=SELLER1["lat"],
                    lng=SELLER1["lng"],
                    description=SELLER1["description"],
                    open_time=SELLER1["open_time"],
                    close_time=SELLER1["close_time"],
                    is_verified=True,
                    completion_status=ProfileCompletionStatus.COMPLETE,
                )
            )
            print("  + Created seller 1 profile")

        # ── Seller 2 ──────────────────────────────────────────────────────────
        print("\n[3/4] Seller 2")
        seller2 = await get_or_create_user(SELLER2)
        result = await session.execute(
            select(SellerProfile).where(SellerProfile.user_id == seller2.id)
        )
        if not result.scalar_one_or_none():
            session.add(
                SellerProfile(
                    id=str(uuid.uuid4()),
                    user_id=seller2.id,
                    business_name=SELLER2["business_name"],
                    business_type=SELLER2["business_type"],
                    city=SELLER2["city"],
                    state=SELLER2["state"],
                    address_line1=SELLER2["address_line1"],
                    postal_code=SELLER2["postal_code"],
                    phone_number=SELLER2["phone_number"],
                    lat=SELLER2["lat"],
                    lng=SELLER2["lng"],
                    description=SELLER2["description"],
                    open_time=SELLER2["open_time"],
                    close_time=SELLER2["close_time"],
                    is_verified=True,
                    completion_status=ProfileCompletionStatus.COMPLETE,
                )
            )
            print("  + Created seller 2 profile")

        # ── NGO ───────────────────────────────────────────────────────────────
        print("\n[4/4] NGO")
        ngo = await get_or_create_user(NGO_USER)
        result = await session.execute(select(NGOProfile).where(NGOProfile.user_id == ngo.id))
        if not result.scalar_one_or_none():
            session.add(
                NGOProfile(
                    id=str(uuid.uuid4()),
                    user_id=ngo.id,
                    organization_name=NGO_USER["organization_name"],
                    mission_statement=NGO_USER["mission_statement"],
                    phone_number=NGO_USER["phone_number"],
                    city=NGO_USER["city"],
                    state=NGO_USER["state"],
                    postal_code=NGO_USER["postal_code"],
                    serving_capacity=NGO_USER["serving_capacity"],
                    lat=NGO_USER["lat"],
                    lng=NGO_USER["lng"],
                    is_verified=True,
                    ngo_type=NGOType.FOOD_BANK,
                    completion_status=ProfileCompletionStatus.COMPLETE,
                )
            )
            print("  + Created NGO profile")

        await session.flush()

        # ── Food Listings for Seller 1 ────────────────────────────────────────
        print("\n[5] Seller 1 listings")
        for ld in listing_data(
            seller1.id,
            SELLER1["business_name"],
            SELLER1["address_line1"] + ", " + SELLER1["city"],
            SELLER1["lat"],
            SELLER1["lng"],
        ):
            listing = FoodListing(
                id=str(uuid.uuid4()),
                seller_id=ld["seller_id"],
                title=ld["title"],
                description=ld.get("description"),
                category=ld["category"],
                images=ld.get("images"),
                original_price=ld["original_price"],
                discounted_price=ld["discounted_price"],
                discount_percent=ld["discount_percent"],
                quantity_available=ld["quantity_available"],
                total_quantity=ld["total_quantity"],
                quantity_unit=ld["quantity_unit"],
                dietary_tags=ld.get("dietary_tags"),
                food_type=ld["food_type"],
                seller_name=ld["seller_name"],
                seller_address=ld["seller_address"],
                seller_lat=ld["seller_lat"],
                seller_lng=ld["seller_lng"],
                seller_rating=ld["seller_rating"],
                co2_saved_per_unit=ld.get("co2_saved_per_unit"),
                expires_at=ld.get("expires_at"),
                pickup_start=ld.get("pickup_start"),
                pickup_end=ld.get("pickup_end"),
                is_active=True,
                seller_status=SellerListingStatus.ACTIVE,
            )
            session.add(listing)
            print(f"  + {ld['title']}")

        # ── Food Listings for Seller 2 ────────────────────────────────────────
        print("\n[6] Seller 2 listings")
        for ld in seller2_listings(
            seller2.id,
            SELLER2["business_name"],
            SELLER2["address_line1"] + ", " + SELLER2["city"],
            SELLER2["lat"],
            SELLER2["lng"],
        ):
            listing = FoodListing(
                id=str(uuid.uuid4()),
                seller_id=ld["seller_id"],
                title=ld["title"],
                description=ld.get("description"),
                category=ld["category"],
                images=ld.get("images"),
                original_price=ld["original_price"],
                discounted_price=ld["discounted_price"],
                discount_percent=ld["discount_percent"],
                quantity_available=ld["quantity_available"],
                total_quantity=ld["total_quantity"],
                quantity_unit=ld["quantity_unit"],
                dietary_tags=ld.get("dietary_tags"),
                food_type=ld["food_type"],
                seller_name=ld["seller_name"],
                seller_address=ld["seller_address"],
                seller_lat=ld["seller_lat"],
                seller_lng=ld["seller_lng"],
                seller_rating=ld["seller_rating"],
                co2_saved_per_unit=ld.get("co2_saved_per_unit"),
                expires_at=ld.get("expires_at"),
                pickup_start=ld.get("pickup_start"),
                pickup_end=ld.get("pickup_end"),
                is_active=True,
                seller_status=SellerListingStatus.ACTIVE,
            )
            session.add(listing)
            print(f"  + {ld['title']}")

        await session.commit()

    await engine.dispose()
    print("\n✅ Seed complete!")
    print("\nDemo credentials:")
    print("  Consumer : consumer@replate.dev / consumer123")
    print("  Seller   : seller@replate.dev   / seller123")
    print("  Seller 2 : seller2@replate.dev  / seller123")
    print("  NGO      : ngo@replate.dev      / ngo123")


if __name__ == "__main__":
    asyncio.run(seed())
