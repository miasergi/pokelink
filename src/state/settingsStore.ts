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
  /**
   * Inazuma: cuánto decides, POR CONTEXTO. Partidos y pachangas se configuran
   * por separado: hay quien quiere las pachangas en auto y los partidos
   * duelo a duelo.
   */
  inazumaModeMatch: 'auto' | 'dinamico' | 'completo'
  inazumaModePachanga: 'auto' | 'dinamico' | 'completo'
  /** Simulación INSTANTÁNEA: entrar y ver directamente el resultado. */
  inazumaSimMatch: boolean
  inazumaSimPachanga: boolean
  theme: ThemeName
  setBattleSpeed: (s: BattleSpeed) => void
  toggleAutoAdvance: () => void
  toggleSound: () => void
  toggleMusic: () => void
  toggleSkipNodeInfo: () => void
  toggleShowOdds: () => void
  setInazumaModeMatch: (m: 'auto' | 'dinamico' | 'completo') => void
  setInazumaModePachanga: (m: 'auto' | 'dinamico' | 'completo') => void
  toggleInazumaSimMatch: () => void
  toggleInazumaSimPachanga: () => void
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
    JSON.stringify({ battleSpeed: s.battleSpeed, autoAdvance: s.autoAdvance, sound: s.sound, music: s.music, skipNodeInfo: s.skipNodeInfo, showOdds: s.showOdds, inazumaModeMatch: s.inazumaModeMatch, inazumaModePachanga: s.inazumaModePachanga, inazumaSimMatch: s.inazumaSimMatch, inazumaSimPachanga: s.inazumaSimPachanga, theme: s.theme }),
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
  // El ajuste viejo `inazumaMode` (único) migra como valor por defecto de ambos.
  inazumaModeMatch: (saved.inazumaModeMatch ?? (saved as Record<string, unknown>).inazumaMode ?? 'dinamico') as 'auto' | 'dinamico' | 'completo',
  inazumaModePachanga: (saved.inazumaModePachanga ?? (saved as Record<string, unknown>).inazumaMode ?? 'dinamico') as 'auto' | 'dinamico' | 'completo',
  inazumaSimMatch: saved.inazumaSimMatch ?? false,
  inazumaSimPachanga: saved.inazumaSimPachanga ?? false,
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
  setInazumaModeMatch: (inazumaModeMatch) => {
    set({ inazumaModeMatch })
    persist(get())
  },
  setInazumaModePachanga: (inazumaModePachanga) => {
    set({ inazumaModePachanga })
    persist(get())
  },
  toggleInazumaSimMatch: () => {
    set({ inazumaSimMatch: !get().inazumaSimMatch })
    persist(get())
  },
  toggleInazumaSimPachanga: () => {
    set({ inazumaSimPachanga: !get().inazumaSimPachanga })
    persist(get())
  },
  setTheme: (theme) => {
    set({ theme })
    persist(get())
  },
}))
