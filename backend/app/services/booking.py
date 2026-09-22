from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID

from app.enums.appointment import AppointmentSource, AppointmentStatus
from app.enums.booking import AppointmentRequestStatus
from app.enums.patient import PatientStatus
from app.models.appointment import Appointment
from app.models.booking import AppointmentRequest
from app.repositories.appointment import AppointmentRepository
from app.repositories.booking import AppointmentRequestRepository
from app.repositories.clinic import ClinicRepository
from app.repositories.patient import PatientRepository
from app.schemas.booking import (
    AppointmentRequestApprovePayload,
    AppointmentRequestCreate,
    AppointmentRequestResponse,
    AppointmentRequestUpdate,
    BusySlot,
    PublicClinicBrandingResponse,
    SlotAvailabilityResponse,
)
from app.utils.whatsapp import build_whatsapp_link


class BookingValidationError(Exception):
    """Raised when validation fails for appointment requests or booking operations."""


class BookingNotFoundError(Exception):
    """Raised when an appointment request or clinic resource is not found."""


class BookingService:
    """Service managing public appointment requests, approval flows, and clinic branding."""

    request_repository: AppointmentRequestRepository
    appointment_repository: AppointmentRepository
    patient_repository: PatientRepository
    clinic_repository: ClinicRepository

    def __init__(
        self,
        request_repository: AppointmentRequestRepository,
        appointment_repository: AppointmentRepository,
        patient_repository: PatientRepository,
        clinic_repository: ClinicRepository,
    ) -> None:
        """Inject repositories required for booking operations."""

        self.request_repository = request_repository
        self.appointment_repository = appointment_repository
        self.patient_repository = patient_repository
        self.clinic_repository = clinic_repository

    async def get_clinic_branding(
        self, clinic_slug_or_id: str
    ) -> PublicClinicBrandingResponse:
        """Retrieve public branding details for a clinic without exposing patient or internal data."""

        from app.core.cache import clinic_cache

        cache_key = f"clinic_branding:{clinic_slug_or_id}"
        cached = clinic_cache.get(cache_key)
        if cached is not None:
            return cached

        clinic = await self.clinic_repository.get_by_slug_or_id(clinic_slug_or_id)
        if clinic is None:
            raise BookingNotFoundError(f"Clinic '{clinic_slug_or_id}' not found.")

        branding = PublicClinicBrandingResponse(
            clinic_id=clinic.id,
            name=clinic.name,
            slug=clinic_slug_or_id,
            logo_url=clinic.branding_logo_url,
            brand_color=clinic.branding_color,
        )
        clinic_cache.set(cache_key, branding, ttl_seconds=300)
        return branding

    async def get_slot_availability(
        self,
        clinic_slug_or_id: str,
        target_date: date,
        therapist_id: UUID | None = None,
    ) -> SlotAvailabilityResponse:
        """Retrieve busy appointment slots for a clinic on a specified date."""

        clinic = await self.clinic_repository.get_by_slug_or_id(clinic_slug_or_id)
        if clinic is None:
            raise BookingNotFoundError(f"Clinic '{clinic_slug_or_id}' not found.")

        appointments = await self.appointment_repository.list_appointments(
            clinic_id=clinic.id,
            scheduled_date=target_date,
            therapist_id=therapist_id,
        )

        busy_slots: list[BusySlot] = []
        for appt in appointments:
            if appt.status == AppointmentStatus.CANCELLED:
                continue
            start_str = appt.scheduled_at.strftime("%H:%M")
            duration = appt.duration_minutes or 30
            end_dt = appt.scheduled_at + timedelta(minutes=duration)
            end_str = end_dt.strftime("%H:%M")
            busy_slots.append(
                BusySlot(
                    start_time=start_str,
                    end_time=end_str,
                    therapist_id=appt.therapist_id,
                )
            )

        return SlotAvailabilityResponse(
            clinic_id=clinic.id,
            date=target_date,
            busy_slots=busy_slots,
            total_busy=len(busy_slots),
        )

    async def create_request(
        self,
        clinic_id: UUID,
        payload: AppointmentRequestCreate,
        idempotency_key: str | None = None,
    ) -> AppointmentRequest:
        """Create a new public appointment request for a clinic with idempotency and patient auto-recognition."""

        from app.core.cache import clinic_cache

        # 1. Idempotency check: prevent duplicate submissions
        idem_key = (
            f"idem_booking:{idempotency_key}"
            if idempotency_key
            else f"idem_booking:{clinic_id}:{payload.phone.strip()}:{payload.preferred_date}:{payload.preferred_slot}"
        )
        cached_req = clinic_cache.get(idem_key)
        if cached_req is not None:
            return cached_req

        clinic = await self.clinic_repository.get_by_id(clinic_id)
        if clinic is None:
            raise BookingNotFoundError(f"Clinic '{clinic_id}' does not exist.")

        # 2. Returning Patient Auto-detection via patient_repository
        notes = payload.notes or ""
        existing_patients = await self.patient_repository.search_by_phone(
            payload.phone.strip(), clinic_id=clinic_id
        )
        if existing_patients:
            patient_name = getattr(existing_patients[0], "full_name", payload.name)
            tag = f"[Returning Patient: {patient_name}]"
            if tag not in notes:
                notes = f"{tag} {notes}".strip()

        req_data = payload.model_dump(exclude={"turnstile_token", "notes"})
        req_data.update(
            {
                "clinic_id": clinic_id,
                "notes": notes if notes else None,
                "status": AppointmentRequestStatus.PENDING,
            }
        )
        req = await self.request_repository.create(req_data)
        await self.request_repository.session.commit()

        # Cache created request to protect against immediate duplicate clicks (60s TTL)
        clinic_cache.set(idem_key, req, ttl_seconds=60)
        return req

    async def create_request_by_slug(
        self,
        clinic_slug: str,
        payload: AppointmentRequestCreate,
        idempotency_key: str | None = None,
    ) -> AppointmentRequest:
        """Create a new public appointment request using clinic slug with idempotency support."""

        clinic = await self.clinic_repository.get_by_slug(clinic_slug)
        if clinic is None:
            raise BookingNotFoundError(f"Clinic with slug '{clinic_slug}' not found.")

        return await self.create_request(
            clinic.id, payload, idempotency_key=idempotency_key
        )

    async def get_request(
        self, clinic_id: UUID, request_id: UUID
    ) -> AppointmentRequest:
        """Retrieve an appointment request ensuring clinic scoping."""

        req = await self.request_repository.get_by_id(request_id, clinic_id=clinic_id)
        if req is None:
            raise BookingNotFoundError(
                f"Appointment request '{request_id}' not found for clinic '{clinic_id}'."
            )
        return req

    async def list_requests(
        self,
        clinic_id: UUID,
        *,
        status: AppointmentRequestStatus | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[AppointmentRequest]:
        """List appointment requests for a clinic with optional status and search filters."""

        return await self.request_repository.list_requests(
            clinic_id=clinic_id,
            status=status,
            search=search,
            offset=offset,
            limit=limit,
        )

    @staticmethod
    def _build_approval_message(patient_name: str, scheduled_at: datetime) -> str:
        """Format the WhatsApp confirmation message for an approved appointment."""

        return (
            f"Hello {patient_name},\n\n"
            "Your appointment has been confirmed.\n\n"
            f"Date: {scheduled_at.strftime('%d %b %Y')}\n"
            f"Time: {scheduled_at.strftime('%I:%M %p')}\n\n"
            "Thank you."
        )

    async def approve_request(
        self,
        clinic_id: UUID,
        request_id: UUID,
        payload: AppointmentRequestApprovePayload,
    ) -> dict[str, object]:
        """Approve an appointment request, ensuring or creating a patient, checking slot conflicts, and scheduling."""

        from app.core.cache import clinic_cache

        # 1. Double-approval / race condition lock
        lock_key = f"approve_lock:{request_id}"
        if clinic_cache.get(lock_key):
            raise BookingValidationError(
                f"Appointment request '{request_id}' is currently being processed."
            )
        clinic_cache.set(lock_key, True, ttl_seconds=30)

        try:
            req = await self.get_request(clinic_id, request_id)
            if req.status == AppointmentRequestStatus.APPROVED:
                raise BookingValidationError(
                    f"Appointment request '{request_id}' has already been approved."
                )

            # 2. Find or create patient record
            matching_patients = await self.patient_repository.search_by_phone(
                req.phone, clinic_id=clinic_id
            )
            is_returning = bool(matching_patients)
            if matching_patients:
                patient = matching_patients[0]
            else:
                patient = await self.patient_repository.create(
                    {
                        "clinic_id": clinic_id,
                        "full_name": req.name,
                        "phone": req.phone,
                        "age": req.age,
                        "gender": req.gender,
                        "chief_complaint": req.chief_complaint,
                        "status": PatientStatus.ACTIVE,
                    }
                )

            sched_date = payload.scheduled_date or req.preferred_date or date.today()
            start_t = time(hour=9, minute=0)
            if payload.start_time:
                try:
                    parts = [int(p) for p in payload.start_time.split(":")]
                    start_t = time(
                        hour=parts[0],
                        minute=parts[1],
                        second=parts[2] if len(parts) > 2 else 0,
                    )
                except (ValueError, IndexError):
                    start_t = time(hour=9, minute=0)

            start_dt = datetime.combine(sched_date, start_t, tzinfo=timezone.utc)
            duration_minutes = payload.duration_minutes or 30
            end_dt = start_dt + timedelta(minutes=duration_minutes)

            therapist_id = payload.therapist_id
            if therapist_id is None:
                # Fallback to placeholder if therapist is not yet assigned
                therapist_id = UUID("00000000-0000-0000-0000-000000000000")
            else:
                # 3. Conflict / availability check for assigned therapist
                existing_appts = await self.appointment_repository.list_appointments(
                    clinic_id=clinic_id,
                    scheduled_date=sched_date,
                    therapist_id=therapist_id,
                )
                for existing in existing_appts:
                    if existing.status == AppointmentStatus.CANCELLED:
                        continue
                    existing_start = existing.scheduled_at
                    if existing_start.tzinfo is None:
                        existing_start = existing_start.replace(tzinfo=timezone.utc)
                    existing_duration = existing.duration_minutes or 30
                    existing_end = existing_start + timedelta(minutes=existing_duration)
                    if max(start_dt, existing_start) < min(end_dt, existing_end):
                        raise BookingValidationError(
                            f"Selected therapist already has an appointment scheduled from "
                            f"{existing_start.strftime('%H:%M')} to {existing_end.strftime('%H:%M')}."
                        )


            appointment_data = {
                "clinic_id": clinic_id,
                "patient_id": patient.id,
                "therapist_id": therapist_id,
                "scheduled_at": start_dt,
                "duration_minutes": duration_minutes,
                "status": AppointmentStatus.SCHEDULED,
                "source": AppointmentSource.PUBLIC_BOOKING,
            }
            appointment = await self.appointment_repository.create(appointment_data)

            updated_req = await self.request_repository.update(
                req,
                {"status": AppointmentRequestStatus.APPROVED},
            )
            await self.request_repository.session.commit()

            patient_name = getattr(patient, "full_name", req.name)
            whatsapp_link = build_whatsapp_link(
                req.phone,
                self._build_approval_message(patient_name, appointment.scheduled_at),
            )

            req_response = AppointmentRequestResponse.model_validate(updated_req)
            req_response.is_returning_patient = is_returning

            return {
                "request": req_response.model_dump(mode="json"),
                "appointment_id": str(appointment.id),
                "patient_id": str(appointment.patient_id),
                "is_returning_patient": is_returning,
                "message": "Appointment request approved successfully.",
                "whatsapp_link": whatsapp_link,
            }
        finally:
            clinic_cache.delete(lock_key)


    async def reject_request(
        self, clinic_id: UUID, request_id: UUID, notes: str | None = None
    ) -> AppointmentRequest:
        """Reject an appointment request while preserving the request record."""

        req = await self.get_request(clinic_id, request_id)
        update_data: dict[str, object] = {"status": AppointmentRequestStatus.REJECTED}
        if notes:
            update_data["notes"] = (
                f"{req.notes or ''}\nRejection notes: {notes}".strip()
            )

        updated = await self.request_repository.update(req, update_data)
        await self.request_repository.session.commit()
        return updated

    async def update_request(
        self,
        clinic_id: UUID,
        request_id: UUID,
        payload: AppointmentRequestUpdate,
    ) -> AppointmentRequest:
        """Update appointment request fields for a clinic-scoped request."""

        request_obj = await self.get_request(clinic_id, request_id)
        update_data = payload.model_dump(exclude_unset=True, exclude_none=True)
        if not update_data:
            return request_obj

        updated = await self.request_repository.update_request_by_id(
            clinic_id=clinic_id,
            request_id=request_id,
            update_data=update_data,
        )
        if updated is None:
            raise BookingNotFoundError(
                f"Appointment request '{request_id}' not found for clinic '{clinic_id}'."
            )

        await self.request_repository.session.commit()
        return updated

    async def delete_request(self, clinic_id: UUID, request_id: UUID) -> None:
        """Delete appointment request for the clinic."""

        request_obj = await self.get_request(clinic_id, request_id)
        await self.request_repository.delete_request(request_obj)
        await self.request_repository.session.commit()
