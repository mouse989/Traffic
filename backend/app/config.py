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
        """SQLite file path — only used when DATABASE_URL is not set."""
        custom = os.environ.get("DB_PATH")
        if custom:
            return custom
        data_dir = os.environ.get("DATA_DIR") or os.environ.get("VIBE_DATA_DIR")
        if data_dir:
            return os.path.join(data_dir, "traffic.db")
        if getattr(sys, "frozen", False):
            return os.path.join(os.path.dirname(sys.executable), "traffic.db")
        return os.path.join(os.getcwd(), "traffic.db")

    @property
    def database_url(self) -> str:
        """
        Supports PostgreSQL (Vibe hosting) and SQLite (local / binary).

        Set DATABASE_URL in environment for PostgreSQL:
          DATABASE_URL=postgresql://user:pass@host:5432/dbname
        Leave unset to use local SQLite (traffic.db).
        """
        url = os.environ.get("DATABASE_URL")
        if url:
            # Normalize to SQLAlchemy async driver URLs
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://") and "+asyncpg" not in url:
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif url.startswith("mysql://") and "+aiomysql" not in url:
                url = url.replace("mysql://", "mysql+aiomysql://", 1)
            return url
        return f"sqlite+aiosqlite:///{self.db_path}"

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgresql")

    @property
    def is_mysql(self) -> bool:
        return self.database_url.startswith("mysql")


settings = Settings()
