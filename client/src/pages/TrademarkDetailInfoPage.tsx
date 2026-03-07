import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Info } from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import type { Jurisdiction, TrademarkStatus } from '@/shared/database'

import JurisdictionBadge from '@/components/JurisdictionBadge'
import StatusPill from '@/components/StatusPill'
import { trademarkService } from '@/utils/api'
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
  priority?: string
  goodsServices?: string
  goods_services?: string
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
  return d.toLocaleDateString()
}

export default function TrademarkDetailInfoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [tm, setTm] = useState<TrademarkCaseDetail | null>(null)
  const setOverrideTitle = usePageTitleStore((state) => state.setOverrideTitle)
  const clearOverride = usePageTitleStore((state) => state.clearOverride)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const data = await trademarkService.getCase(id)
        setTm(data)
        setOverrideTitle(data.markName || data.mark_name || 'Trademark')
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => clearOverride()
  }, [id, clearOverride, setOverrideTitle])

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
      <div className="flex flex-col items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--eai-primary)] border-t-transparent" />
        <div className="text-[15px] font-bold text-[var(--eai-text-secondary)] mt-3">Loading trademark...</div>
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
            onClick={() => navigate(`/trademarks/${tm.id}`)}
            className="p-2 rounded-xl hover:bg-[var(--eai-bg)] text-[var(--eai-text-secondary)] transition-colors"
          >
            <ArrowLeft size={24} weight="bold" />
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 text-[var(--eai-text)] leading-none">{markName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-micro px-2 py-0.5 border border-[var(--eai-border)] bg-[var(--eai-primary)] text-white rounded-none uppercase">
                {filingNo}
              </span>
              <JurisdictionBadge jurisdiction={(tm.jurisdiction || 'ET') as Jurisdiction} />
              <StatusPill status={(tm.status as TrademarkStatus) || 'DRAFT'} />
            </div>
          </div>
        </div>

        <button onClick={() => navigate(`/trademarks/${tm.id}`)} className="apple-button-primary">
          Back to Case
        </button>
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
              <h4 className="text-label text-[var(--eai-text-secondary)] flex items-center gap-2">Identity</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Mark Name</Label>
                  <div className="text-body font-bold text-[var(--eai-text)]">{markName}</div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Filing Number</Label>
                  <div className="text-body font-bold text-[var(--eai-text)]">{filingNo}</div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Mark Type</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">{tm.markType || tm.mark_type || '—'}</div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Color Indication</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">{tm.colorIndication || tm.color_indication || '—'}</div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Priority</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">{tm.priority || '—'}</div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Nice Classes</Label>
                  <div className="flex flex-wrap gap-2">
                    {niceClasses.length ? (
                      niceClasses.map((c) => (
                        <span
                          key={c}
                          className="text-micro px-2 py-0.5 border border-[var(--eai-border)] bg-[var(--eai-surface)] text-[var(--eai-text)] rounded-none uppercase"
                        >
                          Class {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
              <h4 className="text-label text-[var(--eai-text-secondary)] flex items-center gap-2">Goods & Services</h4>
              <div className="space-y-4">
                {tm.niceMappings?.length ? (
                  tm.niceMappings.map((m) => (
                    <div key={m.id} className="p-4 bg-[var(--eai-bg)]/30 border border-[var(--eai-border)] rounded-none">
                      <div className="text-[11px] font-black text-[var(--eai-primary)] mb-2 uppercase tracking-tight">Class {m.classNo}</div>
                      <div className="text-body text-[var(--eai-text)] font-medium">{m.description || '—'}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-[var(--eai-bg)]/30 border border-[var(--eai-border)] rounded-none">
                    <div className="text-body text-[var(--eai-text)] font-medium">{tm.goodsServices || tm.goods_services || '—'}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
              <h4 className="text-label text-[var(--eai-text-secondary)] flex items-center gap-2">Key Dates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Application Date</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">
                    {safeDate(tm.applicationDate || tm.application_date) || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Publication Date</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">
                    {safeDate(tm.publicationDate || tm.publication_date) || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Registration Date</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">
                    {safeDate(tm.registrationDate || tm.registration_date) || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Expiry Date</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">
                    {safeDate(tm.expiryDate || tm.expiry_date) || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Next Renewal Date</Label>
                  <div className="text-body font-medium text-[var(--eai-text)]">
                    {safeDate(tm.nextRenewalDate || tm.next_renewal_date) || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>
              </div>
            </div>

            {eipa && (
              <div className="space-y-6 pt-4 border-t border-[var(--eai-border)]">
                <h4 className="text-label text-[var(--eai-text-secondary)] flex items-center gap-2">EIPA Form 01 Details</h4>

                <div className="space-y-4">
                  <div className="text-micro text-[var(--eai-text-secondary)] uppercase">IV. Mark Specification</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Goods Mark</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_goods') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Service Mark</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_services') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Collective Mark</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_collective') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Type - Word</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('type_word') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Type - Figurative</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('type_figur') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Type - Mixed</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('k_type_mi') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Type - 3D</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('type_thre') ? 'Yes' : 'No'}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Mark Description</Label>
                    <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                      {String(eipaField('mark_description') ?? '—')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Translation</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('mark_translation') ? String(eipaField('mark_translation')) : '—'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Transliteration</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('mark_transliteration') ? String(eipaField('mark_transliteration')) : '—'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Language Requiring Translation</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('mark_language_requiring_translation') ? String(eipaField('mark_language_requiring_translation')) : '—'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">3D Features Description</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('mark_has_three_dim_features') ? String(eipaField('mark_has_three_dim_features')) : '—'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Color Indication (Form)</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('mark_color_indication') ? String(eipaField('mark_color_indication')) : '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
                  <div className="text-micro text-[var(--eai-text-secondary)] uppercase">V. Disclaimer</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Amharic Disclaimer</Label>
                      <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                        {eipaField('disclaimer_text_amharic') ? String(eipaField('disclaimer_text_amharic')) : '—'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Disclaimer Text (English)</Label>
                      <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                        {eipaField('disclaimer_text_english') ? String(eipaField('disclaimer_text_english')) : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
                  <div className="text-micro text-[var(--eai-text-secondary)] uppercase">VI. Priority Right Declaration</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Priority Application Date</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('priority_application_filing_date') ? String(eipaField('priority_application_filing_date')) : '—'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Priority Filing Date</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('priority_filing_date') ? String(eipaField('priority_filing_date')) : '—'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Priority Country</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('priority_country') ? String(eipaField('priority_country')) : '—'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Priority Goods & Services</Label>
                      <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                        {eipaField('priority_goods_services') ? String(eipaField('priority_goods_services')) : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Supporting Documents: Accompanies this form</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_priority_accompanies') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Supporting Documents: Submit within 3 months</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_priority_submitted_later') ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
                  <div className="text-micro text-[var(--eai-text-secondary)] uppercase">VII. Checklist & Signature</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">3 Identical Copies of Mark</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_copies') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Statutes Governing Mark Use</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_statutes') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Power of Attorney</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_poa') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Priority Documents</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_priority_docs') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Mark Drawing (3D Features)</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_drawing') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Proof of Payment</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_payment') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Other Document(s)</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('chk_list_other') ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Other Documents Text</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('other_documents_text') ? String(eipaField('other_documents_text')) : '—'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Applicant Signature Name</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">{eipaField('applicant_signature') ? String(eipaField('applicant_signature')) : '—'}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Signed Date (Day/Month/Year)</Label>
                      <div className="text-body font-medium text-[var(--eai-text)]">
                        {eipaField('applicant_sign_day_en') || eipaField('applicant_sign_month_en') || eipaField('applicant_sign_year_en')
                          ? `${String(eipaField('applicant_sign_day_en') || '')} ${String(eipaField('applicant_sign_month_en') || '')} ${String(eipaField('applicant_sign_year_en') || '')}`.trim()
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              <h4 className="text-label text-[var(--eai-text-secondary)] flex items-center gap-2">Owner Information</h4>
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Applicant Name</Label>
                  <div className="text-body font-bold text-[var(--eai-text)]">{tm.client?.name || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Nationality</Label>
                    <div className="text-body font-medium text-[var(--eai-text)]">{tm.client?.nationality || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Telephone</Label>
                    <div className="text-body font-medium text-[var(--eai-text)]">{tm.client?.phone || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Email</Label>
                    <div className="text-body font-medium text-[var(--eai-text)]">{tm.client?.email || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Address</Label>
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
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
              <h4 className="text-label text-[var(--eai-text-secondary)] flex items-center gap-2">Instructions & Remarks</h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Client Instruction</Label>
                  <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                    {tm.clientInstructions || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-micro text-[var(--eai-text-secondary)] uppercase">Legal Remark</Label>
                  <div className="text-body text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-4 border border-[var(--eai-border)] rounded-none min-h-[72px]">
                    {tm.remark || <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
