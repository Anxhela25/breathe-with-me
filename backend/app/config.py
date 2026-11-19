from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://localhost:5432/breathe_with_me"
    jwt_secret: str = "dev-only-secret"
    # login keys (services/tokens.py): a short access key and a refresh key renewed on every use
    access_token_minutes: int = 60
    refresh_token_days: int = 90
    # only for testing: REFRESH_TOKEN_MINUTES=1 in .env makes the login run out after 1 minute unused
    refresh_token_minutes: int | None = None
    cors_origins: list[str] = ["http://localhost:5173"]
    log_level: str = "INFO"  # DEBUG shows more while looking for a bug

    # providers without a key are skipped
    groq_api_key: str = ""
    # in fallback order. gpt-oss-20b first: a production model and ~10x cheaper than the Qwen preview
    groq_models: list[str] = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
    gemini_api_key: str = ""
    # gemini-3.8-flash was too slow; flash-lite answers in ~1s
    gemini_model: str = "gemini-3.5-flash-lite"
    ai_attempt_seconds: float = 4.0  # one call to one model
    ai_total_seconds: float = 10.0  # risk check and reply together; after that, the fixed calm message
    chat_max_user_messages: int = 6
    # after a crisis message the AI chat pauses this long (24 hours), whatever the app does.
    # CHAT_PAUSE_MINUTES=3 in .env makes it short while testing
    chat_pause_minutes: int = 24 * 60

    check_breached_passwords: bool = True  # Have I Been Pwned range API
    check_email_domain: bool = True  # sign-up email domain must have mail servers (DNS lookup)

    # Brevo is used when set, then Gmail, then Resend; with none, emails are written to the server log.
    # On Render's free plan only Brevo and Resend work: it blocks Gmail's SMTP ports
    brevo_api_key: str = ""
    brevo_sender: str = ""  # the address verified in Brevo, e.g. your Gmail
    gmail_address: str = ""
    gmail_app_password: str = ""
    resend_api_key: str = ""
    email_from: str = "Breathe With Me <onboarding@resend.dev>"

    @field_validator("database_url")
    @classmethod
    def _psycopg_driver(cls, url: str) -> str:
        # Neon and Render give postgresql://..., SQLAlchemy needs to be told to use psycopg 3
        for prefix in ("postgresql://", "postgres://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url


settings = Settings()
