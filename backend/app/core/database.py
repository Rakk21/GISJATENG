from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings, SettingsConfigDict

# .env ada di backend/.env, tapi uvicorn bisa dijalankan dari root
_env_path = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    database_url: str
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 720

    model_config = SettingsConfigDict(
        env_file=str(_env_path),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()

engine = create_engine(
    settings.database_url,
    echo=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()