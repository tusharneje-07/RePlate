"""FastAPI dependency functions shared across the API layer."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token_safe
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository

# ── Bearer token extractor ─────────────────────────────────────────────────────
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the Bearer JWT; return the User ORM object.

    Raises 401 if the token is missing, invalid, or expired.
    Raises 401 if the user no longer exists in the DB.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = decode_access_token_safe(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Like get_current_user but returns None instead of raising 401."""
    if credentials is None:
        return None
    payload = decode_access_token_safe(credentials.credentials)
    if payload is None:
        return None
    user_id: str | None = payload.get("sub")
    if not user_id:
        return None
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if user is None or not user.is_active:
        return None
    return user


def require_role(*roles: UserRole):
    """Dependency factory that enforces one of the given roles.

    Usage::

        @router.get("/seller/...")
        async def my_endpoint(
            user: User = Depends(require_role(UserRole.SELLER))
        ):
            ...
    """

    async def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {[r.value for r in roles]}",
            )
        return user

    return _checker


# ── Convenience aliases ────────────────────────────────────────────────────────
require_consumer = require_role(UserRole.CONSUMER)
require_seller = require_role(UserRole.SELLER)
require_ngo = require_role(UserRole.NGO)
require_inspector = require_role(UserRole.INSPECTOR)
require_admin = require_role(UserRole.ADMIN)
require_inspector_or_admin = require_role(UserRole.INSPECTOR, UserRole.ADMIN)
