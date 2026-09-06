// Estado de la DESPEDIDA DE ÓSCAR. Sección aislada (patrón Party/Cyber): no
// toca `gameStore` salvo para volver a Inicio.
//
// Dos decisiones de diseño mandan sobre todo lo demás:
//
// 1. LOS PUNTOS NO SE GUARDAN COMO NÚMERO. Se guardan los retos marcados y los
//    ajustes a mano, y el total se recalcula siempre. Deshacer una cosa mal
//    dada es quitar una línea, no "restar a ojo" — que es exactamente donde
//    estos marcadores acaban en discusión a las tres de la mañana.
//
// 2. EL ESTADO SE FUNDE, NO SE PISA. Cualquiera de la cuadrilla puede marcar
//    desde su móvil, así que dos personas van a tocar a la vez tarde o
//    temprano. En vez de "gana el último que escribe" (que perdería marcas en
//    silencio), cada cosa lleva su instante y los borrados dejan lápida: al
//    fundir dos copias gana el gesto más reciente POR ELEMENTO. Nadie pierde
//    un reto porque otro marcara medio segundo antes.
import { create } from 'zustand'
import { RETOS, RECOMPENSAS, puntosDe, type Reto } from '@/data/despedida'
import { escribirNube, leerNube, nubeConfigurada, saludNube, type SaludNube } from '@/persistence/despedidaNube'

const KEY = 'pokerogue:despedida'

/** Ajuste manual de puntos: para lo que surja y no esté en la lista. */
export interface Ajuste {
  id: string
  delta: number
  motivo: string
  ts: number
}

/**
 * Lo que se comparte entre todos los móviles. `vistas` NO está aquí a
 * propósito: que una caja ya se haya celebrado es cosa de cada pantalla, y así
 * la animación salta en todas y no solo en la del que marcó.
 */
export interface EstadoCompartido {
  v: 2
  /** id de reto -> instante en que se marcó. */
  retos: Record<string, number>
  /** id de reto -> instante en que se desmarcó. La lápida del deshacer. */
  retosBorrados: Record<string, number>
  ajustes: Ajuste[]
  ajustesBorrados: Record<string, number>
  bloqueFijado: string | null
  /** Cuándo se fijó, para poder fundir dos decisiones distintas. */
  bloqueFijadoTs: number
}

export interface DespedidaSave extends EstadoCompartido {
  /** Recompensas cuya animación de apertura ya se ha visto EN ESTE aparato. */
  vistas: string[]
}

const VACIO: DespedidaSave = {
  v: 2,
  retos: {},
  retosBorrados: {},
  ajustes: [],
  ajustesBorrados: {},
  bloqueFijado: null,
  bloqueFijadoTs: 0,
  vistas: [],
}

function objeto(x: unknown): Record<string, number> {
  if (!x || typeof x !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (typeof v === 'number') out[k] = v
  }
  return out
}

/** Normaliza cualquier cosa que venga de localStorage o de la nube. */
function sanear(x: unknown): DespedidaSave {
  const s = (x ?? {}) as Partial<DespedidaSave>
  return {
    v: 2,
    retos: objeto(s.retos),
    retosBorrados: objeto(s.retosBorrados),
    ajustes: Array.isArray(s.ajustes)
      ? s.ajustes.filter((a): a is Ajuste => !!a && typeof a.id === 'string' && typeof a.delta === 'number')
      : [],
    ajustesBorrados: objeto(s.ajustesBorrados),
    bloqueFijado: typeof s.bloqueFijado === 'string' ? s.bloqueFijado : null,
    bloqueFijadoTs: typeof s.bloqueFijadoTs === 'number' ? s.bloqueFijadoTs : 0,
    vistas: Array.isArray(s.vistas) ? s.vistas.filter((v): v is string => typeof v === 'string') : [],
  }
}

function cargar(): DespedidaSave {
  try {
    const raw = localStorage.getItem(KEY)
    return sanear(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...VACIO }
  }
}

function guardar(s: DespedidaSave) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

/** Se queda con el instante más alto de cada clave. */
function fundirMapas(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v)
  return out
}

/**
 * Funde dos copias del marcador. Es conmutativa: da igual quién llegue antes,
 * el resultado es el mismo, que es justo lo que hace falta cuando hay siete
 * móviles escribiendo sin hablar entre ellos.
 */
export function fundir(a: DespedidaSave, b: EstadoCompartido): DespedidaSave {
  const porId = new Map(a.ajustes.map((x) => [x.id, x]))
  for (const x of b.ajustes) if (!porId.has(x.id)) porId.set(x.id, x)
  return {
    v: 2,
    retos: fundirMapas(a.retos, b.retos),
    retosBorrados: fundirMapas(a.retosBorrados, b.retosBorrados),
    ajustes: [...porId.values()].sort((x, y) => x.ts - y.ts),
    ajustesBorrados: fundirMapas(a.ajustesBorrados, b.ajustesBorrados),
    bloqueFijado: b.bloqueFijadoTs > a.bloqueFijadoTs ? b.bloqueFijado : a.bloqueFijado,
    bloqueFijadoTs: Math.max(a.bloqueFijadoTs, b.bloqueFijadoTs),
    vistas: a.vistas,
  }
}

/** Lo que viaja a la nube: todo menos lo que es de esta pantalla. */
function paraNube(s: DespedidaSave): EstadoCompartido {
  const { vistas: _vistas, ...resto } = s
  return resto
}

/** ¿Está marcado ahora mismo? Marcar y desmarcar compiten por instante. */
function estaHecho(s: DespedidaSave, id: string): boolean {
  const marcado = s.retos[id]
  if (marcado === undefined) return false
  return (s.retosBorrados[id] ?? 0) < marcado
}

/** Los ajustes que siguen vivos (los borrados dejan lápida, no desaparecen). */
function ajustesVivos(s: DespedidaSave): Ajuste[] {
  return s.ajustes.filter((a) => (s.ajustesBorrados[a.id] ?? 0) < a.ts)
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

/**
 * Bloques que este dispositivo ya ha destapado. También es DEL DISPOSITIVO: la
 * gracia es que Óscar los vaya descubriendo él, así que lo que destape un
 * organizador en su móvil no puede destapárselo a él.
 */
const REVELADOS_KEY = 'pokerogue:despedida-revelados'

function cargarRevelados(): string[] {
  try {
    const raw = localStorage.getItem(REVELADOS_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

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
  /** Bloques destapados a mano en ESTE dispositivo. */
  revelados: string[]
  /** Recompensa recién desbloqueada pendiente de celebrar (overlay). */
  celebrando: string | null
  /** Cómo se lleva este aparato con el marcador compartido. */
  nube: SaludNube
  puntos: () => number
  hecho: (retoId: string) => boolean
  historial: () => Movimiento[]
  marcarReto: (retoId: string) => void
  desmarcarReto: (retoId: string) => void
  ajustar: (delta: number, motivo: string) => void
  borrarAjuste: (ajusteId: string) => void
  fijarBloque: (bloqueId: string | null) => void
  celebrar: (recompensaId: string | null) => void
  revelar: (bloqueId: string) => void
  entrarJuez: (pin: string) => boolean
  salirJuez: () => void
  reiniciar: () => void
  /** Trae lo que haya en la nube y lo funde con lo de aquí. */
  sincronizar: () => Promise<void>
  arrancarSync: () => () => void
}

const RETO_POR_ID = new Map<string, Reto>(RETOS.map((r) => [r.id, r]))

function totalDe(s: DespedidaSave): number {
  let total = 0
  for (const id of Object.keys(s.retos)) {
    if (!estaHecho(s, id)) continue
    const r = RETO_POR_ID.get(id)
    if (r) total += puntosDe(r)
  }
  for (const a of ajustesVivos(s)) total += a.delta
  return total
}

/** La recompensa más alta que se cruza al pasar de `antes` a `ahora`. */
function cajaCruzada(antes: number, ahora: number): string | null {
  return [...RECOMPENSAS].reverse().find((r) => antes < r.umbral && ahora >= r.umbral)?.id ?? null
}

export const useDespedida = create<DespedidaState>((set, get) => {
  /**
   * Empuja a la nube SIN pisar: relee, funde con lo de aquí y escribe. La
   * ventana de riesgo baja de "todo el rato" a un viaje de ida y vuelta.
   */
  let empujando: Promise<void> | null = null
  const empujar = () => {
    if (!nubeConfigurada()) return
    const hacer = async () => {
      const remoto = await leerNube<EstadoCompartido>()
      const mio = get().save
      const fundido = remoto ? fundir(mio, sanear(remoto.estado)) : mio
      set({ save: fundido, nube: saludNube() })
      guardar(fundido)
      await escribirNube(paraNube(fundido))
      set({ nube: saludNube() })
    }
    // En cadena: dos marcas seguidas no se pisan entre ellas.
    empujando = (empujando ?? Promise.resolve()).then(hacer).catch(() => {})
  }

  /** Aplica un cambio local: guarda, celebra si toca y sube. */
  const aplicar = (next: DespedidaSave, antes: number) => {
    set({ save: next })
    guardar(next)
    const caja = cajaCruzada(antes, totalDe(next))
    if (caja) set({ celebrando: caja })
    empujar()
  }

  return {
    save: cargar(),
    juez: (() => { try { return localStorage.getItem(JUEZ_KEY) === '1' } catch { return false } })(),
    revelados: cargarRevelados(),
    celebrando: null,
    nube: saludNube(),

    puntos: () => totalDe(get().save),
    hecho: (retoId) => estaHecho(get().save, retoId),

    historial: () => {
      const s = get().save
      const movs: Movimiento[] = []
      for (const id of Object.keys(s.retos)) {
        if (!estaHecho(s, id)) continue
        const r = RETO_POR_ID.get(id)
        if (!r) continue
        movs.push({ key: `r:${id}`, tipo: 'reto', texto: r.texto, puntos: puntosDe(r), ts: s.retos[id], retoId: id })
      }
      for (const a of ajustesVivos(s)) {
        movs.push({ key: `a:${a.id}`, tipo: 'ajuste', texto: a.motivo || 'Ajuste manual', puntos: a.delta, ts: a.ts, ajusteId: a.id })
      }
      return movs.sort((x, y) => y.ts - x.ts)
    },

    marcarReto: (retoId) => {
      const { save } = get()
      if (estaHecho(save, retoId)) return
      aplicar({ ...save, retos: { ...save.retos, [retoId]: Date.now() } }, totalDe(save))
    },

    desmarcarReto: (retoId) => {
      const { save } = get()
      if (!estaHecho(save, retoId)) return
      aplicar({ ...save, retosBorrados: { ...save.retosBorrados, [retoId]: Date.now() } }, totalDe(save))
    },

    ajustar: (delta, motivo) => {
      if (!delta) return
      const { save } = get()
      const ajuste: Ajuste = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        delta,
        motivo: motivo.trim(),
        ts: Date.now(),
      }
      aplicar({ ...save, ajustes: [...save.ajustes, ajuste] }, totalDe(save))
    },

    borrarAjuste: (ajusteId) => {
      const { save } = get()
      aplicar({ ...save, ajustesBorrados: { ...save.ajustesBorrados, [ajusteId]: Date.now() } }, totalDe(save))
    },

    fijarBloque: (bloqueId) => {
      const { save } = get()
      aplicar({ ...save, bloqueFijado: bloqueId, bloqueFijadoTs: Date.now() }, totalDe(save))
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

    revelar: (bloqueId) => {
      const { revelados } = get()
      if (revelados.includes(bloqueId)) return
      const next = [...revelados, bloqueId]
      set({ revelados: next })
      try { localStorage.setItem(REVELADOS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
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
      const next = { ...VACIO, vistas: [] }
      set({ save: next, celebrando: null })
      guardar(next)
      empujar()
    },

    sincronizar: async () => {
      const remoto = await leerNube<EstadoCompartido>()
      set({ nube: saludNube() })
      if (!remoto) return
      const antes = totalDe(get().save)
      const fundido = fundir(get().save, sanear(remoto.estado))
      set({ save: fundido })
      guardar(fundido)
      // Si el marcador ha subido por lo que ha hecho OTRO, la caja se celebra
      // igual aquí: es el momento del día y tiene que verse en todas las
      // pantallas, no solo en la del que marcó.
      const ahora = totalDe(fundido)
      if (ahora !== antes) {
        const caja = cajaCruzada(antes, ahora)
        if (caja && !fundido.vistas.includes(caja)) set({ celebrando: caja })
      }
    },

    /**
     * Enciende el sondeo mientras la sección está montada. Devuelve la función
     * de apagado. Además de cada pocos segundos, se refresca al volver a la
     * pestaña: es lo que hace que "refrescas y ya lo ves" sea verdad.
     */
    arrancarSync: () => {
      if (!nubeConfigurada()) return () => {}
      let vivo = true
      let t: ReturnType<typeof setTimeout> | undefined

      // El ritmo depende de cómo vaya la cosa: seis segundos cuando funciona,
      // y mucho más espaciado cuando no, para no machacar la API preguntando
      // por una tabla que todavía no existe. Se sigue reintentando porque
      // puede aparecer a mitad de sesión, en cuanto alguien pegue el SQL.
      const ritmo = (): number => ({ ok: 6000, 'sin-red': 15000, 'sin-tabla': 60000, apagada: 60000 })[saludNube()]

      const ciclo = async () => {
        await get().sincronizar()
        if (vivo) t = setTimeout(() => { void ciclo() }, ritmo())
      }
      void ciclo()

      // Al volver a la pestaña se mira ya: es lo que hace verdad el "refrescas
      // y lo ves" que da por hecho todo el mundo.
      const alVolver = () => { if (document.visibilityState === 'visible') void get().sincronizar() }
      document.addEventListener('visibilitychange', alVolver)
      window.addEventListener('focus', alVolver)
      return () => {
        vivo = false
        if (t) clearTimeout(t)
        document.removeEventListener('visibilitychange', alVolver)
        window.removeEventListener('focus', alVolver)
      }
    },
  }
})

/** Recompensas abiertas con los puntos actuales. */
export function desbloqueadas(puntos: number) {
  return RECOMPENSAS.filter((r) => puntos >= r.umbral)
}

/** La siguiente por caer, o null si ya están todas. */
export function proximaRecompensa(puntos: number) {
  return RECOMPENSAS.find((r) => puntos < r.umbral) ?? null
}
