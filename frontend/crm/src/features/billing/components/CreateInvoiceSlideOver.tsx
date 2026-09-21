'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { SlideOver } from '../../../components/ui/SlideOver';
import { invoiceFormSchema, InvoiceFormValues } from '../../../lib/schemas';
import { useCreateInvoice } from '../api';
import { usePatients } from '../../patients/api';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface CreateInvoiceSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateInvoiceSlideOver({ isOpen, onClose }: CreateInvoiceSlideOverProps) {
  const createInvoice = useCreateInvoice();
  const { data: patientsResponse } = usePatients(undefined, 1, 100);
  const patients = patientsResponse?.data || [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      patient_id: patients[0]?.id || '',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: new Date().toISOString().slice(0, 10),
      subtotal: 0,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 0,
      notes: '',
      items: [{ description: 'Physical Therapy Session', quantity: 1, unit_price: 1000, total_price: 1000 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  React.useEffect(() => {
    if (patients.length > 0 && !watch('patient_id')) {
      setValue('patient_id', patients[0].id);
    }
  }, [patients, setValue, watch]);

  const items = watch('items') || [];
  const discountAmount = watch('discount_amount') || 0;
  const taxAmount = watch('tax_amount') || 0;

  // Compute live subtotal & total
  const subtotal = items.reduce((acc, item) => acc + (item.quantity || 1) * (item.unit_price || 0), 0);
  const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);

  const onSubmit = async (values: InvoiceFormValues) => {
    if (createInvoice.isPending) return;
    try {
      const payload: InvoiceFormValues = {
        ...values,
        subtotal,
        total_amount: totalAmount,
        items: values.items.map((i) => ({
          ...i,
          total_price: (i.quantity || 1) * (i.unit_price || 0),
        })),
      };
      await createInvoice.mutateAsync(payload);
      toast.success('Invoice created successfully');
      reset();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || err?.message || 'Failed to create invoice');
    }
  };

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title="Create Invoice" subtitle="Generate invoice for patient services" isProcessing={createInvoice.isPending}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              Issue Date *
            </label>
            <input
              {...register('issue_date')}
              type="date"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Due Date
            </label>
            <input
              {...register('due_date')}
              type="date"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600">Line Items</h4>
            <button
              type="button"
              onClick={() => append({ description: '', quantity: 1, unit_price: 500, total_price: 500 })}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          {fields.map((field, idx) => (
            <div key={field.id} className="p-3 bg-slate-50 dark:bg-slate-950 border rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  {...register(`items.${idx}.description`)}
                  placeholder="Item description"
                  className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded text-xs"
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400">Qty</label>
                  <input
                    {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                    type="number"
                    min={1}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400">Unit Price (₹)</label>
                  <input
                    {...register(`items.${idx}.unit_price`, { valueAsNumber: true })}
                    type="number"
                    min={0}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400">Total (₹)</label>
                  <div className="px-2 py-1 font-bold text-slate-800 dark:text-slate-200">
                    ₹{((items[idx]?.quantity || 1) * (items[idx]?.unit_price || 0)).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Subtotal:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              ₹{subtotal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Discount (₹)</label>
              <input
                {...register('discount_amount', { valueAsNumber: true })}
                type="number"
                min={0}
                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Tax (₹)</label>
              <input
                {...register('tax_amount', { valueAsNumber: true })}
                type="number"
                min={0}
                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t font-bold text-sm text-slate-900 dark:text-white">
            <span>Total Payable Amount:</span>
            <span className="text-teal-600">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
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
            disabled={createInvoice.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-2"
          >
            {createInvoice.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Generate Invoice</span>
          </button>
        </div>
      </form>
    </SlideOver>
  );
}
