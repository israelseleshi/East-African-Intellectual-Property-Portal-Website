"use client"

import { useMemo } from 'react'
import { Sun, Moon, Search, LogOut, Bell, User, Cog, Menu, LayoutDashboard, FileText, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSettingsStore, TopBarDesign } from '@/store/settingsStore'
import { SettingsPanel } from './SettingsPanel'
import { motion } from 'framer-motion'

type TopBarProps = {
  title: string
  onOpenCommand: () => void
  children?: React.ReactNode
}

export default function TopBar({ title, onOpenCommand, children }: TopBarProps) {
  return <CenteredTopBar title={title} onOpenCommand={onOpenCommand} />
}

// Design 2: Centered - Title centered with balanced layout
function CenteredTopBar({ title, onOpenCommand }: TopBarProps) {
  const { logout } = useAuthStore()
  const { toggleSidebar } = useSidebar()

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/70 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3 min-w-[120px]">
          <button
            onClick={toggleSidebar}
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-lg text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] hover:bg-[var(--eai-surface)] transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-[var(--eai-text)]">{title}</span>
        </div>

        <div className="flex items-center gap-3 min-w-[120px] justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-10 w-10 rounded-lg text-[var(--eai-text-secondary)] hover:text-red-500"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}

// End of TopBar file
