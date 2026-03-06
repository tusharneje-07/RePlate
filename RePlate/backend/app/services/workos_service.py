"""WorkOS AuthKit integration service.

This service wraps the WorkOS Python SDK to:
  1. Generate the hosted-UI authorization URL (with provider="authkit").
  2. Exchange the authorization code for a WorkOS User object.
  3. Revoke a WorkOS session (sign-out).

All heavy business logic (DB sync, token issuance) lives in auth_service.
"""

from workos import WorkOSClient

from app.core.config import settings

# ── Singleton client ───────────────────────────────────────────────────────────
_workos_client: WorkOSClient | None = None


def get_workos_client() -> WorkOSClient:
    global _workos_client
    if _workos_client is None:
        _workos_client = WorkOSClient(
            api_key=settings.WORKOS_API_KEY,
            client_id=settings.WORKOS_CLIENT_ID,
        )
    return _workos_client


# ── Auth URL generation ────────────────────────────────────────────────────────

def get_authorization_url(
    *,
    redirect_uri: str | None = None,
    state: str | None = None,
    screen_hint: str | None = None,  # "sign-up" or "sign-in"
) -> str:
    """Return the WorkOS hosted-UI URL to redirect the user to.

    Uses provider="authkit" which routes through AuthKit's hosted UI.

    Args:
        redirect_uri:  Override the default redirect URI from settings.
        state:         Opaque state string echoed back by WorkOS (CSRF protection).
        screen_hint:   "sign-up" to open the signup screen first.
    """
    client = get_workos_client()
    params: dict = {
        "provider": "authkit",
        "redirect_uri": redirect_uri or settings.WORKOS_REDIRECT_URI,
    }
    if state:
        params["state"] = state
    if screen_hint:
        params["screen_hint"] = screen_hint

    return client.user_management.get_authorization_url(**params)


# ── Code exchange ──────────────────────────────────────────────────────────────

def authenticate_with_code(code: str) -> object:
    """Exchange the WorkOS authorization code for user data.

    Returns an AuthenticateResponse object with attributes:
      - user:           WorkOS User object (.id, .email, .first_name, etc.)
      - access_token:   WorkOS access token
      - refresh_token:  WorkOS refresh token
    """
    client = get_workos_client()
    return client.user_management.authenticate_with_code(code=code)


# ── Sign-out ───────────────────────────────────────────────────────────────────

def get_logout_url(session_id: str) -> str:
    """Get the WorkOS logout URL for the given session."""
    client = get_workos_client()
    try:
        return client.user_management.get_logout_url(session_id=session_id)
    except Exception:
        return f"{settings.FRONTEND_URL}/login"


# ── User deletion ──────────────────────────────────────────────────────────────

def delete_user(workos_user_id: str) -> None:
    """Permanently delete a user from WorkOS.

    This is irreversible. Call this only after the local DB record has been
    scheduled for deletion so we don't end up with orphaned WorkOS users.

    Raises:
        Exception: propagated if the WorkOS API call fails.
    """
    client = get_workos_client()
    client.user_management.delete_user(workos_user_id)
