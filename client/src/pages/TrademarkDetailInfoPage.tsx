import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText, PencilSimple, PencilSimpleLine, ClockCounterClockwise, DownloadSimple, Info, Buildings, MapPin, Phone, Envelope, Calendar, CheckSquare, List, WarningCircle, X, Upload, XCircle, User, IdentificationCard } from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { CountrySelector } from '@/components/CountrySelector'
import { trademarkService } from '@/utils/api'
import { usePageTitleStore } from '@/store/pageTitleStore'
import { toast } from 'sonner'
import { fillPdfForm } from '@/utils/pdfUtils'

type NiceMapping = { id: string; classNo: number; description?: string }

type TrademarkCaseDetail = {
  id: string
  markName?: string
  mark_name?: string
  wordMark?: string
  filingNumber?: string
  filing_number?: string
  jurisdiction?: string
  status?: string
  markType?: string
  mark_type?: string
  colorIndication?: string
  color_indication?: string
  mark_image?: string
  priority?: string
  goodsServices?: string
  goods_services?: string
  mark_description?: string
  niceClasses?: number[]
  niceMappings?: NiceMapping[]
  applicationDate?: string
  application_date?: string
  publicationDate?: string
  publication_date?: string
  registrationDate?: string
  registration_date?: string
  expiryDate?: string
  expiry_date?: string
  nextRenewalDate?: string
  next_renewal_date?: string
  priority_country?: string
  priority_filing_date?: string
  disclaimer_english?: string
  disclaimer_amharic?: string
  eipaForm?: Record<string, unknown> | null
  is_word?: boolean | number
  is_figurative?: boolean | number
  is_mixed?: boolean | number
  is_three_dim?: boolean | number
  chk_goods?: boolean | number
  chk_services?: boolean | number
  chk_collective?: boolean | number
  transmission?: string
  mark_transliteration?: string
  mark_language_requiring_traslation?: string
  mark_has_three_dim_features?: string
  translation?: string
  applicant_sign_day?: string
  applicant_sign_month?: string
  applicant_sign_year_en?: string
  chk_priority_accompanies?: boolean | number
  chk_priority_submitted_later?: boolean | number
  renewal_app_no?: string
  renewal_reg_no?: string
  renewal_reg_date?: string
  renewal_sign_day?: string
  renewal_sign_month?: string
  renewal_sign_year?: string
  client?: {
    id?: string
    name?: string
    localName?: string
    nationality?: string
    email?: string
    phone?: string
    addressStreet?: string
    addressZone?: string
    city?: string
    wereda?: string
    houseNo?: string
    poBox?: string
    fax?: string
    created_at?: string
  }
  agent?: {
    name?: string
    country?: string
    city?: string
    subcity?: string
    telephone?: string
    email?: string
    poBox?: string
  }
}

const JURISDICTION_NAMES: Record<string, string> = {
  ET: 'Ethiopia', KE: 'Kenya', ER: 'Eritrea', DJ: 'Djibouti',
  SO: 'Somalia', TZ: 'Tanzania', UG: 'Uganda', RW: 'Rwanda', BI: 'Burundi',
}

const STATUS_NAMES: Record<string, string> = {
  DRAFT: 'Draft', FILED: 'Filed', FORMAL_EXAM: 'Formal Exam',
  SUBSTANTIVE_EXAM: 'Substantive', PUBLISHED: 'Published', REGISTERED: 'Registered'
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500 text-white hover:bg-slate-600',
  FILED: 'bg-blue-500 text-white hover:bg-blue-600',
  FORMAL_EXAM: 'bg-yellow-500 text-black hover:bg-yellow-600',
  SUBSTANTIVE_EXAM: 'bg-orange-500 text-white hover:bg-orange-600',
  PUBLISHED: 'bg-purple-500 text-white hover:bg-purple-600',
  REGISTERED: 'bg-green-600 text-white hover:bg-green-700',
  REJECTED: 'bg-red-500 text-white hover:bg-red-600',
  ABANDONED: 'bg-gray-700 text-white hover:bg-gray-800'
}

export const resolveMarkImageUrl = (rawPath?: string) => {
  if (!rawPath) return ''
  if (rawPath.startsWith('http') || rawPath.startsWith('data:')) return rawPath
  const devApiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')
  const origin = import.meta.env.PROD ? window.location.origin : devApiBase
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  if (path.startsWith('/api/')) return `${origin}${path}`
  if (path.startsWith('/uploads/')) return `${origin}/api${path}`
  if (path.startsWith('/forms-download/')) return `${origin}/api${path}`
  return `${origin}/api/forms-download/${path.replace(/^\//, '')}`
}

function safeDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US')
}

function EditableField({ 
  label, 
  value, 
  onChange, 
  name, 
  type = 'text',
  options
}: { 
  label: string; 
  value?: string | boolean | null; 
  onChange?: (name: string, value: any) => void; 
  name?: string;
  type?: 'text' | 'textarea' | 'checkbox' | 'country';
  options?: { label: string; value: string }[]
}) {
  if (onChange && name) {
    if (type === 'checkbox') {
      return (
        <div className="flex items-center gap-2 pt-2">
          <Checkbox 
            id={name} 
            checked={!!value} 
            onCheckedChange={(checked) => onChange(name, checked)} 
          />
          <Label htmlFor={name} className="text-xs font-semibold text-muted-foreground cursor-pointer">{label}</Label>
        </div>
      )
    }

    if (type === 'country') {
      return (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
          <CountrySelector 
            value={typeof value === 'string' ? value : ''} 
            onChange={(val) => onChange(name, val)} 
          />
        </div>
      )
    }

    if (type === 'textarea') {
      return (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
          <Textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(name, e.target.value)}
            className="text-sm font-medium min-h-[100px]"
          />
        </div>
      )
    }

    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="text-sm font-medium h-9"
        />
      </div>
    )
  }
  
  if (type === 'checkbox') {
    return (
      <div className="flex items-center gap-2 pt-2 opacity-70">
        <Checkbox checked={!!value} disabled />
        <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="text-sm font-medium">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value || '—')}</div>
    </div>
  )
}

function MarkInfoThumbnail({ markImage, label }: { markImage?: string; label: string }) {
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [failed, setFailed] = useState(false)

  const candidates = useMemo(() => {
    const primary = resolveMarkImageUrl(markImage)
    if (!primary) return []
    const list = [primary]
    if (!import.meta.env.PROD) {
      const remote = primary.replace(/^http:\/\/localhost:\d+/i, 'https://eastafricanip.com').replace(/^http:\/\/127\.0\.0\.1:\d+/i, 'https://eastafricanip.com')
      if (remote !== primary) list.push(remote)
    }
    return Array.from(new Set(list))
  }, [markImage])

  useEffect(() => { setCandidateIndex(0); setFailed(false) }, [markImage, candidates.join('|')])

  const current = candidates[candidateIndex]

  return (
    <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground shadow-sm border border-border">
      {!failed && current ? (
        <img src={current} alt={`${label} logo`} className="h-full w-full object-contain" onError={() => {
          if (candidateIndex < candidates.length - 1) setCandidateIndex(idx => idx + 1)
          else setFailed(true)
        }} />
      ) : <Buildings size={64} />}
    </div>
  )
}

export default function TrademarkDetailInfoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const fromTrash = searchParams.get('fromTrash') === 'true'
  const [loading, setLoading] = useState(true)
  const [tm, setTm] = useState<TrademarkCaseDetail | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [markImagePreview, setMarkImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setOverrideTitle = usePageTitleStore((state) => state.setOverrideTitle)
  const clearOverride = usePageTitleStore((state) => state.clearOverride)

  const getDisplayValue = (name: string, fallback: any) => {
    if (isEditing && name in formData) return formData[name]
    return fallback
  }

  useEffect(() => {
    let active = true
    if (!id) { setLoading(false); return () => { active = false } }
    setLoading(true)
    const fetchData = async () => {
      try {
        const data = await trademarkService.getCase(id)
        if (!active) return
        setTm(data)
        setOverrideTitle(data.markName || data.mark_name || 'Trademark')
      } catch { if (!active) return; setTm(null) }
      finally { if (active) setLoading(false) }
    }
    fetchData()
    return () => { active = false }
  }, [id, setOverrideTitle])

  useEffect(() => { return () => clearOverride() }, [clearOverride])

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setMarkImagePreview(base64);
        handleFieldChange('mark_image', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setMarkImagePreview(null);
    handleFieldChange('mark_image', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const eipa = tm?.eipaForm as Record<string, unknown> | null
  const eipaField = (key: string) => eipa?.[key] as any

  const startEditing = () => {
    if (!tm) return
    setFormData({
      markName: tm.markName || tm.mark_name || '',
      markType: tm.markType || tm.mark_type || '',
      colorIndication: tm.colorIndication || tm.color_indication || eipaField('mark_color_indication') || '',
      filingNumber: tm.filingNumber || tm.filing_number || '',
      priority: tm.priority || '',
      goodsServices: tm.goodsServices || tm.goods_services || '',
      markDescription: tm.mark_description || eipaField('mark_description') || '',
      mark_image: tm.mark_image || '',
      
      // Applicant
      'client.name': tm.client?.name || eipaField('applicant_name_english') || '',
      'client.localName': tm.client?.localName || eipaField('applicant_name_amharic') || '',
      'client.nationality': tm.client?.nationality || eipaField('nationality') || '',
      'client.residence_country': eipaField('residence_country') || '',
      'client.city': tm.client?.city || eipaField('city_name') || '',
      'client.city_code': eipaField('city_code') || '',
      'client.state_name': eipaField('state_name') || '',
      'client.state_code': eipaField('state_code') || '',
      'client.subcity': eipaField('address_zone') || '',
      'client.wereda': tm.client?.wereda || eipaField('wereda') || '',
      'client.houseNo': tm.client?.houseNo || eipaField('house_no') || '',
      'client.poBox': tm.client?.poBox || eipaField('po_box') || '',
      'client.phone': tm.client?.phone || eipaField('telephone') || '',
      'client.fax': tm.client?.fax || eipaField('fax') || '',
      'client.email': tm.client?.email || eipaField('email') || '',
      'client.address_street': eipaField('address_street') || '',
      'client.zip_code': eipaField('zip_code') || '',
      
      // Applicant Gender/Type
      chk_female: !!eipaField('chk_female'),
      chk_male: !!eipaField('chk_male'),
      chk_company: !!eipaField('chk_company'),

      // Agent
      'agent.name': tm.agent?.name || eipaField('agent_name') || '',
      'agent.country': tm.agent?.country || eipaField('agent_country') || '',
      'agent.city': tm.agent?.city || eipaField('agent_city') || '',
      'agent.subcity': tm.agent?.subcity || eipaField('agent_subcity') || '',
      'agent.woreda': eipaField('agent_woreda') || '',
      'agent.house_no': eipaField('agent_house_no') || '',
      'agent.poBox': tm.agent?.poBox || eipaField('agent_po_box') || '',
      'agent.telephone': tm.agent?.telephone || eipaField('agent_telephone') || '',
      'agent.email': tm.agent?.email || eipaField('agent_email') || '',
      'agent.fax': eipaField('agent_fax') || '',
      
      // Mark Type Checkboxes (Goods, Services, Collective)
      chk_goods: !!tm.chk_goods || !!eipaField('chk_goods'),
      chk_services: !!tm.chk_services || !!eipaField('chk_services'),
      chk_collective: !!tm.chk_collective || !!eipaField('chk_collective'),
      
      // Mark Form Checkboxes (Word, Figurative, 3D, Mixed)
      type_word: !!tm.is_word || !!eipaField('type_word'),
      type_figur: !!tm.is_figurative || !!eipaField('type_figur'),
      type_thre: !!tm.is_three_dim || !!eipaField('type_thre'),
      k_type_mi: !!tm.is_mixed || !!eipaField('k_type_mi'),

      // More details
      mark_translation: eipaField('mark_translation') || tm.translation || '',
      mark_transliteration: eipaField('mark_transliteration') || tm.mark_transliteration || '',
      mark_language_requiring_traslation: tm.mark_language_requiring_traslation || eipaField('mark_language_requiring_translation') || eipaField('mark_language_requiring_traslation') || '',
      mark_has_three_dim_features: eipaField('mark_has_three_dim_features') || '',

      // Priority
      priority_country: tm.priority_country || eipaField('priority_country') || '',
      priority_filing_date: tm.priority_filing_date || eipaField('priority_filing_date') || '',
      disclaimer_text_english: tm.disclaimer_english || eipaField('disclaimer_text_english') || '',
      disclaimer_text_amharic: tm.disclaimer_amharic || eipaField('disclaimer_text_amharic') || '',
      // Signature fields
      applicant_sign_day: tm.applicant_sign_day || eipaField('applicant_sign_day') || '',
      applicant_sign_month: tm.applicant_sign_month || eipaField('applicant_sign_month') || '',
      applicant_sign_year_en: tm.applicant_sign_year_en || eipaField('applicant_sign_year_en') || '',
      // Priority checklist
      chk_priority_accompanies: !!tm.chk_priority_accompanies || !!eipaField('chk_priority_accompanies'),
      chk_priority_submitted_later: !!tm.chk_priority_submitted_later || !!eipaField('chk_priority_submitted_later'),
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setFormData({})
    setMarkImagePreview(null)
  }

  const saveCase = async () => {
    if (!id || isSaving) return
    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {}
      
      // Base fields
      const baseFields = ['markName', 'markType', 'colorIndication', 'filingNumber', 'priority', 'goodsServices', 'markDescription', 'mark_image'];
      baseFields.forEach(field => {
        if (formData[field] !== undefined) payload[field] = formData[field];
      });

      // Nest Client fields
      const clientPayload: Record<string, any> = {};
      Object.keys(formData).filter(k => k.startsWith('client.')).forEach(k => {
        const subKey = k.split('.')[1];
        clientPayload[subKey] = formData[k];
      });
      if (Object.keys(clientPayload).length > 0) payload.client = clientPayload;

      // Nest Agent fields
      const agentPayload: Record<string, any> = {};
      Object.keys(formData).filter(k => k.startsWith('agent.')).forEach(k => {
        const subKey = k.split('.')[1];
        agentPayload[subKey] = formData[k];
      });
      if (Object.keys(agentPayload).length > 0) payload.agent = agentPayload;

      // Mark Type/Form Checkboxes
      const checkboxFields = [
        'chk_goods', 'chk_services', 'chk_collective', 
        'type_word', 'type_figur', 'type_thre', 'k_type_mi'
      ];
      checkboxFields.forEach(field => {
        if (formData[field] !== undefined) {
          const dbKey = field === 'type_word' ? 'is_word' : 
                        field === 'type_figur' ? 'is_figurative' :
                        field === 'type_thre' ? 'is_three_dim' :
                        field === 'k_type_mi' ? 'is_mixed' : field;
          payload[dbKey] = formData[field];
        }
      });

      // EIPA Form data (for checkboxes and other extra fields)
      const eipaPayload: Record<string, any> = { ...(tm?.eipaForm || {}) };
      
      // Map back to EIPA form keys
      const eipaMap: Record<string, string> = {
        'client.name': 'applicant_name_english',
        'client.localName': 'applicant_name_amharic',
        'client.nationality': 'nationality',
        'client.residence_country': 'residence_country',
        'client.city': 'city_name',
        'client.city_code': 'city_code',
        'client.state_name': 'state_name',
        'client.state_code': 'state_code',
        'client.subcity': 'address_zone',
        'client.wereda': 'wereda',
        'client.houseNo': 'house_no',
        'client.poBox': 'po_box',
        'client.phone': 'telephone',
        'client.fax': 'fax',
        'client.email': 'email',
        'client.address_street': 'address_street',
        'client.zip_code': 'zip_code',
        'agent.name': 'agent_name',
        'agent.country': 'agent_country',
        'agent.city': 'agent_city',
        'agent.subcity': 'agent_subcity',
        'agent.woreda': 'agent_woreda',
        'agent.house_no': 'agent_house_no',
        'agent.poBox': 'agent_po_box',
        'agent.telephone': 'agent_telephone',
        'agent.email': 'agent_email',
        'agent.fax': 'agent_fax'
      };

      Object.entries(eipaMap).forEach(([formKey, eipaKey]) => {
        if (formData[formKey] !== undefined) eipaPayload[eipaKey] = formData[formKey];
      });

      const eipaKeys = [
        'chk_female', 'chk_male', 'chk_company',
        'chk_goods', 'chk_services', 'chk_collective', 
        'type_word', 'type_figur', 'type_thre', 'k_type_mi',
        'mark_translation', 'mark_transliteration', 'mark_language_requiring_traslation', 'mark_language_requiring_translation', 'mark_has_three_dim_features',
        'priority_country', 'priority_filing_date', 'disclaimer_text_english', 'disclaimer_text_amharic',
        'applicant_sign_day', 'applicant_sign_month', 'applicant_sign_year_en',
        'chk_priority_accompanies', 'chk_priority_submitted_later'
      ];
      
      eipaKeys.forEach(key => {
        if (formData[key] !== undefined) eipaPayload[key] = formData[key];
      });
      
      payload.eipaForm = eipaPayload;

      if (Object.keys(payload).length > 0) {
        const res = await trademarkService.updateCase(id, payload)
        if (res.success) {
          toast.success(res.message || 'Case Updated Successfully')
          await load()
          setIsEditing(false)
          setFormData({})
          setMarkImagePreview(null)
        }
      } else {
        setIsEditing(false)
        setFormData({})
      }
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } }
      toast.error(err?.response?.data?.error || 'Failed to save case')
    } finally {
      setIsSaving(false)
    }
  }

  const load = async () => {
    if (!id) return
    try {
      const data = await trademarkService.getCase(id)
      setTm(data)
      setOverrideTitle(data.markName || data.mark_name || 'Trademark')
    } catch {
      setTm(null)
    }
  }

  const handleDownloadForm = async () => {
    if (!tm) return
    const loadingToastId = toast.loading('Preparing PDF...')
    try {
      const isRenewal = (tm.status || '').toUpperCase() === 'RENEWAL' || (tm.markType || tm.mark_type || '').toUpperCase() === 'RENEWAL'
      const pdfUrl = isRenewal ? '/renewal_form.pdf' : '/application_form.pdf'
      
      // Merge top-level case data into eipaForm to ensure PDF engine gets the latest DB values
      const mergedData = {
        ...(tm.eipaForm as Record<string, unknown> || {}),
        // Primary Checkboxes (Mark Type)
        chk_goods: !!tm.chk_goods,
        chk_services: !!tm.chk_services,
        chk_collective: !!tm.chk_collective,
        // Primary Checkboxes (Mark Form)
        type_word: !!tm.is_word,
        type_figur: !!tm.is_figurative,
        k_type_mi: !!tm.is_mixed,
        type_thre: !!tm.is_three_dim,
        // Secondary data
        priority_country: tm.priority_country,
        priority_filing_date: tm.priority_filing_date,
        disclaimer_text_english: tm.disclaimer_english,
        disclaimer_text_amharic: tm.disclaimer_amharic,
        mark_description: tm.mark_description,
        mark_name: tm.markName || tm.mark_name,
        // Signature fields
        applicant_sign_day: tm.applicant_sign_day || '',
        applicant_sign_month: tm.applicant_sign_month || '',
        applicant_sign_year_en: tm.applicant_sign_year_en || '',
        // Priority checklist
        chk_priority_accompanies: !!tm.chk_priority_accompanies,
        chk_priority_submitted_later: !!tm.chk_priority_submitted_later
      }
      
      const pdfBytes = await fillPdfForm(pdfUrl, mergedData)
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `EIPA_FORM_${tm.filingNumber || tm.filing_number || tm.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Download Started', { id: loadingToastId })
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Download Failed: Could not generate PDF form', { id: loadingToastId })
    }
  }

  const markName = tm?.markName || tm?.mark_name || tm?.wordMark || '—'
  const filingNo = tm?.filingNumber || tm?.filing_number || '—'
  const niceClasses = useMemo(() => {
    if (tm?.niceMappings?.length) return tm.niceMappings.map((m) => m.classNo)
    return tm?.niceClasses || []
  }, [tm?.niceMappings, tm?.niceClasses])

  if (loading) {
    return (
      <div className="w-full mx-auto p-4 md:p-8 space-y-6">
        <header className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48 mt-2" /></div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!tm) {
    return (
      <div className="w-full mx-auto p-4 md:p-8 flex flex-col items-center justify-center py-24">
        <div className="text-xl font-bold">Trademark not found</div>
        <Button onClick={() => navigate('/trademarks')} className="mt-4">Back to Trademarks</Button>
      </div>
    )
  }

  const isRegistered = tm.status === 'REGISTERED'
  const isPublished = tm.status === 'PUBLISHED'

  return (
    <div className="w-full mx-auto p-4 md:p-8 space-y-6 bg-[#E8E8ED] text-foreground min-h-screen">
      <header className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/trademarks')} className="h-10 w-10 shrink-0">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <Typography.h2a>{markName}</Typography.h2a>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="default">{filingNo}</Badge>
              <Badge variant="outline">{JURISDICTION_NAMES[tm.jurisdiction || 'ET'] || tm.jurisdiction}</Badge>
              <Badge className={STATUS_COLORS[tm.status || 'DRAFT'] || 'bg-primary text-primary-foreground'}>
                {STATUS_NAMES[tm.status || 'DRAFT'] || tm.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={cancelEditing} disabled={isSaving}>
                <X size={18} /><span className="hidden sm:inline">Cancel</span>
              </Button>
              <Button onClick={saveCase} disabled={isSaving}>
                <PencilSimpleLine size={18} /><span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => navigate(`/case-flow/${tm.id}`)} disabled={fromTrash} title={fromTrash ? 'Cannot manage lifecycle of deleted items' : undefined}>
                <ClockCounterClockwise size={18} /><span className="hidden sm:inline">Manage lifecycle</span>
              </Button>
              {isRegistered && !fromTrash && (
                <Button variant="default" onClick={() => navigate(`/eipa-forms/renewal-form?caseId=${tm.id}`)}>
                  <FileText size={18} /><span className="hidden sm:inline">Renew</span>
                </Button>
              )}
              <Button variant="outline" onClick={handleDownloadForm}><DownloadSimple size={18} /><span className="hidden sm:inline">Export Form</span></Button>
              <Button variant="outline" onClick={startEditing} disabled={fromTrash} title={fromTrash ? 'Cannot edit deleted items' : undefined}><PencilSimple size={18} /><span className="hidden sm:inline">Edit Case</span></Button>
            </>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* I. Applicant Summary (Condensed) */}
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="bg-muted/30 border-b border-border py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={18} className="text-primary" />
                <CardTitle><Typography.h4a>Applicant Information</Typography.h4a></CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-primary hover:text-primary/80 hover:bg-primary/5 gap-1.5"
                onClick={() => navigate(`/clients/${tm.client?.id || ''}`)}
                disabled={!tm.client}
              >
                View Profile <ArrowLeft size={14} className="rotate-180" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <IdentificationCard size={14} /> Identity & Type
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name" value={tm.client?.name || eipaField('applicant_name_english')} />
                <Field label="Local Name" value={tm.client?.localName || eipaField('applicant_name_amharic')} />
                <Field label="Client Type" value={eipaField('chk_company') ? 'Company' : (eipaField('chk_male') || eipaField('chk_female') ? 'Individual' : '—')} />
                <Field label="Gender" value={eipaField('chk_male') ? 'Male' : (eipaField('chk_female') ? 'Female' : '—')} />
              </div>
            </div>
            
            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <Envelope size={14} /> Contact Information
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Email" value={tm.client?.email || eipaField('email')} />
                <Field label="Telephone" value={tm.client?.phone || eipaField('telephone')} />
                <Field label="Fax" value={tm.client?.fax || eipaField('fax')} />
                <Field label="Created" value={tm.client?.created_at ? new Date(tm.client.created_at).toLocaleDateString() : '—'} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* III. Agent Details */}
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="bg-muted/30 border-b border-border py-3">
            <div className="flex items-center gap-2"><Buildings size={18} className="text-primary" /><CardTitle><Typography.h4a>Agent / Representative</Typography.h4a></CardTitle></div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField label="Agent Name" value={getDisplayValue('agent.name', tm.agent?.name || eipaField('agent_name'))} name={isEditing ? 'agent.name' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Country" type="country" value={getDisplayValue('agent.country', tm.agent?.country || eipaField('agent_country'))} name={isEditing ? 'agent.country' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="City" value={getDisplayValue('agent.city', tm.agent?.city || eipaField('agent_city'))} name={isEditing ? 'agent.city' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Sub-City" value={getDisplayValue('agent.subcity', tm.agent?.subcity || eipaField('agent_subcity'))} name={isEditing ? 'agent.subcity' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Wereda" value={getDisplayValue('agent.woreda', eipaField('agent_woreda'))} name={isEditing ? 'agent.woreda' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="House No." value={getDisplayValue('agent.house_no', eipaField('agent_house_no'))} name={isEditing ? 'agent.house_no' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="P.O. Box" value={getDisplayValue('agent.poBox', tm.agent?.poBox || eipaField('agent_po_box'))} name={isEditing ? 'agent.poBox' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Telephone" value={getDisplayValue('agent.telephone', tm.agent?.telephone || eipaField('agent_telephone'))} name={isEditing ? 'agent.telephone' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Email" value={getDisplayValue('agent.email', tm.agent?.email || eipaField('agent_email'))} name={isEditing ? 'agent.email' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Fax" value={getDisplayValue('agent.fax', eipaField('agent_fax'))} name={isEditing ? 'agent.fax' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
            </div>
          </CardContent>
        </Card>

        {/* IV. Mark Specification */}
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2"><FileText size={20} className="text-primary" /><CardTitle><Typography.h4>IV. Mark Specification</Typography.h4></CardTitle></div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {isEditing ? (
              <div className="space-y-3 mb-6">
                <Label className="text-xs font-semibold text-muted-foreground">Mark Logo / Image</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative aspect-video w-full max-w-sm mx-auto rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-3 cursor-pointer group hover:border-primary transition-all"
                >
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                  {(markImagePreview || getDisplayValue('mark_image', tm.mark_image)) ? (
                    <div className="relative w-full h-full p-4">
                      <img src={markImagePreview || resolveMarkImageUrl(getDisplayValue('mark_image', tm.mark_image))} alt="Mark preview" className="w-full h-full object-contain" />
                      <button onClick={(e) => { e.stopPropagation(); removeImage(); }} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md text-destructive">
                        <XCircle size={24} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors"><Upload size={24} /></div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold">Click to upload mark image</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, SVG up to 2MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : tm.mark_image && (
              <div className="flex justify-center mb-6">
                <MarkInfoThumbnail markImage={tm.mark_image} label={markName} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField label="Mark Name" value={getDisplayValue('markName', markName)} name={isEditing ? 'markName' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Mark Type" value={getDisplayValue('markType', tm.markType || tm.mark_type || eipaField('mark_type'))} name={isEditing ? 'markType' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Color Indication" value={getDisplayValue('colorIndication', tm.colorIndication || tm.color_indication || eipaField('mark_color_indication'))} name={isEditing ? 'colorIndication' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t pt-4">
              <EditableField label="Goods Mark" type="checkbox" value={getDisplayValue('chk_goods', !!tm.chk_goods || !!eipaField('chk_goods'))} name={isEditing ? 'chk_goods' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Service Mark" type="checkbox" value={getDisplayValue('chk_services', !!tm.chk_services || !!eipaField('chk_services'))} name={isEditing ? 'chk_services' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Collective Mark" type="checkbox" value={getDisplayValue('chk_collective', !!tm.chk_collective || !!eipaField('chk_collective'))} name={isEditing ? 'chk_collective' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Type - Word" type="checkbox" value={getDisplayValue('type_word', !!tm.is_word || !!eipaField('type_word'))} name={isEditing ? 'type_word' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Type - Figurative" type="checkbox" value={getDisplayValue('type_figur', !!tm.is_figurative || !!eipaField('type_figur'))} name={isEditing ? 'type_figur' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Type - 3D" type="checkbox" value={getDisplayValue('type_thre', !!tm.is_three_dim || !!eipaField('type_thre'))} name={isEditing ? 'type_thre' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Type - Mixed" type="checkbox" value={getDisplayValue('k_type_mi', !!tm.is_mixed || !!eipaField('k_type_mi'))} name={isEditing ? 'k_type_mi' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
            </div>
            <EditableField label="Mark Description" type="textarea" value={getDisplayValue('markDescription', tm.mark_description || eipaField('mark_description'))} name={isEditing ? 'markDescription' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField label="Translation" value={getDisplayValue('mark_translation', eipaField('mark_translation'))} name={isEditing ? 'mark_translation' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Transliteration" value={getDisplayValue('mark_transliteration', eipaField('mark_transliteration'))} name={isEditing ? 'mark_transliteration' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Language" value={getDisplayValue('mark_language_requiring_traslation', tm.mark_language_requiring_traslation || eipaField('mark_language_requiring_translation') || eipaField('mark_language_requiring_traslation'))} name={isEditing ? 'mark_language_requiring_traslation' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="3D Features" value={getDisplayValue('mark_has_three_dim_features', eipaField('mark_has_three_dim_features'))} name={isEditing ? 'mark_has_three_dim_features' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
            </div>
          </CardContent>
        </Card>

        {/* V. Priority / Disclaimer */}
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="bg-muted/30 border-b border-border py-3">
            <div className="flex items-center gap-2"><WarningCircle size={18} className="text-primary" /><CardTitle><Typography.h4a>V. Priority / Disclaimer</Typography.h4a></CardTitle></div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField 
                label="Priority Country" 
                type="country" 
                value={getDisplayValue('priority_country', tm.priority_country || eipaField('priority_country'))} 
                name={isEditing ? 'priority_country' : undefined} 
                onChange={isEditing ? handleFieldChange : undefined} 
              />
              <EditableField 
                label="Priority Date" 
                value={isEditing 
                  ? getDisplayValue('priority_filing_date', tm.priority_filing_date || eipaField('priority_filing_date')) 
                  : safeDate(tm.priority_filing_date || eipaField('priority_filing_date'))} 
                name={isEditing ? 'priority_filing_date' : undefined} 
                onChange={isEditing ? handleFieldChange : undefined} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <EditableField 
                label="Priority Docs Attached" 
                type="checkbox" 
                value={getDisplayValue('chk_priority_accompanies', !!tm.chk_priority_accompanies || !!eipaField('chk_priority_accompanies'))} 
                name={isEditing ? 'chk_priority_accompanies' : undefined} 
                onChange={isEditing ? handleFieldChange : undefined} 
              />
              <EditableField 
                label="Submit Within 3 Months" 
                type="checkbox" 
                value={getDisplayValue('chk_priority_submitted_later', !!tm.chk_priority_submitted_later || !!eipaField('chk_priority_submitted_later'))} 
                name={isEditing ? 'chk_priority_submitted_later' : undefined} 
                onChange={isEditing ? handleFieldChange : undefined} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField label="Disclaimer (English)" value={getDisplayValue('disclaimer_text_english', tm.disclaimer_english || eipaField('disclaimer_text_english'))} name={isEditing ? 'disclaimer_text_english' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
              <EditableField label="Disclaimer (Amharic)" value={getDisplayValue('disclaimer_text_amharic', tm.disclaimer_amharic || eipaField('disclaimer_text_amharic'))} name={isEditing ? 'disclaimer_text_amharic' : undefined} onChange={isEditing ? handleFieldChange : undefined} />
            </div>
          </CardContent>
        </Card>

        {/* VI. Signature */}
        <Card className="border-border shadow-sm bg-card md:col-span-2">
          <CardHeader className="bg-muted/30 border-b border-border py-3">
            <div className="flex items-center gap-2"><IdentificationCard size={18} className="text-primary" /><CardTitle><Typography.h4a>VI. Signature</Typography.h4a></CardTitle></div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4">
              <EditableField 
                label="Day" 
                value={getDisplayValue('applicant_sign_day', tm.applicant_sign_day || eipaField('applicant_sign_day'))} 
                name={isEditing ? 'applicant_sign_day' : undefined} 
                onChange={isEditing ? handleFieldChange : undefined} 
              />
              <EditableField 
                label="Month" 
                value={getDisplayValue('applicant_sign_month', tm.applicant_sign_month || eipaField('applicant_sign_month'))} 
                name={isEditing ? 'applicant_sign_month' : undefined} 
                onChange={isEditing ? handleFieldChange : undefined} 
              />
              <EditableField 
                label="Year" 
                value={getDisplayValue('applicant_sign_year_en', tm.applicant_sign_year_en || eipaField('applicant_sign_year_en'))} 
                name={isEditing ? 'applicant_sign_year_en' : undefined} 
                onChange={isEditing ? handleFieldChange : undefined} 
              />
            </div>
          </CardContent>
        </Card>

        {/* VII. Nice Classification */}
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2"><List size={20} className="text-primary" /><CardTitle><Typography.h4>VII. Nice classification</Typography.h4></CardTitle></div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {niceClasses.length ? niceClasses.map(c => (
                <Badge key={c} variant="outline" className="px-3 py-1">Class {c}</Badge>
              )) : <span className="text-muted-foreground">—</span>}
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground">Goods & Services Description</Label>
              {isEditing ? (
                <Textarea value={getDisplayValue('goodsServices', tm.goodsServices || tm.goods_services)} onChange={(e) => handleFieldChange('goodsServices', e.target.value)} className="min-h-[150px] text-sm" />
              ) : (
                <div className="p-4 bg-muted/30 rounded-md text-sm leading-relaxed">
                  {tm.goodsServices || tm.goods_services || '—'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* VIII. Key Dates */}
        <Card className="border-border shadow-sm bg-card md:col-span-2">
          <CardHeader className="bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2"><Calendar size={20} className="text-primary" /><CardTitle><Typography.h4>VIII. Lifecycle & Key Dates</Typography.h4></CardTitle></div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <Field label="Application Date" value={safeDate(tm.applicationDate || tm.application_date)} />
              <Field label="Publication Date" value={safeDate(tm.publicationDate || tm.publication_date)} />
              <Field label="Registration Date" value={safeDate(tm.registrationDate || tm.registration_date)} />
              <Field label="Expiry Date" value={safeDate(tm.expiryDate || tm.expiry_date)} />
              <Field label="Next Renewal" value={safeDate(tm.nextRenewalDate || tm.next_renewal_date)} />
            </div>
          </CardContent>
        </Card>

        {/* IX. Renewal Information */}
        {(tm.status === 'RENEWAL' || tm.eipaForm && (tm.eipaForm as any)?.renewal_app_no || tm.renewal_app_no) && (
          <Card className="border-border shadow-sm bg-card md:col-span-2">
            <CardHeader className="bg-muted/30 border-b border-border">
              <div className="flex items-center gap-2"><FileText size={20} className="text-primary" /><CardTitle><Typography.h4>IX. Renewal Information</Typography.h4></CardTitle></div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <Field label="Original Application No." value={tm.renewal_app_no || (tm.eipaForm as any)?.renewal_app_no || '—'} />
                <Field label="Registration No." value={tm.renewal_reg_no || (tm.eipaForm as any)?.renewal_reg_no || '—'} />
                <Field label="Registration Date" value={safeDate(tm.renewal_reg_date || (tm.eipaForm as any)?.renewal_reg_date)} />
              </div>
              {(tm.renewal_sign_day || (tm.eipaForm as any)?.renewal_sign_day) && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Signature Date</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Day" value={tm.renewal_sign_day || (tm.eipaForm as any)?.renewal_sign_day || '—'} />
                    <Field label="Month" value={tm.renewal_sign_month || (tm.eipaForm as any)?.renewal_sign_month || '—'} />
                    <Field label="Year" value={tm.renewal_sign_year || (tm.eipaForm as any)?.renewal_sign_year || '—'} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="text-sm font-medium">{value || '—'}</div>
    </div>
  )
}