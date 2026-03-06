"""Admin router — internal operations for creating Inspector/Admin accounts."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.user import CreateInspectorRequest, InspectorProfileOut, UserOut
from app.services.profile_service import ProfileService
from app.services.workos_service import get_workos_client

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post(
    "/inspectors",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create an Inspector account (Admin only)",
)
async def create_inspector(
    body: CreateInspectorRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new Inspector user.

    1. Creates the user in WorkOS.
    2. Creates the local user record with role=INSPECTOR.
    3. Creates the InspectorProfile with the supplied assignment.
    """
    user_repo = UserRepository(db)

    # Check if user already exists locally
    existing = await user_repo.get_by_email(str(body.email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email {body.email} already exists.",
        )

    # Create user in WorkOS
    client = get_workos_client()
    try:
        workos_user = client.user_management.create_user(
            email=str(body.email),
            first_name=body.first_name,
            last_name=body.last_name,
            email_verified=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create WorkOS user: {exc}",
        )

    # Create local user record
    user = await user_repo.create(
        workos_user_id=workos_user.id,
        email=str(body.email),
        first_name=body.first_name,
        last_name=body.last_name,
        is_email_verified=True,
    )
    user = await user_repo.assign_role(user, UserRole.INSPECTOR)

    # Create inspector profile
    profile_service = ProfileService(db)
    await profile_service.create_inspector_profile(
        user,
        badge_number=body.badge_number,
        department=body.department,
        assigned_region=body.assigned_region,
        assigned_city=body.assigned_city,
    )

    return user
