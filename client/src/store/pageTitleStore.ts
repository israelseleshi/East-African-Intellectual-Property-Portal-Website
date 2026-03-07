import { create } from 'zustand'

interface PageTitleState {
  overrideTitle: string | null
  setOverrideTitle: (title: string | null) => void
  clearOverride: () => void
}

export const usePageTitleStore = create<PageTitleState>((set) => ({
  overrideTitle: null,
  setOverrideTitle: (title) => set({ overrideTitle: title }),
  clearOverride: () => set({ overrideTitle: null }),
}))
