import { useMemo } from 'react'
import { Sun, Moon, MagnifyingGlass, SignOut } from '@phosphor-icons/react'
import { useAuthStore } from '../store/authStore'

type Props = {
  title: string
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onOpenCommand: () => void
  children?: React.ReactNode
}

export default function TopBar({ title, theme, onToggleTheme, onOpenCommand, children }: Props) {
  const hint = useMemo(() => (navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl'), [])
  const { user, logout } = useAuthStore()

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/70 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="min-w-0">
          <div className="truncate text-[24px] font-bold tracking-tight text-[var(--eai-text)]">{title}</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCommand}
              className="flex h-10 items-center gap-2 rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] px-3 text-[13px] font-medium transition-all hover:bg-[var(--eai-bg)]"
            >
              <MagnifyingGlass size={18} />
              <span>Search</span>
              <kbd className="ml-1 rounded-none bg-[var(--eai-bg)] px-1.5 py-0.5 text-[10px] font-bold opacity-50 uppercase border border-[var(--eai-border)]">
                {hint}+K
              </kbd>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] text-[var(--eai-text)] transition-all hover:bg-[var(--eai-bg)] shadow-sm"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun size={20} weight="fill" className="text-orange-400" />
              ) : (
                <Moon size={20} weight="fill" className="text-blue-600" />
              )}
            </button>
          </div>

          <div className="h-8 w-px bg-[var(--eai-border)]" />

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
