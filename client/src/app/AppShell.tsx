import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'

import CommandPalette from '../components/CommandPalette'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { usePageTitleStore } from '../store/pageTitleStore'
import { applyTheme, getInitialTheme, type ThemeMode } from './theme'
import { useHotkeys } from './useHotkeys'

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

const SIDEBAR_KEY = 'eai.sidebarCollapsed'

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

  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const [commandOpen, setCommandOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const raw = localStorage.getItem(SIDEBAR_KEY)
    return raw === '1'
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => {
      const next = !v
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      return next
    })
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

  return (
    <div className={`flex h-screen w-full overflow-hidden ${theme}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} theme={theme} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          title={title}
          onToggleTheme={toggleTheme}
          onOpenCommand={() => setCommandOpen(true)}
          theme={theme}
        />
        <main className="flex-1 overflow-y-auto bg-background p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 2xl:p-10 pb-20 md:pb-6 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="mx-auto w-full max-w-[100%] sm:max-w-[95%] md:max-w-[92%] lg:max-w-[88rem] xl:max-w-[96rem] 2xl:max-w-[110rem]"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
