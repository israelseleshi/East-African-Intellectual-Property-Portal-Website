import { useState, useEffect, useLayoutEffect, type ReactNode } from "react"
import { Sun, Moon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = localStorage.getItem('eai.theme')
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  useLayoutEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.setProperty('--auth-page-bg', '#E8E8ED')
    document.documentElement.style.setProperty('--auth-form-bg', '#FFFFFF')
  }, [])

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 overflow-auto"
      style={{ backgroundColor: 'var(--auth-page-bg)' }}
    >
      {children}
    </div>
  )
}
