import { NavLink } from 'react-router-dom'
import type { ThemeMode } from '../app/theme'
import {
  SquaresFour,
  Archive,
  Users,
  CreditCard,
  ShieldCheck,
  Question,
  List,
  Clock
} from '@phosphor-icons/react'

const nav = [
  { label: 'Dashboard', to: '/', icon: SquaresFour },
  { label: 'Trademarks', to: '/trademarks', icon: Archive },
  { label: 'Application Form', to: '/eipa-forms/application-form', icon: ShieldCheck },
  { label: 'Renewal Form', to: '/eipa-forms/renewal-form', icon: ShieldCheck },
  { label: 'Clients', to: '/clients', icon: Users },
  { label: 'Deadlines', to: '/deadlines', icon: Clock },
  { label: 'Invoicing', to: '/invoicing', icon: CreditCard },
  { label: 'Help & Support', to: '/help', icon: Question }
] as const

type Props = {
  collapsed: boolean
  onToggleCollapsed: () => void
  theme: ThemeMode
}

export default function Sidebar({ collapsed, onToggleCollapsed, theme }: Props) {
  return (
    <aside
      className={[
        'shrink-0 border-[var(--eai-border)] glass z-30',
        'transition-all duration-300 ease-in-out',
        // Desktop styles
        'md:h-full md:border-r',
        collapsed ? 'md:w-[80px]' : 'md:w-[260px]',
        // Mobile bottom bar styles
        'fixed bottom-0 left-0 right-0 h-16 w-full border-t flex flex-row md:relative md:bottom-auto md:left-auto md:right-auto md:flex-col'
      ].join(' ')}
    >
      <div className="flex h-full w-full flex-row md:flex-col items-center md:items-stretch">
        {/* Header - Hidden on mobile */}
        <div className="hidden md:flex h-32 items-center justify-center px-3 mb-6 shrink-0">
          <img
            src="/eaip-logo.png"
            alt="EAIP Logo"
            className={[
              "object-contain transition-all duration-300",
              theme === 'dark' ? "brightness-0 invert" : "",
              collapsed ? "h-14 w-14" : "h-24 w-auto max-w-[200px]"
            ].join(' ')}
          />
        </div>

        {/* Collapse Toggle - Hidden on mobile */}
        <div className="hidden md:flex px-3 justify-center shrink-0">
          <button
            onClick={onToggleCollapsed}
            className="mb-4 p-2 rounded-md bg-[var(--eai-bg)] hover:bg-[var(--eai-border)] transition-colors duration-200"
          >
            <List size={24} weight="bold" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 w-full overflow-x-auto no-scrollbar md:overflow-x-visible px-2 md:px-3">
          <div className="flex flex-row md:flex-col h-full items-center md:items-stretch justify-around md:justify-start gap-1 md:gap-0">
            {nav.map((item, index) => (
              <div key={item.to} className="flex-1 md:flex-none max-w-[80px] md:max-w-none">
                {index > 0 && <div className="hidden md:block mx-3 h-px bg-[var(--eai-border)] opacity-40" />}
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }: { isActive: boolean }) =>
                    [
                      'flex flex-col md:flex-row h-14 md:h-12 items-center justify-center md:justify-start gap-1 md:gap-3 rounded-xl md:rounded-none px-1 md:px-3 transition-all duration-200 group relative',
                      isActive
                        ? 'bg-[var(--eai-primary)] text-white shadow-lg shadow-[var(--eai-primary)]/20 font-semibold z-10'
                        : theme === 'dark'
                          ? 'text-white hover:bg-[var(--eai-bg)] hover:text-[#005B9C] transition-colors'
                          : 'text-slate-600 hover:bg-[var(--eai-bg)] hover:text-[#003B5C] transition-colors'
                    ].join(' ')
                  }
                >
                  <item.icon
                    size={20}
                    weight={collapsed ? "bold" : "regular"}
                    className={[
                      'shrink-0 transition-transform group-active:scale-90',
                      collapsed ? 'md:mx-auto' : ''
                    ].join(' ')}
                  />
                  <span className={[
                    'text-[10px] md:text-[15px] leading-none text-center truncate w-full md:w-auto',
                    collapsed ? 'md:hidden' : 'block'
                  ].join(' ')}>
                    {item.label.split(' ')[0]}
                  </span>
                </NavLink>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  )
}
