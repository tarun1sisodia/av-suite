'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { patientDocumentFormSchema, PatientDocumentFormValues } from '../../../lib/schemas';
import { SlideOver } from '../../../components/ui/SlideOver';
import { FileUp, FileText, Download, Trash2, Plus, Paperclip, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../../lib/api-client';
import { getStoredToken } from '../../../lib/auth';
import { hasCapability } from '../../../config/permissions';

import { usePatientDocuments, useUploadPatientDocument } from '../api';

export function DocumentsTab({ patientId }: { patientId: string }) {
  const { data: response, isLoading } = usePatientDocuments(patientId);
  const documents = response?.items || [];
  const [isSlideOpen, setIsSlideOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientDocumentFormValues>({
    resolver: zodResolver(patientDocumentFormSchema),
    defaultValues: {
      patient_id: patientId,
      label: '',
      category: 'medical_report',
      notes: '',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation: max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds maximum limit of 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const uploadDocument = useUploadPatientDocument();

  const onSubmit = (values: PatientDocumentFormValues) => {
    if (uploadDocument.isPending) return;
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('label', values.label);
    formData.append('category', values.category);
    if (values.notes) formData.append('notes', values.notes);
    if (values.treatment_id) formData.append('treatment_id', values.treatment_id);
    formData.append('file', selectedFile);

    uploadDocument.mutate(
      {
        patientId,
        payload: formData,
      },
      {
        onSuccess: () => {
          toast.success('Document record saved successfully.');
          reset();
          setSelectedFile(null);
          setIsSlideOpen(false);
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.detail || err?.message || 'Failed to save document.');
        },
      }
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Patient Documents</h3>
          <p className="text-xs text-slate-500">Medical reports, prescriptions & consent forms</p>
        </div>
        {hasCapability('documents.upload') && (
          <button
            onClick={() => setIsSlideOpen(true)}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Documents Table / Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {documents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No documents uploaded for this patient.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 dark:bg-teal-950 text-teal-600 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">
                      {doc.label}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="capitalize px-2 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                        {doc.category.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {hasCapability('documents.view') && (
                <button
                  onClick={async () => {
                    try {
                      const downloadUrl = `${API_BASE_URL}/documents/${doc.id}/download`;
                      const token = getStoredToken();
                      const res = await fetch(downloadUrl, {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      if (!res.ok) throw new Error('Download failed');
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = doc.label;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      a.remove();
                    } catch (err) {
                      toast.error('Failed to download document');
                    }
                  }}
                  title="Download File"
                  className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload SlideOver */}
      <SlideOver
        isOpen={isSlideOpen}
        onClose={() => setIsSlideOpen(false)}
        title="Upload Patient Document"
        subtitle="Attach MRI scans, prescriptions or lab reports"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Document Label *
            </label>
            <input
              {...register('label')}
              type="text"
              placeholder="e.g. Lumbar Spine MRI Report"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
            {errors.label && <p className="text-xs text-rose-500 mt-1">{errors.label.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category *
            </label>
            <select
              {...register('category')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value="medical_report">Medical Report</option>
              <option value="prescription">Prescription</option>
              <option value="lab_result">Lab Result</option>
              <option value="consent">Consent Form</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              File Attachment (PDF / Image, Max 10MB) *
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Additional comments..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsSlideOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadDocument.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {uploadDocument.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{uploadDocument.isPending ? 'Uploading...' : 'Upload Document'}</span>
            </button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
