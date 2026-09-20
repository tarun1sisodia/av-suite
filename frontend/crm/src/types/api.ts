import { components } from './schema';

export type UserRole = 'admin' | 'therapist' | 'front_desk' | 'patient';

export type PatientStatus = 'active' | 'inactive' | 'discharged';
export type LeadStage = components['schemas']['LeadStage'];
export type AppointmentStatus = components['schemas']['AppointmentStatus'];
export type AppointmentSource = components['schemas']['AppointmentSource'];
export type PackageStatus = components['schemas']['PackageStatus'];
export type InvoiceStatus = components['schemas']['InvoiceStatus'];
export type PaymentMethod = components['schemas']['PaymentMethod'];
export type PaymentStatus = 'completed' | 'voided';
export type DocumentCategory = components['schemas']['DocumentCategory'];

export interface User {
  id: string;
  clinic_id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type Patient = components['schemas']['PatientRead'] & {
  gender?: string | null;
  chief_complaint?: string | null;
  referral_source?: string | null;
  status: PatientStatus;
  deleted_at?: string | null;
};

export type Lead = components['schemas']['LeadResponse'];

export type Appointment = components['schemas']['AppointmentResponse'] & {
  appointment_type?: string | null;
  patient_name?: string | null;
  therapist_name?: string | null;
};

export type TreatmentSession = components['schemas']['TreatmentSessionResponse'] & {
  treatment?: string | null;
};

export type SoapAssessment = Omit<components['schemas']['SoapAssessmentResponse'], 'form_data'> & {
  form_data?: Record<string, any>;
  finalized_at?: string | null;
  author_id?: string | null;
};

export type Package = Omit<components['schemas']['PackageResponse'], 'price'> & {
  price: number | string;
};

export type PatientPackage = Omit<components['schemas']['PatientPackageResponse'], 'price' | 'sessions_remaining'> & {
  price: number | string;
  sessions_remaining?: number;
};

export type Invoice = Omit<components['schemas']['InvoiceResponse'], 'subtotal' | 'discount_amount' | 'tax_amount' | 'total_amount' | 'paid_amount'> & {
  subtotal: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  paid_amount: number | string;
  patient_name?: string | null;
};

export type InvoiceItem = Omit<components['schemas']['InvoiceItemResponse'], 'unit_price' | 'total_price'> & {
  unit_price: number | string;
  total_price: number | string;
};

export type Payment = Omit<components['schemas']['PaymentResponse'], 'amount'> & {
  amount: number | string;
  status?: PaymentStatus;
};

export type PatientDocument = components['schemas']['PatientDocumentResponse'];

export type AuditLog = Omit<components['schemas']['AuditLogResponse'], 'details'> & {
  details?: Record<string, any>;
  user_name?: string | null;
};

export type AnalyticsOverview = {
  total_patients: number;
  active_appointments_today: number;
  monthly_revenue: number;
  pending_leads: number;
  revenue_trend: Array<{ date: string; amount: number }>;
  patients?: components['schemas']['AnalyticsOverviewResponse']['patients'];
  appointments?: components['schemas']['AnalyticsOverviewResponse']['appointments'];
  revenue?: components['schemas']['AnalyticsOverviewResponse']['revenue'];
  leads?: components['schemas']['AnalyticsOverviewResponse']['leads'];
};
