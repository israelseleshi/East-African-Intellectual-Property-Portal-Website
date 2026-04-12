export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'eai.theme'

export function getInitialTheme(): ThemeMode {
  return 'light'
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  root.classList.remove('dark')
  localStorage.setItem(STORAGE_KEY, 'light')
}
