import { useMemo } from 'react'
import { Sun, Moon, MagnifyingGlass, SignOut, Palette } from '@phosphor-icons/react'
import { useAuthStore } from '../store/authStore'
import { Menu } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { useState, useEffect } from 'react'

type Props = {
  title: string
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onOpenCommand: () => void
  children?: React.ReactNode
}

export default function TopBar({ title, theme, onToggleTheme, onOpenCommand, children }: Props) {
  const [designMode, setDesignMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('eai_design_mode') || 'default'
    return 'default'
  })
  const hint = useMemo(() => (navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl'), [])
  const { user, logout } = useAuthStore()
  const { toggleSidebar } = useSidebar()

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/70 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-2 sm:px-3 md:px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleSidebar}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] text-[var(--eai-text)] transition-all hover:bg-[var(--eai-bg)]"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="truncate text-[18px] sm:text-[20px] md:text-[24px] font-bold tracking-tight text-[var(--eai-text)]">{title}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={onOpenCommand}
              className="flex h-9 sm:h-10 items-center gap-1 sm:gap-2 rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] px-2 sm:px-3 text-[12px] sm:text-[13px] font-medium transition-all hover:bg-[var(--eai-bg)]"
            >
              <MagnifyingGlass size={16} className="sm:hidden" />
              <MagnifyingGlass size={18} className="hidden sm:block" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="ml-1 hidden md:inline-block rounded-none bg-[var(--eai-bg)] px-1.5 py-0.5 text-[10px] font-bold opacity-50 border border-[var(--eai-border)]">
                {hint}+K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                const newMode = designMode === 'default' ? 'blue' : 'default'
                setDesignMode(newMode)
                localStorage.setItem('eai_design_mode', newMode)
                if (newMode === 'blue') {
                  document.documentElement.classList.add('blue-theme')
                } else {
                  document.documentElement.classList.remove('blue-theme')
                }
              }}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] text-[var(--eai-text)] transition-all hover:bg-[var(--eai-bg)] shadow-sm"
              aria-label="Toggle design mode"
              title={`Design: ${designMode}`}
            >
              <Palette size={18} className={designMode === 'blue' ? 'text-[#0e3155]' : 'text-gray-400'} />
            </button>
            
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] text-[var(--eai-text)] transition-all hover:bg-[var(--eai-bg)] shadow-sm"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun size={20} weight="fill" className="text-orange-400" />
              ) : (
                <Moon size={20} weight="fill" className="text-blue-600" />
              )}
            </button>
          </div>

          <div className="h-8 w-px bg-[var(--eai-border)] hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[13px] font-bold leading-none text-[var(--eai-text)]">{user?.full_name || 'Lawyer Name'}</div>
              <div className="text-[11px] text-[var(--eai-text-secondary)] mt-1 font-medium">{user?.role || 'Partner'}</div>
            </div>

            <button
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
              title="Logout"
            >
              <SignOut size={20} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
