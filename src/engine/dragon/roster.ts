// Derivación de atributos, power level y creación de luchadores. Puro.
import type { RNG } from '@/utils/rng'
import { getFighter } from '@/data/dragon/fighters'
import { getForm } from '@/data/dragon/transformations'
import { getTrait } from '@/data/dragon/personalities'
import { getItem } from '@/data/dragon/items'
import { getTechnique } from '@/data/dragon/techniques'
import { bondsFor, TRAIT_BY_FIGHTER } from '@/data/dragon/personalities'
import type { Combatant, Fighter, FighterData, StatKey, Stats, Technique } from './types'

/** Cuánto sube cada atributo por nivel, en fracción de su base. */
export const GROWTH = 0.085

/** El depósito de ki es IGUAL para todos (0-100). */
export const KI_MAX = 100

/**
 * Tope de nivel. Alto porque la aventura COMPLETA son trece tramos y cada uno
 * sube 15 niveles: el jefe final ronda el 200. No hay ningún motivo para
 * dejarlo en 99 — los atributos crecen en línea recta con el nivel, así que la
 * escala aguanta, y el power level del scouter ya explota solo.
 */
export const LEVEL_CAP = 250

const STAT_KEYS: StatKey[] = ['poder', 'ki', 'defensa', 'velocidad', 'aguante']

/** Atributos a un nivel dado, sin objeto ni transformación. */
export function statsAt(base: Stats, level: number, zenkai = 1): Stats {
  const k = (1 + (level - 1) * GROWTH) * zenkai
  return {
    poder: base.poder * k,
    ki: base.ki * k,
    defensa: base.defensa * k,
    velocidad: base.velocidad * k,
    aguante: base.aguante * k,
  }
}

/**
 * PS máximos. El 5,5 (antes 7) sale de medir: con barras más largas, un
 * combate igualado se iba a 40 turnos porque ~40 % de los turnos son cargar o
 * guardar y no hacen daño. Bajar los PS acorta el combate sin tocar el
 * equilibrio, porque afecta igual a los dos lados.
 */
export function maxHp(aguante: number): number {
  return Math.round(35 + aguante * 5.5)
}

/**
 * Power level: el número del scouter. **Es cosmético** — el combate se resuelve
 * con los atributos, nunca con esto. Se deriva de los atributos elevados a
 * 2.4 para que crezca como en el anime (Goku ronda 330 al empezar y pasa de
 * 8.000 entrenado, que es justo donde el scouter revienta).
 *
 * `sagaScale` es puro teatro: multiplica el número mostrado saga a saga para
 * que los millones de la saga de Cell existan sin tocar ni un número del
 * balance. Nunca la use quien calcule daño.
 */
const PL_K = 0.0117
const PL_EXP = 2.4

export function powerLevel(stats: Stats, sagaScale = 1): number {
  const sum = STAT_KEYS.reduce((acc, k) => acc + stats[k], 0)
  return Math.round(Math.pow(sum, PL_EXP) * PL_K * sagaScale)
}

/** Formatea el power level como lo escupiría un scouter. */
export function formatPL(pl: number): string {
  return pl.toLocaleString('es-ES')
}

// ------------------------------------------------------------ instancias ---

let uidSeq = 0
/** Reinicia el contador (los tests lo necesitan para ser deterministas). */
export function resetUids(): void { uidSeq = 0 }

export function createFighter(baseId: string, level: number): Fighter {
  const d = getFighter(baseId)
  if (!d) throw new Error(`Luchador desconocido: ${baseId}`)
  const techs = techniquesAt(d, level)
  const s = statsAt(d.base, level)
  return {
    uid: `${baseId}-${++uidSeq}`,
    baseId,
    name: d.name,
    lineage: d.lineage,
    style: d.style,
    level,
    zenkai: 1,
    hp: maxHp(s.aguante),
    techniques: techs,
    // Las transformaciones NO vienen desbloqueadas: se despiertan peleando al
    // límite (ver `checkAwakenings` en run.ts). Es el momento del que vive el
    // juego, así que no se regala al crear al personaje.
    forms: [],
    color: d.color,
    plBase: d.plBase ?? 100,
  }
}

/**
 * Un rival: igual que un aliado pero con sus transformaciones ya despiertas.
 *
 * OJO, respeta el NIVEL DE DESBLOQUEO igual que el jugador. Sin ese filtro, un
 * Cabba de relleno a nivel 9 salía con Superguerrero puesto y borraba al
 * equipo en la segunda casilla del arco de Super. Y las formas SIN `unlock`
 * (Forma Dorada, Poder Divino, las de Freezer…) son de FASE DE JEFE: las
 * reparte el motor por `phases`, no se llevan de serie.
 */
export function createEnemy(baseId: string, level: number): Fighter {
  const f = createFighter(baseId, level)
  const d = getFighter(baseId)
  f.forms = (d?.forms ?? []).filter((id) => {
    const def = getForm(id)
    return !!def?.unlock && level >= def.unlock
  })
  return f
}

/** Técnicas que sabe un personaje a cierto nivel (base + aprendidas). */
export function techniquesAt(d: FighterData, level: number): string[] {
  const out = d.techniques.slice()
  for (const l of d.learn ?? []) {
    if (level >= l.level && !out.includes(l.tech)) out.push(l.tech)
  }
  return out
}

/**
 * Sube de nivel y devuelve lo aprendido por el camino, para que la UI pueda
 * cantarlo. Los PS suben con el aguante pero NO se cura: entrenar no venda.
 */
export function levelUp(f: Fighter, amount: number): { levels: number; learned: string[] } {
  const d = getFighter(f.baseId)
  if (!d) return { levels: 0, learned: [] }
  const before = f.level
  f.level = Math.min(LEVEL_CAP, f.level + amount)
  const learned = techniquesAt(d, f.level).filter((t) => !f.techniques.includes(t))
  f.techniques = techniquesAt(d, f.level)
  const s = statsAt(d.base, f.level, f.zenkai)
  // Los PS suben con el tope, no se rellenan.
  f.hp = Math.min(maxHp(s.aguante), f.hp + Math.round((f.level - before) * 6))
  return { levels: f.level - before, learned }
}

/** Combates ganados que hacen falta para subir un objeto de nivel. */
export const ITEM_XP_PER_LEVEL = 4
export const ITEM_LEVEL_MAX = 3
/** Cuánto se refuerza el efecto del objeto por nivel. */
export const ITEM_LEVEL_BONUS = 0.4

export function itemLevel(f: Fighter): number {
  if (!f.item) return 0
  return Math.min(ITEM_LEVEL_MAX, Math.floor((f.itemXp ?? 0) / ITEM_XP_PER_LEVEL))
}

/**
 * Refuerza un multiplicador de objeto según su nivel. Se estira la DISTANCIA
 * respecto a 1, no el número: así un ×1.2 a nivel 2 es ×1.36, y un ×0.78 de
 * lastre se vuelve más penalizador, que es lo justo — el lastre también se
 * «domina» y por eso entrena más.
 */
function itemMult(m: number, lvl: number): number {
  return 1 + (m - 1) * (1 + lvl * ITEM_LEVEL_BONUS)
}

export function fighterStats(f: Fighter): Stats {
  const d = getFighter(f.baseId)
  if (!d) throw new Error(`Luchador desconocido: ${f.baseId}`)
  const s = statsAt(d.base, f.level, f.zenkai)
  const item = f.item ? getItem(f.item) : undefined
  if (item?.stats) {
    const lvl = itemLevel(f)
    for (const k of STAT_KEYS) {
      const m = item.stats[k]
      if (m) s[k] *= itemMult(m, lvl)
    }
  }
  return s
}

export function fighterMaxHp(f: Fighter): number {
  return maxHp(fighterStats(f).aguante)
}

export function fighterPL(f: Fighter, sagaScale = 1): number {
  return powerLevel(fighterStats(f), sagaScale)
}

// -------------------------------------------------------------- combate ----

/**
 * Pasa un luchador de equipo a combatiente. Los PS vienen de fuera (persisten).
 * `team` son los baseId de sus compañeros: con ellos se resuelven los VÍNCULOS,
 * que por eso valen distinto según con quién lo lleves.
 */
export function toCombatant(f: Fighter, team: string[] = []): Combatant {
  const stats = fighterStats(f)
  const hpMax = maxHp(stats.aguante)
  const item = f.item ? getItem(f.item) : undefined
  return {
    uid: f.uid,
    baseId: f.baseId,
    name: f.name,
    lineage: f.lineage,
    style: f.style,
    level: f.level,
    color: f.color,
    plBase: f.plBase,
    stats,
    hp: Math.max(0, Math.min(hpMax, f.hp)),
    hpMax,
    // Empiezas a media carga: ni regalado ni obligado a cargar el turno 1.
    ki: Math.min(KI_MAX, 50 + (item?.startKi ?? 0)),
    kiMax: KI_MAX,
    techniques: f.techniques.slice(),
    techLevels: f.techLevels,
    forms: f.forms.slice(),
    mods: {},
    guarding: false,
    stunned: false,
    exposed: false,
    item: f.item,
    fainted: f.hp <= 0,
    trait: TRAIT_BY_FIGHTER[f.baseId],
    bond: bondMult(f.baseId, team),
  }
}

/**
 * Multiplicador de los vínculos activos, CON TOPE. Se acumulan, pero ninguno
 * pasa de +12 % por atributo: sin el tope, un Goku rodeado de Krilín, Vegeta,
 * Gohan y Yamcha salía con +46 % de poder gratis y el bot que juega bien se
 * terminaba el juego el 40 % de las veces. Los vínculos son un empujón por
 * llevar a la gente adecuada, no una segunda tabla de atributos.
 */
export const BOND_CAP = 1.12

export function bondMult(baseId: string, team: string[]): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {}
  for (const v of bondsFor(baseId, team.filter((x) => x !== baseId))) {
    for (const k of STAT_KEYS) {
      const m = v.mult[k]
      if (m) out[k] = Math.min(BOND_CAP, (out[k] ?? 1) * m)
    }
  }
  return out
}

/**
 * Atributos EFECTIVOS: base × vínculos × carácter × transformación × buffs.
 *
 * El orden no importa (todo son multiplicadores) pero sí que estén TODOS aquí:
 * es el único sitio del que bebe el motor, así que lo que no se aplique en
 * esta función es decorativo por mucho que salga en la ficha.
 */
export function effStats(c: Combatant): Stats {
  const out = { ...c.stats }
  const form = c.form ? getForm(c.form) : undefined
  const trait = traitActive(c) ? getTrait(c.trait ?? '') : undefined
  for (const k of STAT_KEYS) {
    const bm = c.bond?.[k]
    if (bm) out[k] *= bm
    const tm = trait?.mult[k]
    if (tm) out[k] *= tm
    const fm = form?.mult[k]
    if (fm) out[k] *= fm
    const mm = c.mods[k]
    if (mm) out[k] *= mm
  }
  return out
}

/** ¿Se dan ahora las condiciones del carácter de este luchador? */
export function traitActive(c: Combatant, turn = 1, rivalLevel = c.level): boolean {
  const t = c.trait ? getTrait(c.trait) : undefined
  if (!t) return false
  const frac = c.hp / Math.max(1, c.hpMax)
  switch (t.when) {
    case 'siempre': return true
    case 'hpBajo': return frac < 0.34
    case 'hpAlto': return frac > 0.5
    case 'companeroCaido': return !!c.sawFall
    case 'transformado': return !!c.form
    case 'rivalFuerte': return rivalLevel > c.level
    case 'primerAsalto': return turn <= 2
    default: return false
  }
}

export function combatantPL(c: Combatant, sagaScale = 1): number {
  return powerLevel(effStats(c), sagaScale)
}

/**
 * Triángulo de estilos: bruto ▶ técnico ▶ ki ▶ bruto. Suave a propósito
 * (×1.18 / ×0.88): en Inazuma medimos que un triángulo duro convierte cada
 * combate en «¿me toca el emparejamiento bueno?» y aquí la palanca que
 * queremos que decida es el ki, no el emparejamiento.
 */
export function styleMultiplier(atk: Combatant['style'], def: Combatant['style']): number {
  if (atk === def) return 1
  const beats: Record<string, string> = { bruto: 'tecnico', tecnico: 'ki', ki: 'bruto' }
  if (beats[atk] === def) return 1.18
  return 0.88
}

/**
 * Los androides tienen núcleo infinito: recuperan ki solos cada turno. Solo 6,
 * no 10: con 10 se pagaban una Regeneración cada pocos turnos sin dejar de
 * atacar y el combate no terminaba nunca.
 */
export const KI_REGEN_LINEAGE: Partial<Record<Fighter['lineage'], number>> = {
  androide: 6,
}

// ------------------------------------------------------- técnicas y nivel ---

/** Cuánto sube la potencia por nivel de técnica. */
export const TECH_LEVEL_BONUS = 0.18
/** Y cuánto abarata el coste (una técnica dominada cansa menos). */
export const TECH_LEVEL_CUT = 0.08
/** Tope: V4 y no se sube más. */
export const TECH_LEVEL_MAX = 3

/**
 * Resuelve una técnica EN MANOS DE UN LUCHADOR CONCRETO, con su nivel ya
 * aplicado. Todo el motor tiene que pasar por aquí en vez de por `getTechnique`
 * a secas: si no, la mejora se vería en la ficha pero no cambiaría nada en el
 * combate — exactamente el fallo que ya tuvimos en Inazuma con los objetos de
 * atributos, que eran decorativos y valían cero medido con el bot.
 */
export function actorTechnique(c: { techLevels?: Record<string, number> }, id: string): Technique | undefined {
  const t = getTechnique(id)
  if (!t) return undefined
  const lv = c.techLevels?.[id] ?? 0
  if (!lv) return t
  return {
    ...t,
    // El NOMBRE lleva la versión: así la mejora se ve en el campo, en la
    // narración y en los botones, que salen todos de aquí.
    name: `${t.name} V${lv + 1}`,
    power: Math.round(t.power * (1 + lv * TECH_LEVEL_BONUS)),
    cost: Math.max(6, Math.round(t.cost * (1 - lv * TECH_LEVEL_CUT))),
  }
}

/** Sube una técnica de nivel. Devuelve false si ya está al tope. */
export function upgradeTechnique(f: Fighter, id: string): boolean {
  if (!f.techniques.includes(id)) return false
  const lv = f.techLevels?.[id] ?? 0
  if (lv >= TECH_LEVEL_MAX) return false
  f.techLevels = { ...(f.techLevels ?? {}), [id]: lv + 1 }
  return true
}

/** Enseña una técnica nueva. Devuelve false si ya la sabía. */
export function learnTechnique(f: Fighter, id: string): boolean {
  if (f.techniques.includes(id)) return false
  f.techniques = [...f.techniques, id]
  return true
}

export function pickRandomTech(techs: string[], rng: RNG): string | undefined {
  return techs.length ? rng.pick(techs) : undefined
}
