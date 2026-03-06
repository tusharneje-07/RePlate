"""Seed demo sellers and listings around Ichalkaranji (DKTE, Zenda Chowk)."""

from __future__ import annotations

import json
import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy import create_engine, text

from app.core.config import settings


BASE_LAT = 16.6932
BASE_LNG = 74.4564


SELLERS = [
    ("Zenda Chowk Bakers", "bakery"),
    ("DKTE Campus Cafe", "cafe"),
    ("Shri Laxmi Mess", "meals"),
    ("Kamat Restaurant", "restaurant"),
    ("Green Leaf Grocers", "grocery"),
    ("Suhana Sweets", "sweets"),
    ("Sunrise Dairy", "dairy"),
    ("Fresh Basket", "fruits"),
    ("Harvest Veggies", "vegetables"),
    ("Spice Route Kitchen", "restaurant"),
    ("Midtown Snacks", "snacks"),
    ("Brew House Cafe", "cafe"),
    ("Ganesh Bakery", "bakery"),
    ("Prakash Mess", "meals"),
    ("Tasty Thali", "restaurant"),
    ("Daily Mart", "grocery"),
    ("City Sweets", "sweets"),
    ("Milk & More", "dairy"),
    ("Fruit Junction", "fruits"),
    ("Veggie Hub", "vegetables"),
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
    return (random.uniform(-0.01, 0.01), random.uniform(-0.01, 0.01))


def _listing_payload(seller, listing):
    name, category, tags, original_price, discounted_price = listing
    quantity = random.randint(3, 15)
    start = datetime.now() + timedelta(hours=random.randint(1, 2))
    end = start + timedelta(hours=3)
    expiry = end + timedelta(hours=2)
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
        "rating": round(random.uniform(3.8, 4.8), 1),
        "review_count": random.randint(8, 120),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }


def main() -> None:
    engine = create_engine(settings.sync_database_url)
    sellers = []
    for idx, (name, category) in enumerate(SELLERS, start=1):
        lat_offset, lng_offset = _random_offset()
        sellers.append(
            {
                "id": str(uuid.uuid4()),
                "workos_user_id": f"demo_{idx}",
                "email": f"demo_seller_{idx}@replate.local",
                "first_name": name.split()[0],
                "last_name": "Seller",
                "role": "SELLER",
                "is_active": 1,
                "is_email_verified": 1,
                "is_onboarded": 1,
                "name": name,
                "category": category,
                "lat": BASE_LAT + lat_offset,
                "lng": BASE_LNG + lng_offset,
                "address": "Near Zenda Chowk, Ichalkaranji",
                "logo": f"https://placehold.co/200x200?text={name.split()[0]}",
            }
        )

    with engine.begin() as conn:
        for seller in sellers:
            conn.execute(
                text(
                    """
                    INSERT INTO users (id, workos_user_id, email, first_name, last_name, role,
                        is_active, is_email_verified, is_onboarded, created_at, updated_at)
                    VALUES (:id, :workos_user_id, :email, :first_name, :last_name, :role,
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
                        is_verified, verification_status, completion_status, created_at, updated_at)
                    VALUES (:id, :user_id, :business_name, :business_type, :phone_number,
                        :address_line1, :city, :state, :postal_code, :country, :lat, :lng, :logo_url, :description,
                        :is_verified, :verification_status, :completion_status, NOW(), NOW())
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "user_id": seller["id"],
                    "business_name": seller["name"],
                    "business_type": seller["category"],
                    "phone_number": f"+91 90000{random.randint(10000, 99999)}",
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

    print("Seeded 20 demo sellers and listings around Ichalkaranji.")


if __name__ == "__main__":
    main()
