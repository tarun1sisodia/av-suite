'use client';

import React, { useState } from 'react';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { AccessRestricted } from '../../../components/ui/AccessRestricted';
import { AuditLog, User } from '../../../types/api';
import { useUsers } from '../../../features/users/api';
import { useAuditLogs } from '../../../features/audit/api';
import { useAuthStore } from '../../../store';
import { useCanAccessModule, useHasCapability } from '../../../config/permissions';
import { Settings as SettingsIcon, Users, FileText, AlertCircle, Save, Plus, Palette, Upload, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useClinicSettings, useUpdateClinicSettings } from '../../../features/settings/api';
import { AddUserSlideOver } from '../../../features/users/components/AddUserSlideOver';
import { UserPermissionsSlideOver } from '../../../features/users/components/UserPermissionsSlideOver';
import { useDeleteUser } from '../../../features/users/api';
import { JsonViewerSlideOver } from '../../../components/ui/JsonViewerSlideOver';

type TabKey = 'clinic' | 'users' | 'audit';

export default function SettingsPage() {
  const role = useAuthStore((s) => s.role);
  const userId = useAuthStore((s) => s.userId);

  const hasAccess = useCanAccessModule('settings');
  const canViewClinic = useHasCapability('settings.view');
  const canEditClinic = useHasCapability('settings.edit');
  const canViewUsers = useHasCapability('users.view');
  const canCreateUser = useHasCapability('users.create');
  const canDeleteUser = useHasCapability('users.delete');
  const canEditPermissions = useHasCapability('permissions.edit');
  const canViewAudit = useHasCapability('audit.view');

  const defaultTab: TabKey = canViewClinic ? 'clinic' : canViewUsers ? 'users' : 'audit';
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  React.useEffect(() => {
    if (activeTab === 'clinic' && !canViewClinic) {
      if (canViewUsers) setActiveTab('users');
      else if (canViewAudit) setActiveTab('audit');
    } else if (activeTab === 'users' && !canViewUsers) {
      if (canViewClinic) setActiveTab('clinic');
      else if (canViewAudit) setActiveTab('audit');
    } else if (activeTab === 'audit' && !canViewAudit) {
      if (canViewClinic) setActiveTab('clinic');
      else if (canViewUsers) setActiveTab('users');
    }
  }, [canViewClinic, canViewUsers, canViewAudit, activeTab]);

  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [brandColor, setBrandColor] = useState('#0b2c5f');
  const [doctorName, setDoctorName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<AuditLog | null>(null);

  const { data: clinicSettings, isLoading: isLoadingSettings } = useClinicSettings(canViewClinic);
  const updateSettings = useUpdateClinicSettings();
  const deleteUser = useDeleteUser();

  React.useEffect(() => {
    if (clinicSettings) {
      setClinicName(clinicSettings.name || '');
      if (clinicSettings.branding_color) {
        setBrandColor(clinicSettings.branding_color);
        document.documentElement.style.setProperty('--brand-navy', clinicSettings.branding_color);
      }
      if (clinicSettings.branding_logo_url) {
        setLogoBase64(clinicSettings.branding_logo_url);
      }
    }
  }, [clinicSettings]);

  const { data: usersResponse, isLoading: isLoadingUsers } = useUsers(canViewUsers);
  const users = usersResponse || [];

  const { data: auditResponse, isLoading: isLoadingAudit } = useAuditLogs(auditPage, 50, userId, canViewAudit);
  const auditLogs = auditResponse?.data || [];
  const auditTotal = auditResponse?.meta?.total || auditLogs.length;

  const handleBrandColorChange = (color: string) => {
    setBrandColor(color);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--brand-navy', color);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      toast.error('Logo file size must be under 200KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoBase64(reader.result as string);
      toast.success('Logo uploaded & preview updated');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditClinic) {
      toast.error('You do not have permission to edit clinic settings');
      return;
    }
    try {
      await updateSettings.mutateAsync({
        name: clinicName,
        branding_color: brandColor,
        branding_logo_url: logoBase64,
      });
      toast.success('Clinic branding & settings saved successfully!');
    } catch (err) {
      toast.error('Failed to save clinic settings');
    }
  };

  const auditColumns: Column<AuditLog>[] = [
    { 
      key: 'action', 
      header: 'Action', 
      render: (log) => {
        let colorClass = 'text-teal-600 bg-teal-50 dark:bg-teal-900/30';
        if (log.action.includes('delete')) colorClass = 'text-red-600 bg-red-50 dark:bg-red-900/30';
        else if (log.action.includes('update')) colorClass = 'text-amber-600 bg-amber-50 dark:bg-amber-900/30';
        return <span className={`font-mono text-[10px] uppercase font-bold px-2 py-1 rounded-md ${colorClass}`}>{log.action}</span>;
      }
    },
    { key: 'entity_type', header: 'Entity Type', render: (log) => <span className="font-semibold text-slate-700 dark:text-slate-300">{log.entity_type}</span> },
    { key: 'entity_id', header: 'Entity ID', render: (log) => <span className="font-mono text-xs text-slate-500">{log.entity_id || '-'}</span> },
    { key: 'user_id', header: 'User ID', render: (log) => <span className="font-mono text-xs text-slate-500">{log.user_id || 'System'}</span> },
    { 
      key: 'details', 
      header: 'Details', 
      render: (log) => (
        <button
          onClick={() => setSelectedLogForDetails(log)}
          className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          View Payload
        </button>
      )
    },
    { key: 'created_at', header: 'Timestamp', render: (log) => <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</span> },
  ];

  const userColumns: Column<User>[] = [
    { key: 'name', header: 'User Name', render: (u) => `${u.first_name} ${u.last_name}` },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (u) => <span className="uppercase text-xs font-bold text-teal-600">{u.role}</span> },
    { key: 'is_active', header: 'Status', render: (u) => (u.is_active ? 'Active' : 'Inactive') },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className="flex items-center gap-2">
          {canEditPermissions && (
            <button
              onClick={() => {
                setSelectedUser(u);
                setIsPermissionsOpen(true);
              }}
              className="text-xs px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 font-semibold rounded-md transition-colors cursor-pointer"
            >
              Edit Permissions
            </button>
          )}
          {canDeleteUser && u.id !== userId && (
            <button
              onClick={async () => {
                if (window.confirm(`Are you sure you want to remove ${u.first_name} ${u.last_name}?`)) {
                  try {
                    await deleteUser.mutateAsync(u.id);
                    toast.success('User removed successfully');
                  } catch (err: any) {
                    toast.error(err.response?.data?.detail || 'Failed to remove user');
                  }
                }
              }}
              disabled={deleteUser.isPending}
              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              title="Remove User"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (!hasAccess || (!canViewClinic && !canViewUsers && !canViewAudit)) {
    return <AccessRestricted message="Clinic settings are restricted." />;
  }

  return (
    <>
      <div className="space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clinic Settings</h1>
          <p className="text-sm text-slate-500">Manage clinic preferences, branding, users & audit logs</p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          {canViewClinic && (
            <button
              onClick={() => setActiveTab('clinic')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'clinic'
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Clinic Settings & Branding</span>
            </button>
          )}
          {canViewUsers && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'users'
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </button>
          )}
          {canViewAudit && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'audit'
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Audit Log ({auditTotal})</span>
            </button>
          )}

          {activeTab === 'users' && canCreateUser && (
            <div className="ml-auto">
              <button
                onClick={() => setIsAddUserOpen(true)}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </div>
          )}
        </div>

        {/* Clinic Branding Settings Tab */}
        {activeTab === 'clinic' && (
          <form onSubmit={handleSaveClinic} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-6 max-w-2xl">
            <div className="p-3 bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 rounded-lg text-xs text-teal-800 dark:text-teal-200">
              ✨ These branding settings automatically apply to invoices, receipts, prescriptions, and public booking forms.
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Clinic Name</label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  disabled={!canEditClinic}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Clinic Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!canEditClinic}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Brand Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => handleBrandColorChange(e.target.value)}
                      disabled={!canEditClinic}
                      className="w-10 h-9 p-0.5 rounded cursor-pointer border disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span className="text-xs font-mono text-slate-500 uppercase">{brandColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Clinic Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={!canEditClinic}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Lead Doctor / Therapist Name</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    disabled={!canEditClinic}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Medical Registration No.</label>
                  <input
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    disabled={!canEditClinic}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Clinic Logo Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Clinic Logo (For Invoices, Prescriptions & Booking Form, Max 200KB)
                </label>
                {canEditClinic && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />
                )}
                {logoBase64 && (
                  <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border w-fit">
                    <img src={logoBase64} alt="Clinic Logo Preview" className="h-12 object-contain rounded" />
                  </div>
                )}
              </div>
            </div>

            {canEditClinic && (
              <button
                type="submit"
                disabled={updateSettings.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Branding Settings</span>
              </button>
            )}
          </form>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <DataTable columns={userColumns} data={users} isLoading={isLoadingUsers} />
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <DataTable
              columns={auditColumns}
              data={auditLogs}
              isLoading={isLoadingAudit}
              searchField={(log) => `${log.action} ${log.entity_type}`}
              searchPlaceholder="Search audit logs by action or entity type..."
              totalItems={auditTotal}
              currentPage={auditPage}
              pageSize={50}
              onPageChange={(page) => setAuditPage(page)}
            />
          </div>
        )}
      </div>

      <AddUserSlideOver isOpen={isAddUserOpen} onClose={() => setIsAddUserOpen(false)} />
      <UserPermissionsSlideOver
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
        user={selectedUser}
      />
      <JsonViewerSlideOver
        isOpen={!!selectedLogForDetails}
        onClose={() => setSelectedLogForDetails(null)}
        title={`Log Details: ${selectedLogForDetails?.action || ''}`}
        data={selectedLogForDetails?.details || {}}
      />
    </>
  );
}

