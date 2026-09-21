'use client';

import React, { useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useAuthStore } from '../../../store';
import { useCanAccessModule, useHasCapability } from '../../../config/permissions';
import { Trash2, RotateCcw } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { toast } from 'sonner';
import { AccessRestricted } from '../../../components/ui/AccessRestricted';

interface DeletedItem {
  id: string;
  resource?: string;
  resource_type?: string;
  name?: string;
  title?: string;
  deleted_at: string;
  deleted_by?: string;
}

export default function RecycleBinPage() {
  const hasAccess = useCanAccessModule('recycleBin');
  const canRestore = useHasCapability('recyclebin.restore');

  const [items, setItems] = useState<DeletedItem[]>([]);
  const [isLoading, setIsLoading] = useState(hasAccess);

  React.useEffect(() => {
    if (!hasAccess) return;
    const fetchDeletedItems = async () => {
      try {
        const res = await apiClient.get('/recycle-bin');
        setItems(res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []));
      } catch {
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDeletedItems();
  }, [hasAccess]);

  const handleRestore = async (resource: string, id: string) => {
    try {
      await apiClient.post(`/recycle-bin/${resource}/${id}/restore`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Item restored successfully');
    } catch (err) {
      toast.error('Failed to restore item');
    }
  };

  if (!hasAccess) {
    return (
      <AppShell>
        <AccessRestricted message="Recycle bin access is restricted." />
      </AppShell>
    );
  }

  const columns: Column<DeletedItem>[] = [
    {
      key: 'name',
      header: 'Resource Item',
      render: (item) => <span className="font-bold">{item.title || item.name}</span>,
    },
    {
      key: 'resource',
      header: 'Resource Type',
      render: (item) => (
        <span className="uppercase text-xs font-semibold text-teal-600">
          {item.resource_type || item.resource}
        </span>
      ),
    },
    {
      key: 'deleted_at',
      header: 'Deleted Date',
      render: (item) => new Date(item.deleted_at).toLocaleString(),
    },
    {
      key: 'deleted_by',
      header: 'Deleted By',
      render: (item) => <span className="text-xs text-slate-500">{item.deleted_by || '—'}</span>,
    },
    ...(canRestore
      ? [
          {
            key: 'actions' as keyof DeletedItem,
            header: 'Actions',
            render: (item: DeletedItem) => (
              <button
                onClick={() => handleRestore(item.resource_type || item.resource || 'patient', item.id)}
                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recycle Bin</h1>
          <p className="text-sm text-slate-500">View and restore soft-deleted clinic records (Admin only)</p>
        </div>

        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          searchField={(i) => `${i.title || i.name || ''} ${i.resource_type || i.resource || ''}`}
          searchPlaceholder="Search soft-deleted records..."
          emptyMessage="Recycle bin is empty."
        />
      </div>
    </AppShell>
  );
}
