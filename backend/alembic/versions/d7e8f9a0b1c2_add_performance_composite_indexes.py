"""add_performance_composite_indexes

Revision ID: d7e8f9a0b1c2
Revises: f1a2b3c4d6e7
Create Date: 2026-09-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7e8f9a0b1c2"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Patients composite index for clinic tenancy + soft deletion filter
    op.create_index(
        "ix_patients_clinic_deleted",
        "patients",
        ["clinic_id", "deleted_at"],
        unique=False,
    )

    # 2. Appointments composite index for calendar & date range queries
    op.create_index(
        "ix_appointments_clinic_scheduled",
        "appointments",
        ["clinic_id", "scheduled_at"],
        unique=False,
    )

    # 3. Appointments composite index for status queries
    op.create_index(
        "ix_appointments_clinic_status",
        "appointments",
        ["clinic_id", "status"],
        unique=False,
    )

    # 4. Treatment sessions composite index for timeline queries
    op.create_index(
        "ix_treatment_sessions_clinic_date",
        "treatment_sessions",
        ["clinic_id", "treatment_date"],
        unique=False,
    )

    # 5. Soap assessments composite index for patient history queries
    op.create_index(
        "ix_soap_assessments_clinic_created",
        "soap_assessments",
        ["clinic_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_soap_assessments_clinic_created", table_name="soap_assessments")
    op.drop_index("ix_treatment_sessions_clinic_date", table_name="treatment_sessions")
    op.drop_index("ix_appointments_clinic_status", table_name="appointments")
    op.drop_index("ix_appointments_clinic_scheduled", table_name="appointments")
    op.drop_index("ix_patients_clinic_deleted", table_name="patients")
