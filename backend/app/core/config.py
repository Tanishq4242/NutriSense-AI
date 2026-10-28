from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), extra="ignore")

    firebase_project_id: str | None = None
    firebase_storage_bucket: str | None = None
    google_application_credentials: str | None = None
    firestore_emulator_host: str | None = None
    firebase_auth_emulator_host: str | None = None
    allowed_origins: str = "http://localhost:5173"
    max_image_bytes: int = 8 * 1024 * 1024
    food_model_path: str | None = None
    usda_fdc_api_key: str | None = None

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

