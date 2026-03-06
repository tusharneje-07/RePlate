"""User repository — all DB queries related to the users table."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Read ───────────────────────────────────────────────────────────────────

    async def get_by_id(self, user_id: str) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_workos_id(self, workos_user_id: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.workos_user_id == workos_user_id)
        )
        return result.scalar_one_or_none()

    # ── Write ──────────────────────────────────────────────────────────────────

    async def create(
        self,
        *,
        workos_user_id: str,
        email: str,
        first_name: str | None = None,
        last_name: str | None = None,
        profile_picture_url: str | None = None,
        is_email_verified: bool = False,
    ) -> User:
        user = User(
            workos_user_id=workos_user_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            profile_picture_url=profile_picture_url,
            is_email_verified=is_email_verified,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_from_workos(
        self,
        user: User,
        *,
        email: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        profile_picture_url: str | None = None,
        is_email_verified: bool | None = None,
    ) -> User:
        """Sync WorkOS identity fields into our local record."""
        if email is not None:
            user.email = email
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if profile_picture_url is not None:
            user.profile_picture_url = profile_picture_url
        if is_email_verified is not None:
            user.is_email_verified = is_email_verified

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def assign_role(self, user: User, role: UserRole) -> User:
        user.role = role
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def mark_onboarded(self, user: User) -> User:
        user.is_onboarded = True
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def set_active(self, user: User, *, is_active: bool) -> User:
        user.is_active = is_active
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def delete(self, user: User) -> None:
        """Hard-delete a user row and all cascade-deleted related records."""
        await self.db.delete(user)
        await self.db.commit()
