import { NavLink } from 'react-router-dom'
import type { ThemeMode } from '../app/theme'
import {
  SquaresFour,
  Archive,
  Users,
  CreditCard,
  ShieldCheck,
  ChartBar,
  Question,
  List,
  Clock,
  Bell
} from '@phosphor-icons/react'

const nav = [
  { label: 'Dashboard', to: '/', icon: SquaresFour },
  { label: 'Trademarks', to: '/trademarks', icon: Archive },
  { label: 'EIPA Forms', to: '/eipa-forms', icon: ShieldCheck },
  { label: 'Clients', to: '/clients', icon: Users },
  { label: 'Deadlines', to: '/deadlines', icon: Clock },
  { label: 'Invoicing', to: '/invoicing', icon: CreditCard },
  { label: 'Reports', to: '/reports', icon: ChartBar },
  { label: 'Notifications', to: '/notifications', icon: Bell },
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
        'h-full shrink-0 border-r border-[var(--eai-border)] glass z-30',
        'transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-[80px]' : 'w-[260px]'
      ].join(' ')}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-32 items-center justify-center px-3 mb-6">
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

        {/* Collapse Toggle */}
        <div className="px-3 flex justify-center">
          <button
            onClick={onToggleCollapsed}
            className="mb-4 p-2 rounded-md bg-[var(--eai-bg)] hover:bg-[var(--eai-border)] transition-colors duration-200"
          >
            <List size={24} weight="bold" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3">
          <div className="flex flex-col">
            {nav.map((item, index) => (
              <div key={item.to}>
                {index > 0 && <div className="mx-3 h-px bg-[var(--eai-border)] opacity-40" />}
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }: { isActive: boolean }) =>
                    [
                      'flex h-12 items-center gap-3 rounded-none px-3 transition-all duration-200 group relative',
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
                      collapsed ? 'mx-auto' : ''
                    ].join(' ')}
                  />
                  {!collapsed && <span className="text-[15px] leading-none">{item.label}</span>}
                </NavLink>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  )
}
