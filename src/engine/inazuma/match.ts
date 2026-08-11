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
import type {
  Actor, ChainStep, Decision, DecisionOption, Element, MatchEvent, MatchSide, MatchState, Side, Technique,
} from './types'

/** Posesiones por partido. Con la conversión actual salen resultados 0-4. */
export const PLAYS_PER_MATCH = 12
/** Puntos de Ruptura por hito. A 100 se puede activar la Supervibración. */
const BURST_ON_DUEL = 13
const BURST_ON_GOAL = 26
const BURST_ON_SAVE = 20
const BURST_ON_CONCEDE = 18
/** Acciones que dura la Supervibración una vez activada. */
export const BURST_DURATION = 3
/** Aguante que cuesta disputar un duelo (solo se persiste el de tu plantilla). */
const STAMINA_PER_DUEL = 4

export interface MatchConfig {
  seed: number
  home: MatchSide
  away: MatchSide
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

function toDuelist(a: Actor, tech: Technique | undefined, burst: boolean, spirit?: { uid: string; power: number }): Duelist {
  return {
    name: a.name,
    element: a.element,
    stats: a.stats,
    stamina: a.stamina,
    technique: tech,
    burst,
    boost: spirit && spirit.uid === a.uid ? spirit.power : 1,
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

  if (!m.chain) {
    // ¿Se acabó?
    if (m.play >= m.schedule.length) {
      finish(m, out)
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
      a.pt = Math.min(a.ptMax, a.pt + Math.round(a.ptMax * 0.34))
      a.stamina = Math.min(100, a.stamina + 8)
    }
  }
}

function finish(m: MatchState, out: MatchEvent[]): void {
  m.phase = 'finished'
  m.minute = 90
  const mine = playerSide(m)
  const my = sideOf(m, mine).goals
  const theirs = sideOf(m, otherSide(mine)).goals
  m.result = my > theirs ? 'win' : my === theirs ? 'draw' : 'loss'
  out.push({ kind: 'fulltime', minute: 90, score: score(m), result: m.result })
}

/** Elige de quién es la posesión (pesado por el centro del campo) y la abre. */
function startPossession(m: MatchState, rng: RNG, out: MatchEvent[]): void {
  const midStrength = (s: MatchSide) =>
    s.mids.reduce((acc, a) => acc + (a.stats.control + a.stats.velocidad) * fatigueMultiplier(a.stamina), 0) || 1
  const h = midStrength(m.home)
  const a = midStrength(m.away)
  const pHome = Math.max(0.28, Math.min(0.72, h / (h + a)))
  const side: Side = rng.next() < pHome ? 'home' : 'away'
  const s = sideOf(m, side)

  const carrier = rng.pick(s.mids.length ? s.mids : allActors(s))
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

/** Escoge al defensor que corresponde al eslabón actual. */
function defenderFor(step: ChainStep, def: MatchSide, rng: RNG): Actor {
  if (step === 'definicion') return def.keeper
  const pool = step === 'construccion'
    ? (def.mids.length ? def.mids : def.defs)
    : (def.defs.length ? def.defs : def.mids)
  return pool.length ? rng.pick(pool) : def.keeper
}

/** Escoge al que recibe el balón para atacar el área. */
function attackerFor(step: ChainStep, atk: MatchSide, rng: RNG): Actor {
  if (step === 'construccion') return rng.pick(atk.mids.length ? atk.mids : allActors(atk))
  const pool = atk.fwds.length ? atk.fwds : atk.mids
  return pool.length ? rng.pick(pool) : atk.keeper
}

function resolveStep(m: MatchState, rng: RNG, out: MatchEvent[]): void {
  const chain = m.chain!
  const atkSide = sideOf(m, chain.side)
  const defSide = sideOf(m, otherSide(chain.side))
  const attacker = findActor(atkSide, chain.carrier)
  const defender = findActor(defSide, chain.defenderUid)

  // ¿Es una jugada en la que decides tú?
  //  - Atacas y llegas a penetración o definición.
  //  - Defiendes y te tiran a puerta (elige tu portero la parada).
  const mine = playerSide(m)
  const iAttack = chain.side === mine
  const isDecision = iAttack
    ? chain.step !== 'construccion'
    : chain.step === 'definicion'

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
    toDuelist(attacker, atkTech, atkBurst, chain.spirit),
    toDuelist(defender, defTech, defBurst, chain.spirit),
    rng,
    chain.momentum,
  )

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
    chain.step = step === 'construccion' ? 'penetracion' : 'definicion'
    chain.carrier = attackerFor(chain.step, atkSide, rng).uid
    chain.defenderUid = defenderFor(chain.step, defSide, rng).uid
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
  return success
    ? `${move} ${atk.name} bate a ${def.name}.${tail}`
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
  // En defensa el que decide es TU portero, que aquí es el `defender`.
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

  // 2) Cada supertécnica conocida de la clase que toca.
  for (const t of actor.techniques.map((id) => actorTechnique(actor, id)).filter((t): t is Technique => !!t && t.kind === kind)) {
    const cost = free ? 0 : t.cost
    const opt = buildOption(m, step, mode, attacker, defender, momentum, { id: `tech:${t.id}`, label: t.name, tech: t, cost })
    if (!free && t.cost > actor.pt) opt.disabled = `Necesitas ${t.cost} PT`
    options.push(opt)
  }

  // 3) Atacando: pasar a un compañero con otro elemento para esquivar un mal
  //    emparejamiento. Es la jugada de manual del modo: el elemento del que
  //    recibe cuenta contra el defensor, no el del que llevaba el balón.
  if (mode === 'ataque') {
    for (const mate of passCandidates(atkSide, attacker, rival.element)) {
      options.push(buildOption(
        m, step, mode, mate, defender, momentum,
        { id: `pass:${mate.uid}`, label: `Pasar a ${mate.name}`, tech: undefined, cost: 0, mateElement: mate.element },
      ))
    }
  }

  // 4) Supervibración, si la barra está llena.
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

  // 5) Espíritu Guerrero: compite con la Supervibración por la MISMA barra.
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

  return {
    minute: m.minute,
    step,
    mode,
    actorUid: actor.uid,
    actorName: actor.name,
    rivalUid: rival.uid,
    rivalName: rival.name,
    rivalElement: rival.element,
    headline: mode === 'defensa' ? '¡Disparo a puerta!' : STEP_HEADLINE[step],
    options,
  }
}

function plainLabel(step: ChainStep, mode: 'ataque' | 'defensa'): string {
  if (mode === 'defensa') return 'Achicar y blocar'
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
    toDuelist(attacker, atkTech, atkSide.burstTurns > 0, spirit),
    toDuelist(defender, defTech, defSide.burstTurns > 0, spirit),
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
    const actor = d.mode === 'ataque' ? findActor(atkSide, chain.carrier) : defSide.keeper
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
  } else if (optionId.startsWith('pass:')) {
    const mate = findActor(atkSide, optionId.slice(5))
    attacker = mate
    chain.carrier = mate.uid
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
  executeDuel(
    m, rng, out,
    attacker, defender,
    d.mode === 'ataque' ? myTech : rivalTech,
    d.mode === 'ataque' ? rivalTech : myTech,
  )
  m.events.push(...out)
  return out
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
