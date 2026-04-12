import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Buildings, User, UsersThree, Info, Envelope, MapPin, Phone } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clientService } from '@/utils/api';
import { useToast } from '@/components/ui/toast';
import { CountrySelector } from '@/components/CountrySelector';
import type { ApplicantType } from '@/shared/database';
import { Separator } from '@/components/ui/separator';

interface Client {
  id: string;
  name: string;
  local_name?: string;
  type: ApplicantType;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  nationality: string;
  residence_country?: string;
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
  created_at: string;
}

export default function NewClientPage() {
  const navigate = useNavigate();
  const { toast: addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Client>({
    id: '',
    name: '',
    local_name: '',
    type: 'INDIVIDUAL' as ApplicantType,
    nationality: '',
    residence_country: '',
    email: '',
    address_street: '',
    address_zone: '',
    wereda: '',
    city: '',
    state_name: '',
    city_code: '',
    state_code: '',
    house_no: '',
    zip_code: '',
    po_box: '',
    telephone: '',
    fax: '',
    gender: null,
    created_at: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      addToast({
        title: 'Validation Error',
        description: 'Client name is required',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const newClient = await clientService.createClient(formData as unknown as Record<string, unknown>);
      addToast({
        title: 'Client Created',
        description: `${newClient.name} has been created successfully`,
        
      });
      navigate(`/clients/${newClient.id}`);
    } catch (error: unknown) {
      console.error('Failed to create client:', error);
      const err = error as { response?: { data?: { error?: string } } };
      addToast({
        title: 'Failed to create client',
        description: err?.response?.data?.error || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 bg-background text-foreground min-h-screen">
      <header className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/clients')}
          className="h-10 w-10 shrink-0 border-border hover:bg-muted"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Client</h1>
          <p className="text-muted-foreground text-sm mt-1">Add a new individual or company to your client database.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-border shadow-sm overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Info size={20} className="text-primary" />
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </div>
            <CardDescription>Enter the legal name and entity type for this client.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold">Client Type <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['INDIVIDUAL', 'COMPANY', 'PARTNERSHIP'] as ApplicantType[]).map((type) => {
                      const Icon = type === 'INDIVIDUAL' ? User : type === 'COMPANY' ? Buildings : UsersThree;
                      return (
                        <button
                          key={type}
                          type="button"
                          data-type={type}
                          onClick={() => handleChange('type', type)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            formData.type === type
                              ? 'border-[#0e3155] bg-[#0e3155]/5 text-[#0e3155] shadow-sm'
                              : 'border-border bg-background hover:bg-muted text-muted-foreground hover:border-[#0e3155]/30 hover:text-foreground'
                          }`}
                        >
                          <Icon size={20} weight={formData.type === type ? "duotone" : "regular"} />
                          <span className="text-xs font-semibold whitespace-nowrap">
                            {type === 'INDIVIDUAL' ? 'Individual' : type === 'COMPANY' ? 'Company' : 'Partnership'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">Client Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter full legal name"
                    className="h-11 bg-background"
                    disabled={saving}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="local_name" className="text-sm font-semibold">ሙሉ ስም (Amharic Name)</Label>
                  <Input
                    id="local_name"
                    value={formData.local_name}
                    onChange={(e) => handleChange('local_name', e.target.value)}
                    placeholder="ሙሉ ስም እዚህ ያስገቡ"
                    className="h-11 font-amharic bg-background"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-6">
                {formData.type === 'INDIVIDUAL' && (
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold">Gender</Label>
                    <div className="flex gap-3">
                      {(['MALE', 'FEMALE'] as const).map((gender) => (
                        <label
                          key={gender}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border cursor-pointer transition-all ${
                            formData.gender === gender
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <input
                            type="radio"
                            name="gender"
                            className="sr-only"
                            checked={formData.gender === gender}
                            onChange={() => handleChange('gender', gender)}
                          />
                          <span className="text-sm font-medium">{gender.charAt(0) + gender.slice(1).toLowerCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Nationality</Label>
                  <CountrySelector
                    value={formData.nationality}
                    onChange={(val) => handleChange('nationality', val)}
                    placeholder="Select nationality"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Country of Residence</Label>
                  <CountrySelector
                    value={formData.residence_country || ''}
                    onChange={(val) => handleChange('residence_country', val)}
                    placeholder="Select residence country"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-border shadow-sm bg-card h-fit">
            <CardHeader className="bg-muted/30 border-b border-border pb-4">
              <div className="flex items-center gap-2">
<Envelope size={20} className="text-primary" />
              <CardTitle className="text-lg">Contact Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                <div className="relative">
                  <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="client@example.com"
                    className="pl-10 h-11 bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telephone" className="text-sm font-semibold">Telephone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      id="telephone"
                      value={formData.telephone}
                      onChange={(e) => handleChange('telephone', e.target.value)}
                      placeholder="+251..."
                      className="pl-10 h-11 bg-background"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fax" className="text-sm font-semibold">Fax</Label>
                  <Input
                    id="fax"
                    value={formData.fax}
                    onChange={(e) => handleChange('fax', e.target.value)}
                    placeholder="Fax number"
                    className="h-11 bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm bg-card">
            <CardHeader className="bg-muted/30 border-b border-border pb-4">
              <div className="flex items-center gap-2">
<MapPin size={20} className="text-primary" />
              <CardTitle className="text-lg">Address Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address_street" className="text-xs font-semibold text-muted-foreground">Street Address</Label>
                  <Input
                    id="address_street"
                    value={formData.address_street}
                    onChange={(e) => handleChange('address_street', e.target.value)}
                    placeholder="Street, Building, Floor"
                    className="h-11 bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address_zone" className="text-xs font-semibold text-muted-foreground">Zone / Subcity</Label>
                  <Input
                    id="address_zone"
                    value={formData.address_zone}
                    onChange={(e) => handleChange('address_zone', e.target.value)}
                    placeholder="Zone / Subcity"
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="wereda" className="text-xs font-semibold text-muted-foreground">Wereda</Label>
                  <Input
                    id="wereda"
                    value={formData.wereda}
                    onChange={(e) => handleChange('wereda', e.target.value)}
                    placeholder="Wereda"
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-xs font-semibold text-muted-foreground">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city_code" className="text-xs font-semibold text-muted-foreground">City Code</Label>
                  <Input
                    id="city_code"
                    value={formData.city_code}
                    onChange={(e) => handleChange('city_code', e.target.value)}
                    placeholder="City Code"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state_name" className="text-xs font-semibold text-muted-foreground">State / Region</Label>
                  <Input
                    id="state_name"
                    value={formData.state_name}
                    onChange={(e) => handleChange('state_name', e.target.value)}
                    placeholder="State / Region"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state_code" className="text-xs font-semibold text-muted-foreground">State Code</Label>
                  <Input
                    id="state_code"
                    value={formData.state_code}
                    onChange={(e) => handleChange('state_code', e.target.value)}
                    placeholder="State Code"
                    className="bg-background"
                  />
                </div>

                <Separator className="col-span-full my-2 bg-border/50" />

                <div className="space-y-2">
                  <Label htmlFor="house_no" className="text-xs font-semibold text-muted-foreground">House No.</Label>
                  <Input
                    id="house_no"
                    value={formData.house_no}
                    onChange={(e) => handleChange('house_no', e.target.value)}
                    placeholder="House No."
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="po_box" className="text-xs font-semibold text-muted-foreground">P.O. Box</Label>
                  <Input
                    id="po_box"
                    value={formData.po_box}
                    onChange={(e) => handleChange('po_box', e.target.value)}
                    placeholder="P.O. Box"
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="zip_code" className="text-xs font-semibold text-muted-foreground">ZIP / Postal Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => handleChange('zip_code', e.target.value)}
                    placeholder="ZIP Code"
                    className="bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-border mt-8">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/clients')}
            className="px-6 hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="px-8 flex items-center gap-2 shadow-sm"
          >
            <Check size={18} weight="bold" />
            {saving ? 'Creating Client...' : 'Create Client'}
          </Button>
        </div>
      </form>
    </div>
  );
}
