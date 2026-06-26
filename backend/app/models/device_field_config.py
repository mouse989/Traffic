import uuid
from sqlalchemy import String, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class DeviceFieldConfig(Base):
    __tablename__ = "device_field_configs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    field_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
