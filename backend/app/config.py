from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://localhost:5432/breathe_with_me"
    jwt_secret: str = "dev-only-secret"
    # short access token + refresh token, see services/tokens.py
    access_token_minutes: int = 60
    refresh_token_days: int = 90
    # set to 1 in .env to test expiry quickly
    refresh_token_minutes: int | None = None
    cors_origins: list[str] = ["http://localhost:5173"]
    log_level: str = "INFO"

    groq_api_key: str = ""
    # fallback order. gpt-oss-20b first, it's ~10x cheaper than the Qwen preview
    groq_models: list[str] = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
    gemini_api_key: str = ""
    # gemini-3.8-flash was too slow
    gemini_model: str = "gemini-3.5-flash-lite"
    ai_attempt_seconds: float = 4.0
    ai_total_seconds: float = 10.0  # risk check + reply together, then the fixed message
    chat_max_user_messages: int = 6
    # chat pause after a crisis message (24h)
    # set CHAT_PAUSE_MINUTES=3 in .env to test
    chat_pause_minutes: int = 24 * 60

    check_breached_passwords: bool = True  # HIBP range API
    check_email_domain: bool = True  # check the email domain has MX records

    # order: Brevo, Gmail, Resend. none set = emails go to the log
    # Render free plan blocks Gmail SMTP, use Brevo or Resend there
    brevo_api_key: str = ""
    brevo_sender: str = ""  # sender address verified in Brevo
    gmail_address: str = ""
    gmail_app_password: str = ""
    resend_api_key: str = ""
    email_from: str = "Breathe With Me <onboarding@resend.dev>"

    @field_validator("database_url")
    @classmethod
    def _psycopg_driver(cls, url: str) -> str:
        # Neon/Render give postgresql://, we need the psycopg 3 driver
        for prefix in ("postgresql://", "postgres://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url


settings = Settings()
