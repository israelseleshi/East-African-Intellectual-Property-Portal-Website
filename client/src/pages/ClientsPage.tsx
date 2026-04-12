import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';
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
  ArrowsMerge,
  CaretUp,
  CaretDown,
  MagnifyingGlass
} from '@phosphor-icons/react';
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
  const [searchParams] = useSearchParams();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [selectedType, setSelectedType] = useState<ApplicantType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
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

  const handleExportExcel = async () => {
    if ((clients || []).length === 0) return;
    
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Clients')

    worksheet.columns = [
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
      { header: 'Created Date', key: 'createdAt', width: 15 }
    ]

    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    
    // Group 1: Identity (Blue)
    for (let i = 1; i <= 4; i++) {
      headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    }
    // Group 2: Contact (Green)
    for (let i = 5; i <= 6; i++) {
      headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
    }
    // Group 3: Address (Orange)
    for (let i = 7; i <= 11; i++) {
      headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }
    }
    // Group 4: System (Gray)
    headerRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } }

    clients.forEach(c => {
      worksheet.addRow({
        name: c.name,
        localName: (c as any).local_name || '',
        type: c.type,
        gender: (c as any).gender || 'N/A',
        email: c.email || '—',
        telephone: (c as any).telephone || '—',
        nationality: c.nationality || '—',
        city: c.city || '—',
        street: c.address_street || '—',
        zone: `${(c as any).address_zone || ''} ${(c as any).wereda || ''}`.trim() || '—',
        poBox: (c as any).po_box || '—',
        createdAt: new Date(c.created_at).toLocaleDateString()
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `clients_export_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Excel file has been downloaded.');
  };

  if (loading) {
    return (
      <div className="w-full space-y-8 bg-[#E8E8ED] text-foreground min-h-screen">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-8 pt-4 md:pt-8">
          <div className="space-y-2">
            <Typography.h1a data-tour="page-title">Clients</Typography.h1a>
            <Typography.muted>Manage and organize your client database across jurisdictions.</Typography.muted>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mr-2">
                {selectedIds.size === 2 && (
                  <Button
                    onClick={() => setShowMergeDialog(true)}
                    disabled={isMerging}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <ArrowsMerge size={16} />
                    <span>Merge</span>
                  </Button>
                )}
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                <Trash size={16} />
                <span>Delete {selectedIds.size}</span>
              </Button>
            </div>
          )}
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="flex items-center gap-2 bg-white"
          >
            <FileArrowDown size={16} />
            <span>Export Excel</span>
          </Button>
            <Button
              onClick={() => navigate('/clients/new')}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={16} weight="bold" />
              <span>New Client</span>
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 bg-[#E8E8ED] text-foreground min-h-screen">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-8 pt-4 md:pt-8">
        <div className="space-y-2">
          <Typography.h1a data-tour="page-title">Clients</Typography.h1a>
          <Typography.muted>Manage and organize your client database across jurisdictions.</Typography.muted>
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
                  className="flex items-center gap-2"
                >
                  <ArrowsMerge size={16} />
                  <span>Merge</span>
                </Button>
              )}
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash size={16} />
                <span>Delete {selectedIds.size}</span>
              </Button>
            </div>
          )}
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="flex items-center gap-2 bg-white"
          >
            <FileArrowDown size={16} />
            <span>Export Excel</span>
          </Button>
          <Button
            onClick={() => navigate('/clients/new')}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            data-tour="new-client-btn"
          >
            <Plus size={16} weight="bold" />
            <span>New Client</span>
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
                      {mergeTargetId === client.id ? <CheckSquare size={20} weight="fill" /> : <Square size={20} />}
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

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm mx-4 md:mx-8">
        <div className="relative flex-1 max-w-md group">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients..."
            className="pl-10 bg-white border-muted hover:border-border transition-colors"
            data-tour="search-input"
          />
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedType} onValueChange={(val) => setSelectedType(val as any)}>
            <SelectTrigger className="w-[160px] bg-white" data-tour="filter-type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="COMPANY">Company</SelectItem>
              <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border" data-tour="view-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/50'}`}
              title="Grid View"
            >
              <SquaresFour size={18} weight={viewMode === 'grid' ? 'fill' : 'regular'} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/50'}`}
              title="Table View"
            >
              <List size={18} weight={viewMode === 'table' ? 'fill' : 'regular'} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 mx-4 md:mx-8 pb-8">
        {(clients || []).length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-24 text-center border-dashed">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Building size={48} weight="duotone" className="text-muted-foreground opacity-50" />
            </div>
            <Typography.h3a className="mb-2">No clients found</Typography.h3a>
              <Typography.muted className="max-w-sm mx-auto">
                {searchQuery ? "We couldn't find any clients matching your search or filters." : 'Add your first client to start managing their intellectual property portfolio.'}
              </Typography.muted>
            {!searchQuery && (
              <Button onClick={() => navigate('/clients/new')} className="mt-6">
                <Plus className="mr-2" size={16} /> Add Client
              </Button>
            )}
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sortedClients.map((client) => {
              const Icon = CLIENT_TYPE_ICONS[client.type] || Building;
              const isSelected = selectedIds.has(client.id);
              return (
                <Card
                  key={client.id}
                  className={`group relative flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 overflow-hidden ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border bg-card'}`}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  data-tour="client-card"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(client.id);
                    }}
                    className={`absolute top-3 right-3 z-10 p-1 rounded-md bg-white/80 backdrop-blur-sm transition-opacity ${isSelected ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground'}`}
                  >
                    {isSelected ? <CheckSquare size={22} weight="fill" /> : <Square size={22} />}
                  </button>

                  <CardContent className="flex-1 p-5 pt-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`p-3 rounded-xl transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary/20'}`}>
                        <Icon size={24} weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <Typography.h4a className="truncate group-hover:text-primary transition-colors">
                          {client.name}
                        </Typography.h4a>
                        <Badge variant="secondary" className="mt-1 text-xs font-medium">
                          {CLIENT_TYPE_LABELS[client.type]}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3 mt-auto pt-4 border-t border-border/50">
                      {client.email && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Envelope size={16} className="shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <MapPin size={16} className="shrink-0" />
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
          <Card className="overflow-hidden border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 w-12">
                      <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                        {selectedIds.size === (clients || []).length && (clients || []).length > 0 ? (
                          <CheckSquare size={18} weight="fill" className="text-primary" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-primary transition-colors">
                        Client {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />)}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      <button onClick={() => handleSort('type')} className="flex items-center gap-1 hover:text-primary transition-colors">
                        Type {sortConfig?.key === 'type' && (sortConfig.direction === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />)}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      <button onClick={() => handleSort('email')} className="flex items-center gap-1 hover:text-primary transition-colors">
                        Email {sortConfig?.key === 'email' && (sortConfig.direction === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />)}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      <button onClick={() => handleSort('location')} className="flex items-center gap-1 hover:text-primary transition-colors">
                        Location {sortConfig?.key === 'location' && (sortConfig.direction === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />)}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedClients.map((client) => {
                    const Icon = CLIENT_TYPE_ICONS[client.type] || Building;
                    const isSelected = selectedIds.has(client.id);
                    return (
                      <tr
                        key={client.id}
                        className={`group cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : 'bg-white'}`}
                        onClick={() => navigate(`/clients/${client.id}`)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelect(client.id)} className="text-muted-foreground hover:text-foreground">
                            {isSelected ? <CheckSquare size={18} weight="fill" className="text-primary" /> : <Square size={18} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              <Icon size={16} weight="duotone" />
                            </div>
                            <span className="font-medium">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-normal bg-white">
                            {CLIENT_TYPE_LABELS[client.type]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {client.email || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
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
          <div className="flex items-center justify-between mt-6 px-1">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, totalRecords)}</span> of <span className="font-medium text-foreground">{totalRecords}</span> clients
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8"
              >
                <CaretLeft size={16} />
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 w-8 p-0 ${currentPage === page ? '' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8"
              >
                <CaretRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
