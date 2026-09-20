'use client';

import React, { useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useInvoices, usePayments, usePackages } from '../../../features/billing/api';
import { CreateInvoiceSlideOver } from '../../../features/billing/components/CreateInvoiceSlideOver';
import { RecordPaymentSlideOver } from '../../../features/billing/components/RecordPaymentSlideOver';
import { InvoicePreviewModal } from '../../../features/billing/components/InvoicePreviewModal';
import { Invoice, Payment, Package, InvoiceStatus } from '../../../types/api';
import { Plus, Download, CreditCard, FileText, Package as PackageIcon, Eye, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { usePatients } from '../../../features/patients/api';
import { useAuthStore } from '../../../store';
import { canAccessModule, canPerformAction, hasCapability } from '../../../config/permissions';
import { AccessRestricted } from '../../../components/ui/AccessRestricted';

type TabKey = 'invoices' | 'payments' | 'packages';

export default function BillingPage() {
  const role = useAuthStore((s) => s.role);
  const isAllowed = canAccessModule('billing');
  const canViewInvoices = hasCapability('invoices.view');
  const canViewPayments = hasCapability('payments.view');
  const canViewPackages = hasCapability('packages.view');

  const [activeTab, setActiveTab] = useState<TabKey>(
    canViewInvoices ? 'invoices' : canViewPayments ? 'payments' : 'packages'
  );
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Preview Modal state
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [previewMode, setPreviewMode] = useState<'invoice' | 'receipt'>('invoice');

  const { data: invoices = [], isLoading: isLoadingInvoices } = useInvoices(canViewInvoices);
  const { data: payments = [], isLoading: isLoadingPayments } = usePayments(canViewPayments);
  const { data: packages = [], isLoading: isLoadingPackages } = usePackages(canViewPackages);
  const { data: patientsResponse, isLoading: isLoadingPatients } = usePatients(undefined, 1, 100, isAllowed);
  const patients = patientsResponse?.data || [];

  const getPatientName = (patientId: string) => {
    const p = patients.find((patient) => patient.id === patientId);
    return p ? `${p.first_name} ${p.last_name}` : patientId;
  };

  if (!isAllowed) {
    return <AccessRestricted message="Billing & invoices access is restricted for your role." />;
  }

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice Number',
      render: (inv) => (
        <span className="font-bold text-slate-900 dark:text-white">{inv.invoice_number}</span>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (inv) => getPatientName(inv.patient_id),
    },
    {
      key: 'total_amount',
      header: 'Total Amount',
      render: (inv) => `₹${inv.total_amount.toLocaleString('en-IN')}`,
    },
    {
      key: 'paid_amount',
      header: 'Paid Amount',
      render: (inv) => `₹${Number(inv.paid_amount || 0).toLocaleString('en-IN')}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv) => {
        const colors: Record<InvoiceStatus, string> = {
          paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          unpaid: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
          partial: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
          issued: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
          cancelled: 'bg-slate-100 text-slate-500 line-through',
          overdue: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
        };
        return (
          <span
            className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              colors[inv.status]
            }`}
          >
            {inv.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (inv) => (
        <div className="flex items-center gap-2">
          {hasCapability('invoices.view') && (
            <button
              onClick={() => {
                setPreviewInvoice(inv);
                setPreviewMode('invoice');
              }}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Invoice</span>
            </button>
          )}
          {inv.status === 'paid' && hasCapability('invoices.view') && (
            <button
              onClick={() => {
                setPreviewInvoice(inv);
                setPreviewMode('receipt');
              }}
              className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Receipt</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  const paymentColumns: Column<Payment>[] = [
    { key: 'id', header: 'Payment ID' },
    { key: 'patient', header: 'Patient', render: (p) => getPatientName(p.patient_id) },
    { key: 'amount', header: 'Amount', render: (p) => `₹${p.amount.toLocaleString('en-IN')}` },
    {
      key: 'payment_method',
      header: 'Method',
      render: (p) => <span className="uppercase text-xs font-semibold text-teal-600">{p.payment_method}</span>,
    },
    { key: 'payment_date', header: 'Date' },
  ];

  const packageColumns: Column<Package>[] = [
    { key: 'name', header: 'Package Name', render: (pkg) => <span className="font-bold">{pkg.name}</span> },
    { key: 'total_sessions', header: 'Sessions', render: (pkg) => `${pkg.total_sessions} Sessions` },
    { key: 'price', header: 'Price', render: (pkg) => `₹${pkg.price.toLocaleString('en-IN')}` },
    { key: 'validity_days', header: 'Validity', render: (pkg) => `${pkg.validity_days} Days` },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billing & Invoices</h1>
            <p className="text-sm text-slate-500">Manage patient billing, payments, and packages catalog</p>
          </div>

          <div className="flex items-center gap-3">
            {hasCapability('payments.record') && (
              <button
                onClick={() => setIsPaymentOpen(true)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Record Payment</span>
              </button>
            )}
            {hasCapability('invoices.create') && (
              <button
                onClick={() => setIsInvoiceOpen(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'invoices'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Invoices ({invoices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'payments'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payments Log ({payments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'packages'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PackageIcon className="w-4 h-4" />
            <span>Package Catalog ({packages.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'invoices' && (
          <DataTable
            columns={invoiceColumns}
            data={invoices}
            isLoading={isLoadingInvoices}
            searchField={(inv) => `${inv.invoice_number} ${getPatientName(inv.patient_id)}`}
            searchPlaceholder="Search invoices by number or patient name..."
          />
        )}

        {activeTab === 'payments' && (
          <DataTable
            columns={paymentColumns}
            data={payments}
            isLoading={isLoadingPayments}
            searchField={(p) => getPatientName(p.patient_id)}
            searchPlaceholder="Search payments by patient name..."
          />
        )}

        {activeTab === 'packages' && (
          <DataTable
            columns={packageColumns}
            data={packages}
            isLoading={isLoadingPackages}
            searchField={(pkg) => pkg.name}
            searchPlaceholder="Search package catalog..."
          />
        )}

        {/* Drawers & Printable Preview Modal */}
        <CreateInvoiceSlideOver isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} />
        <RecordPaymentSlideOver isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
        <InvoicePreviewModal
          isOpen={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice}
          mode={previewMode}
        />
      </div>
    </AppShell>
  );
}
