import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clientService } from '@/utils/api';
import { useToast } from '@/components/ui/toast';
import type { ApplicantType } from '@/shared/database';

export default function NewClientPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'INDIVIDUAL' as ApplicantType,
    nationality: '',
    email: '',
    addressStreet: '',
    city: '',
    zipCode: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      addToast({
        title: 'Validation Error',
        description: 'Client name is required',
        type: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      const newClient = await clientService.createClient(formData);
      addToast({
        title: 'Client Created',
        description: `${newClient.name} has been created successfully`,
        type: 'success'
      });
      navigate(`/clients/${newClient.id}`);
    } catch (error: unknown) {
      console.error('Failed to create client:', error);
      const err = error as { response?: { data?: { error?: string } } };
      addToast({
        title: 'Failed to create client',
        description: err?.response?.data?.error || 'Please try again',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/clients')}
          className="p-2"
        >
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-[24px] font-bold tracking-tight text-[var(--eai-text)]">
          New Client
        </h1>
      </header>

      <form onSubmit={handleSubmit}>
        <Card className="apple-card">
          <CardHeader>
            <CardTitle className="text-[18px] font-bold tracking-tight">Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[var(--eai-text)]">Client Name <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter full legal name"
                  className="apple-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[var(--eai-text)]">Client Type</Label>
                <div className="flex gap-2">
                  {(['INDIVIDUAL', 'COMPANY', 'PARTNERSHIP'] as ApplicantType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleChange('type', type)}
                      className={`flex-1 py-2 px-3 text-[13px] font-bold border rounded-none transition-all ${
                        formData.type === type
                          ? 'bg-[var(--eai-primary)] text-white border-[var(--eai-primary)]'
                          : 'bg-[var(--eai-bg)] text-[var(--eai-text)] border-[var(--eai-border)] hover:border-[var(--eai-primary)]'
                      }`}
                    >
                      {type === 'INDIVIDUAL' ? 'Individual' : type === 'COMPANY' ? 'Company' : 'Partnership'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[var(--eai-text)]">Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="client@example.com"
                  className="apple-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[var(--eai-text)]">Nationality</Label>
                <Input
                  value={formData.nationality}
                  onChange={(e) => handleChange('nationality', e.target.value)}
                  placeholder="e.g. Ethiopian"
                  className="apple-input"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-semibold text-[var(--eai-text)]">Address</Label>
                <div className="space-y-3">
                  <Input
                    value={formData.addressStreet}
                    onChange={(e) => handleChange('addressStreet', e.target.value)}
                    placeholder="Street Address"
                    className="apple-input"
                  />
                  <div className="flex gap-3">
                    <Input
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="City"
                      className="apple-input flex-1"
                    />
                    <Input
                      value={formData.zipCode}
                      onChange={(e) => handleChange('zipCode', e.target.value)}
                      placeholder="ZIP / Postal Code"
                      className="apple-input flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--eai-border)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/clients')}
                className="rounded-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="apple-button-primary flex items-center gap-2 rounded-none"
              >
                <Check size={18} />
                {saving ? 'Creating...' : 'Create Client'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
