import { create } from 'zustand'
import type { AppSettings } from '../types'

interface SeenStore {
  settings:        Partial<AppSettings>
  setSettings:     (s: Partial<AppSettings>) => void
  quickLogOpen:    boolean
  setQuickLogOpen: (open: boolean) => void
}

export const useStore = create<SeenStore>((set) => ({
  settings:        {},
  setSettings:     (s)    => set((prev) => ({ settings: { ...prev.settings, ...s } })),
  quickLogOpen:    false,
  setQuickLogOpen: (open) => set({ quickLogOpen: open }),
}))
