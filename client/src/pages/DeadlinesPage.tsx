import {
  Calendar as CalendarIcon,
  CaretRight,
  Funnel,
  CaretDown,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { trademarkService } from '../utils/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"

// Country flags for jurisdictions
const JURISDICTION_FLAGS: Record<string, string> = {
  ALL: '🌍',
  ET: '🇪🇹',
  KE: '🇰🇪',
  ER: '🇪🇷',
  DJ: '🇩🇯',
  SO: '🇸🇴',
  SL: '🇸🇴',
  TZ: '🇹🇿',
  UG: '🇺🇬',
  RW: '🇷🇼',
  BI: '🇧🇮',
  SD: '🇸🇩'
}

const JURISDICTION_IMAGE_FLAGS: Record<string, string> = {
  ET: '/flags/ethiopia-flag.png',
  KE: '/flags/kenya-flag.png',
  ER: '/flags/eritrea-flag.png',
  DJ: '/flags/djibouti-flag.png',
  SO: '/flags/somalia-flag.png',
  SL: '/flags/somalia-flag.png',
  TZ: '/flags/tanzania-flag.webp',
  UG: '/flags/uganda-flag.png',
  RW: '/flags/rwanda-flag.png',
  BI: '/flags/burundi-flag.png',
}

const JURISDICTION_NAMES: Record<string, string> = {
  ALL: 'All Regions',
  ET: 'Ethiopia',
  KE: 'Kenya',
  ER: 'Eritrea',
  DJ: 'Djibouti',
  SO: 'Somalia',
  SL: 'Somaliland',
  TZ: 'Tanzania',
  UG: 'Uganda',
  RW: 'Rwanda',
  BI: 'Burundi',
  SD: 'Sudan'
}

// Jurisdiction rendering helper
const JurisdictionFlag = ({ code, className = "h-4 w-6" }: { code: string, className?: string }) => {
  const imgSrc = JURISDICTION_IMAGE_FLAGS[code];
  if (imgSrc) {
    return <img src={imgSrc} alt={code} className={`${className} object-cover rounded-sm shadow-sm`} />;
  }
  return <span className="text-[16px]">{JURISDICTION_FLAGS[code] || '🌍'}</span>;
};

export default function DeadlinesPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('ALL')
  const [deadlines, setDeadlines] = useState<Array<{ id?: string; due_date?: string; type?: string; priority?: string; case_id?: string; mark?: string; jurisdiction?: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDeadlines() {
      try {
        const cases = await trademarkService.getCases()

        // Flatten deadlines from all cases
        const allDeadlines = cases.flatMap((c: { deadlines?: Array<{ id?: string; due_date?: string; type?: string; priority?: string }>; mark_name?: string; markName?: string; jurisdiction?: string }) =>
          (c.deadlines || []).map((d: { id?: string; due_date?: string; type?: string; priority?: string }) => ({
            ...d,
            mark: c.mark_name || c.markName,
            jurisdiction: c.jurisdiction
          }))
        )
        setDeadlines(allDeadlines)
      } catch (error) {
        console.error('Failed to fetch deadlines:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDeadlines()
  }, [])

  const filteredDeadlines = filter === 'ALL'
    ? deadlines
    : deadlines.filter(d => d.jurisdiction === filter)

  if (loading) {
    return (
      <div className="w-full animate-pulse space-y-8 p-6">
        {/* Header Skeleton */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[34px] font-bold tracking-tight text-[var(--eai-text)]">Statutory Deadlines</h1>
            <p className="text-[17px] text-[var(--eai-text-secondary)] font-medium">Critical tracking for statutory oppositions and renewals.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-3 py-1.5 h-10 shadow-sm transition-all">
            <Funnel size={18} className="text-[var(--eai-text-secondary)]" />
            <div className="h-4 w-32 bg-[var(--eai-border)]/30 rounded" />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Deadlines List Skeleton */}
          <div className="apple-card overflow-hidden">
            <div className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-6 py-4 flex items-center justify-between">
              <div className="h-6 w-40 bg-[var(--eai-border)]/50 rounded" />
              <div className="h-4 w-16 bg-[var(--eai-border)]/30 rounded" />
            </div>
            <div className="divide-y divide-[var(--eai-border)]">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-6 px-6 py-5">
                  <div className="h-12 w-12 bg-[var(--eai-border)]/40 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-48 bg-[var(--eai-border)]/40 rounded" />
                    <div className="h-4 w-32 bg-[var(--eai-border)]/30 rounded" />
                  </div>
                  <div className="h-4 w-20 bg-[var(--eai-border)]/30 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <div className="apple-card p-6">
              <div className="h-6 w-32 bg-[var(--eai-border)]/50 rounded mb-4" />
              <div className="grid grid-cols-7 gap-1">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-8 bg-[var(--eai-border)]/30 rounded" />
                ))}
                {[...Array(28)].map((_, i) => (
                  <div key={i} className="h-8 bg-[var(--eai-border)]/20 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 p-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[34px] font-bold tracking-tight text-[var(--eai-text)]">Statutory Deadlines</h1>
          <p className="text-[17px] text-[var(--eai-text-secondary)] font-medium">Critical tracking for statutory oppositions and renewals.</p>
        </div>
        <div id="jurisdiction-filter">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl border border-[var(--eai-border)] bg-[var(--eai-surface)] px-3 py-1.5 h-10 tracking-tight hover:bg-[var(--eai-bg)] transition-colors shadow-sm text-[var(--eai-text)]">
                <Funnel size={18} className="text-[var(--eai-text-secondary)] mr-1" />
                <JurisdictionFlag code={filter} className="h-3.5 w-5" />
                <span className="text-[13px] font-bold ml-1 uppercase">{JURISDICTION_NAMES[filter]}</span>
                <CaretDown size={14} className="text-[var(--eai-text-secondary)] ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-[var(--eai-border)] bg-[var(--eai-surface)] shadow-xl max-h-[400px] overflow-y-auto">
              {Object.entries(JURISDICTION_NAMES).map(([code, name]) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => setFilter(code)}
                  className={`px-4 py-2.5 text-[13px] font-medium cursor-pointer flex items-center gap-3 ${filter === code ? 'bg-[var(--eai-primary)] text-white' : 'hover:bg-[var(--eai-bg)] text-[var(--eai-text)]'
                    }`}
                >
                  <JurisdictionFlag code={code} className="h-3.5 w-5" />
                  <span className={filter === code ? 'text-white' : 'text-[var(--eai-text)]'}>{name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Deadlines List */}
        <div className="space-y-4">
          <div className="apple-card overflow-hidden">
            <div className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-6 py-4 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-tight">Upcoming Deadlines</h2>
              <span className="text-[12px] font-bold text-[var(--eai-text-secondary)]">{filteredDeadlines.length} Total</span>
            </div>
            <div className="divide-y divide-[var(--eai-border)]">
              {filteredDeadlines.length > 0 ? (
                filteredDeadlines.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => navigate(`/trademarks/${d.case_id}`)}
                    className="group flex items-center gap-6 px-6 py-5 hover:bg-[var(--eai-bg)]/40 transition-colors cursor-pointer"
                  >
                    <div className={[
                      "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-none border shadow-sm transition-transform group-hover:scale-105",
                      d.priority === 'high' ? "bg-red-500/10 border-red-500/20 text-red-600" :
                        d.priority === 'medium' ? "bg-orange-500/10 border-orange-500/20 text-orange-600" :
                          "bg-[#003B5C]/10 border-[#003B5C]/20 text-[#003B5C]"
                    ].join(' ')} >
                      <span className="text-[10px] font-bold">
                        {d.due_date ? new Date(d.due_date).toLocaleDateString('en-US', { month: 'short' }) : '—'}
                      </span>
                      <span className="text-[18px] font-bold leading-none">
                        {d.due_date ? new Date(d.due_date).getDate() : '—'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[16px] font-bold tracking-tight truncate text-[var(--eai-text)]">{d.mark || 'Unnamed Mark'}</h3>
                        <span className="px-1.5 py-0.5 rounded-none bg-[var(--eai-bg)] text-[10px] font-bold text-[var(--eai-text-secondary)] border border-[var(--eai-border)]">
                          <JurisdictionFlag code={d.jurisdiction || ''} className="h-3 w-4" />
                          {d.jurisdiction}
                        </span>
                      </div>
                      <p className="text-[14px] text-[var(--eai-text-secondary)] font-medium mt-0.5">{d.type?.replace(/_/g, ' ') || '—'}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={[
                        "text-[14px] font-bold",
                        d.priority === 'high' ? "text-red-600" : "text-[var(--eai-text)]"
                      ].join(' ')} >
                        {d.due_date ? Math.ceil((new Date(d.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0} days left
                      </div>
                      <div className="text-[12px] text-[var(--eai-text-secondary)] mt-0.5">
                        {d.due_date ? new Date(d.due_date).toLocaleDateString() : '—'}
                      </div>
                    </div>

                    <CaretRight size={20} className="text-[var(--eai-border-strong)] group-hover:translate-x-1 transition-transform" />
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-[15px] text-[var(--eai-text-secondary)]">No upcoming deadlines found for this region.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Calendar/Stats */}
        <div className="space-y-6">
          <div className="apple-card p-6">
            <h3 className="text-[15px] font-bold mb-4 flex items-center gap-2 text-[var(--eai-text)]">
              <CalendarIcon size={20} weight="duotone" className="text-[var(--eai-primary)]" />
              {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="grid grid-cols-7 gap-1 text-center text-[12px]">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                <div key={day} className="font-bold text-[var(--eai-text-secondary)] py-2 uppercase">{day}</div>
              ))}
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                <div
                  key={day}
                  className={[
                    "py-2 rounded-none transition-all cursor-default",
                    day === new Date().getDate() ? "bg-[var(--eai-primary)] text-white font-bold shadow-lg shadow-[var(--eai-primary)]/20" :
                      "hover:bg-[var(--eai-bg)] text-[var(--eai-text)]"
                  ].join(' ')}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
