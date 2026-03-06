"""Auth service — orchestrates WorkOS + DB user synchronization + JWT issuance."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.services.workos_service import authenticate_with_code, get_authorization_url, delete_user as workos_delete_user


SELF_SELECTABLE_ROLES = {UserRole.CONSUMER, UserRole.SELLER, UserRole.NGO}


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)

    # ── Step 1: Generate redirect URL ─────────────────────────────────────────

    def get_auth_url(
        self,
        *,
        state: str | None = None,
        screen_hint: str | None = None,
    ) -> str:
        """Return the WorkOS hosted-UI URL."""
        return get_authorization_url(state=state, screen_hint=screen_hint)

    # ── Step 2: Handle callback — sync user — issue JWT ───────────────────────

    async def handle_callback(self, code: str) -> dict:
        """Exchange code → WorkOS user → local user → JWT.

        Returns:
            {
              "access_token": str,
              "user": User ORM object,
              "requires_role_selection": bool,
              "workos_access_token": str,   # kept server-side for sign-out
            }
        """
        # Exchange code with WorkOS
        # The WorkOS SDK returns an AuthenticateResponse-like object
        # with attributes: user, access_token, refresh_token
        result = authenticate_with_code(code)

        workos_user = getattr(result, "user", None)
        workos_access_token = getattr(result, "access_token", None)

        if workos_user is None:
            raise ValueError("WorkOS authentication did not return a user object")

        # Sync with local DB
        user = await self._sync_user(workos_user)

        # Issue our own JWT
        token = create_access_token(
            subject=user.id,
            extra_claims={
                "role": user.role.value if user.role else None,
                "workos_id": workos_user.id,
            },
        )

        return {
            "access_token": token,
            "user": user,
            "requires_role_selection": user.role is None,
            "workos_access_token": workos_access_token,
        }

    # ── Step 3: Role selection (first-time only) ───────────────────────────────

    async def assign_role(self, user: User, role_str: str) -> User:
        """Assign a role to a user who has none yet.

        Raises:
            ValueError: if role is not self-selectable or user already has a role.
        """
        try:
            role = UserRole(role_str.upper())
        except ValueError:
            raise ValueError(f"Unknown role: {role_str}")

        if role not in SELF_SELECTABLE_ROLES:
            raise ValueError(
                f"Role '{role_str}' cannot be self-selected. "
                "Inspector and Admin accounts are created by administrators."
            )

        if user.role is not None:
            raise ValueError(
                f"User already has role '{user.role.value}'. "
                "Role cannot be changed after assignment."
            )

        return await self.user_repo.assign_role(user, role)

    # ── Account deletion ───────────────────────────────────────────────────────

    async def delete_account(self, user: User) -> None:
        """Permanently delete a user's account.

        Order of operations:
          1. Delete the user from WorkOS (so they cannot log back in).
          2. Hard-delete the local DB row (cascades to profiles, orders, etc.).

        If the WorkOS call fails we still delete the local record so the user
        is not left in a broken half-deleted state — the WorkOS user will
        remain but the local account is gone and they cannot authenticate again
        (the workos_user_id won't match any local record on the next login attempt).
        """
        workos_id = user.workos_user_id
        # Step 1 — remove from WorkOS (best-effort)
        try:
            workos_delete_user(workos_id)
        except Exception:
            # Log but don't abort — proceed to local deletion
            pass
        # Step 2 — hard-delete local record (cascades to related tables)
        await self.user_repo.delete(user)

    # ── Internal helpers ───────────────────────────────────────────────────────

    async def _sync_user(self, workos_user) -> User:
        """Create or update a local user from a WorkOS User object."""
        user = await self.user_repo.get_by_workos_id(workos_user.id)

        if user is None:
            # First login — create the base record (no role yet)
            user = await self.user_repo.create(
                workos_user_id=workos_user.id,
                email=workos_user.email,
                first_name=getattr(workos_user, "first_name", None),
                last_name=getattr(workos_user, "last_name", None),
                profile_picture_url=getattr(workos_user, "profile_picture_url", None),
                is_email_verified=getattr(workos_user, "email_verified", False),
            )
        else:
            # Subsequent login — sync identity fields that may have changed
            user = await self.user_repo.update_from_workos(
                user,
                email=workos_user.email,
                first_name=getattr(workos_user, "first_name", None),
                last_name=getattr(workos_user, "last_name", None),
                profile_picture_url=getattr(workos_user, "profile_picture_url", None),
                is_email_verified=getattr(workos_user, "email_verified", False),
            )

        return user
