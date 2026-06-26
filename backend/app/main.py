import os
import sys
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.models import user, scan_log, qr_device  # noqa: F401 – register tables
from app.routers import auth, scans, users, qr_devices, patrol


async def _ensure_admin(db):
    """Create default admin account on first run if no users exist."""
    from sqlalchemy import select, func
    from app.models.user import User, Role
    from app.services.auth_service import hash_password
    import uuid

    count = (await db.execute(select(func.count()).select_from(User))).scalar()
    if count == 0:
        default_password = "admin1234"
        admin = User(
            id=uuid.uuid4().hex,
            username="admin",
            password_hash=hash_password(default_password),
            role=Role.ADMIN,
            is_active=True,
            created_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        )
        db.add(admin)
        await db.commit()
        print(f"[Traffic] Default admin created. Username: admin / Password: {default_password}")
        print("[Traffic] CHANGE THIS PASSWORD immediately via the admin panel!")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (idempotent - safe to run every startup)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrate existing DBs: add can_upload_photo column if not present
        try:
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN can_upload_photo INTEGER NOT NULL DEFAULT 0"
            ))
        except Exception:
            pass  # Column already exists

    async with AsyncSessionLocal() as db:
        await _ensure_admin(db)

    print(f"[Traffic] Server started. Database: {settings.db_path}")
    yield
    await engine.dispose()


app = FastAPI(
    title="Traffic QR Scanner System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(scans.router)
app.include_router(users.router)
app.include_router(qr_devices.router)
app.include_router(patrol.router)


# Serve React frontend static files
def _get_static_dir() -> str | None:
    if getattr(sys, "frozen", False):
        # Running inside PyInstaller bundle
        return os.path.join(sys._MEIPASS, "static")
    # Development: look for frontend/dist relative to project root
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    dist = os.path.join(project_root, "frontend", "dist")
    if os.path.isdir(dist):
        return dist
    # Also check if static dir was copied here for build
    local_static = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
    if os.path.isdir(local_static):
        return local_static
    return None


_static_dir = _get_static_dir()

if _static_dir:
    assets_dir = os.path.join(_static_dir, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # API and auth routes handled above - this catches everything else
        index = os.path.join(_static_dir, "index.html")
        if os.path.isfile(index):
            return FileResponse(index)
        return {"message": "Frontend not built yet. Run: npm run build in frontend/"}
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return {"message": "Traffic API is running. Build the frontend to serve the web panel."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
    )
