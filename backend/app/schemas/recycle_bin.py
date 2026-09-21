from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field


class RecycleBinItemResponse(BaseModel):
    """Schema representing a single soft-deleted resource in the recycle bin."""

    id: UUID = Field(..., description="Unique UUID of the soft-deleted resource.")
    resource_type: str = Field(..., description="Resource entity name (e.g. patient, lead, appointment, invoice, document).")
    title: str = Field(..., description="Display title or name of the deleted entity.")
    deleted_at: datetime = Field(..., description="Timestamp when entity was soft-deleted.")
    deleted_by: UUID | None = Field(default=None, description="UUID of staff user who performed soft-deletion.")

    @computed_field
    @property
    def name(self) -> str:
        return self.title

    @computed_field
    @property
    def resource(self) -> str:
        return self.resource_type

    model_config = ConfigDict(from_attributes=True)


class RecycleBinListResponse(BaseModel):
    """Schema representing a list of items in the recycle bin."""

    items: list[RecycleBinItemResponse]
    total: int


class RecycleBinRestoreResponse(BaseModel):
    """Response schema returned after restoring a soft-deleted resource."""

    message: str
    resource_type: str
    id: UUID
    restored: bool


class RecycleBinDeleteResponse(BaseModel):
    """Response schema returned after permanently deleting a soft-deleted resource."""

    message: str
    resource_type: str
    id: UUID
    deleted: bool
