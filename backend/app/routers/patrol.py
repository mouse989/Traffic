import csv
import io
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.dependencies import require_patrol_access
from app.models.user import User
from app.models.qr_device import QrDevice
from app.models.scan_log import ScanLog

router = APIRouter(prefix="/api/patrol", tags=["patrol"])

TZ7 = timezone(timedelta(hours=7))


class DeviceStatus(BaseModel):
    id: str
    device_id: str
    name: str
    location: str
    device_type: str | None
    qr_text: str
    scanned: bool
    scan_count: int
    last_scanned_at: str | None


class DeviceTypeStats(BaseModel):
    device_type: str
    total: int
    scanned: int
    not_scanned: int


class UserScanStats(BaseModel):
    username: str
    unique_devices: int
    total_scans: int


class PatrolStats(BaseModel):
    total_devices: int
    scanned_today: int
    scan_count_today: int
    devices: list[DeviceStatus]
    device_type_stats: list[DeviceTypeStats]
    user_stats: list[UserScanStats]
    date: str


async def _get_patrol_stats(db: AsyncSession, date_prefix: str) -> PatrolStats:
    date_end = date_prefix + " 23:59:59"

    devices_result = await db.execute(select(QrDevice).order_by(QrDevice.device_id))
    devices = devices_result.scalars().all()
    total_devices = len(devices)

    if total_devices == 0:
        return PatrolStats(
            total_devices=0, scanned_today=0, scan_count_today=0,
            devices=[], device_type_stats=[], user_stats=[], date=date_prefix,
        )

    qr_texts = [d.qr_text for d in devices]

    # Scan stats per device
    stats_query = (
        select(
            ScanLog.qr_code_id,
            func.count(ScanLog.id).label("scan_count"),
            func.max(ScanLog.scanned_at).label("last_scanned_at"),
        )
        .where(and_(
            ScanLog.scanned_at >= date_prefix,
            ScanLog.scanned_at <= date_end,
            ScanLog.qr_code_id.in_(qr_texts),
        ))
        .group_by(ScanLog.qr_code_id)
    )
    scan_map: dict[str, tuple[int, str | None]] = {
        row.qr_code_id: (row.scan_count, row.last_scanned_at)
        for row in (await db.execute(stats_query)).all()
    }

    total_today_query = select(func.count(ScanLog.id)).where(and_(
        ScanLog.scanned_at >= date_prefix,
        ScanLog.scanned_at <= date_end,
        ScanLog.qr_code_id.in_(qr_texts),
    ))
    scan_count_today = (await db.execute(total_today_query)).scalar() or 0
    scanned_today = len(scan_map)

    device_statuses = [
        DeviceStatus(
            id=d.id,
            device_id=d.device_id,
            name=d.name,
            location=d.location,
            device_type=d.device_type,
            qr_text=d.qr_text,
            scanned=d.qr_text in scan_map,
            scan_count=scan_map.get(d.qr_text, (0, None))[0],
            last_scanned_at=scan_map.get(d.qr_text, (0, None))[1],
        )
        for d in devices
    ]

    # Device type KPI breakdown
    type_buckets: dict[str, list[DeviceStatus]] = {}
    for ds in device_statuses:
        key = ds.device_type or "Chưa phân loại"
        type_buckets.setdefault(key, []).append(ds)
    device_type_stats = [
        DeviceTypeStats(
            device_type=dtype,
            total=len(lst),
            scanned=sum(1 for d in lst if d.scanned),
            not_scanned=sum(1 for d in lst if not d.scanned),
        )
        for dtype, lst in sorted(type_buckets.items())
    ]

    # User scan stats
    user_stats_query = (
        select(
            ScanLog.username,
            func.count(ScanLog.qr_code_id.distinct()).label("unique_devices"),
            func.count(ScanLog.id).label("total_scans"),
        )
        .where(and_(
            ScanLog.scanned_at >= date_prefix,
            ScanLog.scanned_at <= date_end,
            ScanLog.qr_code_id.in_(qr_texts),
        ))
        .group_by(ScanLog.username)
        .order_by(func.count(ScanLog.id).desc())
    )
    user_stats = [
        UserScanStats(username=row.username, unique_devices=row.unique_devices, total_scans=row.total_scans)
        for row in (await db.execute(user_stats_query)).all()
    ]

    return PatrolStats(
        total_devices=total_devices,
        scanned_today=scanned_today,
        scan_count_today=scan_count_today,
        devices=device_statuses,
        device_type_stats=device_type_stats,
        user_stats=user_stats,
        date=date_prefix,
    )


@router.get("/today", response_model=PatrolStats)
async def patrol_today(
    date: str | None = Query(default=None, description="YYYY-MM-DD (UTC+7). Defaults to today."),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_patrol_access()),
):
    date_prefix = date if date else datetime.now(TZ7).strftime("%Y-%m-%d")
    return await _get_patrol_stats(db, date_prefix)


@router.get("/today/export")
async def export_patrol_csv(
    date: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_patrol_access()),
):
    """Export patrol data for a given date as CSV."""
    date_prefix = date if date else datetime.now(TZ7).strftime("%Y-%m-%d")
    stats = await _get_patrol_stats(db, date_prefix)

    output = io.StringIO()
    writer = csv.writer(output)

    # Device list section
    writer.writerow(["=== DANH SÁCH THIẾT BỊ ===", f"Ngày: {date_prefix}"])
    writer.writerow(["Mã TB", "Tên thiết bị", "Loại thiết bị", "Vị trí", "Trạng thái", "Số lần quét", "Lần quét cuối"])
    for d in stats.devices:
        writer.writerow([
            d.device_id, d.name, d.device_type or "", d.location,
            "Đã quét" if d.scanned else "Chưa quét",
            d.scan_count, d.last_scanned_at or "",
        ])

    writer.writerow([])
    # User stats section
    writer.writerow(["=== THỐNG KÊ NGƯỜI DÙNG ==="])
    writer.writerow(["Người dùng", "Thiết bị đã quét", "Tổng lần quét"])
    for u in stats.user_stats:
        writer.writerow([u.username, u.unique_devices, u.total_scans])

    writer.writerow([])
    # Summary
    writer.writerow(["=== TỔNG KẾT ==="])
    writer.writerow(["Tổng thiết bị", "Đã quét", "Chưa quét", "Tổng lần quét"])
    writer.writerow([
        stats.total_devices, stats.scanned_today,
        stats.total_devices - stats.scanned_today, stats.scan_count_today,
    ])

    output.seek(0)
    filename = f"tuan-tra-{date_prefix}.csv"
    return StreamingResponse(
        iter(["﻿" + output.getvalue()]),  # BOM for Excel UTF-8 compatibility
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
