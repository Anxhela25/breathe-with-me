import phonenumbers
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=3, max_length=40)  # international format, e.g. +355691234567

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
        try:
            number = phonenumbers.parse(value.strip(), None)
        except phonenumbers.NumberParseException:
            raise ValueError("include the country code, e.g. +355") from None
        if not phonenumbers.is_valid_number(number):
            raise ValueError("this is not a valid number for that country")
        return phonenumbers.format_number(number, phonenumbers.PhoneNumberFormat.E164)


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
