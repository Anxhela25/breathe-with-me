import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

_PHONE = re.compile(r"^\+?[0-9 ()\-]{3,40}$")


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=3, max_length=40)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name is required")
        return value

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, value: str) -> str:
        value = value.strip()
        if not _PHONE.match(value) or sum(c.isdigit() for c in value) < 3:
            raise ValueError("use digits, spaces, +, - or brackets")
        return value


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
