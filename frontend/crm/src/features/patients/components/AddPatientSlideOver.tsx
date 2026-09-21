'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { SlideOver } from '../../../components/ui/SlideOver';
import { patientFormSchema, PatientFormValues } from '../../../lib/schemas';
import { useCreatePatient } from '../api';
import { Loader2 } from 'lucide-react';

interface AddPatientSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddPatientSlideOver({ isOpen, onClose }: AddPatientSlideOverProps) {
  const createPatient = useCreatePatient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      phone: '',
      gender: 'male',
      chief_complaint: '',
      referral_source: 'Direct Walk-in',
      status: 'active',
    },
  });

  const onSubmit = async (values: PatientFormValues) => {
    if (createPatient.isPending) return;
    try {
      const payload = {
        ...values,
        date_of_birth: values.date_of_birth ? values.date_of_birth : undefined,
      };
      await createPatient.mutateAsync(payload as any);
      toast.success(`Patient ${values.first_name} ${values.last_name} created successfully`);
      reset();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || err?.message || 'Failed to create patient');
    }
  };

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title="Add New Patient" subtitle="Create a new patient record">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Demographics */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b pb-1">
            Demographics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                First Name *
              </label>
              <input
                {...register('first_name')}
                type="text"
                placeholder="Rajesh"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              />
              {errors.first_name && <p className="text-xs text-rose-500 mt-1">{errors.first_name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Last Name *
              </label>
              <input
                {...register('last_name')}
                type="text"
                placeholder="Kumar"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              />
              {errors.last_name && <p className="text-xs text-rose-500 mt-1">{errors.last_name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date of Birth
              </label>
              <input
                {...register('date_of_birth')}
                type="date"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Gender *
              </label>
              <select
                {...register('gender')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="male">MALE</option>
                <option value="female">FEMALE</option>
                <option value="other">OTHER</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Chief Complaint *
            </label>
            <textarea
              {...register('chief_complaint')}
              rows={3}
              placeholder="e.g. Lower back pain during prolonged sitting"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
            {errors.chief_complaint && <p className="text-xs text-rose-500 mt-1">{errors.chief_complaint.message}</p>}
          </div>
        </div>

        {/* Section 2: Contact Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b pb-1">
            Contact & Source
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone Number *
              </label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="+919876543210"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              />
              {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Referral Source *
              </label>
              <input
                {...register('referral_source')}
                type="text"
                placeholder="Google Search / Doctor"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              />
              {errors.referral_source && <p className="text-xs text-rose-500 mt-1">{errors.referral_source.message}</p>}
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPatient.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {createPatient.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save Patient</span>
          </button>
        </div>
      </form>
    </SlideOver>
  );
}
