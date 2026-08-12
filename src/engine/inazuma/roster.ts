// Plantilla: crear jugadores, escalarlos por nivel, calcular PT y aplicar
// fatiga y objetos. Todo son funciones PURAS — el store solo las orquesta.
import type { RNG } from '@/utils/rng'
import { getPlayerBase, playersOfTeam, PLAYERS } from '@/data/inazuma/players'
import { getItem } from '@/data/inazuma/items'
import { getTechnique } from '@/data/inazuma/techniques'
import { getTeam, FILLER_NAMES } from '@/data/inazuma/teams'
import { getFormation } from '@/data/inazuma/formations'
import {
  SQUAD_SIZE,
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
  return Math.round(45 + effectiveStats(p).aguante * 0.75)
}

/**
 * Atributos EFECTIVOS: nivel + bonos de entrenamiento + objeto equipado.
 * NO incluye la fatiga (eso es `fatigueMultiplier`, que se aplica por duelo)
 * para que la ficha del jugador enseñe siempre su valor real.
 */
export function effectiveStats(p: PlayerInstance): Stats {
  const base = getPlayerBase(p.baseId)
  const s = scaleStats(base.stats, p.level)
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
  const s = effectiveStats(p)
  const base = getPlayerBase(p.baseId)
  const w = POSITION_WEIGHTS[base.position]
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

export function createPlayer(baseId: string, level: number, opts: { captain?: boolean } = {}): PlayerInstance {
  const p: PlayerInstance = {
    uid: nextPlayerUid(),
    baseId,
    level,
    pt: 0,
    stamina: 100,
    // SIN técnicas de salida: `base.techniques` es el repertorio del RIVAL.
    // Las tuyas se despiertan en las casillas de firma (cadena `signature`),
    // se aprenden de la mochila o las regala el mapa.
    techniques: [],
    captain: opts.captain,
  }
  p.pt = ptMax(p)
  return p
}

/** Sube niveles y rellena PT proporcionalmente (no regala depósito lleno). */
export function levelUp(p: PlayerInstance, amount = 1): PlayerInstance {
  const before = ptMax(p)
  const next = { ...p, level: Math.min(MAX_LEVEL, p.level + amount) }
  next.pt = Math.min(ptMax(next), p.pt + (ptMax(next) - before))
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
export function buildRivalTeam(teamId: string, level: number, rng: RNG): RivalPlayer[] {
  const team = getTeam(teamId)
  // Su once sale de su plantilla REAL (14 jugadores por instituto) y se arma
  // POR LÍNEAS, igual que el tuyo. Cogerlos «los 11 primeros de la lista» era
  // asimétrico (a ellos les tocaban siempre los mejores y a ti no) y además
  // podía dejarles sin portero.
  const named = rivalStartingXI(teamId)
  const out: RivalPlayer[] = named.map((b) => toRival(b, level, team.power))

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

function toRival(b: PlayerBase, level: number, power: number): RivalPlayer {
  const stats = applyPower(scaleStats(b.stats, level), power)
  return { baseId: b.id, name: b.name, position: b.position, element: b.element, level, stats, techniques: b.techniques }
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
export function signablePool(beatenTeams: string[], ownTeam?: string): PlayerBase[] {
  const allowed = new Set([...beatenTeams, 'libre'])
  if (ownTeam) allowed.add(ownTeam)
  return PLAYERS.filter((p) => allowed.has(p.team))
}

/** Precio de traspaso, para la tienda y el resumen del fichaje. */
export function transferValue(base: PlayerBase, level: number): number {
  return Math.round((300 + base.rarity * 450) * (1 + level * 0.03))
}
