from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    postgres_user: str = "vialibre"
    postgres_password: str = "vialibre_secret_dev"
    postgres_db: str = "vialibre"
    database_url: str = ""

    # JWT
    jwt_secret_key: str = "change-me-in-production-use-a-real-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # Service
    service_name: str = "auth-service"
    api_v1_prefix: str = "/api/v1/auth"
    schema_name: str = "vialibre_auth"

    model_config = {"env_file": ".env", "extra": "ignore"}

    def model_post_init(self, __context) -> None:
        if not self.database_url:
            self.database_url = (
                f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
                f"@postgres:5432/{self.postgres_db}"
            )


settings = Settings()
