from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, Role
from app.services.auth_service import decode_access_token, get_user_by_username

security = HTTPBearer()


async def _get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = await get_user_by_username(db, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_role(*allowed_roles: Role):
    async def dependency(user: User = Depends(_get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return dependency


def require_qr_access():
    """Allow ADMIN always; GIAM_SAT only when can_access_qr_devices=True."""
    async def dependency(user: User = Depends(_get_current_user)) -> User:
        if user.role == Role.ADMIN:
            return user
        if user.role == Role.GIAM_SAT and user.can_access_qr_devices:
            return user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền quản lý QR")
    return dependency


def require_patrol_access():
    """Allow ADMIN always; GIAM_SAT only when can_access_patrol=True."""
    async def dependency(user: User = Depends(_get_current_user)) -> User:
        if user.role == Role.ADMIN:
            return user
        if user.role == Role.GIAM_SAT and user.can_access_patrol:
            return user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem tuần tra")
    return dependency
