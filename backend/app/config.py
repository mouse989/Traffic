import os
import sys
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    SECRET_KEY: str = "dev_secret_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def db_path(self) -> str:
        custom = os.environ.get("DB_PATH")
        if custom:
            return custom
        if getattr(sys, "frozen", False):
            return os.path.join(os.path.dirname(sys.executable), "traffic.db")
        return os.path.join(os.getcwd(), "traffic.db")

    @property
    def database_url(self) -> str:
        return f"sqlite+aiosqlite:///{self.db_path}"


settings = Settings()
