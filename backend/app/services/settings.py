from __future__ import annotations

from uuid import UUID

from app.models.clinic import Clinic
from app.repositories.clinic import ClinicRepository
from app.schemas.settings import ClinicSettingsUpdate
from app.services.audit import AuditLogService


from app.core.cache import clinic_cache


class SettingsValidationError(Exception):
    """Raised when validation fails for clinic settings updates."""


class SettingsNotFoundError(Exception):
    """Raised when a clinic resource is not found."""


class ClinicSettingsService:
    """Service managing clinic branding and configuration settings with audit trail."""

    clinic_repository: ClinicRepository
    audit_service: AuditLogService

    def __init__(
        self,
        clinic_repository: ClinicRepository,
        audit_service: AuditLogService,
    ) -> None:
        """Inject repository and audit service."""

        self.clinic_repository = clinic_repository
        self.audit_service = audit_service

    async def get_settings(self, clinic_id: UUID) -> Clinic:
        """Retrieve clinic settings and branding details."""

        cache_key = f"clinic_settings:{clinic_id}"
        cached = clinic_cache.get(cache_key)
        if cached is not None:
            return cached

        clinic = await self.clinic_repository.get_by_id(clinic_id)
        if clinic is None:
            raise SettingsNotFoundError(f"Clinic '{clinic_id}' not found.")
        clinic_cache.set(cache_key, clinic, ttl_seconds=300)
        return clinic

    async def update_settings(
        self,
        clinic_id: UUID,
        user_id: UUID,
        payload: ClinicSettingsUpdate,
    ) -> Clinic:
        """Update allowed clinic settings (name, logo, color) and log audit entry."""

        clinic = await self.get_settings(clinic_id)
        update_data = payload.model_dump(exclude_unset=True)

        if not update_data:
            return clinic

        updated_clinic = await self.clinic_repository.update(clinic, update_data)
        await self.clinic_repository.session.commit()
        clinic_cache.delete(f"clinic_settings:{clinic_id}")
        clinic_cache.delete(f"clinic_branding:{clinic_id}")


        # Record audit log event safely
        await self.audit_service.log_event(
            clinic_id=clinic_id,
            user_id=user_id,
            action="update",
            entity_type="clinic",
            entity_id=clinic.id,
            details=update_data,
        )

        return updated_clinic
