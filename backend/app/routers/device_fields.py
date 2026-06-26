import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import require_qr_access
from app.models.user import User
from app.models.device_field_config import DeviceFieldConfig

router = APIRouter(prefix="/api/device-fields", tags=["device-fields"])
_qr = Depends(require_qr_access())


class FieldConfigCreate(BaseModel):
    field_name: str
    label: str
    required: bool = False
    sort_order: int = 0

    @field_validator("field_name")
    @classmethod
    def slug_only(cls, v: str) -> str:
        v = v.strip().lower().replace(" ", "_")
        if not v:
            raise ValueError("field_name cannot be empty")
        # Only allow alphanumeric and underscores
        if not all(c.isalnum() or c == "_" for c in v):
            raise ValueError("field_name must contain only letters, numbers, underscores")
        return v

    @field_validator("label")
    @classmethod
    def label_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("label cannot be empty")
        return v.strip()


class FieldConfigRead(BaseModel):
    id: str
    field_name: str
    label: str
    required: bool
    sort_order: int

    model_config = {"from_attributes": True}


@router.get("", response_model=list[FieldConfigRead])
async def list_fields(
    db: AsyncSession = Depends(get_db),
    _: User = _qr,
):
    result = await db.execute(
        select(DeviceFieldConfig).order_by(DeviceFieldConfig.sort_order, DeviceFieldConfig.field_name)
    )
    return [FieldConfigRead.model_validate(f) for f in result.scalars().all()]


@router.post("", response_model=FieldConfigRead, status_code=201)
async def create_field(
    body: FieldConfigCreate,
    db: AsyncSession = Depends(get_db),
    _: User = _qr,
):
    existing = await db.execute(
        select(DeviceFieldConfig).where(DeviceFieldConfig.field_name == body.field_name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Trường '{body.field_name}' đã tồn tại")
    f = DeviceFieldConfig(id=uuid.uuid4().hex, **body.model_dump())
    db.add(f)
    await db.commit()
    await db.refresh(f)
    return FieldConfigRead.model_validate(f)


@router.delete("/{field_id}", status_code=204)
async def delete_field(
    field_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = _qr,
):
    f = await db.get(DeviceFieldConfig, field_id)
    if not f:
        raise HTTPException(404, "Không tìm thấy trường cấu hình")
    await db.delete(f)
    await db.commit()
