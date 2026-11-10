from pathlib import Path

from pydantic_settings import BaseSettings

# .env compartido en la raiz del repo; en produccion las variables llegan del entorno.
ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    # Database
    postgres_user: str = "vialibre"
    postgres_password: str = "vialibre_secret_dev"
    postgres_db: str = "vialibre"
    database_url: str = ""

    # JWT (for token verification)
    jwt_secret_key: str = "change-me-in-production-use-a-real-secret"
    jwt_algorithm: str = "HS256"

    # Service
    service_name: str = "core-service"
    api_v1_prefix: str = "/api/v1/core"
    schema_name: str = "vialibre_core"

    # Internal service URLs
    auth_service_url: str = "http://localhost:8001"

    model_config = {"env_file": (ROOT_ENV, ".env"), "extra": "ignore"}

    def model_post_init(self, __context) -> None:
        if not self.database_url:
            self.database_url = (
                f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
                f"@localhost:5432/{self.postgres_db}"
            )
        else:
            if self.database_url.startswith("postgresql://"):
                self.database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif self.database_url.startswith("postgres://"):
                self.database_url = self.database_url.replace("postgres://", "postgresql+asyncpg://", 1)
            if "sslmode=" in self.database_url:
                self.database_url = self.database_url.replace("sslmode=require", "ssl=require")
            if "channel_binding=" in self.database_url:
                self.database_url = self.database_url.replace("&channel_binding=require", "").replace("channel_binding=require", "")


settings = Settings()
