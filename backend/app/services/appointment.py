from __future__ import annotations

from datetime import date
from uuid import UUID

from app.enums.appointment import AppointmentStatus
from app.models.appointment import Appointment
from app.repositories.appointment import AppointmentRepository
from app.repositories.patient import PatientRepository
from app.repositories.user import UserRepository
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate


class AppointmentNotFoundError(Exception):
    """Raised when a requested appointment record is not found."""


class AppointmentValidationError(Exception):
    """Raised when appointment business validation fails."""


class AppointmentService:
    """Service layer managing clinic-scoped appointment business operations."""

    appointment_repository: AppointmentRepository
    patient_repository: PatientRepository
    user_repository: UserRepository

    def __init__(
        self,
        appointment_repository: AppointmentRepository,
        patient_repository: PatientRepository,
        user_repository: UserRepository,
    ) -> None:
        """Inject repository dependencies."""

        self.appointment_repository = appointment_repository
        self.patient_repository = patient_repository
        self.user_repository = user_repository

    async def create_appointment(self, clinic_id: UUID, payload: AppointmentCreate) -> Appointment:
        """Validate and create a clinic-scoped appointment."""

        if payload.duration_minutes <= 0:
            raise AppointmentValidationError("duration_minutes must be greater than 0.")

        patient = await self.patient_repository.get_by_patient_id(payload.patient_id, clinic_id=clinic_id)
        if patient is None:
            raise AppointmentValidationError(
                f"Patient '{payload.patient_id}' does not exist or does not belong to clinic '{clinic_id}'."
            )

        therapist = await self.user_repository.get_by_id(payload.therapist_id, clinic_id=clinic_id)
        if therapist is None:
            raise AppointmentValidationError(
                f"Therapist '{payload.therapist_id}' does not exist or does not belong to clinic '{clinic_id}'."
            )

        obj_in = payload.model_dump()
        obj_in["clinic_id"] = clinic_id
        appointment = await self.appointment_repository.create(obj_in)
        await self.appointment_repository.session.commit()
        return appointment

    async def get_appointment(self, clinic_id: UUID, appointment_id: UUID) -> Appointment:
        """Retrieve an appointment by ID ensuring strict clinic scoping."""

        appointment = await self.appointment_repository.get_by_id(appointment_id, clinic_id=clinic_id)
        if appointment is None:
            raise AppointmentNotFoundError(
                f"Appointment '{appointment_id}' not found for clinic '{clinic_id}'."
            )

        return appointment

    async def list_appointments(
        self,
        clinic_id: UUID,
        *,
        scheduled_date: date | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        patient_id: UUID | None = None,
        therapist_id: UUID | None = None,
        status: AppointmentStatus | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[Appointment]:
        """List appointments for a clinic with optional filters."""

        return await self.appointment_repository.list_appointments(
            clinic_id=clinic_id,
            scheduled_date=scheduled_date,
            start_date=start_date,
            end_date=end_date,
            patient_id=patient_id,
            therapist_id=therapist_id,
            status=status,
            offset=offset,
            limit=limit,
        )

    async def count_appointments(
        self,
        clinic_id: UUID,
        *,
        scheduled_date: date | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        patient_id: UUID | None = None,
        therapist_id: UUID | None = None,
        status: AppointmentStatus | None = None,
    ) -> int:
        """Count appointments for a clinic with optional filters."""

        return await self.appointment_repository.count_appointments(
            clinic_id=clinic_id,
            scheduled_date=scheduled_date,
            start_date=start_date,
            end_date=end_date,
            patient_id=patient_id,
            therapist_id=therapist_id,
            status=status,
        )

    async def update_appointment(
        self, clinic_id: UUID, appointment_id: UUID, payload: AppointmentUpdate
    ) -> Appointment:
        """Update a clinic-scoped appointment record."""

        appointment = await self.get_appointment(clinic_id, appointment_id)
        update_data = payload.model_dump(exclude_unset=True)

        if payload.duration_minutes is not None:
            if payload.duration_minutes <= 0:
                raise AppointmentValidationError("duration_minutes must be greater than 0.")

        if payload.patient_id is not None:
            patient = await self.patient_repository.get_by_patient_id(
                payload.patient_id, clinic_id=clinic_id
            )
            if patient is None:
                raise AppointmentValidationError(
                    f"Patient '{payload.patient_id}' does not exist or does not belong to clinic '{clinic_id}'."
                )

        if payload.therapist_id is not None:
            therapist = await self.user_repository.get_by_id(
                payload.therapist_id, clinic_id=clinic_id
            )
            if therapist is None:
                raise AppointmentValidationError(
                    f"Therapist '{payload.therapist_id}' does not exist or does not belong to clinic '{clinic_id}'."
                )


        if not update_data:
            return appointment

        updated = await self.appointment_repository.update(appointment, update_data)
        await self.appointment_repository.session.commit()
        return updated

    async def soft_cancel(self, clinic_id: UUID, appointment_id: UUID) -> Appointment:
        """Soft-cancel an appointment for a clinic."""

        appointment = await self.get_appointment(clinic_id, appointment_id)
        canceled = await self.appointment_repository.soft_cancel(appointment)
        await self.appointment_repository.session.commit()
        return canceled
