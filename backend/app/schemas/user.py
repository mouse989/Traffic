from pydantic import BaseModel
from app.models.user import Role


class UserCreate(BaseModel):
    username: str
    password: str
    role: Role = Role.STAFF
    can_upload_photo: bool = False


class UserRead(BaseModel):
    id: str
    username: str
    role: Role
    is_active: bool
    can_upload_photo: bool
    created_at: str

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    is_active: bool | None = None
    can_upload_photo: bool | None = None


class PasswordReset(BaseModel):
    new_password: str
