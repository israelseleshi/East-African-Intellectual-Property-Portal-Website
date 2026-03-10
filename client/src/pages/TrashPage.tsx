import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Button } from '../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

type ResourceType = 'clients' | 'trademark_cases' | 'invoices' | 'case_notes' | 'oppositions' | 'fee_schedules';

interface TrashedItem {
  id: string;
  type: ResourceType;
  name: string;
  deleted_at: string;
  deleted_by?: string;
  details?: Record<string, unknown>;
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
  clients: 'Client',
  trademark_cases: 'Trademark Case',
  invoices: 'Invoice',
  case_notes: 'Case Note',
  oppositions: 'Opposition',
  fee_schedules: 'Fee Schedule'
};

export default function TrashPage() {
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ResourceType | 'all'>('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const api = useApi();

  useEffect(() => {
    loadTrashedItems();
  }, [searchParams]);

  const loadTrashedItems = async () => {
    try {
      // This would need a dedicated endpoint, for now we'll simulate
      // In real implementation: const data = await api.get('/trash');
      setItems([]);
    } catch (error) {
      console.error('Failed to load trashed items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: TrashedItem) => {
    if (!confirm(`Restore this ${RESOURCE_LABELS[item.type]}?`)) return;

    try {
      // Restore by setting deleted_at = NULL
      await api.patch(`/${getEndpoint(item.type)}/${item.id}/restore`, {});
      loadTrashedItems();
    } catch (error) {
      console.error('Failed to restore:', error);
    }
  };

  const handlePermanentDelete = async (item: TrashedItem) => {
    if (!confirm(`PERMANENTLY DELETE this ${RESOURCE_LABELS[item.type]}? This cannot be undone!`)) return;

    try {
      await api.delete(`/${getEndpoint(item.type)}/${item.id}?permanent=true`);
      loadTrashedItems();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('PERMANENTLY DELETE ALL items in trash? This cannot be undone!')) return;

    try {
      // This would need a dedicated endpoint
      // await api.delete('/trash/empty');
      loadTrashedItems();
    } catch (error) {
      console.error('Failed to empty trash:', error);
    }
  };

  const getEndpoint = (type: ResourceType): string => {
    const endpoints: Record<ResourceType, string> = {
      clients: 'clients',
      trademark_cases: 'cases',
      invoices: 'financials',
      case_notes: 'notes',
      oppositions: 'oppositions',
      fee_schedules: 'fees'
    };
    return endpoints[type];
  };

  const filteredItems = selectedType === 'all'
    ? items
    : items.filter(item => item.type === selectedType);

  if (loading) {
    return (
      <div className="w-full animate-pulse max-w-6xl mx-auto p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-[var(--eai-border)]/50 rounded-lg" />
            <div className="h-4 w-64 bg-[var(--eai-border)]/30 rounded" />
          </div>
          <div className="h-10 w-32 bg-[var(--eai-border)]/50 rounded-xl" />
        </div>

        {/* Filter Buttons Skeleton */}
        <div className="flex gap-2 mb-6">
          <div className="h-10 w-24 bg-[var(--eai-border)]/50 rounded-md" />
          <div className="h-10 w-24 bg-[var(--eai-border)]/50 rounded-md" />
          <div className="h-10 w-24 bg-[var(--eai-border)]/50 rounded-md" />
        </div>

        {/* Table Skeleton */}
        <div className="apple-card overflow-hidden">
          <div className="flex gap-4 px-6 py-3 border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30">
            <div className="h-4 w-16 bg-[var(--eai-border)]/40 rounded" />
            <div className="h-4 w-32 bg-[var(--eai-border)]/40 rounded" />
            <div className="h-4 w-24 bg-[var(--eai-border)]/40 rounded" />
            <div className="h-4 w-24 bg-[var(--eai-border)]/40 rounded ml-auto" />
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-[var(--eai-border)]">
              <div className="h-6 w-20 bg-[var(--eai-border)]/30 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-[var(--eai-border)]/40 rounded" />
                <div className="h-4 w-32 bg-[var(--eai-border)]/30 rounded" />
              </div>
              <div className="h-4 w-24 bg-[var(--eai-border)]/30 rounded" />
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-[var(--eai-border)]/30 rounded" />
                <div className="h-8 w-24 bg-[var(--eai-border)]/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div id="trash-header" className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Trash</h1>
          <p className="text-gray-500">Deleted items are kept here for 30 days before permanent deletion</p>
        </div>
        {items.length > 0 && (
          <Button id="empty-trash-btn" variant="destructive" onClick={handleEmptyTrash}>
            Empty Trash
          </Button>
        )}
      </div>

      {/* Filter */}
      <div id="filter-buttons" className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${selectedType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          All Types
        </button>
        {Object.entries(RESOURCE_LABELS).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setSelectedType(type as ResourceType)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${selectedType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {label}s
          </button>
        ))}
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <span className="text-6xl block mb-4">🗑️</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Trash is empty</h3>
          <p className="text-gray-500">Deleted items will appear here</p>
        </div>
      ) : (
        <div id="trash-table" className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Deleted</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                      {RESOURCE_LABELS[item.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    {item.details && (
                      <div className="text-sm text-gray-500">
                        {Object.entries(item.details).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}
                    {item.deleted_by && <div className="text-xs">by {item.deleted_by}</div>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        id="restore-btn"
                        size="sm"
                        onClick={() => handleRestore(item)}
                      >
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handlePermanentDelete(item)}
                      >
                        Delete Forever
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div id="info-box" className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <h4 className="font-medium mb-2">About Soft Deletes</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Items in trash are not visible to users but can be restored</li>
          <li>After 30 days, items may be permanently deleted automatically</li>
          <li>Only administrators can permanently delete items</li>
          <li>Restored items return to their original location with all data intact</li>
        </ul>
      </div>
    </div>
  );
}
