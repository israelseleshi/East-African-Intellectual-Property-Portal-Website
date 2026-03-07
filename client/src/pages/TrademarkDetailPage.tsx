import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CaretLeft,
  DownloadSimple,
  FileText,
  Globe,
  Info,
  DotsThree,
  ShieldCheck,
  CheckCircle,
  PencilSimple,
  WarningCircle,
  ClockCounterClockwise,
  Plus
} from '@phosphor-icons/react'

import type { TrademarkStatus, Jurisdiction } from '@/shared/database'

import JurisdictionBadge from '../components/JurisdictionBadge'
import StatusPill from '../components/StatusPill'
import WorkflowStepIndicator from '../components/WorkflowStepIndicator'
import { trademarkService, documentService } from '../utils/api'
import { usePageTitleStore } from '../store/pageTitleStore'
import { useToast } from '../components/ui/toast'
import { useConfirm } from '../components/ui/confirm-dialog'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu'

const STATUS_OPTIONS: TrademarkStatus[] = [
  'DRAFT', 'FILED', 'FORMAL_EXAM', 'SUBSTANTIVE_EXAM', 'PUBLISHED', 'REGISTERED', 'EXPIRING', 'RENEWAL'
]

export default function TrademarkDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const [mark, setMark] = useState<{
    markName?: string;
    mark_name?: string;
    filingNumber?: string;
    jurisdiction?: string;
    status?: string;
    markType?: string;
    mark_type?: string;
    colorIndication?: string;
    color_indication?: string;
    priority?: string;
    niceMappings?: Array<{ id: string; classNo: number; description?: string }>;
    assets?: Array<{ id: string; type: string }>;
    history?: Array<{ id: string; action: string; newData?: { note?: string }; createdAt: string; user?: { fullName?: string } }>;
    client?: {
      name?: string;
      addressStreet?: string;
      address_street?: string;
      city?: string;
      nationality?: string;
      email?: string;
      phone?: string;
    };
    clientInstructions?: string;
    remark?: string;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const setOverrideTitle = usePageTitleStore((state) => state.setOverrideTitle)
  const clearOverride = usePageTitleStore((state) => state.clearOverride)

  const loadMark = async () => {
    if (!id) return
    try {
      const data = await trademarkService.getCase(id)
      setMark(data)
      setOverrideTitle(data.markName || data.mark_name || 'Draft trademark')
    } catch (e) {
      console.error('Failed to load trademark details', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMark()
    return () => clearOverride()
  }, [id])

  const handleStatusUpdate = async (newStatus: TrademarkStatus) => {
    if (!id || updating) return
    
    confirm({
      title: 'Add legal note (optional)',
      description: `Add a note for this status change to ${newStatus}?`,
      onConfirm: async () => {
        setUpdating(true)
        try {
          await trademarkService.updateStatus(id, newStatus, undefined)
          await loadMark()
          setShowStatusMenu(false)
          addToast({ title: 'Status updated', type: 'success' })
        } catch (e: unknown) {
          const err = e as { response?: { data?: { error?: string } } }
          addToast({
            title: 'Failed to update status',
            description: err?.response?.data?.error || 'Please try again',
            type: 'error'
          })
        } finally {
          setUpdating(false)
        }
      }
    })
  }

  const handleGenerateDoc = async (templateName: string) => {
    if (!id) return
    
    confirm({
      title: 'Generate document?',
      description: `Confirm template name: ${templateName}`,
      onConfirm: async () => {
        try {
          const res = await documentService.generate(id, templateName);
          addToast({
            title: 'Document generated',
            description: `URL: ${res.url}`,
            type: 'success'
          })
          loadMark()
        } catch (e: unknown) {
          const err = e as { response?: { data?: { error?: string } } };
          addToast({
            title: 'Failed to generate document',
            description: err?.response?.data?.error || 'Please try again',
            type: 'error'
          })
        }
      }
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !id) return
    const file = e.target.files[0]
    try {
      await documentService.upload(file, id, 'LOGO')
      addToast({ title: 'File uploaded successfully', type: 'success' })
      loadMark()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      addToast({
        title: 'Upload failed',
        description: err?.response?.data?.error || 'Please try again',
        type: 'error'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--eai-primary)] border-t-transparent" />
      </div>
    )
  }

  if (!mark) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <WarningCircle size={48} className="text-[var(--eai-critical)]" />
        <h2 className="text-xl font-bold">Matter not found</h2>
        <button onClick={() => navigate('/trademarks')} className="apple-button-secondary">Back to trademarks</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {confirmDialog}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/trademarks')}
            className="flex h-10 w-10 items-center justify-center rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] text-[var(--eai-text-secondary)] transition-all hover:bg-[var(--eai-bg)] shadow-sm"
          >
            <CaretLeft size={20} weight="bold" />
          </button>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[var(--eai-text)] leading-none max-w-[600px] line-clamp-2">
              {mark.markName || mark.mark_name || 'Draft trademark'}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[13px] font-black text-[var(--eai-text-secondary)] tracking-tight">
                {mark.filingNumber || 'Filing pending'}
              </span>
              <span className="h-1 w-1 rounded-none bg-[var(--eai-border-strong)]" />
              <JurisdictionBadge jurisdiction={(mark.jurisdiction || 'ET') as Jurisdiction} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                disabled={updating}
                className="flex h-10 items-center gap-2 rounded-none border border-[var(--eai-primary)] bg-[var(--eai-primary)] px-4 text-[13px] font-bold text-white transition-all hover:opacity-90 shadow-lg shadow-[var(--eai-primary)]/20 tracking-tight"
              >
                <PencilSimple size={18} weight="bold" />
                <span>{updating ? 'Updating...' : 'Update status'}</span>
              </button>

              {showStatusMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 bg-[var(--eai-surface)] border border-[var(--eai-border)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 border-b border-[var(--eai-border)]">
                    <span className="text-[10px] font-black text-[var(--eai-text-secondary)] tracking-tight px-2">Transition to:</span>
                  </div>
                  {STATUS_OPTIONS.map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(status)}
                      className="w-full text-left px-4 py-2.5 text-[13px] font-bold hover:bg-[var(--eai-bg)] transition-colors flex items-center justify-between group tracking-tight"
                    >
                      <span>{status.replace('_', ' ')}</span>
                      {mark.status === status && <CheckCircle size={16} weight="fill" className="text-[var(--eai-success)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(`/case-flow/${id}`)}
              className="flex h-10 items-center gap-2 rounded-none border border-[var(--eai-primary)] bg-white px-4 text-[13px] font-bold text-[var(--eai-primary)] transition-all hover:bg-gray-50 shadow-sm tracking-tight"
            >
              <ClockCounterClockwise size={18} weight="bold" />
              <span>Manage lifecycle</span>
            </button>
          </div>

          <button className="flex h-10 items-center gap-2 rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] px-4 text-[13px] font-bold transition-all hover:bg-[var(--eai-bg)] shadow-sm tracking-tight">
            <DownloadSimple size={18} weight="bold" />
            <span>Export</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-none bg-[var(--eai-text)] text-[var(--eai-surface)] transition-all hover:opacity-90 shadow-md"
              >
                <DotsThree size={24} weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border-[var(--eai-border)] bg-[var(--eai-surface)] shadow-xl">
              <DropdownMenuItem
                onClick={() => navigate(`/trademarks/${id}/detail`)}
                className="px-4 py-2 text-label cursor-pointer hover:bg-[var(--eai-bg)] focus:bg-[var(--eai-bg)]"
              >
                Trademark detail
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate(`/case-flow/${id}?edit=true`)}
                className="px-4 py-2 text-label cursor-pointer hover:bg-[var(--eai-bg)] focus:bg-[var(--eai-bg)] border-t border-[var(--eai-border)]"
              >
                <div className="flex items-center gap-2">
                  <PencilSimple size={14} weight="bold" />
                  <span>Edit trademark</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-6">
          <div className="apple-card p-6 flex flex-col items-center gap-6">
            <div className="flex w-full items-center justify-between">
              <h3 className="text-[11px] font-black tracking-tight text-[var(--eai-text-secondary)] opacity-60">Mark asset</h3>
              <StatusPill status={(mark.status || 'DRAFT') as TrademarkStatus} />
            </div>
            <div className="relative aspect-square w-full rounded-xl border-2 border-dashed border-[var(--eai-border)] bg-[var(--eai-surface)] flex items-center justify-center group overflow-hidden">
              <div className="text-center">
                <ShieldCheck size={48} weight="duotone" className="text-[var(--eai-text-secondary)] opacity-30 mx-auto mb-2" />
                <p className="text-micro text-[var(--eai-text-secondary)] opacity-50 tracking-tight">No image</p>
              </div>
              <div className="absolute bottom-4 right-4 h-10 w-10 rounded-none bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md border border-[var(--eai-border)]">
                <Globe size={24} weight="duotone" className="text-[var(--eai-primary)]" />
              </div>
            </div>
            <div className="w-full space-y-4 pt-2">
              <div className="flex justify-between border-b border-[var(--eai-border)] pb-3">
                <span className="text-[12px] font-bold text-[var(--eai-text-secondary)] opacity-70 tracking-tight">Mark type</span>
                <span className="text-[13px] font-black tracking-tight text-[var(--eai-text)]">{mark.markType || mark.mark_type || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--eai-border)] pb-3">
                <span className="text-[12px] font-bold text-[var(--eai-text-secondary)] opacity-70 tracking-tight">Color</span>
                <span className="text-[13px] font-black tracking-tight text-[var(--eai-text)]">{mark.colorIndication || mark.color_indication || 'B&W'}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--eai-border)] pb-3">
                <span className="text-[12px] font-bold text-[var(--eai-text-secondary)] opacity-70 tracking-tight">Priority</span>
                <span className="text-[13px] font-black tracking-tight text-[var(--eai-text)]">{mark.priority || 'No'}</span>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[12px] font-bold text-[var(--eai-text-secondary)] opacity-70 tracking-tight">Nice classes</span>
                <div className="flex flex-wrap gap-1.5">
                  {mark.niceMappings?.map((c) => (
                    <span key={c.id} className="rounded-none bg-[var(--eai-primary)] text-white px-2.5 py-1 text-[11px] font-black border border-[var(--eai-primary)] shadow-sm tracking-tight">
                      Class {c.classNo}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="apple-card p-8 space-y-8">
            <div className="space-y-6">
              <h3 className="text-[11px] font-black tracking-tight text-[var(--eai-text-secondary)] opacity-60">Case status workflow</h3>
              <WorkflowStepIndicator state={
                mark.status === 'FILED' || mark.status === 'FORMAL_EXAM' ? 'FORMAL_EXAM' :
                mark.status === 'SUBSTANTIVE_EXAM' ? 'SUBSTANTIVE_EXAM' :
                mark.status === 'PUBLISHED' ? 'PUBLICATION' :
                mark.status === 'REGISTERED' ? 'REGISTRATION' :
                mark.status === 'RENEWAL' || mark.status === 'EXPIRING' ? 'RENEWAL' :
                'INTAKE'
              } />
            </div>

            <div className="space-y-6 pt-8 border-t border-[var(--eai-border)]">
              <h3 className="text-[11px] font-black tracking-tight text-[var(--eai-text-secondary)] opacity-60">Goods and services description</h3>
              <div className="space-y-4">
                {mark.niceMappings?.map((m) => (
                  <div key={m.id} className="p-4 bg-[var(--eai-bg)]/30 border border-[var(--eai-border)] rounded-none">
                    <div className="text-[11px] font-black text-[var(--eai-primary)] mb-2 tracking-tight">Class {m.classNo}</div>
                    <p className="text-[15px] leading-relaxed text-[var(--eai-text)] font-medium tracking-tight">
                      {m.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="apple-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-black flex items-center gap-2 tracking-tight">
                  <FileText size={20} weight="duotone" className="text-[var(--eai-primary)]" />
                  Documents
                </h3>
                <div className="flex items-center">
                  <label className="flex items-center gap-1.5 text-[11px] font-black text-[var(--eai-primary)] hover:opacity-70 transition-opacity cursor-pointer tracking-tight">
                    <Plus size={12} weight="bold" />
                    <span>Add file</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <button
                    onClick={() => handleGenerateDoc('form01.docx')}
                    className="flex items-center gap-1.5 text-[11px] font-black text-[var(--eai-primary)] hover:opacity-70 transition-opacity tracking-tight ml-4"
                  >
                    <FileText size={12} weight="bold" />
                    <span>Generate form 01</span>
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {(mark.assets?.length || 0) > 0 ? (
                  mark.assets?.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 bg-[var(--eai-bg)]/50 border border-[var(--eai-border)] group hover:border-[var(--eai-primary)]/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText size={20} className="text-[var(--eai-text-secondary)]" />
                        <div className="text-[13px] font-bold tracking-tight">{asset.type}</div>
                      </div>
                      <button className="text-[var(--eai-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                        <DownloadSimple size={18} weight="bold" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-[var(--eai-border)]">
                    <p className="text-[12px] text-[var(--eai-muted)] font-bold tracking-tight">No assets</p>
                  </div>
                )}
              </div>
            </div>

            <div className="apple-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-black flex items-center gap-2 tracking-tight">
                  <ClockCounterClockwise size={20} weight="duotone" className="text-[var(--eai-warning)]" />
                  Audit history
                </h3>
                <button className="text-[11px] font-black text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] transition-colors tracking-tight">Full log</button>
              </div>
              <div className="space-y-5">
                {(mark.history?.length || 0) > 0 ? (
                  mark.history?.map((log) => (
                    <div key={log.id} className="flex gap-4 relative">
                      <div className="h-2 w-2 rounded-none bg-[var(--eai-primary)] mt-2 shrink-0 shadow-[0_0_8px_rgba(0,122,255,0.4)]" />
                      <div className="flex-1 min-w-0 pb-4 border-b border-[var(--eai-border)] last:border-0 last:pb-0">
                        <div className="text-[13px] font-black leading-tight text-[var(--eai-text)] tracking-tight">{log.action}</div>
                        {log.newData?.note && <div className="text-[12px] text-[var(--eai-text)]/70 mt-1 italic tracking-tight">"{log.newData.note}"</div>}
                        <div className="text-[11px] text-[var(--eai-text-secondary)] mt-1.5 font-bold tracking-tight">
                          {new Date(log.createdAt).toLocaleString()} · {log.user?.fullName || 'System'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--eai-text-secondary)] text-[13px] font-medium opacity-60 tracking-tight">
                    Initial intake record.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="apple-card p-6 space-y-6">
              <h3 className="text-[15px] font-black flex items-center gap-2 tracking-tight">
                <Info size={20} weight="duotone" className="text-[var(--eai-primary)]" />
                Owner information
              </h3>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="text-[11px] text-[var(--eai-text-secondary)] font-bold tracking-tight">Applicant name</div>
                  <div className="text-[16px] font-black leading-tight text-[var(--eai-text)] tracking-tight">{mark.client?.name || 'Name pending'}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] text-[var(--eai-text-secondary)] font-bold tracking-tight">Address</div>
                  <div className="text-[13px] font-medium text-[var(--eai-text)] tracking-tight">
                    {mark.client?.addressStreet || mark.client?.address_street || '—'}, {mark.client?.city || '—'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] text-[var(--eai-text-secondary)] font-bold tracking-tight">Nationality</div>
                  <div className="text-[13px] font-medium text-[var(--eai-text)] tracking-tight">
                    {mark.client?.nationality ? (
                      <span className="text-micro px-2 py-0.5 border border-[var(--eai-border)] bg-[var(--eai-surface)] text-[var(--eai-text)] rounded-none">
                        {mark.client.nationality}
                      </span>
                    ) : (
                      <span className="text-[var(--eai-text-secondary)] opacity-50">—</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 pt-2 border-t border-[var(--eai-border)] mt-4">
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-[var(--eai-text-secondary)] font-bold tracking-tight">Email</div>
                    <div className="text-[13px] font-black text-[var(--eai-text)] opacity-90 tracking-tight truncate">{mark.client?.email || '—'}</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-[var(--eai-text-secondary)] font-bold tracking-tight">Telephone</div>
                    <div className="text-[13px] font-black text-[var(--eai-text)] opacity-90 tracking-tight">{mark.client?.phone || '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="apple-card p-6 space-y-6">
              <h3 className="text-[15px] font-black flex items-center gap-2 tracking-tight">
                <PencilSimple size={20} weight="duotone" className="text-[var(--eai-primary)]" />
                Instructions & remarks
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="text-[11px] text-[var(--eai-text-secondary)] font-bold tracking-tight">Client instruction</div>
                  <div className="text-[13px] text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-3 border border-[var(--eai-border)] min-h-[60px]">
                    {mark.clientInstructions || 'No specific instructions provided.'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] text-[var(--eai-text-secondary)] font-bold tracking-tight">Legal remark</div>
                  <div className="text-[13px] text-[var(--eai-text)] bg-[var(--eai-bg)]/50 p-3 border border-[var(--eai-border)] min-h-[60px]">
                    {mark.remark || 'Internal notes...'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
