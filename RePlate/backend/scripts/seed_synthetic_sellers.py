"""Seed 60 synthetic sellers + listings around Ichalkaranji (no auth credentials)."""

from __future__ import annotations

import json
import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy import create_engine, text

from app.core.config import settings


ANCHORS = [
    ("Zenda Chowk", 16.6938, 74.4567),
    ("DKTE Campus", 16.6922, 74.4625),
    ("Main Market", 16.6901, 74.4551),
    ("Shahupuri", 16.6884, 74.4517),
    ("Yadrav Road", 16.6962, 74.4698),
    ("Rajwada", 16.6897, 74.4592),
    ("Mahadev Nagar", 16.6861, 74.4631),
    ("Jawahar Nagar", 16.6956, 74.4511),
    ("Wadgaon Road", 16.6981, 74.4602),
    ("Station Road", 16.6889, 74.4662),
]

SHOP_TYPES = [
    "bakery",
    "cafe",
    "meals",
    "restaurant",
    "grocery",
    "sweets",
    "dairy",
    "fruits",
    "vegetables",
    "snacks",
]

NAME_PARTS = [
    "Fresh",
    "Royal",
    "Tasty",
    "Green",
    "Classic",
    "Urban",
    "Golden",
    "Heritage",
    "Spice",
    "Sunny",
    "Aroma",
    "Daily",
    "Blue",
    "Red",
    "Silver",
]

SHOP_NOUNS = [
    "Kitchen",
    "Bakers",
    "Cafe",
    "Mart",
    "Dairy",
    "Store",
    "Mess",
    "Bistro",
    "Thali",
    "Sweets",
    "Foods",
    "Basket",
    "Corner",
    "Bites",
    "Platter",
]

LISTING_TEMPLATES = [
    ("Sourdough Loaf", "bakery", ["veg"], 180, 120),
    ("Butter Croissant Pack", "bakery", ["veg"], 160, 95),
    ("Veg Thali", "meals", ["veg"], 140, 90),
    ("Paneer Biryani", "restaurant", ["veg"], 220, 140),
    ("Chicken Biryani", "restaurant", ["non-veg"], 260, 180),
    ("Fruit Bowl", "fruits", ["vegan"], 120, 70),
    ("Mixed Veg Box", "vegetables", ["vegan"], 110, 60),
    ("Masala Dosa", "meals", ["veg"], 90, 55),
    ("Brownie Box", "desserts", ["veg"], 150, 95),
    ("Snack Combo", "snacks", ["veg"], 130, 80),
    ("Cold Coffee", "beverages", ["veg"], 120, 75),
    ("Gulab Jamun", "sweets", ["veg"], 140, 85),
    ("Milk Pack", "dairy", ["veg"], 80, 50),
]


def _random_offset() -> tuple[float, float]:
    return (random.uniform(-0.004, 0.004), random.uniform(-0.004, 0.004))


def _make_shop_name(index: int) -> str:
    return f"{random.choice(NAME_PARTS)} {random.choice(SHOP_NOUNS)} {index:02d}"


def _listing_payload(seller: dict, listing: tuple) -> dict:
    name, category, tags, original_price, discounted_price = listing
    quantity = random.randint(4, 20)
    start = datetime.now() + timedelta(hours=random.randint(1, 3))
    end = start + timedelta(hours=random.randint(2, 4))
    expiry = end + timedelta(hours=random.randint(1, 4))
    images = [f"https://placehold.co/600x400?text={name.replace(' ', '+')}"]
    return {
        "id": str(uuid.uuid4()),
        "seller_id": seller["id"],
        "title": name,
        "description": f"Fresh {name.lower()} from {seller['name']}.",
        "category": category,
        "images": json.dumps(images),
        "original_price": original_price,
        "discounted_price": discounted_price,
        "discount_percent": max(
            0, round((original_price - discounted_price) / original_price * 100)
        ),
        "quantity_available": quantity,
        "total_quantity": quantity,
        "quantity_sold": 0,
        "quantity_unit": "item",
        "dietary_tags": ",".join(tags),
        "allergens": "",
        "pickup_start": start.isoformat(),
        "pickup_end": end.isoformat(),
        "expires_at": expiry.isoformat(),
        "co2_saved_per_unit": 0.6,
        "seller_name": seller["name"],
        "seller_address": seller["address"],
        "seller_logo_url": seller["logo"],
        "seller_lat": seller["lat"],
        "seller_lng": seller["lng"],
        "seller_category": seller["category"],
        "seller_status": "active",
        "is_active": True,
        "rating": round(random.uniform(3.7, 4.9), 1),
        "review_count": random.randint(5, 140),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }


def main() -> None:
    engine = create_engine(settings.sync_database_url)

    with engine.begin() as conn:
        existing = conn.execute(
            text("SELECT COUNT(*) FROM users WHERE email LIKE 'synthetic_seller_%@replate.local'")
        ).scalar()
        existing_count = int(existing or 0)

        target_total = 60
        remaining = max(0, target_total - existing_count)
        if remaining == 0:
            print("Synthetic sellers already seeded (60).")
            return

        sellers = []
        for idx in range(existing_count + 1, existing_count + remaining + 1):
            anchor_name, anchor_lat, anchor_lng = random.choice(ANCHORS)
            lat_offset, lng_offset = _random_offset()
            name = _make_shop_name(idx)
            category = random.choice(SHOP_TYPES)
            sellers.append(
                {
                    "id": str(uuid.uuid4()),
                    "email": f"synthetic_seller_{idx:03d}@replate.local",
                    "first_name": name.split()[0],
                    "last_name": "Seller",
                    "role": "SELLER",
                    "is_active": 1,
                    "is_email_verified": 1,
                    "is_onboarded": 1,
                    "name": name,
                    "category": category,
                    "lat": anchor_lat + lat_offset,
                    "lng": anchor_lng + lng_offset,
                    "address": f"{anchor_name}, Ichalkaranji",
                    "logo": f"https://placehold.co/200x200?text={name.split()[0]}",
                }
            )

        for seller in sellers:
            conn.execute(
                text(
                    """
                    INSERT INTO users (id, workos_user_id, password_hash, email, first_name, last_name, role,
                        is_active, is_email_verified, is_onboarded, created_at, updated_at)
                    VALUES (:id, NULL, NULL, :email, :first_name, :last_name, :role,
                        :is_active, :is_email_verified, :is_onboarded, NOW(), NOW())
                    """
                ),
                seller,
            )

            conn.execute(
                text(
                    """
                    INSERT INTO seller_profiles (id, user_id, business_name, business_type, phone_number,
                        address_line1, city, state, postal_code, country, lat, lng, logo_url, description,
                        is_verified, verification_status, completion_status, open_time, close_time, created_at, updated_at)
                    VALUES (:id, :user_id, :business_name, :business_type, :phone_number,
                        :address_line1, :city, :state, :postal_code, :country, :lat, :lng, :logo_url, :description,
                        :is_verified, :verification_status, :completion_status, :open_time, :close_time, NOW(), NOW())
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "user_id": seller["id"],
                    "business_name": seller["name"],
                    "business_type": seller["category"],
                    "phone_number": f"+91 9{random.randint(100000000, 999999999)}",
                    "address_line1": seller["address"],
                    "city": "Ichalkaranji",
                    "state": "MH",
                    "postal_code": "416115",
                    "country": "IN",
                    "lat": seller["lat"],
                    "lng": seller["lng"],
                    "logo_url": seller["logo"],
                    "description": f"Surplus from {seller['name']}.",
                    "is_verified": 1,
                    "verification_status": "verified",
                    "completion_status": "COMPLETE",
                    "open_time": "08:00",
                    "close_time": "21:00",
                },
            )

        for seller in sellers:
            for _ in range(3):
                listing = _listing_payload(seller, random.choice(LISTING_TEMPLATES))
                conn.execute(
                    text(
                        """
                        INSERT INTO food_listings (id, seller_id, title, description, category, images,
                            original_price, discounted_price, discount_percent, quantity_available,
                            total_quantity, quantity_sold, quantity_unit, dietary_tags, allergens,
                            pickup_start, pickup_end, expires_at, co2_saved_per_unit, seller_name,
                            seller_address, seller_logo_url, seller_lat, seller_lng, seller_category,
                            seller_status, is_active, rating, review_count, created_at, updated_at)
                        VALUES (:id, :seller_id, :title, :description, :category, :images,
                            :original_price, :discounted_price, :discount_percent, :quantity_available,
                            :total_quantity, :quantity_sold, :quantity_unit, :dietary_tags, :allergens,
                            :pickup_start, :pickup_end, :expires_at, :co2_saved_per_unit, :seller_name,
                            :seller_address, :seller_logo_url, :seller_lat, :seller_lng, :seller_category,
                            :seller_status, :is_active, :rating, :review_count, :created_at, :updated_at)
                        """
                    ),
                    listing,
                )

    print(f"Seeded {remaining} synthetic sellers and listings around Ichalkaranji.")


if __name__ == "__main__":
    main()
