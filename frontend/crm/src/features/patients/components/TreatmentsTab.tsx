'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { treatmentSessionFormSchema, TreatmentSessionFormValues } from '../../../lib/schemas';
import { SlideOver } from '../../../components/ui/SlideOver';
import { Plus, Calendar, Activity, FileText, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store';
import { useHasCapability } from '../../../config/permissions';

import { useTreatments, useCreateTreatmentSession } from '../../treatments/api';

export function TreatmentsTab({ patientId }: { patientId: string }) {
  const role = useAuthStore((s) => s.role);
  const userId = useAuthStore((s) => s.userId);
  const { data: response, isLoading } = useTreatments(patientId);
  const sessions = response?.data || [];
  const [isSlideOpen, setIsSlideOpen] = useState(false);

  const canCreate = useHasCapability('treatments.create');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TreatmentSessionFormValues>({
    resolver: zodResolver(treatmentSessionFormSchema),
    defaultValues: {
      patient_id: patientId,
      therapist_id: userId ?? '',
      treatment_date: new Date().toISOString().slice(0, 16),
      pain_score: 5,
      treatment: '',
      home_advice: '',
      notes: '',
    },
  });

  const createSession = useCreateTreatmentSession();

  const onSubmit = (values: TreatmentSessionFormValues) => {
    if (createSession.isPending) return;
    createSession.mutate(values, {
      onSuccess: () => {
        toast.success('Treatment session saved successfully.');
        reset();
        setIsSlideOpen(false);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || err?.message || 'Failed to save treatment session.');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Treatment Sessions</h3>
          <p className="text-xs text-slate-500">Physical therapy & rehabilitation logs</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsSlideOpen(true)}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Session</span>
          </button>
        )}
      </div>

      {/* Session Cards List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-sm">
            No treatment sessions logged yet for this patient.
          </div>
        ) : (
          sessions.map((session: any) => (
            <div
              key={session.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>{new Date(session.treatment_date).toLocaleString()}</span>
                </div>
                {session.pain_score != null && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    Pain Score: {session.pain_score}/10
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Treatment Performed
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200">{session.treatment}</p>
              </div>

              {session.home_advice && (
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600 mb-0.5">
                    Home Exercise Advice
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{session.home_advice}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Session Drawer */}
      <SlideOver
        isOpen={isSlideOpen}
        onClose={() => setIsSlideOpen(false)}
        title="Record Treatment Session"
        subtitle="Log physical therapy details & exercises"
        isProcessing={createSession.isPending}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Session Date & Time *
            </label>
            <input
              {...register('treatment_date')}
              type="datetime-local"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Pain Score (0 to 10)
            </label>
            <input
              {...register('pain_score', { valueAsNumber: true })}
              type="number"
              min={0}
              max={10}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Treatment Details *
            </label>
            <textarea
              {...register('treatment')}
              rows={4}
              placeholder="e.g. IFT applied for 15 mins, core strengthening..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
            {errors.treatment && (
              <p className="text-xs text-rose-500 mt-1">{errors.treatment.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Home Exercise Advice
            </label>
            <textarea
              {...register('home_advice')}
              rows={2}
              placeholder="e.g. Cat-camel stretch 2x daily..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsSlideOpen(false)}
              disabled={createSession.isPending}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSession.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {createSession.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{createSession.isPending ? 'Saving...' : 'Save Session'}</span>
            </button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
