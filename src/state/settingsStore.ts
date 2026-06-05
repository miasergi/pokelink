import { create } from 'zustand'

export type BattleSpeed = 1 | 2 | 4
export type ThemeName = 'dark' | 'midnight'

interface SettingsState {
  battleSpeed: BattleSpeed
  autoAdvance: boolean
  sound: boolean
  theme: ThemeName
  setBattleSpeed: (s: BattleSpeed) => void
  toggleAutoAdvance: () => void
  toggleSound: () => void
  setTheme: (t: ThemeName) => void
}

const KEY = 'pokerogue:settings'

const hasStorage = typeof localStorage !== 'undefined'

function load(): Partial<SettingsState> {
  if (!hasStorage) return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

function persist(s: SettingsState) {
  if (!hasStorage) return
  localStorage.setItem(
    KEY,
    JSON.stringify({ battleSpeed: s.battleSpeed, autoAdvance: s.autoAdvance, sound: s.sound, theme: s.theme }),
  )
}

const saved = load()

export const useSettings = create<SettingsState>((set, get) => ({
  battleSpeed: (saved.battleSpeed as BattleSpeed) ?? 1,
  autoAdvance: saved.autoAdvance ?? true,
  sound: saved.sound ?? true,
  theme: (saved.theme as ThemeName) ?? 'dark',
  setBattleSpeed: (battleSpeed) => {
    set({ battleSpeed })
    persist(get())
  },
  toggleAutoAdvance: () => {
    set({ autoAdvance: !get().autoAdvance })
    persist(get())
  },
  toggleSound: () => {
    set({ sound: !get().sound })
    persist(get())
  },
  setTheme: (theme) => {
    set({ theme })
    persist(get())
  },
}))
