"""Central router — registers all v1 sub-routers."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.profiles import router as profiles_router
from app.api.v1.admin import router as admin_router
from app.api.v1.listings import router as listings_router
from app.api.v1.orders import router as orders_router
from app.api.v1.favorites import router as favorites_router
from app.api.v1.impact import router as impact_router
from app.api.v1.seller import router as seller_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.inspector_module import router as inspector_module_router
from app.api.v1.sellers_module import router as seller_profile_module_router
from app.api.v1.listings_module import router as seller_listings_module_router
from app.api.v1.inventory_module import router as seller_inventory_module_router
from app.api.v1.orders_module import router as seller_orders_module_router
from app.api.v1.donations_module import router as seller_donations_module_router
from app.api.v1.pickups_module import router as seller_pickups_module_router
from app.api.v1.notifications_module import router as seller_notifications_module_router
from app.api.v1.analytics_module import router as seller_analytics_module_router
from app.api.v1.ngo import router as ngo_router
from app.api.v1.consumer import router as consumer_router
from app.api.v1.ai_features import router as ai_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(profiles_router)
api_router.include_router(admin_router)
api_router.include_router(listings_router)
api_router.include_router(orders_router)
api_router.include_router(favorites_router)
api_router.include_router(impact_router)
api_router.include_router(seller_router)
api_router.include_router(seller_profile_module_router)
api_router.include_router(seller_listings_module_router)
api_router.include_router(seller_inventory_module_router)
api_router.include_router(seller_orders_module_router)
api_router.include_router(seller_donations_module_router)
api_router.include_router(seller_pickups_module_router)
api_router.include_router(seller_notifications_module_router)
api_router.include_router(seller_analytics_module_router)
api_router.include_router(ngo_router)
api_router.include_router(consumer_router)
api_router.include_router(uploads_router)
api_router.include_router(inspector_module_router)
api_router.include_router(ai_router)
