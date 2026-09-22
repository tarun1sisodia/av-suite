from __future__ import annotations

import httpx
import logging
from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import (
    get_async_session,
    get_client_ip,
    get_current_clinic,
    require_capability,
)
from app.enums.appointment import AppointmentRequestStatus
from app.models.clinic import Clinic
from app.repositories.appointment import AppointmentRepository
from app.repositories.booking import AppointmentRequestRepository
from app.repositories.clinic import ClinicRepository
from app.repositories.patient import PatientRepository

from app.schemas.booking import (
    AppointmentRequestApprovePayload,
    AppointmentRequestCreate,
    AppointmentRequestResponse,
    AppointmentRequestUpdate,
    PublicClinicBrandingResponse,
    SlotAvailabilityResponse,
)
from app.services.booking import (
    BookingNotFoundError,
    BookingService,
    BookingValidationError,
)


from app.schemas.envelope import ResponseEnvelope

router = APIRouter()
logger = logging.getLogger(__name__)


async def verify_turnstile_token(token: str | None, client_ip: str | None) -> bool:
    """Verify Cloudflare Turnstile token if TURNSTILE_SECRET_KEY is configured."""
    if not settings.TURNSTILE_SECRET_KEY:
        return True
    if not token:
        return False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={
                    "secret": settings.TURNSTILE_SECRET_KEY,
                    "response": token,
                    "remoteip": client_ip,
                },
            )
            data = resp.json()
            return bool(data.get("success", False))
    except Exception as e:
        logger.error(f"Cloudflare Turnstile verification failed with error: {e}")
        return False


async def get_booking_service(
    session: AsyncSession = Depends(get_async_session),
) -> BookingService:
    """Inject BookingService with session-bound repositories."""

    return BookingService(
        request_repository=AppointmentRequestRepository(session),
        appointment_repository=AppointmentRepository(session),
        patient_repository=PatientRepository(session),
        clinic_repository=ClinicRepository(session),
    )


BookingServiceDep = Annotated[BookingService, Depends(get_booking_service)]
CurrentClinicDep = Annotated[Clinic, Depends(get_current_clinic)]


# --- Public Unauthenticated Booking Endpoints ---


@router.get(
    "/booking/branding/{clinic_slug}",
    response_model=ResponseEnvelope[PublicClinicBrandingResponse],
)
async def get_public_clinic_branding(
    clinic_slug: str,
    service: BookingServiceDep,
) -> ResponseEnvelope[PublicClinicBrandingResponse]:
    """Public unauthenticated endpoint returning clinic branding details."""

    try:
        result = await service.get_clinic_branding(clinic_slug)
        return ResponseEnvelope(data=result)
    except BookingNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.get(
    "/booking/availability/{clinic_slug}",
    response_model=ResponseEnvelope[SlotAvailabilityResponse],
)
async def get_public_slot_availability(
    clinic_slug: str,
    target_date: Annotated[date, Query(alias="date")],
    service: BookingServiceDep,
    therapist_id: Annotated[UUID | None, Query(alias="therapist_id")] = None,
) -> ResponseEnvelope[SlotAvailabilityResponse]:
    """Public unauthenticated endpoint returning busy appointment slots for a clinic on a specific date."""

    try:
        availability = await service.get_slot_availability(
            clinic_slug_or_id=clinic_slug,
            target_date=target_date,
            therapist_id=therapist_id,
        )
        return ResponseEnvelope(data=availability)
    except BookingNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.post(
    "/booking/request",
    response_model=ResponseEnvelope[AppointmentRequestResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_public_appointment_request(
    payload: AppointmentRequestCreate,
    service: BookingServiceDep,
    request: Request,
    clinic_slug: Annotated[str | None, Query(alias="clinic_slug")] = None,
    clinic_id: Annotated[UUID | None, Query(alias="clinic_id")] = None,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> ResponseEnvelope[AppointmentRequestResponse]:
    """Public unauthenticated endpoint to submit an appointment request using clinic slug or clinic id."""

    if settings.TURNSTILE_SECRET_KEY:
        client_ip = get_client_ip(request)
        if not await verify_turnstile_token(payload.turnstile_token, client_ip):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security check failed (Cloudflare Turnstile). Please try submitting again.",
            )

    if clinic_slug is not None:
        try:
            request_record = await service.create_request_by_slug(
                clinic_slug, payload, idempotency_key=idempotency_key
            )
            resp = AppointmentRequestResponse.model_validate(request_record)
            if "[Returning Patient:" in (request_record.notes or ""):
                resp.is_returning_patient = True
            return ResponseEnvelope(data=resp)
        except BookingNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
            ) from exc
        except BookingValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
            ) from exc
    elif clinic_id is not None:
        try:
            request_record = await service.create_request(
                clinic_id, payload, idempotency_key=idempotency_key
            )
            resp = AppointmentRequestResponse.model_validate(request_record)
            if "[Returning Patient:" in (request_record.notes or ""):
                resp.is_returning_patient = True
            return ResponseEnvelope(data=resp)
        except BookingNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
            ) from exc
        except BookingValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
            ) from exc
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="clinic_slug or clinic_id query parameter is required for public booking request.",
        )



@router.put(
    "/booking/{id}",
    response_model=ResponseEnvelope[AppointmentRequestResponse],
    dependencies=[Depends(require_capability("booking.edit"))],
)
async def update_booking_request(
    id: UUID,
    payload: AppointmentRequestUpdate,
    clinic: CurrentClinicDep,
    service: BookingServiceDep,
) -> ResponseEnvelope[AppointmentRequestResponse]:
    """Update an appointment request for the authenticated clinic."""

    try:
        req = await service.update_request(clinic.id, id, payload)
        return ResponseEnvelope(data=AppointmentRequestResponse.model_validate(req))
    except BookingNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except BookingValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.delete(
    "/booking/{id}",
    response_model=ResponseEnvelope[dict[str, str]],
    dependencies=[Depends(require_capability("booking.delete"))],
)
async def delete_booking_request(
    id: UUID,
    clinic: CurrentClinicDep,
    service: BookingServiceDep,
) -> ResponseEnvelope[dict[str, str]]:
    """Delete an appointment request for the authenticated clinic."""

    try:
        await service.delete_request(clinic.id, id)
        return ResponseEnvelope(
            data={"message": "Appointment request deleted successfully."}
        )
    except BookingNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


# --- Authenticated Staff Appointment Request Queue Endpoints ---


@router.get(
    "/appointment-requests",
    response_model=ResponseEnvelope[list[AppointmentRequestResponse]],
    dependencies=[Depends(require_capability("booking.view"))],
)
async def list_appointment_requests(
    clinic: CurrentClinicDep,
    service: BookingServiceDep,
    status_filter: Annotated[
        AppointmentRequestStatus | None, Query(alias="status")
    ] = None,
    search: Annotated[str | None, Query(alias="search")] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> ResponseEnvelope[list[AppointmentRequestResponse]]:
    """Authenticated staff endpoint listing appointment requests for the clinic."""

    requests = await service.list_requests(
        clinic.id,
        status=status_filter,
        search=search,
        offset=offset,
        limit=limit,
    )
    items = [AppointmentRequestResponse.model_validate(req) for req in requests]
    return ResponseEnvelope(
        data=items,
        meta={
            "total": len(requests) if len(requests) < limit else len(items) + offset,
            "offset": offset,
            "limit": limit,
        },
    )


@router.get(
    "/appointment-requests/{id}",
    response_model=ResponseEnvelope[AppointmentRequestResponse],
    dependencies=[Depends(require_capability("booking.view"))],
)
async def get_appointment_request(
    id: UUID,
    clinic: CurrentClinicDep,
    service: BookingServiceDep,
) -> ResponseEnvelope[AppointmentRequestResponse]:
    """Authenticated staff endpoint retrieving details of a single appointment request."""

    try:
        req = await service.get_request(clinic.id, id)
        return ResponseEnvelope(data=AppointmentRequestResponse.model_validate(req))
    except BookingNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.post(
    "/appointment-requests/{id}/approve",
    response_model=ResponseEnvelope[dict[str, object]],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_capability("booking.approve"))],
)
async def approve_appointment_request(
    id: UUID,
    payload: AppointmentRequestApprovePayload,
    clinic: CurrentClinicDep,
    service: BookingServiceDep,
) -> ResponseEnvelope[dict[str, object]]:
    """Authenticated staff endpoint approving an appointment request and scheduling an appointment."""

    try:
        response = await service.approve_request(clinic.id, id, payload)
        return ResponseEnvelope(data=response)
    except BookingNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except BookingValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.post(
    "/appointment-requests/{id}/reject",
    response_model=ResponseEnvelope[AppointmentRequestResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_capability("booking.approve"))],
)
async def reject_appointment_request(
    id: UUID,
    clinic: CurrentClinicDep,
    service: BookingServiceDep,
    notes: Annotated[str | None, Query(alias="notes")] = None,
) -> ResponseEnvelope[AppointmentRequestResponse]:
    """Authenticated staff endpoint rejecting an appointment request."""

    try:
        rejected_req = await service.reject_request(clinic.id, id, notes=notes)
        return ResponseEnvelope(
            data=AppointmentRequestResponse.model_validate(rejected_req)
        )
    except BookingNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
