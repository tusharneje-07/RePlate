"""Auth router — WorkOS AuthKit integration endpoints.

Flow:
  1.  Frontend calls GET  /auth/authorize  → gets the WorkOS hosted-UI URL.
  2.  Frontend redirects user to that URL.
  3.  WorkOS redirects back to GET /auth/callback?code=...
  4.  Backend exchanges code, syncs user, returns JWT to frontend.
  5.  If user.role is None  → frontend shows /select-role.
  6.  Frontend calls POST /auth/role        → assigns role, returns new JWT.
  7.  Frontend calls GET  /auth/me          → returns current user details.
  8.  Frontend calls PATCH /auth/me         → updates name fields.
  9.  Frontend calls POST /auth/signout     → clears session.

When SKIP_WORKOS=true:
  - POST /auth/local/login   → email + password → JWT
  - POST /auth/local/register → email + password + role → JWT
"""

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import (
    AuthorizeResponse,
    RoleAssignRequest,
    SignOutResponse,
    TokenResponse,
)
from app.schemas.user import UserOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


class UpdateMeRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None


# ── Local Email/Password Auth (SKIP_WORKOS mode) ──────────────────────────────


class LocalLoginRequest(BaseModel):
    email: str
    password: str


class LocalRegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str | None = None
    last_name: str | None = None
    role: str = "CONSUMER"  # CONSUMER | SELLER | NGO


@router.post(
    "/local/login",
    response_model=TokenResponse,
    summary="[SKIP_WORKOS] Email + password login",
)
async def local_login(body: LocalLoginRequest, db: AsyncSession = Depends(get_db)):
    from app.core.config import settings

    if not settings.SKIP_WORKOS:
        raise HTTPException(status_code=404, detail="Local auth disabled")

    import bcrypt as _bcrypt_lib
    from sqlalchemy import select

    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()

    if (
        not user
        or not user.password_hash
        or not _bcrypt_lib.checkpw(body.password.encode(), user.password_hash.encode())
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(
        subject=user.id,
        extra_claims={
            "role": user.role.value if user.role else None,
            "workos_id": None,
        },
    )
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        role=user.role.value if user.role else None,
        is_onboarded=user.is_onboarded,
        requires_role_selection=user.role is None,
    )


@router.post(
    "/local/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[SKIP_WORKOS] Email + password registration",
)
async def local_register(body: LocalRegisterRequest, db: AsyncSession = Depends(get_db)):
    from app.core.config import settings

    if not settings.SKIP_WORKOS:
        raise HTTPException(status_code=404, detail="Local auth disabled")

    import bcrypt as _bcrypt_lib
    from sqlalchemy import select
    import uuid
    from app.models.user import UserRole
    from app.models.profiles import ConsumerProfile, SellerProfile, NGOProfile

    # Check duplicate
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Validate role
    role_map = {"CONSUMER": UserRole.CONSUMER, "SELLER": UserRole.SELLER, "NGO": UserRole.NGO}
    role = role_map.get(body.role.upper())
    if not role:
        raise HTTPException(status_code=400, detail="Role must be CONSUMER, SELLER, or NGO")

    # Create user
    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        password_hash=_bcrypt_lib.hashpw(body.password.encode(), _bcrypt_lib.gensalt()).decode(),
        first_name=body.first_name,
        last_name=body.last_name,
        role=role,
        is_email_verified=True,
        is_onboarded=False,
        workos_user_id=None,
    )
    db.add(user)
    await db.flush()  # get id

    # Create bare profile so /profiles/me works immediately
    if role == UserRole.CONSUMER:
        db.add(ConsumerProfile(id=str(uuid.uuid4()), user_id=user.id))
    elif role == UserRole.SELLER:
        db.add(SellerProfile(id=str(uuid.uuid4()), user_id=user.id))
    elif role == UserRole.NGO:
        db.add(NGOProfile(id=str(uuid.uuid4()), user_id=user.id))

    await db.commit()
    await db.refresh(user)

    token = create_access_token(
        subject=user.id,
        extra_claims={
            "role": user.role.value if user.role else None,
            "workos_id": None,
        },
    )
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        role=user.role.value if user.role else None,
        is_onboarded=user.is_onboarded,
        requires_role_selection=False,
    )


# ── 1. Authorization URL ───────────────────────────────────────────────────────


@router.get(
    "/authorize",
    response_model=AuthorizeResponse,
    summary="Get WorkOS hosted-UI redirect URL",
)
async def authorize(
    screen_hint: str | None = Query(
        default=None,
        description="'sign-up' to open signup screen; omit for sign-in",
    ),
    state: str | None = Query(default=None, description="Optional CSRF state"),
    db: AsyncSession = Depends(get_db),
):
    """Returns the WorkOS hosted-UI URL.

    The frontend should redirect the user's browser to this URL.
    """
    service = AuthService(db)
    url = service.get_auth_url(state=state, screen_hint=screen_hint)
    return AuthorizeResponse(authorization_url=url)


# ── 2. OAuth Callback ──────────────────────────────────────────────────────────


@router.get(
    "/callback",
    summary="WorkOS callback — exchanges code for user session",
)
async def callback(
    code: str = Query(..., description="Authorization code from WorkOS"),
    state: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Exchange the WorkOS authorization code for a JWT.

    WorkOS redirects here after the user authenticates.
    This endpoint syncs the user with our DB, issues a JWT,
    then redirects the browser to the appropriate frontend page.
    """
    from app.core.config import settings

    # Resolve which frontend origin to redirect back to.
    # The frontend encodes window.location.origin in the `state` parameter
    # so that both localhost and Tailscale IP work with a single backend.
    allowed = settings.allowed_origins_list
    frontend_url = settings.FRONTEND_URL  # fallback
    if state and state in allowed:
        frontend_url = state

    service = AuthService(db)
    try:
        result = await service.handle_callback(code)
    except Exception:
        # On error, redirect to frontend login page with an error hint
        return RedirectResponse(
            url=f"{frontend_url}/auth/login?error=auth_failed",
            status_code=302,
        )

    token = result["access_token"]
    requires_role = result["requires_role_selection"]
    user: User = result["user"]

    # Redirect browser to frontend with the token in the URL fragment
    # The frontend reads it, stores it, then navigates to the right page.
    if requires_role:
        redirect_path = "/select-role"
    elif not user.is_onboarded:
        redirect_path = f"/onboarding/{user.role.value.lower()}" if user.role else "/select-role"
    else:
        role_paths = {
            "CONSUMER": "/consumer/dashboard",
            "SELLER": "/seller/dashboard",
            "NGO": "/ngo/dashboard",
            "INSPECTOR": "/inspector/dashboard",
            "ADMIN": "/admin/dashboard",
        }
        redirect_path = (
            role_paths.get(user.role.value, "/select-role") if user.role else "/select-role"
        )

    return RedirectResponse(
        url=f"{frontend_url}/auth/callback#token={token}&redirect={redirect_path}",
        status_code=302,
    )


# ── 3. Role Selection ──────────────────────────────────────────────────────────


@router.post(
    "/role",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign role to authenticated user (first-time only)",
)
async def assign_role(
    body: RoleAssignRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Assign the user's role after their first login.

    - Only CONSUMER, SELLER, NGO are self-selectable.
    - Role is permanent and cannot be changed via this endpoint.
    """
    service = AuthService(db)
    try:
        user = await service.assign_role(current_user, body.role)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    # Re-issue JWT with the new role claim
    new_token = create_access_token(
        subject=user.id,
        extra_claims={
            "role": user.role.value if user.role else None,
            "workos_id": user.workos_user_id,
        },
    )

    return TokenResponse(
        access_token=new_token,
        user_id=user.id,
        email=user.email,
        role=user.role.value if user.role else None,
        is_onboarded=user.is_onboarded,
        requires_role_selection=False,
    )


# ── 4. Current User ────────────────────────────────────────────────────────────


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current authenticated user",
)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's details from our local DB."""
    return current_user


@router.patch(
    "/me",
    response_model=UserOut,
    summary="Update authenticated user's name",
)
async def update_me(
    body: UpdateMeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's first_name and/or last_name."""
    if body.first_name is not None:
        current_user.first_name = body.first_name
    if body.last_name is not None:
        current_user.last_name = body.last_name
    await db.commit()
    await db.refresh(current_user)
    return current_user


# ── 5. Sign Out ────────────────────────────────────────────────────────────────


@router.post(
    "/signout",
    response_model=SignOutResponse,
    summary="Sign out the current user",
)
async def signout(
    current_user: User = Depends(get_current_user),
):
    """Invalidate the session.

    The frontend should discard its JWT after calling this.
    WorkOS session revocation is best-effort.
    """
    # Note: Since we use stateless JWTs, true revocation requires
    # a token denylist (Redis). For now, the frontend drops the token.
    # WorkOS session revocation is called if the frontend passes the
    # WorkOS access token in a separate header — future enhancement.
    return SignOutResponse(success=True, message="Signed out successfully")


# ── 6. Delete Account ──────────────────────────────────────────────────────────


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete the authenticated user's account",
)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete the current user.

    - Deletes the user from WorkOS (best-effort).
    - Hard-deletes the local DB row and all cascade-related records.
    - The caller should discard their JWT and clear all local storage/cookies
      after receiving the 204 response.
    """
    service = AuthService(db)
    await service.delete_account(current_user)
