// Progreso de la cuenta en Corsarios: taberna (gacha), formación, entrenar,
// equipo, encargos del día, Mar Abierto y lo que te llevas de cada combate.
// Funciones PURAS: reciben el save y devuelven uno nuevo, para que el store
// solo tenga que guardarlo.
import { RNG } from '@/utils/rng'
import { capitanDef, getPirata, PIRATAS, RIVALES } from '@/data/corsarios/piratas'
import { faseKey, ISLAS } from '@/data/corsarios/islas'
import { BONUS, NOMBRES, tablaBotin, VENTA } from '@/data/corsarios/equipo'
import { crearUnidad, poder, simular } from './battle'
import type {
  Clase, CorsariosSave, Diario, PirataDef, Pieza, Rareza, Resultado, TipoPieza, Tripulante, Unidad,
} from './types'

export const NIVEL_MAX = 60
export const COSTE_TABERNA = 250
export const COSTE_PERLAS = 100
export const COSTE_PERLAS_10 = 900
export const PIEDAD_MAX = 40
export const ESTRELLAS_MAX = 5
export const INVENTARIO_MAX = 60

const PROB_TABERNA: [Rareza, number][] = [['C', 0.7], ['R', 0.26], ['E', 0.04]]
const PROB_PERLAS: [Rareza, number][] = [['R', 0.72], ['E', 0.24], ['L', 0.04]]
/** Doblones de consuelo por un duplicado cuando ya está a 5 estrellas. */
const CONSUELO: Record<Rareza, number> = { C: 100, R: 300, E: 800, L: 2000 }

export function hoy(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const diarioVacio = (dia: string): Diario => ({ dia, victorias: 0, tiradas: 0, entrenos: 0, cobrados: [] })

export function nuevaPartida(nombre: string, clase: Exclude<Clase, 'apoyo'>, seed: number, ahora = Date.now()): CorsariosSave {
  return {
    v: 1,
    capitan: { nombre: nombre.trim() || 'Capitán', clase },
    nivel: 1, xp: 0, doblones: 500, perlas: 300,
    tripulacion: [{ id: 'tomas', nivel: 1, estrellas: 1 }],
    formacion: ['capitan', 'tomas'],
    estrellas: {}, piedad: 0, gratisDia: '',
    seed: seed >>> 0, combates: 0, creado: ahora,
    equipoCapitan: {}, inventario: [], piezasSeq: 0,
    marPiso: 0, vistos: [], diario: diarioVacio(''), victorias: 0,
  }
}

/** Rellena los campos que no existían en saves más antiguos. */
export function migrar(s: CorsariosSave): CorsariosSave {
  return {
    ...s,
    equipoCapitan: s.equipoCapitan ?? {},
    inventario: s.inventario ?? [],
    piezasSeq: s.piezasSeq ?? 0,
    marPiso: s.marPiso ?? 0,
    vistos: s.vistos ?? [],
    diario: s.diario ?? diarioVacio(''),
    victorias: s.victorias ?? 0,
  }
}

// ------------------------------------------------------------------ NIVEL
export function xpParaNivel(n: number): number {
  return 40 + n * 24
}

/** Suma XP al capitán y a la formación; devuelve cuántos niveles sube el capitán. */
function darXp(s: CorsariosSave, xp: number): number {
  let subidas = 0
  s.xp += xp
  while (s.nivel < NIVEL_MAX && s.xp >= xpParaNivel(s.nivel)) {
    s.xp -= xpParaNivel(s.nivel)
    s.nivel++
    subidas++
  }
  if (s.nivel >= NIVEL_MAX) s.xp = 0
  // La tripulación que ha peleado aprende lo mismo, sin pasar al capitán.
  for (const id of s.formacion) {
    const t = s.tripulacion.find((x) => x.id === id)
    if (!t) continue
    t.xp = (t.xp ?? 0) + xp
    while (t.nivel < s.nivel && t.xp >= xpParaNivel(t.nivel)) {
      t.xp -= xpParaNivel(t.nivel)
      t.nivel++
    }
    if (t.nivel >= s.nivel) t.xp = 0
  }
  return subidas
}

// ------------------------------------------------------------------ ISLAS
export const faseSuperada = (s: CorsariosSave, i: number, f: number) => (s.estrellas[faseKey(i, f)] ?? 0) > 0
export const islaSuperada = (s: CorsariosSave, i: number) => faseSuperada(s, i, ISLAS[i].fases.length - 1)

/** Una fase está abierta si es la primera o la anterior está superada. */
export function faseAbierta(s: CorsariosSave, i: number, f: number): boolean {
  if (f > 0) return faseSuperada(s, i, f - 1)
  if (i === 0) return true
  return islaSuperada(s, i - 1)
}

export const islaAbierta = (s: CorsariosSave, i: number) => faseAbierta(s, i, 0)
export const campanaTerminada = (s: CorsariosSave) => islaSuperada(s, ISLAS.length - 1)

/** Huecos de la formación (capitán incluido): 3, 4 tras la isla 1, 5 tras la 3. */
export function huecos(s: CorsariosSave): number {
  return 3 + (islaSuperada(s, 0) ? 1 : 0) + (islaSuperada(s, 2) ? 1 : 0)
}

/** Los jefes vencidos se unen al cartel de la taberna. */
export function disponibles(s: CorsariosSave): PirataDef[] {
  return PIRATAS.filter((d) => d.desbloqueaIsla == null || islaSuperada(s, d.desbloqueaIsla))
}

// ------------------------------------------------------------------ EQUIPO
export type Portador = string // 'capitan' o id de tripulante

function ranuras(s: CorsariosSave, quien: Portador): { arma?: string; amuleto?: string } | undefined {
  if (quien === 'capitan') return s.equipoCapitan
  return s.tripulacion.find((t) => t.id === quien)
}

export function pieza(s: CorsariosSave, uid: string | undefined): Pieza | undefined {
  return uid ? s.inventario.find((p) => p.uid === uid) : undefined
}

/** Quién lleva una pieza (o undefined si está en la bodega). */
export function portadorDe(s: CorsariosSave, uid: string): Portador | undefined {
  if (s.equipoCapitan.arma === uid || s.equipoCapitan.amuleto === uid) return 'capitan'
  return s.tripulacion.find((t) => t.arma === uid || t.amuleto === uid)?.id
}

export function bonusEquipo(s: CorsariosSave, quien: Portador): { atk: number; vida: number } {
  const r = ranuras(s, quien)
  return { atk: pieza(s, r?.arma)?.bonus ?? 0, vida: pieza(s, r?.amuleto)?.bonus ?? 0 }
}

/** Equipa la pieza al portador (quitándosela a quien la llevara). */
export function equipar(s0: CorsariosSave, quien: Portador, uid: string): CorsariosSave {
  const p = pieza(s0, uid)
  if (!p || !ranuras(s0, quien)) return s0
  const s: CorsariosSave = structuredClone(s0)
  const otro = portadorDe(s, uid)
  if (otro) delete ranuras(s, otro)![p.tipo]
  ranuras(s, quien)![p.tipo] = uid
  return s
}

export function desequipar(s0: CorsariosSave, quien: Portador, tipo: TipoPieza): CorsariosSave {
  const r = ranuras(s0, quien)
  if (!r?.[tipo]) return s0
  const s: CorsariosSave = structuredClone(s0)
  delete ranuras(s, quien)![tipo]
  return s
}

export function vender(s0: CorsariosSave, uid: string): CorsariosSave {
  const p = pieza(s0, uid)
  if (!p) return s0
  const s: CorsariosSave = structuredClone(s0)
  const otro = portadorDe(s, uid)
  if (otro) delete ranuras(s, otro)![p.tipo]
  s.inventario = s.inventario.filter((x) => x.uid !== uid)
  s.doblones += VENTA[p.rareza]
  return s
}

/** Vende de golpe todo lo de la bodega (sin equipar) de esa rareza o peor. */
export function venderSobrantes(s0: CorsariosSave, hasta: Rareza): { save: CorsariosSave; vendidas: number; doblones: number } {
  const orden: Rareza[] = ['C', 'R', 'E', 'L']
  const tope = orden.indexOf(hasta)
  const sobran = s0.inventario.filter((p) => orden.indexOf(p.rareza) <= tope && !portadorDe(s0, p.uid))
  if (!sobran.length) return { save: s0, vendidas: 0, doblones: 0 }
  const s: CorsariosSave = structuredClone(s0)
  const fuera = new Set(sobran.map((p) => p.uid))
  s.inventario = s.inventario.filter((p) => !fuera.has(p.uid))
  const doblones = sobran.reduce((t, p) => t + VENTA[p.rareza], 0)
  s.doblones += doblones
  return { save: s, vendidas: sobran.length, doblones }
}

function rarezaAl(rng: RNG, tabla: [Rareza, number][]): Rareza {
  let x = rng.next()
  for (const [r, p] of tabla) {
    if (x < p) return r
    x -= p
  }
  return tabla[tabla.length - 1][0]
}

/** Genera una pieza y la mete en la bodega (o la vende si está llena). Muta `s`. */
function soltarPieza(s: CorsariosSave, rng: RNG, progreso: number, minima?: Rareza): { pieza: Pieza; vendida: boolean } {
  let rareza = rarezaAl(rng, tablaBotin(progreso))
  const orden: Rareza[] = ['C', 'R', 'E', 'L']
  if (minima && orden.indexOf(rareza) < orden.indexOf(minima)) rareza = minima
  const tipo: TipoPieza = rng.chance(0.5) ? 'arma' : 'amuleto'
  const p: Pieza = { uid: `p${++s.piezasSeq}`, tipo, rareza, nombre: rng.pick(NOMBRES[tipo][rareza]), bonus: BONUS[rareza] }
  if (s.inventario.length >= INVENTARIO_MAX) {
    s.doblones += VENTA[rareza]
    return { pieza: p, vendida: true }
  }
  s.inventario.push(p)
  return { pieza: p, vendida: false }
}

// --------------------------------------------------------------- UNIDADES
export function unidadesAliadas(s: CorsariosSave): Unidad[] {
  return s.formacion.map((id, k) => {
    const equipo = bonusEquipo(s, id)
    if (id === 'capitan') {
      return crearUnidad(capitanDef(s.capitan.nombre, s.capitan.clase), s.nivel, 'a', `a${k}`, { equipo })
    }
    const t = s.tripulacion.find((x) => x.id === id)!
    return crearUnidad(getPirata(id), t.nivel, 'a', `a${k}`, { estrellas: t.estrellas, equipo })
  })
}

export function unidadesFase(i: number, f: number): Unidad[] {
  const fase = ISLAS[i].fases[f]
  return fase.rivales.map((r, k) => {
    const def = getPirata(r.id)
    return crearUnidad(def, r.nivel, 'e', `e${k}`, { jefe: !r.id.startsWith('r-') })
  })
}

export const poderEquipo = (us: Unidad[]) => us.reduce((t, u) => t + poder(u), 0)

// ------------------------------------------------------------ ENCARGOS
export interface Encargo {
  texto: string
  meta: number
  campo: 'victorias' | 'tiradas' | 'entrenos'
  perlas?: number
  doblones?: number
}

export const ENCARGOS: Encargo[] = [
  { texto: 'Gana 5 combates', meta: 5, campo: 'victorias', perlas: 40 },
  { texto: 'Invita a una ronda en la taberna', meta: 1, campo: 'tiradas', perlas: 20 },
  { texto: 'Entrena 3 veces a tu tripulación', meta: 3, campo: 'entrenos', doblones: 600 },
]

/** El diario de hoy (se reinicia solo al cambiar de día). */
export function diarioHoy(s: CorsariosSave, dia = hoy()): Diario {
  return s.diario.dia === dia ? s.diario : diarioVacio(dia)
}

function contar(s: CorsariosSave, campo: Encargo['campo'], dia: string) {
  const d = diarioHoy(s, dia)
  s.diario = { ...d, cobrados: [...d.cobrados], [campo]: d[campo] + 1 }
}

export function encargoListo(s: CorsariosSave, k: number, dia = hoy()): boolean {
  const d = diarioHoy(s, dia)
  return d[ENCARGOS[k].campo] >= ENCARGOS[k].meta && !d.cobrados.includes(k)
}

export const encargosPendientes = (s: CorsariosSave, dia = hoy()) => ENCARGOS.filter((_, k) => encargoListo(s, k, dia)).length

export function cobrarEncargo(s0: CorsariosSave, k: number, dia = hoy()): CorsariosSave {
  if (!encargoListo(s0, k, dia)) return s0
  const s: CorsariosSave = structuredClone(s0)
  const d = diarioHoy(s, dia)
  s.diario = { ...d, cobrados: [...d.cobrados, k] }
  s.perlas += ENCARGOS[k].perlas ?? 0
  s.doblones += ENCARGOS[k].doblones ?? 0
  return s
}

// -------------------------------------------------------------- COMBATE
export interface Botin {
  gana: boolean
  estrellas: number
  primera: boolean
  doblones: number
  perlas: number
  xp: number
  subidas: number
  /** Pirata que entra en la taberna por vencer al jefe. */
  desbloqueado?: string
  /** Hueco nuevo de formación conseguido. */
  huecoNuevo?: boolean
  pieza?: Pieza
  /** La bodega estaba llena y la pieza se vendió sola. */
  piezaVendida?: boolean
  /** Primera victoria contra el Almirante: toca el final. */
  final?: boolean
  /** Piso del Mar Abierto superado. */
  piso?: number
}

export function estrellasDe(r: Resultado, nAliados: number): number {
  if (r.gana !== 'a') return 0
  const caidos = nAliados - r.vivos
  return caidos === 0 ? 3 : caidos === 1 ? 2 : 1
}

const semillaCombate = (s: CorsariosSave) => (s.seed ^ Math.imul(s.combates + 1, 2654435761)) >>> 0

/** Simula la fase con la formación actual (determinista por save.seed + combates). */
export function combatir(s: CorsariosSave, i: number, f: number): Resultado {
  return simular(unidadesAliadas(s), unidadesFase(i, f), semillaCombate(s))
}

export function aplicarResultado(s0: CorsariosSave, i: number, f: number, r: Resultado, dia = hoy()): { save: CorsariosSave; botin: Botin } {
  const s: CorsariosSave = structuredClone(s0)
  const rng = new RNG(semillaCombate(s) ^ 0x9e3779b9)
  s.combates++
  const g = i * 4 + f
  const jefe = !!ISLAS[i].fases[f].jefe
  const est = estrellasDe(r, s.formacion.length)
  const key = faseKey(i, f)
  const antes = s.estrellas[key] ?? 0
  const huecosAntes = huecos(s)
  const botin: Botin = { gana: est > 0, estrellas: est, primera: false, doblones: 0, perlas: 0, xp: 0, subidas: 0 }

  if (est > 0) {
    botin.primera = antes === 0
    botin.doblones = Math.round((100 + g * 40) * (botin.primera ? 2 : 0.6) * (jefe ? 1.5 : 1))
    botin.xp = Math.round((60 + g * 30) * (botin.primera ? 1.5 : 0.7) * (jefe ? 1.5 : 1))
    if (botin.primera) botin.perlas += jefe ? 120 : 40
    if (est === 3 && antes < 3) botin.perlas += 20
    s.estrellas[key] = Math.max(antes, est)
    if (botin.primera && jefe) {
      const def = PIRATAS.find((d) => d.desbloqueaIsla === i)
      if (def) botin.desbloqueado = def.id
      if (i === ISLAS.length - 1) botin.final = true
    }
    // Botín: los jefes siempre sueltan algo (raro como mínimo la primera vez).
    if (jefe || rng.chance(0.3)) {
      const { pieza: p, vendida } = soltarPieza(s, rng, g / 23, jefe && botin.primera ? 'R' : undefined)
      botin.pieza = p
      botin.piezaVendida = vendida
    }
    s.victorias++
    contar(s, 'victorias', dia)
  } else {
    botin.xp = Math.round((60 + g * 30) * 0.25)
  }
  cerrar(s, botin, huecosAntes)
  return { save: s, botin }
}

function cerrar(s: CorsariosSave, botin: Botin, huecosAntes: number) {
  s.doblones += botin.doblones
  s.perlas += botin.perlas
  botin.subidas = darXp(s, botin.xp)
  s.perlas += botin.subidas * 10
  botin.perlas += botin.subidas * 10
  botin.huecoNuevo = huecos(s) > huecosAntes
}

// ------------------------------------------------------------ MAR ABIERTO
/** Rivales del piso `n` (deterministas: el mismo piso, los mismos rivales). */
export function unidadesMar(n: number): Unidad[] {
  const rng = new RNG(0x51ed + n * 7919)
  const nivel = Math.min(NIVEL_MAX, 56 + n)
  const estrellas = Math.min(ESTRELLAS_MAX, 1 + Math.floor((n - 1) / 5))
  // Pasado el piso 25 ya no hay más estrellas: sube un multiplicador.
  const mult = 1 + Math.max(0, n - 25) * 0.04
  const jefes = PIRATAS.filter((d) => d.desbloqueaIsla != null)
  const rasos = RIVALES.filter((d) => d.rareza === 'R')
  const ids: { def: PirataDef; jefe: boolean }[] = rng.sample(rasos.length >= 4 ? rasos : RIVALES, n % 5 === 0 ? 3 : 4).map((def) => ({ def, jefe: false }))
  if (n % 5 === 0) ids.splice(1, 0, { def: rng.pick(jefes), jefe: true })
  return ids.map(({ def, jefe }, k) => crearUnidad(def, nivel, 'e', `e${k}`, { estrellas, mult, jefe }))
}

export const pisoActual = (s: CorsariosSave) => s.marPiso + 1

export function combatirMar(s: CorsariosSave): Resultado {
  return simular(unidadesAliadas(s), unidadesMar(pisoActual(s)), semillaCombate(s))
}

export function aplicarMar(s0: CorsariosSave, r: Resultado, dia = hoy()): { save: CorsariosSave; botin: Botin } {
  const s: CorsariosSave = structuredClone(s0)
  const rng = new RNG(semillaCombate(s) ^ 0x85ebca6b)
  s.combates++
  const n = pisoActual(s)
  const est = estrellasDe(r, s.formacion.length)
  const huecosAntes = huecos(s)
  const botin: Botin = { gana: est > 0, estrellas: est, primera: est > 0, doblones: 0, perlas: 0, xp: 0, subidas: 0 }
  if (est > 0) {
    s.marPiso = n
    botin.piso = n
    botin.doblones = 400 + n * 40
    botin.xp = 900 + n * 30
    botin.perlas = n % 5 === 0 ? 60 : 15
    if (n % 5 === 0 || rng.chance(0.5)) {
      const { pieza: p, vendida } = soltarPieza(s, rng, 1 + n / 50, n % 5 === 0 ? 'E' : undefined)
      botin.pieza = p
      botin.piezaVendida = vendida
    }
    s.victorias++
    contar(s, 'victorias', dia)
  } else {
    botin.xp = 200
  }
  cerrar(s, botin, huecosAntes)
  return { save: s, botin }
}

// ---------------------------------------------------------------- TABERNA
export type Banner = 'taberna' | 'perlas'

export interface Tirada {
  id: string
  rareza: Rareza
  nuevo: boolean
  /** Estrellas tras la tirada (si era duplicado). */
  estrellas: number
  consuelo?: number
}

export const tiradaGratis = (s: CorsariosSave, dia = hoy()) => s.gratisDia !== dia

export function puedeTirar(s: CorsariosSave, banner: Banner, n: 1 | 10, dia = hoy()): boolean {
  if (banner === 'taberna') return n === 1 && (tiradaGratis(s, dia) || s.doblones >= COSTE_TABERNA)
  return s.perlas >= (n === 10 ? COSTE_PERLAS_10 : COSTE_PERLAS)
}

export function tirar(s0: CorsariosSave, banner: Banner, n: 1 | 10, seed: number, dia = hoy()): { save: CorsariosSave; tiradas: Tirada[] } {
  if (!puedeTirar(s0, banner, n, dia)) return { save: s0, tiradas: [] }
  const s: CorsariosSave = structuredClone(s0)
  const rng = new RNG(seed)
  if (banner === 'taberna') {
    if (tiradaGratis(s, dia)) s.gratisDia = dia
    else s.doblones -= COSTE_TABERNA
    contar(s, 'tiradas', dia)
  } else {
    s.perlas -= n === 10 ? COSTE_PERLAS_10 : COSTE_PERLAS
  }
  const pool = disponibles(s)
  const rarezas: Rareza[] = []
  for (let k = 0; k < n; k++) {
    let r = rarezaAl(rng, banner === 'taberna' ? PROB_TABERNA : PROB_PERLAS)
    if (banner === 'perlas') {
      s.piedad++
      if (s.piedad >= PIEDAD_MAX) r = 'L'
      if (r === 'L') s.piedad = 0
    }
    rarezas.push(r)
  }
  // Diez de golpe garantizan al menos un Épico.
  if (n === 10 && !rarezas.some((r) => r === 'E' || r === 'L')) rarezas[rng.int(0, 9)] = 'E'

  const tiradas = rarezas.map((r) => {
    const opciones = pool.filter((d) => d.rareza === r)
    const def = rng.pick(opciones)
    return reclutar(s, def)
  })
  return { save: s, tiradas }
}

/** Mete al pirata en la tripulación (o le sube una estrella). Muta `s`. */
function reclutar(s: CorsariosSave, def: PirataDef): Tirada {
  const t = s.tripulacion.find((x) => x.id === def.id)
  if (!t) {
    s.tripulacion.push({ id: def.id, nivel: Math.max(1, Math.floor(s.nivel * 0.6)), estrellas: 1 })
    if (s.formacion.length < huecos(s)) s.formacion.push(def.id)
    return { id: def.id, rareza: def.rareza, nuevo: true, estrellas: 1 }
  }
  if (t.estrellas < ESTRELLAS_MAX) {
    t.estrellas++
    return { id: def.id, rareza: def.rareza, nuevo: false, estrellas: t.estrellas }
  }
  s.doblones += CONSUELO[def.rareza]
  return { id: def.id, rareza: def.rareza, nuevo: false, estrellas: t.estrellas, consuelo: CONSUELO[def.rareza] }
}

// ------------------------------------------------------------ TRIPULACIÓN
export function costeEntreno(nivel: number): number {
  return Math.round(12 * Math.pow(nivel, 1.3))
}

export function puedeEntrenar(s: CorsariosSave, id: string): boolean {
  const t = s.tripulacion.find((x) => x.id === id)
  return !!t && t.nivel < s.nivel && s.doblones >= costeEntreno(t.nivel)
}

export function entrenar(s0: CorsariosSave, id: string, dia = hoy()): CorsariosSave {
  if (!puedeEntrenar(s0, id)) return s0
  const s: CorsariosSave = structuredClone(s0)
  const t = s.tripulacion.find((x) => x.id === id)!
  s.doblones -= costeEntreno(t.nivel)
  t.nivel++
  t.xp = 0
  contar(s, 'entrenos', dia)
  return s
}

/** Mete o saca a un tripulante de la formación. El capitán no se mueve. */
export function alternarFormacion(s0: CorsariosSave, id: string): CorsariosSave {
  if (id === 'capitan') return s0
  const s: CorsariosSave = structuredClone(s0)
  if (s.formacion.includes(id)) s.formacion = s.formacion.filter((x) => x !== id)
  else if (s.formacion.length < huecos(s)) s.formacion.push(id)
  else return s0
  return s
}

export function tripulante(s: CorsariosSave, id: string): Tripulante | undefined {
  return s.tripulacion.find((x) => x.id === id)
}

export function marcarVisto(s0: CorsariosSave, clave: string): CorsariosSave {
  if (s0.vistos.includes(clave)) return s0
  return { ...s0, vistos: [...s0.vistos, clave] }
}

/** Resumen corto para la tarjeta de Inicio. */
export function resumen(s0: CorsariosSave): string {
  const s = migrar(s0)
  if (campanaTerminada(s)) return `Nv. ${s.nivel} · Mar Abierto, piso ${pisoActual(s)}`
  let i = 0
  while (i < ISLAS.length - 1 && islaSuperada(s, i)) i++
  return `Nv. ${s.nivel} · ${ISLAS[i].nombre}`
}
