import { create } from 'zustand'

export type BattleSpeed = 1 | 2 | 4 | 8
export type ThemeName = 'dark' | 'midnight'

interface SettingsState {
  battleSpeed: BattleSpeed
  autoAdvance: boolean
  sound: boolean
  music: boolean
  skipNodeInfo: boolean
  /** Inazuma: enseñar el % de la jugada además de las estrellas. */
  showOdds: boolean
  /** Inazuma: cuánto decides en los partidos (auto/dinamico/completo). */
  inazumaMode: 'auto' | 'dinamico' | 'completo'
  theme: ThemeName
  setBattleSpeed: (s: BattleSpeed) => void
  toggleAutoAdvance: () => void
  toggleSound: () => void
  toggleMusic: () => void
  toggleSkipNodeInfo: () => void
  toggleShowOdds: () => void
  setInazumaMode: (m: 'auto' | 'dinamico' | 'completo') => void
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
    JSON.stringify({ battleSpeed: s.battleSpeed, autoAdvance: s.autoAdvance, sound: s.sound, music: s.music, skipNodeInfo: s.skipNodeInfo, showOdds: s.showOdds, inazumaMode: s.inazumaMode, theme: s.theme }),
  )
}

const saved = load()

export const useSettings = create<SettingsState>((set, get) => ({
  battleSpeed: (saved.battleSpeed as BattleSpeed) ?? 1,
  autoAdvance: saved.autoAdvance ?? true,
  sound: saved.sound ?? true,
  music: saved.music ?? false,
  skipNodeInfo: saved.skipNodeInfo ?? false,
  showOdds: saved.showOdds ?? false,
  inazumaMode: (saved.inazumaMode as 'auto' | 'dinamico' | 'completo') ?? 'dinamico',
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
  toggleMusic: () => {
    set({ music: !get().music })
    persist(get())
  },
  toggleSkipNodeInfo: () => {
    set({ skipNodeInfo: !get().skipNodeInfo })
    persist(get())
  },
  toggleShowOdds: () => {
    set({ showOdds: !get().showOdds })
    persist(get())
  },
  setInazumaMode: (inazumaMode) => {
    set({ inazumaMode })
    persist(get())
  },
  setTheme: (theme) => {
    set({ theme })
    persist(get())
  },
}))
