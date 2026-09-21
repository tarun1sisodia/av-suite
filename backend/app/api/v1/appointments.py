from __future__ import annotations

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    SessionDep,
    get_current_clinic,
    get_current_user,
    require_capability,
)
from app.enums.appointment import AppointmentStatus
from app.enums.permission import CapabilityScope
from app.models.clinic import Clinic
from app.models.user import User
from app.repositories.appointment import AppointmentRepository
from app.repositories.patient import PatientRepository
from app.repositories.user import UserRepository
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentListResponse,
    AppointmentResponse,
    AppointmentUpdate,
)
from app.services.appointment import (
    AppointmentNotFoundError,
    AppointmentService,
    AppointmentValidationError,
)

router = APIRouter()


async def get_appointment_service(session: SessionDep) -> AppointmentService:
    """Inject AppointmentService bound to session repositories."""

    return AppointmentService(
        appointment_repository=AppointmentRepository(session),
        patient_repository=PatientRepository(session),
        user_repository=UserRepository(session),
    )


AppointmentServiceDep = Annotated[AppointmentService, Depends(get_appointment_service)]
CurrentClinicDep = Annotated[Clinic, Depends(get_current_clinic)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreate,
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: AppointmentServiceDep,
    scope: CapabilityScope = Depends(require_capability("appointments.create")),
) -> AppointmentResponse:
    """Create a new staff-scheduled appointment for the authenticated clinic."""

    if scope == CapabilityScope.OWN and payload.therapist_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create appointments assigned to yourself.",
        )

    try:
        appointment = await service.create_appointment(clinic.id, payload)
        return AppointmentResponse.model_validate(appointment)
    except AppointmentValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("", response_model=AppointmentListResponse)
async def list_appointments(
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: AppointmentServiceDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    scheduled_date: Annotated[date | None, Query(alias="date")] = None,
    start_date: Annotated[date | None, Query(alias="start_date")] = None,
    end_date: Annotated[date | None, Query(alias="end_date")] = None,
    therapist_id: Annotated[UUID | None, Query(alias="therapist")] = None,
    patient_id: Annotated[UUID | None, Query(alias="patient")] = None,
    status_filter: Annotated[AppointmentStatus | None, Query(alias="status")] = None,
    scope: CapabilityScope = Depends(require_capability("appointments.view")),
) -> AppointmentListResponse:
    """List appointments for the authenticated clinic with filtering by date, therapist, or patient."""

    # Enforce own-scope filtering: therapist may only see their own appointments
    effective_therapist_id = therapist_id
    if scope == CapabilityScope.OWN:
        effective_therapist_id = user.id

    appointments = await service.list_appointments(
        clinic.id,
        scheduled_date=scheduled_date,
        start_date=start_date,
        end_date=end_date,
        patient_id=patient_id,
        therapist_id=effective_therapist_id,
        status=status_filter,
        offset=offset,
        limit=limit,
    )

    total = await service.count_appointments(
        clinic.id,
        scheduled_date=scheduled_date,
        start_date=start_date,
        end_date=end_date,
        patient_id=patient_id,
        therapist_id=effective_therapist_id,
        status=status_filter,
    )

    items = [AppointmentResponse.model_validate(a) for a in appointments]
    return AppointmentListResponse(
        items=items,
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{id}", response_model=AppointmentResponse)
async def get_appointment(
    id: UUID,
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: AppointmentServiceDep,
    scope: CapabilityScope = Depends(require_capability("appointments.view")),
) -> AppointmentResponse:
    """Retrieve an appointment by ID for the authenticated clinic."""

    try:
        appointment = await service.get_appointment(clinic.id, id)
        if scope == CapabilityScope.OWN and appointment.therapist_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own appointments.",
            )
        return AppointmentResponse.model_validate(appointment)
    except AppointmentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{id}", response_model=AppointmentResponse)
async def update_appointment(
    id: UUID,
    payload: AppointmentUpdate,
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: AppointmentServiceDep,
    scope: CapabilityScope = Depends(require_capability("appointments.edit")),
) -> AppointmentResponse:
    """Reschedule or update appointment status/details for the authenticated clinic."""

    try:
        appointment = await service.get_appointment(clinic.id, id)
        if scope == CapabilityScope.OWN and appointment.therapist_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own appointments.",
            )
        # Block therapist reassignment when own-scoped
        if scope == CapabilityScope.OWN and payload.therapist_id is not None and payload.therapist_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot reassign an appointment to another therapist.",
            )
        appointment = await service.update_appointment(clinic.id, id, payload)
        return AppointmentResponse.model_validate(appointment)
    except AppointmentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except AppointmentValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{id}", response_model=AppointmentResponse)
async def soft_cancel_appointment(
    id: UUID,
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: AppointmentServiceDep,
    scope: CapabilityScope = Depends(require_capability("appointments.delete")),
) -> AppointmentResponse:

    """Soft-cancel an appointment for the authenticated clinic."""

    try:
        appointment = await service.get_appointment(clinic.id, id)
        if scope == CapabilityScope.OWN and appointment.therapist_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own appointments.",
            )
        appointment = await service.soft_cancel(clinic.id, id)
        return AppointmentResponse.model_validate(appointment)
    except AppointmentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
