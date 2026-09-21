from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.dependencies import require_capability

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_async_session, get_current_clinic
from app.models.clinic import Clinic
from app.repositories.appointment import AppointmentRepository
from app.repositories.billing import InvoiceRepository
from app.repositories.document import PatientDocumentRepository
from app.repositories.lead import LeadRepository
from app.repositories.patient import PatientRepository
from app.schemas.recycle_bin import (
    RecycleBinDeleteResponse,
    RecycleBinListResponse,
    RecycleBinRestoreResponse,
)
from app.services.recycle_bin import (
    RecycleBinError,
    RecycleBinNotFoundError,
    RecycleBinService,
)

router = APIRouter()


async def get_recycle_bin_service(
    session: AsyncSession = Depends(get_async_session),
) -> RecycleBinService:
    """Inject RecycleBinService bound to async session."""

    return RecycleBinService(
        patient_repository=PatientRepository(session),
        lead_repository=LeadRepository(session),
        appointment_repository=AppointmentRepository(session),
        invoice_repository=InvoiceRepository(session),
        document_repository=PatientDocumentRepository(session),
    )


RecycleBinServiceDep = Annotated[RecycleBinService, Depends(get_recycle_bin_service)]
CurrentClinicDep = Annotated[Clinic, Depends(get_current_clinic)]


@router.get("/recycle-bin", response_model=RecycleBinListResponse)
async def list_recycle_bin_items(
    clinic: CurrentClinicDep,
    service: RecycleBinServiceDep,
    _: None = Depends(require_capability("recyclebin.view")),
    resource_type: Annotated[str | None, Query(alias="resource_type")] = None,
) -> RecycleBinListResponse:
    """List soft-deleted resources for the authenticated clinic."""

    try:
        items = await service.list_deleted(clinic.id, resource_type=resource_type)
        return RecycleBinListResponse(items=items, total=len(items))
    except RecycleBinError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.post(
    "/recycle-bin/{resource}/{id}/restore", response_model=RecycleBinRestoreResponse
)
async def restore_recycle_bin_item(
    resource: str,
    id: UUID,
    clinic: CurrentClinicDep,
    service: RecycleBinServiceDep,
    _: None = Depends(require_capability("recyclebin.restore")),
) -> RecycleBinRestoreResponse:
    """Restore a soft-deleted resource belonging to the authenticated clinic."""

    try:
        return await service.restore_resource(clinic.id, resource, id)
    except RecycleBinNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except RecycleBinError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.delete(
    "/recycle-bin/{resource}/{id}", response_model=RecycleBinDeleteResponse
)
async def permanent_delete_recycle_bin_item(
    resource: str,
    id: UUID,
    clinic: CurrentClinicDep,
    service: RecycleBinServiceDep,
    _: None = Depends(require_capability("recyclebin.delete")),
) -> RecycleBinDeleteResponse:
    """Permanently delete a soft-deleted resource belonging to the authenticated clinic.

    This action is irreversible — the record will be removed from the database.
    Only items that are already in the recycle bin (soft-deleted) can be targeted.
    """

    try:
        return await service.permanent_delete_resource(clinic.id, resource, id)
    except RecycleBinNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except RecycleBinError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
