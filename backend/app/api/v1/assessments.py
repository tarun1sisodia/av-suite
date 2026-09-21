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
from app.models.clinic import Clinic
from app.models.user import User
from app.repositories.appointment import AppointmentRepository
from app.repositories.patient import PatientRepository
from app.repositories.treatment import SoapAssessmentRepository
from app.repositories.user import UserRepository
from app.schemas.treatment import (
    SoapAssessmentCreate,
    SoapAssessmentListResponse,
    SoapAssessmentResponse,
    SoapAssessmentUpdate,
)
from app.services.treatment import (
    SoapAssessmentService,
    TreatmentNotFoundError,
    TreatmentValidationError,
)

router = APIRouter()


async def get_assessment_service(
    session: AsyncSession = Depends(get_async_session),
) -> SoapAssessmentService:
    """Inject SoapAssessmentService bound to active session."""

    return SoapAssessmentService(
        repository=SoapAssessmentRepository(session),
        patient_repository=PatientRepository(session),
        appointment_repository=AppointmentRepository(session),
        user_repository=UserRepository(session),
    )


AssessmentServiceDep = Annotated[SoapAssessmentService, Depends(get_assessment_service)]
CurrentClinicDep = Annotated[Clinic, Depends(get_current_clinic)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.post(
    "", response_model=SoapAssessmentResponse, status_code=status.HTTP_201_CREATED
)
async def create_soap_assessment(
    payload: SoapAssessmentCreate,
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: AssessmentServiceDep,
    scope: CapabilityScope = Depends(require_capability("assessments.create")),
) -> SoapAssessmentResponse:
    """Create a new SOAP assessment for the authenticated clinic."""

    # Enforce OWN scope: therapist can only create assessments for themselves
    if scope == CapabilityScope.OWN and payload.therapist_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create assessments assigned to yourself.",
        )

    try:
        assessment = await service.create_assessment(clinic.id, payload)
        return SoapAssessmentResponse.model_validate(assessment)
    except TreatmentValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.get("", response_model=SoapAssessmentListResponse)
async def list_soap_assessments(
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: AssessmentServiceDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    patient_id: Annotated[UUID | None, Query(alias="patient_id")] = None,
    appointment_id: Annotated[UUID | None, Query(alias="appointment_id")] = None,
    therapist_id: Annotated[UUID | None, Query(alias="therapist_id")] = None,
    specialty: Annotated[str | None, Query()] = None,
    is_reassessment: Annotated[bool | None, Query()] = None,
    scope: CapabilityScope = Depends(require_capability("assessments.view")),
) -> SoapAssessmentListResponse:
    """List SOAP assessments for the authenticated clinic with optional filtering."""

    # Enforce OWN scope: therapist can only see their own assessments
    effective_therapist_id = therapist_id
    if scope == CapabilityScope.OWN:
        effective_therapist_id = user.id

    assessments = await service.list_assessments(
        clinic.id,
        patient_id=patient_id,
        appointment_id=appointment_id,
        therapist_id=effective_therapist_id,
        specialty=specialty,
        is_reassessment=is_reassessment,
        offset=offset,
        limit=limit,
    )

    total = await service.count_assessments(
        clinic.id,
        patient_id=patient_id,
        appointment_id=appointment_id,
        therapist_id=effective_therapist_id,
        specialty=specialty,
        is_reassessment=is_reassessment,
    )

    items = [SoapAssessmentResponse.model_validate(a) for a in assessments]
    return SoapAssessmentListResponse(
        items=items,
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{id}", response_model=SoapAssessmentResponse)
async def get_soap_assessment(
    id: UUID,
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: AssessmentServiceDep,
    scope: CapabilityScope = Depends(require_capability("assessments.view")),
) -> SoapAssessmentResponse:
    """Retrieve a SOAP assessment by ID for the authenticated clinic."""

    try:
        assessment = await service.get_assessment(clinic.id, id)
        # Enforce OWN scope: therapist can only access their own assessments
        if scope == CapabilityScope.OWN and assessment.therapist_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own assessments.",
            )
        return SoapAssessmentResponse.model_validate(assessment)
    except TreatmentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.patch("/{id}", response_model=SoapAssessmentResponse)
async def update_soap_assessment(
    id: UUID,
    payload: SoapAssessmentUpdate,
    clinic: CurrentClinicDep,
    user: CurrentUserDep,
    service: AssessmentServiceDep,
    scope: CapabilityScope = Depends(require_capability("assessments.edit")),
) -> SoapAssessmentResponse:
    """Update a SOAP assessment for the authenticated clinic."""

    try:
        assessment = await service.get_assessment(clinic.id, id)
        # Enforce OWN scope: therapist can only edit their own assessments
        if scope == CapabilityScope.OWN and assessment.therapist_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own assessments.",
            )
        # Also prevent reassignment to another therapist if scope is OWN
        if (
            scope == CapabilityScope.OWN
            and payload.therapist_id is not None
            and payload.therapist_id != user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot reassign an assessment to another therapist.",
            )
        assessment = await service.update_assessment(clinic.id, id, payload)
        return SoapAssessmentResponse.model_validate(assessment)
    except TreatmentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except TreatmentValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
