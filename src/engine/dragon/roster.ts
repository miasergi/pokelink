// Derivación de atributos, power level y creación de luchadores. Puro.
import type { RNG } from '@/utils/rng'
import { getFighter } from '@/data/dragon/fighters'
import { getForm } from '@/data/dragon/transformations'
import { getItem } from '@/data/dragon/items'
import type { Combatant, Fighter, FighterData, StatKey, Stats } from './types'

/** Cuánto sube cada atributo por nivel, en fracción de su base. */
export const GROWTH = 0.085

/** El depósito de ki es IGUAL para todos (0-100). */
export const KI_MAX = 100

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

/** Un rival: igual que un aliado pero con sus formas YA disponibles. */
export function createEnemy(baseId: string, level: number): Fighter {
  const f = createFighter(baseId, level)
  const d = getFighter(baseId)
  f.forms = (d?.forms ?? []).slice()
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
  f.level = Math.min(99, f.level + amount)
  const learned = techniquesAt(d, f.level).filter((t) => !f.techniques.includes(t))
  f.techniques = techniquesAt(d, f.level)
  const s = statsAt(d.base, f.level, f.zenkai)
  // Los PS suben con el tope, no se rellenan.
  f.hp = Math.min(maxHp(s.aguante), f.hp + Math.round((f.level - before) * 6))
  return { levels: f.level - before, learned }
}

export function fighterStats(f: Fighter): Stats {
  const d = getFighter(f.baseId)
  if (!d) throw new Error(`Luchador desconocido: ${f.baseId}`)
  const s = statsAt(d.base, f.level, f.zenkai)
  const item = f.item ? getItem(f.item) : undefined
  if (item?.stats) {
    for (const k of STAT_KEYS) {
      const m = item.stats[k]
      if (m) s[k] *= m
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

/** Pasa un luchador de equipo a combatiente. Los PS vienen de fuera (persisten). */
export function toCombatant(f: Fighter): Combatant {
  const stats = fighterStats(f)
  const hpMax = maxHp(stats.aguante)
  const item = f.item ? getItem(f.item) : undefined
  return {
    uid: f.uid,
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
    forms: f.forms.slice(),
    mods: {},
    guarding: false,
    stunned: false,
    exposed: false,
    seedUsed: false,
    item: f.item,
    fainted: f.hp <= 0,
  }
}

/** Atributos EFECTIVOS: base × transformación × buffs/debuffs del combate. */
export function effStats(c: Combatant): Stats {
  const out = { ...c.stats }
  const form = c.form ? getForm(c.form) : undefined
  for (const k of STAT_KEYS) {
    const fm = form?.mult[k]
    if (fm) out[k] *= fm
    const mm = c.mods[k]
    if (mm) out[k] *= mm
  }
  return out
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

export function pickRandomTech(techs: string[], rng: RNG): string | undefined {
  return techs.length ? rng.pick(techs) : undefined
}
