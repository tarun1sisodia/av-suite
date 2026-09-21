'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { SlideOver } from '../../../components/ui/SlideOver';
import { paymentFormSchema, PaymentFormValues } from '../../../lib/schemas';
import { useRecordPayment, useInvoices } from '../api';
import { usePatients } from '../../patients/api';
import { Loader2 } from 'lucide-react';

interface RecordPaymentSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecordPaymentSlideOver({ isOpen, onClose }: RecordPaymentSlideOverProps) {
  const recordPayment = useRecordPayment();
  const { data: invoices = [] } = useInvoices();
  const { data: patientsResponse } = usePatients(undefined, 1, 100);
  const patients = patientsResponse?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      invoice_id: invoices[0]?.id || '',
      patient_id: patients[0]?.id || '',
      amount: 1000,
      payment_method: 'cash',
      payment_date: new Date().toISOString().slice(0, 10),
      transaction_reference: '',
      notes: '',
    },
  });

  React.useEffect(() => {
    if (invoices.length > 0 && !watch('invoice_id')) {
      setValue('invoice_id', invoices[0].id);
    }
  }, [invoices, setValue, watch]);

  React.useEffect(() => {
    if (patients.length > 0 && !watch('patient_id')) {
      setValue('patient_id', patients[0].id);
    }
  }, [patients, setValue, watch]);

  const onSubmit = async (values: PaymentFormValues) => {
    if (recordPayment.isPending) return;
    try {
      await recordPayment.mutateAsync(values);
      toast.success('Payment recorded successfully');
      reset();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || err?.message || 'Failed to record payment');
    }
  };

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title="Record Payment" subtitle="Log payment received for an invoice">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Target Invoice *
          </label>
          <select
            {...register('invoice_id')}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
          >
            <option value="">Select an invoice</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} (Total: ₹{inv.total_amount}, Paid: ₹{inv.paid_amount})
              </option>
            ))}
          </select>
          {errors.invoice_id && <p className="text-xs text-rose-500 mt-1">{errors.invoice_id.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Patient *
          </label>
          <select
            {...register('patient_id')}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
          >
            <option value="">Select a patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name} ({p.phone}) {p.deleted_at ? '[Soft-deleted]' : ''}
              </option>
            ))}
          </select>
          {errors.patient_id && <p className="text-xs text-rose-500 mt-1">{errors.patient_id.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Amount Received (₹) *
            </label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              min={1}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Payment Method *
            </label>
            <select
              {...register('payment_method')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Credit / Debit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Transaction Reference / UPI ID
          </label>
          <input
            {...register('transaction_reference')}
            type="text"
            placeholder="e.g. UPI/81028391029"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
          />
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={recordPayment.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {recordPayment.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{recordPayment.isPending ? 'Recording...' : 'Record Payment'}</span>
          </button>
        </div>
      </form>
    </SlideOver>
  );
}
