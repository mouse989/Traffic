import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import require_qr_access, require_any_auth
from app.models.user import User
from app.models.qr_device import QrDevice
from app.models.device_field_config import DeviceFieldConfig
from app.schemas.qr_device import QrDeviceCreate, QrDeviceUpdate, QrDeviceRead

router = APIRouter(prefix="/api/qr-devices", tags=["qr-devices"])

_qr = Depends(require_qr_access())


@router.get("/by-qr")
async def lookup_device_by_qr(
    qr_text: str = Query(..., description="QR code text to look up"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_any_auth()),
):
    """Validate that a QR text exists in the device registry."""
    result = await db.execute(select(QrDevice).where(QrDevice.qr_text == qr_text))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Mã QR không hợp lệ hoặc chưa được đăng ký trong hệ thống")
    return {"device_id": device.device_id, "name": device.name, "location": device.location}


async def _get_custom_fields(db: AsyncSession) -> list[DeviceFieldConfig]:
    result = await db.execute(
        select(DeviceFieldConfig).order_by(DeviceFieldConfig.sort_order, DeviceFieldConfig.field_name)
    )
    return result.scalars().all()


@router.get("", response_model=list[QrDeviceRead])
async def list_devices(
    db: AsyncSession = Depends(get_db),
    _: User = _qr,
):
    result = await db.execute(select(QrDevice).order_by(QrDevice.device_id))
    return [QrDeviceRead.model_validate(d) for d in result.scalars().all()]


@router.post("", response_model=QrDeviceRead, status_code=201)
async def create_device(
    body: QrDeviceCreate,
    db: AsyncSession = Depends(get_db),
    _: User = _qr,
):
    existing = await db.execute(select(QrDevice).where(QrDevice.device_id == body.device_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Mã thiết bị '{body.device_id}' đã tồn tại")
    data = body.model_dump()
    extra = data.pop("extra_data", None)
    device = QrDevice(**data, extra_data=json.dumps(extra) if extra else None)
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return QrDeviceRead.model_validate(device)


@router.put("/{device_pk}", response_model=QrDeviceRead)
async def update_device(
    device_pk: str,
    body: QrDeviceUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = _qr,
):
    device = await db.get(QrDevice, device_pk)
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
    update_data = body.model_dump(exclude_none=True)
    if "extra_data" in update_data:
        update_data["extra_data"] = json.dumps(update_data["extra_data"]) if update_data["extra_data"] else None
    for field, value in update_data.items():
        setattr(device, field, value)
    await db.commit()
    await db.refresh(device)
    return QrDeviceRead.model_validate(device)


@router.delete("/{device_pk}", status_code=204)
async def delete_device(
    device_pk: str,
    db: AsyncSession = Depends(get_db),
    _: User = _qr,
):
    device = await db.get(QrDevice, device_pk)
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
    await db.delete(device)
    await db.commit()


@router.get("/import/template")
async def download_import_template(
    db: AsyncSession = Depends(get_db),
    _: User = _qr,
):
    """Download CSV template with headers based on current field config."""
    custom_fields = await _get_custom_fields(db)
    base_headers = ["device_id", "name", "location", "notes", "qr_text", "device_type"]
    custom_headers = [f.field_name for f in custom_fields]
    all_headers = base_headers + custom_headers

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(all_headers)
    # Sample row to show format
    sample = ["DEV-001", "Tên thiết bị", "Vị trí", "", "QR_TEXT_001", ""]
    sample += ["" for _ in custom_headers]
    writer.writerow(sample)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=qr-devices-template.csv"},
    )


@router.post("/import", response_model=dict)
async def import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = _qr,
):
    """Import devices from CSV. Required columns: device_id,name,location,qr_text"""
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

    custom_fields = await _get_custom_fields(db)
    custom_field_names = {f.field_name for f in custom_fields}

    created, skipped = 0, 0
    for row in reader:
        device_id = (row.get("device_id") or "").strip()
        name = (row.get("name") or "").strip()
        location = (row.get("location") or "").strip()
        qr_text = (row.get("qr_text") or "").strip()
        notes = (row.get("notes") or "").strip() or None
        device_type = (row.get("device_type") or "").strip() or None

        if not device_id or not name or not location or not qr_text:
            skipped += 1
            continue

        existing = await db.execute(select(QrDevice).where(QrDevice.device_id == device_id))
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        # Collect custom field values
        extra: dict = {}
        for fname in custom_field_names:
            val = (row.get(fname) or "").strip()
            if val:
                extra[fname] = val

        db.add(QrDevice(
            device_id=device_id,
            name=name,
            location=location,
            notes=notes,
            qr_text=qr_text,
            device_type=device_type,
            extra_data=json.dumps(extra) if extra else None,
        ))
        created += 1

    await db.commit()
    return {"created": created, "skipped": skipped}
