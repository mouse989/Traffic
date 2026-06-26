import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, Role
from app.models.qr_device import QrDevice
from app.schemas.qr_device import QrDeviceCreate, QrDeviceUpdate, QrDeviceRead

router = APIRouter(prefix="/api/qr-devices", tags=["qr-devices"])

_admin = Depends(require_role(Role.ADMIN))


@router.get("", response_model=list[QrDeviceRead])
async def list_devices(
    db: AsyncSession = Depends(get_db),
    _: User = _admin,
):
    result = await db.execute(select(QrDevice).order_by(QrDevice.device_id))
    return [QrDeviceRead.model_validate(d) for d in result.scalars().all()]


@router.post("", response_model=QrDeviceRead, status_code=201)
async def create_device(
    body: QrDeviceCreate,
    db: AsyncSession = Depends(get_db),
    _: User = _admin,
):
    existing = await db.execute(select(QrDevice).where(QrDevice.device_id == body.device_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Mã thiết bị '{body.device_id}' đã tồn tại")
    device = QrDevice(**body.model_dump())
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return QrDeviceRead.model_validate(device)


@router.put("/{device_pk}", response_model=QrDeviceRead)
async def update_device(
    device_pk: str,
    body: QrDeviceUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = _admin,
):
    device = await db.get(QrDevice, device_pk)
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(device, field, value)
    await db.commit()
    await db.refresh(device)
    return QrDeviceRead.model_validate(device)


@router.delete("/{device_pk}", status_code=204)
async def delete_device(
    device_pk: str,
    db: AsyncSession = Depends(get_db),
    _: User = _admin,
):
    device = await db.get(QrDevice, device_pk)
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
    await db.delete(device)
    await db.commit()


@router.post("/import", response_model=dict)
async def import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = _admin,
):
    """Import devices from CSV. Expected columns: device_id,name,location,notes,qr_text"""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file .csv")

    content = await file.read()
    text = content.decode("utf-8-sig")  # handle BOM
    reader = csv.DictReader(io.StringIO(text))

    required_cols = {"device_id", "name", "location", "qr_text"}
    if not reader.fieldnames or not required_cols.issubset(set(reader.fieldnames)):
        raise HTTPException(
            status_code=400,
            detail=f"CSV thiếu cột bắt buộc. Cần có: {', '.join(sorted(required_cols))}",
        )

    created, skipped = 0, 0
    for row in reader:
        device_id = (row.get("device_id") or "").strip()
        name = (row.get("name") or "").strip()
        location = (row.get("location") or "").strip()
        qr_text = (row.get("qr_text") or "").strip()
        notes = (row.get("notes") or "").strip() or None

        if not device_id or not name or not location or not qr_text:
            skipped += 1
            continue

        existing = await db.execute(select(QrDevice).where(QrDevice.device_id == device_id))
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        db.add(QrDevice(device_id=device_id, name=name, location=location, notes=notes, qr_text=qr_text))
        created += 1

    await db.commit()
    return {"created": created, "skipped": skipped}
