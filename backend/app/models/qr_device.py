import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

TZ7 = timezone(timedelta(hours=7))


class QrDevice(Base):
    __tablename__ = "qr_devices"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    device_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str] = mapped_column(String(300), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    qr_text: Mapped[str] = mapped_column(String(500), nullable=False)
    device_type: Mapped[str | None] = mapped_column(String(200), nullable=True)
    extra_data: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    created_at: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=lambda: datetime.now(TZ7).strftime("%Y-%m-%d %H:%M:%S"),
    )
