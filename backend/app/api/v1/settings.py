from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_async_session,
    get_current_clinic,
    get_current_user,
    require_capability,
)
from app.enums.permission import CapabilityScope
from app.models.clinic import Clinic
from app.models.user import User
from app.repositories.audit import AuditLogRepository
from app.repositories.clinic import ClinicRepository
from app.schemas.settings import ClinicSettingsResponse, ClinicSettingsUpdate
from app.services.audit import AuditLogService
from app.services.settings import (
    ClinicSettingsService,
    SettingsNotFoundError,
    SettingsValidationError,
)

router = APIRouter()


async def get_settings_service(
    session: AsyncSession = Depends(get_async_session),
) -> ClinicSettingsService:
    """Inject ClinicSettingsService bound to async session."""

    audit_service = AuditLogService(audit_repository=AuditLogRepository(session))
    return ClinicSettingsService(
        clinic_repository=ClinicRepository(session),
        audit_service=audit_service,
    )


SettingsServiceDep = Annotated[ClinicSettingsService, Depends(get_settings_service)]
CurrentClinicDep = Annotated[Clinic, Depends(get_current_clinic)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.get("/settings/clinic", response_model=ClinicSettingsResponse)
async def get_clinic_settings(
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: SettingsServiceDep,
) -> ClinicSettingsResponse:
    """Retrieve clinic branding and configuration settings."""

    try:
        clinic_record = await service.get_settings(clinic.id)
        return ClinicSettingsResponse.model_validate(clinic_record)
    except SettingsNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.patch("/settings/clinic", response_model=ClinicSettingsResponse)
async def update_clinic_settings(
    payload: ClinicSettingsUpdate,
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: SettingsServiceDep,
    scope: CapabilityScope = Depends(require_capability("settings.edit")),
) -> ClinicSettingsResponse:
    """Update clinic branding settings (admin only)."""

    try:
        updated_clinic = await service.update_settings(clinic.id, user.id, payload)
        return ClinicSettingsResponse.model_validate(updated_clinic)
    except SettingsNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except SettingsValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
