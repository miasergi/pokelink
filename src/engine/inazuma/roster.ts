// Plantilla: crear jugadores, escalarlos por nivel, calcular PT y aplicar
// fatiga y objetos. Todo son funciones PURAS — el store solo las orquesta.
import type { RNG } from '@/utils/rng'
import { getPlayerBase, playersOfTeam, PLAYERS } from '@/data/inazuma/players'
import { getItem } from '@/data/inazuma/items'
import { regionOfTeam, type RegionId } from '@/data/inazuma/teams'
import { getTechnique } from '@/data/inazuma/techniques'
import { getTactic, type TacticEffect } from '@/data/inazuma/tactics'
import { getTeam, getSaga, FILLER_NAMES } from '@/data/inazuma/teams'
import { getFormation } from '@/data/inazuma/formations'
import {
  SQUAD_SIZE, TECHNIQUE_SLOTS,
  type PlayerInstance, type PlayerBase, type Position, type RivalPlayer,
  type Stats, type Element, type ChainStep,
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
//  · y cuántos pasos de su CADENA puede despertar (1/2/3/4).
// Los atributos ya NO salen de `base.stats`: así un Willy Glass multicolor es
// de verdad de lo más top, que es el punto de poder subir a cualquiera.
// ---------------------------------------------------------------------------

export const MAX_RARITY = 4
export const RARITY_BUDGET: Record<number, number> = { 1: 210, 2: 255, 3: 300, 4: 345 }
export const RARITY_LABEL: Record<number, string> = { 1: 'Normal', 2: 'Avanzado', 3: 'Ídolo', 4: 'LEGENDARIO' }
/** Color de cada rareza. La carta ENTERA se tiñe con él. */
export const RARITY_COLOR: Record<number, string> = {
  1: '#94a3b8', 2: '#a855f7', 3: '#fbbf24', 4: '#e879f9',
}
/** Degradado del MULTICOLOR, para bordes y fondos de carta. */
export const RARITY_GRADIENT = 'linear-gradient(135deg, #f472b6, #fbbf24, #34d399, #38bdf8)'

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
  return p.rarity ?? Math.min(MAX_RARITY, getPlayerBase(p.baseId).fame)
}

/**
 * Sube UNA rareza (tope multicolor). El depósito de PT crece con el aguante
 * nuevo y la DIFERENCIA se rellena: subir de rareza con 65/65 dejaba 65/70 y
 * parecía que la medalla te robaba gasolina.
 */
export function upgradeRarity(p: PlayerInstance): PlayerInstance {
  const before = ptMax(p)
  const next: PlayerInstance = { ...p, rarity: Math.min(MAX_RARITY, rarityOf(p) + 1) }
  next.pt = Math.min(ptMax(next), p.pt + Math.max(0, ptMax(next) - before))
  return next
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
  // CANON: el peso en la serie manda y, A IGUALDAD, los mejores números.
  // Antes el empate lo resolvía el orden de plantilla (portero, defensas…),
  // así que las rarezas subidas caían siempre en la retaguardia en vez de en
  // los cracks del equipo.
  const sum = (b: PlayerBase) => Object.values(b.stats).reduce((a, v) => a + v, 0)
  const ranked = [...xi].sort((a, b) => b.fame - a.fame || sum(b) - sum(a))
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
  // La penalización EMPIEZA antes (70, no 60): con el desgaste nuevo del
  // partido (10 por duelo, 2 por posesión) el cansancio tiene que notarse ya
  // en la segunda parte, no solo en el descuento.
  if (stamina >= 70) return 1
  if (stamina >= 50) return 0.93
  if (stamina >= 30) return 0.84
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
// Bajados de [10, 22, 35, 50]: con la cadena tan tardía, medio torneo se
// jugaba a tiro pelado mientras el rival (que despierta con la misma tabla
// pero llega con niveles de jefe) iba sobrado de técnicas.
export const SIGNATURE_LEVELS = [8, 18, 30, 44]

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

/**
 * Construye el once del instituto rival: sus jugadores con nombre propio + los
 * de relleno que hagan falta hasta 11, con atributos derivados del `power` del
 * instituto para que Zeus no juegue con reservas.
 */
export function buildRivalTeam(
  teamId: string, level: number, rng: RNG, rarity = 2,
  opts: { rarityMap?: Map<string, number>; elite?: boolean; shuffleFrom?: RegionId[] } = {},
): RivalPlayer[] {
  const team = getTeam(teamId)
  // RANDOMIZADOR de plantillas: el instituto sale con once sorteado de las
  // épocas elegidas en vez de con el suyo canónico. Su ESCUDO y su dificultad
  // no cambian — sigue siendo el Zeus, pero no sabes con quién juega.
  if (opts.shuffleFrom) {
    const eras = new Set(opts.shuffleFrom)
    const pool = PLAYERS.filter((p) => !eras.size || eras.has(regionOfTeam(p.team)))
    const byPos = (pos: Position, n: number) =>
      rng.shuffle(pool.filter((p) => p.position === pos)).slice(0, n)
    const xi = [...byPos('POR', 1), ...byPos('DEF', 4), ...byPos('MED', 4), ...byPos('DEL', 2)]
    if (xi.length >= 11) {
      const drawn = xi.slice(0, 11)
      // El plan de rarezas del instituto se reparte entre LOS MEJORES del
      // once sorteado (peso en la serie y, a igualdad, números).
      const planValues = opts.rarityMap
        ? [...opts.rarityMap.values()].sort((a, b) => b - a)
        : null
      const sum = (b: PlayerBase) => Object.values(b.stats).reduce((a, v) => a + v, 0)
      const ranked = [...drawn].sort((a, b) => b.fame - a.fame || sum(b) - sum(a))
      const rarityOfDrawn = new Map(ranked.map((b, i) => [b.id, planValues?.[Math.min(i, planValues.length - 1)] ?? rarity]))
      return withRivalArmband(drawn.map((b) =>
        toRival(b, level, team.power, rarityOfDrawn.get(b.id) ?? rarity, opts.elite ?? false)))
    }
  }
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
  return withRivalArmband(out.slice(0, 11))
}

/**
 * El BRAZALETE del rival: su jugador insignia (más peso en la serie y, a
 * igualdad, mejores números) sale con +25 % a todo, como tu capitán.
 */
function withRivalArmband(xi: RivalPlayer[]): RivalPlayer[] {
  if (!xi.length) return xi
  const sum = (p: RivalPlayer) => Object.values(p.stats).reduce((a, v) => a + v, 0)
  const fameOf = (p: RivalPlayer) => {
    try { return getPlayerBase(p.baseId).fame } catch { return 1 }
  }
  const cap = xi.reduce((best, p) =>
    (fameOf(p) > fameOf(best) || (fameOf(p) === fameOf(best) && sum(p) > sum(best)) ? p : best), xi[0])
  cap.stats = {
    tiro: Math.round(cap.stats.tiro * ARMBAND_MULT),
    control: Math.round(cap.stats.control * ARMBAND_MULT),
    fisico: Math.round(cap.stats.fisico * ARMBAND_MULT),
    defensa: Math.round(cap.stats.defensa * ARMBAND_MULT),
    velocidad: Math.round(cap.stats.velocidad * ARMBAND_MULT),
    aguante: Math.round(cap.stats.aguante * ARMBAND_MULT),
  }
  return xi
}

/** Multiplicador del Brazalete de Capitán (+25 % a todo). */
const ARMBAND_MULT = 1.25

/**
 * El JUGADOR INSIGNIA de una plantilla rival: el de más peso en la serie y, a
 * igualdad, el de mejores números. Es quien lleva su Brazalete de Capitán.
 */
export function rivalArmbandBaseId(teamId: string): string | null {
  const xi = rivalStartingXI(teamId)
  if (!xi.length) return null
  const sum = (b: PlayerBase) => Object.values(b.stats).reduce((a, v) => a + v, 0)
  return xi.reduce((best, b) => (b.fame > best.fame || (b.fame === best.fame && sum(b) > sum(best)) ? b : best), xi[0]).id
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

/**
 * Técnicas que un rival CONOCE con un nivel y una rareza dados: su cadena,
 * capada por rareza y desbloqueada por nivel (los ★5 de catálogo, con un paso
 * extra en partidos). Lo usan el partido y la FICHA de la previa.
 */
export function rivalKnownTechniques(b: PlayerBase, level: number, rarity: number, elite = false): string[] {
  const chain = (b.signature ?? []).slice(0, Math.max(1, Math.min(MAX_RARITY, rarity)))
  let known = chain.filter((_, i) => level >= SIGNATURE_LEVELS[Math.min(i, SIGNATURE_LEVELS.length - 1)])
  // El paso EXTRA de los cracks ★5 solo a partir del tramo alto (nivel 30+):
  // desde el primer partido hacía que «el rival no para de usar supertécnicas»
  // mientras tu equipo aún despertaba las suyas.
  if (elite && b.fame >= 5 && level >= 30 && known.length < chain.length) known = chain.slice(0, known.length + 1)
  return known
}

/** `toRival` para consumo externo (banquillo rival del partido). */
export function rivalFromBase(b: PlayerBase, level: number, power: number, rarity: number): RivalPlayer {
  return toRival(b, level, power, rarity, false)
}

function toRival(b: PlayerBase, level: number, power: number, rarity: number, elite = false): RivalPlayer {
  // Misma vara que tus jugadores: atributos por RAREZA (la de la ronda), nivel
  // y el `power` del equipo como último empujón.
  const stats = applyPower(scaleStats(rarityStats(b.id, b.position, rarity), level), power)
  // Y sus TÉCNICAS también con tu misma regla (ver `rivalKnownTechniques`).
  return { baseId: b.id, name: b.name, position: b.position, element: b.element, level, stats, techniques: rivalKnownTechniques(b, level, rarity, elite), rarity }
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
/**
 * La Mejora también ABARATA la técnica: −15 % de PT por nivel (suelo: mitad
 * del coste base). Sin esto, mejorar un paso temprano de la cadena «se
 * quedaba frío»: en tres niveles llegaba el paso siguiente con más potencia
 * bruta y la mejora parecía tirada. Con el descuento, la técnica mejorada se
 * convierte en tu opción EFICIENTE: pega casi como la nueva y cuesta mucho
 * menos PT — dos herramientas distintas, no una obsoleta.
 */
export const TECH_LEVEL_COST_CUT = 0.15

/** Coste REAL de una técnica en manos de su dueño (Mejoras aplicadas). */
export function techniqueCostFor(
  holder: { techLevels?: Record<string, number> } | undefined, tech: { id: string; cost: number },
): number {
  const lv = holder?.techLevels?.[tech.id] ?? 0
  if (!lv) return tech.cost
  return Math.max(Math.round(tech.cost * 0.5), Math.round(tech.cost * (1 - lv * TECH_LEVEL_COST_CUT)))
}

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
/**
 * Cuánto MÍNIMO gana un paso de cadena sobre el anterior. Sin esto, respetar
 * el orden canónico dejaba cadenas que iban a peor.
 */
export const CHAIN_STEP_MIN_GAIN = 4

/** ¿Existe esa ficha en el catálogo? (`getPlayerBase` lanza si no.) */
const KNOWN_BASES = new Set(PLAYERS.map((p) => p.id))
const PLAYER_BY_ID_HAS = (id: string) => KNOWN_BASES.has(id)

/**
 * POTENCIA DE UN PASO DE CADENA, con suelo.
 *
 * La cadena va en el orden del JUEGO (Kevin Dragonfly aprende el Golpe de
 * Dragón antes que el de Guiverno), pero la potencia que trae la wiki mezcla
 * versiones y no sirve de progresión: el Guiverno figura con 48 y el Dragón
 * con 70, justo al revés de como se aprenden. Si se respeta el canon a pelo,
 * el 88 % de las cadenas tenían algún paso MÁS FLOJO que el anterior — o sea,
 * desbloquear te daba algo peor.
 *
 * Aquí se respeta el canon Y se garantiza la progresión: cada paso vale al
 * menos lo que el mejor de los anteriores de SU cadena, más un margen.
 */
export function chainStepPower(baseId: string | undefined, techId: string, raw: number): number {
  // Sin ficha conocida no hay cadena que respetar (actores de prueba, técnicas
  // sueltas de partidas viejas…): se devuelve la potencia tal cual.
  if (!baseId || !PLAYER_BY_ID_HAS(baseId)) return raw
  const chain = getPlayerBase(baseId).signature ?? []
  const i = chain.indexOf(techId)
  if (i <= 0) return raw
  let floor = 0
  for (let k = 0; k < i; k++) {
    const t = getTechnique(chain[k])
    if (!t) continue
    // El suelo se arrastra: cada paso ya viene con el suyo aplicado.
    const p = Math.max(t.power, floor + CHAIN_STEP_MIN_GAIN)
    if (p > floor) floor = p
  }
  return Math.max(raw, floor + CHAIN_STEP_MIN_GAIN)
}

export function techniquePower(p: PlayerInstance | undefined, tech: { id: string; power: number }): number {
  if (!p) return tech.power
  const base = chainStepPower(p.baseId, tech.id, tech.power)
  return Math.round(base * (1 + techLevel(p, tech.id) * TECH_LEVEL_BONUS))
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
 * en la serie), los agentes libres y los equipos que cada saga pone a «rondar
 * por ahí». El propio instituto ya no aporta nada: sus 14 salen TODOS de
 * inicio en la convocatoria (y el filtro de «ya fichados» los quita del pool).
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
  return Math.round((300 + base.fame * 450) * (1 + level * 0.03))
}

// ---------------------------------------------------------------------------
// Filosofías de equipo
// ---------------------------------------------------------------------------

/**
 * Suma los efectos de TODAS las filosofías activas en un solo objeto, para que
 * el motor consulte una vez y no vaya preguntando por ids sueltos. Los
 * multiplicadores se multiplican entre sí y las probabilidades se suman: dos
 * filosofías que empujan lo mismo se notan de verdad.
 */
export function tacticEffects(ids: string[] | undefined): TacticEffect {
  const out: TacticEffect = {}
  if (!ids?.length) return out
  const mulStep = (
    a: Partial<Record<ChainStep, number>> | undefined,
    b: Partial<Record<ChainStep, number>> | undefined,
  ) => {
    if (!b) return a
    const r = { ...(a ?? {}) } as Partial<Record<ChainStep, number>>
    for (const k of Object.keys(b) as ChainStep[]) r[k] = (r[k] ?? 1) * (b[k] ?? 1)
    return r
  }
  for (const id of ids) {
    const e = getTactic(id)?.effect
    if (!e) continue
    out.attackBias = mulStep(out.attackBias, e.attackBias)
    out.defendBias = mulStep(out.defendBias, e.defendBias)
    out.counterChance = (out.counterChance ?? 0) + (e.counterChance ?? 0)
    out.reclaimChance = (out.reclaimChance ?? 0) + (e.reclaimChance ?? 0)
    out.staminaDrain = (out.staminaDrain ?? 1) * (e.staminaDrain ?? 1)
    out.burstGain = (out.burstGain ?? 1) * (e.burstGain ?? 1)
    out.longShotRelief = (out.longShotRelief ?? 1) * (e.longShotRelief ?? 1)
    out.ptCost = (out.ptCost ?? 1) * (e.ptCost ?? 1)
    out.elementEdge = (out.elementEdge ?? 0) + (e.elementEdge ?? 0)
    out.momentumStep = (out.momentumStep ?? 0) + (e.momentumStep ?? 0)
    out.comebackBoost = (out.comebackBoost ?? 0) + (e.comebackBoost ?? 0)
    out.freePassing = out.freePassing || e.freePassing
  }
  return out
}
