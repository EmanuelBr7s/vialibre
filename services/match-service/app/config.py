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
    service_name: str = "match-service"
    api_v1_prefix: str = "/api/v1/match"
    schema_name: str = "vialibre_match"

    # Internal service URLs
    auth_service_url: str = "http://localhost:8001"
    core_service_url: str = "http://localhost:8002"

    model_config = {"env_file": (ROOT_ENV, ".env"), "extra": "ignore"}

    def model_post_init(self, __context) -> None:
        if not self.database_url:
            self.database_url = (
                f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
                f"@localhost:5432/{self.postgres_db}"
            )


settings = Settings()
