from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


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
