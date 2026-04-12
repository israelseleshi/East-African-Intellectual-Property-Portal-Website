import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, User, FileText, PencilSimple, Check, X, Envelope, Phone, MapPin, Globe, Buildings, IdentificationCard, GenderIntersex } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { clientService } from '@/utils/api'
import { usePageTitleStore } from '@/store/pageTitleStore'
import { toast } from 'sonner'
import { CountrySelector } from '@/components/CountrySelector'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import HelpButton from '@/components/HelpButton'

import type { ApplicantType } from '@/shared/database'

interface AssociatedTrademark {
  id: string
  mark_name: string
  status: string
  jurisdiction: string
  filing_number: string | null
  created_at: string
}

interface Client {
  id: string
  name: string
  local_name?: string
  type: ApplicantType
  gender?: 'MALE' | 'FEMALE' | null
  nationality: string
  email: string
  address_street: string
  address_zone?: string
  wereda?: string
  city: string
  state_name?: string
  city_code?: string
  state_code?: string
  house_no?: string
  zip_code: string
  po_box?: string
  telephone?: string
  fax?: string
  residence_country?: string
  created_at: string
  trademarks?: AssociatedTrademark[]
}

const CLIENT_TYPE_LABELS: Record<ApplicantType, string> = {
  INDIVIDUAL: 'Individual',
  COMPANY: 'Company',
  PARTNERSHIP: 'Partnership'
}

function Field({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon size={14} />}
        {label}
      </Label>
      <div className="text-sm font-medium">{value || <span className="text-muted-foreground/50">—</span>}</div>
    </div>
  )
}

export default function ClientDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const fromTrash = searchParams.get('fromTrash') === 'true'
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Client>>({})
  const setOverrideTitle = usePageTitleStore((state) => state.setOverrideTitle)
  const clearOverride = usePageTitleStore((state) => state.clearOverride)

  useEffect(() => {
    if (id) {
      fetchClient(id)
    }
    return () => clearOverride()
  }, [id])

  const fetchClient = async (clientId: string) => {
    try {
      setLoading(true)
      const data = await clientService.getClient(clientId)
      setClient(data)
      setFormData(data)
      setOverrideTitle(data.name)
    } catch (error) {
      console.error('[ClientDetailPage] Failed to fetch client:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!id || !formData) return
    
    setSaving(true)
    try {
      const sanitizeField = (val: string | null | undefined): string | undefined => {
        if (val === null || val === undefined) return undefined
        const trimmed = val.trim()
        return trimmed || undefined
      }
      
      const cleanedData = {
        name: sanitizeField(formData.name),
        local_name: sanitizeField(formData.local_name),
        type: formData.type,
        gender: formData.gender,
        nationality: sanitizeField(formData.nationality),
        residence_country: sanitizeField(formData.residence_country),
        email: sanitizeField(formData.email),
        address_street: sanitizeField(formData.address_street),
        address_zone: sanitizeField(formData.address_zone),
        wereda: sanitizeField(formData.wereda),
        city: sanitizeField(formData.city),
        state_name: sanitizeField(formData.state_name),
        city_code: sanitizeField(formData.city_code),
        state_code: sanitizeField(formData.state_code),
        house_no: sanitizeField(formData.house_no),
        zip_code: sanitizeField(formData.zip_code),
        po_box: sanitizeField(formData.po_box),
        telephone: sanitizeField(formData.telephone),
        fax: sanitizeField(formData.fax)
      }
      
      await clientService.updateClient(id, cleanedData)
      setClient({ ...client!, ...formData as Client })
      setIsEditing(false)
      toast.success('Success', {
        description: 'Client updated successfully',
      })
    } catch (error: any) {
      console.error('[ClientDetailPage] Failed to update client:', error)
      toast.error('Failed to update client', {
        description: error?.response?.data?.error || 'Please try again',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof Client, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <header className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48 mt-2" /></div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col items-center justify-center py-24">
        <div className="text-xl font-bold text-foreground">Client not found</div>
        <Button onClick={() => navigate('/clients')} className="mt-4">Back to Clients</Button>
      </div>
    )
  }

  return (
    <div className="w-full mx-auto p-4 md:p-8 space-y-6 bg-[#E8E8ED] text-foreground min-h-screen">
      <header className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/clients')} className="h-10 w-10 shrink-0">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <Typography.h2a>{isEditing ? 'Edit Client' : client.name}</Typography.h2a>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="default">{CLIENT_TYPE_LABELS[client.type]}</Badge>
              {client.nationality && <Badge variant="outline">{client.nationality}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HelpButton pageId="client-detail" />
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(client) }}>
                <X size={18} className="mr-2" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Check size={18} className="mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} disabled={fromTrash} title={fromTrash ? 'Cannot edit deleted items' : undefined} data-tour="edit-client-btn">
              <PencilSimple size={18} className="mr-2" /> Edit Client
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identity Card */}
        <Card className="border-border shadow-sm bg-card" data-tour="identity-card">
          <CardHeader className="bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
              <User size={20} className="text-primary" />
              <CardTitle><Typography.h4>Identity & Type</Typography.h4></CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {isEditing ? (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label>Client Name</Label>
                  <Input value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Local Name (Amharic)</Label>
                  <Input value={formData.local_name || ''} onChange={e => handleChange('local_name', e.target.value)} className="font-amharic" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Client Type</Label>
                    <Select value={formData.type} onValueChange={v => handleChange('type', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                        <SelectItem value="COMPANY">Company</SelectItem>
                        <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gender</Label>
                    <Select value={formData.gender || 'NONE'} onValueChange={v => handleChange('gender', v === 'NONE' ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Not Specified" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Not Specified</SelectItem>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Full Name" value={client.name} icon={IdentificationCard} />
                <Field label="Local Name" value={client.local_name} icon={IdentificationCard} />
                <Field label="Client Type" value={CLIENT_TYPE_LABELS[client.type]} icon={Buildings} />
                <Field label="Gender" value={client.gender} icon={GenderIntersex} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="border-border shadow-sm bg-card" data-tour="contact-card">
          <CardHeader className="bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
              <Envelope size={20} className="text-primary" />
              <CardTitle><Typography.h4>Contact Information</Typography.h4></CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {isEditing ? (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Telephone</Label>
                    <Input value={formData.telephone || ''} onChange={e => handleChange('telephone', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fax</Label>
                    <Input value={formData.fax || ''} onChange={e => handleChange('fax', e.target.value)} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Email" value={client.email} icon={Envelope} />
                <Field label="Telephone" value={client.telephone} icon={Phone} />
                <Field label="Fax" value={client.fax} icon={Phone} />
                <Field label="Created" value={new Date(client.created_at).toLocaleDateString()} icon={Globe} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address Card */}
        <Card className="border-border shadow-sm bg-card md:col-span-2" data-tour="address-card">
          <CardHeader className="bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
              <MapPin size={20} className="text-primary" />
              <CardTitle><Typography.h4>Address & Location</Typography.h4></CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <Label>Nationality</Label>
                  <CountrySelector value={formData.nationality || ''} onChange={v => handleChange('nationality', v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Residence Country</Label>
                  <CountrySelector value={formData.residence_country || ''} onChange={v => handleChange('residence_country', v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Street Address</Label>
                  <Input value={formData.address_street || ''} onChange={e => handleChange('address_street', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Zone / Subcity</Label>
                  <Input value={formData.address_zone || ''} onChange={e => handleChange('address_zone', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Wereda</Label>
                  <Input value={formData.wereda || ''} onChange={e => handleChange('wereda', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={formData.city || ''} onChange={e => handleChange('city', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>City Code</Label>
                  <Input value={formData.city_code || ''} onChange={e => handleChange('city_code', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>State / Region</Label>
                  <Input value={formData.state_name || ''} onChange={e => handleChange('state_name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>State Code</Label>
                  <Input value={formData.state_code || ''} onChange={e => handleChange('state_code', e.target.value)} />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <Label>ZIP / Postal Code</Label>
                  <Input value={formData.zip_code || ''} onChange={e => handleChange('zip_code', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>House No.</Label>
                  <Input value={formData.house_no || ''} onChange={e => handleChange('house_no', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>P.O. Box</Label>
                  <Input value={formData.po_box || ''} onChange={e => handleChange('po_box', e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Field label="Nationality" value={client.nationality} icon={Globe} />
                <Field label="Residence" value={client.residence_country} icon={Globe} />
                <Field label="City" value={client.city} icon={MapPin} />
                <Field label="City Code" value={client.city_code} icon={MapPin} />
                <Field label="Street" value={client.address_street} icon={MapPin} />
                <Field label="Zone/Subcity" value={client.address_zone} icon={MapPin} />
                <Field label="Wereda" value={client.wereda} icon={MapPin} />
                <Field label="House No." value={client.house_no} icon={MapPin} />
                <Field label="State" value={client.state_name} icon={MapPin} />
                <Field label="State Code" value={client.state_code} icon={MapPin} />
                <Field label="Postal/ZIP" value={client.zip_code} icon={MapPin} />
                <Field label="P.O. Box" value={client.po_box} icon={MapPin} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Associated Trademarks */}
        {!isEditing && client.trademarks && client.trademarks.length > 0 && (
          <Card className="border-border shadow-sm bg-card md:col-span-2" data-tour="trademarks-card">
            <CardHeader className="bg-muted/30 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                <CardTitle><Typography.h4>Associated Trademarks</Typography.h4></CardTitle>
                <Typography.muted>Trademarks filed by this client</Typography.muted>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {client.trademarks.map((tm) => (
                  <div 
                    key={tm.id} 
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={() => navigate(`/trademarks/${tm.id}`)}
                  >
                    <div>
                      <div className="font-bold text-sm text-foreground">{tm.mark_name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {tm.filing_number || 'No filing number'} • {tm.jurisdiction}
                      </div>
                    </div>
                    <Badge variant={tm.status === 'REGISTERED' ? 'default' : 'outline'}>
                      {tm.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
