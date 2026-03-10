import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, FileText, Pencil, Check, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clientService } from '@/utils/api';
import { usePageTitleStore } from '@/store/pageTitleStore';
import { useToast } from '@/components/ui/toast';
import { CountrySelector } from '@/components/CountrySelector';

import StatusPill from '@/components/StatusPill';
import JurisdictionBadge from '@/components/JurisdictionBadge';
import type { ApplicantType, TrademarkStatus, Jurisdiction } from '@/shared/database';

interface AssociatedTrademark {
  id: string;
  mark_name: string;
  status: string;
  jurisdiction: string;
  filing_number: string | null;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  local_name?: string;
  type: ApplicantType;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  nationality: string;
  email: string;
  address_street: string;
  address_zone?: string;
  wereda?: string;
  city: string;
  state_name?: string;
  city_code?: string;
  state_code?: string;
  house_no?: string;
  zip_code: string;
  po_box?: string;
  telephone?: string;
  fax?: string;
  residence_country?: string;
  created_at: string;
  trademarks?: AssociatedTrademark[];
}

const CLIENT_TYPE_LABELS: Record<ApplicantType, string> = {
  INDIVIDUAL: 'Individual',
  COMPANY: 'Company',
  PARTNERSHIP: 'Partnership'
};

export default function ClientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const setOverrideTitle = usePageTitleStore((state) => state.setOverrideTitle);
  const clearOverride = usePageTitleStore((state) => state.clearOverride);

  useEffect(() => {
    if (id) {
      fetchClient(id);
    }
    return () => clearOverride();
  }, [id]);

  const fetchClient = async (clientId: string) => {
    try {
      const data = await clientService.getClient(clientId);
      setClient(data);
      setFormData(data);
      setOverrideTitle(data.name);
    } catch (error) {
      console.error('Failed to fetch client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || !formData) return;
    
    setSaving(true);
    try {
      await clientService.updateClient(id, formData);
      setClient({ ...client!, ...formData as Client });
      setIsEditing(false);
      addToast({
        title: 'Success',
        description: 'Client updated successfully',
        type: 'success'
      });
    } catch (error: unknown) {
      console.error('Failed to update client:', error);
      const err = error as { response?: { data?: { error?: string } } };
      addToast({
        title: 'Failed to update client',
        description: err?.response?.data?.error || 'Please try again',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Client, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--eai-primary)] border-t-transparent" />
        <div className="text-[15px] font-bold text-[var(--eai-text-secondary)] mt-3">Loading client...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-[18px] font-bold text-[var(--eai-text)] tracking-tight">Client not found</div>
        <Button onClick={() => navigate('/clients')} className="mt-4">
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <header className="flex items-end justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/clients')}
            className="p-2 rounded-xl hover:bg-[var(--eai-bg)] text-[var(--eai-text-secondary)] transition-colors"
          >
            <ArrowLeft size={24} weight="bold" />
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 text-[var(--eai-text)] leading-none">
              {isEditing ? 'Edit Client' : client.name}
            </h1>
            {!isEditing && (
              <div className="mt-1">
                <span className="text-micro px-2 py-0.5 border border-[var(--eai-border)] bg-[var(--eai-primary)] text-white rounded-none">
                  {CLIENT_TYPE_LABELS[client.type]}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setFormData(client);
              }}
              className="flex items-center gap-2"
            >
              <X size={18} weight="bold" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="apple-button-primary flex items-center gap-2"
            >
              <Check size={18} weight="bold" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setIsEditing(true)}
            className="apple-button-primary flex items-center gap-2"
          >
            <Pencil size={18} weight="bold" />
            Edit Client
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="apple-card border-none shadow-lg overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--eai-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30">
            <CardTitle className="text-h3 text-[var(--eai-text)] flex items-center gap-2">
              <User size={20} className="text-[var(--eai-primary)]" weight="duotone" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="space-y-4">
              <h4 className="text-label text-[var(--eai-text-secondary)] tracking-wider text-[11px] font-bold">Identity</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Client name</Label>
                  {isEditing ? (
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-bold text-[var(--eai-text)]">{client.name}</div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Local name (Amharic)</Label>
                  {isEditing ? (
                    <Input
                      value={formData.local_name || ''}
                      onChange={(e) => handleChange('local_name', e.target.value)}
                      placeholder="ምሳሌ ድርጅት"
                      className="apple-input font-amharic"
                    />
                  ) : (
                    <div className="text-body font-bold text-[var(--eai-text)]">
                      {client.local_name || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Client type</Label>
                  {isEditing ? (
                    <div className="apple-input-container">
                      <select
                        value={formData.type || ''}
                        onChange={(e) => handleChange('type', e.target.value as ApplicantType)}
                        className="w-full h-11 bg-transparent text-body outline-none appearance-none cursor-pointer"
                      >
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="COMPANY">Company</option>
                        <option value="PARTNERSHIP">Partnership</option>
                      </select>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="text-micro px-2 py-0.5 border border-[var(--eai-border)] bg-[var(--eai-primary)] text-white rounded-none">
                        {CLIENT_TYPE_LABELS[client.type]}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Gender</Label>
                  {isEditing ? (
                    <div className="apple-input-container">
                      <select
                        value={formData.gender || ''}
                        onChange={(e) => handleChange('gender', e.target.value)}
                        className="w-full h-11 bg-transparent text-body outline-none appearance-none cursor-pointer"
                      >
                        <option value="">Not Specified</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  ) : (
                    <div className="text-body font-bold text-[var(--eai-text)]">
                      {client.gender || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
              <h4 className="text-label text-[var(--eai-text-secondary)] tracking-wider text-[11px] font-bold">Contact & Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Email</Label>
                  {isEditing ? (
                    <Input
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.email || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Nationality</Label>
                  {isEditing ? (
                    <CountrySelector
                      value={formData.nationality || ''}
                      onChange={(val) => handleChange('nationality', val)}
                      placeholder="Select nationality"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.nationality || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Country of residence</Label>
                  {isEditing ? (
                    <CountrySelector
                      value={formData.residence_country || ''}
                      onChange={(val) => handleChange('residence_country', val)}
                      placeholder="Select country"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.residence_country || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Telephone</Label>
                  {isEditing ? (
                    <Input
                      value={formData.telephone || ''}
                      onChange={(e) => handleChange('telephone', e.target.value)}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.telephone || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Fax</Label>
                  {isEditing ? (
                    <Input
                      value={formData.fax || ''}
                      onChange={(e) => handleChange('fax', e.target.value)}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.fax || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Street address</Label>
                  {isEditing ? (
                    <Input
                      value={formData.address_street || ''}
                      onChange={(e) => handleChange('address_street', e.target.value)}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.address_street || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Zone / Subcity</Label>
                  {isEditing ? (
                    <Input
                      value={formData.address_zone || ''}
                      onChange={(e) => handleChange('address_zone', e.target.value)}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.address_zone || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Wereda</Label>
                  {isEditing ? (
                    <Input
                      value={formData.wereda || ''}
                      onChange={(e) => handleChange('wereda', e.target.value)}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.wereda || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">City</Label>
                  {isEditing ? (
                    <Input
                      value={formData.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="City"
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.city || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">City Code</Label>
                  {isEditing ? (
                    <Input
                      value={formData.city_code || ''}
                      onChange={(e) => handleChange('city_code', e.target.value)}
                      placeholder="City Code"
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.city_code || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">State / Region</Label>
                  {isEditing ? (
                    <Input
                      value={formData.state_name || ''}
                      onChange={(e) => handleChange('state_name', e.target.value)}
                      placeholder="State / Region"
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.state_name || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">State Code</Label>
                  {isEditing ? (
                    <Input
                      value={formData.state_code || ''}
                      onChange={(e) => handleChange('state_code', e.target.value)}
                      placeholder="State Code"
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.state_code || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">House no.</Label>
                  {isEditing ? (
                    <Input
                      value={formData.house_no || ''}
                      onChange={(e) => handleChange('house_no', e.target.value)}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.house_no || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">ZIP / Postal code</Label>
                  {isEditing ? (
                    <Input
                      value={formData.zip_code || ''}
                      onChange={(e) => handleChange('zip_code', e.target.value)}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.zip_code || '—'}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">P.O. Box</Label>
                  {isEditing ? (
                    <Input
                      value={formData.po_box || ''}
                      onChange={(e) => handleChange('po_box', e.target.value)}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{client.po_box || '—'}</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="apple-card border-none shadow-lg overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--eai-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30">
            <CardTitle className="text-h3 text-[var(--eai-text)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-[var(--eai-primary)]" weight="duotone" />
                Associated Trademarks
              </div>
              {client.trademarks && client.trademarks.length > 0 && (
                <span className="text-micro bg-[var(--eai-primary)] text-white px-2 py-0.5 rounded-full">
                  {client.trademarks.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!client.trademarks || client.trademarks.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 bg-[var(--eai-bg)] flex items-center justify-center rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FileText size={32} className="text-[var(--eai-text-secondary)] opacity-50" weight="duotone" />
                </div>
                <p className="text-body text-[var(--eai-text-secondary)] font-medium">
                  No trademarks associated with this client.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--eai-border)]">
                {client.trademarks.map((tm) => (
                  <div
                    key={tm.id}
                    onClick={() => navigate(`/trademarks/${tm.id}`)}
                    className="p-4 hover:bg-[var(--eai-bg)]/50 cursor-pointer transition-colors flex items-center justify-between group/item"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 bg-[var(--eai-bg)] rounded-xl flex items-center justify-center text-[var(--eai-text-secondary)] group-hover/item:text-[var(--eai-primary)] transition-colors shadow-sm shrink-0">
                        <FileText size={20} weight="duotone" />
                      </div>
                      <div className="min-w-0 max-w-[300px]">
                        <div className="text-body font-bold text-[var(--eai-text)] line-clamp-2">{tm.mark_name}</div>
                        <div className="text-micro text-[var(--eai-text-secondary)]">
                          {tm.filing_number || 'No Filing #'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <JurisdictionBadge jurisdiction={(tm.jurisdiction || 'ET') as Jurisdiction} />
                      <StatusPill status={tm.status as TrademarkStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
