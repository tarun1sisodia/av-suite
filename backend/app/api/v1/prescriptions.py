from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, List, Optional
import uuid
import logging
from app.core.dependencies import get_current_user
from app.enums.permission import CapabilityScope
from app.models.user import User

from app.core.database import get_db
from app.core.dependencies import require_capability
from app.schemas.prescription import (
    PrescriptionCreate,
    PrescriptionRead,
    PrescriptionPatch,
)
from app.schemas.envelope import ResponseEnvelope, MetaPagination
from app.schemas.common import PaginationParams
from app.dependencies.pagination import get_pagination_params
from app.services import prescription_service
from fastapi.responses import FileResponse
import os

logger = logging.getLogger(__name__)

router = APIRouter()
CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.post(
    "",
    response_model=ResponseEnvelope[PrescriptionRead],
    status_code=201,
    tags=["Prescriptions"],
)
async def create_prescription(
    request: Request,
    prescription_in: PrescriptionCreate,
    user: CurrentUserDep,
    db: AsyncSession = Depends(get_db),
    scope: CapabilityScope = Depends(require_capability("prescriptions.create")),
):
    """
    Creates a new exercise prescription for a patient.
    Strictly scoped to the clinician's clinic_id and logged-in user_id.
    """
    logger.info(
        f"Received create prescription request for patient {prescription_in.patient_id}"
    )
    try:
        clinic_id = request.state.clinic_id
        physio_id = user.id

        c_uuid = uuid.UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
        p_uuid = uuid.UUID(physio_id) if isinstance(physio_id, str) else physio_id

        prescription = await prescription_service.create_prescription(
            db, c_uuid, p_uuid, prescription_in
        )
        return ResponseEnvelope(data=prescription)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating prescription: {str(e)}")
        raise


@router.get(
    "", response_model=ResponseEnvelope[List[PrescriptionRead]], tags=["Prescriptions"]
)
async def list_prescriptions(
    request: Request,
    user: CurrentUserDep,
    patient_id: Optional[uuid.UUID] = Query(None, description="Filter by patient ID"),
    search: Optional[str] = Query(
        None, description="Search by patient name, exercise title, or related fields"
    ),
    pagination: PaginationParams = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_db),
    scope: CapabilityScope = Depends(require_capability("prescriptions.view")),
):
    """
    List prescriptions in a clinic, optionally filtered by patient.
    """
    logger.info(f"Listing prescriptions. Filter by patient: {patient_id}")
    try:
        clinic_id = request.state.clinic_id
        prescriptions, total = await prescription_service.get_prescriptions(
            db,
            uuid.UUID(clinic_id),
            None if scope == CapabilityScope.ALL else user.id,
            patient_id=patient_id,
            search=search,
            page=pagination.page,
            page_size=pagination.page_size,
        )
        meta = MetaPagination(
            total=total, page=pagination.page, page_size=pagination.page_size
        )
        return ResponseEnvelope(data=prescriptions, meta=meta)
    except Exception as e:
        logger.error(f"Error listing prescriptions: {str(e)}")
        raise


@router.get(
    "/{id}", response_model=ResponseEnvelope[PrescriptionRead], tags=["Prescriptions"]
)
async def get_prescription(
    request: Request,
    id: uuid.UUID,
    user: CurrentUserDep,
    db: AsyncSession = Depends(get_db),
    scope: CapabilityScope = Depends(require_capability("prescriptions.view")),
):
    """
    Fetches a specific prescription by ID.
    """
    logger.info(f"Fetching prescription: {id}")
    try:
        clinic_id = request.state.clinic_id
        prescription = await prescription_service.get_prescription_by_id(
            db, uuid.UUID(clinic_id), id
        )
        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prescription not found or not in user's clinic",
            )
        if scope == CapabilityScope.OWN and prescription.physio_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own prescriptions.",
            )
        return ResponseEnvelope(data=prescription)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting prescription {id}: {str(e)}")
        raise


@router.patch(
    "/{id}", response_model=ResponseEnvelope[PrescriptionRead], tags=["Prescriptions"]
)
async def update_prescription(
    request: Request,
    id: uuid.UUID,
    patch_in: PrescriptionPatch,
    user: CurrentUserDep,
    db: AsyncSession = Depends(get_db),
    scope: CapabilityScope = Depends(require_capability("prescriptions.edit")),
):
    """
    Patches/updates prescription details.
    """
    logger.info(f"Patching prescription: {id}")
    try:
        clinic_id = request.state.clinic_id
        existing = await prescription_service.get_prescription_by_id(
            db, uuid.UUID(clinic_id), id
        )
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prescription not found or not in user's clinic",
            )
        if scope == CapabilityScope.OWN and existing.physio_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own prescriptions.",
            )
        prescription = await prescription_service.patch_prescription(
            db, uuid.UUID(clinic_id), id, patch_in
        )
        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prescription not found or not in user's clinic",
            )
        return ResponseEnvelope(data=prescription)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating prescription {id}: {str(e)}")
        raise


@router.delete("/{id}", response_model=ResponseEnvelope[dict], tags=["Prescriptions"])
async def delete_prescription(
    request: Request,
    id: uuid.UUID,
    user: CurrentUserDep,
    db: AsyncSession = Depends(get_db),
    scope: CapabilityScope = Depends(require_capability("prescriptions.delete")),
):
    """Deletes a prescription by ID in clinic scope."""

    clinic_id = request.state.clinic_id
    prescription = await prescription_service.get_prescription_by_id(
        db, uuid.UUID(clinic_id), id
    )
    if not prescription:
        raise HTTPException(
            status_code=404, detail="Prescription not found or not in user's clinic"
        )
    if scope == CapabilityScope.OWN and prescription.physio_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own prescriptions.",
        )
    deleted = await prescription_service.delete_prescription(
        db, uuid.UUID(clinic_id), id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found or not in user's clinic",
        )
    return ResponseEnvelope(data={"message": "Prescription deleted successfully."})


@router.post("/{id}/pdf", response_model=ResponseEnvelope[dict], tags=["Prescriptions"])
async def generate_pdf(
    request: Request,
    id: uuid.UUID,
    user: CurrentUserDep,
    db: AsyncSession = Depends(get_db),
    scope: CapabilityScope = Depends(require_capability("prescriptions.view")),
):
    """
    Generates a PDF for the prescription and returns the static file URL.
    """
    logger.info(f"Generating PDF for prescription: {id}")
    try:
        clinic_id = request.state.clinic_id
        prescription = await prescription_service.get_prescription_by_id(
            db, uuid.UUID(clinic_id), id
        )
        if not prescription:
            raise HTTPException(status_code=404, detail="Prescription not found")
        if scope == CapabilityScope.OWN and prescription.physio_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only generate your own prescription PDF.",
            )
        response = await prescription_service.generate_prescription_pdf_response(
            db, uuid.UUID(clinic_id), id
        )
        return ResponseEnvelope(data=response)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating PDF for prescription {id}: {str(e)}")
        raise


@router.get("/{id}/pdf/download", tags=["Prescriptions"])
async def download_pdf(
    request: Request,
    id: uuid.UUID,
    user: CurrentUserDep,
    db: AsyncSession = Depends(get_db),
    scope: CapabilityScope = Depends(require_capability("prescriptions.view")),
):
    """
    Securely streams the prescription PDF, scoped to the requester's clinic.
    Replaces the old public /static/... access (no auth, no tenant check).
    """
    clinic_id = request.state.clinic_id
    rx = await prescription_service.get_prescription_by_id(db, uuid.UUID(clinic_id), id)
    if not rx or not rx.pdf_key:
        raise HTTPException(status_code=404, detail="PDF not found")
    if scope == CapabilityScope.OWN and rx.physio_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only download your own prescription PDF.",
        )
    file_path = os.path.join("static", "prescriptions", rx.pdf_key)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on server")
    return FileResponse(file_path, media_type="application/pdf", filename=rx.pdf_key)
