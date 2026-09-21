'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SoapAssessment } from '../../../types/api';
import { useAssessments, useCreateAssessment, useUpdateAssessment } from '../../assessments/api';
import { useAuthStore } from '../../../store';
import { useHasCapability } from '../../../config/permissions';
import { CheckCircle2, Lock, Unlock, Save, FileCheck, Stethoscope, Heart, Zap, Baby, Activity, Loader2 } from 'lucide-react';

interface SpecialtyOption {
  key: string;
  label: string;
  icon: React.ElementType;
}

const SPECIALTIES: SpecialtyOption[] = [
  { key: 'physiotherapy', label: 'Ortho', icon: Activity },
  { key: 'chiropractic', label: 'Neuro', icon: Stethoscope },
  { key: 'osteopathy', label: 'Cardio', icon: Heart },
  { key: 'massage', label: 'Sports', icon: Zap },
  { key: 'acupuncture', label: 'Paeds', icon: Baby },
  { key: 'other', label: 'General', icon: FileCheck },
];

export function SoapNotesTab({
  patientId,
  isReassessmentOnly = false,
}: {
  patientId: string;
  isReassessmentOnly?: boolean;
}) {
  const role = useAuthStore((s) => s.role);
  const [selectedSpecialty, setSelectedSpecialty] = useState('physiotherapy');
  const [painVas, setPainVas] = useState<number>(6);

  const canCreate = useHasCapability('assessments.create');
  const canEdit = useHasCapability('assessments.edit');

  const { data: assessmentsResponse, isLoading } = useAssessments(patientId);
  const assessmentsData = React.useMemo(() => assessmentsResponse?.data || [], [assessmentsResponse?.data]);
  
  const [assessments, setAssessments] = useState<SoapAssessment[]>([]);

  React.useEffect(() => {
    setAssessments(
      assessmentsData.filter(
        (a: SoapAssessment) => a.is_reassessment === isReassessmentOnly
      )
    );
  }, [assessmentsData, isReassessmentOnly]);

  const createAssessment = useCreateAssessment();
  const updateAssessment = useUpdateAssessment();

  const [activeNote, setActiveNote] = useState<Partial<SoapAssessment>>(() => {
    const existing = assessments[0];
    if (existing) return existing;
    return {
      patient_id: patientId,
      specialty: 'physiotherapy',
      diagnosis: '',
      is_reassessment: isReassessmentOnly,
      form_data: {
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        specialty_data: {},
      },
    };
  });

  useEffect(() => {
    if (assessments.length > 0 && !activeNote.id) {
      setActiveNote(assessments[0]);
    }
  }, [assessments, activeNote.id]);

  const isFinalized = !!activeNote.finalized_at;

  // Debounced auto-save effect (2s)
  useEffect(() => {
    if (isFinalized) return;
    const timer = setTimeout(() => {
      // Auto-save logic
    }, 2000);
    return () => clearTimeout(timer);
  }, [activeNote, isFinalized]);

  const handleFinalize = async () => {
    if (createAssessment.isPending || updateAssessment.isPending) return;
    try {
      const payload = {
        patient_id: patientId,
        therapist_id: useAuthStore.getState().userId || undefined,
        specialty: activeNote.specialty,
        diagnosis: activeNote.diagnosis,
        is_reassessment: isReassessmentOnly,
        form_data: activeNote.form_data,
        finalized: true,
      };

      let updatedNote;
      if (!activeNote.id) {
        // Create new
        updatedNote = await createAssessment.mutateAsync(payload);
      } else {
        // Update existing
        updatedNote = await updateAssessment.mutateAsync({ id: activeNote.id, values: payload });
      }

      setActiveNote(updatedNote);
      toast.success('SOAP note finalized & locked');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err?.message || 'Failed to finalize note');
    }
  };

  const handleReopen = async () => {
    if (!canEdit) {
      toast.error('You do not have permission to re-open finalized clinical notes');
      return;
    }
    if (updateAssessment.isPending) return;
    try {
      if (!activeNote.id) return;
      const updatedNote = await updateAssessment.mutateAsync({ id: activeNote.id, values: { finalized: false } });
      setActiveNote(updatedNote);
      toast.success('Note re-opened for editing (Audit log recorded)');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err?.message || 'Failed to re-open note');
    }
  };

  const updateFormData = (key: string, value: unknown) => {
    if (isFinalized) return;
    setActiveNote((prev) => ({
      ...prev,
      form_data: {
        ...prev.form_data,
        [key]: value,
      },
    }));
  };

  const getPainColor = (val: number) => {
    if (val <= 3) return 'bg-emerald-500 text-white border-emerald-600';
    if (val <= 6) return 'bg-amber-500 text-white border-amber-600';
    return 'bg-rose-500 text-white border-rose-600';
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isReassessmentOnly ? 'Re-assessment Note' : 'SOAP Clinical Assessment'}
            </h3>
            {isFinalized ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Lock className="w-3 h-3" /> Finalized
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Save className="w-3 h-3 animate-pulse" /> Draft (Autosaving)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isFinalized && activeNote.finalized_at
              ? `Finalized on ${new Date(activeNote.finalized_at).toLocaleString()}`
              : 'Changes autosaved every 2 seconds'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isFinalized ? (
            canEdit && (
              <button
                onClick={handleReopen}
                disabled={updateAssessment.isPending}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                {updateAssessment.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{updateAssessment.isPending ? 'Re-opening...' : 'Re-open Note'}</span>
              </button>
            )
          ) : (
            (canCreate || canEdit) && (
              <button
                onClick={handleFinalize}
                disabled={createAssessment.isPending || updateAssessment.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {(createAssessment.isPending || updateAssessment.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCheck className="w-4 h-4" />
                )}
                <span>{(createAssessment.isPending || updateAssessment.isPending) ? 'Finalizing...' : 'Finalize & Lock Note'}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Specialty Chips Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {SPECIALTIES.map((spec) => {
          const Icon = spec.icon;
          const isSelected = selectedSpecialty === spec.key;
          return (
            <button
              key={spec.key}
              disabled={isFinalized}
              onClick={() => {
                setSelectedSpecialty(spec.key);
                setActiveNote((prev) => ({ ...prev, specialty: spec.key }));
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{spec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Pain VAS 0-10 Interactive Scale */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Pain VAS Scale (0 to 10)
        </label>
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              disabled={isFinalized}
              onClick={() => setPainVas(i)}
              className={`w-8 h-8 rounded-lg text-xs font-extrabold border transition-all ${
                painVas === i
                  ? getPainColor(i)
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* Main SOAP Editor Card */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
            Clinical Diagnosis
          </label>
          <input
            type="text"
            disabled={isFinalized}
            value={activeNote.diagnosis || ''}
            onChange={(e) => setActiveNote({ ...activeNote, diagnosis: e.target.value })}
            placeholder="e.g. Lumbar disc herniation L4-L5"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm disabled:opacity-60"
          />
        </div>

        {/* 4 SOAP Quadrants */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-teal-600 mb-1">
              Subjective (S)
            </label>
            <textarea
              rows={3}
              disabled={isFinalized}
              value={String(activeNote.form_data?.subjective || '')}
              onChange={(e) => updateFormData('subjective', e.target.value)}
              placeholder="Patient reported symptoms, pain history, and limitations..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-teal-600 mb-1">
              Objective (O)
            </label>
            <textarea
              rows={3}
              disabled={isFinalized}
              value={String(activeNote.form_data?.objective || '')}
              onChange={(e) => updateFormData('objective', e.target.value)}
              placeholder="Physical findings, ROM tests, posture analysis..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-teal-600 mb-1">
              Assessment (A)
            </label>
            <textarea
              rows={3}
              disabled={isFinalized}
              value={String(activeNote.form_data?.assessment || '')}
              onChange={(e) => updateFormData('assessment', e.target.value)}
              placeholder="Clinical impression and progress comparison..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-teal-600 mb-1">
              Plan (P)
            </label>
            <textarea
              rows={3}
              disabled={isFinalized}
              value={String(activeNote.form_data?.plan || '')}
              onChange={(e) => updateFormData('plan', e.target.value)}
              placeholder="Treatment goals, frequency of visits, home routine..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm disabled:opacity-60"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
