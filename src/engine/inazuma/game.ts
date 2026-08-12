// Pegamento entre la partida guardada y el motor de partido: crear una
// partida, montar los dos onces de un partido concreto y devolver el desgaste
// a tu plantilla cuando termina.
import { RNG } from '@/utils/rng'
import { formationFor, getPlayerBase, startingSquad } from '@/data/inazuma/players'
import { getTeam } from '@/data/inazuma/teams'
import { getTechnique } from '@/data/inazuma/techniques'
import {
  autoLineup, buildLineup, buildRivalTeam, canUpgradeTechnique, createPlayer, effectiveStats,
  levelUp, ptMax, slotRole, START_LEVEL, upgradeTechnique,
} from './roster'
import { createMatch } from './match'
import { createPachanga, type PachangaState } from './pachanga'
import { bossIndexForLayer, generateMap, prizeMoney } from './tournament'
import { buildScoutOffer, learnableByRoster } from './rewards'
import { lootPool } from '@/data/inazuma/items'
import {
  ROSTER_MAX, TECHNIQUE_SLOTS,
} from './types'
import type { EventEffect } from '@/data/inazuma/events'
import type {
  Actor, DecisionMode, InazumaSave, MatchEvent, MatchSide, MatchState, PlayerInstance, PlayerStats,
  Position, Technique,
  RivalPlayer, TournamentNode,
} from './types'

/**
 * Desgaste y recuperación entre partidos.
 *
 * El coste POR DUELO (en `match.ts`) resultó ser inerte: en 12 posesiones a un
 * jugador concreto le tocan 2 o 3 duelos, así que perdía 10 de aguante y lo
 * recuperaba entero antes del siguiente partido — la rotación y el nodo de
 * descanso no servían para nada. El desgaste de verdad es JUGAR LOS 90
 * MINUTOS: se lo lleva todo el que sale de titular, juegue o no el balón.
 * Con estos números un titular pierde ~22 netos por partido, entra en
 * penalización a la tercera eliminatoria y el banquillo pasa a tener sentido.
 */
const NINETY_MINUTES_COST = 26
/** Niveles que pierde el banquillo respecto a quien juega. */
export const BENCH_LEVEL_PENALTY = 1
const REST_STAMINA = 18
const REST_PT_FRACTION = 0.35

export function createSave(seed: number, teamId = 'raimon'): InazumaSave {
  const rng = new RNG(seed)
  const formation = formationFor(teamId)
  const roster = startingSquad(teamId, formation).map((id, i) =>
    createPlayer(id, START_LEVEL, { captain: i === 0 }))
  const map = generateMap(rng, teamId)
  const lineup = autoLineup(roster, formation)
  return {
    seed,
    teamId,
    rngState: rng.getState(),
    map,
    layer: 0,
    currentNodeId: null,
    cleared: [],
    roster,
    lineup,
    coins: 1200,
    record: [0, 0, 0],
    goalsFor: 0,
    goalsAgainst: 0,
    bag: [],
    techniqueBag: [],
    formation,
    playerStats: {},
    startedAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Montaje del partido
// ---------------------------------------------------------------------------

/**
 * Nivel al que un jugador DESPIERTA su Espíritu Guerrero. Antes estaba
 * disponible desde el minuto uno y rompía el arranque: un duelo con ×2 de
 * potencia en la primera ronda decide el partido él solo.
 */
export const SPIRIT_AWAKEN_LEVEL = 30

function actorFromPlayer(p: PlayerInstance, role?: Position): Actor {
  const base = getPlayerBase(p.baseId)
  return {
    uid: p.uid,
    baseId: base.id,
    name: base.name,
    // El papel EN ESTE PARTIDO es el hueco que ocupa en el once, no su
    // demarcación natural: si pones a Axel de defensa, defiende (mal, y sin
    // poder tirar sus supertécnicas de tiro — son de otra clase de duelo).
    position: role ?? base.position,
    element: base.element,
    stats: effectiveStats(p),
    stamina: p.stamina,
    pt: p.pt,
    ptMax: ptMax(p),
    techniques: p.techniques,
    techLevels: p.techLevels,
    // El Espíritu se despierta con la experiencia, no viene de serie.
    spirit: p.level >= SPIRIT_AWAKEN_LEVEL ? base.spirit : undefined,
  }
}

function actorFromRival(r: RivalPlayer, i: number): Actor {
  // El depósito rival sale de su aguante igual que el tuyo, así que a los
  // rivales también se les acaban las supertécnicas a mitad de partido.
  const max = Math.round(45 + r.stats.aguante * 0.75)
  return {
    uid: `rv${i}`,
    baseId: r.baseId,
    name: r.name,
    position: r.position,
    element: r.element,
    stats: r.stats,
    stamina: 100,
    pt: max,
    ptMax: max,
    techniques: r.techniques,
  }
}

function sideFromActors(name: string, color: string, element: MatchSide['element'], isPlayer: boolean, actors: Actor[]): MatchSide {
  return {
    name,
    color,
    element,
    isPlayer,
    keeper: actors.find((a) => a.position === 'POR') ?? actors[0],
    defs: actors.filter((a) => a.position === 'DEF'),
    mids: actors.filter((a) => a.position === 'MED'),
    fwds: actors.filter((a) => a.position === 'DEL'),
    goals: 0,
    burst: 0,
    burstTurns: 0,
  }
}

export interface MatchSetup {
  match: MatchState
  rng: RNG
  node: TournamentNode
}

/**
 * Monta el partido del nodo elegido. Devuelve también la RNG viva: el partido
 * NO se persiste (abandonar a mitad no guarda nada, igual que en el modo Cyber)
 * así que la semilla solo sirve para que la retransmisión sea reproducible
 * mientras dura.
 */
/** RNG del enfrentamiento: fija por (semilla, casilla) para que sea reproducible. */
function nodeRng(save: InazumaSave, node: TournamentNode): RNG {
  let h = save.seed >>> 0
  for (const ch of node.id) h = (Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0)
  return new RNG(h)
}

export function startMatch(
  save: InazumaSave,
  node: TournamentNode,
  decisionMode: DecisionMode = 'dinamico',
): MatchSetup | { error: string } {
  const lineup = buildLineup(save.roster, save.lineup, save.formation)
  if (!lineup) return { error: 'Tu once no es válido. Revisa la plantilla.' }

  const rng = nodeRng(save, node)
  const teamId = node.teamId ?? 'occult'
  const team = getTeam(teamId)
  const rivals = buildRivalTeam(teamId, node.level ?? 10, rng)

  const mineTeam = getTeam(save.teamId ?? 'raimon')
  const home = sideFromActors(mineTeam.name, mineTeam.color, mineTeam.element, true,
    lineup.all.map((p, i) => actorFromPlayer(p, slotRole(save.formation, i))))
  const away = sideFromActors(team.name, team.color, team.element, false, rivals.map(actorFromRival))

  return { match: createMatch({ seed: rng.getState(), home, away, decisionMode }, rng), rng, node }
}

export interface PachangaSetup {
  pachanga: PachangaState
  rng: RNG
  node: TournamentNode
}

/**
 * Monta una pachanga. El rival es un equipo de barrio genérico (sin escudo ni
 * plantilla con nombre): lo que importa es su nivel, igual que un Pokémon
 * salvaje.
 */
export function startPachanga(save: InazumaSave, node: TournamentNode): PachangaSetup | { error: string } {
  const lineup = buildLineup(save.roster, save.lineup, save.formation)
  if (!lineup) return { error: 'Tu once no es válido. Revisa la plantilla.' }

  const rng = nodeRng(save, node)
  const rivals = buildRivalTeam(node.teamId ?? 'occult', node.level ?? 8, rng)
  const mineTeam = getTeam(save.teamId ?? 'raimon')
  const mine = sideFromActors(mineTeam.name, mineTeam.color, mineTeam.element, true,
    lineup.all.map((p, i) => actorFromPlayer(p, slotRole(save.formation, i))))
  const theirs = sideFromActors(node.title, '#64748b', 'montana', false, rivals.map(actorFromRival))

  return {
    pachanga: createPachanga({ seed: rng.getState(), mine, theirs, rivalName: node.title }),
    rng,
    node,
  }
}

// ---------------------------------------------------------------------------
// Cierre del partido
// ---------------------------------------------------------------------------

/**
 * Niveles que reparte cada resultado a TODA la plantilla.
 *
 * Los rivales suben de 3 en 3 (`RIVAL_LEVELS`) y ganar da 4, así que cada
 * eliminatoria ganada te deja un nivel más de ventaja que la anterior.
 *
 * Empatar da 3 (no 2): con 2, un único empate te descolgaba de la curva para
 * siempre sin haber sido eliminado, y eso no es dificultad, es que la partida
 * ya está muerta y todavía no te has enterado. Perder solo puntúa en los
 * amistosos: en una eliminatoria oficial te vas a casa.
 */
export const LEVELS_BY_RESULT: Record<'win' | 'draw' | 'loss', number> = { win: 6, draw: 4, loss: 3 }

/** Suma al acumulado de la partida lo que ha hecho cada jugador tuyo. */
export function recordMatchStats(save: InazumaSave, events: MatchEvent[], mineUids: Set<string>): void {
  const stats = { ...save.playerStats }
  const bump = (uid: string, key: keyof PlayerStats, n = 1) => {
    if (!mineUids.has(uid)) return
    const cur = stats[uid] ?? { goals: 0, saves: 0, duelsWon: 0, duelsLost: 0, matches: 0 }
    stats[uid] = { ...cur, [key]: cur[key] + n }
  }
  for (const uid of mineUids) bump(uid, 'matches')
  for (const e of events) {
    if (e.kind === 'goal') bump(e.scorerUid, 'goals')
    else if (e.kind === 'save') bump(e.keeperUid, 'saves')
    else if (e.kind === 'duel') {
      bump(e.attackerUid, e.success ? 'duelsWon' : 'duelsLost')
      bump(e.defenderUid, e.success ? 'duelsLost' : 'duelsWon')
    }
  }
  save.playerStats = stats
}

/**
 * Devuelve a la plantilla el desgaste del partido, reparte niveles y actualiza
 * el historial. Muta `save` (el store lo llama dentro de su `set`).
 */
export function applyMatchResult(save: InazumaSave, match: MatchState, _node: TournamentNode): void {
  const mine = match.home.isPlayer ? match.home : match.away
  const theirs = match.home.isPlayer ? match.away : match.home
  const actors = [mine.keeper, ...mine.defs, ...mine.mids, ...mine.fwds]
  const byUid = new Map(actors.map((a) => [a.uid, a]))

  const result = match.result ?? 'draw'
  const gained = LEVELS_BY_RESULT[result]
  recordMatchStats(save, match.events, new Set(byUid.keys()))

  save.roster = save.roster.map((p) => {
    const a = byUid.get(p.uid)
    // El banquillo también progresa, pero UN NIVEL MENOS que quien juega: si no
    // subiera nada, rotar te diluiría la plantilla y el banquillo sería una
    // trampa; si subiera igual, jugar no tendría premio. Un nivel de diferencia
    // hace que rotar cueste algo real sin castigar por hacerlo.
    let next: PlayerInstance = levelUp(
      a ? { ...p, stamina: Math.max(0, a.stamina - NINETY_MINUTES_COST), pt: a.pt } : { ...p },
      a ? gained : Math.max(0, gained - BENCH_LEVEL_PENALTY),
    )
    // Descanso entre eliminatorias: algo, pero nunca del todo.
    next = {
      ...next,
      stamina: Math.min(100, next.stamina + REST_STAMINA),
      pt: Math.min(ptMax(next), next.pt + Math.round(ptMax(next) * REST_PT_FRACTION)),
    }
    return next
  })

  save.goalsFor += mine.goals
  save.goalsAgainst += theirs.goals
  if (result === 'win') save.record[0] += 1
  else if (result === 'draw') save.record[1] += 1
  else save.record[2] += 1

  save.lastMatch = {
    rival: theirs.name,
    score: [mine.goals, theirs.goals],
    result,
    scorers: match.scorers,
  }

  save.coins += result === 'win' ? prizeMoney(bossIndexForLayer(save.layer)) : 200
}

/**
 * Cierra una pachanga: devuelve el desgaste SIEMPRE (por eso cansa) y reparte
 * niveles solo si ganaste (por eso compensa jugarla).
 */
export function applyPachangaResult(save: InazumaSave, s: PachangaState, node: TournamentNode): void {
  const actors = [s.mine.keeper, ...s.mine.defs, ...s.mine.mids, ...s.mine.fwds]
  const byUid = new Map(actors.map((a) => [a.uid, a]))
  const won = s.result === 'win'
  const levels = won ? (node.risky ? 4 : 3) : 0

  save.roster = save.roster.map((p) => {
    const a = byUid.get(p.uid)
    let next: PlayerInstance = a ? { ...p, stamina: a.stamina, pt: a.pt } : { ...p }
    // La pachanga la juega TU ONCE (el mismo que alineas en el vestuario): los
    // once se llevan los niveles enteros y el banquillo uno menos. Antes solo
    // contaban «los que tocaron balón» en la tanda (3-5 jugadores) y nadie
    // entendía por qué unos subían más que otros.
    if (levels) {
      next = levelUp(next, a ? levels : Math.max(0, levels - BENCH_LEVEL_PENALTY))
    }
    return next
  })

  // La pachanga también cuenta para el pichichi: son goles igual.
  const stats = { ...save.playerStats }
  for (const r of s.rounds) {
    const who = actors.find((a) => a.name === (r.mine ? r.shooter : r.keeper))
    if (!who) continue
    const cur = stats[who.uid] ?? { goals: 0, saves: 0, duelsWon: 0, duelsLost: 0, matches: 0 }
    stats[who.uid] = r.mine
      ? { ...cur, goals: cur.goals + (r.scored ? 1 : 0), duelsWon: cur.duelsWon + (r.scored ? 1 : 0), duelsLost: cur.duelsLost + (r.scored ? 0 : 1) }
      : { ...cur, saves: cur.saves + (r.scored ? 0 : 1), duelsWon: cur.duelsWon + (r.scored ? 0 : 1), duelsLost: cur.duelsLost + (r.scored ? 1 : 0) }
  }
  save.playerStats = stats

  save.goalsFor += s.goals[0]
  save.goalsAgainst += s.goals[1]
  if (won) save.coins += node.risky ? 300 : 120
}

/** ¿Se acabó la partida? Solo perder contra un instituto te elimina. */
export function isEliminated(node: TournamentNode, result: 'win' | 'draw' | 'loss'): boolean {
  if (node.kind !== 'jefe' && node.kind !== 'final') return false
  // El empate se resolvería en penaltis: cuenta como pase. Perder, elimina.
  return result === 'loss'
}

/**
 * Marca la casilla como jugada y avanza. Guarda DÓNDE estás (`currentNodeId`),
 * que es lo que decide a qué casillas puedes ir después: el mapa es un grafo,
 * no una lista de capas sueltas.
 */
export function advanceLayer(save: InazumaSave, node: TournamentNode): void {
  save.cleared = [...save.cleared, node.id]
  save.currentNodeId = node.id
  const marked = save.map.nodes[node.id]
  if (marked) marked.cleared = true
  save.layer = Math.min(save.map.totalLayers, node.layer + 1)
}

/** ¿Se completó el mapa entero? */
export function isMapComplete(save: InazumaSave): boolean {
  return save.layer >= save.map.totalLayers
}

// ---------------------------------------------------------------------------
// Nodos que no son partido
// ---------------------------------------------------------------------------

/** Recupera a toda la plantilla: aguante a tope y depósito de PT lleno. */
export function fullRest(save: InazumaSave): void {
  save.roster = save.roster.map((p) => ({ ...p, stamina: 100, pt: ptMax(p) }))
}

/** Entrenamiento intensivo: +3 niveles a los dos jugadores más flojos del once. */
export function autoTraining(save: InazumaSave, levels = 3, count = 2): string[] {
  const inLineup = save.roster.filter((p) => save.lineup.includes(p.uid))
  const targets = [...inLineup].sort((a, b) => a.level - b.level).slice(0, count)
  const ids = new Set(targets.map((t) => t.uid))
  save.roster = save.roster.map((p) => (ids.has(p.uid) ? levelUp(p, levels) : p))
  return targets.map((t) => getPlayerBase(t.baseId).name)
}

/** ¿Puede este jugador aprender una técnica más? (hay 4 huecos) */
export function canLearn(p: PlayerInstance, techId: string): boolean {
  return learnBlocker(p, techId) === null
}

/**
 * Por qué NO puede aprenderla, o `null` si sí puede. Devuelve el motivo para
 * que la mochila lo enseñe en vez de dejar la opción muerta sin explicación.
 *
 * Dos condiciones: la técnica tiene que ser de su DEMARCACIÓN (un portero no
 * aprende tiros) y de su ELEMENTO (un jugador de Fuego no lanza una técnica de
 * Aire) — esto último a petición expresa tras probar el juego.
 */
export function learnBlocker(p: PlayerInstance, techId: string): string | null {
  const t = getTechnique(techId)
  if (!t) return 'Técnica desconocida'
  if (p.techniques.includes(techId)) return 'Ya la conoce'
  const base = getPlayerBase(p.baseId)
  const kind = base.position === 'POR' ? 'parada'
    : base.position === 'DEF' ? 'bloqueo'
      : base.position === 'MED' ? 'regate' : 'tiro'
  if (t.kind !== kind) return `Es de ${t.kind}, y él es ${base.position}`
  if (t.element !== base.element) return `Es de ${t.element}, y él es de ${base.element}`
  return null
}

/**
 * Aplica el resultado de una SITUACIÓN (casilla de evento). Vive aquí, en el
 * motor, y no en el store, porque los tests de balance también recorren esas
 * casillas: si el efecto viviera en la UI, el bot pasaría por ellas sin recibir
 * nada y el modo mediría más difícil de lo que es.
 *
 * Muta `save` (que el llamante ya ha clonado) y devuelve el fichaje, si lo
 * hubo, para que el store lo apunte en el álbum.
 */
export function applyEventEffect(save: InazumaSave, effect: EventEffect, r: RNG): { signed?: string } {
  switch (effect.kind) {
    case 'coins':
      save.coins += effect.amount
      break
    case 'item': {
      const id = effect.itemId ?? r.pick(lootPool(bossIndexForLayer(save.layer))).id
      save.bag.push(id)
      break
    }
    case 'technique': {
      // Del conjunto que alguien de la plantilla pueda aprender: si no, el
      // premio se queda en la mochila para siempre.
      const usable = learnableByRoster(save)
      const pool = effect.element ? usable.filter((t) => t.element === effect.element) : usable
      save.techniqueBag.push(r.pick(pool.length ? pool : usable).id)
      break
    }
    case 'levels':
      save.roster = save.roster.map((p) => levelUp(p, effect.amount))
      break
    case 'stamina':
      save.roster = save.roster.map((p) => ({
        ...p,
        stamina: Math.max(0, Math.min(100, p.stamina + effect.amount)),
      }))
      break
    case 'rest':
      fullRest(save)
      break
    case 'sign': {
      if (save.roster.length >= ROSTER_MAX) { save.coins += 800; break }
      const offer = buildScoutOffer(save, r).find((o) => o.kind === 'fichaje')
      if (offer?.kind === 'fichaje') {
        save.roster = [...save.roster, createPlayer(offer.playerId, offer.level)]
        return { signed: offer.playerId }
      }
      break
    }
    default:
      break
  }
  return {}
}

/**
 * Gasta un objeto de la mochila. Muta `save` (ya clonado por el llamante) y
 * devuelve qué contar. Vive en el motor porque el bot de balance también bebe
 * y come: si la tabla de efectos estuviera en el store, los tests medirían un
 * juego en el que los consumibles no existen.
 */
export function applyConsumable(
  save: InazumaSave, itemId: string, uid: string,
): { ok: boolean; message: string } {
  const i = save.bag.indexOf(itemId)
  if (i < 0) return { ok: false, message: 'No llevas eso encima.' }

  const one = (fn: (p: PlayerInstance) => PlayerInstance) => {
    save.roster = save.roster.map((p) => (p.uid === uid ? fn(p) : p))
  }
  const all = (fn: (p: PlayerInstance) => PlayerInstance) => { save.roster = save.roster.map(fn) }
  const spend = (message: string) => {
    save.bag = save.bag.filter((_, k) => k !== i)
    return { ok: true, message }
  }

  switch (itemId) {
    case 'bebida-isotonica':
      one((p) => ({ ...p, pt: Math.min(ptMax(p), p.pt + 40) }))
      return spend('+40 PT')
    case 'bebida-doble':
      one((p) => ({ ...p, pt: ptMax(p) }))
      return spend('Depósito de PT lleno')
    case 'masaje':
      one((p) => ({ ...p, stamina: Math.min(100, p.stamina + 50) }))
      return spend('+50 de aguante')
    case 'ramen-rai-rai':
      one((p) => ({ ...p, stamina: Math.min(100, p.stamina + 60) }))
      return spend('+60 de aguante')
    case 'ramen-especial':
      one((p) => ({ ...p, stamina: 100, pt: ptMax(p) }))
      return spend('Como nuevo')
    case 'gyoza':
      all((p) => ({ ...p, stamina: Math.min(100, p.stamina + 30) }))
      return spend('Gyozas para todos: +30 de aguante')
    case 'banquete':
      all((p) => ({ ...p, stamina: 100, pt: ptMax(p) }))
      return spend('¡Banquete! Toda la plantilla a tope')
    case 'concentrado':
      all((p) => ({ ...p, pt: ptMax(p), stamina: Math.min(100, p.stamina + 60) }))
      return spend('Toda la plantilla recuperada')
    case 'plan-entrenamiento':
      one((p) => levelUp(p, 2))
      return spend('+2 niveles')
    case 'plan-intensivo':
      one((p) => levelUp(p, 4))
      return spend('+4 niveles')
    case 'mejora': {
      const target = save.roster.find((p) => p.uid === uid)
      const up = target?.techniques.find((t) => canUpgradeTechnique(target, t))
      if (!target || !up) return { ok: false, message: 'Ese jugador no tiene ninguna técnica que se pueda mejorar más.' }
      one((p) => upgradeTechnique(p, up))
      return spend(`${getTechnique(up)?.name} mejorada (+25 % de potencia)`)
    }
    case 'manual-avanzado': {
      // Avanza la CADENA característica del jugador (una firma de bolsillo).
      const learnt = learnSignature(save, uid)
      if (!learnt) return { ok: false, message: 'Ese jugador ya despertó toda su cadena.' }
      return spend(`¡Despierta ${learnt.name}!`)
    }
    default:
      return { ok: false, message: 'Eso no se usa así.' }
  }
}

/** Actor listo para entrar de SUPLENTE en el hueco indicado. */
export function subActor(save: InazumaSave, uid: string, role: Position): Actor | null {
  const p = save.roster.find((x) => x.uid === uid)
  return p ? actorFromPlayer(p, role) : null
}

/**
 * Consumible aplicado a un ACTOR del partido (en el descanso). Solo curas de
 * PT/aguante: los planes de entrenamiento y los manuales no caben en 15
 * minutos de vestuario.
 */
export function applyConsumableToActor(a: Actor, itemId: string): { ok: boolean; message: string } {
  switch (itemId) {
    case 'bebida-isotonica':
      a.pt = Math.min(a.ptMax, a.pt + 40)
      return { ok: true, message: '+40 PT' }
    case 'bebida-doble':
      a.pt = a.ptMax
      return { ok: true, message: 'Depósito de PT lleno' }
    case 'masaje':
      a.stamina = Math.min(100, a.stamina + 50)
      return { ok: true, message: '+50 de aguante' }
    case 'ramen-rai-rai':
      a.stamina = Math.min(100, a.stamina + 60)
      return { ok: true, message: '+60 de aguante' }
    case 'ramen-especial':
      a.stamina = 100
      a.pt = a.ptMax
      return { ok: true, message: 'Como nuevo' }
    default:
      return { ok: false, message: 'Eso no se puede usar en el descanso.' }
  }
}

// ---------------------------------------------------------------------------
// Técnicas características (casillas de firma)
// ---------------------------------------------------------------------------

/**
 * La siguiente técnica de la CADENA de un jugador que aún no conoce, o null si
 * ya la despertó entera. Es lo que ofrece la casilla de firma: Mark Evans
 * despierta la Mano Celestial, después la Infinita, después la Demoníaca.
 */
export function signatureNext(p: PlayerInstance): Technique | null {
  const chain = getPlayerBase(p.baseId).signature ?? []
  const next = chain.find((id) => !p.techniques.includes(id))
  return next ? getTechnique(next) ?? null : null
}

/** Despierta la siguiente técnica de la cadena. Devuelve qué aprendió o null. */
export function learnSignature(save: InazumaSave, uid: string): Technique | null {
  const p = save.roster.find((x) => x.uid === uid)
  if (!p) return null
  const t = signatureNext(p)
  if (!t) return null
  save.roster = save.roster.map((x) => {
    if (x.uid !== uid) return x
    const techs = x.techniques.slice()
    if (techs.length >= TECHNIQUE_SLOTS) techs.shift()
    return { ...x, techniques: [...techs, t.id] }
  })
  return t
}
