"""JWT utilities for issuing and verifying RePlate session tokens.

WorkOS handles *authentication* (who you are).
Our JWT carries *authorization* (what you can do) after WorkOS verifies the user.
"""

from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(
    subject: str,
    extra_claims: dict | None = None,
) -> str:
    """Create a signed JWT.

    Args:
        subject:      The local user UUID (users.id).
        extra_claims: Optional dict merged into the payload (e.g. role, workos_id).

    Returns:
        Encoded JWT string.
    """
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict = {
        "sub": subject,
        "iat": now,
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT.

    Returns:
        The decoded payload dict.

    Raises:
        JWTError: if the token is invalid or expired.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )


def decode_access_token_safe(token: str) -> dict | None:
    """Like decode_access_token but returns None instead of raising."""
    try:
        return decode_access_token(token)
    except JWTError:
        return None
