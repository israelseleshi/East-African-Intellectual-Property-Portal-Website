import { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Plus, Building, User, Mail as Envelope, MapPin, LayoutGrid as SquaresFour, List, Trash2 as Trash, FileDown as FileArrowDown, CheckSquare, Square, ChevronLeft as CaretLeft, ChevronRight as CaretRight, GitMerge as ArrowsMerge, ChevronUp as CaretUp, ChevronDown as CaretDown, Search as MagnifyingGlass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { clientService } from '@/utils/api';
import type { ApplicantType } from '@/shared/database';
import { useDebounce } from '@/hooks/use-debounce';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import HelpButton from '@/components/HelpButton';
import { Typography } from '@/components/ui/typography';
import { useExcelExport } from '@/hooks/useExcelExport';
import ExportProgressModal from '@/components/ExportProgressModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [selectedType, setSelectedType] = useState<ApplicantType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Transition state for non-blocking updates
  const [isFiltering, startFilterTransition] = useTransition();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = viewMode === 'grid' ? 8 : 6;

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Client | 'location';
    direction: 'asc' | 'desc';
  } | null>(null);

  // Bulk operations state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const currentPageSize = viewMode === 'grid' ? 8 : 6;
      const result = await clientService.getClients({
        q: debouncedSearch,
        type: selectedType === 'ALL' ? undefined : selectedType,
        page: currentPage,
        limit: currentPageSize
      });
      const clientsData = result?.data || [];
      const metaData = result?.meta || { total: 0, totalPages: 1 };
      setClients(clientsData);
      setTotalPages(metaData.totalPages || 1);
      setTotalRecords(metaData.total || 0);
    } catch (error: unknown) {
      console.error('Failed to fetch clients:', error);
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
    if (selectedIds.size === (clients || []).length && clients.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set((clients || []).map(c => c.id)));
    }
  };

  const handleSort = (key: keyof Client | 'location') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedClients = useMemo(() => {
    if (!sortConfig) return clients;

    return [...clients].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === 'location') {
        aValue = [a.city, a.nationality].filter(Boolean).join(', ');
        bValue = [b.city, b.nationality].filter(Boolean).join(', ');
      } else {
        aValue = a[sortConfig.key as keyof Client];
        bValue = b[sortConfig.key as keyof Client];
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clients, sortConfig]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      await clientService.bulkDelete(Array.from(selectedIds));
      toast.success(`${selectedIds.size} clients moved to trash.`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      fetchClients();
    } catch (error: unknown) {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete clients. Please try again.');
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

  const { isExporting, exportProgress, startExport } = useExcelExport()

  const handleExportExcel = async () => {
    const result = await clientService.getClients({
      q: debouncedSearch,
      type: selectedType === 'ALL' ? undefined : selectedType,
      page: 1,
      limit: 500,
    })
    const exportData = (result?.data || sortedClients) as Client[]

    if (exportData.length === 0) return

    startExport({
      sheetName: 'Clients',
      fileName: 'EAIP_Clients',
      columns: [
        { header: 'Client Name', key: 'name', width: 25 },
        { header: 'Local Name', key: 'localName', width: 25 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Gender', key: 'gender', width: 12 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Telephone', key: 'telephone', width: 20 },
        { header: 'Nationality', key: 'nationality', width: 15 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'Street Address', key: 'street', width: 30 },
        { header: 'Wereda/Zone', key: 'zone', width: 20 },
        { header: 'PO Box', key: 'poBox', width: 12 },
        { header: 'Created Date', key: 'createdAt', width: 15 },
      ],
      rows: exportData,
      mapRow: (c) => ({
        name: c.name,
        localName: (c as any).local_name || '',
        type: CLIENT_TYPE_LABELS[c.type] || c.type,
        gender: (c as any).gender || 'N/A',
        email: c.email || '—',
        telephone: (c as any).telephone || '—',
        nationality: c.nationality || '—',
        city: c.city || '—',
        street: c.address_street || '—',
        zone: `${(c as any).address_zone || ''} ${(c as any).wereda || ''}`.trim() || '—',
        poBox: (c as any).po_box || '—',
        createdAt: new Date(c.created_at).toLocaleDateString(),
      }),
      formatHeader: (ws) => {
        const worksheet = ws as Record<string, unknown>
        const bdr = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
        ;(worksheet as any).spliceRows(1, 0, [])
        ;(worksheet as any).mergeCells(1, 1, 1, 12)
        const titleCell = (worksheet as any).getCell(1, 1)
        titleCell.value = 'EAST AFRICAN INTELLECTUAL PROPERTY PORTAL — CLIENTS MASTER LIST'
        titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F497D' } }
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
        titleCell.border = { top: bdr, left: bdr, bottom: bdr, right: bdr }
        ;(worksheet as any).getRow(1).height = 35

        const headerRow = (worksheet as any).getRow(2)
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
        for (let i = 1; i <= 4; i++) headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
        for (let i = 5; i <= 6; i++) headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
        for (let i = 7; i <= 11; i++) headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }
        headerRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } }
        ;(worksheet as any).views = [{ state: 'frozen', ySplit: 2 }]
        ;(worksheet as any).autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: 12 } }
        ;(worksheet as any).dataValidations.add('G3:G5000', {
          type: 'list',
          formulae: ['"Austria, Belgium, China, Denmark, France, Germany, India, Indonesia, Italy, Kenya, Netherlands, Rwanda, Singapore, South Korea, Spain, Switzerland, Thailand, Turkey, UAE, UK, USA"'],
          allowBlank: true,
          showErrorMessage: true,
          errorTitle: 'Invalid Nationality',
          error: 'Please select a nationality from the dropdown list.',
        })
      },
    })
  };

  if (loading) {
    return (
      <div className="w-full p-4 md:p-10 space-y-8 bg-[#F8F9FA] text-foreground min-h-screen">
        <header className="flex items-center justify-between">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-48" />
        </header>
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Card className="border-none shadow-premium"><CardContent className="p-10"><Skeleton className="h-96 w-full rounded-2xl" /></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 bg-[#F8F9FA] text-foreground min-h-screen">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-10 pt-4 md:pt-10">
        <div className="space-y-2">
          <Typography.h1 className="tracking-tight font-bold">Client Portfolio</Typography.h1>
          <Typography.p className="text-muted-foreground text-lg font-medium opacity-80">Manage and organize your regional client database with ease.</Typography.p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <HelpButton pageId="clients" />
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mr-2">
              {selectedIds.size === 2 && (
                <Button
                  onClick={() => setShowMergeDialog(true)}
                  disabled={isMerging}
                  variant="secondary"
                  className="flex items-center gap-2 h-12 px-6 rounded-xl shadow-sm hover:shadow-md transition-all font-bold"
                >
                  <ArrowsMerge size={20} />
                  <span>Merge Records</span>
                </Button>
              )}
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                variant="destructive"
                className="flex items-center gap-2 h-12 px-6 rounded-xl shadow-sm hover:shadow-md transition-all font-bold"
              >
                <Trash size={20} />
                <span>Delete {selectedIds.size}</span>
              </Button>
            </div>
          )}
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="bg-white hover:shadow-md transition-all h-12 px-6 rounded-xl border-none shadow-sm font-semibold"
          >
            <FileArrowDown size={20} className="mr-2" />
            <span>Export Excel</span>
          </Button>
          <Button
            onClick={() => navigate('/clients/new')}
            className="h-12 px-6 rounded-xl shadow-sm hover:shadow-md transition-all font-bold"
            data-tour="new-client-btn"
          >
            <Plus size={20} className="mr-2" />
            <span>New Client Record</span>
          </Button>
        </div>
      </header>

      {showMergeDialog && (selectedClients || []).length === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="max-w-lg w-full shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl">Merge Clients</CardTitle>
              <p className="text-sm text-muted-foreground">
                Combine the following two clients. All trademark cases and invoices will be transferred to the target client.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {selectedClients.map((client) => (
                  <label 
                    key={client.id} 
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${mergeTargetId === client.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'}`}
                  >
                    <input
                      type="radio"
                      name="mergeTarget"
                      value={client.id}
                      checked={mergeTargetId === client.id}
                      onChange={(e) => setMergeTargetId(e.target.value as string)}
                      className="sr-only"
                    />
                    <div className={`p-2 rounded-lg ${mergeTargetId === client.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {mergeTargetId === client.id ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{client.name}</div>
                      <div className="text-sm text-muted-foreground">{client.email || 'No email provided'}</div>
                    </div>
                    <Badge variant={mergeTargetId === client.id ? "default" : "outline"}>
                      Target
                    </Badge>
                  </label>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-end gap-3 pt-2">
              <Button onClick={() => setShowMergeDialog(false)} variant="ghost">Cancel</Button>
              <Button onClick={handleMerge} disabled={!mergeTargetId || isMerging}>
                {isMerging ? 'Merging...' : 'Confirm Merge'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {selectedIds.size} client(s) to the trash. You can restore them later from the Trash page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/80 backdrop-blur-md p-6 rounded-2xl border-none shadow-premium mx-4 md:mx-10">
        <div className="relative flex-1 max-w-xl group">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
          <Input
            value={searchQuery}
            onChange={(e) => {
              const value = e.target.value
              startFilterTransition(() => {
                setSearchQuery(value)
              })
            }}
            placeholder="Search by client name, email or location..."
            className="pl-12 h-12 bg-[#F8F9FA] border-none rounded-xl focus-visible:ring-primary/20 transition-all text-base"
            data-tour="search-input"
          />
          {isFiltering && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedType} onValueChange={(val) => startFilterTransition(() => setSelectedType(val as any))}>
            <SelectTrigger className="w-[180px] h-12 bg-[#F8F9FA] border-none rounded-xl font-medium focus:ring-primary/20" data-tour="filter-type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-xl">
              <SelectItem value="ALL">All Client Types</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="COMPANY">Company</SelectItem>
              <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center bg-[#F8F9FA] p-1.5 rounded-xl border-none shadow-inner" data-tour="view-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-premium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="Grid View"
            >
              <SquaresFour size={22} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-premium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="Table View"
            >
              <List size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 mx-4 md:px-10 pb-12">
        {(clients || []).length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-32 text-center border-none shadow-premium rounded-3xl bg-white">
            <div className="p-6 rounded-full bg-primary/5 mb-6">
              <Building size={64} className="text-primary/40" />
            </div>
            <Typography.h3 className="mb-2 font-bold">No clients found</Typography.h3>
              <Typography.p className="max-w-md mx-auto text-muted-foreground text-lg">
                {searchQuery ? "We couldn't find any clients matching your search or filters." : 'Add your first client to start managing their intellectual property portfolio.'}
              </Typography.p>
            {!searchQuery && (
              <Button onClick={() => navigate('/clients/new')} className="mt-8 h-12 px-8 rounded-xl shadow-lg">
                <Plus className="mr-2" size={20} /> Add Client
              </Button>
            )}
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {sortedClients.map((client) => {
              const Icon = CLIENT_TYPE_ICONS[client.type] || Building;
              const isSelected = selectedIds.has(client.id);
              return (
                <Card
                  key={client.id}
                  className={`group relative flex flex-col cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 rounded-3xl overflow-hidden border-none ${isSelected ? 'ring-2 ring-primary bg-primary/5 shadow-xl' : 'bg-white shadow-premium'}`}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  data-tour="client-card"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(client.id);
                    }}
                    className={`absolute top-4 right-4 z-10 p-1.5 rounded-xl bg-white/90 backdrop-blur-sm transition-all shadow-sm ${isSelected ? 'opacity-100 text-primary scale-110' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:scale-110'}`}
                  >
                    {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                  </button>

                  <CardContent className="flex-1 p-8 pt-10">
                    <div className="flex flex-col items-center text-center mb-6">
                      <div className={`p-5 rounded-2xl transition-all duration-300 mb-4 ${isSelected ? 'bg-primary text-primary-foreground shadow-lg scale-110' : 'bg-[#F8F9FA] text-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:scale-110'}`}>
                        <Icon size={32} />
                      </div>
                      <Typography.h3 className="line-clamp-2 font-bold mb-2 group-hover:text-primary transition-colors h-14 flex items-center justify-center">
                        {client.name}
                      </Typography.h3>
                      <Badge variant="secondary" className="bg-[#F8F9FA] text-primary border-none font-bold tracking-wider uppercase text-[10px] px-3 py-1 rounded-full">
                        {CLIENT_TYPE_LABELS[client.type]}
                      </Badge>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-[#F8F9FA]">
                      {client.email && (
                        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          <div className="p-2 rounded-lg bg-[#F8F9FA]">
                            <Envelope size={18} className="text-primary/60" />
                          </div>
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="p-2 rounded-lg bg-[#F8F9FA]">
                          <MapPin size={18} className="text-primary/60" />
                        </div>
                        <span className="truncate">
                          {[client.city, client.nationality].filter(Boolean).join(', ') || 'No location provided'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="overflow-hidden border-none shadow-premium rounded-3xl bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[11px] uppercase tracking-widest bg-[#F8F9FA] text-muted-foreground font-bold border-none">
                  <tr>
                    <th className="px-8 py-5 w-16">
                      <button onClick={toggleSelectAll} className="hover:text-primary transition-colors">
                        {selectedIds.size === (clients || []).length && (clients || []).length > 0 ? (
                          <CheckSquare size={22} className="text-primary" />
                        ) : (
                          <Square size={22} />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-5">
                      <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-primary transition-colors">
                        Client Name {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />)}
                      </button>
                    </th>
                    <th className="px-6 py-5">
                      <button onClick={() => handleSort('type')} className="flex items-center gap-2 hover:text-primary transition-colors">
                        Category {sortConfig?.key === 'type' && (sortConfig.direction === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />)}
                      </button>
                    </th>
                    <th className="px-6 py-5">
                      <button onClick={() => handleSort('email')} className="flex items-center gap-2 hover:text-primary transition-colors">
                        Contact Email {sortConfig?.key === 'email' && (sortConfig.direction === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />)}
                      </button>
                    </th>
                    <th className="px-6 py-5">
                      <button onClick={() => handleSort('location')} className="flex items-center gap-2 hover:text-primary transition-colors">
                        Headquarters {sortConfig?.key === 'location' && (sortConfig.direction === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />)}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F8F9FA]">
                  {sortedClients.map((client) => {
                    const Icon = CLIENT_TYPE_ICONS[client.type] || Building;
                    const isSelected = selectedIds.has(client.id);
                    return (
                      <tr
                        key={client.id}
                        className={`group cursor-pointer transition-all hover:bg-[#F8F9FA] ${isSelected ? 'bg-primary/5' : 'bg-white'}`}
                        onClick={() => navigate(`/clients/${client.id}`)}
                      >
                        <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelect(client.id)} className="text-muted-foreground hover:text-primary transition-colors">
                            {isSelected ? <CheckSquare size={22} className="text-primary" /> : <Square size={22} />}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-[#F8F9FA] text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                              <Icon size={20} />
                            </div>
                            <span className="font-bold text-base text-[#1A1A1A] group-hover:text-primary transition-colors">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <Badge variant="outline" className="font-bold text-[10px] tracking-wider uppercase bg-[#F8F9FA] border-none px-3 py-1 rounded-full text-primary">
                            {CLIENT_TYPE_LABELS[client.type]}
                          </Badge>
                        </td>
                        <td className="px-6 py-5 font-medium text-[#4A4A4A]">
                          {client.email || '—'}
                        </td>
                        <td className="px-6 py-5 font-medium text-[#4A4A4A]">
                          {[client.city, client.nationality].filter(Boolean).join(', ') || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between mt-10 gap-6">
            <p className="text-sm font-semibold text-muted-foreground order-2 md:order-1">
              Showing <span className="text-foreground">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-foreground">{Math.min(currentPage * pageSize, totalRecords)}</span> of <span className="text-foreground">{totalRecords}</span> clients
            </p>
            <div className="flex items-center gap-2 order-1 md:order-2">
              <Button
                variant="ghost"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-11 px-4 rounded-xl hover:bg-white hover:shadow-premium transition-all font-bold disabled:opacity-30"
              >
                <CaretLeft size={20} className="mr-2" />
                Previous
              </Button>
              <div className="flex items-center gap-1.5 px-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'ghost'}
                    onClick={() => setCurrentPage(page)}
                    className={`h-11 w-11 p-0 rounded-xl font-bold transition-all ${currentPage === page ? 'shadow-lg shadow-primary/20 scale-110' : 'hover:bg-white hover:shadow-premium'}`}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-11 px-4 rounded-xl hover:bg-white hover:shadow-premium transition-all font-bold disabled:opacity-30"
              >
                Next
                <CaretRight size={20} className="ml-2" />
              </Button>
            </div>
          </div>
        )}
        <ExportProgressModal
          isExporting={isExporting}
          progress={exportProgress}
          message="Exporting Clients..."
          subtext="Generating your client report."
        />
      </div>
    </div>
  );
}
