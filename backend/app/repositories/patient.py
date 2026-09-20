from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums.patient import PatientStatus
from app.models.patient import Patient
from app.repositories.base import BaseRepository


class PatientRepository(BaseRepository[Patient]):
    """Repository for clinic-scoped patient persistence operations."""

    def __init__(self, session: AsyncSession) -> None:
        """Create a patient repository bound to the active session."""

        super().__init__(session, Patient)

    async def get_by_patient_id(self, id: UUID, *, clinic_id: UUID | None = None) -> Patient | None:
        """Return a single patient by primary key ID and clinic scope."""

        return await self.get_by_id(id, clinic_id=clinic_id)

    async def search_by_name(
        self,
        name: str,
        *,
        clinic_id: UUID | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[Patient]:
        """Search patients by case-insensitive name match."""

        effective_limit = min(limit, 500)
        statement = select(Patient).where(Patient.full_name.ilike(f"%{name.strip()}%"))
        statement = self._apply_clinic_scope(statement, clinic_id)
        statement = self._apply_soft_delete_filter(statement).offset(offset).limit(effective_limit)
        result = await self.session.scalars(statement)
        return list(result.all())

    async def search_by_phone(
        self,
        phone: str,
        *,
        clinic_id: UUID | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[Patient]:
        """Search patients by phone number match."""

        effective_limit = min(limit, 500)
        statement = select(Patient).where(Patient.phone.ilike(f"%{phone.strip()}%"))
        statement = self._apply_clinic_scope(statement, clinic_id)
        statement = self._apply_soft_delete_filter(statement).offset(offset).limit(effective_limit)
        result = await self.session.scalars(statement)
        return list(result.all())

    async def search_by_email(
        self,
        email: str,
        *,
        clinic_id: UUID | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[Patient]:
        """Search patients by email address if supported."""

        if not hasattr(Patient, "email"):
            return []

        effective_limit = min(limit, 500)
        statement = select(Patient).where(getattr(Patient, "email").ilike(f"%{email.strip()}%"))
        statement = self._apply_clinic_scope(statement, clinic_id)
        statement = self._apply_soft_delete_filter(statement).offset(offset).limit(effective_limit)
        result = await self.session.scalars(statement)
        return list(result.all())

    async def list_active(
        self,
        *,
        clinic_id: UUID | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[Patient]:
        """Return active patients for a clinic."""

        effective_limit = min(limit, 500)
        statement = select(Patient).where(Patient.status == PatientStatus.ACTIVE)
        statement = self._apply_clinic_scope(statement, clinic_id)
        statement = self._apply_soft_delete_filter(statement).offset(offset).limit(effective_limit)
        result = await self.session.scalars(statement)
        return list(result.all())

    async def update_patient(self, db_obj: Patient, update_data: dict) -> Patient:
        """Update only supplied fields and preserve updated_at."""
        
        return await self.update(db_obj, update_data)

    async def soft_delete_patient(self, db_obj: Patient, deleted_by: UUID | None = None) -> None:
        """Soft delete a patient."""
        
        await self.delete(db_obj, deleted_by)

