'use client';

import React, { useState } from 'react';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useCanAccessModule, useHasCapability } from '../../../config/permissions';
import { useUsers } from '../../../features/users/api';
import { AddUserSlideOver } from '../../../features/users/components/AddUserSlideOver';
import { User } from '../../../types/api';
import { Plus } from 'lucide-react';
import { AccessRestricted } from '../../../components/ui/AccessRestricted';

export default function TherapistsPage() {
  const hasAccess = useCanAccessModule('therapists');
  const canCreateTherapist = useHasCapability('users.create');
  const canViewSalary = useHasCapability('users.edit');

  const { data: usersResponse, isLoading } = useUsers(hasAccess);
  const users = usersResponse || [];
  const therapists = users.filter((u: User) => u.role === 'therapist');

  const [isSlideOpen, setIsSlideOpen] = useState(false);

  if (!hasAccess) {
    return <AccessRestricted message="Therapists directory and payroll is restricted." />;
  }

  const columns: Column<User>[] = [
    { key: 'name', header: 'Therapist Name', render: (u) => <span className="font-bold">{u.first_name} {u.last_name}</span> },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    ...(canViewSalary ? [{ key: 'payroll', header: 'Monthly Salary', render: () => <span className="text-rose-600 font-bold">₹35,000 / mo</span> }] : []),
    { key: 'status', header: 'Status', render: (u) => (u.is_active ? <span className="text-emerald-600 font-bold text-xs">Active</span> : 'Inactive') },
  ];

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Therapists Directory & Payroll</h1>
            <p className="text-sm text-slate-500">Manage clinic therapists & monthly compensation</p>
          </div>

          {canCreateTherapist && (
            <button
              onClick={() => setIsSlideOpen(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Therapist</span>
            </button>
          )}
        </div>

        <DataTable columns={columns} data={therapists} isLoading={isLoading} />

        {/* Canonical Add User / Therapist Drawer */}
        <AddUserSlideOver
          isOpen={isSlideOpen}
          onClose={() => setIsSlideOpen(false)}
          defaultRole="therapist"
        />
      </div>
  );
}
