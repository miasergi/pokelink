// Pegamento entre la partida guardada y el motor de partido: crear una
// partida, montar los dos onces de un partido concreto y devolver el desgaste
// a tu plantilla cuando termina.
import { RNG } from '@/utils/rng'
import { getPlayerBase, RAIMON_STARTING_XI } from '@/data/inazuma/players'
import { getTeam } from '@/data/inazuma/teams'
import { getTechnique } from '@/data/inazuma/techniques'
import {
  autoLineup, buildLineup, buildRivalTeam, createPlayer, effectiveStats,
  levelUp, ptMax, START_LEVEL,
} from './roster'
import { createMatch } from './match'
import { createPachanga, participants, type PachangaState } from './pachanga'
import { bossIndexForLayer, generateMap, prizeMoney } from './tournament'
import type {
  Actor, InazumaSave, MatchSide, MatchState, PlayerInstance, RivalPlayer, TournamentNode,
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
const NINETY_MINUTES_COST = 34
const REST_STAMINA = 12
const REST_PT_FRACTION = 0.35

export function createSave(seed: number): InazumaSave {
  const rng = new RNG(seed)
  const roster = RAIMON_STARTING_XI.map((id, i) =>
    createPlayer(id, START_LEVEL, { captain: i === 0 }))
  const map = generateMap(rng)
  return {
    seed,
    rngState: rng.getState(),
    map,
    layer: 0,
    currentNodeId: null,
    cleared: [],
    roster,
    lineup: autoLineup(roster),
    coins: 1200,
    record: [0, 0, 0],
    goalsFor: 0,
    goalsAgainst: 0,
    bag: [],
    techniqueBag: [],
    startedAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Montaje del partido
// ---------------------------------------------------------------------------

function actorFromPlayer(p: PlayerInstance): Actor {
  const base = getPlayerBase(p.baseId)
  return {
    uid: p.uid,
    name: base.name,
    position: base.position,
    element: base.element,
    stats: effectiveStats(p),
    stamina: p.stamina,
    pt: p.pt,
    ptMax: ptMax(p),
    techniques: p.techniques,
    techLevels: p.techLevels,
  }
}

function actorFromRival(r: RivalPlayer, i: number): Actor {
  // El depósito rival sale de su aguante igual que el tuyo, así que a los
  // rivales también se les acaban las supertécnicas a mitad de partido.
  const max = Math.round(45 + r.stats.aguante * 0.75)
  return {
    uid: `rv${i}`,
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

export function startMatch(save: InazumaSave, node: TournamentNode): MatchSetup | { error: string } {
  const lineup = buildLineup(save.roster, save.lineup)
  if (!lineup) return { error: 'Tu once no es válido. Revisa la plantilla.' }

  const rng = nodeRng(save, node)
  const teamId = node.teamId ?? 'occult'
  const team = getTeam(teamId)
  const rivals = buildRivalTeam(teamId, node.level ?? 10, rng)

  const home = sideFromActors('Raimon', '#e11d48', 'montana', true, lineup.all.map(actorFromPlayer))
  const away = sideFromActors(team.name, team.color, team.element, false, rivals.map(actorFromRival))

  return { match: createMatch({ seed: rng.getState(), home, away }, rng), rng, node }
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
  const lineup = buildLineup(save.roster, save.lineup)
  if (!lineup) return { error: 'Tu once no es válido. Revisa la plantilla.' }

  const rng = nodeRng(save, node)
  const rivals = buildRivalTeam(node.teamId ?? 'occult', node.level ?? 8, rng)
  const mine = sideFromActors('Raimon', '#e11d48', 'montana', true, lineup.all.map(actorFromPlayer))
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
export const LEVELS_BY_RESULT: Record<'win' | 'draw' | 'loss', number> = { win: 4, draw: 3, loss: 2 }

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

  save.roster = save.roster.map((p) => {
    const a = byUid.get(p.uid)
    // Sube de nivel TODA la plantilla, jueguen o no: el equipo entrena junto.
    // Cuando solo subían los titulares, la fatiga te obligaba a rotar y rotar
    // te diluía la plantilla — dos sistemas peleándose, y el banquillo era una
    // trampa. Lo que distingue a un suplente es que llega FRESCO, no que sea
    // más malo por no jugar.
    let next: PlayerInstance = levelUp(
      a ? { ...p, stamina: Math.max(0, a.stamina - NINETY_MINUTES_COST), pt: a.pt } : { ...p },
      gained,
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
  const played = new Set(participants(s))
  const won = s.result === 'win'
  const levels = won ? (node.risky ? 3 : 2) : 0

  save.roster = save.roster.map((p) => {
    const a = byUid.get(p.uid)
    let next: PlayerInstance = a ? { ...p, stamina: a.stamina, pt: a.pt } : { ...p }
    // El nivel se lo llevan SOLO los que han jugado la pachanga: es el incentivo
    // para rotar al banquillo en las casillas de ruta y llegar al jefe con el
    // once titular fresco.
    if (levels && played.has(p.uid)) next = levelUp(next, levels)
    return next
  })

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
  const t = getTechnique(techId)
  if (!t) return false
  if (p.techniques.includes(techId)) return false
  const pos = getPlayerBase(p.baseId).position
  const kind = pos === 'POR' ? 'parada' : pos === 'DEF' ? 'bloqueo' : pos === 'MED' ? 'regate' : 'tiro'
  return t.kind === kind
}
