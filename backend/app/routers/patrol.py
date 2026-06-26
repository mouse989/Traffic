from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, Role
from app.models.qr_device import QrDevice
from app.models.scan_log import ScanLog

router = APIRouter(prefix="/api/patrol", tags=["patrol"])

TZ7 = timezone(timedelta(hours=7))


class DeviceStatus(BaseModel):
    id: str
    device_id: str
    name: str
    location: str
    qr_text: str
    scanned: bool
    scan_count: int
    last_scanned_at: str | None


class PatrolStats(BaseModel):
    total_devices: int
    scanned_today: int
    scan_count_today: int
    devices: list[DeviceStatus]
    date: str


@router.get("/today", response_model=PatrolStats)
async def patrol_today(
    date: str | None = Query(default=None, description="YYYY-MM-DD (UTC+7). Defaults to today."),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    date_prefix = date if date else datetime.now(TZ7).strftime("%Y-%m-%d")

    # All devices
    devices_result = await db.execute(select(QrDevice).order_by(QrDevice.device_id))
    devices = devices_result.scalars().all()
    total_devices = len(devices)

    if total_devices == 0:
        return PatrolStats(total_devices=0, scanned_today=0, scan_count_today=0, devices=[], date=date_prefix)

    # Scan stats for the given date grouped by qr_code_id
    qr_texts = [d.qr_text for d in devices]
    date_end = date_prefix + " 23:59:59"
    stats_query = (
        select(
            ScanLog.qr_code_id,
            func.count(ScanLog.id).label("scan_count"),
            func.max(ScanLog.scanned_at).label("last_scanned_at"),
        )
        .where(
            and_(
                ScanLog.scanned_at >= date_prefix,
                ScanLog.scanned_at <= date_end,
                ScanLog.qr_code_id.in_(qr_texts),
            )
        )
        .group_by(ScanLog.qr_code_id)
    )
    stats_result = await db.execute(stats_query)
    scan_map: dict[str, tuple[int, str]] = {
        row.qr_code_id: (row.scan_count, row.last_scanned_at)
        for row in stats_result.all()
    }

    total_today_query = select(func.count(ScanLog.id)).where(
        and_(
            ScanLog.scanned_at >= date_prefix,
            ScanLog.scanned_at <= date_end,
            ScanLog.qr_code_id.in_(qr_texts),
        )
    )
    scan_count_today = (await db.execute(total_today_query)).scalar() or 0
    scanned_today = len(scan_map)

    device_statuses = [
        DeviceStatus(
            id=d.id,
            device_id=d.device_id,
            name=d.name,
            location=d.location,
            qr_text=d.qr_text,
            scanned=d.qr_text in scan_map,
            scan_count=scan_map.get(d.qr_text, (0, None))[0],
            last_scanned_at=scan_map.get(d.qr_text, (0, None))[1],
        )
        for d in devices
    ]

    return PatrolStats(
        total_devices=total_devices,
        scanned_today=scanned_today,
        scan_count_today=scan_count_today,
        devices=device_statuses,
        date=date_prefix,
    )
