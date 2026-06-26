from pydantic import BaseModel, field_validator


class QrDeviceCreate(BaseModel):
    device_id: str
    name: str
    location: str
    notes: str | None = None
    qr_text: str

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


class QrDeviceRead(BaseModel):
    id: str
    device_id: str
    name: str
    location: str
    notes: str | None
    qr_text: str
    created_at: str

    model_config = {"from_attributes": True}
