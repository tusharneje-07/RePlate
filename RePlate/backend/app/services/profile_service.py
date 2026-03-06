"""Profile service — creates and updates role-specific profiles."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profiles import (
    ConsumerProfile,
    InspectorProfile,
    NGOProfile,
    SellerProfile,
)
from app.models.user import User, UserRole
from app.repositories.profile_repository import (
    ConsumerProfileRepository,
    InspectorProfileRepository,
    NGOProfileRepository,
    SellerProfileRepository,
)
from app.repositories.user_repository import UserRepository


class ProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)

    # ── Consumer ───────────────────────────────────────────────────────────────

    async def get_or_create_consumer_profile(self, user: User) -> ConsumerProfile:
        repo = ConsumerProfileRepository(self.db)
        profile = await repo.get_by_user_id(user.id)
        if profile is None:
            profile = await repo.create(user.id)
        return profile

    async def update_consumer_profile(self, user: User, data: dict) -> ConsumerProfile:
        repo = ConsumerProfileRepository(self.db)
        profile = await repo.get_by_user_id(user.id)
        if profile is None:
            profile = await repo.create(user.id)
        profile = await repo.update(profile, data)
        # Mark onboarded on first profile submission (regardless of completeness)
        if not user.is_onboarded:
            await self.user_repo.mark_onboarded(user)
        return profile

    # ── Seller ─────────────────────────────────────────────────────────────────

    async def get_or_create_seller_profile(self, user: User) -> SellerProfile:
        repo = SellerProfileRepository(self.db)
        profile = await repo.get_by_user_id(user.id)
        if profile is None:
            profile = await repo.create(user.id)
        return profile

    async def update_seller_profile(self, user: User, data: dict) -> SellerProfile:
        repo = SellerProfileRepository(self.db)
        profile = await repo.get_by_user_id(user.id)
        if profile is None:
            profile = await repo.create(user.id)
        profile = await repo.update(profile, data)
        if not user.is_onboarded:
            await self.user_repo.mark_onboarded(user)
        return profile

    # ── NGO ────────────────────────────────────────────────────────────────────

    async def get_or_create_ngo_profile(self, user: User) -> NGOProfile:
        repo = NGOProfileRepository(self.db)
        profile = await repo.get_by_user_id(user.id)
        if profile is None:
            profile = await repo.create(user.id)
        return profile

    async def update_ngo_profile(self, user: User, data: dict) -> NGOProfile:
        repo = NGOProfileRepository(self.db)
        profile = await repo.get_by_user_id(user.id)
        if profile is None:
            profile = await repo.create(user.id)
        profile = await repo.update(profile, data)
        if not user.is_onboarded:
            await self.user_repo.mark_onboarded(user)
        return profile

    # ── Inspector ──────────────────────────────────────────────────────────────

    async def create_inspector_profile(
        self,
        user: User,
        *,
        badge_number: str,
        department: str,
        assigned_region: str,
        assigned_city: str,
    ) -> InspectorProfile:
        repo = InspectorProfileRepository(self.db)
        # Ensure no duplicate
        existing = await repo.get_by_user_id(user.id)
        if existing:
            return existing
        profile = await repo.create(
            user.id,
            badge_number=badge_number,
            department=department,
            assigned_region=assigned_region,
            assigned_city=assigned_city,
        )
        await self.user_repo.mark_onboarded(user)
        return profile

    async def get_inspector_profile(self, user: User) -> InspectorProfile | None:
        repo = InspectorProfileRepository(self.db)
        return await repo.get_by_user_id(user.id)

    async def update_inspector_profile(
        self, user: User, data: dict
    ) -> InspectorProfile | None:
        repo = InspectorProfileRepository(self.db)
        profile = await repo.get_by_user_id(user.id)
        if profile is None:
            return None
        return await repo.update(profile, data)
