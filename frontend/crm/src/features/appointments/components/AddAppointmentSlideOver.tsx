'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { SlideOver } from '../../../components/ui/SlideOver';
import { appointmentFormSchema, AppointmentFormValues } from '../../../lib/schemas';
import { useCreateAppointment, useAppointments } from '../api';
import { usePatients } from '../../patients/api';
import { useUsers } from '../../users/api';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface AddAppointmentSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAppointmentSlideOver({ isOpen, onClose }: AddAppointmentSlideOverProps) {
  const createAppointment = useCreateAppointment();
  const { data: aptResponse } = useAppointments(undefined, undefined, 1, 100);
  const existingAppointments = aptResponse?.data || [];
  const [hasDoubleBookingWarning, setHasDoubleBookingWarning] = useState(false);

  const { data: patientsResponse } = usePatients(undefined, 1, 100);
  const patients = patientsResponse?.data || [];
  
  const { data: usersResponse } = useUsers();
  const users = usersResponse || []; // assuming useUsers returns raw array if not enveloped yet, wait, we created useUsers recently

  const therapists = users.filter((u) => u.role === 'therapist' || u.role === 'admin');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patient_id: patients[0]?.id || '',
      therapist_id: therapists[0]?.id || '',
      appointment_type: 'consultation',
      scheduled_at: new Date().toISOString().slice(0, 16),
      duration_minutes: 30,
      status: 'scheduled',
      source: 'manual',
    },
  });

  React.useEffect(() => {
    if (patients.length > 0 && !watch('patient_id')) {
      setValue('patient_id', patients[0].id);
    }
  }, [patients, setValue, watch]);

  React.useEffect(() => {
    if (therapists.length > 0 && !watch('therapist_id')) {
      setValue('therapist_id', therapists[0].id);
    }
  }, [therapists, setValue, watch]);

  const selectedTherapist = watch('therapist_id');
  const selectedTime = watch('scheduled_at');

  // Check double-booking soft warning client side
  const checkOverlap = () => {
    if (!selectedTherapist || !selectedTime) return false;
    const targetTime = new Date(selectedTime).getTime();
    return existingAppointments.some((apt: any) => {
      if (apt.deleted_at || apt.therapist_id !== selectedTherapist || apt.status === 'cancelled' || apt.status === 'no_show') return false;
      const aptTime = new Date(apt.scheduled_at).getTime();
      const diffMinutes = Math.abs(targetTime - aptTime) / (1000 * 60);
      return diffMinutes < (apt.duration_minutes || 30);
    });
  };

  const isOverlapDetected = checkOverlap();

  const onSubmit = async (values: AppointmentFormValues) => {
    if (createAppointment.isPending) return;
    try {
      await createAppointment.mutateAsync(values);
      toast.success('Appointment scheduled successfully');
      reset();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || err?.message || 'Failed to schedule appointment');
    }
  };

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title="Book Appointment" subtitle="Schedule patient visit & provider slot">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Double booking inline warning */}
        {isOverlapDetected && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Warning: This therapist already has an appointment scheduled near this time.</span>
          </div>
        )}

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

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Therapist / Provider *
          </label>
          <select
            {...register('therapist_id')}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
          >
            <option value="">Select a therapist / provider</option>
            {therapists.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.role})
              </option>
            ))}
          </select>
          {errors.therapist_id && <p className="text-xs text-rose-500 mt-1">{errors.therapist_id.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date & Time *
            </label>
            <input
              {...register('scheduled_at')}
              type="datetime-local"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Duration (mins)
            </label>
            <input
              {...register('duration_minutes', { valueAsNumber: true })}
              type="number"
              min={15}
              step={15}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Appointment Type
          </label>
          <input
            {...register('appointment_type')}
            type="text"
            placeholder="consultation / follow_up / therapy"
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
            disabled={createAppointment.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-2"
          >
            {createAppointment.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Book Appointment</span>
          </button>
        </div>
      </form>
    </SlideOver>
  );
}
