from __future__ import annotations

from enum import StrEnum
import logging
from types import MappingProxyType

logger = logging.getLogger(__name__)


class UserRole(StrEnum):
    """Application roles available to CRM users."""

    ADMIN = "admin"
    THERAPIST = "therapist"
    FRONT_DESK = "front_desk"
    PATIENT = "patient"


LEGACY_USER_ROLE_ALIASES = MappingProxyType(
    {
        "physio": UserRole.THERAPIST,
        "receptionist": UserRole.FRONT_DESK,
    }
)


def normalize_user_role(value: UserRole | str) -> UserRole:
    """Return the canonical CRM user role for SRS and AV Suite role values."""

    if isinstance(value, UserRole):
        return value

    normalized_value = value.strip().lower()
    try:
        return UserRole(normalized_value)
    except ValueError:
        legacy_role = LEGACY_USER_ROLE_ALIASES.get(normalized_value)
        if legacy_role is not None:
            logger.info(f"Normalized legacy role '{normalized_value}' to '{legacy_role}'")
            return legacy_role

    raise ValueError(f"Unsupported user role: {value}")
