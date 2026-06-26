import uuid
from datetime import datetime, timezone, timedelta
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.scan_log import ScanLog
from app.models.qr_device import QrDevice
from app.schemas.scan import ScanCreate, ScanRead, ScanPage

TZ7 = timezone(timedelta(hours=7))


def extract_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


async def create_scan(
    db: AsyncSession,
    payload: ScanCreate,
    username: str,
    ip: str,
) -> ScanLog:
    scan = ScanLog(
        id=uuid.uuid4().hex,
        username=username,
        qr_code_id=payload.qr_code_id,
        ip_address=ip,
        latitude=payload.latitude,
        longitude=payload.longitude,
        scanned_at=datetime.now(TZ7).strftime("%Y-%m-%d %H:%M:%S"),
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return scan


async def get_scans(
    db: AsyncSession,
    username: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> ScanPage:
    conditions = []
    if username:
        conditions.append(ScanLog.username == username)
    if date_from:
        conditions.append(ScanLog.scanned_at >= date_from)
    if date_to:
        date_to_end = date_to + " 23:59:59"
        conditions.append(ScanLog.scanned_at <= date_to_end)

    scan_base = (
        select(
            ScanLog.id,
            ScanLog.username,
            ScanLog.qr_code_id,
            ScanLog.ip_address,
            ScanLog.latitude,
            ScanLog.longitude,
            ScanLog.scanned_at,
            QrDevice.name.label("device_name"),
        )
        .select_from(ScanLog)
        .outerjoin(QrDevice, ScanLog.qr_code_id == QrDevice.qr_text)
    )

    if conditions:
        scan_base = scan_base.where(and_(*conditions))

    count_query = select(func.count()).select_from(scan_base.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    items_query = (
        scan_base
        .order_by(ScanLog.scanned_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(items_query)
    rows = result.mappings().all()

    return ScanPage(
        items=[ScanRead(**dict(row)) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )
