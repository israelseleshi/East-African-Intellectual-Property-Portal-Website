import {
  Calendar as CalendarIcon,
  Warning,
  CaretRight,
  Bell,
  Funnel,
  ArrowSquareOut
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { trademarkService } from '../utils/api'
import { useToast } from '../components/ui/toast'

export default function DeadlinesPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-[var(--eai-border)]/50 rounded-lg" />
            <div className="h-5 w-96 bg-[var(--eai-border)]/30 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-[var(--eai-border)]/50 rounded-xl" />
            <div className="h-10 w-32 bg-[var(--eai-border)]/50 rounded-xl" />
            <div className="h-10 w-40 bg-[var(--eai-border)]/50 rounded-xl" />
          </div>
        </div>

        {/* Content Grid Skeleton */}
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
            <div className="apple-card p-6">
              <div className="h-6 w-40 bg-[var(--eai-border)]/50 rounded mb-4" />
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-32 bg-[var(--eai-border)]/30 rounded" />
                    <div className="h-4 w-8 bg-[var(--eai-border)]/40 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[34px] font-bold tracking-tight text-[var(--eai-text)]">Statutory Deadlines</h1>
          <p className="text-[17px] text-[var(--eai-text-secondary)]">Critical tracking for statutory oppositions and renewals.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] px-3 py-1.5 h-10 shadow-sm transition-all hover:bg-[var(--eai-bg)]">
            <Funnel size={18} className="text-[var(--eai-text-secondary)]" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent text-[13px] font-medium outline-none cursor-pointer"
            >
              <option value="ALL">All Regions</option>
              <option value="ET">Ethiopia</option>
              <option value="KE">Kenya</option>
            </select>
          </div>
          <button
            onClick={() => addToast({ title: 'Alert settings updated', description: 'Priority-only alerts enabled', type: 'success' })}
            className="apple-button-primary flex items-center gap-2"
          >
            <Bell size={18} weight="fill" />
            <span>Manage Alerts</span>
          </button>

          <a
            href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 h-10 rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] px-4 text-[13px] font-bold transition-all hover:bg-[var(--eai-bg)] shadow-sm text-[var(--eai-text)]"
          >
            <CalendarIcon size={18} weight="bold" />
            <span>Subscribe (Google Cal)</span>
          </a>
        </div>
      </header >

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Deadlines List */}
        <div className="space-y-4">
          <div className="apple-card overflow-hidden">
            <div className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-6 py-4 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-tight">Upcoming Deadlines</h2>
              <span className="text-[12px] font-bold text-[var(--eai-text-secondary)] uppercase tracking-widest">{filteredDeadlines.length} Total</span>
            </div>
            <div className="divide-y divide-[var(--eai-border)]">
              {filteredDeadlines.map((d) => (
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
                  ].join(' ')}>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">
                      {d.due_date ? new Date(d.due_date).toLocaleDateString('en-US', { month: 'short' }) : '—'}
                    </span>
                    <span className="text-[18px] font-bold leading-none">
                      {d.due_date ? new Date(d.due_date).getDate() : '—'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Using mark_name from the aliased mark field in flatMap */}
                      <h3 className="text-[16px] font-bold tracking-tight truncate">{d.mark || 'Unnamed Mark'}</h3>
                      <span className="px-1.5 py-0.5 rounded-none bg-[var(--eai-bg)] text-[10px] font-bold text-[var(--eai-text-secondary)] border border-[var(--eai-border)] uppercase">
                        {d.jurisdiction}
                      </span>
                    </div>
                    <p className="text-[14px] text-[var(--eai-text-secondary)] font-medium mt-0.5">{d.type?.replace(/_/g, ' ') || '—'}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={[
                      "text-[14px] font-bold",
                      d.priority === 'high' ? "text-red-600" : "text-[var(--eai-text)]"
                    ].join(' ')}>
                      {d.due_date ? Math.ceil((new Date(d.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0} days left
                    </div>
                    <div className="text-[12px] text-[var(--eai-text-secondary)] mt-0.5">
                      {d.due_date ? new Date(d.due_date).toLocaleDateString() : '—'}
                    </div>
                  </div>

                  <CaretRight size={20} className="text-[var(--eai-border-strong)] group-hover:translate-x-1 transition-transform" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Calendar/Stats */}
        <div className="space-y-6">
          <div className="apple-card p-6">
            <h3 className="text-[15px] font-bold mb-4 flex items-center gap-2 text-[var(--eai-text)]">
              <CalendarIcon size={20} weight="duotone" className="text-[var(--eai-primary)]" />
              February 2026
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
                    day === 14 ? "bg-[var(--eai-primary)] text-white font-bold shadow-lg shadow-[var(--eai-primary)]/20" :
                      day === 16 ? "bg-red-500/10 text-red-600 font-bold ring-1 ring-inset ring-red-500/20" :
                        "hover:bg-[var(--eai-bg)] text-[var(--eai-text)]"
                  ].join(' ')}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          <div className="apple-card p-6 bg-gradient-to-br from-[var(--eai-surface)] to-[var(--eai-bg)] border-l-4 border-l-[var(--eai-warning)]">
            <h3 className="text-[15px] font-bold mb-4 flex items-center gap-2">
              <Warning size={20} weight="fill" className="text-[var(--eai-warning)]" />
              Watchdog Summary
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[var(--eai-text-secondary)] font-medium">Urgent Tasks</span>
                <span className="text-[14px] font-bold text-red-600">2</span>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--eai-border)] pt-4">
                <span className="text-[14px] text-[var(--eai-text-secondary)] font-medium">Renewal Window</span>
                <span className="text-[14px] font-bold text-[var(--eai-text)]">8</span>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--eai-border)] pt-4">
                <span className="text-[14px] text-[var(--eai-text-secondary)] font-medium">Pending Responses</span>
                <span className="text-[14px] font-bold text-[var(--eai-text)]">14</span>
              </div>
            </div>
            <button
              onClick={() => addToast({ title: 'Exporting', description: 'Exporting deadline report...', type: 'info' })}
              className="w-full mt-6 flex items-center justify-center gap-2 h-10 rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] text-[13px] font-bold hover:bg-[var(--eai-bg)] transition-all"
            >
              <ArrowSquareOut size={16} />
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div >
  )
}
