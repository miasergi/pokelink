// Estado de la DESPEDIDA DE ÓSCAR. Sección aislada (patrón Party/Cyber): no
// toca `gameStore` salvo para volver a Inicio, y persiste en localStorage.
//
// Decisión de diseño: los PUNTOS NO SE GUARDAN COMO NÚMERO. Se guardan los
// retos marcados y los ajustes manuales, y el total se recalcula siempre. Así
// deshacer una cosa mal marcada es quitar una línea, no "restar a ojo" — que
// es exactamente donde estos marcadores acaban en discusión.
import { create } from 'zustand'
import { RETOS, RECOMPENSAS, type Reto } from '@/data/despedida'

const KEY = 'pokerogue:despedida'

/** Ajuste manual de puntos: para lo que surja y no esté en la lista. */
export interface Ajuste {
  id: string
  delta: number
  motivo: string
  ts: number
}

export interface DespedidaSave {
  v: 1
  /** id de reto -> instante en que se marcó. */
  retos: Record<string, number>
  ajustes: Ajuste[]
  /** Recompensas cuya animación de apertura ya se ha visto. */
  vistas: string[]
  /** Bloque fijado a mano: manda sobre el reloj cuando el horario se desmadra. */
  bloqueFijado: string | null
}

const VACIO: DespedidaSave = { v: 1, retos: {}, ajustes: [], vistas: [], bloqueFijado: null }

function cargar(): DespedidaSave {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...VACIO }
    const s = JSON.parse(raw) as Partial<DespedidaSave>
    return {
      v: 1,
      retos: s.retos && typeof s.retos === 'object' ? s.retos : {},
      ajustes: Array.isArray(s.ajustes) ? s.ajustes : [],
      vistas: Array.isArray(s.vistas) ? s.vistas : [],
      bloqueFijado: typeof s.bloqueFijado === 'string' ? s.bloqueFijado : null,
    }
  } catch {
    return { ...VACIO }
  }
}

function guardar(s: DespedidaSave) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

/**
 * Modo juez: quien lleva el marcador. Vive aparte del save porque es una
 * propiedad DEL DISPOSITIVO, no de la partida — el móvil de Sergi es juez, el
 * de Óscar no, y eso no se sincroniza ni se resetea con los puntos.
 *
 * El PIN es un cerrojo de cortesía, no seguridad: está en el código y
 * cualquiera que mire el bundle lo ve. Solo evita que Óscar se autopuntúe de
 * un toque sin querer.
 */
const JUEZ_KEY = 'pokerogue:despedida-juez'
export const PIN_JUEZ = '1209'

export interface Movimiento {
  /** Clave única para React y para deshacer. */
  key: string
  tipo: 'reto' | 'ajuste'
  texto: string
  puntos: number
  ts: number
  /** Solo en 'reto': para poder desmarcarlo. */
  retoId?: string
  ajusteId?: string
}

interface DespedidaState {
  save: DespedidaSave
  juez: boolean
  /** Recompensa recién desbloqueada pendiente de celebrar (overlay). */
  celebrando: string | null
  puntos: () => number
  hecho: (retoId: string) => boolean
  historial: () => Movimiento[]
  marcarReto: (retoId: string) => void
  desmarcarReto: (retoId: string) => void
  ajustar: (delta: number, motivo: string) => void
  borrarAjuste: (ajusteId: string) => void
  fijarBloque: (bloqueId: string | null) => void
  celebrar: (recompensaId: string | null) => void
  entrarJuez: (pin: string) => boolean
  salirJuez: () => void
  reiniciar: () => void
}

const RETO_POR_ID = new Map<string, Reto>(RETOS.map((r) => [r.id, r]))

export const useDespedida = create<DespedidaState>((set, get) => ({
  save: cargar(),
  juez: (() => { try { return localStorage.getItem(JUEZ_KEY) === '1' } catch { return false } })(),
  celebrando: null,

  puntos: () => {
    const { retos, ajustes } = get().save
    let total = 0
    for (const id of Object.keys(retos)) total += RETO_POR_ID.get(id)?.puntos ?? 0
    for (const a of ajustes) total += a.delta
    return total
  },

  hecho: (retoId) => retoId in get().save.retos,

  historial: () => {
    const { retos, ajustes } = get().save
    const movs: Movimiento[] = []
    for (const [id, ts] of Object.entries(retos)) {
      const r = RETO_POR_ID.get(id)
      if (!r) continue
      movs.push({ key: `r:${id}`, tipo: 'reto', texto: r.texto, puntos: r.puntos, ts, retoId: id })
    }
    for (const a of ajustes) {
      movs.push({ key: `a:${a.id}`, tipo: 'ajuste', texto: a.motivo || 'Ajuste manual', puntos: a.delta, ts: a.ts, ajusteId: a.id })
    }
    return movs.sort((x, y) => y.ts - x.ts)
  },

  marcarReto: (retoId) => {
    const { save } = get()
    if (retoId in save.retos) return
    const antes = get().puntos()
    const next = { ...save, retos: { ...save.retos, [retoId]: Date.now() } }
    set({ save: next })
    guardar(next)
    // ¿Ha cruzado algún umbral con esto? Se celebra la MÁS ALTA cruzada, que es
    // la que emociona (si un solo reto cruza dos, la pequeña ya se da por vista).
    const ahora = get().puntos()
    const cruzada = [...RECOMPENSAS].reverse().find((r) => antes < r.umbral && ahora >= r.umbral)
    if (cruzada) set({ celebrando: cruzada.id })
  },

  desmarcarReto: (retoId) => {
    const { save } = get()
    if (!(retoId in save.retos)) return
    const retos = { ...save.retos }
    delete retos[retoId]
    const next = { ...save, retos }
    set({ save: next })
    guardar(next)
  },

  ajustar: (delta, motivo) => {
    if (!delta) return
    const { save } = get()
    const antes = get().puntos()
    const ajuste: Ajuste = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, delta, motivo: motivo.trim(), ts: Date.now() }
    const next = { ...save, ajustes: [...save.ajustes, ajuste] }
    set({ save: next })
    guardar(next)
    const ahora = get().puntos()
    const cruzada = [...RECOMPENSAS].reverse().find((r) => antes < r.umbral && ahora >= r.umbral)
    if (cruzada) set({ celebrando: cruzada.id })
  },

  borrarAjuste: (ajusteId) => {
    const { save } = get()
    const next = { ...save, ajustes: save.ajustes.filter((a) => a.id !== ajusteId) }
    set({ save: next })
    guardar(next)
  },

  fijarBloque: (bloqueId) => {
    const next = { ...get().save, bloqueFijado: bloqueId }
    set({ save: next })
    guardar(next)
  },

  celebrar: (recompensaId) => {
    if (recompensaId === null) {
      // Al cerrar la celebración se anota como vista: no vuelve a saltar.
      const { save, celebrando } = get()
      if (celebrando && !save.vistas.includes(celebrando)) {
        const next = { ...save, vistas: [...save.vistas, celebrando] }
        set({ save: next })
        guardar(next)
      }
      set({ celebrando: null })
      return
    }
    set({ celebrando: recompensaId })
  },

  entrarJuez: (pin) => {
    if (pin.trim() !== PIN_JUEZ) return false
    try { localStorage.setItem(JUEZ_KEY, '1') } catch { /* ignore */ }
    set({ juez: true })
    return true
  },

  salirJuez: () => {
    try { localStorage.removeItem(JUEZ_KEY) } catch { /* ignore */ }
    set({ juez: false })
  },

  reiniciar: () => {
    const next = { ...VACIO }
    set({ save: next, celebrando: null })
    guardar(next)
  },
}))

/** Recompensas abiertas con los puntos actuales. */
export function desbloqueadas(puntos: number) {
  return RECOMPENSAS.filter((r) => puntos >= r.umbral)
}

/** La siguiente por caer, o null si ya están todas. */
export function proximaRecompensa(puntos: number) {
  return RECOMPENSAS.find((r) => puntos < r.umbral) ?? null
}
