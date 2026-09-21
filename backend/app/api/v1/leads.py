from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_async_session,
    get_current_clinic,
    get_current_user,
    require_capability,
)
from app.enums.permission import CapabilityScope
from app.enums.lead import LeadStage
from app.enums.user import UserRole
from app.models.clinic import Clinic
from app.models.user import User
from app.repositories.lead import LeadRepository
from app.repositories.patient import PatientRepository
from app.repositories.user import UserRepository
from app.schemas.lead import (
    LeadConvertResponse,
    LeadCreate,
    LeadListResponse,
    LeadResponse,
    LeadUpdate,
)
from app.services.lead import LeadNotFoundError, LeadService, LeadValidationError

router = APIRouter()


async def get_lead_service(
    session: AsyncSession = Depends(get_async_session),
) -> LeadService:
    """Inject LeadService with session-bound repositories."""

    return LeadService(
        lead_repository=LeadRepository(session),
        patient_repository=PatientRepository(session),
        user_repository=UserRepository(session),
    )


LeadServiceDep = Annotated[LeadService, Depends(get_lead_service)]
CurrentClinicDep = Annotated[Clinic, Depends(get_current_clinic)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


# --- Lead Endpoints ---


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: LeadServiceDep,
    scope: CapabilityScope = Depends(require_capability("leads.create")),
) -> LeadResponse:
    """Create a new sales lead for the authenticated clinic."""

    # Auto-fill assigned_to from the authenticated user when not provided
    if payload.assigned_to is None:
        payload.assigned_to = user.id

    try:
        lead = await service.create_lead(clinic.id, payload)
        return LeadResponse.model_validate(lead)
    except LeadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.get("", response_model=LeadListResponse)
async def list_leads(
    clinic: CurrentClinicDep,
    service: LeadServiceDep,
    scope: CapabilityScope = Depends(require_capability("leads.view")),
    stage: Annotated[LeadStage | None, Query(alias="stage")] = None,
    assigned_to: Annotated[UUID | None, Query(alias="assigned_to")] = None,
    source: Annotated[str | None, Query(alias="source")] = None,
    search: Annotated[str | None, Query(alias="search")] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> LeadListResponse:
    """List leads for the authenticated clinic with stage, assignee, source, and search filters."""

    leads = await service.list_leads(
        clinic.id,
        stage=stage,
        assigned_to=assigned_to,
        source=source,
        search=search,
        offset=offset,
        limit=limit,
    )
    total = await service.count_leads(
        clinic.id,
        stage=stage,
        assigned_to=assigned_to,
        source=source,
        search=search,
    )
    items = [LeadResponse.model_validate(ld) for ld in leads]
    return LeadListResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{id}", response_model=LeadResponse)
async def get_lead(
    id: UUID,
    clinic: CurrentClinicDep,
    service: LeadServiceDep,
    scope: CapabilityScope = Depends(require_capability("leads.view")),
) -> LeadResponse:
    """Retrieve details for a single lead by ID."""

    try:
        lead = await service.get_lead(clinic.id, id)
        return LeadResponse.model_validate(lead)
    except LeadNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.patch("/{id}", response_model=LeadResponse)
async def update_lead(
    id: UUID,
    payload: LeadUpdate,
    clinic: CurrentClinicDep,
    service: LeadServiceDep,
    scope: CapabilityScope = Depends(require_capability("leads.edit")),
) -> LeadResponse:
    """Update lead stage, assignment, notes, or contact info."""

    try:
        lead = await service.update_lead(clinic.id, id, payload)
        return LeadResponse.model_validate(lead)
    except LeadNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except LeadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.post(
    "/{id}/convert", response_model=LeadConvertResponse, status_code=status.HTTP_200_OK
)
async def convert_lead(
    id: UUID,
    clinic: CurrentClinicDep,
    service: LeadServiceDep,
    scope: CapabilityScope = Depends(require_capability("leads.convert")),
) -> LeadConvertResponse:
    """Convert a lead into an active patient record."""

    try:
        updated_lead, patient = await service.convert_lead_to_patient(clinic.id, id)
        return LeadConvertResponse(
            lead=LeadResponse.model_validate(updated_lead),
            patient_id=patient.id,
        )
    except LeadNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except LeadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_lead(
    id: UUID,
    clinic: CurrentClinicDep,
    service: LeadServiceDep,
    scope: CapabilityScope = Depends(require_capability("leads.delete")),
) -> None:
    """Delete a lead record for the clinic."""

    try:
        await service.delete_lead(clinic.id, id)
    except LeadNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
