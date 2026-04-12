import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SidebarFontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type TopBarDesign = 'minimal' | 'centered' | 'spacious' | 'condensed' | 'classic'
export type DashboardDesign = 'command' | 'timeline' | 'kanban' | 'calendar' | 'analytics' | 'action' | 'client' | 'registry' | 'launch' | 'hybrid'
export type InvoiceDesign = 'classic'

interface SettingsState {
  sidebarFontSize: SidebarFontSize
  topBarDesign: TopBarDesign
  dashboardDesign: DashboardDesign
  invoiceDesign: InvoiceDesign
  setSidebarFontSize: (size: SidebarFontSize) => void
  setTopBarDesign: (design: TopBarDesign) => void
  setDashboardDesign: (design: DashboardDesign) => void
  setInvoiceDesign: (design: InvoiceDesign) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sidebarFontSize: 'xl',
      topBarDesign: 'minimal',
      dashboardDesign: 'command',
      invoiceDesign: 'classic',
      setSidebarFontSize: (size) => set({ sidebarFontSize: size }),
      setTopBarDesign: (design) => set({ topBarDesign: design }),
      setDashboardDesign: (design) => set({ dashboardDesign: design }),
      setInvoiceDesign: (design) => set({ invoiceDesign: design }),
    }),
    {
      name: 'eaip-settings',
    }
  )
)

export const SIDEBAR_FONT_SIZES: { value: SidebarFontSize; label: string; size: string }[] = [
  { value: 'xs', label: 'Extra Small', size: '10px' },
  { value: 'sm', label: 'Small', size: '12px' },
  { value: 'md', label: 'Medium', size: '14px' },
  { value: 'lg', label: 'Large', size: '16px' },
  { value: 'xl', label: 'Extra Large', size: '18px' },
]

export const TOP_BAR_DESIGNS: { value: TopBarDesign; label: string; description: string }[] = [
  { value: 'minimal', label: 'Minimal', description: 'Clean and simple with essential elements' },
  { value: 'centered', label: 'Centered', description: 'Title centered with balanced layout' },
  { value: 'spacious', label: 'Spacious', description: 'More breathing room and larger elements' },
  { value: 'condensed', label: 'Condensed', description: 'Compact design with efficient use of space' },
  { value: 'classic', label: 'Classic', description: 'Traditional header with familiar patterns' },
]

export const DASHBOARD_DESIGNS: { value: DashboardDesign; label: string; description: string; icon: string }[] = [
  { value: 'command', label: 'Command Center', description: 'Mission-control style with real-time metrics and urgent action cards', icon: 'Monitor' },
  { value: 'timeline', label: 'Timeline Focus', description: 'Chronological workflow view with trademark lifecycle stages', icon: 'GitBranch' },
  { value: 'kanban', label: 'Kanban Board', description: 'Drag-and-drop columns for case statuses', icon: 'Columns' },
  { value: 'calendar', label: 'Calendar View', description: 'Calendar-centric with deadline-based events', icon: 'Calendar' },
  { value: 'analytics', label: 'Analytics Dashboard', description: 'Charts and graphs for portfolio performance', icon: 'BarChart3' },
  { value: 'action', label: 'Action-Oriented', description: 'Prioritized action list with one-click navigation', icon: 'Zap' },
  { value: 'client', label: 'Client-Centric', description: 'Grouped by client with expandable cards', icon: 'Users' },
  { value: 'registry', label: 'Registry View', description: 'Powerful table with filtering and sorting', icon: 'Table' },
  { value: 'launch', label: 'Quick Launch', description: 'Large touch-friendly quick action buttons', icon: 'Rocket' },
  { value: 'hybrid', label: 'Hybrid Smart', description: 'Intelligent adaptive dashboard based on user behavior', icon: 'Sparkles' },
]

export const INVOICE_DESIGNS: { value: InvoiceDesign; label: string; description: string }[] = [
  { value: 'classic', label: 'Classic Layout', description: 'Standard billing view with summary sidebar' },
]
