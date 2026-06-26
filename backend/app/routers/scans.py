from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role, require_dashboard_access
from app.models.user import User, Role
from app.schemas.scan import ScanCreate, ScanRead, ScanPage
from app.services.scan_service import create_scan, extract_client_ip, get_scans

router = APIRouter(prefix="/api", tags=["scans"])


@router.post("/scan", response_model=ScanRead, status_code=201)
async def submit_scan(
    body: ScanCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN, Role.STAFF, Role.GIAM_SAT)),
):
    ip = extract_client_ip(request)
    scan = await create_scan(db, body, current_user.username, ip)
    return ScanRead.model_validate(scan)


@router.get("/scans", response_model=ScanPage)
async def list_scans(
    username: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_dashboard_access()),
):
    return await get_scans(db, username, date_from, date_to, page, page_size)
