import json
from pydantic import BaseModel, field_validator, model_validator


class QrDeviceCreate(BaseModel):
    device_id: str
    name: str
    location: str
    notes: str | None = None
    qr_text: str
    device_type: str | None = None
    extra_data: dict | None = None

    @field_validator("device_id", "name", "location", "qr_text")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()


class QrDeviceUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    notes: str | None = None
    qr_text: str | None = None
    device_type: str | None = None
    extra_data: dict | None = None


class QrDeviceRead(BaseModel):
    id: str
    device_id: str
    name: str
    location: str
    notes: str | None
    qr_text: str
    device_type: str | None = None
    extra_data: dict | None = None
    created_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_extra_data(cls, data):
        if hasattr(data, "__dict__") or hasattr(data, "_asdict"):
            # ORM object — access attribute
            raw = getattr(data, "extra_data", None)
            if isinstance(raw, str):
                try:
                    parsed = json.loads(raw)
                except Exception:
                    parsed = None
                # Build a plain dict for pydantic
                return {
                    "id": data.id,
                    "device_id": data.device_id,
                    "name": data.name,
                    "location": data.location,
                    "notes": data.notes,
                    "qr_text": data.qr_text,
                    "device_type": data.device_type,
                    "extra_data": parsed,
                    "created_at": data.created_at,
                }
        return data
