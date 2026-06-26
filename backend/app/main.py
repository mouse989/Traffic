import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.models import user, scan_log, qr_device, device_field_config  # noqa: F401 – register tables
from app.routers import auth, scans, users, qr_devices, patrol, device_fields

TZ7 = timezone(timedelta(hours=7))


async def _ensure_admin(db):
    """Create default admin on first run if no users exist."""
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
            can_upload_photo=False,
            can_access_qr_devices=False,
            can_access_patrol=False,
            created_at=datetime.now(TZ7).strftime("%Y-%m-%d %H:%M:%S"),
        )
        db.add(admin)
        await db.commit()
        print(f"[Traffic] Default admin created. Username: admin / Password: {default_password}")
        print("[Traffic] CHANGE THIS PASSWORD immediately via the admin panel!")


async def _run_migrations(conn):
    """
    Safe migrations for rolling deployments.

    PostgreSQL (Vibe hosting): uses ADD COLUMN IF NOT EXISTS — safe to run multiple times.
    SQLite (local / binary):   detects old CHECK constraint and recreates table if needed.
    """
    dialect = conn.dialect.name  # 'sqlite' or 'postgresql'

    if dialect == "postgresql":
        await _run_migrations_postgres(conn)
    else:
        await _run_migrations_sqlite(conn)


async def _run_migrations_postgres(conn):
    """PostgreSQL: add missing columns safely with IF NOT EXISTS."""
    user_cols = [
        ("can_upload_photo",       "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("can_access_qr_devices",  "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("can_access_patrol",      "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("can_access_dashboard",   "BOOLEAN NOT NULL DEFAULT FALSE"),
    ]
    for col, typedef in user_cols:
        await conn.execute(text(
            f"ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS {col} {typedef}"
        ))

    device_cols = [
        ("device_type", "TEXT"),
        ("extra_data",  "TEXT"),
    ]
    for col, typedef in device_cols:
        await conn.execute(text(
            f"ALTER TABLE IF EXISTS qr_devices ADD COLUMN IF NOT EXISTS {col} {typedef}"
        ))


async def _run_migrations_sqlite(conn):
    """SQLite: handle old CHECK constraint + add missing columns."""
    result = await conn.execute(
        text("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
    )
    users_sql = result.scalar() or ""

    old_role_constraint = "CHECK" in users_sql and "GIAM_SAT" not in users_sql

    if old_role_constraint:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS _users_tmp (
                id VARCHAR(32) NOT NULL,
                username VARCHAR(50) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                can_upload_photo INTEGER NOT NULL DEFAULT 0,
                can_access_qr_devices INTEGER NOT NULL DEFAULT 0,
                can_access_patrol INTEGER NOT NULL DEFAULT 0,
                can_access_dashboard INTEGER NOT NULL DEFAULT 0,
                created_at VARCHAR(32) NOT NULL,
                PRIMARY KEY (id)
            )
        """))
        try:
            await conn.execute(text("""
                INSERT OR IGNORE INTO _users_tmp
                    (id, username, password_hash, role, is_active, can_upload_photo, created_at)
                SELECT id, username, password_hash, role, is_active,
                       COALESCE(can_upload_photo, 0), created_at
                FROM users
            """))
        except Exception:
            await conn.execute(text("""
                INSERT OR IGNORE INTO _users_tmp
                    (id, username, password_hash, role, is_active, created_at)
                SELECT id, username, password_hash, role, is_active, created_at
                FROM users
            """))
        await conn.execute(text("DROP TABLE IF EXISTS users"))
        await conn.execute(text("ALTER TABLE _users_tmp RENAME TO users"))
        await conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)"
        ))
        print("[Traffic] DB migration: users table updated (GIAM_SAT role + permission columns)")
    else:
        for col_sql in [
            "ALTER TABLE users ADD COLUMN can_upload_photo INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN can_access_qr_devices INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN can_access_patrol INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN can_access_dashboard INTEGER NOT NULL DEFAULT 0",
        ]:
            try:
                await conn.execute(text(col_sql))
            except Exception:
                pass

    for col_sql in [
        "ALTER TABLE qr_devices ADD COLUMN device_type TEXT",
        "ALTER TABLE qr_devices ADD COLUMN extra_data TEXT",
    ]:
        try:
            await conn.execute(text(col_sql))
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        # Create any missing tables (idempotent)
        await conn.run_sync(Base.metadata.create_all)
        # Apply rolling migrations for existing databases
        await _run_migrations(conn)

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
app.include_router(device_fields.router)


# Serve React frontend static files
def _get_static_dir() -> str | None:
    if getattr(sys, "frozen", False):
        return os.path.join(sys._MEIPASS, "static")
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    dist = os.path.join(project_root, "frontend", "dist")
    if os.path.isdir(dist):
        return dist
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
    uvicorn.run(app, host=settings.HOST, port=settings.PORT, reload=False)
