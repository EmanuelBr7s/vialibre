from pydantic_settings import BaseSettings


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

    model_config = {"env_file": ".env", "extra": "ignore"}

    def model_post_init(self, __context) -> None:
        if not self.database_url:
            self.database_url = (
                f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
                f"@postgres:5432/{self.postgres_db}"
            )


settings = Settings()
