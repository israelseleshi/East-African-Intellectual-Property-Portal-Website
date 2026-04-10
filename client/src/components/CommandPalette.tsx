import { useMemo, useState, useEffect } from 'react'
import { MagnifyingGlass, Plus, Archive, Clock, FileText, CreditCard, BookOpen, House, Command, Users, ShieldCheck, Building, User, Trash } from '@phosphor-icons/react'
import { clientService, trademarkService } from '../utils/api'
import { useAuthStore, canAccessFinance } from '../store/authStore'

type Props = {
  open: boolean
  onOpenChange: (next: boolean) => void
}

export default function CommandPalette({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<Array<{ id: string; name: string; type?: string }>>([])
  const [trademarks, setTrademarks] = useState<Array<{ id: string; markName?: string; mark_name?: string; filingNumber?: string; jurisdiction?: string; client_name?: string; client?: { name?: string } }>>([])
  const [loading, setLoading] = useState(false)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (open) {
      setQuery('')
      // Pre-load clients and trademarks when opening
      loadSearchData()
    }
  }, [open])

  // Load clients and trademarks for search
  const loadSearchData = async () => {
    if (!open) return
    setLoading(true)
    try {
      const [clientsResult, trademarksResult] = await Promise.all([
        clientService.getClients(),
        trademarkService.getCases()
      ])
      // Handle both direct array and paginated { data, meta } responses
      setClients(Array.isArray(clientsResult) ? clientsResult : (clientsResult?.data || []))
      setTrademarks(Array.isArray(trademarksResult) ? trademarksResult : (trademarksResult?.data || []))
    } catch (e) {
      console.error('Failed to load search data:', e)
    } finally {
      setLoading(false)
    }
  }

  // Navigation items - updated to match current routes
  const navItems = useMemo(
    () => [
      { label: 'Dashboard', path: '/', icon: House },
      { label: 'New Application', path: '/intake/new', icon: Plus },
      { label: 'Trademarks', path: '/trademarks', icon: Archive },
      { label: 'Deadlines & Alerts', path: '/deadlines', icon: Clock },
      { label: 'EIPA Forms', path: '/eipa-forms', icon: FileText },
      ...(canAccessFinance(user) ? [{ label: 'Invoicing', path: '/invoicing', icon: CreditCard }] : []),
      { label: 'Clients', path: '/clients', icon: Users },
      { label: 'Trash', path: '/trash', icon: Trash },
      { label: 'Help & Support', path: '/help', icon: BookOpen }
    ],
    [user]
  )

  const trimmedQuery = query.trim().toLowerCase()

  // Filter navigation items
  const filteredNav = navItems.filter((i) =>
    i.label.toLowerCase().includes(trimmedQuery)
  )

  // Filter clients by name
  const filteredClients = clients.filter((c) =>
    c.name?.toLowerCase().includes(trimmedQuery)
  ).slice(0, 5) // Limit to 5 results

  // Filter trademarks by mark name or filing number
  const filteredTrademarks = trademarks.filter((t) =>
    (t.markName || t.mark_name || '')?.toLowerCase().includes(trimmedQuery) ||
    (t.filingNumber || '')?.toLowerCase().includes(trimmedQuery) ||
    (t.client_name || t.client?.name || '')?.toLowerCase().includes(trimmedQuery)
  ).slice(0, 5) // Limit to 5 results

  const hasResults = filteredNav.length > 0 || filteredClients.length > 0 || filteredTrademarks.length > 0

  const handleNavigate = (path: string) => {
    onOpenChange(false)
    window.location.pathname = path
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-24 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-none border border-[var(--eai-border-strong)] bg-[var(--eai-surface)] shadow-2xl shadow-black/20 animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-[var(--eai-border)] px-4">
          <MagnifyingGlass size={20} className="text-[var(--eai-text-secondary)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trademarks, clients, or jump to page..."
            className="h-14 w-full bg-transparent px-3 text-[17px] font-medium outline-none placeholder:text-[var(--eai-text-secondary)]/50"
          />
          <div className="flex items-center gap-1 rounded-none border border-[var(--eai-border)] bg-[var(--eai-bg)] px-2 py-1 text-[10px] font-bold text-[var(--eai-text-secondary)]">
            ESC
          </div>
        </div>

        <div className="max-h-[420px] overflow-auto p-3">
          {!hasResults ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Command size={40} className="text-[var(--eai-border-strong)] mb-3" />
              <div className="text-[17px] font-semibold text-[var(--eai-text-secondary)]">
                {loading ? 'Loading...' : 'No results found'}
              </div>
              <p className="text-[14px] text-[var(--eai-muted)]">
                {loading ? 'Fetching clients and trademarks...' : 'No pages, clients, or marks match your search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Navigation Section */}
              {filteredNav.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-[var(--eai-text-secondary)]">
                    Navigation & Tools
                  </div>
                  {filteredNav.map((i) => (
                    <a
                      key={i.path}
                      href={i.path}
                      onClick={(e) => {
                        e.preventDefault()
                        handleNavigate(i.path)
                      }}
                      className="flex h-12 items-center gap-3 rounded-none px-3 transition-all duration-150 hover:bg-[var(--eai-primary)] hover:text-white group"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-none bg-[var(--eai-bg)] group-hover:bg-white/20 transition-colors">
                        <i.icon size={18} className="text-[var(--eai-text-secondary)] group-hover:text-white" />
                      </div>
                      <span className="text-[15px] font-medium flex-1">{i.label}</span>
                      <span className="text-[12px] text-[var(--eai-text-secondary)] group-hover:text-white/70">Jump to</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Clients Section */}
              {filteredClients.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-[var(--eai-text-secondary)]">
                    Clients
                  </div>
                  {filteredClients.map((client) => (
                    <a
                      key={client.id}
                      href={`/clients/${client.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        handleNavigate(`/clients/${client.id}`)
                      }}
                      className="flex h-12 items-center gap-3 rounded-none px-3 transition-all duration-150 hover:bg-[var(--eai-primary)] hover:text-white group"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-none bg-[var(--eai-bg)] group-hover:bg-white/20 transition-colors">
                        {client.type === 'COMPANY' ? (
                          <Building size={18} className="text-[var(--eai-text-secondary)] group-hover:text-white" />
                        ) : (
                          <User size={18} className="text-[var(--eai-text-secondary)] group-hover:text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-medium block truncate">{client.name}</span>
                        <span className="text-[12px] text-[var(--eai-text-secondary)] group-hover:text-white/70 block">
                          {client.type?.replace('_', ' ') || 'Client'}
                        </span>
                      </div>
                      <span className="text-[12px] text-[var(--eai-text-secondary)] group-hover:text-white/70">View</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Trademarks Section */}
              {filteredTrademarks.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-[var(--eai-text-secondary)]">
                    Trademarks
                  </div>
                  {filteredTrademarks.map((tm) => (
                    <a
                      key={tm.id}
                      href={`/trademarks/${tm.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        handleNavigate(`/trademarks/${tm.id}`)
                      }}
                      className="flex h-12 items-center gap-3 rounded-none px-3 transition-all duration-150 hover:bg-[var(--eai-primary)] hover:text-white group"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-none bg-[var(--eai-bg)] group-hover:bg-white/20 transition-colors">
                        <ShieldCheck size={18} className="text-[var(--eai-text-secondary)] group-hover:text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-medium block truncate">
                          {tm.markName || tm.mark_name || 'Unnamed Mark'}
                        </span>
                        <span className="text-[12px] text-[var(--eai-text-secondary)] group-hover:text-white/70 block">
                          {tm.client_name || tm.client?.name || 'No client'} · {tm.jurisdiction || 'ET'}
                        </span>
                      </div>
                      <span className="text-[12px] text-[var(--eai-text-secondary)] group-hover:text-white/70">View</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--eai-border)] bg-[var(--eai-bg)]/50 px-4 py-3 text-[12px] text-[var(--eai-text-secondary)]">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <kbd className="rounded-none border border-[var(--eai-border-strong)] bg-white px-1 shadow-sm text-black">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <kbd className="rounded-none border border-[var(--eai-border-strong)] bg-white px-1 shadow-sm text-black">↑↓</kbd>
              to navigate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tighter italic text-[var(--eai-primary)]">EAIP Pro Search</span>
          </div>
        </div>
      </div>
    </div>
  )
}
