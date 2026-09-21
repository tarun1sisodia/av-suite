from __future__ import annotations

from uuid import UUID

from app.enums.lead import LeadStage
from app.enums.patient import PatientStatus
from app.models.lead import Lead
from app.models.patient import Patient
from app.repositories.lead import LeadRepository
from app.repositories.patient import PatientRepository
from app.repositories.user import UserRepository
from app.schemas.lead import LeadCreate, LeadUpdate


class LeadValidationError(Exception):
    """Raised when validation fails for lead operations."""


class LeadNotFoundError(Exception):
    """Raised when a lead resource is not found."""


class LeadService:
    """Service managing sales leads and patient conversion with clinic isolation."""

    lead_repository: LeadRepository
    patient_repository: PatientRepository
    user_repository: UserRepository

    def __init__(
        self,
        lead_repository: LeadRepository,
        patient_repository: PatientRepository,
        user_repository: UserRepository,
    ) -> None:
        """Inject repositories required for lead management."""

        self.lead_repository = lead_repository
        self.patient_repository = patient_repository
        self.user_repository = user_repository

    async def create_lead(self, clinic_id: UUID, payload: LeadCreate) -> Lead:
        """Create a new prospective lead for a clinic."""

        if payload.assigned_to is not None:
            user = await self.user_repository.get_by_id(payload.assigned_to, clinic_id=clinic_id)
            if user is None:
                raise LeadValidationError(
                    f"User '{payload.assigned_to}' does not exist or does not belong to clinic '{clinic_id}'."
                )

        lead_data = payload.model_dump()
        lead_data["clinic_id"] = clinic_id
        lead = await self.lead_repository.create(lead_data)
        await self.lead_repository.session.commit()
        return lead

    async def get_lead(self, clinic_id: UUID, lead_id: UUID) -> Lead:
        """Retrieve a lead ensuring clinic scoping."""

        lead = await self.lead_repository.get_by_id(lead_id, clinic_id=clinic_id)
        if lead is None:
            raise LeadNotFoundError(f"Lead '{lead_id}' not found for clinic '{clinic_id}'.")
        return lead

    async def list_leads(
        self,
        clinic_id: UUID,
        *,
        stage: LeadStage | None = None,
        assigned_to: UUID | None = None,
        source: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[Lead]:
        """List leads for a clinic with stage/assignee/source filtering and search."""

        return await self.lead_repository.list_leads(
            clinic_id=clinic_id,
            stage=stage,
            assigned_to=assigned_to,
            source=source,
            search=search,
            offset=offset,
            limit=limit,
        )

    async def count_leads(
        self,
        clinic_id: UUID,
        *,
        stage: LeadStage | None = None,
        assigned_to: UUID | None = None,
        source: str | None = None,
        search: str | None = None,
    ) -> int:
        """Count leads for a clinic with stage/assignee/source filtering and search."""

        return await self.lead_repository.count_leads(
            clinic_id=clinic_id,
            stage=stage,
            assigned_to=assigned_to,
            source=source,
            search=search,
        )

    async def update_lead(self, clinic_id: UUID, lead_id: UUID, payload: LeadUpdate) -> Lead:
        """Update lead details or stage."""

        lead = await self.get_lead(clinic_id, lead_id)
        update_data = payload.model_dump(exclude_unset=True)

        if payload.assigned_to is not None:
            user = await self.user_repository.get_by_id(payload.assigned_to, clinic_id=clinic_id)
            if user is None:
                raise LeadValidationError(
                    f"User '{payload.assigned_to}' does not exist or does not belong to clinic '{clinic_id}'."
                )

        if not update_data:
            return lead

        updated = await self.lead_repository.update(lead, update_data)
        await self.lead_repository.session.commit()
        return updated

    async def convert_lead_to_patient(self, clinic_id: UUID, lead_id: UUID) -> tuple[Lead, Patient]:
        """Convert a lead into an active patient record in the service layer."""

        lead = await self.get_lead(clinic_id, lead_id)
        if lead.stage == LeadStage.CONVERTED or lead.converted_patient_id is not None:
            raise LeadValidationError(f"Lead '{lead_id}' has already been converted to a patient.")

        patient_data = {
            "clinic_id": clinic_id,
            "full_name": lead.name,
            "phone": lead.phone,
            "status": PatientStatus.ACTIVE,
        }
        patient = await self.patient_repository.create(patient_data)

        updated_lead = await self.lead_repository.update(
            lead,
            {
                "stage": LeadStage.CONVERTED,
                "converted_patient_id": patient.id,
            },
        )
        await self.lead_repository.session.commit()

        return updated_lead, patient

    async def delete_lead(self, clinic_id: UUID, lead_id: UUID) -> None:
        """Delete a lead record for the clinic."""

        lead = await self.get_lead(clinic_id, lead_id)
        await self.lead_repository.delete(lead)
        await self.lead_repository.session.commit()
