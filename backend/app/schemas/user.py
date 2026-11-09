from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=200)  # rules are checked in services/passwords.py
    is_adult: bool
    health_data_consent: bool

    @field_validator("is_adult", "health_data_consent")
    @classmethod
    def must_be_true(cls, value: bool) -> bool:
        if not value:
            raise ValueError("required to create an account")
        return value


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    password: str = Field(max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    save_chat_texts: bool
    country_code: str | None


class SettingsIn(BaseModel):
    save_chat_texts: bool | None = None
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
