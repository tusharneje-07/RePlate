"""File upload endpoint.

POST /api/v1/uploads
  - Accepts a single file as multipart/form-data (field name: "file")
  - Saves it to UPLOAD_DIR with a UUID-based filename
  - Returns { "url": "<BACKEND_URL>/uploads/<uuid>.<ext>" }

The /uploads path is mounted as StaticFiles in main.py so the returned URL
is directly usable as an <img src> or download link.

Allowed MIME types: image/jpeg, image/png, image/webp, image/gif,
                    application/pdf
Max size: 10 MB
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# ── Constants ──────────────────────────────────────────────────────────────────

ALLOWED_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
}

MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


# ── Helpers ────────────────────────────────────────────────────────────────────

def _upload_dir() -> Path:
    """Return (and create if needed) the upload directory."""
    path = Path(settings.UPLOAD_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile,
    _current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """Upload a file and receive a permanent public URL back."""

    # Validate content type
    content_type = file.content_type or ""
    ext = ALLOWED_TYPES.get(content_type)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{content_type}'. Allowed: {', '.join(ALLOWED_TYPES)}",
        )

    # Read and validate size
    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    # Write to disk with a UUID name to avoid collisions and path traversal
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = _upload_dir() / filename
    dest.write_bytes(data)

    url = f"{settings.BACKEND_URL.rstrip('/')}/uploads/{filename}"
    return JSONResponse(status_code=status.HTTP_201_CREATED, content={"url": url})
