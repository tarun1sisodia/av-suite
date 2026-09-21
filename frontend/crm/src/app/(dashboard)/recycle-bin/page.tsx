'use client';

import React, { useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useHasCapability, useCanAccessModule } from '../../../config/permissions';
import { RotateCcw, Trash2, AlertTriangle, X } from 'lucide-react';
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

// ── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmDeleteModal({
  item,
  onConfirm,
  onCancel,
  isLoading,
}: {
  item: DeletedItem;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const displayName = item.title || item.name || 'this item';
  const resourceType = item.resource_type || item.resource || 'record';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Delete permanently?
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              This action <span className="font-semibold text-red-600 dark:text-red-400">cannot be undone</span>. The{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">{resourceType}</span>{' '}
              <span className="font-semibold text-slate-900 dark:text-white">"{displayName}"</span>{' '}
              will be erased from the database forever.
            </p>
          </div>
        </div>

        {/* Warning box */}
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>All associated data (appointments, invoices, documents, etc.) linked to this record will also be removed.</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function RecycleBinPage() {
  const hasAccess = useCanAccessModule('recycleBin');
  const canRestore = useHasCapability('recyclebin.restore');
  const canDelete = useHasCapability('recyclebin.delete');

  const [items, setItems] = useState<DeletedItem[]>([]);
  const [isLoading, setIsLoading] = useState(hasAccess);
  const [confirmItem, setConfirmItem] = useState<DeletedItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    } catch {
      toast.error('Failed to restore item');
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmItem) return;
    const resource = confirmItem.resource_type || confirmItem.resource || 'patient';
    setIsDeleting(true);
    try {
      await apiClient.delete(`/recycle-bin/${resource}/${confirmItem.id}`);
      setItems((prev) => prev.filter((i) => i.id !== confirmItem.id));
      toast.success('Item permanently deleted');
      setConfirmItem(null);
    } catch {
      toast.error('Failed to permanently delete item');
    } finally {
      setIsDeleting(false);
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
    ...((canRestore || canDelete)
      ? [
          {
            key: 'actions' as keyof DeletedItem,
            header: 'Actions',
            render: (item: DeletedItem) => (
              <div className="flex items-center gap-2">
                {canRestore && (
                  <button
                    id={`restore-${item.id}`}
                    onClick={() => handleRestore(item.resource_type || item.resource || 'patient', item.id)}
                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    id={`delete-${item.id}`}
                    onClick={() => setConfirmItem(item)}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <AppShell>
      {confirmItem && (
        <ConfirmDeleteModal
          item={confirmItem}
          onConfirm={handlePermanentDelete}
          onCancel={() => !isDeleting && setConfirmItem(null)}
          isLoading={isDeleting}
        />
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recycle Bin</h1>
          <p className="text-sm text-slate-500">
            View, restore, or permanently delete soft-deleted clinic records
          </p>
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
