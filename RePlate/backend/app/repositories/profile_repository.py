"""Profile repositories — DB access for all role-specific profile tables."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profiles import (
    ConsumerProfile,
    InspectorProfile,
    NGOProfile,
    ProfileCompletionStatus,
    SellerProfile,
)


class ConsumerProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_user_id(self, user_id: str) -> ConsumerProfile | None:
        result = await self.db.execute(
            select(ConsumerProfile).where(ConsumerProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: str) -> ConsumerProfile:
        profile = ConsumerProfile(user_id=user_id)
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def update(self, profile: ConsumerProfile, data: dict) -> ConsumerProfile:
        for key, value in data.items():
            if hasattr(profile, key) and value is not None:
                setattr(profile, key, value)
        # Check completion
        if all([profile.phone_number, profile.city, profile.country]):
            profile.completion_status = ProfileCompletionStatus.COMPLETE
        await self.db.commit()
        await self.db.refresh(profile)
        return profile


class SellerProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_user_id(self, user_id: str) -> SellerProfile | None:
        result = await self.db.execute(
            select(SellerProfile).where(SellerProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: str) -> SellerProfile:
        profile = SellerProfile(user_id=user_id)
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def update(self, profile: SellerProfile, data: dict) -> SellerProfile:
        for key, value in data.items():
            if hasattr(profile, key) and value is not None:
                setattr(profile, key, value)
        if all([profile.business_name, profile.city, profile.phone_number]):
            profile.completion_status = ProfileCompletionStatus.COMPLETE
        await self.db.commit()
        await self.db.refresh(profile)
        return profile


class NGOProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_user_id(self, user_id: str) -> NGOProfile | None:
        result = await self.db.execute(
            select(NGOProfile).where(NGOProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: str) -> NGOProfile:
        profile = NGOProfile(user_id=user_id)
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def update(self, profile: NGOProfile, data: dict) -> NGOProfile:
        for key, value in data.items():
            if hasattr(profile, key) and value is not None:
                setattr(profile, key, value)
        if all([profile.organization_name, profile.city, profile.phone_number]):
            profile.completion_status = ProfileCompletionStatus.COMPLETE
        await self.db.commit()
        await self.db.refresh(profile)
        return profile


class InspectorProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_user_id(self, user_id: str) -> InspectorProfile | None:
        result = await self.db.execute(
            select(InspectorProfile).where(InspectorProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: str, *, badge_number: str | None = None, department: str | None = None, assigned_region: str | None = None, assigned_city: str | None = None) -> InspectorProfile:
        profile = InspectorProfile(
            user_id=user_id,
            badge_number=badge_number,
            department=department,
            assigned_region=assigned_region,
            assigned_city=assigned_city,
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def update(self, profile: InspectorProfile, data: dict) -> InspectorProfile:
        for key, value in data.items():
            if hasattr(profile, key) and value is not None:
                setattr(profile, key, value)
        if all([profile.badge_number, profile.department]):
            profile.completion_status = ProfileCompletionStatus.COMPLETE
        await self.db.commit()
        await self.db.refresh(profile)
        return profile
