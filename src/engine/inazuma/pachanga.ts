// PACHANGA: el «combate salvaje» del modo. Un partidillo de barrio que se
// resuelve en una tanda rápida de mano a mano, sin construcción de jugada ni
// posesiones — nada de los 90 minutos del partido de jefe.
//
// FORMA: 5 rondas alternas (tú tiras, ellos tiran, tú tiras…), gana el primero
// que llegue a 3. Cada ronda es UN duelo y UNA decisión, así que la pachanga
// entera se juega en cinco toques y dura menos de un minuto.
//
// Sirve para dos cosas, que es justo lo que se le pidió:
//  - CANSA: los duelistas gastan aguante por ronda AQUÍ, y al cerrarse todo el
//    once paga el partidillo (y la derrota, un buen pico extra) en
//    `applyPachangaResult` — perder una pachanga tiene que doler.
//  - SUBE DE NIVEL: si ganas, todo el que haya jugado se lleva niveles.
import { RNG } from '@/utils/rng'
import { actorTechnique, duelChance, oddsStars, pickAiTechnique, resolveDuel, type Duelist } from './duel'
import { ELEMENT_INFO } from './elements'
import type { Actor, DecisionOption, MatchSide, Technique } from './types'

/** Rondas «reglamentarias» y objetivo de goles. */
export const PACHANGA_TARGET = 3
export const PACHANGA_MAX_ROUNDS = 5
/**
 * Tope duro de rondas. La muerte súbita se juega de dos en dos hasta que alguien
 * saca ventaja, así que el tope solo está para que un bucle no se vaya a
 * infinito: NO decide nada por sí mismo. Antes valía 13 y cortaba tandas
 * todavía empatadas, que se apuntaban como derrota — justo el desenlace que la
 * muerte súbita existe para evitar.
 */
const HARD_CAP_ROUNDS = 61
/**
 * A partir de esta ronda los porteros están fundidos: cada tanda extra les
 * quita aguante de más, así que las tandas se van desnivelando solas y la
 * muerte súbita no se eterniza.
 */
const KEEPER_FATIGUE_FROM = 9
/**
 * Aguante que cuesta cada mano a mano, al tirador y al portero. Bajado de 6:
 * perder una pachanga larga dejaba a los implicados temblando y se sentía
 * castigo doble (sin niveles Y fundido).
 */
const STAMINA_PER_ROUND = 4

export interface PachangaRound {
  index: number
  /** true si el turno de tirar es tuyo. */
  mine: boolean
  shooter: string
  keeper: string
  technique?: string
  counter?: string
  scored: boolean
  effectiveness: number
  text: string
}

export type PachangaPhase = 'shooting' | 'decision' | 'finished'

export interface PachangaState {
  seed: number
  round: number
  goals: [number, number]
  /** Tu lado y el suyo, reutilizando la estructura del partido. */
  mine: MatchSide
  theirs: MatchSide
  phase: PachangaPhase
  /**
   * Duelo pendiente de que elijas técnica. Cuando paras tú (`mine: false`),
   * `rivalTech` es el tiro que viene: el nombre de la técnica del tirador, o
   * null si dispara sin técnica. Es la MISMA elección determinista que hará
   * `shoot`, así que se puede enseñar antes de decidir qué gastar.
   */
  pending: {
    shooter: Actor
    keeper: Actor
    mine: boolean
    rivalTech?: string | null
    rivalTechElement?: Technique['element']
  } | null
  options: DecisionOption[]
  rounds: PachangaRound[]
  result: 'win' | 'loss' | null
  rivalName: string
}

export interface PachangaConfig {
  seed: number
  mine: MatchSide
  theirs: MatchSide
  rivalName: string
}

export function createPachanga(cfg: PachangaConfig): PachangaState {
  return {
    seed: cfg.seed,
    round: 0,
    goals: [0, 0],
    mine: cfg.mine,
    theirs: cfg.theirs,
    phase: 'shooting',
    pending: null,
    options: [],
    rounds: [],
    result: null,
    rivalName: cfg.rivalName,
  }
}

/** ¿Ya está decidida? */
function decided(s: PachangaState): boolean {
  const [a, b] = s.goals
  if (a >= PACHANGA_TARGET || b >= PACHANGA_TARGET) return true
  if (s.round >= HARD_CAP_ROUNDS) return true

  if (s.round < PACHANGA_MAX_ROUNDS) {
    // Ventaja insalvable: al que pierde no le quedan tiros suficientes.
    const left = PACHANGA_MAX_ROUNDS - s.round
    const mineLeft = Math.ceil(left / 2)
    const theirsLeft = Math.floor(left / 2)
    return a > b + theirsLeft || b > a + mineLeft
  }

  // Muerte súbita: solo se decide con las dos tandas completas y ventaja.
  // (Rondas pares tiras tú, impares ellos, así que el par está cerrado cuando
  // el número de rondas jugadas es par.)
  return s.round % 2 === 0 && a !== b
}

function finish(s: PachangaState): void {
  s.phase = 'finished'
  s.pending = null
  s.options = []
  s.result = s.goals[0] > s.goals[1] ? 'win' : 'loss'
}

/** ¿Puede acabar en tablas? No: es lo que garantiza `decided`. */
export function isDraw(s: PachangaState): boolean {
  return s.phase === 'finished' && s.goals[0] === s.goals[1]
}

/** ¿Va en muerte súbita? Lo pinta la UI para que se entienda por qué sigue. */
export function inSuddenDeath(s: PachangaState): boolean {
  return s.round >= PACHANGA_MAX_ROUNDS && s.phase !== 'finished'
}

function toDuelist(a: Actor, tech: Technique | undefined): Duelist {
  return { name: a.name, element: a.element, stats: a.stats, stamina: a.stamina, technique: tech }
}

function shooterFor(side: MatchSide, rng: RNG): Actor {
  const pool = side.fwds.length ? side.fwds : (side.mids.length ? side.mids : [side.keeper])
  return rng.pick(pool)
}

function affordable(a: Actor, kind: Technique['kind']): Technique[] {
  return a.techniques
    .map((id) => actorTechnique(a, id))
    .filter((t): t is Technique => !!t && t.kind === kind && t.cost <= a.pt)
}

/**
 * Prepara la siguiente ronda. Si te toca a ti (tirar o parar), deja la pachanga
 * en `decision` con las opciones; si no, la resuelve la IA en `resolve`.
 */
export function nextRound(s: PachangaState, rng: RNG): void {
  if (s.phase === 'finished') return
  if (decided(s)) { finish(s); return }

  // Rondas pares tiras tú; impares, ellos.
  const mineTurn = s.round % 2 === 0
  const shooter = shooterFor(mineTurn ? s.mine : s.theirs, rng)
  const keeper = (mineTurn ? s.theirs : s.mine).keeper

  // Decides SIEMPRE: tirando eliges el disparo, defendiendo eliges la parada.
  const actor = mineTurn ? shooter : keeper
  const kind: Technique['kind'] = mineTurn ? 'tiro' : 'parada'
  const rival = mineTurn ? keeper : shooter
  const rivalTech = pickAiTechnique(
    affordable(rival, mineTurn ? 'parada' : 'tiro'), rival.pt, actor.element, 'definicion',
  )
  s.pending = {
    shooter,
    keeper,
    mine: mineTurn,
    // Parando tú, el tiro que viene se ve venir (ver `PachangaState.pending`).
    rivalTech: mineTurn ? undefined : (rivalTech?.name ?? null),
    rivalTechElement: mineTurn ? undefined : rivalTech?.element,
  }

  const options: DecisionOption[] = []
  const build = (id: string, label: string, tech: Technique | undefined, cost: number): DecisionOption => {
    const atk = mineTurn ? toDuelist(shooter, tech) : toDuelist(shooter, rivalTech)
    const def = { ...(mineTurn ? toDuelist(keeper, rivalTech) : toDuelist(keeper, tech)), keeper: true }
    const { chance } = duelChance('definicion', atk, def)
    const shown = mineTurn ? chance : 1 - chance
    const el = tech?.element
    return {
      id,
      label,
      detail: [tech ? `${tech.power} pot.` : 'sin técnica', el ? ELEMENT_INFO[el].label : null, cost ? `${cost} PT` : 'gratis']
        .filter(Boolean).join(' · '),
      odds: oddsStars(shown),
      chance: shown,
      cost,
      element: el,
    }
  }

  options.push(build('plain', mineTurn ? 'Disparo sencillo' : 'Achicar y blocar', undefined, 0))
  for (const t of actor.techniques.map((id) => actorTechnique(actor, id)).filter((t): t is Technique => !!t && t.kind === kind)) {
    const o = build(`tech:${t.id}`, t.name, t, t.cost)
    if (t.cost > actor.pt) o.disabled = `Necesitas ${t.cost} PT`
    options.push(o)
  }

  s.options = options
  s.phase = 'decision'
}

/** Resuelve la ronda con la opción elegida y prepara la siguiente. */
export function shoot(s: PachangaState, rng: RNG, optionId: string): PachangaRound | null {
  if (s.phase !== 'decision' || !s.pending) return null
  const { shooter, keeper, mine } = s.pending

  const myTech = optionId.startsWith('tech:')
    ? actorTechnique(mine ? shooter : keeper, optionId.slice(5))
    : undefined
  const rivalActor = mine ? keeper : shooter
  const rivalTech = pickAiTechnique(
    affordable(rivalActor, mine ? 'parada' : 'tiro'),
    rivalActor.pt,
    (mine ? shooter : keeper).element,
    'definicion',
  )
  const shotTech = mine ? myTech : rivalTech
  const saveTech = mine ? rivalTech : myTech

  if (shotTech) shooter.pt = Math.max(0, shooter.pt - shotTech.cost)
  if (saveTech) keeper.pt = Math.max(0, keeper.pt - saveTech.cost)
  shooter.stamina = Math.max(0, shooter.stamina - STAMINA_PER_ROUND)
  // Al portero se le cargan las piernas más deprisa según se alarga la tanda:
  // es lo que rompe los empates eternos sin recurrir a una moneda al aire.
  const extra = s.round >= KEEPER_FATIGUE_FROM ? (s.round - KEEPER_FATIGUE_FROM) + 2 : 0
  keeper.stamina = Math.max(0, keeper.stamina - STAMINA_PER_ROUND - extra)

  const r = resolveDuel('definicion', toDuelist(shooter, shotTech), { ...toDuelist(keeper, saveTech), keeper: true }, rng)
  if (r.success) {
    if (mine) s.goals[0] += 1
    else s.goals[1] += 1
  }

  const move = shotTech ? `¡${shotTech.name.toUpperCase()}! ` : ''
  const stop = saveTech ? ` ¡${saveTech.name.toUpperCase()}!` : ''
  const round: PachangaRound = {
    index: s.round,
    mine,
    shooter: shooter.name,
    keeper: keeper.name,
    technique: shotTech?.name,
    counter: saveTech?.name,
    scored: r.success,
    effectiveness: r.effectiveness,
    text: r.success
      ? `${move}${shooter.name} bate a ${keeper.name}.`
      : `${shooter.name} dispara…${stop} ¡${keeper.name} la saca!`,
  }
  s.rounds.push(round)
  s.round += 1
  s.pending = null
  s.options = []
  s.phase = 'shooting'
  if (decided(s)) finish(s)
  return round
}

/** Jugadores tuyos que han disputado la pachanga (los que se llevan el nivel). */
export function participants(s: PachangaState): string[] {
  const names = new Set(s.rounds.flatMap((r) => (r.mine ? [r.shooter] : [r.keeper])))
  const all = [s.mine.keeper, ...s.mine.defs, ...s.mine.mids, ...s.mine.fwds]
  return all.filter((a) => names.has(a.name)).map((a) => a.uid)
}
