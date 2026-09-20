# AV Suite RBAC Integration Audit & Fix Plan

## Executive Summary
After a thorough audit of the entire backend (FastAPI) and frontend (Next.js) codebase, I've identified **17 integration gaps** where the frontend UI does not properly enforce the capability-based permission system, **1 critical backend security gap**, and several supporting issues. The backend RBAC engine (`rbac.py` + `dependencies.py`) is architecturally sound — the breakdown is in the frontend's inconsistent consumption of capabilities and one missing backend guard.

---

## BACKEND ISSUES

### BUG-01 (CRITICAL): `POST /prescriptions` missing permission guard
**File**: `backend/app/api/v1/patients.py` → `prescriptions.py`  
**Problem**: The `create_prescription` endpoint has **no** `require_capability("prescriptions.create")` dependency. Any authenticated user (therapist, front desk) can create prescriptions regardless of their capability scope.  
**Fix**: Add `scope: CapabilityScope = Depends(require_capability("prescriptions.create"))` to the endpoint signature.

---

## FRONTEND ISSUES

### BUG-02: Billing page — "Create Invoice" button always visible
**File**: `frontend/crm/src/app/(dashboard)/billing/page.tsx`  
**Problem**: The "Create Invoice" button is always shown to anyone with billing module access, regardless of `invoices.create` capability.  
**Fix**: Gate the button with `hasCapability('invoices.create')`.

### BUG-03: Billing page — "Record Payment" button always visible
**File**: `frontend/crm/src/app/(dashboard)/billing/page.tsx`  
**Problem**: The "Record Payment" button is always shown, regardless of `payments.record` capability.  
**Fix**: Gate the button with `hasCapability('payments.record')`.

### BUG-04: Appointments page — "Reschedule" button always visible
**File**: `frontend/crm/src/app/(dashboard)/appointments/page.tsx`  
**Problem**: The "Reschedule" button on each appointment card is always shown, regardless of `appointments.edit` capability.  
**Fix**: Gate the button with `hasCapability('appointments.edit')`.

### BUG-05: Appointments page — Status change dropdown always visible
**File**: `frontend/crm/src/app/(dashboard)/appointments/page.tsx`  
**Problem**: The appointment status dropdown (Scheduled/Completed/Cancelled) is always shown, regardless of `appointments.edit` capability.  
**Fix**: Gate the dropdown with `hasCapability('appointments.edit')`.

### BUG-06: Appointments page — Approve/Reject booking requests gated by wrong capability
**File**: `frontend/crm/src/app/(dashboard)/appointments/page.tsx`  
**Problem**: The Approve/Reject buttons for booking requests are shown when `canViewBookingRequests` (i.e., `booking.view`) is true. They should require `booking.approve`.  
**Fix**: Gate the buttons with `hasCapability('booking.approve')`.

### BUG-07: Patient workspace — "Upload Document" button always visible
**File**: `frontend/crm/src/features/patients/components/DocumentsTab.tsx`  
**Problem**: The "Upload Document" button is always shown, regardless of `documents.upload` capability.  
**Fix**: Gate the button with `hasCapability('documents.upload')`.

### BUG-08: Patient workspace — "Download" document button always visible
**File**: `frontend/crm/src/features/patients/components/DocumentsTab.tsx`  
**Problem**: The download button for each document is always shown, regardless of `documents.view` capability.  
**Fix**: Gate the button with `hasCapability('documents.view')`.

### BUG-09: Patient workspace — "New Session" treatment button always visible
**File**: `frontend/crm/src/features/patients/components/TreatmentsTab.tsx`  
**Problem**: The "New Session" button is always shown, regardless of `treatments.create` capability.  
**Fix**: Gate the button with `hasCapability('treatments.create')`.

### BUG-10: Patient workspace — SOAP Notes "Finalize & Lock" button always visible
**File**: `frontend/crm/src/features/patients/components/SoapNotesTab.tsx`  
**Problem**: The "Finalize & Lock Note" button is always shown, regardless of `assessments.create` / `assessments.edit` capability.  
**Fix**: Gate the button with `hasCapability('assessments.create') || hasCapability('assessments.edit')`.

### BUG-11: Patient workspace — SOAP Notes "Re-open" button uses role check instead of capability
**File**: `frontend/crm/src/features/patients/components/SoapNotesTab.tsx`  
**Problem**: The "Re-open (Admin Only)" button checks `role === 'admin'` instead of `hasCapability('assessments.edit')`.  
**Fix**: Replace role check with capability check.

### BUG-12: Patient workspace — "AI Posture Analysis" link always visible
**File**: `frontend/crm/src/app/(dashboard)/patients/[id]/page.tsx`  
**Problem**: The "AI Posture Analysis" external link is always shown, regardless of `posture.create` capability.  
**Fix**: Gate the link with `hasCapability('posture.create')`.

### BUG-13: Patient workspace — "Auto-Rx" button always visible
**File**: `frontend/crm/src/app/(dashboard)/patients/[id]/page.tsx`  
**Problem**: The "Auto-Rx" prescription generator button is always shown, regardless of `prescriptions.create` capability.  
**Fix**: Gate the button with `hasCapability('prescriptions.create')`.

### BUG-14: Patient workspace — "Exercise Library" link always visible
**File**: `frontend/crm/src/app/(dashboard)/patients/[id]/page.tsx`  
**Problem**: The "Exercise Library" external link is always shown, regardless of `exercises.view` capability.  
**Fix**: Gate the link with `hasCapability('exercises.view')`.

### BUG-15: Patient workspace — Prescription tab "Generate Prescription PDF" button always visible
**File**: `frontend/crm/src/app/(dashboard)/patients/[id]/page.tsx`  
**Problem**: The "Generate Prescription PDF" button in the Rx tab is always shown, regardless of `prescriptions.view` capability.  
**Fix**: Gate the button with `hasCapability('prescriptions.view')`.

### BUG-16: Billing page — Invoice actions (Preview, Receipt) always visible
**File**: `frontend/crm/src/app/(dashboard)/billing/page.tsx`  
**Problem**: Invoice action buttons (Invoice preview, Receipt) are always shown without checking `invoices.view`.  
**Fix**: Gate with `hasCapability('invoices.view')`.

### BUG-17: Leads page — Delete lead button missing
**File**: `frontend/crm/src/app/(dashboard)/leads/page.tsx`  
**Problem**: Backend supports `leads.delete` but frontend has no delete button for leads.  
**Fix**: Add a delete button gated by `hasCapability('leads.delete')`.

---

## SCOPE OF CHANGES

### Files to modify:
1. `backend/app/api/v1/prescriptions.py` — Add permission guard (BUG-01)
2. `frontend/crm/src/app/(dashboard)/billing/page.tsx` — Gate action buttons (BUG-02, BUG-03, BUG-16)
3. `frontend/crm/src/app/(dashboard)/appointments/page.tsx` — Gate action buttons (BUG-04, BUG-05, BUG-06)
4. `frontend/crm/src/features/patients/components/DocumentsTab.tsx` — Gate buttons (BUG-07, BUG-08)
5. `frontend/crm/src/features/patients/components/TreatmentsTab.tsx` — Gate button (BUG-09)
6. `frontend/crm/src/features/patients/components/SoapNotesTab.tsx` — Gate buttons (BUG-10, BUG-11)
7. `frontend/crm/src/app/(dashboard)/patients/[id]/page.tsx` — Gate action buttons (BUG-12, BUG-13, BUG-14, BUG-15)
8. `frontend/crm/src/app/(dashboard)/leads/page.tsx` — Add delete button (BUG-17)

### Already correctly implemented (no changes needed):
- ✅ Patients list page — properly gates "Add Patient" with `createEditPatient`
- ✅ Patient workspace — properly gates "Edit" and "Delete" with `createEditPatient` / `deletePatient`
- ✅ Patient workspace — properly gates tab visibility with `patientTabs` permissions
- ✅ Settings page — properly gates all CRUD with individual capabilities
- ✅ Leads page — properly gates "Add Lead" with `leads.create`, stage change with `leads.edit`, convert with `leads.convert`
- ✅ Analytics page — properly gates financials vs personal performance
- ✅ Recycle Bin page — properly gates "Restore" with `recyclebin.restore`
- ✅ Sidebar — properly hides modules based on `canAccessModule`
- ✅ All backend endpoints (except prescriptions.create) — properly enforce `require_capability`

---

## IMPLEMENTATION ORDER
1. Backend fix first (BUG-01) — security gap
2. Frontend pages top-down by severity:
   - Billing page (BUG-02, BUG-03, BUG-16)
   - Appointments page (BUG-04, BUG-05, BUG-06)
   - Patient workspace page (BUG-12, BUG-13, BUG-14, BUG-15)
   - Patient sub-tabs (BUG-07, BUG-08, BUG-09, BUG-10, BUG-11)
   - Leads page (BUG-17)