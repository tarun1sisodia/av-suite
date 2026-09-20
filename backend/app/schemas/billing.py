from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, ClassVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.enums.billing import InvoiceStatus, PaymentMethod
from app.enums.package import PackageStatus


# --- Package Catalog Schemas ---

class PackageBase(BaseModel):
    """Base fields for clinic package catalogue."""

    name: str
    total_sessions: int = Field(gt=0)
    price: Decimal = Field(ge=Decimal("0.00"))
    validity_days: int = Field(gt=0)


class PackageCreate(PackageBase):
    """Payload to create a package in catalogue."""

    pass


class PackageUpdate(BaseModel):
    """Payload to update a package in catalogue."""

    name: str | None = None
    total_sessions: int | None = Field(default=None, gt=0)
    price: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    validity_days: int | None = Field(default=None, gt=0)
    status: PackageStatus | None = None


class PackageResponse(PackageBase):
    """Response payload for package catalogue."""

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)

    id: UUID
    clinic_id: UUID
    status: PackageStatus
    created_at: datetime
    updated_at: datetime


class PackageListResponse(BaseModel):
    """Paginated list response for packages catalogue."""

    items: list[PackageResponse]
    total: int
    offset: int
    limit: int


# --- Patient Package Schemas ---

class PatientPackageBase(BaseModel):
    """Base fields for Patient Package."""

    patient_id: UUID
    package_id: UUID | None = None
    package_name: str
    total_sessions: int = Field(gt=0)
    price: Decimal = Field(ge=Decimal("0.00"))
    expires_at: datetime | None = None


class PatientPackageCreate(PatientPackageBase):
    """Payload to purchase a patient treatment package."""

    pass


class PatientPackageUpdate(BaseModel):
    """Payload to update a patient package."""

    completed_sessions: int | None = Field(default=None, ge=0)
    status: PackageStatus | None = None
    expires_at: datetime | None = None


class PatientPackageResponse(PatientPackageBase):
    """Response payload for Patient Package."""

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)

    id: UUID
    clinic_id: UUID
    completed_sessions: int
    sessions_remaining: int
    status: PackageStatus
    purchased_at: datetime
    created_at: datetime
    updated_at: datetime


class PatientPackageListResponse(BaseModel):
    """Paginated list response for Patient Packages."""

    items: list[PatientPackageResponse]
    total: int
    offset: int
    limit: int


# --- Invoice Item Schemas ---

class InvoiceItemBase(BaseModel):
    """Base fields for Invoice Line Item."""

    description: str
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(ge=Decimal("0.00"))


class InvoiceItemCreate(InvoiceItemBase):
    """Payload to create an invoice line item."""

    pass


class InvoiceItemResponse(InvoiceItemBase):
    """Response payload for invoice line item."""

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)

    id: UUID
    clinic_id: UUID
    invoice_id: UUID
    total_price: Decimal
    created_at: datetime
    updated_at: datetime


# --- Invoice Schemas ---

class InvoiceBase(BaseModel):
    """Base fields for Invoice."""

    patient_id: UUID
    appointment_id: UUID | None = None
    invoice_number: str | None = None
    issue_date: datetime | None = None
    due_date: datetime | None = None
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    notes: str | None = None


class InvoiceCreate(InvoiceBase):
    """Payload to create an invoice with line items."""

    items: list[InvoiceItemCreate] = Field(default_factory=list)
    line_items: list[dict[str, Any]] = Field(default_factory=list)


class InvoiceUpdate(BaseModel):
    """Payload to update an invoice."""

    appointment_id: UUID | None = None
    due_date: datetime | None = None
    discount_amount: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    tax_amount: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    status: InvoiceStatus | None = None
    notes: str | None = None


class InvoiceResponse(InvoiceBase):
    """Response payload for Invoice."""

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)

    id: UUID
    clinic_id: UUID
    subtotal: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    status: InvoiceStatus
    line_items: list[dict[str, Any]] = Field(default_factory=list)
    items: list[InvoiceItemResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class InvoiceListResponse(BaseModel):
    """Paginated list response for Invoices."""

    items: list[InvoiceResponse]
    total: int
    offset: int
    limit: int


# --- Payment Schemas ---

class PaymentBase(BaseModel):
    """Base fields for Payment."""

    invoice_id: UUID
    patient_id: UUID
    amount: Decimal = Field(gt=Decimal("0.00"))
    payment_method: PaymentMethod
    payment_date: datetime
    transaction_reference: str | None = None
    notes: str | None = None


class PaymentCreate(PaymentBase):
    """Payload to record a payment."""

    pass


class PaymentResponse(PaymentBase):
    """Response payload for Payment."""

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)

    id: UUID
    clinic_id: UUID
    created_at: datetime
    updated_at: datetime


class PaymentListResponse(BaseModel):
    """Paginated list response for Payments."""

    items: list[PaymentResponse]
    total: int
    offset: int
    limit: int
