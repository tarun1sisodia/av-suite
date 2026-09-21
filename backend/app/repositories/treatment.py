from __future__ import annotations

from datetime import date, datetime, time, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.treatment import SoapAssessment, TreatmentSession
from app.repositories.base import BaseRepository


class TreatmentSessionRepository(BaseRepository[TreatmentSession]):
    """Repository for clinic-scoped TreatmentSession operations."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository bound to session."""

        super().__init__(session, TreatmentSession)

    async def list_sessions(
        self,
        *,
        clinic_id: UUID | None = None,
        patient_id: UUID | None = None,
        appointment_id: UUID | None = None,
        therapist_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[TreatmentSession]:
        """List treatment sessions with optional clinic, patient, appointment, therapist, and date range filters."""

        effective_limit = min(limit, 500)
        statement = select(TreatmentSession)

        if patient_id is not None:
            statement = statement.where(TreatmentSession.patient_id == patient_id)

        if appointment_id is not None:
            statement = statement.where(TreatmentSession.appointment_id == appointment_id)

        if therapist_id is not None:
            statement = statement.where(TreatmentSession.therapist_id == therapist_id)

        if start_date is not None:
            start_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
            statement = statement.where(TreatmentSession.treatment_date >= start_dt)

        if end_date is not None:
            end_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
            statement = statement.where(TreatmentSession.treatment_date <= end_dt)

        statement = self._apply_clinic_scope(statement, clinic_id).offset(offset).limit(effective_limit)
        result = await self.session.scalars(statement)
        return list(result.all())

    async def count_sessions(
        self,
        *,
        clinic_id: UUID | None = None,
        patient_id: UUID | None = None,
        appointment_id: UUID | None = None,
        therapist_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> int:
        """Count treatment sessions with optional filters."""

        from sqlalchemy import func
        statement = select(func.count()).select_from(TreatmentSession)

        if patient_id is not None:
            statement = statement.where(TreatmentSession.patient_id == patient_id)

        if appointment_id is not None:
            statement = statement.where(TreatmentSession.appointment_id == appointment_id)

        if therapist_id is not None:
            statement = statement.where(TreatmentSession.therapist_id == therapist_id)

        if start_date is not None:
            start_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
            statement = statement.where(TreatmentSession.treatment_date >= start_dt)

        if end_date is not None:
            end_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
            statement = statement.where(TreatmentSession.treatment_date <= end_dt)

        statement = self._apply_soft_delete_filter(statement)
        statement = self._apply_clinic_scope(statement, clinic_id)
        result = await self.session.scalar(statement)
        return int(result or 0)


class SoapAssessmentRepository(BaseRepository[SoapAssessment]):
    """Repository for clinic-scoped SoapAssessment operations."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository bound to session."""

        super().__init__(session, SoapAssessment)

    async def list_assessments(
        self,
        *,
        clinic_id: UUID | None = None,
        patient_id: UUID | None = None,
        appointment_id: UUID | None = None,
        therapist_id: UUID | None = None,
        specialty: str | None = None,
        is_reassessment: bool | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[SoapAssessment]:
        """List SOAP assessments with optional clinic, patient, appointment, therapist, specialty, and reassessment filters."""

        effective_limit = min(limit, 500)
        statement = select(SoapAssessment)

        if patient_id is not None:
            statement = statement.where(SoapAssessment.patient_id == patient_id)

        if appointment_id is not None:
            statement = statement.where(SoapAssessment.appointment_id == appointment_id)

        if therapist_id is not None:
            statement = statement.where(SoapAssessment.therapist_id == therapist_id)

        if specialty is not None:
            statement = statement.where(SoapAssessment.specialty == specialty)

        if is_reassessment is not None:
            statement = statement.where(SoapAssessment.is_reassessment == is_reassessment)

        statement = self._apply_clinic_scope(statement, clinic_id).offset(offset).limit(effective_limit)
        result = await self.session.scalars(statement)
        return list(result.all())

    async def count_assessments(
        self,
        *,
        clinic_id: UUID | None = None,
        patient_id: UUID | None = None,
        appointment_id: UUID | None = None,
        therapist_id: UUID | None = None,
        specialty: str | None = None,
        is_reassessment: bool | None = None,
    ) -> int:
        """Count SOAP assessments with optional filters."""

        from sqlalchemy import func
        statement = select(func.count()).select_from(SoapAssessment)

        if patient_id is not None:
            statement = statement.where(SoapAssessment.patient_id == patient_id)

        if appointment_id is not None:
            statement = statement.where(SoapAssessment.appointment_id == appointment_id)

        if therapist_id is not None:
            statement = statement.where(SoapAssessment.therapist_id == therapist_id)

        if specialty is not None:
            statement = statement.where(SoapAssessment.specialty == specialty)

        if is_reassessment is not None:
            statement = statement.where(SoapAssessment.is_reassessment == is_reassessment)

        statement = self._apply_soft_delete_filter(statement)
        statement = self._apply_clinic_scope(statement, clinic_id)
        result = await self.session.scalar(statement)
        return int(result or 0)
