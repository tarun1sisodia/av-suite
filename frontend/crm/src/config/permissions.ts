import { UserRole } from '../types/api';

// ---------------------------------------------------------------------------
// CANONICAL CAPABILITY REGISTRY (64 KEYS)
// Matches backend/app/core/rbac.py (Lead Dev canonical specification)
// Format: module.action (no .manage keys)
// ---------------------------------------------------------------------------

export type CapabilityScope = 'none' | 'own' | 'all';

export type CanonicalCapabilityKey =
  // patients
  | 'patients.view'
  | 'patients.create'
  | 'patients.edit'
  | 'patients.delete'
  // leads
  | 'leads.view'
  | 'leads.create'
  | 'leads.edit'
  | 'leads.delete'
  | 'leads.convert'
  // appointments
  | 'appointments.view'
  | 'appointments.create'
  | 'appointments.edit'
  | 'appointments.delete'
  // treatments
  | 'treatments.view'
  | 'treatments.create'
  | 'treatments.edit'
  | 'treatments.delete'
  // assessments
  | 'assessments.view'
  | 'assessments.create'
  | 'assessments.edit'
  | 'assessments.delete'
  // prescriptions
  | 'prescriptions.view'
  | 'prescriptions.create'
  | 'prescriptions.edit'
  | 'prescriptions.delete'
  // exercises
  | 'exercises.view'
  | 'exercises.create'
  | 'exercises.edit'
  | 'exercises.delete'
  // documents
  | 'documents.view'
  | 'documents.upload'
  | 'documents.edit'
  | 'documents.delete'
  // invoices
  | 'invoices.view'
  | 'invoices.create'
  | 'invoices.edit'
  | 'invoices.delete'
  // payments
  | 'payments.view'
  | 'payments.record'
  | 'payments.delete'
  // packages
  | 'packages.view'
  | 'packages.create'
  | 'packages.edit'
  | 'packages.delete'
  | 'packages.assign'
  // booking
  | 'booking.view'
  | 'booking.approve'
  | 'booking.edit'
  | 'booking.delete'
  // analytics
  | 'analytics.my_performance'
  | 'analytics.clinic_financials'
  // settings
  | 'settings.view'
  | 'settings.edit'
  // users
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  // permissions
  | 'permissions.view'
  | 'permissions.edit'
  // audit
  | 'audit.view'
  // recycle bin
  | 'recyclebin.view'
  | 'recyclebin.restore'
  | 'recyclebin.delete'
  // posture
  | 'posture.view'
  | 'posture.create';

export interface CapabilityMeta {
  key: CanonicalCapabilityKey;
  module: string;
  label: string;
  allowedScopes: CapabilityScope[];
}

export const CANONICAL_CAPABILITIES: CapabilityMeta[] = [
  // Patients
  { key: 'patients.view', module: 'Patients', label: 'View Patients', allowedScopes: ['none', 'own', 'all'] },
  { key: 'patients.create', module: 'Patients', label: 'Create Patients', allowedScopes: ['none', 'all'] },
  { key: 'patients.edit', module: 'Patients', label: 'Edit Patients', allowedScopes: ['none', 'own', 'all'] },
  { key: 'patients.delete', module: 'Patients', label: 'Delete Patients', allowedScopes: ['none', 'all'] },
  // Leads
  { key: 'leads.view', module: 'Leads', label: 'View Leads', allowedScopes: ['none', 'all'] },
  { key: 'leads.create', module: 'Leads', label: 'Create Leads', allowedScopes: ['none', 'all'] },
  { key: 'leads.edit', module: 'Leads', label: 'Edit Leads', allowedScopes: ['none', 'all'] },
  { key: 'leads.delete', module: 'Leads', label: 'Delete Leads', allowedScopes: ['none', 'all'] },
  { key: 'leads.convert', module: 'Leads', label: 'Convert Leads to Patients', allowedScopes: ['none', 'own', 'all'] },
  // Appointments
  { key: 'appointments.view', module: 'Appointments', label: 'View Appointments', allowedScopes: ['none', 'own', 'all'] },
  { key: 'appointments.create', module: 'Appointments', label: 'Create Appointments', allowedScopes: ['none', 'own', 'all'] },
  { key: 'appointments.edit', module: 'Appointments', label: 'Edit / Reschedule Appointments', allowedScopes: ['none', 'own', 'all'] },
  { key: 'appointments.delete', module: 'Appointments', label: 'Cancel / Delete Appointments', allowedScopes: ['none', 'own', 'all'] },
  // Treatments
  { key: 'treatments.view', module: 'Treatments', label: 'View Treatment Sessions', allowedScopes: ['none', 'own', 'all'] },
  { key: 'treatments.create', module: 'Treatments', label: 'Create Treatment Sessions', allowedScopes: ['none', 'own', 'all'] },
  { key: 'treatments.edit', module: 'Treatments', label: 'Edit Treatment Sessions', allowedScopes: ['none', 'own', 'all'] },
  { key: 'treatments.delete', module: 'Treatments', label: 'Delete Treatment Sessions', allowedScopes: ['none', 'own', 'all'] },
  // Assessments
  { key: 'assessments.view', module: 'Assessments', label: 'View SOAP Assessments', allowedScopes: ['none', 'own', 'all'] },
  { key: 'assessments.create', module: 'Assessments', label: 'Create SOAP Assessments', allowedScopes: ['none', 'all'] },
  { key: 'assessments.edit', module: 'Assessments', label: 'Edit SOAP Assessments', allowedScopes: ['none', 'own', 'all'] },
  { key: 'assessments.delete', module: 'Assessments', label: 'Delete SOAP Assessments', allowedScopes: ['none', 'own', 'all'] },
  // Prescriptions
  { key: 'prescriptions.view', module: 'Prescriptions', label: 'View Prescriptions', allowedScopes: ['none', 'own', 'all'] },
  { key: 'prescriptions.create', module: 'Prescriptions', label: 'Create Prescriptions', allowedScopes: ['none', 'all'] },
  { key: 'prescriptions.edit', module: 'Prescriptions', label: 'Edit Prescriptions', allowedScopes: ['none', 'own', 'all'] },
  { key: 'prescriptions.delete', module: 'Prescriptions', label: 'Delete Prescriptions', allowedScopes: ['none', 'own', 'all'] },
  // Exercises
  { key: 'exercises.view', module: 'Exercises', label: 'View Exercise Library', allowedScopes: ['none', 'all'] },
  { key: 'exercises.create', module: 'Exercises', label: 'Create Exercises', allowedScopes: ['none', 'all'] },
  { key: 'exercises.edit', module: 'Exercises', label: 'Edit Exercises', allowedScopes: ['none', 'all'] },
  { key: 'exercises.delete', module: 'Exercises', label: 'Delete Exercises', allowedScopes: ['none', 'all'] },
  // Documents
  { key: 'documents.view', module: 'Documents', label: 'View Documents', allowedScopes: ['none', 'own', 'all'] },
  { key: 'documents.upload', module: 'Documents', label: 'Upload Documents', allowedScopes: ['none', 'all'] },
  { key: 'documents.edit', module: 'Documents', label: 'Edit Documents', allowedScopes: ['none', 'own', 'all'] },
  { key: 'documents.delete', module: 'Documents', label: 'Delete Documents', allowedScopes: ['none', 'own', 'all'] },
  // Invoices
  { key: 'invoices.view', module: 'Billing', label: 'View Invoices', allowedScopes: ['none', 'own', 'all'] },
  { key: 'invoices.create', module: 'Billing', label: 'Create Invoices', allowedScopes: ['none', 'all'] },
  { key: 'invoices.edit', module: 'Billing', label: 'Edit Invoices', allowedScopes: ['none', 'all'] },
  { key: 'invoices.delete', module: 'Billing', label: 'Delete Invoices', allowedScopes: ['none', 'all'] },
  // Payments
  { key: 'payments.view', module: 'Billing', label: 'View Payments', allowedScopes: ['none', 'all'] },
  { key: 'payments.record', module: 'Billing', label: 'Record Payments', allowedScopes: ['none', 'all'] },
  { key: 'payments.delete', module: 'Billing', label: 'Delete Payments', allowedScopes: ['none', 'all'] },
  // Packages
  { key: 'packages.view', module: 'Billing', label: 'View Packages', allowedScopes: ['none', 'all'] },
  { key: 'packages.create', module: 'Billing', label: 'Create Packages', allowedScopes: ['none', 'all'] },
  { key: 'packages.edit', module: 'Billing', label: 'Edit Packages', allowedScopes: ['none', 'all'] },
  { key: 'packages.delete', module: 'Billing', label: 'Delete Packages', allowedScopes: ['none', 'all'] },
  { key: 'packages.assign', module: 'Billing', label: 'Assign Packages to Patients', allowedScopes: ['none', 'all'] },
  // Booking
  { key: 'booking.view', module: 'Booking', label: 'View Booking Requests', allowedScopes: ['none', 'all'] },
  { key: 'booking.approve', module: 'Booking', label: 'Approve / Reject Requests', allowedScopes: ['none', 'all'] },
  { key: 'booking.edit', module: 'Booking', label: 'Edit Booking Requests', allowedScopes: ['none', 'all'] },
  { key: 'booking.delete', module: 'Booking', label: 'Delete Booking Requests', allowedScopes: ['none', 'all'] },
  // Analytics
  { key: 'analytics.my_performance', module: 'Analytics', label: 'My Performance Analytics', allowedScopes: ['none', 'own', 'all'] },
  { key: 'analytics.clinic_financials', module: 'Analytics', label: 'Clinic Financial Analytics', allowedScopes: ['none', 'all'] },
  // Settings
  { key: 'settings.view', module: 'Settings', label: 'View Clinic Settings', allowedScopes: ['none', 'all'] },
  { key: 'settings.edit', module: 'Settings', label: 'Edit Clinic Settings', allowedScopes: ['none', 'all'] },
  // Users
  { key: 'users.view', module: 'Staff', label: 'View Staff & Therapists', allowedScopes: ['none', 'all'] },
  { key: 'users.create', module: 'Staff', label: 'Create New Users', allowedScopes: ['none', 'all'] },
  { key: 'users.edit', module: 'Staff', label: 'Edit Users', allowedScopes: ['none', 'all'] },
  { key: 'users.delete', module: 'Staff', label: 'Remove Users', allowedScopes: ['none', 'all'] },
  // Permissions
  { key: 'permissions.view', module: 'Staff', label: 'View User Permissions', allowedScopes: ['none', 'all'] },
  { key: 'permissions.edit', module: 'Staff', label: 'Edit User Permissions', allowedScopes: ['none', 'all'] },
  // Audit
  { key: 'audit.view', module: 'Audit', label: 'View Audit Logs', allowedScopes: ['none', 'all'] },
  // Recycle Bin
  { key: 'recyclebin.view', module: 'Recycle Bin', label: 'View Recycle Bin', allowedScopes: ['none', 'all'] },
  { key: 'recyclebin.restore', module: 'Recycle Bin', label: 'Restore Deleted Items', allowedScopes: ['none', 'all'] },
  { key: 'recyclebin.delete', module: 'Recycle Bin', label: 'Permanently Delete Items', allowedScopes: ['none', 'all'] },
  // Posture
  { key: 'posture.view', module: 'Posture', label: 'View Posture Analyses', allowedScopes: ['none', 'own', 'all'] },
  { key: 'posture.create', module: 'Posture', label: 'Run Posture Analysis', allowedScopes: ['none', 'all'] },
];

// ---------------------------------------------------------------------------
// CANONICAL ROLE DEFAULT CAPABILITIES
// Matches backend/app/core/rbac.py ROLE_TEMPLATES
//
// Default rule: by default, everything is set as NONE for every non-admin role
// (therapist, front_desk) - only login works for them until an Admin explicitly
// grants permissions in User Management.
// Admin retains full permissions by default.
// ---------------------------------------------------------------------------
import { useAuthStore } from '../store';

export const CANONICAL_ROLE_TEMPLATES: Record<UserRole, Partial<Record<CanonicalCapabilityKey, CapabilityScope>>> = {
  admin: Object.fromEntries(
    CANONICAL_CAPABILITIES.map((c) => [c.key, c.allowedScopes.includes('all') ? 'all' : 'own'])
  ) as Record<CanonicalCapabilityKey, CapabilityScope>,
  therapist: Object.fromEntries(
    CANONICAL_CAPABILITIES.map((c) => [c.key, 'none'])
  ) as Record<CanonicalCapabilityKey, CapabilityScope>,
  front_desk: Object.fromEntries(
    CANONICAL_CAPABILITIES.map((c) => [c.key, 'none'])
  ) as Record<CanonicalCapabilityKey, CapabilityScope>,
  patient: {},
};

export function getCapabilityScope(
  roleOrKey: UserRole | CanonicalCapabilityKey | null,
  keyOrOverrides?: CanonicalCapabilityKey | Record<string, string> | null,
  userOverrides?: Record<string, string> | null,
  capabilitiesRecord?: Record<string, string> | null
): CapabilityScope {
  let key: CanonicalCapabilityKey;
  let role: UserRole | null = null;
  let overrides: Record<string, string> | null | undefined = userOverrides;

  if (typeof keyOrOverrides === 'string') {
    // Called as (role, key, overrides, capabilitiesRecord)
    role = roleOrKey as UserRole | null;
    key = keyOrOverrides as CanonicalCapabilityKey;
  } else {
    // Called as (key, overrides, role, capabilitiesRecord)
    key = roleOrKey as CanonicalCapabilityKey;
    overrides = keyOrOverrides as Record<string, string> | null | undefined;
    role = (arguments[2] as UserRole | null) ?? useAuthStore.getState().role;
    if (arguments[3]) {
      capabilitiesRecord = arguments[3] as Record<string, string>;
    }
  }

  if (!key) return 'none';

  // 1. Explicit overrides passed directly (e.g. in SlideOver preview)
  if (overrides && key in overrides) {
    return overrides[key] as CapabilityScope;
  }

  // 2. Active capabilities from argument or useAuthStore (loaded via /auth/me)
  const storeCaps = capabilitiesRecord ?? useAuthStore.getState().capabilities;
  if (storeCaps && key in storeCaps) {
    return storeCaps[key] as CapabilityScope;
  }

  // 3. Fallback to role templates
  const effectiveRole = role || useAuthStore.getState().role;
  if (!effectiveRole) return 'none';
  if (effectiveRole === 'admin') {
    return CANONICAL_ROLE_TEMPLATES['admin']?.[key] || 'all';
  }
  return CANONICAL_ROLE_TEMPLATES[effectiveRole]?.[key] || 'none';
}

export function hasCapability(
  roleOrKey: UserRole | CanonicalCapabilityKey | null,
  keyOrOverrides?: CanonicalCapabilityKey | Record<string, string> | null,
  userOverrides?: Record<string, string> | null,
  capabilitiesRecord?: Record<string, string> | null
): boolean {
  const scope = getCapabilityScope(roleOrKey, keyOrOverrides, userOverrides, capabilitiesRecord);
  return scope === 'own' || scope === 'all';
}

// ---------------------------------------------------------------------------
// REACTIVE HOOKS (Ensures UI re-renders when /auth/me populates capabilities)
// ---------------------------------------------------------------------------
export function useHasCapability(key: CanonicalCapabilityKey): boolean {
  const role = useAuthStore((s) => s.role);
  const capabilities = useAuthStore((s) => s.capabilities);
  return hasCapability(role, key, null, capabilities);
}

export function useCanAccessModule(module: keyof ModuleVisibility): boolean {
  const role = useAuthStore((s) => s.role);
  const capabilities = useAuthStore((s) => s.capabilities);
  return canAccessModule(role, module, capabilities);
}

export function useCanPerformAction(action: keyof ActionPermissions): boolean {
  const role = useAuthStore((s) => s.role);
  const capabilities = useAuthStore((s) => s.capabilities);
  return canPerformAction(role, action, capabilities);
}

export function usePermissions(): RolePermissions {
  const role = useAuthStore((s) => s.role);
  const capabilities = useAuthStore((s) => s.capabilities);
  return getPermissionsForRole(role, capabilities);
}

// ---------------------------------------------------------------------------
// BACKEND ALIGNMENT (COARSE MAP)
// Deprecated role map, strictly aligned with backend/app/core/rbac.py
// clinic_admin restricted to ADMIN only per Lead Dev directive
// ---------------------------------------------------------------------------
export const BACKEND_PERMISSION_MAP: Record<string, UserRole[]> = {
  patients: ['admin', 'therapist', 'front_desk'],
  treatments: ['admin', 'therapist'],
  assessments: ['admin', 'therapist'],
  billing: ['admin', 'front_desk'],
  analytics: ['admin', 'therapist'],
  leads: ['admin', 'front_desk'],
  documents: ['admin', 'therapist', 'front_desk'],
  appointments: ['admin', 'therapist', 'front_desk'],
  exercises: ['admin', 'therapist'],
  posture: ['admin', 'therapist'],
  prescriptions: ['admin', 'therapist'],
  settings: ['admin'],
  packages: ['admin'],
  clinic_admin: ['admin'],
  booking: ['admin', 'therapist', 'front_desk'],
  appointment_requests: ['admin', 'therapist', 'front_desk'],
};

export function hasBackendPermission(role: UserRole, resource: string): boolean {
  const allowedRoles = BACKEND_PERMISSION_MAP[resource];
  return allowedRoles ? allowedRoles.includes(role) : false;
}

// ---------------------------------------------------------------------------
// FRONTEND UI MAPPINGS
// ---------------------------------------------------------------------------
export interface ModuleVisibility {
  dashboard: boolean;
  patients: boolean;
  appointments: boolean;
  analytics: boolean;
  billing: boolean;
  leads: boolean;
  therapists: boolean;
  recycleBin: boolean;
  settings: boolean;
}

export interface PatientTabVisibility {
  timeline: boolean;
  documents: boolean;
  treatments: boolean;
  soapNotes: boolean;
  assessments: boolean;
  billing: boolean;
}

export interface ActionPermissions {
  createEditPatient: boolean;
  deletePatient: boolean;
  manageAppointments: boolean;
  createEditSoapNote: boolean;
  createInvoiceRecordPayment: boolean;
  createSellPackage: boolean;
  uploadDownloadDocuments: boolean;
  restoreDeletedRecords: boolean;
  manageUsersAndRoles: boolean;
  updateClinicSettings: boolean;
}

export interface RolePermissions {
  sidebar: ModuleVisibility;
  patientTabs: PatientTabVisibility;
  actions: ActionPermissions;
}

export function canAccessModule(
  roleOrModule: UserRole | keyof ModuleVisibility | null,
  module?: keyof ModuleVisibility,
  capabilitiesRecord?: Record<string, string> | null
): boolean {
  let targetModule: keyof ModuleVisibility;
  let role: UserRole | null = null;
  if (module) {
    role = roleOrModule as UserRole | null;
    targetModule = module;
  } else {
    targetModule = roleOrModule as keyof ModuleVisibility;
    role = useAuthStore.getState().role;
  }
  if (!targetModule) return false;

  const check = (key: CanonicalCapabilityKey) => hasCapability(role, key, null, capabilitiesRecord);

  switch (targetModule) {
    case 'dashboard':
      return true;
    case 'patients':
      return check('patients.view');
    case 'appointments':
      return check('appointments.view');
    case 'analytics':
      return check('analytics.my_performance') || check('analytics.clinic_financials');
    case 'billing':
      return (
        check('invoices.view') ||
        check('payments.view') ||
        check('packages.view')
      );
    case 'leads':
      return check('leads.view');
    case 'therapists':
      return check('users.view');
    case 'recycleBin':
      return check('recyclebin.view');
    case 'settings':
      return (
        check('settings.view') ||
        check('users.view') ||
        check('audit.view')
      );
    default:
      return false;
  }
}

export function canPerformAction(
  roleOrAction: UserRole | keyof ActionPermissions | null,
  action?: keyof ActionPermissions,
  capabilitiesRecord?: Record<string, string> | null
): boolean {
  let targetAction: keyof ActionPermissions;
  let role: UserRole | null = null;
  if (action) {
    role = roleOrAction as UserRole | null;
    targetAction = action;
  } else {
    targetAction = roleOrAction as keyof ActionPermissions;
    role = useAuthStore.getState().role;
  }
  if (!targetAction) return false;

  const check = (key: CanonicalCapabilityKey) => hasCapability(role, key, null, capabilitiesRecord);

  switch (targetAction) {
    case 'createEditPatient':
      return check('patients.create') || check('patients.edit');
    case 'deletePatient':
      return check('patients.delete');
    case 'manageAppointments':
      return check('appointments.create') || check('appointments.edit');
    case 'createEditSoapNote':
      return (
        check('treatments.create') ||
        check('assessments.create') ||
        check('assessments.edit')
      );
    case 'createInvoiceRecordPayment':
      return check('invoices.create') || check('payments.record');
    case 'createSellPackage':
      return check('packages.create') || check('packages.assign');
    case 'uploadDownloadDocuments':
      return check('documents.upload') || check('documents.view');
    case 'restoreDeletedRecords':
      return check('recyclebin.restore');
    case 'manageUsersAndRoles':
      return (
        check('users.create') ||
        check('users.edit') ||
        check('permissions.edit')
      );
    case 'updateClinicSettings':
      return check('settings.edit');
    default:
      return false;
  }
}

export function getPermissionsForRole(
  role?: UserRole | null,
  capabilitiesRecord?: Record<string, string> | null
): RolePermissions {
  const effectiveRole = role ?? useAuthStore.getState().role;
  const check = (key: CanonicalCapabilityKey) => hasCapability(effectiveRole, key, null, capabilitiesRecord);
  const checkModule = (mod: keyof ModuleVisibility) => canAccessModule(effectiveRole, mod, capabilitiesRecord);
  const checkAction = (act: keyof ActionPermissions) => canPerformAction(effectiveRole, act, capabilitiesRecord);

  return {
    sidebar: {
      dashboard: checkModule('dashboard'),
      patients: checkModule('patients'),
      appointments: checkModule('appointments'),
      analytics: checkModule('analytics'),
      billing: checkModule('billing'),
      leads: checkModule('leads'),
      therapists: checkModule('therapists'),
      recycleBin: checkModule('recycleBin'),
      settings: checkModule('settings'),
    },
    patientTabs: {
      timeline: true,
      documents: check('documents.view'),
      treatments: check('treatments.view'),
      soapNotes: check('assessments.view'),
      assessments: check('assessments.view'),
      billing: check('invoices.view'),
    },
    actions: {
      createEditPatient: checkAction('createEditPatient'),
      deletePatient: checkAction('deletePatient'),
      manageAppointments: checkAction('manageAppointments'),
      createEditSoapNote: checkAction('createEditSoapNote'),
      createInvoiceRecordPayment: checkAction('createInvoiceRecordPayment'),
      createSellPackage: checkAction('createSellPackage'),
      uploadDownloadDocuments: checkAction('uploadDownloadDocuments'),
      restoreDeletedRecords: checkAction('restoreDeletedRecords'),
      manageUsersAndRoles: checkAction('manageUsersAndRoles'),
      updateClinicSettings: checkAction('updateClinicSettings'),
    },
  };
}
