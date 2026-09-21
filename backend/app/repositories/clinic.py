from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clinic import Clinic
from app.repositories.base import BaseRepository


class ClinicRepository(BaseRepository[Clinic]):
    """Repository for Clinic entity operations."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository bound to session."""

        super().__init__(session, Clinic)

    async def get_by_slug_or_id(self, identifier: str) -> Clinic | None:
        """Find a clinic by UUID string or name/slug match."""

        try:
            clinic_uuid = UUID(identifier)
            return await self.get_by_id(clinic_uuid)
        except ValueError:
            pass

        cleaned_identifier = identifier.replace("-", " ").strip()
        statement = select(Clinic).where(Clinic.name.ilike(f"%{cleaned_identifier}%"))
        result = await self.session.scalars(statement)
        return result.first()

    async def get_by_slug(self, slug: str) -> Clinic | None:
        """Find a clinic by name/slug match."""
        return await self.get_by_slug_or_id(slug)

