"""RePlate API — FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Ensure the uploads directory exists before StaticFiles tries to serve from it
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    # Import all models so SQLAlchemy's metadata is fully populated
    import app.models  # noqa: F401
    yield
    # Shutdown: dispose connection pool
    from app.core.database import engine
    await engine.dispose()


class CORSOnErrorMiddleware(BaseHTTPMiddleware):
    """Ensure CORS headers are present even when an unhandled exception produces
    a 500 response.  FastAPI's CORSMiddleware runs *around* the router but
    *inside* Starlette's ServerErrorMiddleware, so unhandled exceptions escape
    the CORS middleware and the browser sees both a 500 and a CORS error.

    This middleware sits *outside* CORSMiddleware and injects the
    ``Access-Control-Allow-Origin`` / ``Access-Control-Allow-Credentials``
    headers on every response that lacks them.
    """

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
        except Exception:
            # Build a bare 500 so we can attach CORS headers below
            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
            )

        origin = request.headers.get("origin", "")
        if origin in settings.allowed_origins_list:
            response.headers.setdefault("Access-Control-Allow-Origin", origin)
            response.headers.setdefault("Access-Control-Allow-Credentials", "true")

        return response


def create_application() -> FastAPI:
    """Factory function — creates and configures the FastAPI instance."""
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    # ── CORS safety net (outermost) ────────────────────────────────────────────
    # Must be added BEFORE CORSMiddleware so it wraps it and can patch headers
    # on responses that escaped the inner CORS middleware due to unhandled errors.
    application.add_middleware(CORSOnErrorMiddleware)

    # ── Standard CORS ──────────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Static file serving for uploads ───────────────────────────────────────
    # Files uploaded via POST /api/v1/uploads are saved to UPLOAD_DIR and
    # served here as /uploads/<filename>.  The directory is created on startup
    # (see lifespan above) so this mount will always find it.
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    application.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

    # ── Routers ────────────────────────────────────────────────────────────────
    from app.api.v1.router import api_router
    application.include_router(api_router)

    @application.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "ok", "version": settings.APP_VERSION}

    return application


app = create_application()
