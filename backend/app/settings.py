import os
import warnings
from dataclasses import dataclass


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_env: str
    debug: bool
    secret_key: str
    access_token_expire_minutes: int
    database_url: str
    redis_url: str
    cors_allowed_origins: list[str]
    db_auto_create: bool


def _load_settings() -> Settings:
    app_env = os.getenv("APP_ENV", os.getenv("ENV", "development")).strip().lower() or "development"
    debug = _parse_bool(os.getenv("DEBUG"), default=app_env != "production")

    secret_key = (os.getenv("SECRET_KEY") or "").strip()
    if not secret_key:
        if app_env == "production":
            raise RuntimeError("SECRET_KEY is required when APP_ENV=production")
        secret_key = "dev-insecure-secret-key-change-me"
        warnings.warn("SECRET_KEY is not set. Using insecure development fallback.", stacklevel=2)

    access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7)))
    database_url = os.getenv("DATABASE_URL", "sqlite:///./streams.db")
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")

    default_dev_origins = "http://localhost:5173,http://127.0.0.1:5173"
    cors_allowed_origins = _parse_csv(os.getenv("CORS_ALLOWED_ORIGINS", default_dev_origins))
    if not cors_allowed_origins:
        raise RuntimeError("CORS_ALLOWED_ORIGINS must contain at least one origin")
    if "*" in cors_allowed_origins:
        raise RuntimeError("CORS_ALLOWED_ORIGINS cannot contain '*' when credentials are enabled")

    db_auto_create = _parse_bool(os.getenv("DB_AUTO_CREATE"), default=False)
    if db_auto_create and app_env == "production":
        raise RuntimeError("DB_AUTO_CREATE must be disabled in production")

    return Settings(
        app_env=app_env,
        debug=debug,
        secret_key=secret_key,
        access_token_expire_minutes=access_token_expire_minutes,
        database_url=database_url,
        redis_url=redis_url,
        cors_allowed_origins=cors_allowed_origins,
        db_auto_create=db_auto_create,
    )


settings = _load_settings()
