'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePatient, useDeletePatient } from '../../../../features/patients/api';
import { useAuthStore } from '../../../../store';
import { usePermissions, useCanAccessModule, useHasCapability, useCanPerformAction } from '../../../../config/permissions';
import { AccessRestricted } from '../../../../components/ui/AccessRestricted';
import { TreatmentsTab } from '../../../../features/patients/components/TreatmentsTab';
import { SoapNotesTab } from '../../../../features/patients/components/SoapNotesTab';
import { DocumentsTab } from '../../../../features/patients/components/DocumentsTab';
import { ProgressionTab } from '../../../../features/patients/components/ProgressionTab';
import { EditPatientSlideOver } from '../../../../features/patients/components/EditPatientSlideOver';
import { WhatsAppButton, openWhatsApp } from '../../../../components/ui/WhatsAppButton';
import { ArrowLeft, FileText, CreditCard, Clock, Stethoscope, MessageSquare, TrendingDown, Activity, FileCheck, Camera, Dumbbell, Edit2, Trash2 } from 'lucide-react';
import { apiClient, API_BASE_URL } from '../../../../lib/api-client';
import { getStoredToken } from '../../../../lib/auth';
import { toast } from 'sonner';
import { usePrescriptions, useCreatePrescription, useGeneratePrescriptionPdf } from '../../../../features/prescriptions/api';

type TabKey = 'timeline' | 'documents' | 'treatments' | 'soapNotes' | 'assessments' | 'progression' | 'rx' | 'billing';

export default function PatientWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params?.id as string;
  const role = useAuthStore((s) => s.role);

  const { data: patient, isLoading } = usePatient(patientId);
  const [activeTab, setActiveTab] = useState<TabKey>('timeline');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const deletePatient = useDeletePatient();

  const { data: prescriptions, isLoading: isRxLoading } = usePrescriptions(patientId);
  const createRx = useCreatePrescription();
  const generatePdf = useGeneratePrescriptionPdf();

  const isAllowed = useCanAccessModule('patients');
  const { patientTabs: permissions } = usePermissions();
  const canRestore = useHasCapability('recyclebin.restore');
  const canCreatePosture = useHasCapability('posture.create');
  const canViewExercises = useHasCapability('exercises.view');
  const canCreatePrescriptions = useHasCapability('prescriptions.create');
  const canViewPrescriptions = useHasCapability('prescriptions.view');
  const canEditPatient = useCanPerformAction('createEditPatient');
  const canDeletePatient = useCanPerformAction('deletePatient');

  if (!isAllowed) {
    return <AccessRestricted message="Patient workspace access is restricted for your role." />;
  }

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading patient workspace...</div>;
  }

  if (!patient) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-500 font-medium">Patient not found</p>
        <button
          onClick={() => router.push('/patients')}
          className="px-4 py-2 bg-teal-600 text-white text-xs rounded-lg font-medium"
        >
          Return to Patients Directory
        </button>
      </div>
    );
  }

  if (patient.deleted_at) {
    return (
      <div className="space-y-6">
        {/* Back Link */}
        <button
          onClick={() => router.push('/patients')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Patients Directory</span>
        </button>

        {/* Soft-deleted Alert Banner */}
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3 text-rose-800 dark:text-rose-200 text-sm">
            <Trash2 className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-base">This patient is soft-deleted</p>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                Patient <span className="font-semibold">{patient.first_name} {patient.last_name}</span> was deleted on {new Date(patient.deleted_at).toLocaleString()} and is currently in the Recycle Bin.
              </p>
            </div>
          </div>
          {canRestore && (
            <button
              onClick={async () => {
                try {
                  await apiClient.post(`/recycle-bin/patient/${patient.id}/restore`);
                  toast.success('Patient restored successfully');
                  window.location.reload();
                } catch {
                  toast.error('Failed to restore patient');
                }
              }}
              className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              Restore Patient
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${patient.first_name} ${patient.last_name}?`)) {
      try {
        await deletePatient.mutateAsync(patient.id);
        toast.success('Patient deleted successfully');
        router.push('/patients');
      } catch (err) {
        toast.error('Failed to delete patient');
      }
    }
  };

  const handleSendWaSessionReport = () => {
    const message = `🏥 *Aarogya Virohan — Session Report*\n\nHi ${patient.first_name},\n\nSession completed successfully.\nInitial Pain: 8/10\nCurrent Pain: 3/10 (▼ 5 pts improved)\nTreatment: IFT therapy & core stabilization\nHome Advice: Cat-camel stretches twice daily\n\nThank you for visiting!`;
    openWhatsApp(patient.phone, `${patient.first_name} ${patient.last_name}`, message);
  };

  const handleGenerateRx = async () => {
    try {
      let rxId: string;
      if (prescriptions && prescriptions.length > 0) {
        rxId = prescriptions[0].id;
      } else {
        const newRx = await createRx.mutateAsync({
          patient_id: patientId,
          physio_notes: "Auto-generated prescription.",
          items: [],
        });
        rxId = newRx.id;
      }

      await generatePdf.mutateAsync(rxId);
      toast.success('Prescription generated successfully! Downloading...');

      const downloadUrl = `${API_BASE_URL}/prescriptions/${rxId}/pdf/download`;
      
      const token = getStoredToken();
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Prescription-${patient.first_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      toast.error('Failed to generate or download Prescription PDF');
    }
  };

  const allTabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'timeline', label: 'Timeline', icon: Clock },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'treatments', label: 'Treatments', icon: Stethoscope },
    { key: 'soapNotes', label: 'SOAP Notes', icon: FileText },
    { key: 'assessments', label: 'Assessments', icon: Stethoscope },
    { key: 'progression', label: 'Progression', icon: Activity },
    { key: 'rx', label: 'Rx Prescription', icon: FileCheck },
    { key: 'billing', label: 'Billing', icon: CreditCard },
  ];

  const visibleTabs = allTabs.filter((t) => {
    if (t.key === 'progression' || t.key === 'rx') return permissions.treatments;
    return permissions[t.key as keyof typeof permissions];
  });

  return (
    <>
      <div className="space-y-6">
        {/* Back Link */}
        <button
          onClick={() => router.push('/patients')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Patients Directory</span>
        </button>

        {/* Sticky Patient Workspace Header */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4 sticky top-16 z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-teal-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-teal-600/20">
                {patient.first_name[0]}
                {patient.last_name[0]}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {patient.first_name} {patient.last_name}
                  </h1>
                  {patient.deleted_at && (
                    <span
                      title={`Soft-deleted on ${new Date(patient.deleted_at).toLocaleString()}`}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Soft-deleted</span>
                    </span>
                  )}
                  <WhatsAppButton phone={patient.phone} name={`${patient.first_name} ${patient.last_name}`} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Phone: <strong className="text-slate-800 dark:text-slate-200">{patient.phone}</strong></span>
                  <span>•</span>
                  <span>Gender: <strong className="capitalize text-slate-800 dark:text-slate-200">{patient.gender}</strong></span>
                  {patient.date_of_birth && (
                    <>
                      <span>•</span>
                      <span>DOB: <strong className="text-slate-800 dark:text-slate-200">{patient.date_of_birth}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Pain Improvement Badges & WhatsApp Action */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Initial Pain: 8/10
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Current: 3/10
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> ▼ 5 pts improved
              </span>

              <button
                onClick={handleSendWaSessionReport}
                className="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WA Session Report</span>
              </button>

              {canCreatePosture && (
              <a
                href={`${(process.env.NEXT_PUBLIC_POSTURE_APP_URL || 'http://localhost:3002').replace(/\/+$/, '')}/analyze?patient_id=${patient.id}`}
                target="_blank"
                rel="noreferrer"
                className="ml-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>AI Posture Analysis</span>
              </a>
              )}

              {canViewExercises && (
              <a
                href={`${(process.env.NEXT_PUBLIC_EXERCISE_APP_URL || 'http://localhost:3001').replace(/\/+$/, '')}/prescribe?patient_id=${patient.id}`}
                target="_blank"
                rel="noreferrer"
                className="ml-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Exercise Library</span>
              </a>
              )}

              {canCreatePrescriptions && (
              <button
                onClick={handleGenerateRx}
                disabled={isRxLoading || createRx.isPending || generatePdf.isPending}
                className="ml-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Auto-Rx</span>
              </button>
              )}

              {canEditPatient && (
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="ml-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}

              {canDeletePatient && (
                <button
                  onClick={handleDelete}
                  disabled={deletePatient.isPending}
                  className="ml-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Chief Complaint Banner */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-xs">
            <span className="font-bold text-teal-600 uppercase tracking-wider">Chief Complaint: </span>
            <span className="text-slate-700 dark:text-slate-300">{patient.chief_complaint}</span>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pt-2 overflow-x-auto">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="pt-2">
          {activeTab === 'timeline' && (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Patient Activity Timeline</h3>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                Patient record created on {new Date(patient.created_at).toLocaleString()}.
              </div>
            </div>
          )}

          {activeTab === 'documents' && <DocumentsTab patientId={patient.id} />}

          {activeTab === 'treatments' && <TreatmentsTab patientId={patient.id} />}

          {activeTab === 'soapNotes' && <SoapNotesTab patientId={patient.id} isReassessmentOnly={false} />}

          {activeTab === 'assessments' && <SoapNotesTab patientId={patient.id} isReassessmentOnly={true} />}

          {activeTab === 'progression' && <ProgressionTab patientId={patient.id} />}

          {activeTab === 'rx' && (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Prescription (Rx) Generator</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Generates a branded PDF prescription containing clinic logo, diagnosis history, and exercise routine.
              </p>
              {canViewPrescriptions && (
              <button
                onClick={handleGenerateRx}
                disabled={generatePdf.isPending || createRx.isPending || isRxLoading}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>{generatePdf.isPending ? 'Generating...' : 'Generate Prescription PDF'}</span>
              </button>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center justify-center h-full text-sm text-slate-500 font-medium bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Not implemented yet
              </div>
            </div>
          )}
        </div>
      </div>
      <EditPatientSlideOver isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} patient={patient} />
    </>
  );
}
