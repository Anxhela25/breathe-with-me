from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterStartIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=200)  # checked before the code is sent, so it isn't sent for nothing


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=200)  # rules are checked in services/passwords.py
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")  # emailed by /auth/register/start
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
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=200)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    country_code: str | None
    chat_paused_until: datetime | None = None
    chat_checkin_due: bool = False


class SettingsIn(BaseModel):
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
