'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { SlideOver } from '../../../components/ui/SlideOver';
import { useUpdateAppointment } from '../api';
import { Loader2 } from 'lucide-react';
import { Appointment } from '../../../types/api';

interface RescheduleSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

interface RescheduleFormValues {
  scheduled_at: string;
  duration_minutes: number;
}

export function RescheduleSlideOver({ isOpen, onClose, appointment }: RescheduleSlideOverProps) {
  const updateAppointment = useUpdateAppointment();

  // Convert the ISO date from the appointment into something we can plug into datetime-local
  const getDefaultDateTime = () => {
    if (!appointment?.scheduled_at) return '';
    const d = new Date(appointment.scheduled_at);
    // Remove the trailing 'Z' and just use local time for the input
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RescheduleFormValues>({
    defaultValues: {
      scheduled_at: getDefaultDateTime(),
      duration_minutes: appointment?.duration_minutes || 30,
    },
  });

  // Reset form when appointment changes
  React.useEffect(() => {
    reset({
      scheduled_at: getDefaultDateTime(),
      duration_minutes: appointment?.duration_minutes || 30,
    });
  }, [appointment, reset]);

  const onSubmit = async (values: RescheduleFormValues) => {
    if (!appointment || updateAppointment.isPending) return;
    try {
      // Send datetime string as ISO so backend parses it correctly
      const payload = {
        ...values,
        scheduled_at: new Date(values.scheduled_at).toISOString(),
      };
      await updateAppointment.mutateAsync({ id: appointment.id, data: payload });
      toast.success('Appointment rescheduled successfully');
      reset();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || err?.message || 'Failed to reschedule appointment');
    }
  };

  if (!appointment) return null;

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title="Reschedule Appointment" subtitle={`Reschedule for ${appointment.patient_name || 'Patient ' + appointment.patient_id}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Date & Time *
            </label>
            <input
              {...register('scheduled_at', { required: 'Date and time are required' })}
              type="datetime-local"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
            {errors.scheduled_at && <p className="text-xs text-rose-500 mt-1">{errors.scheduled_at.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Duration (Minutes) *
            </label>
            <input
              {...register('duration_minutes', { valueAsNumber: true, required: 'Duration is required', min: 15 })}
              type="number"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
            {errors.duration_minutes && <p className="text-xs text-rose-500 mt-1">{errors.duration_minutes.message}</p>}
          </div>
        </div>

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
            disabled={updateAppointment.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {updateAppointment.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Confirm Reschedule</span>
          </button>
        </div>
      </form>
    </SlideOver>
  );
}
