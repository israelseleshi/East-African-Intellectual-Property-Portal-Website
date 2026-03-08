import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, FileText, Info, PencilSimple, X, ClockCounterClockwise, DownloadSimple } from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { Jurisdiction, TrademarkStatus } from '@/shared/database'

import JurisdictionBadge from '@/components/JurisdictionBadge'
import StatusPill from '@/components/StatusPill'
import NiceClassPicker from '@/components/NiceClassPicker'
import { CaseNotesTab } from '../components/CaseNotesTab'
import { trademarkService, api } from '@/utils/api'
import { usePageTitleStore } from '@/store/pageTitleStore'

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

  clientInstructions?: string
  client_instructions?: string
  remark?: string

  client?: {
    name?: string
    addressStreet?: string
    address_street?: string
    city?: string
    nationality?: string
    email?: string
    phone?: string
  }

  eipaForm?: Record<string, unknown> | null
}

function safeDate(value?: string) {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toLocaleDateString('en-US')
}

export default function TrademarkDetailInfoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [tm, setTm] = useState<TrademarkCaseDetail | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<TrademarkCaseDetail>>({})
  const setOverrideTitle = usePageTitleStore((state) => state.setOverrideTitle)
  const clearOverride = usePageTitleStore((state) => state.clearOverride)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const data = await trademarkService.getCase(id)
        setTm(data)
        setEditData(data)
        setOverrideTitle(data.markName || data.mark_name || 'Trademark')
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => clearOverride()
  }, [id, clearOverride, setOverrideTitle])

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edit - revert to original data
      setEditData(tm || {})
    }
    setIsEditing(!isEditing)
  }

  const handleInputChange = (field: keyof TrademarkCaseDetail, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const handleEipaFieldChange = (key: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      eipaForm: {
        ...(prev.eipaForm as Record<string, unknown> || {}),
        [key]: value
      }
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const payload = {
        markName: editData.markName || editData.mark_name,
        markType: editData.markType || editData.mark_type,
        colorIndication: editData.colorIndication || editData.color_indication,
        priority: editData.priority,
        filingNumber: editData.filingNumber || editData.filing_number,
        niceClasses: editData.niceClasses,
        goodsServices: editData.goodsServices || editData.goods_services,
        clientInstructions: editData.clientInstructions,
        remark: editData.remark,
        client: editData.client,
        eipaForm: editData.eipaForm,
        mark_image: editData.mark_image
      };

      await api.patch(`/cases/${id}`, payload);
      
      const updatedData = await trademarkService.getCase(id!);
      setTm(updatedData);
      setEditData(updatedData);
      setIsEditing(false);
      
      addToast({
        title: 'Changes saved',
        description: 'Trademark details updated successfully.',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Failed to save changes:', error);
      addToast({
        title: 'Save failed',
        description: error?.response?.data?.error || 'Could not update trademark details.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }

  const handleNiceClassesChange = (value: string) => {
    const classes = value.split(',')
      .map(v => parseInt(v.trim()))
      .filter(v => !isNaN(v));
    handleInputChange('niceClasses', classes);
  }

  const renderEditableSelect = (key: string, currentValue: any) => {
    const val = currentValue ? 'YES' : 'NO';
    return (
      <Select
        value={val}
        onValueChange={(newVal: string) => handleEipaFieldChange(key, newVal === 'YES')}
      >
        <SelectTrigger className="h-8 apple-input">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="YES">Yes</SelectItem>
          <SelectItem value="NO">No</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  const markName = tm?.markName || tm?.mark_name || tm?.wordMark || '—'
  const filingNo = tm?.filingNumber || tm?.filing_number || '—'

  const niceClasses = useMemo(() => {
    if (tm?.niceMappings?.length) return tm.niceMappings.map((m) => m.classNo)
    if (tm?.niceClasses?.length) return tm.niceClasses
    return []
  }, [tm?.niceMappings, tm?.niceClasses])

  const eipa = (tm?.eipaForm || null) as Record<string, unknown> | null
  const eipaField = (key: string) => {
    const v = eipa?.[key]
    if (v === null || v === undefined || v === '') return null
    return v
  }

  if (loading) {
    return (
      <div className="w-full space-y-8">
        <header className="flex items-end justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {[1, 2].map((i) => (
            <Card key={i} className="apple-card border-none shadow-lg">
              <CardHeader className="border-b border-[var(--eai-border)]">
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-32 mx-auto" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <div key={j} className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
                  <Skeleton className="h-4 w-40 mx-auto" />
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!tm) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-[18px] font-bold text-[var(--eai-text)] tracking-tight">Trademark not found</div>
        <button onClick={() => navigate('/trademarks')} className="mt-4 apple-button-primary">
          Back to Trademarks
        </button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <header className="flex items-end justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/trademarks')}
            className="p-2 rounded-xl hover:bg-[var(--eai-bg)] text-[var(--eai-text-secondary)] transition-colors"
            title="Back to Docket"
          >
            <ArrowLeft size={24} weight="bold" />
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 text-[var(--eai-text)] leading-none">{markName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-micro px-2 py-0.5 border border-[var(--eai-border)] bg-[var(--eai-primary)] text-white rounded-none">
                {filingNo}
              </span>
              <JurisdictionBadge jurisdiction={(tm.jurisdiction || 'ET') as Jurisdiction} />
              <StatusPill status={(tm.status as TrademarkStatus) || 'DRAFT'} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="apple-button-primary flex items-center gap-2 rounded-xl"
              >
                <Check size={18} weight="bold" />
                <span>Save Changes</span>
              </button>
              <button
                onClick={handleEditToggle}
                className="apple-button-secondary flex items-center gap-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-xl"
              >
                <X size={18} weight="bold" />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate(`/case-flow/${tm.id}`)}
                className="flex h-10 items-center gap-2 rounded-xl border border-[var(--eai-primary)] bg-white px-4 text-[13px] font-bold text-[var(--eai-primary)] transition-all hover:bg-gray-50 shadow-sm tracking-tight"
              >
                <ClockCounterClockwise size={18} weight="bold" />
                <span>Manage lifecycle</span>
              </button>
              <button className="flex h-10 items-center gap-2 rounded-xl border border-[var(--eai-primary)] bg-white px-4 text-[13px] font-bold text-[var(--eai-primary)] transition-all hover:bg-gray-50 shadow-sm tracking-tight">
                <DownloadSimple size={18} weight="bold" />
                <span>Export</span>
              </button>
              <button
                onClick={handleEditToggle}
                className="flex h-10 items-center gap-2 rounded-xl border border-[var(--eai-primary)] bg-white px-4 text-[13px] font-bold text-[var(--eai-primary)] transition-all hover:bg-gray-50 shadow-sm tracking-tight"
              >
                <PencilSimple size={18} weight="bold" />
                <span>Edit Case</span>
              </button>
            </>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="apple-card border-none shadow-lg overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--eai-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30">
            <CardTitle className="text-h3 text-[var(--eai-text)] flex items-center gap-2">
              <FileText size={20} className="text-[var(--eai-primary)]" weight="duotone" />
              Trademark Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="space-y-4">
              <h4 className="text-h3 text-[var(--eai-text-secondary)] text-center font-bold tracking-tight pb-2 border-b border-[var(--eai-border)]">Identity</h4>
              {tm.mark_image && (
                <div className="flex justify-center mb-6">
                  <div className="w-48 h-48 border border-[var(--eai-border)] rounded-xl overflow-hidden flex items-center justify-center p-2 shadow-sm group/image relative">
                     <img 
                       src={
                         (isEditing && editData.mark_image?.startsWith('data:')) 
                           ? editData.mark_image 
                           : (() => {
                               const imgPath = tm.mark_image || '';
                               if (imgPath.startsWith('http')) return imgPath;
                               if (imgPath.startsWith('data:')) return imgPath;
                               // Always route through /api/ for Passenger to reach the Node.js backend
                               const base = import.meta.env.PROD 
                                 ? window.location.origin 
                                 : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');
                               // If path already starts with /api, use as-is; otherwise prepend /api
                               const apiPath = imgPath.startsWith('/api') ? imgPath : `/api${imgPath}`;
                               return `${base}${apiPath}`;
                             })()
                       } 
                       alt="Mark Logo" 
                       className="max-w-full max-h-full object-contain" 
                       onError={(e) => {
                         const img = e.currentTarget;
                         // Avoid infinite retry loops
                         if (img.dataset.retried) return;
                         img.dataset.retried = 'true';
                         console.warn('[Image] Failed to load mark image, path:', tm.mark_image);
                       }}
                     />
                     {isEditing && (
                       <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity cursor-pointer">
                         <PencilSimple size={24} className="text-white mb-1" weight="bold" />
                         <span className="text-[10px] text-white font-bold tracking-widest">Change image</span>
                         <input 
                           type="file" 
                           className="hidden" 
                           accept="image/*"
                           onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const reader = new FileReader();
                               reader.onloadend = () => {
                                 const base64String = reader.result as string;
                                 handleInputChange('mark_image', base64String);
                                 // Also update the local view immediately if needed, 
                                 // but handleInputChange will trigger a re-render with editData
                               };
                               reader.readAsDataURL(file);
                             }
                           }}
                         />
                       </label>
                     )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Mark name</Label>
                  {isEditing ? (
                    <Input
                      value={editData.markName || editData.mark_name || ''}
                      onChange={(e) => handleInputChange('markName', e.target.value)}
                      className="apple-input h-8 text-body font-bold"
                    />
                  ) : (
                    <div className="text-body font-bold text-[var(--eai-text)]">{markName}</div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Filing number</Label>
                  {isEditing ? (
                    <Input
                      value={editData.filingNumber || editData.filing_number || ''}
                      onChange={(e) => handleInputChange('filingNumber', e.target.value)}
                      className="apple-input h-8 text-body font-bold"
                    />
                  ) : (
                    <div className="text-body font-bold text-[var(--eai-text)]">{filingNo}</div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Mark type</Label>
                  {isEditing ? (
                    <Input
                      value={editData.markType || editData.mark_type || ''}
                      onChange={(e) => handleInputChange('markType', e.target.value)}
                      className="apple-input h-8 text-body font-medium"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{tm.markType || tm.mark_type || '—'}</div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Color indication</Label>
                  {isEditing ? (
                    <Input
                      value={editData.colorIndication || editData.color_indication || ''}
                      onChange={(e) => handleInputChange('colorIndication', e.target.value)}
                      className="apple-input h-8 text-body font-medium"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{tm.colorIndication || tm.color_indication || '—'}</div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Priority</Label>
                  {isEditing ? (
                    <Input
                      value={editData.priority || ''}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="apple-input h-8 text-body font-medium"
                    />
                  ) : (
                    <div className="text-body font-medium text-[var(--eai-text)]">{tm.priority || '—'}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
              <h4 className="text-h3 text-[var(--eai-text-secondary)] text-center font-bold tracking-tight pb-2 border-b border-[var(--eai-border)]">Nice Classes</h4>
              <div className="flex flex-col gap-2">
                {isEditing ? (
                  <NiceClassPicker
                    selectedClasses={editData.niceClasses || []}
                    onChange={(classes) => handleInputChange('niceClasses', classes)}
                    placeholder="Select Nice classes..."
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {niceClasses.length ? (
                      niceClasses.map((c) => (
                        <span
                          key={c}
                          className="text-micro px-2 py-0.5 border border-[var(--eai-border)] bg-[var(--eai-surface)] text-[var(--eai-text)] rounded-none"
                        >
                          Class {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
              <h4 className="text-h3 text-[var(--eai-text-secondary)] text-center font-bold tracking-tight pb-2 border-b border-[var(--eai-border)]">Goods & Services</h4>
              <div className="space-y-4">
                {isEditing ? (
                  <Textarea
                    value={editData.goodsServices || editData.goods_services || ''}
                    onChange={(e) => handleInputChange('goodsServices', e.target.value)}
                    className="apple-input text-body min-h-[100px]"
                    placeholder="Enter goods and services description..."
                  />
                ) : (
                  <>
                    {tm.niceMappings?.length ? (
                      tm.niceMappings.map((m) => (
                        <div key={m.id} className="p-4 bg-[var(--eai-bg)]/30 border border-[var(--eai-border)] rounded-none">
                          <div className="text-[11px] font-black text-[var(--eai-primary)] mb-2 tracking-tight">Class {m.classNo}</div>
                          <div className="text-body text-[var(--eai-text)] font-medium">{m.description || '—'}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-[var(--eai-bg)]/30 border border-[var(--eai-border)] rounded-none">
                        <div className="text-body text-[var(--eai-text)] font-medium">{tm.goodsServices || tm.goods_services || '—'}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
              <h4 className="text-h3 text-[var(--eai-text-secondary)] text-center font-bold tracking-tight pb-2 border-b border-[var(--eai-border)]">Key Dates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Application date</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">
                    {safeDate(tm.applicationDate || tm.application_date) || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Publication date</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">
                    {safeDate(tm.publicationDate || tm.publication_date) || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Registration date</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">
                    {safeDate(tm.registrationDate || tm.registration_date) || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Expiry date</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">
                    {safeDate(tm.expiryDate || tm.expiry_date) || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Next renewal date</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">
                    {safeDate(tm.nextRenewalDate || tm.next_renewal_date) || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Automated Form Detail Sections - Full specification sections */}
            <div className="space-y-6 pt-4 border-t border-[var(--eai-border)]">
                <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
                  <h4 className="text-h3 text-[var(--eai-text-secondary)] text-center font-bold tracking-tight pb-2 border-b border-[var(--eai-border)]">IV. Mark specification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Goods mark</Label>
                      {isEditing ? renderEditableSelect('chk_goods', eipaField('chk_goods')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_goods') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Service mark</Label>
                      {isEditing ? renderEditableSelect('chk_services', eipaField('chk_services')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_services') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Collective mark</Label>
                      {isEditing ? renderEditableSelect('chk_collective', eipaField('chk_collective')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_collective') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Type - word</Label>
                      {isEditing ? renderEditableSelect('type_word', eipaField('type_word')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('type_word') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Type - figurative</Label>
                      {isEditing ? renderEditableSelect('type_figur', eipaField('type_figur')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('type_figur') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Type - mixed</Label>
                      {isEditing ? renderEditableSelect('k_type_mi', eipaField('k_type_mi')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('k_type_mi') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Type - 3D</Label>
                      {isEditing ? renderEditableSelect('type_thre', eipaField('type_thre')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('type_thre') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-micro text-[var(--eai-text-secondary)]">Mark description</Label>
                    {isEditing ? (
                      <Textarea
                        value={String((editData.eipaForm as Record<string, unknown>)?.['mark_description'] ?? '')}
                        onChange={(e) => handleEipaFieldChange('mark_description', e.target.value)}
                        className="apple-input text-body min-h-[72px]"
                      />
                    ) : (
                      <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                        {String(eipaField('mark_description') || tm?.mark_description || '—')}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Translation</Label>
                      {isEditing ? (
                        <Input
                          value={String(eipaField('mark_translation') || '')}
                          onChange={(e) => handleEipaFieldChange('mark_translation', e.target.value)}
                          className="apple-input h-8 text-body font-medium"
                        />
                      ) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('mark_translation') ? String(eipaField('mark_translation')) : '—'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Transliteration</Label>
                      {isEditing ? (
                        <Input
                          value={String(eipaField('mark_transliteration') || '')}
                          onChange={(e) => handleEipaFieldChange('mark_transliteration', e.target.value)}
                          className="apple-input h-8 text-body font-medium"
                        />
                      ) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('mark_transliteration') ? String(eipaField('mark_transliteration')) : '—'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Language requiring translation</Label>
                      {isEditing ? (
                        <Input
                          value={String(eipaField('mark_language_requiring_translation') || '')}
                          onChange={(e) => handleEipaFieldChange('mark_language_requiring_translation', e.target.value)}
                          className="apple-input h-8 text-body font-medium"
                        />
                      ) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('mark_language_requiring_translation') ? String(eipaField('mark_language_requiring_translation')) : '—'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">3D features description</Label>
                      {isEditing ? (
                        <Textarea
                          value={String(eipaField('mark_has_three_dim_features') || '')}
                          onChange={(e) => handleEipaFieldChange('mark_has_three_dim_features', e.target.value)}
                          className="apple-input text-body min-h-[72px]"
                        />
                      ) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('mark_has_three_dim_features') ? String(eipaField('mark_has_three_dim_features')) : '—'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Color indication (Form)</Label>
                      {isEditing ? (
                        <Input
                          value={String(eipaField('mark_color_indication') || '')}
                          onChange={(e) => handleEipaFieldChange('mark_color_indication', e.target.value)}
                          className="apple-input h-8 text-body font-medium"
                        />
                      ) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('mark_color_indication') ? String(eipaField('mark_color_indication')) : '—'}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
                  <h4 className="text-h3 text-[var(--eai-text-secondary)] text-center font-bold tracking-tight pb-2 border-b border-[var(--eai-border)]">V. Disclaimer</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Amharic disclaimer</Label>
                      {isEditing ? (
                        <Textarea
                          value={String((editData.eipaForm as Record<string, unknown>)?.['disclaimer_text_amharic'] ?? '')}
                          onChange={(e) => handleEipaFieldChange('disclaimer_text_amharic', e.target.value)}
                          className="apple-input text-body min-h-[72px]"
                        />
                      ) : (
                        <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                          {eipaField('disclaimer_text_amharic') ? String(eipaField('disclaimer_text_amharic')) : '—'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Disclaimer text (English)</Label>
                      {isEditing ? (
                        <Textarea
                          value={String((editData.eipaForm as Record<string, unknown>)?.['disclaimer_text_english'] ?? '')}
                          onChange={(e) => handleEipaFieldChange('disclaimer_text_english', e.target.value)}
                          className="apple-input text-body min-h-[72px]"
                        />
                      ) : (
                        <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                          {eipaField('disclaimer_text_english') ? String(eipaField('disclaimer_text_english')) : '—'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
                  <h4 className="text-h3 text-[var(--eai-text-secondary)] text-center font-bold tracking-tight pb-2 border-b border-[var(--eai-border)]">VI. Priority right declaration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Priority application date</Label>
                      {isEditing ? (
                        <Input
                          value={String(eipaField('priority_application_filing_date') || '')}
                          onChange={(e) => handleEipaFieldChange('priority_application_filing_date', e.target.value)}
                          className="apple-input h-8 text-body font-medium"
                        />
                      ) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('priority_application_filing_date') ? String(eipaField('priority_application_filing_date')) : '—'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Priority filing date</Label>
                      {isEditing ? (
                        <Input
                          value={String(eipaField('priority_filing_date') || '')}
                          onChange={(e) => handleEipaFieldChange('priority_filing_date', e.target.value)}
                          className="apple-input h-8 text-body font-medium"
                        />
                      ) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('priority_filing_date') ? String(eipaField('priority_filing_date')) : '—'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Priority country</Label>
                      {isEditing ? (
                        <Input
                          value={String(eipaField('priority_country') || '')}
                          onChange={(e) => handleEipaFieldChange('priority_country', e.target.value)}
                          className="apple-input h-8 text-body font-medium"
                        />
                      ) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('priority_country') ? String(eipaField('priority_country')) : '—'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Priority goods & services</Label>
                      {isEditing ? (
                        <Textarea
                          value={String(eipaField('priority_goods_services') || '')}
                          onChange={(e) => handleEipaFieldChange('priority_goods_services', e.target.value)}
                          className="apple-input text-body min-h-[72px]"
                        />
                      ) : (
                        <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                          {eipaField('priority_goods_services') ? String(eipaField('priority_goods_services')) : '—'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Supporting documents: Accompanies this form</Label>
                      {isEditing ? renderEditableSelect('chk_priority_accompanies', eipaField('chk_priority_accompanies')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_priority_accompanies') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Supporting documents: Submit within 3 months</Label>
                      {isEditing ? renderEditableSelect('chk_priority_submitted_later', eipaField('chk_priority_submitted_later')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_priority_submitted_later') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
                  <h4 className="text-h3 text-[var(--eai-text-secondary)] text-center font-bold tracking-tight pb-2 border-b border-[var(--eai-border)]">VII. Checklist & signature</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">3 identical copies of mark</Label>
                      {isEditing ? renderEditableSelect('chk_list_copies', eipaField('chk_list_copies')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_copies') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Statutes governing mark use</Label>
                      {isEditing ? renderEditableSelect('chk_list_statutes', eipaField('chk_list_statutes')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_statutes') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Power of attorney</Label>
                      {isEditing ? renderEditableSelect('chk_list_poa', eipaField('chk_list_poa')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_poa') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Priority documents</Label>
                      {isEditing ? renderEditableSelect('chk_list_priority_docs', eipaField('chk_list_priority_docs')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_priority_docs') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Mark drawing (3D features)</Label>
                      {isEditing ? renderEditableSelect('chk_list_drawing', eipaField('chk_list_drawing')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_drawing') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Proof of payment</Label>
                      {isEditing ? renderEditableSelect('chk_list_payment', eipaField('chk_list_payment')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_payment') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Other document(s)</Label>
                      {isEditing ? renderEditableSelect('chk_list_other', eipaField('chk_list_other')) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_other') ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Other documents text</Label>
                      {isEditing ? (
                        <Input
                          value={String(eipaField('other_documents_text') || '')}
                          onChange={(e) => handleEipaFieldChange('other_documents_text', e.target.value)}
                          className="apple-input h-8 text-body font-medium"
                        />
                      ) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('other_documents_text') ? String(eipaField('other_documents_text')) : '—'}</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Applicant signature name</Label>
                      {isEditing ? (
                        <Input
                          value={String(eipaField('applicant_signature') || '')}
                          onChange={(e) => handleEipaFieldChange('applicant_signature', e.target.value)}
                          className="apple-input h-8 text-body font-medium"
                        />
                      ) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('applicant_signature') ? String(eipaField('applicant_signature')) : '—'}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)]">Signed date (Day/Month/Year)</Label>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Day"
                            value={String(eipaField('applicant_sign_day_en') || '')}
                            onChange={(e) => handleEipaFieldChange('applicant_sign_day_en', e.target.value)}
                            className="apple-input h-8 text-body font-medium w-16"
                          />
                          <Input
                            placeholder="Month"
                            value={String(eipaField('applicant_sign_month_en') || '')}
                            onChange={(e) => handleEipaFieldChange('applicant_sign_month_en', e.target.value)}
                            className="apple-input h-8 text-body font-medium w-24"
                          />
                          <Input
                            placeholder="Year"
                            value={String(eipaField('applicant_sign_year_en') || '')}
                            onChange={(e) => handleEipaFieldChange('applicant_sign_year_en', e.target.value)}
                            className="apple-input h-8 text-body font-medium w-20"
                          />
                        </div>
                      ) : (
                        <div className="text-body font-medium text-[var(--eai-text)]">
                          {eipaField('applicant_sign_day_en') || eipaField('applicant_sign_month_en') || eipaField('applicant_sign_year_en')
                            ? `${String(eipaField('applicant_sign_day_en') || '')} ${String(eipaField('applicant_sign_month_en') || '')} ${String(eipaField('applicant_sign_year_en') || '')}`.trim()
                            : '—'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          </CardContent>
        </Card>

        <Card className="apple-card border-none shadow-lg overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--eai-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30">
            <CardTitle className="text-h3 text-[var(--eai-text)] flex items-center gap-2">
              <Info size={20} className="text-[var(--eai-primary)]" weight="duotone" />
              Owner & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="space-y-4">
              <h4 className="text-h3 text-[var(--eai-text-secondary)] text-center font-bold tracking-tight pb-2 border-b border-[var(--eai-border)]">Owner Information</h4>
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Applicant name</Label>
                  {isEditing ? (
                    <Input
                      value={editData.client?.name || ''}
                      onChange={(e) => handleInputChange('client', { ...editData.client, name: e.target.value })}
                      className="apple-input h-8 text-body font-bold"
                    />
                  ) : (
                    <div className="text-body font-bold text-[var(--eai-text)]">{tm.client?.name || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}</div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-micro text-[var(--eai-text-secondary)]">Nationality</Label>
                    {isEditing ? (
                      <Input
                        value={editData.client?.nationality || ''}
                        onChange={(e) => handleInputChange('client', { ...editData.client, nationality: e.target.value })}
                        className="apple-input h-8 text-body font-medium"
                      />
                    ) : (
                      <div className="text-body font-medium text-[var(--eai-text)]">{tm.client?.nationality || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}</div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-micro text-[var(--eai-text-secondary)]">Telephone</Label>
                    {isEditing ? (
                      <Input
                        value={editData.client?.phone || ''}
                        onChange={(e) => handleInputChange('client', { ...editData.client, phone: e.target.value })}
                        className="apple-input h-8 text-body font-medium"
                      />
                    ) : (
                      <div className="text-body font-medium text-[var(--eai-text)]">{tm.client?.phone || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}</div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-micro text-[var(--eai-text-secondary)]">Email</Label>
                    {isEditing ? (
                      <Input
                        value={editData.client?.email || ''}
                        onChange={(e) => handleInputChange('client', { ...editData.client, email: e.target.value })}
                        className="apple-input h-8 text-body font-medium"
                      />
                    ) : (
                      <div className="text-body font-medium text-[var(--eai-text)]">{tm.client?.email || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}</div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-micro text-[var(--eai-text-secondary)]">Address</Label>
                    {isEditing ? (
                      <Input
                        value={`${editData.client?.addressStreet || editData.client?.address_street || ''}${editData.client?.city ? ', ' + editData.client.city : ''}`}
                        onChange={(e) => {
                          const parts = e.target.value.split(',');
                          handleInputChange('client', { 
                            ...editData.client, 
                            addressStreet: parts[0]?.trim(), 
                            city: parts[1]?.trim() 
                          })
                        }}
                        className="apple-input h-8 text-body font-medium"
                        placeholder="Street, City"
                      />
                    ) : (
                      <div className="text-body font-medium text-[var(--eai-text)]">
                        {tm.client?.addressStreet || tm.client?.address_street ? (
                          <span>
                            {tm.client?.addressStreet || tm.client?.address_street}
                            {tm.client?.city ? `, ${tm.client.city}` : ''}
                          </span>
                        ) : (
                          <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
              <h4 className="text-h3 text-[var(--eai-text-secondary)] text-center font-bold tracking-tight pb-2 border-b border-[var(--eai-border)]">Instructions & Remarks</h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Client instruction</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.clientInstructions || ''}
                      onChange={(e) => handleInputChange('clientInstructions', e.target.value)}
                      className="apple-input text-body min-h-[72px]"
                    />
                  ) : (
                    <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                      {tm.clientInstructions || tm.client_instructions || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Legal remark</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.remark || ''}
                      onChange={(e) => handleInputChange('remark', e.target.value)}
                      className="apple-input text-body min-h-[72px]"
                    />
                  ) : (
                    <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                      {tm.remark || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
              <h4 className="text-h3 text-[var(--eai-text-secondary)] text-center font-bold tracking-tight pb-2 border-b border-[var(--eai-border)] uppercase">Legal Timeline & Notes</h4>
              <CaseNotesTab caseId={id!} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
