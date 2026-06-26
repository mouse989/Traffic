import uuid
from sqlalchemy import String, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class Role(str, enum.Enum):
    ADMIN = "ADMIN"
    GIAM_SAT = "GIAM_SAT"  # Supervisor — fine-grained module permissions
    STAFF = "STAFF"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # native_enum=False + create_constraint=False → plain VARCHAR, no CHECK constraint
    # This allows adding new enum values without DB migration
    role: Mapped[Role] = mapped_column(
        SAEnum(Role, native_enum=False, create_constraint=False),
        nullable=False,
        default=Role.STAFF,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_upload_photo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Supervisor module permissions (ignored for ADMIN/STAFF — ADMIN always has all)
    can_access_qr_devices: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_access_patrol: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_access_dashboard: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[str] = mapped_column(String(32), nullable=False)
