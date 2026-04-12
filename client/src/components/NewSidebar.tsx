"use client"

import * as React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { useAuthStore, canAccessFinance } from "@/store/authStore"
import { useSidebar } from "@/components/ui/sidebar"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Archive,
  Users,
  CreditCard,
  Shield,
  HelpCircle,
  Clock,
  Menu,
  X
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSettingsStore, SIDEBAR_FONT_SIZES } from "@/store/settingsStore"

const navItems: Array<{ label: string; to: string; icon: React.ForwardRefExoticComponent<Omit<import("lucide-react").LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>; requiresFinance?: boolean }> = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Trademarks', to: '/trademarks', icon: Archive },
  { label: 'Application Form', to: '/eipa-forms/application-form', icon: Shield },
  { label: 'Renewal Form', to: '/eipa-forms/renewal-form', icon: Shield },
  { label: 'Clients', to: '/clients', icon: Users },
  { label: 'Deadlines', to: '/deadlines', icon: Clock },
  { label: 'Invoicing', to: '/invoicing', icon: CreditCard, requiresFinance: true }
]

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, toggleSidebar } = useSidebar()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const isCollapsed = state === "collapsed"
  const sidebarFontSize = useSettingsStore((state) => state.sidebarFontSize)

  const fontSizeValue = SIDEBAR_FONT_SIZES.find(f => f.value === sidebarFontSize)?.size || '12px'

  const filteredNav = user 
    ? navItems.filter((item) => !item.requiresFinance || canAccessFinance(user))
    : navItems

  return (
    <Sidebar collapsible="icon" className={`${isCollapsed ? 'sidebar-collapsed' : ''} sidebar-font-${sidebarFontSize}`} {...props}>
      <SidebarHeader className="flex flex-col items-center gap-4 pt-4">
        <img
          src="/eaip-logo.png"
          alt="EAIP Logo"
          className={`sidebar-logo object-contain transition-all duration-300 ${isCollapsed ? 'h-16 w-16' : 'h-20 w-auto'}`}
        />
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center h-10 w-10 rounded-md text-[var(--eai-text-secondary)] transition-colors hover:text-[var(--eai-text)] hover:bg-[var(--eai-surface)]"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="flex flex-col items-stretch gap-1 px-2 pt-2">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/' && location.pathname.startsWith(item.to))
            
            const linkContent = (
              <NavLink
                to={item.to}
                className={`flex items-center gap-3 rounded-md transition-colors w-full h-10 px-2 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                style={{ fontSize: fontSizeValue }}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className={`transition-all duration-200 text-left truncate ${isCollapsed ? 'hidden opacity-0 w-0' : 'opacity-100'}`}>
                  {item.label}
                </span>
              </NavLink>
            )
            
            return (
              <SidebarMenuItem key={item.to} className={`w-full ${isCollapsed ? 'flex justify-center' : ''}`}>
                {isCollapsed ? (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.to}
                          className={`sidebar-collapsed-nav flex items-center justify-center w-full h-10 rounded-md px-2 transition-colors ${
                            isActive 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-muted'
                          }`}
                          style={{ fontSize: fontSizeValue }}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <SidebarMenuButton asChild className="w-full !h-10 sidebar-expanded-btn" style={{ fontSize: fontSizeValue }}>
                    {linkContent}
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}

export default AppSidebar