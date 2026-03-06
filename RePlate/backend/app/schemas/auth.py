"""Pydantic schemas for Auth endpoints."""

from pydantic import BaseModel, EmailStr


class AuthorizeResponse(BaseModel):
    """Response from GET /auth/authorize — the URL to redirect the user to."""
    authorization_url: str


class CallbackRequest(BaseModel):
    """Query params forwarded from WorkOS callback."""
    code: str
    state: str | None = None


class TokenResponse(BaseModel):
    """Returned after successful code exchange."""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    role: str | None = None
    is_onboarded: bool = False
    # Indicates whether this is a first-time login (no role assigned yet)
    requires_role_selection: bool = False


class RoleAssignRequest(BaseModel):
    """Body for POST /auth/role — user picks their role after first login."""
    role: str  # CONSUMER | SELLER | NGO (INSPECTOR/ADMIN not self-selectable)


class SignOutResponse(BaseModel):
    success: bool = True
    message: str = "Signed out successfully"
