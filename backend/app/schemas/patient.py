from pydantic import BaseModel, ConfigDict, field_validator, ValidationInfo
import re
import uuid
from typing import Optional
from datetime import date, datetime

NAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 .'-]{0,99}$")
PHONE_PATTERN = re.compile(r"^[0-9]{10}$")


from app.enums.shared import Gender

class PatientBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    gender: Optional[Gender] = None
    chief_complaint: Optional[str] = None
    referral_source: Optional[str] = None
    status: Optional[str] = "active"
    age: Optional[int] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str, info: ValidationInfo) -> str:
        v = v.strip()
        if not v:
            if info.field_name == "last_name":
                return v
            raise ValueError("First name cannot be empty")
        if not NAME_PATTERN.match(v):
            raise ValueError(
                "Name may only contain letters, spaces, hyphens, apostrophes, and periods"
            )
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        cleaned = re.sub(r"[\s\-]", "", v.strip())
        match = re.match(r"^(?:\+91|91)?([0-9]{10})$", cleaned)
        if not match:
            raise ValueError("Phone number must be a valid 10-digit number (e.g. 9876543210 or +919876543210)")
        return match.group(1)

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def validate_dob(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            v = date.fromisoformat(v)
        if v > date.today():
            raise ValueError("Date of birth cannot be in the future")
        if v.year < date.today().year - 130:
            raise ValueError("Date of birth is not valid")
        return v

class PatientCreate(PatientBase):
    user_id: Optional[uuid.UUID] = None

class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    user_id: Optional[uuid.UUID] = None
    gender: Optional[Gender] = None
    chief_complaint: Optional[str] = None
    referral_source: Optional[str] = None
    status: Optional[str] = None
    age: Optional[int] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: Optional[str], info: ValidationInfo) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            if info.field_name == "last_name":
                return v
            raise ValueError("First name cannot be empty")
        if not NAME_PATTERN.match(v):
            raise ValueError(
                "Name may only contain letters, spaces, hyphens, apostrophes, and periods"
            )
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        cleaned = re.sub(r"[\s\-]", "", v.strip())
        match = re.match(r"^(?:\+91|91)?([0-9]{10})$", cleaned)
        if not match:
            raise ValueError("Phone number must be a valid 10-digit number (e.g. 9876543210 or +919876543210)")
        return match.group(1)

    @field_validator("date_of_birth", mode="before")   
    @classmethod
    def validate_dob(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            v = date.fromisoformat(v)
        if v > date.today():
            raise ValueError("Date of birth cannot be in the future")
        if v.year < date.today().year - 130:
            raise ValueError("Date of birth is not valid")
        return v


class PatientRead(PatientBase):
    id: uuid.UUID
    clinic_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
