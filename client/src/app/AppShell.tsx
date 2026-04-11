import { useCallback, useEffect, useMemo, useState, useLayoutEffect, type CSSProperties } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'

import CommandPalette from '../components/CommandPalette'
import AppTour from '../components/AppTour'
import AppSidebar from '../components/NewSidebar'
import TopBar from '../components/TopBars'
import { Toaster } from '@/components/ui/sonner'
import { usePageTitleStore } from '../store/pageTitleStore'
import { applyTheme, getInitialTheme, type ThemeMode } from './theme'
import { useHotkeys } from './useHotkeys'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.99
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.23, 1, 0.32, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2
    }
  }
}

function usePageTitle() {
  const location = useLocation()
  const overrideTitle = usePageTitleStore((state) => state.overrideTitle)
  
  const title = useMemo(() => {
    // Use override title if available (set by detail pages)
    if (overrideTitle) {
      return overrideTitle
    }
    
    switch (location.pathname) {
      case '/':
        return 'Dashboard'
      case '/trademarks':
        return 'Trademarks'
      case '/deadlines':
        return 'Deadlines'
      case '/eipa-forms':
      case '/eipa-forms/application-form':
        return 'EIPA Forms'
      case '/eipa-forms/renewal-form':
        return 'Renewal Form'
      case '/clients':
        return 'Clients'
      case '/clients/new':
        return 'New Client'
      case '/invoicing':
        return 'Invoicing'
      case '/reports':
        return 'Reports'
      case '/help':
        return 'Help & Support'
      case '/login':
        return 'Login'
      case '/signup':
        return 'Sign Up'
      case '/verify-otp':
        return 'Verify OTP'
      default:
        // Handle dynamic routes - don't show ID, just generic title
        if (location.pathname.startsWith('/trademarks/')) {
          return 'Trademark Details'
        }
        if (location.pathname.startsWith('/clients/')) {
          return 'Client Details'
        }
        if (location.pathname.startsWith('/case-flow/')) {
          return 'Case Flow'
        }
        return 'TPMS'
    }
  }, [location.pathname, overrideTitle])

  // Update document title
  useEffect(() => {
    document.title = title === 'TPMS' ? 'East African IP — TPMS' : `${title} — EAIP`
  }, [title])

  return title
}

export default function AppShell() {
  const location = useLocation()
  const title = usePageTitle()

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/verify-otp' ||
    location.pathname === '/signup/super_admin' ||
    location.pathname === '/forgot-password'

  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const [commandOpen, setCommandOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useLayoutEffect(() => {
    applyTheme('light')
    
    const pageBg = '#E8E8ED'
    const formBg = '#FFFFFF'
    document.documentElement.style.setProperty('--auth-page-bg', pageBg)
    document.documentElement.style.setProperty('--auth-form-bg', formBg)
  }, [])
  const [version, setVersion] = useState<{ gitSha?: string | null; buildTime?: string | null }>({})

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  useHotkeys((e) => {
    const isK = e.key.toLowerCase() === 'k'
    const isMeta = e.metaKey || e.ctrlKey

    if (isMeta && isK) {
      e.preventDefault()
      setCommandOpen(true)
      return
    }

    if (e.key === 'Escape') {
      setCommandOpen(false)
    }
  })

  useEffect(() => {
    if (!commandOpen) return

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const a = target?.closest('a')
      const href = a?.getAttribute('href')

      if (href) {
        setCommandOpen(false)
      }
    }

    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [commandOpen])

  useEffect(() => {
    fetch('/api/system/version', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => data && setVersion(data))
      .catch(() => {});
  }, [])

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <div className="flex h-screen w-full overflow-hidden light">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar
            title={title}
            onOpenCommand={() => setCommandOpen(true)}
          />
          <main className="flex-1 overflow-hidden bg-[var(--auth-page-bg)] p-3 md:p-4">
            <ScrollArea className="h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </ScrollArea>
          </main>
          <div className="text-[11px] text-muted-foreground px-4 pb-2 text-right">
            {version.gitSha ? `Build ${version.gitSha.slice(0, 7)}${version.buildTime ? ` • ${version.buildTime}` : ''}` : ''}
          </div>
        </div>
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        <AppTour />
        <Toaster 
          position="top-right" 
          closeButton 
          richColors 
          toastOptions={{
            classNames: {
              success: 'bg-green-600 text-white border-green-700',
              error: 'bg-red-600 text-white border-red-700',
              info: 'bg-blue-600 text-white border-blue-700',
              warning: 'bg-yellow-600 text-white border-yellow-700',
            }
          }}
        />
      </div>
    </SidebarProvider>
  )
}
