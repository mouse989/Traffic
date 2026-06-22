from pydantic import BaseModel, field_validator


class ScanCreate(BaseModel):
    qr_code_id: str
    latitude: float
    longitude: float

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not (-90 <= v <= 90):
            raise ValueError("latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not (-180 <= v <= 180):
            raise ValueError("longitude must be between -180 and 180")
        return v


class ScanRead(BaseModel):
    id: str
    username: str
    qr_code_id: str
    ip_address: str
    latitude: float
    longitude: float
    scanned_at: str

    model_config = {"from_attributes": True}


class ScanPage(BaseModel):
    items: list[ScanRead]
    total: int
    page: int
    page_size: int
