// Mods de Corsarios: packs que cambian lo que se VE (nombres, retratos,
// frases, especiales, objetos, islas) sin tocar estadísticas ni ids, así que
// una partida guardada vale con cualquier mod y sin ninguno.
//
// Cómo se aplica: los datos del juego son objetos de módulo que el resto del
// código lee en cada render. `aplicarMod` los restaura desde una copia de los
// originales y les pega encima lo que traiga el pack. Quitar el mod es aplicar
// `null`.
import { capitanExtra, PIRATAS, RIVALES } from './piratas'
import { ISLAS } from './islas'
import { FRASE_JEFE, INTRO_ISLA } from './historia'
import type { Pieza, PirataDef, Rareza, SkillKind } from '@/engine/corsarios/types'

export interface ModPirata {
  nombre?: string
  apodo?: string
  frase?: string
  /** data:image/… (subida) o https://… */
  retrato?: string
  especial?: { nombre?: string; desc?: string; kind?: SkillKind }
}

export interface ModObjeto {
  nombre?: string
  imagen?: string
}

export interface ModIsla {
  nombre?: string
  lema?: string
  intro?: string[]
  fases?: string[]
}

export interface Mod {
  formato: 'corsarios-mod'
  version: 1
  id: string
  nombre: string
  autor?: string
  /** Por id de pirata (incluye 'capitan' y los rivales 'r-…'). */
  piratas: Record<string, ModPirata>
  /** Por nombre ORIGINAL del objeto. */
  objetos: Record<string, ModObjeto>
  /** Por índice de isla. */
  islas: Record<string, ModIsla>
  /** Frase del jefe antes de pelear, por id. */
  jefes: Record<string, string>
}

export const TIPOS_ESPECIAL: { kind: SkillKind; nombre: string; desc: string }[] = [
  { kind: 'golpe', nombre: 'Golpe fuerte', desc: 'Mucho daño a un rival.' },
  { kind: 'barrido', nombre: 'Barrido', desc: 'Daño a todos los rivales.' },
  { kind: 'doble', nombre: 'Doble', desc: 'Daño a dos rivales al azar.' },
  { kind: 'aturde', nombre: 'Aturdir', desc: 'Daño y el rival pierde su turno.' },
  { kind: 'veneno', nombre: 'Veneno', desc: 'Daño y veneno durante 3 turnos.' },
  { kind: 'remate', nombre: 'Remate', desc: 'Golpea al más débil; si cae, recupera energía.' },
  { kind: 'rabia', nombre: 'Furia', desc: 'Sube su ataque y golpea.' },
  { kind: 'cura', nombre: 'Curación', desc: 'Cura a toda la tripulación.' },
  { kind: 'escudo', nombre: 'Escudo', desc: 'Escudo para toda la tripulación.' },
]

/** Potencia de cada tipo de especial cuando el mod cambia el tipo. */
const MULT_KIND: Record<SkillKind, number> = {
  golpe: 2.1, barrido: 1.0, doble: 1.4, aturde: 1.7, veneno: 1.35, remate: 2.4, rabia: 1.9, cura: 1.45, escudo: 1.6,
}
const MULT_RAREZA: Record<Rareza, number> = { C: 0.9, R: 1, E: 1.15, L: 1.3 }

export function multEspecial(kind: SkillKind, rareza: Rareza): number {
  return Math.round(MULT_KIND[kind] * MULT_RAREZA[rareza] * 100) / 100
}

// ------------------------------------------------------------------ ESTADO
const ORIG_PIRATAS = new Map<string, PirataDef>([...PIRATAS, ...RIVALES].map((d) => [d.id, structuredClone(d)]))
const ORIG_ISLAS = structuredClone(ISLAS)
const ORIG_INTRO = structuredClone(INTRO_ISLA)
const ORIG_FRASES = { ...FRASE_JEFE }

let activo: Mod | null = null

export const modActivo = () => activo

export function aplicarMod(mod: Mod | null): void {
  // 1) Todo a su ser.
  for (const d of [...PIRATAS, ...RIVALES]) Object.assign(d, structuredClone(ORIG_PIRATAS.get(d.id)!))
  ISLAS.forEach((isla, i) => Object.assign(isla, structuredClone(ORIG_ISLAS[i])))
  INTRO_ISLA.forEach((e, i) => Object.assign(e, structuredClone(ORIG_INTRO[i])))
  for (const k of Object.keys(FRASE_JEFE)) FRASE_JEFE[k] = ORIG_FRASES[k]
  for (const k of Object.keys(capitanExtra) as (keyof typeof capitanExtra)[]) delete capitanExtra[k]
  activo = mod
  if (!mod) return

  const c = mod.piratas.capitan
  if (c) {
    if (c.retrato) capitanExtra.retrato = c.retrato
    if (c.apodo) capitanExtra.apodo = c.apodo
    if (c.frase) capitanExtra.frase = c.frase
    if (c.especial) {
      // El capitán es Épico; si cambia el tipo, la potencia se recalcula.
      capitanExtra.skill = limpio({
        nombre: c.especial.nombre, desc: c.especial.desc || (c.especial.kind ? TIPOS_ESPECIAL.find((t) => t.kind === c.especial!.kind)!.desc : undefined),
        kind: c.especial.kind, mult: c.especial.kind ? multEspecial(c.especial.kind, 'E') : undefined,
      })
    }
  }

  // 2) Encima, lo que traiga el pack.
  for (const d of [...PIRATAS, ...RIVALES]) {
    const m = mod.piratas[d.id]
    if (!m) continue
    if (m.nombre) d.nombre = m.nombre
    if (m.apodo != null) d.apodo = m.apodo
    if (m.frase) d.frase = m.frase
    if (m.retrato) d.look = { ...d.look, retrato: m.retrato }
    if (m.especial) {
      const kind = m.especial.kind ?? d.skill.kind
      d.skill = {
        nombre: m.especial.nombre || d.skill.nombre,
        desc: m.especial.desc || (m.especial.kind ? TIPOS_ESPECIAL.find((t) => t.kind === kind)!.desc : d.skill.desc),
        kind,
        mult: m.especial.kind && m.especial.kind !== d.skill.kind ? multEspecial(kind, d.rareza) : d.skill.mult,
      }
    }
  }
  ISLAS.forEach((isla, i) => {
    const m = mod.islas[String(i)]
    if (!m) return
    if (m.nombre) { isla.nombre = m.nombre; INTRO_ISLA[i].titulo = m.nombre }
    if (m.lema) isla.lema = m.lema
    if (m.intro?.length) INTRO_ISLA[i].lineas = m.intro.filter(Boolean)
    m.fases?.forEach((n, f) => { if (n && isla.fases[f]) isla.fases[f].nombre = n })
  })
  for (const [id, frase] of Object.entries(mod.jefes)) if (frase && id in FRASE_JEFE) FRASE_JEFE[id] = frase
}

/** Lo que el mod cambia del capitán (solo lo visual y su especial). */
export const modCapitan = (): ModPirata | undefined => activo?.piratas.capitan

export function nombrePieza(p: Pick<Pieza, 'nombre'>): string {
  return activo?.objetos[p.nombre]?.nombre || p.nombre
}
export function imagenPieza(p: Pick<Pieza, 'nombre'>): string | undefined {
  return activo?.objetos[p.nombre]?.imagen
}

/** Valores originales (para que el editor enseñe lo que se va a cambiar). */
export const original = (id: string) => ORIG_PIRATAS.get(id)
export const islaOriginal = (i: number) => ({ ...ORIG_ISLAS[i], intro: ORIG_INTRO[i].lineas })
export const fraseOriginal = (id: string) => ORIG_FRASES[id]

// ----------------------------------------------------------- VALIDACIÓN
export function modVacio(nombre = 'Mi mod'): Mod {
  return {
    formato: 'corsarios-mod', version: 1,
    id: `mod-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    nombre, piratas: {}, objetos: {}, islas: {}, jefes: {},
  }
}

const TXT = 60
const LARGO = 400
const IMG_MAX = 600_000

function texto(v: unknown, max: number): string | undefined {
  return typeof v === 'string' ? v.slice(0, max) : undefined
}

/** Solo imágenes embebidas o https: nada de javascript:, http: ni rutas raras. */
export function imagenValida(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length > IMG_MAX) return undefined
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(v)) return v
  if (/^https:\/\/[^\s"'<>]+$/i.test(v)) return v
  return undefined
}

const KINDS = new Set(TIPOS_ESPECIAL.map((t) => t.kind))
const IDS = new Set(['capitan', ...PIRATAS.map((d) => d.id), ...RIVALES.map((d) => d.id)])

/** Limpia un mod que llega de fuera (archivo o texto pegado). Lanza si no lo es. */
export function sanearMod(raw: unknown): Mod {
  if (!raw || typeof raw !== 'object') throw new Error('Eso no es un mod de Corsarios.')
  const r = raw as Record<string, unknown>
  if (r.formato !== 'corsarios-mod') throw new Error('Eso no es un mod de Corsarios.')
  const mod = modVacio(texto(r.nombre, TXT) || 'Mod sin nombre')
  if (typeof r.id === 'string' && /^[\w-]{1,60}$/.test(r.id)) mod.id = r.id
  mod.autor = texto(r.autor, TXT)
  const piratas = (r.piratas ?? {}) as Record<string, Record<string, unknown>>
  for (const [id, p] of Object.entries(piratas)) {
    if (!IDS.has(id) || !p || typeof p !== 'object') continue
    const e = (p.especial ?? {}) as Record<string, unknown>
    const kind = typeof e.kind === 'string' && KINDS.has(e.kind as SkillKind) ? (e.kind as SkillKind) : undefined
    const especial = { nombre: texto(e.nombre, TXT), desc: texto(e.desc, LARGO), kind }
    mod.piratas[id] = limpio({
      nombre: texto(p.nombre, TXT), apodo: texto(p.apodo, TXT), frase: texto(p.frase, LARGO),
      retrato: imagenValida(p.retrato),
      especial: especial.nombre || especial.desc || especial.kind ? limpio(especial) : undefined,
    })
  }
  const objetos = (r.objetos ?? {}) as Record<string, Record<string, unknown>>
  for (const [k, o] of Object.entries(objetos)) {
    if (!o || typeof o !== 'object' || k.length > TXT) continue
    mod.objetos[k] = limpio({ nombre: texto(o.nombre, TXT), imagen: imagenValida(o.imagen) })
  }
  const islas = (r.islas ?? {}) as Record<string, Record<string, unknown>>
  for (const [k, i] of Object.entries(islas)) {
    if (!/^[0-5]$/.test(k) || !i || typeof i !== 'object') continue
    mod.islas[k] = limpio({
      nombre: texto(i.nombre, TXT), lema: texto(i.lema, LARGO),
      intro: Array.isArray(i.intro) ? i.intro.slice(0, 6).map((l) => texto(l, LARGO) ?? '') : undefined,
      fases: Array.isArray(i.fases) ? i.fases.slice(0, 4).map((l) => texto(l, TXT) ?? '') : undefined,
    })
  }
  const jefes = (r.jefes ?? {}) as Record<string, unknown>
  for (const [k, v] of Object.entries(jefes)) {
    const t = texto(v, LARGO)
    if (t && k in ORIG_FRASES) mod.jefes[k] = t
  }
  return mod
}

function limpio<T extends object>(o: T): T {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined || o[k] === '') delete o[k]
  return o
}

/** Cuántas cosas cambia el mod (para enseñarlo en la lista). */
export function resumenMod(m: Mod): string {
  const p = Object.keys(m.piratas).length
  const o = Object.keys(m.objetos).length
  const i = Object.keys(m.islas).length + Object.keys(m.jefes).length
  return [`${p} pirata${p === 1 ? '' : 's'}`, `${o} objeto${o === 1 ? '' : 's'}`, `${i} texto${i === 1 ? '' : 's'} de islas`].join(' · ')
}
