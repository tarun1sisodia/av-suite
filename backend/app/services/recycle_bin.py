from __future__ import annotations

from typing import Any
from uuid import UUID

from app.repositories.appointment import AppointmentRepository
from app.repositories.billing import InvoiceRepository
from app.repositories.document import PatientDocumentRepository
from app.repositories.lead import LeadRepository
from app.repositories.patient import PatientRepository
from app.schemas.recycle_bin import (
    RecycleBinItemResponse,
    RecycleBinRestoreResponse,
)


class RecycleBinError(Exception):
    """Raised when an invalid operation is performed in the Recycle Bin."""


class RecycleBinNotFoundError(Exception):
    """Raised when a deleted resource is not found in the Recycle Bin."""


class RecycleBinService:
    """Service managing listing and restoration of soft-deleted clinic resources."""

    patient_repository: PatientRepository
    lead_repository: LeadRepository
    appointment_repository: AppointmentRepository
    invoice_repository: InvoiceRepository
    document_repository: PatientDocumentRepository

    def __init__(
        self,
        patient_repository: PatientRepository,
        lead_repository: LeadRepository,
        appointment_repository: AppointmentRepository,
        invoice_repository: InvoiceRepository,
        document_repository: PatientDocumentRepository,
    ) -> None:
        """Inject repositories supporting soft deletion."""

        self.patient_repository = patient_repository
        self.lead_repository = lead_repository
        self.appointment_repository = appointment_repository
        self.invoice_repository = invoice_repository
        self.document_repository = document_repository

    def _normalize_resource_type(self, raw_type: str) -> str:
        """Normalize plural and singular resource type names."""

        normalized = raw_type.lower().strip()
        mapping = {
            "patients": "patient",
            "patient": "patient",
            "leads": "lead",
            "lead": "lead",
            "appointments": "appointment",
            "appointment": "appointment",
            "invoices": "invoice",
            "invoice": "invoice",
            "documents": "document",
            "document": "document",
        }
        if normalized not in mapping:
            raise RecycleBinError(f"Unsupported resource type '{raw_type}'. Supported types: patient, lead, appointment, invoice, document.")
        return mapping[normalized]

    async def list_deleted(
        self, clinic_id: UUID, resource_type: str | None = None
    ) -> list[RecycleBinItemResponse]:
        """List soft-deleted items across all or specified resources for the clinic."""

        items: list[RecycleBinItemResponse] = []
        target_type = self._normalize_resource_type(resource_type) if resource_type else None

        if target_type is None or target_type == "patient":
            patients = await self.patient_repository.list_deleted(clinic_id=clinic_id)
            for p in patients:
                if p.deleted_at is not None:
                    items.append(
                        RecycleBinItemResponse(
                            id=p.id,
                            resource_type="patient",
                            title=p.full_name,
                            deleted_at=p.deleted_at,
                            deleted_by=getattr(p, "deleted_by", None),
                        )
                    )

        if target_type is None or target_type == "lead":
            leads = await self.lead_repository.list_deleted(clinic_id=clinic_id)
            for l_item in leads:
                if l_item.deleted_at is not None:
                    items.append(
                        RecycleBinItemResponse(
                            id=l_item.id,
                            resource_type="lead",
                            title=l_item.name,
                            deleted_at=l_item.deleted_at,
                            deleted_by=getattr(l_item, "deleted_by", None),
                        )
                    )

        if target_type is None or target_type == "appointment":
            appts = await self.appointment_repository.list_deleted(clinic_id=clinic_id)
            for appt in appts:
                if appt.deleted_at is not None:
                    items.append(
                        RecycleBinItemResponse(
                            id=appt.id,
                            resource_type="appointment",
                            title=f"Appointment {appt.id}",
                            deleted_at=appt.deleted_at,
                            deleted_by=getattr(appt, "deleted_by", None),
                        )
                    )

        if target_type is None or target_type == "invoice":
            invoices = await self.invoice_repository.list_deleted(clinic_id=clinic_id)
            for inv in invoices:
                if inv.deleted_at is not None:
                    items.append(
                        RecycleBinItemResponse(
                            id=inv.id,
                            resource_type="invoice",
                            title=inv.invoice_number,
                            deleted_at=inv.deleted_at,
                            deleted_by=getattr(inv, "deleted_by", None),
                        )
                    )

        if target_type is None or target_type == "document":
            docs = await self.document_repository.list_deleted(clinic_id=clinic_id)
            for doc in docs:
                if doc.deleted_at is not None:
                    items.append(
                        RecycleBinItemResponse(
                            id=doc.id,
                            resource_type="document",
                            title=doc.label,
                            deleted_at=doc.deleted_at,
                            deleted_by=getattr(doc, "deleted_by", None),
                        )
                    )

        items.sort(key=lambda x: x.deleted_at, reverse=True)
        return items

    async def restore_resource(
        self, clinic_id: UUID, resource_type: str, id: UUID
    ) -> RecycleBinRestoreResponse:
        """Restore a soft-deleted entity for the clinic."""

        norm_type = self._normalize_resource_type(resource_type)
        repo_map: dict[str, Any] = {
            "patient": self.patient_repository,
            "lead": self.lead_repository,
            "appointment": self.appointment_repository,
            "invoice": self.invoice_repository,
            "document": self.document_repository,
        }
        repo = repo_map[norm_type]

        entity = await repo.get_by_id(id, clinic_id=clinic_id, include_deleted=True)
        if entity is None:
            raise RecycleBinNotFoundError(f"{norm_type.capitalize()} '{id}' not found for clinic '{clinic_id}'.")

        if not getattr(entity, "deleted_at", None):
            raise RecycleBinError(f"{norm_type.capitalize()} '{id}' is not in the recycle bin (not deleted).")

        await repo.restore(entity)
        return RecycleBinRestoreResponse(
            message=f"{norm_type.capitalize()} restored successfully.",
            resource_type=norm_type,
            id=id,
            restored=True,
        )
