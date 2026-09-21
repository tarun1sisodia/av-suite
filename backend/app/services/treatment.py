from __future__ import annotations

from datetime import date
from uuid import UUID

from app.models.treatment import SoapAssessment, TreatmentSession
from app.repositories.appointment import AppointmentRepository
from app.repositories.patient import PatientRepository
from app.repositories.treatment import SoapAssessmentRepository, TreatmentSessionRepository
from app.repositories.user import UserRepository
from app.schemas.treatment import (
    SoapAssessmentCreate,
    SoapAssessmentUpdate,
    TreatmentSessionCreate,
    TreatmentSessionUpdate,
)


class TreatmentValidationError(Exception):
    """Raised when validation fails for treatment or assessment operations."""


class TreatmentNotFoundError(Exception):
    """Raised when a treatment session or assessment record is not found."""


class TreatmentSessionService:
    """Service managing treatment session operations and clinic validation."""

    repository: TreatmentSessionRepository
    patient_repository: PatientRepository
    appointment_repository: AppointmentRepository
    user_repository: UserRepository

    def __init__(
        self,
        repository: TreatmentSessionRepository,
        patient_repository: PatientRepository,
        appointment_repository: AppointmentRepository,
        user_repository: UserRepository,
    ) -> None:
        """Inject repository dependencies."""

        self.repository = repository
        self.patient_repository = patient_repository
        self.appointment_repository = appointment_repository
        self.user_repository = user_repository

    async def create_session(self, clinic_id: UUID, payload: TreatmentSessionCreate) -> TreatmentSession:
        """Validate dependencies and create a clinic-scoped treatment session."""

        if payload.pain_score is not None and not (0 <= payload.pain_score <= 10):
            raise TreatmentValidationError("pain_score must be between 0 and 10.")

        patient = await self.patient_repository.get_by_patient_id(payload.patient_id, clinic_id=clinic_id)
        if patient is None:
            raise TreatmentValidationError(
                f"Patient '{payload.patient_id}' does not exist or does not belong to clinic '{clinic_id}'."
            )

        therapist = await self.user_repository.get_by_id(payload.therapist_id, clinic_id=clinic_id)
        if therapist is None:
            raise TreatmentValidationError(
                f"Therapist '{payload.therapist_id}' does not exist or does not belong to clinic '{clinic_id}'."
            )

        if payload.appointment_id is not None:
            appointment = await self.appointment_repository.get_by_id(payload.appointment_id, clinic_id=clinic_id)
            if appointment is None:
                raise TreatmentValidationError(
                    f"Appointment '{payload.appointment_id}' does not exist or does not belong to clinic '{clinic_id}'."
                )

        obj_in = payload.model_dump()
        obj_in["clinic_id"] = clinic_id
        result = await self.repository.create(obj_in)
        await self.repository.session.commit()
        return result

    async def get_session(self, clinic_id: UUID, session_id: UUID) -> TreatmentSession:
        """Retrieve a treatment session ensuring clinic scoping."""

        session = await self.repository.get_by_id(session_id, clinic_id=clinic_id)
        if session is None:
            raise TreatmentNotFoundError(
                f"Treatment session '{session_id}' not found for clinic '{clinic_id}'."
            )

        return session

    async def list_sessions(
        self,
        clinic_id: UUID,
        *,
        patient_id: UUID | None = None,
        appointment_id: UUID | None = None,
        therapist_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[TreatmentSession]:
        """List treatment sessions for a clinic with optional filters."""

        return await self.repository.list_sessions(
            clinic_id=clinic_id,
            patient_id=patient_id,
            appointment_id=appointment_id,
            therapist_id=therapist_id,
            start_date=start_date,
            end_date=end_date,
            offset=offset,
            limit=limit,
        )

    async def count_sessions(
        self,
        clinic_id: UUID,
        *,
        patient_id: UUID | None = None,
        appointment_id: UUID | None = None,
        therapist_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> int:
        """Count treatment sessions for a clinic with optional filters."""

        return await self.repository.count_sessions(
            clinic_id=clinic_id,
            patient_id=patient_id,
            appointment_id=appointment_id,
            therapist_id=therapist_id,
            start_date=start_date,
            end_date=end_date,
        )

    async def update_session(
        self, clinic_id: UUID, session_id: UUID, payload: TreatmentSessionUpdate
    ) -> TreatmentSession:
        """Update a clinic-scoped treatment session (only if not finalized)."""

        session = await self.get_session(clinic_id, session_id)
        if session.finalized:
            raise TreatmentValidationError("Finalized treatment session cannot be edited.")

        update_data = payload.model_dump(exclude_unset=True)

        if payload.pain_score is not None and not (0 <= payload.pain_score <= 10):
            raise TreatmentValidationError("pain_score must be between 0 and 10.")

        if payload.therapist_id is not None:
            therapist = await self.user_repository.get_by_id(payload.therapist_id, clinic_id=clinic_id)
            if therapist is None:
                raise TreatmentValidationError(
                    f"Therapist '{payload.therapist_id}' does not exist or does not belong to clinic '{clinic_id}'."
                )

        if payload.appointment_id is not None:
            appointment = await self.appointment_repository.get_by_id(payload.appointment_id, clinic_id=clinic_id)
            if appointment is None:
                raise TreatmentValidationError(
                    f"Appointment '{payload.appointment_id}' does not exist or does not belong to clinic '{clinic_id}'."
                )

        if not update_data:
            return session

        result = await self.repository.update(session, update_data)
        await self.repository.session.commit()
        return result

    async def delete_session(self, clinic_id: UUID, session_id: UUID) -> None:
        """Delete a treatment session ensuring clinic scoping."""

        session = await self.get_session(clinic_id, session_id)
        await self.repository.delete(session)
        await self.repository.session.commit()


class SoapAssessmentService:
    """Service managing SOAP assessment operations and clinic validation."""

    repository: SoapAssessmentRepository
    patient_repository: PatientRepository
    appointment_repository: AppointmentRepository
    user_repository: UserRepository | None

    def __init__(
        self,
        repository: SoapAssessmentRepository,
        patient_repository: PatientRepository,
        appointment_repository: AppointmentRepository,
        user_repository: UserRepository | None = None,
    ) -> None:
        """Inject repository dependencies."""

        self.repository = repository
        self.patient_repository = patient_repository
        self.appointment_repository = appointment_repository
        self.user_repository = user_repository

    async def create_assessment(self, clinic_id: UUID, payload: SoapAssessmentCreate) -> SoapAssessment:
        """Validate dependencies and create a clinic-scoped SOAP assessment."""

        patient = await self.patient_repository.get_by_patient_id(payload.patient_id, clinic_id=clinic_id)
        if patient is None:
            raise TreatmentValidationError(
                f"Patient '{payload.patient_id}' does not exist or does not belong to clinic '{clinic_id}'."
            )

        if payload.appointment_id is not None:
            appointment = await self.appointment_repository.get_by_id(payload.appointment_id, clinic_id=clinic_id)
            if appointment is None:
                raise TreatmentValidationError(
                    f"Appointment '{payload.appointment_id}' does not exist or does not belong to clinic '{clinic_id}'."
                )

        if payload.therapist_id is not None and self.user_repository is not None:
            therapist = await self.user_repository.get_by_id(payload.therapist_id, clinic_id=clinic_id)
            if therapist is None:
                raise TreatmentValidationError(
                    f"Therapist '{payload.therapist_id}' does not exist or does not belong to clinic '{clinic_id}'."
                )

        obj_in = payload.model_dump()
        obj_in["clinic_id"] = clinic_id
        result = await self.repository.create(obj_in)
        await self.repository.session.commit()
        return result

    async def get_assessment(self, clinic_id: UUID, assessment_id: UUID) -> SoapAssessment:
        """Retrieve a SOAP assessment ensuring clinic scoping."""

        assessment = await self.repository.get_by_id(assessment_id, clinic_id=clinic_id)
        if assessment is None:
            raise TreatmentNotFoundError(
                f"SOAP assessment '{assessment_id}' not found for clinic '{clinic_id}'."
            )

        return assessment

    async def list_assessments(
        self,
        clinic_id: UUID,
        *,
        patient_id: UUID | None = None,
        appointment_id: UUID | None = None,
        therapist_id: UUID | None = None,
        specialty: str | None = None,
        is_reassessment: bool | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[SoapAssessment]:
        """List SOAP assessments for a clinic with optional filters."""

        return await self.repository.list_assessments(
            clinic_id=clinic_id,
            patient_id=patient_id,
            appointment_id=appointment_id,
            therapist_id=therapist_id,
            specialty=specialty,
            is_reassessment=is_reassessment,
            offset=offset,
            limit=limit,
        )

    async def count_assessments(
        self,
        clinic_id: UUID,
        *,
        patient_id: UUID | None = None,
        appointment_id: UUID | None = None,
        therapist_id: UUID | None = None,
        specialty: str | None = None,
        is_reassessment: bool | None = None,
    ) -> int:
        """Count SOAP assessments for a clinic with optional filters."""

        return await self.repository.count_assessments(
            clinic_id=clinic_id,
            patient_id=patient_id,
            appointment_id=appointment_id,
            therapist_id=therapist_id,
            specialty=specialty,
            is_reassessment=is_reassessment,
        )

    async def update_assessment(
        self, clinic_id: UUID, assessment_id: UUID, payload: SoapAssessmentUpdate
    ) -> SoapAssessment:
        """Update a clinic-scoped SOAP assessment (only if not finalized)."""

        assessment = await self.get_assessment(clinic_id, assessment_id)
        if assessment.finalized:
            raise TreatmentValidationError("Finalized SOAP assessment cannot be edited.")

        update_data = payload.model_dump(exclude_unset=True)

        if payload.appointment_id is not None:
            appointment = await self.appointment_repository.get_by_id(payload.appointment_id, clinic_id=clinic_id)
            if appointment is None:
                raise TreatmentValidationError(
                    f"Appointment '{payload.appointment_id}' does not exist or does not belong to clinic '{clinic_id}'."
                )

        if payload.therapist_id is not None and self.user_repository is not None:
            therapist = await self.user_repository.get_by_id(payload.therapist_id, clinic_id=clinic_id)
            if therapist is None:
                raise TreatmentValidationError(
                    f"Therapist '{payload.therapist_id}' does not exist or does not belong to clinic '{clinic_id}'."
                )

        if not update_data:
            return assessment

        result = await self.repository.update(assessment, update_data)
        await self.repository.session.commit()
        return result
