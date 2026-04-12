import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { systemService, clientService, invoiceService } from '@/utils/api';
import { toast } from 'sonner';
import { Trash2, RotateCcw, XCircle, Info, Users, FileText, Receipt, Clock, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface TrashedItem {
  id: string;
  type: string;
  name: string;
  deleted_at?: string;
  status?: string;
  mark_name?: string;
  invoice_number?: string;
  client_name?: string;
}

export default function TrashPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trademarks');
  
  // Data states for each tab
  const [trademarks, setTrademarks] = useState<TrashedItem[]>([]);
  const [clients, setClients] = useState<TrashedItem[]>([]);
  const [invoices, setInvoices] = useState<TrashedItem[]>([]);
  
  const [loading, setLoading] = useState({
    trademarks: true,
    clients: true,
    invoices: true,
  });

  // Dialog state
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TrashedItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch trademark cases
  const loadTrademarks = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, trademarks: true }));
      const response = await systemService.getTrash();
      const cases = (response.items || [])
        .filter((item: any) => item.type === 'trademark_cases')
        .map((item: any) => ({
          ...item,
          name: item.mark_name || item.name || 'Unknown Case',
        }));
      setTrademarks(cases);
    } catch (error) {
      console.error('Failed to load trashed cases:', error);
    } finally {
      setLoading(prev => ({ ...prev, trademarks: false }));
    }
  }, []);

  // Fetch clients
  const loadClients = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, clients: true }));
      const response = await systemService.getTrash();
      const clientList = (response.items || [])
        .filter((item: any) => item.type === 'clients')
        .map((item: any) => ({
          ...item,
          name: item.name || 'Unknown Client',
        }));
      setClients(clientList);
    } catch (error) {
      console.error('Failed to load trashed clients:', error);
    } finally {
      setLoading(prev => ({ ...prev, clients: false }));
    }
  }, []);

  // Fetch invoices
  const loadInvoices = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, invoices: true }));
      const deletedInvoices = await invoiceService.listDeleted();
      const invoiceList = (deletedInvoices || []).map((item: any) => ({
        ...item,
        id: item.id,
        type: 'invoices',
        name: item.invoice_number || `Invoice ${item.id.slice(0, 8)}`,
        client_name: item.client_name,
        mark_name: item.mark_name,
        deleted_at: item.deleted_at,
        status: item.status,
      }));
      setInvoices(invoiceList);
    } catch (error) {
      console.error('Failed to load trashed invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(prev => ({ ...prev, invoices: false }));
    }
  }, []);

  // Load data on mount and tab change
  useEffect(() => {
    loadTrademarks();
    loadClients();
    loadInvoices();
  }, [loadTrademarks, loadClients, loadInvoices]);

  const handleRestoreClick = (item: TrashedItem) => {
    setSelectedItem(item);
    setShowRestoreDialog(true);
  };

  const handlePurgeClick = (item: TrashedItem) => {
    setSelectedItem(item);
    setShowPurgeDialog(true);
  };

  const handleViewDetails = (item: TrashedItem) => {
    if (item.type === 'trademark_cases') {
      navigate(`/trademarks/${item.id}?fromTrash=true`);
    } else if (item.type === 'clients') {
      navigate(`/clients/${item.id}?fromTrash=true`);
    } else if (item.type === 'invoices') {
      navigate(`/billing/${item.id}?fromTrash=true`);
    }
  };

  const handleRestore = async () => {
    if (!selectedItem) return;
    
    setIsProcessing(true);
    try {
      await systemService.restoreFromTrash(selectedItem.type, selectedItem.id);
      toast.success('Item has been restored successfully.');
      setShowRestoreDialog(false);
      
      // Refresh the appropriate tab
      if (selectedItem.type === 'trademark_cases') loadTrademarks();
      else if (selectedItem.type === 'clients') loadClients();
      else if (selectedItem.type === 'invoices') loadInvoices();
    } catch (error) {
      console.error('Failed to restore:', error);
      toast.error('Failed to restore item');
    } finally {
      setIsProcessing(false);
      setSelectedItem(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedItem) return;

    setIsProcessing(true);
    try {
      await systemService.purgeFromTrash(selectedItem.type, selectedItem.id);
      toast.success('Item permanently deleted');
      setShowPurgeDialog(false);
      
      // Refresh the appropriate tab
      if (selectedItem.type === 'trademark_cases') loadTrademarks();
      else if (selectedItem.type === 'clients') loadClients();
      else if (selectedItem.type === 'invoices') loadInvoices();
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to purge item');
    } finally {
      setIsProcessing(false);
      setSelectedItem(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getItemName = (item: TrashedItem) => {
    if (item.type === 'invoices') {
      return item.invoice_number || item.name;
    }
    if (item.type === 'clients') {
      return item.name;
    }
    return item.mark_name || item.name || 'Unknown';
  };

  const renderEmptyState = (message: string) => (
    <Card className="flex flex-col items-center justify-center py-16 text-center">
      <Trash2 size={48} className="text-muted-foreground opacity-20 mb-4" />
      <h3 className="text-lg font-bold text-muted-foreground">No items</h3>
      <p className="text-muted-foreground text-sm">{message}</p>
    </Card>
  );

  const renderItemRow = (item: TrashedItem) => (
    <tr key={`${item.type}-${item.id}`} className="hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3 cursor-pointer" onClick={() => handleViewDetails(item)}>
        <div className="font-medium hover:underline flex items-center gap-1">
          {getItemName(item)}
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </div>
        {item.client_name && (
          <div className="text-xs text-muted-foreground">Client: {item.client_name}</div>
        )}
        {item.mark_name && item.type !== 'trademark_cases' && (
          <div className="text-xs text-muted-foreground">Trademark: {item.mark_name}</div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {formatDate(item.deleted_at)}
      </td>
      {item.status && (
        <td className="px-4 py-3">
          <Badge variant="outline" className="uppercase text-[10px]">
            {item.status}
          </Badge>
        </td>
      )}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => handleRestoreClick(item)}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Restore
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-destructive hover:bg-destructive/10"
            onClick={() => handlePurgeClick(item)}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Purge
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="w-full p-4 md:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Trash2 className="h-8 w-8 text-muted-foreground" />
            Trash
          </h1>
          <p className="text-muted-foreground">Deleted items can be restored or permanently removed.</p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="trademarks" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Trademarks</span>
            {loading.trademarks ? (
              <Skeleton className="h-5 w-5 rounded-full" />
            ) : (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {trademarks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clients</span>
            {loading.clients ? (
              <Skeleton className="h-5 w-5 rounded-full" />
            ) : (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {clients.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Invoices</span>
            {loading.invoices ? (
              <Skeleton className="h-5 w-5 rounded-full" />
            ) : (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {invoices.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="deadlines" disabled className="flex items-center gap-2 opacity-50">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Deadlines</span>
            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-xs">N/A</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Trademarks Tab */}
        <TabsContent value="trademarks" className="space-y-4">
          {loading.trademarks ? (
            <Card className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </Card>
          ) : trademarks.length === 0 ? (
            renderEmptyState('No deleted trademark cases.')
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold">Trademark Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Deleted At</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {trademarks.map(renderItemRow)}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          {loading.clients ? (
            <Card className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </Card>
          ) : clients.length === 0 ? (
            renderEmptyState('No deleted clients.')
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold">Client Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Deleted At</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clients.map(renderItemRow)}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {loading.invoices ? (
            <Card className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </Card>
          ) : invoices.length === 0 ? (
            renderEmptyState('No deleted invoices.')
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold">Invoice Number</th>
                    <th className="px-4 py-3 text-left font-semibold">Client</th>
                    <th className="px-4 py-3 text-left font-semibold">Trademark</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Deleted At</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((item) => (
                    <tr key={`invoices-${item.id}`} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 cursor-pointer" onClick={() => handleViewDetails(item)}>
                        <div className="font-medium font-mono hover:underline flex items-center gap-1">
                          {item.invoice_number || item.name}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.client_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.mark_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="uppercase text-[10px]">
                          {item.status || 'UNKNOWN'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(item.deleted_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleRestoreClick(item)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-destructive hover:bg-destructive/10"
                            onClick={() => handlePurgeClick(item)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Purge
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        {/* Deadlines Tab (Placeholder) */}
        <TabsContent value="deadlines" className="space-y-4">
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <Clock size={48} className="text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground">Not Available</h3>
            <p className="text-muted-foreground text-sm">Deadlines trash management is not implemented yet.</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore "{selectedItem?.name}" and make it visible again in its original location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isProcessing ? 'Restoring...' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purge Confirmation Dialog */}
      <AlertDialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Permanently Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{selectedItem?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} disabled={isProcessing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isProcessing ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-muted/30 border rounded-lg p-4 text-xs text-muted-foreground flex gap-3 items-start">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <ul className="space-y-1 list-disc list-inside">
          <li>Items in trash are not visible in main lists but their data is preserved.</li>
          <li>Click on any item name to view its full details page.</li>
          <li>Restoring an item makes it visible again in its original location.</li>
          <li>Purging an item permanently deletes it from the database. This cannot be undone.</li>
        </ul>
      </div>
    </div>
  );
}
