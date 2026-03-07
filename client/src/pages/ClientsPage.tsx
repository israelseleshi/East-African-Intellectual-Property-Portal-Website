import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Joyride, { Step } from 'react-joyride';
import { 
  Plus, 
  Building, 
  User, 
  Envelope, 
  MapPin, 
  SquaresFour, 
  List, 
  Trash, 
  FileArrowDown, 
  CheckSquare, 
  Square,
  CaretLeft,
  CaretRight,
  ArrowsMerge
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { clientService } from '@/utils/api';
import type { ApplicantType } from '@/shared/database';
import { useDebounce } from '@/hooks/use-debounce';

interface Client {
  id: string;
  name: string;
  type: ApplicantType;
  nationality: string;
  email: string;
  address_street: string;
  city: string;
  zip_code: string;
  created_at: string;
}

const CLIENT_TYPE_LABELS: Record<ApplicantType, string> = {
  INDIVIDUAL: 'Individual',
  COMPANY: 'Company',
  PARTNERSHIP: 'Partnership'
};

const CLIENT_TYPE_ICONS: Record<ApplicantType, typeof User> = {
  INDIVIDUAL: User,
  COMPANY: Building,
  PARTNERSHIP: Building
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const startTourFromUrl = searchParams.get('tour') === 'true';
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [selectedType, setSelectedType] = useState<ApplicantType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [runTour, setRunTour] = useState(startTourFromUrl);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 12;

  // Bulk operations state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const result = await clientService.getClients({
        q: debouncedSearch,
        type: selectedType === 'ALL' ? undefined : selectedType,
        page: currentPage,
        limit: pageSize
      });
      // Ensure we always have valid data structures even if API response is malformed
      const clientsData = result?.data || [];
      const metaData = result?.meta || { total: 0, totalPages: 1 };
      setClients(clientsData);
      setTotalPages(metaData.totalPages || 1);
      setTotalRecords(metaData.total || 0);
    } catch (error: unknown) {
      console.error('Failed to fetch clients:', error);
      // Reset to safe defaults on error
      setClients([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedType, currentPage]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedType]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === (clients || []).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set((clients || []).map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !confirm(`Are you sure you want to delete ${selectedIds.size} clients?`)) return;
    
    setIsDeleting(true);
    try {
      await clientService.bulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      fetchClients();
    } catch (error: unknown) {
      console.error('Bulk delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMerge = async () => {
    if (selectedIds.size !== 2) return;
    const [sourceId, targetId] = Array.from(selectedIds);
    if (!confirm(`Merge selected clients? This will combine all cases and invoices into one client record.`)) return;
    
    setIsMerging(true);
    try {
      await clientService.mergeClients(sourceId, targetId);
      setSelectedIds(new Set());
      setShowMergeDialog(false);
      fetchClients();
    } catch (error: unknown) {
      console.error('Merge failed:', error);
    } finally {
      setIsMerging(false);
    }
  };

  const selectedClients = useMemo(() => {
    return (clients || []).filter(c => selectedIds.has(c.id));
  }, [clients, selectedIds]);

  const handleExportCSV = () => {
    if ((clients || []).length === 0) return;
    
    const headers = ['Name', 'Type', 'Email', 'City', 'Nationality'];
    const csvData = clients.map(c => [
      `"${c.name}"`,
      c.type,
      c.email,
      `"${c.city || ''}"`,
      c.nationality || ''
    ].join(','));
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tour Steps
  const tourSteps: Step[] = [
    {
      target: '#clients-header',
      content: 'Welcome to the Clients Management page. Here you can manage your entire client database including individuals, companies, and partnerships.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#new-client-btn',
      content: 'Create a new client record. This will be used when filing trademark applications.',
      placement: 'bottom' as const,
    },
    {
      target: '#search-clients',
      content: 'Search clients by name, email, or city using fuzzy search.',
      placement: 'bottom' as const,
    },
    {
      target: '#type-filter',
      content: 'Filter clients by type: Individual, Company, or Partnership.',
      placement: 'bottom' as const,
    },
    {
      target: '#view-toggle',
      content: 'Switch between Grid view (cards) and Table view (list).',
      placement: 'bottom' as const,
    },
    {
      target: '#clients-grid',
      content: 'Your clients are displayed here. Click any client to view their details, trademark cases, and history.',
      placement: 'right' as const,
    },
    {
      target: '#bulk-actions',
      content: 'Select multiple clients to perform bulk actions like Delete or Merge (combine duplicate clients).',
      placement: 'left' as const,
    },
    {
      target: '#pagination',
      content: 'Navigate through large client lists using pagination.',
      placement: 'top' as const,
    },
  ];

  return (
    <div className="w-full">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={(data: { status: string }) => {
          if (['finished', 'skipped'].includes(data.status)) {
            setRunTour(false);
            searchParams.delete('tour');
            setSearchParams(searchParams);
          }
        }}
        styles={{
          options: {
            primaryColor: 'var(--eai-primary)',
            textColor: '#1C1C1E',
            zIndex: 10000,
            arrowColor: '#fff',
            backgroundColor: '#fff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          },
          tooltipContainer: {
            textAlign: 'left',
            borderRadius: '12px',
            fontFamily: 'inherit',
          },
          buttonNext: {
            borderRadius: '0px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonBack: {
            marginRight: '10px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonSkip: {
            fontSize: '13px',
            fontWeight: 'bold',
          }
        }}
      />
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4" id="clients-header">
        <div className="space-y-1">
          <h1 className="text-h1">Clients</h1>
          <p className="text-body text-[var(--eai-text-secondary)]">Manage and organize your client database.</p>
        </div>
        <div className="flex items-center gap-2" id="bulk-actions">
          {selectedIds.size > 0 && (
            <>
              {selectedIds.size === 2 && (
                <Button
                  onClick={() => setShowMergeDialog(true)}
                  disabled={isMerging}
                  variant="outline"
                  className="flex items-center gap-2 rounded-xl apple-button-secondary"
                >
                  <ArrowsMerge size={18} />
                  <span>Merge</span>
                </Button>
              )}
              <Button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                variant="destructive"
                className="flex items-center gap-2 rounded-xl"
              >
                <Trash size={18} />
                <span>Delete {selectedIds.size}</span>
              </Button>
            </>
          )}
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="apple-button-secondary flex items-center gap-2"
          >
            <FileArrowDown size={18} />
            <span>Export CSV</span>
          </Button>
          <Button
            id="new-client-btn"
            onClick={() => navigate('/clients/new')}
            className="apple-button-primary flex items-center gap-2 shadow-lg shadow-[var(--eai-primary)]/20"
          >
            <Plus size={18} weight="bold" />
            <span className="text-label text-white">New Client</span>
          </Button>
        </div>
      </header>

      {/* Merge Dialog */}
      {showMergeDialog && (selectedClients || []).length === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="apple-card max-w-md w-full mx-4 p-6 space-y-4">
            <h2 className="text-h2">Merge Clients</h2>
            <p className="text-body text-[var(--eai-text-secondary)]">
              Combine the following two clients into one. All trademark cases and invoices will be transferred to the selected target client.
            </p>
            
            <div className="space-y-2">
              {selectedClients.map((client) => (
                <label 
                  key={client.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${mergeTargetId === client.id ? 'border-[var(--eai-primary)] bg-[var(--eai-primary)]/10' : 'border-[var(--eai-border)] hover:bg-[var(--eai-bg)]'}`}
                >
                  <input
                    type="radio"
                    name="mergeTarget"
                    value={client.id}
                    checked={mergeTargetId === client.id}
                    onChange={(e) => setMergeTargetId(e.target.value as string)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="text-body font-bold">{client.name}</div>
                    <div className="text-micro text-[var(--eai-text-secondary)]">Email</div>
                  </div>
                  <div className="text-micro font-bold text-[var(--eai-primary)]">
                    Keep
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[var(--eai-border)]">
              <Button
                onClick={() => setShowMergeDialog(false)}
                variant="outline"
                className="flex-1 apple-button-secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMerge}
                disabled={!mergeTargetId || isMerging}
                className="flex-1 apple-button-primary"
              >
                {isMerging ? 'Merging...' : 'Merge Clients'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="apple-card p-4 bg-[var(--eai-surface)] mt-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md" id="search-clients">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Fuzzy search by name, email, or city..."
              className="apple-input w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-3 py-1.5 h-10" id="type-filter">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ApplicantType | 'ALL')}
                className="bg-transparent text-label outline-none cursor-pointer text-[var(--eai-text)]"
              >
                <option value="ALL">All Types</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="COMPANY">Company</option>
                <option value="PARTNERSHIP">Partnership</option>
              </select>
            </div>
            
            <div className="flex items-center gap-1 border border-[var(--eai-border)] bg-[var(--eai-bg)]/30 rounded-xl h-10 overflow-hidden" id="view-toggle">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[var(--eai-primary)] text-white' : 'text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]'}`}
                title="Grid View"
              >
                <SquaresFour size={20} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-[var(--eai-primary)] text-white' : 'text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]'}`}
                title="Table View"
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8" id="clients-grid">
        {loading ? (
          <div className="w-full animate-pulse">
            {/* Filters Skeleton */}
            <div className="apple-card p-4 bg-[var(--eai-surface)] mb-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="h-10 w-full max-w-md bg-[var(--eai-border)]/50 rounded-xl" />
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-10 w-32 bg-[var(--eai-border)]/50 rounded-xl" />
                  <div className="h-10 w-20 bg-[var(--eai-border)]/50 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="apple-card p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-[var(--eai-border)]/40 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-[var(--eai-border)]/50 rounded" />
                      <div className="h-4 w-20 bg-[var(--eai-border)]/30 rounded" />
                    </div>
                  </div>
                  <div className="mt-6 space-y-2 border-t border-[var(--eai-border)] pt-4">
                    <div className="h-4 w-full bg-[var(--eai-border)]/30 rounded" />
                    <div className="h-4 w-3/4 bg-[var(--eai-border)]/30 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (clients || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center apple-card">
            <div className="p-6 rounded-full bg-[var(--eai-bg)] mb-6">
              <Building size={48} weight="duotone" className="text-[var(--eai-text-secondary)] opacity-20" />
            </div>
            <div className="text-h2 text-[var(--eai-text)]">No clients found</div>
            <p className="text-body text-[var(--eai-text-secondary)] mt-2 max-w-xs mx-auto">
              {searchQuery ? 'Try broadening your fuzzy search or changing filters.' : 'Start your practice by adding your first client.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {clients.map((client) => {
              const Icon = CLIENT_TYPE_ICONS[client.type] || Building;
              const isSelected = selectedIds.has(client.id);
              return (
                <Card
                  key={client.id}
                  className={`apple-card group p-5 cursor-pointer border-2 transition-all duration-300 relative overflow-hidden ${isSelected ? 'border-[var(--eai-primary)] bg-[var(--eai-primary)]/5' : 'border-transparent bg-[var(--eai-surface)] hover:bg-[var(--eai-bg)]/50'}`}
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(client.id);
                    }}
                    className={`absolute top-3 right-3 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    {isSelected ? (
                      <CheckSquare size={20} weight="fill" className="text-[var(--eai-primary)]" />
                    ) : (
                      <Square size={20} className="text-[var(--eai-text-secondary)]" />
                    )}
                  </button>

                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 shadow-sm ${isSelected ? 'bg-[var(--eai-primary)] text-white scale-110' : 'bg-[var(--eai-bg)] text-[var(--eai-primary)] group-hover:scale-110'}`}>
                      <Icon size={24} weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-h3 truncate group-hover:text-[var(--eai-primary)] transition-colors">
                        {client.name}
                      </h3>
                      <span className="text-micro px-2 py-0.5 mt-2 inline-block bg-[var(--eai-primary)]/10 text-[var(--eai-primary)] rounded-full font-bold uppercase">
                        {CLIENT_TYPE_LABELS[client.type]}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2.5 border-t border-[var(--eai-border)] pt-4">
                    {client.email && (
                      <div className="flex items-center gap-2 text-label text-[var(--eai-text-secondary)]">
                        <Envelope size={14} weight="bold" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {(client.city || client.nationality) && (
                      <div className="flex items-center gap-2 text-label text-[var(--eai-text-secondary)]">
                        <MapPin size={14} weight="bold" />
                        <span className="truncate">
                          {[client.city, client.nationality].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="apple-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[var(--eai-bg)]/30 border-b border-[var(--eai-border)]">
                  <tr>
                    <th className="px-6 py-4 w-10">
                      <button onClick={toggleSelectAll}>
                        {selectedIds.size === (clients || []).length && (clients || []).length > 0 ? (
                          <CheckSquare size={20} weight="fill" className="text-[var(--eai-primary)]" />
                        ) : (
                          <Square size={20} className="text-[var(--eai-text-secondary)]" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-label">Client</th>
                    <th className="px-6 py-4 text-label">Type</th>
                    <th className="px-6 py-4 text-label">Email</th>
                    <th className="px-6 py-4 text-label">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--eai-border)]">
                  {clients.map((client) => {
                    const Icon = CLIENT_TYPE_ICONS[client.type] || Building;
                    const isSelected = selectedIds.has(client.id);
                    return (
                      <tr
                        key={client.id}
                        className={`group cursor-pointer transition-colors ${isSelected ? 'bg-[var(--eai-primary)]/5' : 'hover:bg-[var(--eai-bg)]/40'}`}
                        onClick={() => navigate(`/clients/${client.id}`)}
                      >
                        <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelect(client.id)}>
                            {isSelected ? (
                              <CheckSquare size={20} weight="fill" className="text-[var(--eai-primary)]" />
                            ) : (
                              <Square size={20} className="text-[var(--eai-text-secondary)]" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors shadow-sm ${isSelected ? 'bg-[var(--eai-primary)] text-white' : 'bg-[var(--eai-bg)] text-[var(--eai-text-secondary)] group-hover:bg-white group-hover:text-[var(--eai-primary)]'}`}>
                              <Icon size={20} weight="duotone" />
                            </div>
                            <span className={`text-body font-bold transition-colors ${isSelected ? 'text-[var(--eai-primary)]' : 'text-[var(--eai-text)]'}`}>{client.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-micro px-2 py-0.5 bg-[var(--eai-primary)]/10 text-[var(--eai-primary)] rounded-full font-bold uppercase">
                            {CLIENT_TYPE_LABELS[client.type]}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-label text-[var(--eai-text-secondary)]">
                          {client.email || '—'}
                        </td>
                        <td className="px-6 py-5 text-label text-[var(--eai-text-secondary)]">
                          {[client.city, client.nationality].filter(Boolean).join(', ') || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 px-2" id="pagination">
            <p className="text-label text-[var(--eai-text-secondary)]">
              Showing <span className="font-bold text-[var(--eai-text)]">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-[var(--eai-text)]">{Math.min(currentPage * pageSize, totalRecords)}</span> of <span className="font-bold text-[var(--eai-text)]">{totalRecords}</span> clients
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="apple-button-secondary h-9 w-9 p-0 rounded-xl"
              >
                <CaretLeft size={18} weight="bold" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 min-w-[36px] rounded-xl text-label ${currentPage === page ? 'apple-button-primary shadow-md' : 'apple-button-secondary'}`}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="apple-button-secondary h-9 w-9 p-0 rounded-xl"
              >
                <CaretRight size={18} weight="bold" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

