"use client"

import * as React from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore, canAccessFinance, isSuperAdmin } from "@/store/authStore"
import { useSidebar } from "@/components/ui/sidebar"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import {
  LayoutDashboard,
  Archive,
  Users,
  CreditCard,
  Shield,
  Clock,
  Menu,
  Trash2,
  User,
  LogOut,
  UserPlus
} from "lucide-react"
import { useSettingsStore, SIDEBAR_FONT_SIZES } from "@/store/settingsStore"
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

const navItems: Array<{ label: string; to: string; icon: React.ForwardRefExoticComponent<Omit<import("lucide-react").LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>; requiresFinance?: boolean; requiresSuperAdmin?: boolean }> = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Trademarks', to: '/trademarks', icon: Archive },
  { label: 'Application Form', to: '/eipa-forms/application-form', icon: Shield },
  { label: 'Renewal Form', to: '/eipa-forms/renewal-form', icon: Shield },
  { label: 'Clients', to: '/clients', icon: Users },
  { label: 'Deadlines', to: '/deadlines', icon: Clock },
  { label: 'Billing', to: '/billing', icon: CreditCard, requiresFinance: true },
  { label: 'Trash', to: '/trash', icon: Trash2 }
]

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const isCollapsed = state === "collapsed"
  const sidebarFontSize = useSettingsStore((state) => state.sidebarFontSize)
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false)

  const fontSizeValue = SIDEBAR_FONT_SIZES.find(f => f.value === sidebarFontSize)?.size || '12px'

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const filteredNav = user 
    ? navItems.filter((item) => {
        if (item.requiresFinance && !canAccessFinance(user)) return false
        if (item.requiresSuperAdmin && !isSuperAdmin(user)) return false
        return true
      })
    : navItems

  return (
    <Sidebar collapsible="icon" className={`${isCollapsed ? 'sidebar-collapsed' : ''} sidebar-font-${sidebarFontSize}`} {...props}>
      <SidebarHeader className="flex flex-col items-center gap-4 pt-4">
        <Button variant="ghost" className="p-0 h-auto" onClick={() => navigate('/')}>
          <img
            src="/eaip-logo.png"
            alt="EAIP Logo"
            className={`sidebar-logo object-contain transition-all duration-300 ${isCollapsed ? 'h-12 w-12' : 'h-16 w-auto'}`}
          />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="h-10 w-10"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <nav className="flex flex-col">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/' && location.pathname.startsWith(item.to))
            
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-3 transition-colors border-b border-muted/30 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                style={{ fontSize: fontSizeValue }}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <span className="truncate">
                    {item.label}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter className="mt-auto pb-4">
        <SidebarSeparator className="mb-2" />
        <nav className="flex flex-col gap-1">
          {/* Profile Section */}
          <NavLink 
            to="/profile" 
            onClick={handleLinkClick}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${isCollapsed ? 'justify-center' : 'justify-start'}`
            }
          >
            <User className="h-5 w-5" />
            {!isCollapsed && (
              <div className="flex flex-col items-start truncate overflow-hidden">
                <span className="text-sm font-medium leading-none">{user?.full_name || 'Profile'}</span>
                <span className="text-xs text-white/70 truncate w-full">{user?.email}</span>
              </div>
            )}
          </NavLink>

          {/* Logout Button */}
          <button 
            onClick={() => setLogoutDialogOpen(true)}
            className={`flex items-center gap-3 px-4 py-3 transition-colors bg-red-600 text-white hover:bg-red-700 ${isCollapsed ? 'justify-center' : 'justify-start'}`}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </nav>
      </SidebarFooter>

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
              onClick={() => {
                logout()
                toast.error("You have been logged out", { style: { background: '#dc2626', color: '#fff' }, duration: 3000 })
                handleLinkClick()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  )
}

export default AppSidebar