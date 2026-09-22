'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { usePatients } from '../../../features/patients/api';
import { AddPatientSlideOver } from '../../../features/patients/components/AddPatientSlideOver';
import { WhatsAppButton } from '../../../components/ui/WhatsAppButton';
import { Patient, PatientStatus } from '../../../types/api';
import { Plus, Phone, Trash2 } from 'lucide-react';
import { useCanAccessModule, useCanPerformAction } from '../../../config/permissions';
import { AccessRestricted } from '../../../components/ui/AccessRestricted';
import { MotionPage, MotionCardGrid, MotionCard, MotionButton } from '../../../components/motion';

export default function PatientsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const isAllowed = useCanAccessModule('patients');
  const canCreateEdit = useCanPerformAction('createEditPatient');
  const { data: response, isLoading } = usePatients(searchTerm, page, 10, isAllowed);
  const patients = response?.data || [];
  const meta = response?.meta;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredPatients = patients.filter((p) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'soft_deleted') return !!p.deleted_at;
    if (statusFilter === 'active') return !p.deleted_at && p.status === 'active';
    return p.status === statusFilter;
  });

  if (!isAllowed) {
    return <AccessRestricted message="Patients directory access is restricted for your role." />;
  }

  const columns: Column<Patient>[] = [
    {
      key: 'name',
      header: 'Patient Name',
      render: (patient) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
            {patient.first_name[0]}
            {patient.last_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900 dark:text-white">
                {patient.first_name} {patient.last_name}
              </p>
              {patient.deleted_at && (
                <span
                  title={`Soft-deleted on ${new Date(patient.deleted_at).toLocaleString()}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  <span>Soft-deleted</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">ID: {patient.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Number',
      render: (patient) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{patient.phone}</span>
          </div>
          <WhatsAppButton phone={patient.phone} name={`${patient.first_name} ${patient.last_name}`} />
        </div>
      ),
    },
    {
      key: 'chief_complaint',
      header: 'Chief Complaint',
      render: (patient) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
          {patient.chief_complaint}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (patient) => {
        const colors: Record<PatientStatus, string> = {
          active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          inactive: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
          discharged: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
        };
        return (
          <span
            className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              colors[patient.status]
            }`}
          >
            {patient.status}
          </span>
        );
      },
    },
  ];

  return (
    <MotionPage className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Patients Directory</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage patient records & clinical workspaces</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discharged">Discharged</option>
              <option value="soft_deleted">Soft-deleted</option>
            </select>

            {canCreateEdit && (
              <MotionButton
                onClick={() => setIsAddOpen(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Patient</span>
              </MotionButton>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredPatients}
          isLoading={isLoading}
          onSearchChange={(term) => {
            setSearchTerm(term);
            setPage(1); // Reset to page 1 on new search
          }}
          searchPlaceholder="Search by patient name or phone number..."
          emptyMessage="No patients found."
          onRowClick={(patient) => router.push(`/patients/${patient.id}`)}
          totalItems={meta?.total}
          currentPage={meta?.page}
          pageSize={meta?.page_size}
          onPageChange={setPage}
        />

        <AddPatientSlideOver isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      </MotionPage>
  );
}
