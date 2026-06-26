import uuid
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, Role
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.auth_service import hash_password, get_user_by_username

router = APIRouter(prefix="/api/users", tags=["users"])

TZ7 = timezone(timedelta(hours=7))


@router.get("", response_model=list[UserRead])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [UserRead.model_validate(u) for u in result.scalars().all()]


@router.post("", response_model=UserRead, status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    existing = await get_user_by_username(db, body.username)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    user = User(
        id=uuid.uuid4().hex,
        username=body.username,
        password_hash=hash_password(body.password),
        role=body.role,
        is_active=True,
        can_upload_photo=body.can_upload_photo,
        can_access_qr_devices=body.can_access_qr_devices,
        can_access_patrol=body.can_access_patrol,
        can_access_dashboard=body.can_access_dashboard,
        created_at=datetime.now(TZ7).strftime("%Y-%m-%d %H:%M:%S"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.is_active is not None:
        if user.id == current_user.id and not body.is_active:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        user.is_active = body.is_active
    if body.can_upload_photo is not None:
        user.can_upload_photo = body.can_upload_photo
    if body.can_access_qr_devices is not None:
        user.can_access_qr_devices = body.can_access_qr_devices
    if body.can_access_patrol is not None:
        user.can_access_patrol = body.can_access_patrol
    if body.can_access_dashboard is not None:
        user.can_access_dashboard = body.can_access_dashboard

    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temp_password = secrets.token_urlsafe(10)
    user.password_hash = hash_password(temp_password)
    await db.commit()
    return {"temp_password": temp_password, "message": "Password reset. User must change it on next login."}
