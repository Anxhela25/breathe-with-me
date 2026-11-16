from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://localhost:5432/breathe_with_me"
    jwt_secret: str = "dev-only-secret"
    jwt_expire_minutes: int = 60 * 24 * 7
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

    check_breached_passwords: bool = True  # Have I Been Pwned range API
    check_email_domain: bool = True  # sign-up email domain must have mail servers (DNS lookup)

    # Gmail is used when set, then Resend; with neither, emails are written to the server log
    gmail_address: str = ""
    gmail_app_password: str = ""
    resend_api_key: str = ""
    email_from: str = "Breathe With Me <onboarding@resend.dev>"


settings = Settings()
