from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime, timezone
from typing import Any, Generic, Protocol, TypeVar
from uuid import UUID

from sqlalchemy import Select, exists, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped


class SupportsUUIDPrimaryKey(Protocol):
    """Protocol for ORM instances that expose a UUID primary key."""

    @property
    def id(self) -> UUID | Mapped[UUID]: ...


ModelT = TypeVar("ModelT", bound=SupportsUUIDPrimaryKey)


class BaseRepository(Generic[ModelT]):
    """Generic async repository for SQLAlchemy ORM models with soft-delete support."""

    model: type[ModelT]
    session: AsyncSession

    def __init__(self, session: AsyncSession, model: type[ModelT]) -> None:
        """Store the active async database session."""

        self.session = session
        self.model = model

    def _has_clinic_scope(self) -> bool:
        """Return whether the mapped model exposes a clinic scope column."""

        return hasattr(self.model, "clinic_id")

    def _has_soft_delete(self) -> bool:
        """Return whether the mapped model supports soft deletion."""

        return hasattr(self.model, "deleted_at")

    def _apply_clinic_scope(self, statement: Select[Any], clinic_id: UUID | None) -> Select[Any]:
        """Apply a clinic filter when the model supports tenancy."""

        if self._has_clinic_scope():
            if clinic_id is None:
                raise ValueError(f"clinic_id is required for clinic-scoped model '{self.model.__name__}'.")
            clinic_column = getattr(self.model, "clinic_id")
            return statement.where(clinic_column == clinic_id)

        return statement

    def _apply_soft_delete_filter(self, statement: Select[Any], include_deleted: bool = False) -> Select[Any]:
        """Exclude soft-deleted rows by default unless explicitly included."""

        if self._has_soft_delete() and not include_deleted:
            deleted_at_col = getattr(self.model, "deleted_at")
            return statement.where(deleted_at_col.is_(None))

        return statement

    def _apply_id_filter(self, statement: Select[Any], id: UUID) -> Select[Any]:
        """Apply the primary-key filter in a type-safe SQLAlchemy-friendly way."""

        id_column = getattr(self.model, "id")
        return statement.where(id_column == id)

    async def _delete_instance(self, db_obj: ModelT) -> None:
        """Soft-delete if supported, else hard-delete the ORM instance."""

        if self._has_soft_delete():
            setattr(db_obj, "deleted_at", datetime.now(timezone.utc))
            self.session.add(db_obj)
        else:
            await self.session.delete(db_obj)

    async def create(self, obj_in: Mapping[str, object]) -> ModelT:
        """Create and persist a new ORM instance without committing."""

        obj = self.model()
        for field_name, value in obj_in.items():
            setattr(obj, field_name, value)

        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def get_by_id(
        self,
        id: UUID,
        *,
        clinic_id: UUID | None = None,
        include_deleted: bool = False,
    ) -> ModelT | None:
        """Return a single row by primary key with optional clinic scoping and soft-delete filter."""

        statement = self._apply_id_filter(select(self.model), id)
        statement = self._apply_clinic_scope(statement, clinic_id)
        statement = self._apply_soft_delete_filter(statement, include_deleted=include_deleted)
        result = await self.session.scalars(statement)
        return result.one_or_none()

    async def list(
        self,
        *,
        offset: int = 0,
        limit: int = 100,
        clinic_id: UUID | None = None,
        include_deleted: bool = False,
    ) -> list[ModelT]:
        """Return rows for the repository model with optional pagination, clinic scope, and soft-delete filter."""

        effective_limit = min(limit, 500)
        statement = select(self.model)
        statement = self._apply_clinic_scope(statement, clinic_id)
        statement = self._apply_soft_delete_filter(statement, include_deleted=include_deleted)
        statement = statement.offset(offset).limit(effective_limit)

        result = await self.session.scalars(statement)
        return list(result.all())

    async def list_deleted(
        self,
        *,
        clinic_id: UUID | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[ModelT]:
        """Return soft-deleted rows for the model."""

        if not self._has_soft_delete():
            return []

        effective_limit = min(limit, 500)
        deleted_at_col = getattr(self.model, "deleted_at")
        statement = select(self.model).where(deleted_at_col.isnot(None))
        statement = self._apply_clinic_scope(statement, clinic_id)
        statement = statement.offset(offset).limit(effective_limit)

        result = await self.session.scalars(statement)
        return list(result.all())

    async def get_all(
        self,
        *,
        offset: int = 0,
        limit: int = 100,
        clinic_id: UUID | None = None,
        include_deleted: bool = False,
    ) -> list[ModelT]:
        """Backward-compatible alias for list()."""

        return await self.list(offset=offset, limit=limit, clinic_id=clinic_id, include_deleted=include_deleted)

    async def update(self, db_obj: ModelT, obj_in: Mapping[str, object]) -> ModelT:
        """Apply field updates to an existing ORM instance without committing."""

        for field_name, value in obj_in.items():
            setattr(db_obj, field_name, value)

        self.session.add(db_obj)
        await self.session.flush()
        await self.session.refresh(db_obj)
        return db_obj

    async def delete(self, db_obj: ModelT, deleted_by: UUID | None = None) -> None:
        """Apply the repository's deletion strategy (soft-delete if supported)."""

        if self._has_soft_delete() and deleted_by is not None:
            setattr(db_obj, "deleted_by", deleted_by)

        await self._delete_instance(db_obj)
        await self.session.flush()

    async def restore(self, db_obj: ModelT) -> ModelT:
        """Restore a soft-deleted ORM instance."""

        if self._has_soft_delete():
            setattr(db_obj, "deleted_at", None)
            setattr(db_obj, "deleted_by", None)
            self.session.add(db_obj)
            await self.session.flush()
            await self.session.refresh(db_obj)

        return db_obj

    async def hard_delete(self, db_obj: ModelT) -> None:
        """Permanently remove an ORM instance from the database (no recovery possible)."""

        await self.session.delete(db_obj)
        await self.session.flush()

    async def exists(self, id: UUID, *, clinic_id: UUID | None = None, include_deleted: bool = False) -> bool:
        """Check whether a row exists for the given primary key and optional clinic scope."""

        statement = self._apply_id_filter(select(1).select_from(self.model), id)
        statement = self._apply_clinic_scope(statement, clinic_id)
        statement = self._apply_soft_delete_filter(statement, include_deleted=include_deleted)
        query = select(exists(statement))
        result = await self.session.scalar(query)
        return bool(result)

    async def count(self, *, clinic_id: UUID | None = None, include_deleted: bool = False) -> int:
        """Return the total count of rows for the model matching clinic scope and soft delete."""

        statement = select(func.count()).select_from(self.model)
        statement = self._apply_clinic_scope(statement, clinic_id)
        statement = self._apply_soft_delete_filter(statement, include_deleted=include_deleted)
        result = await self.session.scalar(statement)
        return int(result or 0)

