from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://localhost:5432/breathe_with_me"
    jwt_secret: str = "dev-only-secret"
    jwt_expire_minutes: int = 60 * 24 * 7
    cors_origins: list[str] = ["http://localhost:5173"]

    # providers without a key are skipped
    groq_api_key: str = ""
    groq_models: list[str] = ["qwen/qwen3.8-27b", "openai/gpt-oss-20b"]  # in fallback order
    gemini_api_key: str = ""
    # gemini-3.8-flash was too slow; flash-lite answers in ~1s
    gemini_model: str = "gemini-3.5-flash-lite"
    ai_timeout_seconds: float = 8.0
    chat_max_user_messages: int = 6

    check_breached_passwords: bool = True  # Have I Been Pwned range API

    # without a key, emails are written to the server log instead of being sent
    resend_api_key: str = ""
    email_from: str = "Breathe With Me <onboarding@resend.dev>"


settings = Settings()
