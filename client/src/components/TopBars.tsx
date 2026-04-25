"use client"

import { useMemo } from 'react'
import { Sun, Moon, Search, LogOut, Bell, User, Cog, Menu, LayoutDashboard, FileText, ChevronDown, UserCircle } from 'lucide-react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from 'react'

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
  const { logout, user } = useAuthStore()
  const { toggleSidebar } = useSidebar()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const userInitial = user?.full_name?.charAt(0) || 'U'
  const roleLabel = user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/70 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3 min-w-[200px]">
          <button
            onClick={toggleSidebar}
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-none text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] hover:bg-[var(--eai-surface)] transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="hidden md:flex items-center gap-3 px-2 py-1.5 rounded-none bg-muted/30 border border-border/50">
            <Avatar className="h-8 w-8 border border-primary/20 rounded-none">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs rounded-none">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground leading-none">{user?.full_name || 'User'}</span>
              <span className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">{roleLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-[var(--eai-text)]">{title}</span>
        </div>

        <div className="flex items-center gap-3 min-w-[200px] justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setLogoutDialogOpen(true)}
            className="h-9 gap-2 px-4 rounded-none font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={logout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}

// End of TopBar file
