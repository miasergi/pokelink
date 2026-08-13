// Simulación de partido.
//
// FORMA: el partido NO se resuelve de golpe. `advance()` ejecuta UN latido y
// devuelve los eventos que ha emitido; el store lo llama en bucle con un
// temporizador y la UI los reproduce como una retransmisión. Es el mismo patrón
// que el combate Pokémon (motor puro → eventos → animación), con una diferencia
// clave: cuando el latido cae en una jugada decisiva TUYA, el motor se detiene
// en `phase: 'decision'` y espera a que elijas con `chooseOption()`.
//
// ESTRUCTURA DE UNA POSESIÓN (la «cadena»):
//   construcción  MED tuyo   vs  MED rival    (automático, marca el ritmo)
//   penetración   DEL tuyo   vs  DEF rival    (decides: técnica o pase)
//   definición    DEL tuyo   vs  POR rival    (decides: qué tiro)
// Perder cualquiera de los tres corta la jugada. Hacen falta los tres para gol.
import { RNG } from '@/utils/rng'
import { actorTechnique, duelChance, oddsStars, pickAiTechnique, resolveDuel, type Duelist } from './duel'
import { getSpirit } from '@/data/inazuma/spirits'
import { effectivenessLabel, elementMultiplier, ELEMENT_INFO } from './elements'
import { fatigueMultiplier } from './roster'
import { availableCombos, comboTechnique } from '@/data/inazuma/combos'
import type {
  Actor, ChainStep, Decision, DecisionMode, DecisionOption, Element, MatchEvent, MatchSide,
  MatchState, ShootoutState, Side, Technique,
} from './types'

/** Posesiones por partido. Con la conversión actual salen resultados 0-4. */
export const PLAYS_PER_MATCH = 16
/** Puntos de Ruptura por hito. A 100 se puede activar la Supervibración. */
const BURST_ON_DUEL = 13
const BURST_ON_GOAL = 26
const BURST_ON_SAVE = 20
const BURST_ON_CONCEDE = 18
/** Acciones que dura la Supervibración una vez activada. */
export const BURST_DURATION = 3
/** Aguante que cuesta disputar un duelo (solo se persiste el de tu plantilla). */
// Segunda subida (7 → 10, y 1 → 2 por posesión): con 7/1 un titular acababa
// el partido rondando 60 de aguante y la fatiga apenas asomaba — «parece que
// apenas baja, ni el mío ni el del rival». Con 10/2 el que disputa 3-4 duelos
// entra en penalización clara en la segunda parte y el cambio del descanso
// vale lo que cuesta.
const STAMINA_PER_DUEL = 10
/** Desgaste por posesión para TODOS los que están sobre el campo. */
const STAMINA_PER_PLAY = 2

export interface MatchConfig {
  seed: number
  home: MatchSide
  away: MatchSide
  decisionMode?: DecisionMode
}

export function createMatch(cfg: MatchConfig, rng: RNG): MatchState {
  const schedule: number[] = []
  for (let i = 0; i < PLAYS_PER_MATCH; i++) {
    const base = 4 + i * (86 / PLAYS_PER_MATCH)
    schedule.push(Math.max(1, Math.min(90, Math.round(base + rng.float(-2.5, 2.5)))))
  }
  schedule.sort((a, b) => a - b)
  return {
    seed: cfg.seed,
    minute: 0,
    play: 0,
    schedule,
    home: cfg.home,
    away: cfg.away,
    phase: 'playing',
    chain: null,
    decision: null,
    result: null,
    halftimeDone: false,
    decisionMode: cfg.decisionMode ?? 'dinamico',
    subsLeft: 3,
    stage: 'reglamentario',
    shootout: null,
    events: [{ kind: 'kickoff', minute: 0 }],
    scorers: [],
  }
}

// ---------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------

export function sideOf(m: MatchState, s: Side): MatchSide {
  return s === 'home' ? m.home : m.away
}
export function otherSide(s: Side): Side {
  return s === 'home' ? 'away' : 'home'
}
export function playerSide(m: MatchState): Side {
  return m.home.isPlayer ? 'home' : 'away'
}
function findActor(side: MatchSide, uid: string): Actor {
  const all = [side.keeper, ...side.defs, ...side.mids, ...side.fwds]
  return all.find((a) => a.uid === uid) ?? side.mids[0] ?? side.keeper
}
function allActors(side: MatchSide): Actor[] {
  return [side.keeper, ...side.defs, ...side.mids, ...side.fwds]
}

function toDuelist(
  a: Actor, tech: Technique | undefined, burst: boolean,
  spirit?: { uid: string; power: number }, sprint?: { uid: string },
): Duelist {
  return {
    name: a.name,
    element: a.element,
    stats: a.stats,
    stamina: a.stamina,
    technique: tech,
    burst,
    boost: (spirit && spirit.uid === a.uid ? spirit.power : 1)
      * streakBoost(a)
      * (sprint && sprint.uid === a.uid ? 1.2 : 1),
  }
}

/** Técnicas conocidas de una clase concreta que el actor puede pagar. */
function affordable(a: Actor, kind: Technique['kind'], free: boolean): Technique[] {
  return a.techniques
    .map((id) => actorTechnique(a, id))
    .filter((t): t is Technique => !!t && t.kind === kind && (free || t.cost <= a.pt))
}

/** Clase de técnica que toca en cada eslabón, atacando y defendiendo. */
const ATTACK_KIND: Record<ChainStep, Technique['kind']> = {
  construccion: 'regate',
  penetracion: 'regate',
  definicion: 'tiro',
}
const DEFEND_KIND: Record<ChainStep, Technique['kind']> = {
  construccion: 'bloqueo',
  penetracion: 'bloqueo',
  definicion: 'parada',
}

// ---------------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------------

/**
 * Ejecuta un latido. Devuelve los eventos emitidos (puede ser vacío si lo que
 * ha ocurrido es que el motor se ha parado a preguntarte algo).
 */
export function advance(m: MatchState, rng: RNG): MatchEvent[] {
  if (m.phase !== 'playing') return []
  const out: MatchEvent[] = []

  // Penaltis: el partido ya no se juega por posesiones, se tira desde el punto.
  if (m.stage === 'penaltis') {
    nextPenalty(m, rng, out)
    return commit(m, out)
  }

  if (!m.chain) {
    // ¿Se acabó el tramo?
    if (m.play >= m.schedule.length) {
      if (!openNextStage(m, out)) finish(m, out)
      return commit(m, out)
    }
    m.minute = m.schedule[m.play]
    // Descanso: se emite antes de la primera posesión de la segunda parte y
    // devuelve un tercio del depósito de PT a todo el mundo.
    if (!m.halftimeDone && m.minute > 45) {
      m.halftimeDone = true
      halftimeRecovery(m)
      out.push({ kind: 'halftime', minute: 45, score: score(m) })
      return commit(m, out)
    }
    startPossession(m, rng, out)
    return commit(m, out)
  }

  resolveStep(m, rng, out)
  return commit(m, out)
}

function commit(m: MatchState, out: MatchEvent[]): MatchEvent[] {
  m.events.push(...out)
  return out
}

function score(m: MatchState): [number, number] {
  return [m.home.goals, m.away.goals]
}

function halftimeRecovery(m: MatchState): void {
  for (const side of [m.home, m.away]) {
    for (const a of allActors(side)) {
      a.pt = Math.min(a.ptMax, a.pt + Math.round(a.ptMax * 0.22))
      a.stamina = Math.min(100, a.stamina + 8)
    }
  }
}

/** Minutos de la prórroga: media hora repartida en cuatro llegadas. */
const EXTRA_TIME_PLAYS = 4

/**
 * Abre el tramo siguiente si el partido está empatado. Un partido de instituto
 * NO puede acabar en tablas: primero prórroga, después penaltis. Devuelve
 * `false` cuando ya hay ganador y toca pitar el final.
 */
function openNextStage(m: MatchState, out: MatchEvent[]): boolean {
  if (m.home.goals !== m.away.goals) return false

  if (m.stage === 'reglamentario') {
    m.stage = 'prorroga'
    for (let i = 0; i < EXTRA_TIME_PLAYS; i++) m.schedule.push(94 + i * 7)
    out.push({
      kind: 'stage',
      minute: 90,
      stage: 'prorroga',
      text: 'Se acaban los 90 y siguen igualados. ¡Media hora más!',
    })
    return true
  }

  if (m.stage === 'prorroga') {
    m.stage = 'penaltis'
    m.minute = 120
    m.shootout = { round: 0, goals: [0, 0], pending: null }
    out.push({
      kind: 'stage',
      minute: 120,
      stage: 'penaltis',
      text: 'Ni con la prórroga. Esto se decide desde los once metros.',
    })
    return true
  }

  return false
}

function finish(m: MatchState, out: MatchEvent[]): void {
  m.phase = 'finished'
  m.minute = m.stage === 'reglamentario' ? 90 : 120
  const mine = playerSide(m)
  const my = sideOf(m, mine).goals
  const theirs = sideOf(m, otherSide(mine)).goals
  // En penaltis el marcador del partido sigue empatado: manda la tanda.
  if (m.stage === 'penaltis' && m.shootout) {
    const [h, a] = m.shootout.goals
    const myPens = mine === 'home' ? h : a
    const theirPens = mine === 'home' ? a : h
    m.result = myPens > theirPens ? 'win' : myPens < theirPens ? 'loss' : 'draw'
  } else {
    m.result = my > theirs ? 'win' : my === theirs ? 'draw' : 'loss'
  }
  out.push({ kind: 'fulltime', minute: m.minute, score: score(m), result: m.result })
}

/** Elige de quién es la posesión (pesado por el centro del campo) y la abre. */
function drainAll(m: MatchState): void {
  for (const side of [m.home, m.away]) {
    for (const a of allActors(side)) a.stamina = Math.max(0, a.stamina - STAMINA_PER_PLAY)
  }
}

function startPossession(m: MatchState, rng: RNG, out: MatchEvent[]): void {
  drainAll(m)
  const midStrength = (s: MatchSide) =>
    s.mids.reduce((acc, a) => acc + (a.stats.control + a.stats.velocidad) * fatigueMultiplier(a.stamina), 0) || 1
  const h = midStrength(m.home)
  const a = midStrength(m.away)
  const pHome = Math.max(0.28, Math.min(0.72, h / (h + a)))
  const side: Side = rng.next() < pHome ? 'home' : 'away'
  const s = sideOf(m, side)

  const carrier = pickRotating(s.mids.length ? s.mids : allActors(s), rng)
  const rivalSide = sideOf(m, otherSide(side))
  m.chain = {
    side,
    step: 'construccion',
    carrier: carrier.uid,
    defenderUid: defenderFor('construccion', rivalSide, rng).uid,
    momentum: 0,
  }
  m.play += 1
  out.push({
    kind: 'possession',
    minute: m.minute,
    side,
    text: `${s.name} saca el balón jugado. ${carrier.name} lo conduce.`,
  })
}

/**
 * ROTACIÓN: dentro de un pool, prioriza a quien MENOS ha participado en el
 * partido. Con el sorteo puro, la varianza hacía que dos o tres jugadores
 * acapararan los duelos y a media plantilla no se la viera en 90 minutos.
 */
const usageCount = new WeakMap<Actor, number>()
/** RACHA de duelos ganados: a 2 seguidos el jugador se enciende (+15 %). */
const winStreak = new WeakMap<Actor, number>()
const STREAK_BOOST = 1.15
function streakBoost(a: Actor): number {
  return (winStreak.get(a) ?? 0) >= 2 ? STREAK_BOOST : 1
}
function pickRotating(pool: Actor[], rng: RNG): Actor {
  if (pool.length <= 1) return pool[0]
  const min = Math.min(...pool.map((a) => usageCount.get(a) ?? 0))
  const fresh = pool.filter((a) => (usageCount.get(a) ?? 0) <= min)
  const pick = rng.pick(fresh)
  usageCount.set(pick, (usageCount.get(pick) ?? 0) + 1)
  return pick
}

/** Escoge al defensor que corresponde al eslabón actual. */
function defenderFor(step: ChainStep, def: MatchSide, rng: RNG): Actor {
  if (step === 'definicion') return def.keeper
  const pool = step === 'construccion'
    ? (def.mids.length ? def.mids : def.defs)
    : (def.defs.length ? def.defs : def.mids)
  return pool.length ? pickRotating(pool, rng) : def.keeper
}

/** Escoge al que recibe el balón para atacar el área. */
function attackerFor(step: ChainStep, atk: MatchSide, rng: RNG): Actor {
  if (step === 'construccion') return pickRotating(atk.mids.length ? atk.mids : allActors(atk), rng)
  const pool = atk.fwds.length ? atk.fwds : atk.mids
  return pool.length ? pickRotating(pool, rng) : atk.keeper
}

function resolveStep(m: MatchState, rng: RNG, out: MatchEvent[]): void {
  const chain = m.chain!
  const atkSide = sideOf(m, chain.side)
  const defSide = sideOf(m, otherSide(chain.side))
  const attacker = findActor(atkSide, chain.carrier)
  const defender = findActor(defSide, chain.defenderUid)

  // ¿Es una jugada en la que decides tú?
  //  - Atacando: penetración y definición siempre; la salida de balón solo si
  //    el que la lleva tiene un regate que pagar (si no, sería un «continuar»
  //    disfrazado y rompería el ritmo sin aportar nada).
  //  - Defendiendo: la parada del portero siempre; los cortes de defensa solo
  //    cuando TU defensor tiene un bloqueo pagable — que es justo cuando hay
  //    una decisión que tomar.
  const mine = playerSide(m)
  const iAttack = chain.side === mine
  // En modo COMPLETO todas las acciones pasan por ti; en dinámico (y en auto,
  // que es dinámico jugado por el banquillo) solo las jugadas con chicha.
  const isDecision = m.decisionMode === 'completo'
    ? true
    : iAttack
      ? chain.step !== 'construccion'
        || affordable(attacker, ATTACK_KIND.construccion, atkSide.burstTurns > 0).length > 0
      : chain.step === 'definicion'
        || affordable(defender, DEFEND_KIND[chain.step], defSide.burstTurns > 0).length > 0

  if (isDecision) {
    m.decision = buildDecision(m, chain.step, iAttack ? 'ataque' : 'defensa', attacker, defender, atkSide, defSide, chain.momentum)
    m.phase = 'decision'
    return
  }

  // Automático: la IA elige por los dos.
  const atkSideBurst = atkSide.burstTurns > 0
  const defSideBurst = defSide.burstTurns > 0
  const atkTech = pickAiTechnique(affordable(attacker, ATTACK_KIND[chain.step], atkSideBurst), attacker.pt, defender.element, chain.step)
  const defTech = pickAiTechnique(affordable(defender, DEFEND_KIND[chain.step], defSideBurst), defender.pt, attacker.element, chain.step)
  executeDuel(m, rng, out, attacker, defender, atkTech, defTech)
}

// ---------------------------------------------------------------------------
// Resolución de un eslabón
// ---------------------------------------------------------------------------

function executeDuel(
  m: MatchState, rng: RNG, out: MatchEvent[],
  attacker: Actor, defender: Actor,
  atkTech: Technique | undefined, defTech: Technique | undefined,
): void {
  const chain = m.chain!
  const step = chain.step
  const atkSide = sideOf(m, chain.side)
  const defSide = sideOf(m, otherSide(chain.side))
  const atkBurst = atkSide.burstTurns > 0
  const defBurst = defSide.burstTurns > 0

  spend(attacker, atkTech, atkBurst)
  spend(defender, defTech, defBurst)
  attacker.stamina = Math.max(0, attacker.stamina - STAMINA_PER_DUEL)
  defender.stamina = Math.max(0, defender.stamina - STAMINA_PER_DUEL)
  if (atkBurst) atkSide.burstTurns -= 1
  if (defBurst) defSide.burstTurns -= 1

  const r = resolveDuel(
    step,
    toDuelist(attacker, atkTech, atkBurst, chain.spirit, chain.sprint),
    toDuelist(defender, defTech, defBurst, chain.spirit, chain.sprint),
    rng,
    chain.momentum,
  )
  // El sprint es de UN duelo: se paga aquí y se apaga aquí.
  if (chain.sprint) {
    const sprinter = [attacker, defender].find((x) => x.uid === chain.sprint!.uid)
    if (sprinter) sprinter.stamina = Math.max(0, sprinter.stamina - 15)
    chain.sprint = undefined
  }
  // Rachas: el ganador suma, el perdedor se apaga. A 2 seguidos, EN LLAMAS.
  {
    const winner = r.success ? attacker : defender
    const loser = r.success ? defender : attacker
    const streak = (winStreak.get(winner) ?? 0) + 1
    winStreak.set(winner, streak)
    winStreak.set(loser, 0)
    if (streak === 2) {
      out.push({
        kind: 'possession',
        minute: m.minute,
        side: chain.side,
        text: `¡${winner.name} está EN LLAMAS! (+15 % hasta que pierda un duelo)`,
      })
    }
  }

  out.push({
    kind: 'duel',
    minute: m.minute,
    side: chain.side,
    step,
    attacker: attacker.name,
    attackerUid: attacker.uid,
    defender: defender.name,
    defenderUid: defender.uid,
    technique: atkTech?.name,
    counter: defTech?.name,
    element: atkTech?.element ?? attacker.element,
    effectiveness: r.effectiveness,
    success: r.success,
    text: duelText(step, attacker, defender, atkTech, defTech, r.success, r.effectiveness),
  })

  if (r.success) {
    addBurst(atkSide, BURST_ON_DUEL)
    chain.momentum += 0.08
    if (step === 'definicion') {
      scoreGoal(m, out, attacker, atkTech)
      return
    }
    const nextStep: ChainStep = step === 'construccion' ? 'penetracion' : 'definicion'
    chain.step = nextStep
    // Quién sigue con el balón. Antes se sorteaba SIEMPRE, y eso rompía dos
    // cosas: si acababas de elegir «Pasar a Fulano», el balón se le quitaba
    // acto seguido (parecía que el pase no servía de nada), y el que rompía la
    // defensa no era el que remataba.
    //   · si has pasado a propósito, se queda con ella,
    //   · el que revienta la defensa es el que dispara,
    //   · y solo en el primer relevo se busca a quien ataque el área.
    const receiver = chain.passed || nextStep === 'definicion'
      ? attacker
      : attackerFor(nextStep, atkSide, rng)
    if (receiver.uid !== attacker.uid) {
      out.push({
        kind: 'possession',
        minute: m.minute,
        side: chain.side,
        text: `${attacker.name} se la deja a ${receiver.name}.`,
      })
    }
    chain.carrier = receiver.uid
    chain.defenderUid = defenderFor(nextStep, defSide, rng).uid
    // El espíritu vale para UN duelo, no para la jugada entera.
    chain.spirit = undefined
    return
  }

  // Falló el atacante.
  addBurst(defSide, step === 'definicion' ? BURST_ON_SAVE : BURST_ON_DUEL)
  if (step === 'definicion') {
    out.push({
      kind: 'save',
      minute: m.minute,
      side: otherSide(chain.side),
      keeper: defender.name,
      keeperUid: defender.uid,
      technique: defTech?.name,
      text: `¡${defender.name} lo detiene! ${defSide.name} respira.`,
    })
    // ¡CÓRNER! A veces el paradón no despeja del todo y hay segunda jugada.
    if (rng.chance(0.18)) {
      const header = attackerFor('definicion', atkSide, rng)
      out.push({
        kind: 'possession',
        minute: m.minute,
        side: chain.side,
        text: `¡Córner! El rechace se pasea y ${header.name} llega al remate…`,
      })
      chain.carrier = header.uid
      chain.defenderUid = defSide.keeper.uid
      chain.spirit = undefined
      exhaustionCheck(m, out, attacker)
      return
    }
  } else {
    // Escueto A PROPÓSITO: la línea del duelo que acaba de salir ya cuenta QUIÉN
    // ha robado el balón («Bruno Cid le roba la cartera a Sam Kincaid»). Antes
    // esta repetía el nombre del defensor y la jugada se narraba dos veces.
    out.push({
      kind: 'turnover',
      minute: m.minute,
      side: otherSide(chain.side),
      text: `Balón para ${defSide.name}.`,
    })
    // ¡CONTRAATAQUE! El robo pilla al rival vendido: el que roba lanza una
    // posesión que EMPIEZA en tres cuartos.
    if (rng.chance(0.16)) {
      const runner = attackerFor('penetracion', defSide, rng)
      out.push({
        kind: 'possession',
        minute: m.minute,
        side: otherSide(chain.side),
        text: `¡Contraataque! ${runner.name} se lanza a la carrera.`,
      })
      m.chain = {
        side: otherSide(chain.side),
        step: 'penetracion',
        carrier: runner.uid,
        defenderUid: defenderFor('penetracion', atkSide, rng).uid,
        momentum: 0.06,
      }
      exhaustionCheck(m, out, attacker)
      return
    }
  }
  exhaustionCheck(m, out, attacker)
  m.chain = null
}

function scoreGoal(m: MatchState, out: MatchEvent[], scorer: Actor, tech: Technique | undefined): void {
  const chain = m.chain!
  const atkSide = sideOf(m, chain.side)
  const defSide = sideOf(m, otherSide(chain.side))
  atkSide.goals += 1
  addBurst(atkSide, BURST_ON_GOAL)
  addBurst(defSide, BURST_ON_CONCEDE)
  if (chain.side === playerSide(m)) m.scorers.push(scorer.name)
  out.push({ kind: 'goal', minute: m.minute, side: chain.side, scorer: scorer.name, scorerUid: scorer.uid, technique: tech?.name, score: score(m) })
  m.chain = null
}

function spend(a: Actor, t: Technique | undefined, free: boolean): void {
  if (t && !free) a.pt = Math.max(0, a.pt - t.cost)
}

function addBurst(s: MatchSide, amount: number): void {
  s.burst = Math.min(100, s.burst + amount)
}

function exhaustionCheck(m: MatchState, out: MatchEvent[], a: Actor): void {
  if (a.stamina > 0 && a.stamina <= 16) {
    out.push({ kind: 'exhausted', minute: m.minute, player: a.name, text: `${a.name} está fundido. Le pesan las piernas.` })
  }
}

function duelText(
  step: ChainStep, atk: Actor, def: Actor,
  atkTech: Technique | undefined, defTech: Technique | undefined,
  success: boolean, eff: number,
): string {
  const el = effectivenessLabel(eff)
  const tail = el ? ` ${el}` : ''
  const move = atkTech ? `¡${atkTech.name.toUpperCase()}!` : ''
  // Solo el nombre de la técnica: la frase principal ya ha dicho quién defiende,
  // y añadir «Fulano responde con…» repetía el nombre dos veces en la misma línea.
  const block = defTech ? ` ¡${defTech.name.toUpperCase()}!` : ''
  if (step === 'construccion') {
    return success
      ? `${atk.name} se saca a ${def.name} de encima. ${move}${tail}`
      : `${def.name} le roba la cartera a ${atk.name}.${block}`
  }
  if (step === 'penetracion') {
    return success
      ? `${move} ${atk.name} rompe la defensa de ${def.name}.${tail}`
      : `${def.name} aguanta la posición y frena a ${atk.name}.${block}`
  }
  // La definición NO adelanta el desenlace: el gol lo anuncian el evento de
  // gol y su celebración. «Fulano bate a Mengano» era un spoiler con patas.
  return success
    ? `${move} ¡${atk.name} arma la pierna!${tail}`
    : `${atk.name} dispara…${block}`
}

// ---------------------------------------------------------------------------
// Jugadas clave (decisiones del usuario)
// ---------------------------------------------------------------------------

const STEP_HEADLINE: Record<ChainStep, string> = {
  construccion: 'Salida de balón',
  penetracion: 'Al borde del área',
  definicion: 'Mano a mano',
}

function buildDecision(
  m: MatchState, step: ChainStep, mode: 'ataque' | 'defensa',
  attacker: Actor, defender: Actor, atkSide: MatchSide, defSide: MatchSide, momentum: number,
): Decision {
  // En defensa decide el que está tapando ESTE eslabón: el portero en el mano
  // a mano y el defensor de turno en los cortes.
  const actor = mode === 'ataque' ? attacker : defender
  const rival = mode === 'ataque' ? defender : attacker
  const mySide = mode === 'ataque' ? atkSide : defSide
  const free = mySide.burstTurns > 0
  const kind = mode === 'ataque' ? ATTACK_KIND[step] : DEFEND_KIND[step]

  const options: DecisionOption[] = []

  // 1) Sin técnica: siempre disponible, coste 0.
  options.push(buildOption(
    m, step, mode, attacker, defender, momentum,
    { id: 'plain', label: plainLabel(step, mode), tech: undefined, cost: 0 },
  ))

  // 2) Cada supertécnica conocida de la clase que toca (con sus Mejoras: V2…).
  for (const t of actor.techniques.map((id) => actorTechnique(actor, id)).filter((t): t is Technique => !!t && t.kind === kind)) {
    const cost = free ? 0 : t.cost
    const vlvl = actor.techLevels?.[t.id] ?? 0
    const opt = buildOption(m, step, mode, attacker, defender, momentum, {
      id: `tech:${t.id}`, label: vlvl > 0 ? `${t.name} V${vlvl + 1}` : t.name, tech: t, cost,
    })
    if (!free && t.cost > actor.pt) opt.disabled = `Necesitas ${t.cost} PT`
    options.push(opt)
  }

  // 3) Técnicas COMBINADAS: no se aprenden, se desbloquean teniendo a los
  //    compañeros de la serie sobre el campo. Puede lanzarlas cualquiera de
  //    sus miembros cuando le toca decidir.
  if (mode === 'ataque') {
    const onPitch = [atkSide.keeper, ...atkSide.defs, ...atkSide.mids, ...atkSide.fwds]
      .map((a) => ({ baseId: a.baseId, techniques: a.techniques }))
    for (const combo of availableCombos(actor.baseId, onPitch)) {
      const t = comboTechnique(combo.techniqueId)
      if (!t || t.kind !== kind) continue
      const cost = free ? 0 : t.cost
      const opt = buildOption(m, step, mode, attacker, defender, momentum, {
        id: `combo:${combo.techniqueId}`, label: `${t.name} (${combo.label})`, tech: t, cost,
      })
      if (!free && t.cost > actor.pt) opt.disabled = `Necesitas ${t.cost} PT`
      options.push(opt)
    }
  }

  // 4) Atacando: pasar a un compañero con otro elemento para esquivar un mal
  //    emparejamiento. Es la jugada de manual del modo: el elemento del que
  //    recibe cuenta contra el defensor, no el del que llevaba el balón.
  //    Un solo pase por posesión (ver `chooseOption`): sin el tope, pasarse
  //    la pelota en bucle sería gratis.
  if (mode === 'ataque' && !m.chain?.passed) {
    for (const mate of passCandidates(atkSide, attacker, rival.element)) {
      options.push(buildOption(
        m, step, mode, mate, defender, momentum,
        { id: `pass:${mate.uid}`, label: `Pasar a ${mate.name}`, tech: undefined, cost: 0, mateElement: mate.element },
      ))
    }
  }

  // 5) SPRINT: quemar aguante por potencia EN ESTE duelo. Convierte el
  //    cansancio en decisión táctica — y no si ya vas con la lengua fuera.
  const plainChance = options[0]?.chance ?? 0.5
  const keeperSaving = mode === 'defensa' && step === 'definicion'
  if (actor.stamina > 30 && !m.chain?.sprint && !keeperSaving && plainChance < 0.62) {
    options.push({
      id: 'sprint',
      label: '¡SPRINT!',
      detail: '-15 de aguante · +20 % de potencia en este duelo',
      odds: 2,
      chance: 0.5,
      cost: 0,
    })
  }

  // 5b) Supervibración, si la barra está llena.
  if (mySide.burst >= 100 && mySide.burstTurns === 0) {
    options.push({
      id: 'burst',
      label: '¡SUPERVIBRACIÓN!',
      detail: `${BURST_DURATION} acciones sin gastar PT y con potencia ×1.4`,
      odds: 3,
      chance: 1,
      cost: 0,
    })
  }

  // 6) Espíritu Guerrero: compite con la Supervibración por la MISMA barra.
  //    Una sola vez por partido, y se lo lleva todo a un único duelo.
  const spirit = getSpirit(actor.spirit)
  if (spirit && mySide.burst >= 100 && !mySide.spiritUsed) {
    options.push({
      id: 'spirit',
      label: `¡${spirit.name.toUpperCase()}!`,
      detail: `Espíritu Guerrero · potencia ×${spirit.power} en este duelo`,
      odds: 3,
      chance: 1,
      cost: 0,
      element: spirit.element,
    })
  }

  // Defendiendo se VE VENIR la jugada: la técnica que el atacante va a lanzar.
  // Es la misma elección determinista que hará `chooseOption` al resolver, así
  // que enseñarla no es una pista — es información de verdad para decidir qué
  // gastar en pararla.
  const incoming = mode === 'defensa'
    ? pickAiTechnique(affordable(attacker, ATTACK_KIND[step], atkSide.burstTurns > 0), attacker.pt, defender.element, step)
    : undefined

  return {
    minute: m.minute,
    step,
    mode,
    actorUid: actor.uid,
    actorName: actor.name,
    rivalUid: rival.uid,
    rivalName: rival.name,
    rivalElement: rival.element,
    rivalTech: mode === 'defensa' ? (incoming?.name ?? null) : undefined,
    rivalTechElement: incoming?.element,
    headline: mode === 'defensa'
      ? (step === 'definicion' ? '¡Disparo a puerta!' : '¡Te atacan! Corta la jugada')
      : STEP_HEADLINE[step],
    options,
  }
}

function plainLabel(step: ChainStep, mode: 'ataque' | 'defensa'): string {
  if (mode === 'defensa') return step === 'definicion' ? 'Achicar y blocar' : 'Entrada firme'
  if (step === 'definicion') return 'Disparo sencillo'
  return 'Regate simple'
}

/**
 * Hasta dos compañeros con OTRO elemento a los que pasar. Se ordenan por
 * ventaja elemental real contra el defensor y, a igualdad, por control: la
 * gracia de la opción es salir de un mal emparejamiento, no pasar por pasar.
 */
function passCandidates(side: MatchSide, carrier: Actor, rivalElement: Element): Actor[] {
  return [...side.fwds, ...side.mids]
    .filter((a) => a.uid !== carrier.uid && a.element !== carrier.element)
    .sort((a, b) =>
      (elementMultiplier(b.element, rivalElement) - elementMultiplier(a.element, rivalElement))
      || (b.stats.control - a.stats.control))
    .slice(0, 2)
}

function buildOption(
  m: MatchState, step: ChainStep, mode: 'ataque' | 'defensa',
  attacker: Actor, defender: Actor, momentum: number,
  spec: { id: string; label: string; tech: Technique | undefined; cost: number; mateElement?: Element },
): DecisionOption {
  const atkSide = sideOf(m, m.chain!.side)
  const defSide = sideOf(m, otherSide(m.chain!.side))
  // Al calcular las estrellas se asume que el rival contesta con su mejor
  // técnica pagable: enseñar una probabilidad que ignore al rival sería mentir.
  const rivalKind = mode === 'ataque' ? DEFEND_KIND[step] : ATTACK_KIND[step]
  const rivalActor = mode === 'ataque' ? defender : attacker
  const rivalSideBurst = (mode === 'ataque' ? defSide : atkSide).burstTurns > 0
  const rivalTech = pickAiTechnique(
    affordable(rivalActor, rivalKind, rivalSideBurst),
    rivalActor.pt,
    (mode === 'ataque' ? attacker : defender).element,
    step,
  )
  const myTech = spec.tech
  const atkTech = mode === 'ataque' ? myTech : rivalTech
  const defTech = mode === 'ataque' ? rivalTech : myTech
  const spirit = m.chain?.spirit
  const { chance } = duelChance(
    step,
    toDuelist(attacker, atkTech, atkSide.burstTurns > 0, spirit, m.chain?.sprint),
    toDuelist(defender, defTech, defSide.burstTurns > 0, spirit, m.chain?.sprint),
    momentum,
  )
  // Defendiendo, tus estrellas son la probabilidad de PARAR = 1 − la del tiro.
  const shown = mode === 'ataque' ? chance : 1 - chance
  const el: Element | undefined = myTech?.element ?? spec.mateElement
  const detail = [
    myTech ? `${myTech.power} pot.` : 'sin técnica',
    el ? ELEMENT_INFO[el].label : null,
    spec.cost > 0 ? `${spec.cost} PT` : 'gratis',
  ].filter(Boolean).join(' · ')
  return { id: spec.id, label: spec.label, detail, odds: oddsStars(shown), chance: shown, cost: spec.cost, element: el }
}

/**
 * Aplica la opción elegida y reanuda el partido. Devuelve los eventos emitidos
 * (vacío si la opción era activar la Supervibración: eso NO consume la jugada,
 * se vuelve a preguntar con la barra ya encendida).
 */
export function chooseOption(m: MatchState, rng: RNG, optionId: string): MatchEvent[] {
  if (m.phase !== 'decision' || !m.decision || !m.chain) return []
  const d = m.decision
  const chain = m.chain
  const atkSide = sideOf(m, chain.side)
  const defSide = sideOf(m, otherSide(chain.side))
  const mySide = d.mode === 'ataque' ? atkSide : defSide

  // El Espíritu se invoca y DESPUÉS eliges el tiro, igual que la Supervibración:
  // no consume la jugada, se vuelve a preguntar con el espíritu ya rugiendo.
  if (optionId === 'spirit') {
    const actor = d.mode === 'ataque'
      ? findActor(atkSide, chain.carrier)
      : findActor(defSide, chain.defenderUid)
    const spirit = getSpirit(actor.spirit)
    if (!spirit) return []
    mySide.spiritUsed = true
    mySide.burst = 0
    chain.spirit = { uid: actor.uid, power: spirit.power }
    const out: MatchEvent[] = [{
      kind: 'spirit',
      minute: m.minute,
      side: d.mode === 'ataque' ? chain.side : otherSide(chain.side),
      player: actor.name,
      spirit: spirit.name,
      text: `¡${actor.name} invoca a ${spirit.name}!`,
    }]
    m.decision = null
    m.phase = 'playing'
    m.events.push(...out)
    resolveStep(m, rng, [])
    return out
  }

  if (optionId === 'sprint') {
    // Se marca el sprint y se VUELVE a preguntar: las opciones ya muestran
    // las probabilidades con el +20 % puesto.
    const actor = d.mode === 'ataque'
      ? findActor(atkSide, chain.carrier)
      : findActor(defSide, chain.defenderUid)
    chain.sprint = { uid: actor.uid }
    const out: MatchEvent[] = [{
      kind: 'possession',
      minute: m.minute,
      side: d.mode === 'ataque' ? chain.side : otherSide(chain.side),
      text: `¡${actor.name} aprieta los dientes y esprinta!`,
    }]
    m.decision = null
    m.phase = 'playing'
    m.events.push(...out)
    resolveStep(m, rng, [])
    return out
  }

  if (optionId === 'burst') {
    mySide.burstTurns = BURST_DURATION
    mySide.burst = 0
    const out: MatchEvent[] = [{
      kind: 'burst',
      minute: m.minute,
      side: d.mode === 'ataque' ? chain.side : otherSide(chain.side),
      text: `¡${mySide.name} entra en SUPERVIBRACIÓN! Las próximas ${BURST_DURATION} acciones son gratis.`,
    }]
    // Se rehace la decisión: ahora las técnicas no cuestan PT.
    m.decision = null
    m.phase = 'playing'
    m.events.push(...out)
    resolveStep(m, rng, [])
    return out
  }

  let attacker = findActor(atkSide, chain.carrier)
  // El defensor quedó fijado al entrar en el eslabón (ver `ChainState`), así
  // que es exactamente el mismo contra el que se calcularon las estrellas.
  const defender = findActor(defSide, chain.defenderUid)

  let myTech: Technique | undefined
  if (optionId.startsWith('tech:')) {
    // Se resuelve contra el actor que la lanza para aplicar sus Mejoras.
    myTech = actorTechnique(d.mode === 'ataque' ? attacker : defender, optionId.slice(5))
  } else if (optionId.startsWith('combo:')) {
    // Combinada: ya viene con su bono; no pasa por las Mejoras individuales.
    myTech = comboTechnique(optionId.slice(6))
  } else if (optionId.startsWith('pass:')) {
    // El PASE no es un duelo: llega siempre, y el que recibe juega el duelo
    // CON SUS OPCIONES (antes el receptor entraba al duelo sin poder elegir
    // técnica, y parecía que «te cortaban el pase»). Se marca la jugada como
    // «pase buscado» — un solo pase por posesión, o esto sería un peloteo
    // infinito — y se vuelve a preguntar con el nuevo dueño del balón.
    const mate = findActor(atkSide, optionId.slice(5))
    chain.carrier = mate.uid
    chain.passed = true
    const out: MatchEvent[] = [{
      kind: 'possession',
      minute: m.minute,
      side: chain.side,
      text: `${attacker.name} se la pasa a ${mate.name}.`,
      passFromUid: attacker.uid,
      passToUid: mate.uid,
    }]
    m.decision = null
    m.phase = 'playing'
    m.events.push(...out)
    resolveStep(m, rng, [])
    return out
  }

  const rivalKind = d.mode === 'ataque' ? DEFEND_KIND[chain.step] : ATTACK_KIND[chain.step]
  const rivalActor = d.mode === 'ataque' ? defender : attacker
  const rivalSide = d.mode === 'ataque' ? defSide : atkSide
  const rivalTech = pickAiTechnique(
    affordable(rivalActor, rivalKind, rivalSide.burstTurns > 0),
    rivalActor.pt,
    (d.mode === 'ataque' ? attacker : defender).element,
    chain.step,
  )

  m.decision = null
  m.phase = 'playing'
  const out: MatchEvent[] = []
  // En la tanda no hay jugada que seguir: es un tiro y a otra cosa.
  if (m.stage === 'penaltis' && m.shootout?.pending) {
    resolvePenalty(
      m, rng, out, attacker, defender,
      d.mode === 'ataque' ? myTech : rivalTech,
      d.mode === 'ataque' ? rivalTech : myTech,
    )
  } else {
    executeDuel(
      m, rng, out,
      attacker, defender,
      d.mode === 'ataque' ? myTech : rivalTech,
      d.mode === 'ataque' ? rivalTech : myTech,
    )
  }
  m.events.push(...out)
  return out
}

// ---------------------------------------------------------------------------
// Tanda de penaltis
// ---------------------------------------------------------------------------

/** Penaltis reglamentarios por equipo antes de la muerte súbita. */
export const PENALTY_ROUNDS = 3
/** Tope de seguridad: 3 de cada uno + 25 pares de muerte súbita. */
const PENALTY_HARD_CAP = 56

/** ¿Está decidida la tanda? */
function shootoutDecided(sh: ShootoutState): boolean {
  const [h, a] = sh.goals
  const shot = (side: 0 | 1) => Math.ceil((sh.round - side) / 2)
  if (sh.round >= PENALTY_HARD_CAP) return true
  if (sh.round < PENALTY_ROUNDS * 2) {
    // Ventaja insalvable: al que va por detrás no le quedan tiros suficientes.
    const leftHome = PENALTY_ROUNDS - shot(0)
    const leftAway = PENALTY_ROUNDS - shot(1)
    return h > a + leftAway || a > h + leftHome
  }
  // Muerte súbita: solo se decide con la pareja cerrada y con diferencia.
  return sh.round % 2 === 0 && h !== a
}

/** Quién tira el penalti: el que mejor dispare de los que están en el campo. */
function penaltyTaker(side: MatchSide, round: number): Actor {
  const pool = [...side.fwds, ...side.mids, ...side.defs]
    .sort((a, b) => b.stats.tiro - a.stats.tiro)
  if (!pool.length) return side.keeper
  // Se van rotando: en la muerte súbita tienen que tirar todos.
  return pool[Math.floor(round / 2) % pool.length]
}

/**
 * Prepara y resuelve un penalti. Si el que decide eres tú (tirando o parando)
 * deja el partido en `decision` con las mismas opciones de siempre, así que la
 * pantalla del partido no necesita nada nuevo.
 */
function nextPenalty(m: MatchState, _rng: RNG, out: MatchEvent[]): void {
  const sh = m.shootout!
  if (shootoutDecided(sh)) { finish(m, out); return }

  // Alterna: pares tira el local, impares el visitante.
  const side: Side = sh.round % 2 === 0 ? 'home' : 'away'
  const atk = sideOf(m, side)
  const def = sideOf(m, otherSide(side))
  const shooter = penaltyTaker(atk, sh.round)
  const keeper = def.keeper
  sh.pending = { shooterUid: shooter.uid, keeperUid: keeper.uid, side }

  // La cadena se rellena para que el panel del campo y las probabilidades
  // sigan funcionando: un penalti ES un duelo de definición.
  m.chain = { side, step: 'definicion', carrier: shooter.uid, defenderUid: keeper.uid, momentum: 0 }

  const iShoot = side === playerSide(m)
  const iDecide = true // en la tanda decides siempre: tu tiro o tu parada
  if (iDecide) {
    m.decision = buildDecision(
      m, 'definicion', iShoot ? 'ataque' : 'defensa',
      shooter, keeper, atk, def, 0,
    )
    m.decision.headline = iShoot
      ? `Penalti ${Math.floor(sh.round / 2) + 1} · tiras tú`
      : `Penalti ${Math.floor(sh.round / 2) + 1} · paras tú`
    m.phase = 'decision'
  }
}

/** Ejecuta el penalti con las técnicas elegidas y prepara el siguiente. */
function resolvePenalty(
  m: MatchState, rng: RNG, out: MatchEvent[],
  shooter: Actor, keeper: Actor, shotTech: Technique | undefined, saveTech: Technique | undefined,
): void {
  const sh = m.shootout!
  const side = sh.pending!.side
  spend(shooter, shotTech, false)
  spend(keeper, saveTech, false)

  const r = resolveDuel(
    'definicion',
    toDuelist(shooter, shotTech, false, undefined),
    toDuelist(keeper, saveTech, false, undefined),
    rng,
  )
  if (r.success) sh.goals[side === 'home' ? 0 : 1] += 1
  sh.round += 1
  sh.pending = null
  m.chain = null

  const move = shotTech ? `¡${shotTech.name.toUpperCase()}! ` : ''
  const stop = saveTech ? ` ¡${saveTech.name.toUpperCase()}!` : ''
  out.push({
    kind: 'penalty',
    minute: m.minute,
    side,
    shooter: shooter.name,
    shooterUid: shooter.uid,
    keeper: keeper.name,
    keeperUid: keeper.uid,
    technique: shotTech?.name,
    scored: r.success,
    shootout: [sh.goals[0], sh.goals[1]],
    text: r.success
      ? `${move}${shooter.name} la manda dentro.`
      : `${shooter.name} tira…${stop} ¡${keeper.name} la saca!`,
  })

  if (shootoutDecided(sh)) finish(m, out)
  else m.phase = 'playing'
}

/**
 * SUSTITUCIÓN en el descanso: saca a `outUid` de tu once y mete al actor
 * `incoming` en su MISMO hueco (hereda el papel). Devuelve el error o null.
 */
export function substitute(m: MatchState, outUid: string, incoming: Actor): string | null {
  if (m.subsLeft <= 0) return 'No te quedan cambios.'
  const side = sideOf(m, playerSide(m))
  const lines: Actor[][] = [[side.keeper], side.defs, side.mids, side.fwds]
  for (const line of lines) {
    const i = line.findIndex((a) => a.uid === outUid)
    if (i < 0) continue
    incoming.position = line[i].position
    if (line === lines[0]) side.keeper = incoming
    else line[i] = incoming
    m.subsLeft -= 1
    return null
  }
  return 'Ese jugador no está en el campo.'
}

/** Marcador desde el punto de vista del usuario, para cabeceras y resúmenes. */
export function playerScore(m: MatchState): [number, number] {
  const mine = playerSide(m)
  return [sideOf(m, mine).goals, sideOf(m, otherSide(mine)).goals]
}

/** Busca a cualquier jugador del partido por uid, sea del bando que sea. */
export function actorByUid(m: MatchState, uid: string): Actor | undefined {
  for (const side of [m.home, m.away]) {
    const hit = [side.keeper, ...side.defs, ...side.mids, ...side.fwds].find((a) => a.uid === uid)
    if (hit) return hit
  }
  return undefined
}
