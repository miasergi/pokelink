// Plantilla: crear jugadores, escalarlos por nivel, calcular PT y aplicar
// fatiga y objetos. Todo son funciones PURAS — el store solo las orquesta.
import type { RNG } from '@/utils/rng'
import { getPlayerBase, playersOfTeam, PLAYERS } from '@/data/inazuma/players'
import { getItem } from '@/data/inazuma/items'
import { getTechnique } from '@/data/inazuma/techniques'
import { getTeam, getSaga, FILLER_NAMES } from '@/data/inazuma/teams'
import { getFormation } from '@/data/inazuma/formations'
import {
  SQUAD_SIZE, TECHNIQUE_SLOTS,
  type PlayerInstance, type PlayerBase, type Position, type RivalPlayer,
  type Stats, type Element,
} from './types'

let uidSeq = 0
/** uid único dentro de la sesión (los saves viejos ya traen los suyos). */
export function nextPlayerUid(): string {
  uidSeq += 1
  return `iz${Date.now().toString(36)}${uidSeq.toString(36)}`
}

// ---------------------------------------------------------------------------
// Escalado por nivel
// ---------------------------------------------------------------------------

/**
 * +3 % por nivel sobre el valor base. Al ser multiplicativo, la diferencia
 * entre una estrella y un suplente (base 84 vs 34) NUNCA se cierra solo
 * subiendo niveles: para mejorar de verdad hay que fichar.
 *
 * El 3 % no es cosmético: con el 2 % de la primera versión, los ~9 niveles de
 * ventaja que acumulas ganando el torneo valían un +18 % de atributos, que se
 * comía entero el `power` del instituto rival. Con 3 % son +27 % y ganar se
 * nota. Subirlo más aplanaría el valor de los fichajes.
 */
// ---------------------------------------------------------------------------
// RAREZA (1-4): bronce, plata, oro y multicolor. Es DINÁMICA por instancia —
// cualquier jugador puede llegar al máximo — y manda sobre las tres cosas:
//  · sus ATRIBUTOS (presupuesto por rareza, con la forma de su demarcación y
//    un ruido determinista por identidad: dos oros no son clones),
//  · cuántos pasos de su CADENA puede despertar (1/2/3/4),
//  · y el ESPÍRITU GUERRERO, exclusivo del multicolor.
// Los atributos ya NO salen de `base.stats`: así un Willy Glass multicolor es
// de verdad de lo más top, que es el punto de poder subir a cualquiera.
// ---------------------------------------------------------------------------

export const MAX_RARITY = 4
export const RARITY_BUDGET: Record<number, number> = { 1: 210, 2: 255, 3: 300, 4: 345 }
export const RARITY_LABEL: Record<number, string> = { 1: 'bronce', 2: 'plata', 3: 'oro', 4: 'MULTICOLOR' }
/** Color de la estrella de cada rareza (el multicolor anima aparte). */
export const RARITY_COLOR: Record<number, string> = {
  1: '#cd7f32', 2: '#c9d1d9', 3: '#fbbf24', 4: '#e879f9',
}

/** Reparto del presupuesto por demarcación (fracción de cada atributo). */
const RARITY_SHAPE: Record<Position, Record<keyof Stats, number>> = {
  POR: { tiro: 0.09, control: 0.13, fisico: 0.17, defensa: 0.30, velocidad: 0.13, aguante: 0.18 },
  DEF: { tiro: 0.09, control: 0.14, fisico: 0.24, defensa: 0.27, velocidad: 0.12, aguante: 0.14 },
  MED: { tiro: 0.15, control: 0.27, fisico: 0.13, defensa: 0.16, velocidad: 0.17, aguante: 0.12 },
  DEL: { tiro: 0.30, control: 0.21, fisico: 0.14, defensa: 0.08, velocidad: 0.17, aguante: 0.10 },
}

/** Hash determinista pequeño, para el ruido por identidad. */
function idHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Atributos BASE de un jugador a una rareza dada (sin nivel ni objetos). */
export function rarityStats(baseId: string, position: Position, rarity: number): Stats {
  const budget = RARITY_BUDGET[Math.max(1, Math.min(MAX_RARITY, rarity))]
  const shape = RARITY_SHAPE[position]
  const h = idHash(baseId)
  const out = {} as Stats
  ;(Object.keys(shape) as (keyof Stats)[]).forEach((k, i) => {
    // Ruido ±6 % por atributo, estable por identidad: le da personalidad sin
    // romper el presupuesto de la rareza.
    const noise = 0.94 + (((h >> (i * 4)) & 0xff) / 255) * 0.12
    out[k] = Math.max(10, Math.round(budget * shape[k] * noise))
  })
  return out
}

/**
 * Rareza de una instancia. Los saves de antes de la rareza dinámica no traen
 * el campo: heredan la rareza de catálogo (capada al máximo nuevo).
 */
export function rarityOf(p: PlayerInstance): number {
  return p.rarity ?? Math.min(MAX_RARITY, getPlayerBase(p.baseId).rarity)
}

/** Sube UNA rareza (tope multicolor). Devuelve el jugador nuevo (puro). */
export function upgradeRarity(p: PlayerInstance): PlayerInstance {
  return { ...p, rarity: Math.min(MAX_RARITY, rarityOf(p) + 1) }
}

/**
 * Rareza de los RIVALES según la eliminatoria (0-7): niveladas con el momento
 * del rogue — bronce al empezar, multicolor en las dos últimas rondas.
 */
export function rivalRarity(bossIndex: number): number {
  if (bossIndex <= 1) return 1
  if (bossIndex <= 3) return 2
  if (bossIndex <= 5) return 3
  return 4
}

/**
 * PLAN de rarezas del ONCE rival en los PARTIDOS, eliminatoria a eliminatoria
 * (de mejor a peor dotado): el primero trae 3 platas, el segundo 7, el
 * tercero todo plata y un oro… y la final es once multicolor. Los cracks del
 * equipo (más rareza de catálogo) se llevan los tramos altos.
 */
export function rivalRarityPlan(bossIndex: number): number[] {
  const PLAN: [number, number, number, number][] = [
    // [multicolor, oro, plata, bronce] hasta sumar 11
    [0, 0, 3, 8],
    [0, 0, 7, 4],
    [0, 1, 10, 0],
    [0, 4, 7, 0],
    [0, 8, 3, 0],
    [3, 8, 0, 0],
    [7, 4, 0, 0],
    [11, 0, 0, 0],
  ]
  const [m, o, p, b] = PLAN[Math.max(0, Math.min(7, bossIndex))]
  return [
    ...Array(m).fill(4), ...Array(o).fill(3), ...Array(p).fill(2), ...Array(b).fill(1),
  ]
}

/**
 * Rareza de CADA rival del once en un partido: los cracks (por rareza de
 * catálogo) se llevan los tramos altos del plan. La usa el partido Y la
 * previa, para que lo que ves sea lo que salta al campo.
 */
export function rivalRarityMap(teamId: string, bossIndex: number): Map<string, number> {
  const xi = rivalStartingXI(teamId)
  const plan = rivalRarityPlan(bossIndex)
  const ranked = [...xi].sort((a, b) => b.rarity - a.rarity)
  const out = new Map<string, number>()
  ranked.forEach((b, i) => out.set(b.id, plan[Math.min(i, plan.length - 1)] ?? 1))
  return out
}

export const LEVEL_GROWTH = 0.03

export function scaleStat(base: number, level: number): number {
  return Math.round(base * (1 + (level - 1) * LEVEL_GROWTH))
}

export function scaleStats(base: Stats, level: number): Stats {
  return {
    tiro: scaleStat(base.tiro, level),
    control: scaleStat(base.control, level),
    fisico: scaleStat(base.fisico, level),
    defensa: scaleStat(base.defensa, level),
    velocidad: scaleStat(base.velocidad, level),
    aguante: scaleStat(base.aguante, level),
  }
}

/**
 * PT máximos: el depósito de supertécnicas.
 *
 * Sale del aguante EFECTIVO, no del base. Cuando leía el base, el bonus de
 * aguante de objetos y entrenamientos no hacía nada en ningún sitio: `aguante`
 * no interviene en ningún duelo (eso es control/físico/defensa/velocidad/tiro)
 * y la fatiga usa `stamina`, que es otro campo. Resultado: la «Cinta de
 * Resistencia» era un objeto de 1500 ₽ sin efecto alguno — se detectó porque el
 * bot la compraba en bucle y los torneos salían idénticos a no comprar nada.
 */
export function ptMax(p: PlayerInstance): number {
  // 28 de base y no 45: con el depósito antiguo (y costes al 0.29 de la
  // potencia) nadie se quedaba sin PT en un partido y las supertécnicas se
  // tiraban a discreción. Ahora un jugador medio paga 2-3 técnicas medianas y
  // a la cuarta está seco: administrar PT vuelve a ser una decisión.
  return Math.round(28 + effectiveStats(p).aguante * 0.7)
}

/**
 * Atributos EFECTIVOS: nivel + bonos de entrenamiento + objeto equipado.
 * NO incluye la fatiga (eso es `fatigueMultiplier`, que se aplica por duelo)
 * para que la ficha del jugador enseñe siempre su valor real.
 */
export function effectiveStats(p: PlayerInstance): Stats {
  const base = getPlayerBase(p.baseId)
  // Los atributos salen de la RAREZA de la instancia, no del catálogo: la
  // rareza es dinámica y cualquiera puede llegar al tope (ver arriba).
  const s = scaleStats(rarityStats(p.baseId, base.position, rarityOf(p)), p.level)
  if (p.boosts) {
    for (const k of Object.keys(s) as (keyof Stats)[]) s[k] += p.boosts[k] ?? 0
  }
  const item = p.item ? getItem(p.item) : undefined
  if (item) {
    // `amount` es un PORCENTAJE (ver `InazumaItem`), para que un objeto valga
    // lo mismo en la primera ronda que en la final.
    // El Brazalete de Capitán es el único que toca todos los atributos; el
    // modelo genérico de `InazumaItem` solo guarda uno, así que va aparte.
    // Los objetos «a todo» no caben en el modelo genérico de `InazumaItem`
    // (que guarda un solo atributo), así que van aparte.
    if (item.id === 'brazalete-capitan' || item.id === 'amuleto-relampago') {
      const mult = 1 + (item.amount ?? 10) / 100
      for (const k of Object.keys(s) as (keyof Stats)[]) s[k] = Math.round(s[k] * mult)
    } else if (item.stat && item.amount) {
      s[item.stat] = Math.round(s[item.stat] * (1 + item.amount / 100))
    }
  }
  return s
}

/**
 * Penalización por fatiga. Un jugador fresco rinde al 100 %; por debajo de 40
 * de aguante empieza a hundirse. Es el recurso que obliga a rotar y el motivo
 * de que exista el banquillo.
 */
export function fatigueMultiplier(stamina: number): number {
  if (stamina >= 60) return 1
  if (stamina >= 40) return 0.94
  if (stamina >= 20) return 0.84
  if (stamina > 0) return 0.72
  return 0.6
}

/** Valoración global 1-99 para pintar en la carta. */
export function overall(p: PlayerInstance): number {
  const base = getPlayerBase(p.baseId)
  return overallOf(effectiveStats(p), base.position)
}

/**
 * La MEDIA a partir de unos atributos ya resueltos, para poder puntuar
 * también a los RIVALES de la previa (que no son `PlayerInstance`). La media
 * es rendimiento ACTUAL (crece con el nivel); las estrellas son el talento
 * innato (rareza, fijo): dos jugadores ★5 pueden tener medias muy distintas
 * según su nivel.
 */
export function overallOf(s: Stats, position: Position): number {
  const w = POSITION_WEIGHTS[position]
  let total = 0
  let sum = 0
  for (const k of Object.keys(w) as (keyof Stats)[]) {
    total += s[k] * (w[k] ?? 0)
    sum += w[k] ?? 0
  }
  return Math.min(99, Math.round(total / sum))
}

/** Peso de cada atributo por demarcación (para la valoración y la IA). */
export const POSITION_WEIGHTS: Record<Position, Partial<Record<keyof Stats, number>>> = {
  POR: { defensa: 5, fisico: 2, control: 1, aguante: 1, velocidad: 1 },
  DEF: { defensa: 4, fisico: 3, velocidad: 1.5, control: 1, aguante: 1 },
  MED: { control: 4, velocidad: 2, defensa: 1.5, tiro: 1.5, aguante: 1 },
  DEL: { tiro: 4, control: 2, velocidad: 2, fisico: 1, aguante: 1 },
}

// ---------------------------------------------------------------------------
// Creación
// ---------------------------------------------------------------------------

export function createPlayer(
  baseId: string, level: number, opts: { captain?: boolean; rarity?: number } = {},
): PlayerInstance {
  const p: PlayerInstance = {
    uid: nextPlayerUid(),
    baseId,
    level,
    // Rareza de LLEGADA: bronce por defecto (el once inicial entero), o la que
    // toque por ronda para fichajes e intercambios.
    rarity: Math.max(1, Math.min(MAX_RARITY, opts.rarity ?? 1)),
    pt: 0,
    stamina: 100,
    // SIN técnicas de salida: `base.techniques` es el repertorio del RIVAL.
    // Las tuyas se despiertan en las casillas de firma (cadena `signature`),
    // se aprenden de la mochila o las regala el mapa.
    techniques: [],
    captain: opts.captain,
  }
  p.pt = ptMax(p)
  // Un fichaje que llega a nivel alto trae ya despierta la parte de su cadena
  // que el nivel cubre: llegar «en blanco» a nivel 40 no tenía sentido.
  return awakenByLevel(p)
}

/**
 * Nivel al que se despierta cada paso de la CADENA característica. La casilla
 * de Supertécnica Especial y el Manual avanzado siguen sirviendo para
 * ADELANTARSE a estos umbrales; esto garantiza que, aunque no toque ninguna,
 * el jugador acaba despertando lo suyo.
 */
export const SIGNATURE_LEVELS = [10, 22, 35, 50]

/**
 * La cadena ALCANZABLE de un jugador: los primeros N pasos, con N = su rareza
 * (bronce 1 … multicolor 4). Subir de rareza desbloquea el siguiente paso.
 */
export function reachableChain(p: PlayerInstance): string[] {
  return (getPlayerBase(p.baseId).signature ?? []).slice(0, rarityOf(p))
}

/** Despierta los pasos de la cadena que el nivel ya cubre (capada por rareza). */
function awakenByLevel(p: PlayerInstance): PlayerInstance {
  const chain = reachableChain(p)
  let out = p
  chain.forEach((id, i) => {
    const need = SIGNATURE_LEVELS[Math.min(i, SIGNATURE_LEVELS.length - 1)]
    if (out.level >= need && !out.techniques.includes(id)) {
      const techs = out.techniques.slice()
      if (techs.length >= TECHNIQUE_SLOTS) techs.shift()
      out = { ...out, techniques: [...techs, id] }
    }
  })
  return out
}

/** Sube niveles y rellena PT proporcionalmente (no regala depósito lleno). */
export function levelUp(p: PlayerInstance, amount = 1): PlayerInstance {
  const before = ptMax(p)
  let next: PlayerInstance = { ...p, level: Math.min(MAX_LEVEL, p.level + amount) }
  next.pt = Math.min(ptMax(next), p.pt + (ptMax(next) - before))
  // Al cruzar un umbral de cadena, la técnica se despierta sola.
  next = awakenByLevel(next)
  return next
}

/**
 * Tope de nivel. Con la curva actual se llega rozándolo en la final (el bot
 * llega al último instituto a 60 contra un rival de 60), así que subirlo sin
 * tocar `RIVAL_LEVELS` regalaría el torneo.
 */
export const MAX_LEVEL = 99
export const START_LEVEL = 5

// ---------------------------------------------------------------------------
// Once titular
// ---------------------------------------------------------------------------

/** Reparte el once por demarcación. La IA y el motor leen SIEMPRE de aquí. */
export interface Lineup {
  keeper: PlayerInstance
  defs: PlayerInstance[]
  mids: PlayerInstance[]
  fwds: PlayerInstance[]
  all: PlayerInstance[]
}

/**
 * Papel que juega cada HUECO del once para una formación: el 0 es el portero,
 * después vienen los de defensa, los del centro y los de arriba. El orden del
 * array `lineup` ES la alineación.
 */
export function slotRole(formationId: string | undefined, i: number): Position {
  const f = getFormation(formationId)
  if (i === 0) return 'POR'
  if (i <= f.defs) return 'DEF'
  if (i <= f.defs + f.mids) return 'MED'
  return 'DEL'
}

/**
 * Monta el once POR HUECOS: quien ocupa el hueco de delantero juega de
 * delantero, sea cual sea su demarcación natural. Es lo que permite poner a
 * Axel de defensa si te da la gana — con sus atributos de delantero, claro, y
 * sin poder tirar sus supertécnicas de tiro desde ahí.
 */
export function buildLineup(roster: PlayerInstance[], uids: string[], formationId?: string): Lineup | null {
  const byUid = new Map(roster.map((p) => [p.uid, p]))
  const all = uids.map((u) => byUid.get(u)).filter((p): p is PlayerInstance => !!p)
  if (all.length < 11) return null
  const role = (i: number) => slotRole(formationId, i)
  return {
    keeper: all[0],
    defs: all.filter((_, i) => role(i) === 'DEF'),
    mids: all.filter((_, i) => role(i) === 'MED'),
    fwds: all.filter((_, i) => role(i) === 'DEL'),
    all,
  }
}

/**
 * Once automático para una formación dada: mejor portero + los mejores de cada
 * línea hasta cubrirla. Si falta gente en una línea se completa con lo mejor
 * que quede, para que siempre salga un once jugable.
 */
export function autoLineup(roster: PlayerInstance[], formationId?: string): string[] {
  const f = getFormation(formationId)
  const byPos = (pos: Position) =>
    roster.filter((p) => getPlayerBase(p.baseId).position === pos)
      .sort((a, b) => overall(b) - overall(a))
  const picked = [
    ...byPos('POR').slice(0, 1),
    ...byPos('DEF').slice(0, f.defs),
    ...byPos('MED').slice(0, f.mids),
    ...byPos('DEL').slice(0, f.fwds),
  ]
  if (picked.length < SQUAD_SIZE) {
    const rest = roster
      .filter((p) => !picked.includes(p))
      .sort((a, b) => overall(b) - overall(a))
    picked.push(...rest.slice(0, SQUAD_SIZE - picked.length))
  }
  return picked.slice(0, SQUAD_SIZE).map((p) => p.uid)
}

/** Cuántos jugadores hay en el once por demarcación. */
export function lineupShape(roster: PlayerInstance[], uids: string[]): Record<Position, number> {
  const byUid = new Map(roster.map((p) => [p.uid, p]))
  const out: Record<Position, number> = { POR: 0, DEF: 0, MED: 0, DEL: 0 }
  for (const u of uids) {
    const p = byUid.get(u)
    if (p) out[getPlayerBase(p.baseId).position] += 1
  }
  return out
}

/**
 * ¿Es un once legal? 11 jugadores, un solo portero y las líneas cuadrando con
 * la formación elegida. Sin lo último la formación sería decorativa.
 */
export function lineupError(roster: PlayerInstance[], uids: string[], _formationId?: string): string | null {
  // Desde que el once va POR HUECOS ya no se exige que cada demarcación cuadre:
  // puedes alinear a quien quieras donde quieras (con sus consecuencias). Lo
  // único invalidante es no ser once, repetir a alguien o alinear fantasmas.
  if (uids.length > SQUAD_SIZE) return `Te sobran ${uids.length - SQUAD_SIZE} en el once`
  if (uids.length < SQUAD_SIZE) {
    const n = SQUAD_SIZE - uids.length
    return n === 1 ? 'Te falta 1 jugador en el once' : `Te faltan ${n} jugadores en el once`
  }
  if (new Set(uids).size !== uids.length) return 'Hay un jugador repetido en el once'
  const byUid = new Set(roster.map((p) => p.uid))
  if (!uids.every((u) => byUid.has(u))) return 'Hay alguien en el once que ya no está en la plantilla'
  return null
}

// ---------------------------------------------------------------------------
// Onces rivales
// ---------------------------------------------------------------------------

// Ids del catálogo REAL (los antiguos `p-blocaje`… murieron con el catálogo
// inventado y dejaban a los rellenos sin técnicas sin avisar).
const FILLER_TECHS: Record<Position, string[]> = {
  POR: ['tornado-catch'],
  DEF: ['shikofumi'],
  MED: ['dash-accel'],
  DEL: ['tarzan-kick'],
}

/** Reparto de un once rival: 1 POR, 4 DEF, 4 MED, 2 DEL. */
const RIVAL_SHAPE: Position[] = ['POR', 'DEF', 'DEF', 'DEF', 'DEF', 'MED', 'MED', 'MED', 'MED', 'DEL', 'DEL']

/** Once rival por líneas: 1 portero, 4 defensas, 4 medios y 2 delanteros. */
export function rivalStartingXI(teamId: string): PlayerBase[] {
  const own = playersOfTeam(teamId)
  const line = (pos: Position, n: number) => own.filter((p) => p.position === pos).slice(0, n)
  const picked = [...line('POR', 1), ...line('DEF', 4), ...line('MED', 4), ...line('DEL', 2)]
  if (picked.length < 11) picked.push(...own.filter((p) => !picked.includes(p)).slice(0, 11 - picked.length))
  return picked.slice(0, 11)
}

/** Espíritu del jugador base, para pasarlo al partido. */
export function spiritOf(baseId: string): string | undefined {
  return getPlayerBase(baseId).spirit
}

/**
 * Construye el once del instituto rival: sus jugadores con nombre propio + los
 * de relleno que hagan falta hasta 11, con atributos derivados del `power` del
 * instituto para que Zeus no juegue con reservas.
 */
export function buildRivalTeam(
  teamId: string, level: number, rng: RNG, rarity = 2,
  opts: { rarityMap?: Map<string, number>; elite?: boolean } = {},
): RivalPlayer[] {
  const team = getTeam(teamId)
  // Su once sale de su plantilla REAL (14 jugadores por instituto) y se arma
  // POR LÍNEAS, igual que el tuyo. Cogerlos «los 11 primeros de la lista» era
  // asimétrico (a ellos les tocaban siempre los mejores y a ti no) y además
  // podía dejarles sin portero.
  const named = rivalStartingXI(teamId)
  const out: RivalPlayer[] = named.map((b) =>
    toRival(b, level, team.power, opts.rarityMap?.get(b.id) ?? rarity, opts.elite ?? false))

  const needed = RIVAL_SHAPE.slice()
  for (const p of out) {
    const i = needed.indexOf(p.position)
    if (i >= 0) needed.splice(i, 1)
    else needed.pop()
  }
  const names = rng.shuffle(FILLER_NAMES.slice())
  needed.forEach((pos, i) => {
    out.push(fillerRival(names[i % names.length], pos, team.element, level, team.power, rng))
  })
  return out.slice(0, 11)
}

/**
 * Atributos de UN rival de la previa: los mismos números con los que saldría
 * al campo (nivel del nodo + `power` del instituto). Es lo que enseña la ficha
 * al tocar a un rival en la alineación de la previa.
 */
export function rivalPreviewStats(base: PlayerBase, teamId: string, level: number, rarity = 2): Stats {
  return applyPower(scaleStats(rarityStats(base.id, base.position, rarity), level), getTeam(teamId).power)
}

/** Aplica el `power` del instituto a todos los atributos ya escalados. */
function applyPower(s: Stats, power: number): Stats {
  return {
    tiro: Math.round(s.tiro * power),
    control: Math.round(s.control * power),
    fisico: Math.round(s.fisico * power),
    defensa: Math.round(s.defensa * power),
    velocidad: Math.round(s.velocidad * power),
    aguante: Math.round(s.aguante * power),
  }
}

function toRival(b: PlayerBase, level: number, power: number, rarity: number, elite = false): RivalPlayer {
  // Misma vara que tus jugadores: atributos por RAREZA (la de la ronda), nivel
  // y el `power` del equipo como último empujón.
  const stats = applyPower(scaleStats(rarityStats(b.id, b.position, rarity), level), power)
  // Y sus TÉCNICAS también con tu misma regla: solo su cadena, capada por la
  // rareza y desbloqueada por nivel. Antes salían con el repertorio entero del
  // catálogo desde la primera ronda. En los PARTIDOS (`elite`), los cracks del
  // equipo (★5 de catálogo) traen UN paso extra ya despierto: la estrella
  // rival pega antes de tiempo, que para eso es la estrella.
  const chain = (b.signature ?? []).slice(0, Math.max(1, Math.min(MAX_RARITY, rarity)))
  let known = chain.filter((_, i) => level >= SIGNATURE_LEVELS[Math.min(i, SIGNATURE_LEVELS.length - 1)])
  if (elite && b.rarity >= 5 && known.length < chain.length) known = chain.slice(0, known.length + 1)
  return { baseId: b.id, name: b.name, position: b.position, element: b.element, level, stats, techniques: known, rarity }
}

function fillerRival(name: string, position: Position, element: Element, level: number, power: number, rng: RNG): RivalPlayer {
  // Los de relleno valen ~0.62 de una estrella: están para hacer bulto y para
  // que las líneas flojas del rival se noten al elegir por dónde atacar.
  const core = rng.int(38, 50)
  const soft = rng.int(26, 36)
  const shape: Record<Position, Stats> = {
    POR: { tiro: soft, control: soft, fisico: core, defensa: core + 12, velocidad: soft, aguante: core },
    DEF: { tiro: soft, control: soft, fisico: core + 6, defensa: core + 8, velocidad: soft, aguante: core },
    MED: { tiro: soft, control: core + 8, fisico: soft, defensa: core, velocidad: core, aguante: core },
    DEL: { tiro: core + 10, control: core, fisico: soft, defensa: soft, velocidad: core, aguante: soft },
  }
  const stats = applyPower(scaleStats(shape[position], level), power)
  return {
    baseId: `filler-${name}`,
    name,
    position,
    element,
    level,
    stats,
    techniques: [rng.pick(FILLER_TECHS[position])],
  }
}

// ---------------------------------------------------------------------------
// Utilidades varias
// ---------------------------------------------------------------------------

/** Técnicas conocidas por un jugador, resueltas y filtradas por clase. */
export function knownTechniques(techIds: string[], kind?: string) {
  return techIds
    .map((id) => getTechnique(id))
    .filter((t): t is NonNullable<typeof t> => !!t && (!kind || t.kind === kind))
}

// ---------------------------------------------------------------------------
// Mejora de supertécnicas (objeto «Mejora»)
// ---------------------------------------------------------------------------

/** Veces que se puede mejorar la misma técnica. */
export const MAX_TECH_LEVEL = 2
/** Potencia extra por mejora. */
export const TECH_LEVEL_BONUS = 0.25

/** Mejoras aplicadas a una técnica concreta de un jugador. */
export function techLevel(p: PlayerInstance, techId: string): number {
  return p.techLevels?.[techId] ?? 0
}

/**
 * Potencia EFECTIVA de una técnica en manos de este jugador, con las mejoras
 * aplicadas. Todo el motor debe leer de aquí y no de `Technique.power`, o las
 * mejoras no se notarían en el campo (que es justo el fallo que ya tuvimos con
 * los objetos de atributos).
 */
export function techniquePower(p: PlayerInstance | undefined, tech: { id: string; power: number }): number {
  if (!p) return tech.power
  return Math.round(tech.power * (1 + techLevel(p, tech.id) * TECH_LEVEL_BONUS))
}

/** ¿Se le puede aplicar una Mejora a esta técnica? */
export function canUpgradeTechnique(p: PlayerInstance, techId: string): boolean {
  return p.techniques.includes(techId) && techLevel(p, techId) < MAX_TECH_LEVEL
}

/** Aplica una Mejora. Devuelve el jugador nuevo (puro). */
export function upgradeTechnique(p: PlayerInstance, techId: string): PlayerInstance {
  return { ...p, techLevels: { ...(p.techLevels ?? {}), [techId]: techLevel(p, techId) + 1 } }
}

/** Jugadores fichables: los de los institutos ya derrotados + agentes libres. */
/**
 * A quién puedes fichar: los institutos que ya has eliminado (se te unen, como
 * en la serie) y los suplentes de tu propio instituto.
 *
 * Lo de tu propia plantilla no es un adorno: cada instituto tiene 14 jugadores
 * reales y solo 11 salen de titulares, así que sin esto el ojeador de la
 * primera ronda no tenía a NADIE que ofrecer y pagaba una comisión de consuelo.
 */
export function signablePool(beatenTeams: string[], ownTeam?: string, sagaId?: string): PlayerBase[] {
  // El pool depende de la SAGA: además de los equipos ya derrotados, cada
  // saga define qué equipos «rondan por ahí» para el ojeador (en la clásica,
  // los de la temporada 2; en Alius, los institutos del año anterior; en el
  // FFI, los cracks nacionales). El peso por rareza ya se encarga de que los
  // galácticos no aparezcan en la primera ronda.
  const extra = getSaga(sagaId).scoutTeams
  const allowed = new Set([...beatenTeams, 'libre', ...extra])
  if (ownTeam) allowed.add(ownTeam)
  return PLAYERS.filter((p) => allowed.has(p.team))
}

/** Precio de traspaso, para la tienda y el resumen del fichaje. */
export function transferValue(base: PlayerBase, level: number): number {
  return Math.round((300 + base.rarity * 450) * (1 + level * 0.03))
}
