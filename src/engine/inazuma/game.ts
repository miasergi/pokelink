// Pegamento entre la partida guardada y el motor de partido: crear una
// partida, montar los dos onces de un partido concreto y devolver el desgaste
// a tu plantilla cuando termina.
import { RNG } from '@/utils/rng'
import { formationFor, getPlayerBase, PLAYERS, startingSquad } from '@/data/inazuma/players'
import { type RegionId, getTeam } from '@/data/inazuma/teams'
import { getTechnique } from '@/data/inazuma/techniques'
import {
  autoLineup, buildLineup, buildRivalTeam, canUpgradeTechnique, createPlayer, effectiveStats,
  levelUp, MAX_RARITY, ptMax, RARITY_LABEL, rarityOf, reachableChain, rivalFromBase, rivalRarity,
  rivalRarityMap, slotRole, START_LEVEL, upgradeRarity, upgradeTechnique,
  overall,
} from './roster'
import { createMatch } from './match'
import { createPachanga, type PachangaState } from './pachanga'
import { bossIndexForLayer, generateMap, prizeMoney } from './tournament'
import { buildScoutOffer } from './rewards'
import { lootPool } from '@/data/inazuma/items'
import {
  ROSTER_MAX, SQUAD_SIZE, TECHNIQUE_SLOTS,
  type RandomFlags,
} from './types'
import type { EventEffect } from '@/data/inazuma/events'
import type {
  Actor, DecisionMode, Difficulty, InazumaSave, MatchEvent, MatchSide, MatchState, PlayerBase,
  PlayerInstance, PlayerStats, Position, Stats, Technique,
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
/** Niveles que pierde el banquillo respecto a quien juega. */
export const BENCH_LEVEL_PENALTY = 1
const REST_STAMINA = 18
const REST_PT_FRACTION = 0.35

/** Opciones al empezar torneo: saga, dificultad y plantilla del bombo. */
export interface NewRunOptions {
  difficulty?: Difficulty
  randomSquad?: boolean
  saga?: 'ff' | 'alius' | 'ffi' | 'vr'
  /** Nombre y escudo del equipo del bombo (a gusto del entrenador). */
  customName?: string
  customCrest?: string
  /** Épocas de las que puede salir gente (vacío = la de tu saga). */
  pools?: RegionId[]
  /** Randomizador: qué se desordena en esta partida. */
  random?: RandomFlags
}

/** Nivel EXTRA de todos los rivales según la dificultad elegida. */
export const DIFFICULTY_LEVEL_BONUS: Record<Difficulty, number> = {
  normal: 0,
  dificil: 6,
  leyenda: 12,
}

/**
 * Plantilla del BOMBO: 14 jugadores al azar de TODO el catálogo, con las
 * cuotas por demarcación de una convocatoria de verdad (2 porteros, 4-4-4).
 * El más raro capitanea. Es el modo «random» de un roguelike: cada partida,
 * un vestuario que no has entrenado nunca.
 */
function randomSquadIds(rng: RNG): string[] {
  const byPos = (pos: PlayerBase['position'], n: number) =>
    rng.shuffle(PLAYERS.filter((p) => p.position === pos).map((p) => p.id)).slice(0, n)
  const picks = [...byPos('POR', 2), ...byPos('DEF', 4), ...byPos('MED', 4), ...byPos('DEL', 4)]
  return picks.sort((a, b) => getPlayerBase(b).fame - getPlayerBase(a).fame)
}

export function createSave(seed: number, teamId = 'raimon', opts: NewRunOptions = {}): InazumaSave {
  const rng = new RNG(seed)
  const difficulty = opts.difficulty ?? 'normal'
  const formation = formationFor(teamId)
  const squadIds = opts.randomSquad ? randomSquadIds(rng) : startingSquad(teamId, formation)
  const roster = squadIds.map((id) => createPlayer(id, START_LEVEL))
  // EL BRAZALETE DE CAPITÁN: único en todo el torneo, se entrega al empezar.
  // +25 % a todo, y quien lo lleva ES el capitán (se puede reequipar: la
  // figura del capitán intocable se retiró). En el bombo se lo lleva el mejor.
  const capIdx = opts.randomSquad
    ? roster.reduce((bi, p, i, arr) => (overall(p) > overall(arr[bi]) ? i : bi), 0)
    : 0
  roster[capIdx] = { ...roster[capIdx], item: 'brazalete-capitan' }
  const map = generateMap(
    rng, teamId, DIFFICULTY_LEVEL_BONUS[difficulty], opts.saga,
    opts.random?.cuadro ? (opts.pools?.length ? opts.pools : undefined) ?? [] : undefined,
  )
  // El once de salida es el CANÓNICO (los 11 primeros de la convocatoria son
  // los titulares de la formación); si se dejara elegir a `autoLineup` entre
  // los 14, el ruido de stats podía mandar al banquillo a titulares de la
  // serie. En el bombo no hay canon: ahí sí elige entre todos.
  const lineup = autoLineup(opts.randomSquad ? roster : roster.slice(0, SQUAD_SIZE), formation)
  return {
    seed,
    teamId,
    difficulty,
    saga: opts.saga ?? 'ff',
    randomSquad: opts.randomSquad || undefined,
    // Las épocas del pool: si no se elige nada, la de la saga que juegas.
    pools: opts.pools?.length ? opts.pools : undefined,
    random: opts.random && Object.values(opts.random).some(Boolean) ? opts.random : undefined,
    customName: opts.randomSquad ? (opts.customName?.trim() || 'FC Bombo') : undefined,
    customCrest: opts.randomSquad ? opts.customCrest : undefined,
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
    // Se empieza con tres CURATIVOS (sin ellos, el primer bajón de PT/aguante
    // pillaba sin herramientas) y DOS MEDALLAS: con la pachanga pagando solo
    // una, el arranque necesitaba algo de material de rareza para moldear.
    bag: ['bebida-isotonica', 'masaje', 'ramen-rai-rai', 'medalla-rareza', 'medalla-rareza'],
    techniqueBag: [],
    formation,
    playerStats: {},
    startedAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Montaje del partido
// ---------------------------------------------------------------------------

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
    rarity: rarityOf(p),
    stats: effectiveStats(p),
    stamina: p.stamina,
    pt: p.pt,
    ptMax: ptMax(p),
    techniques: p.techniques,
    techLevels: p.techLevels,
  }
}

function actorFromRival(r: RivalPlayer, i: number): Actor {
  // El depósito rival usa LA MISMA fórmula que el tuyo (28 + aguante×0.7).
  // Antes era 45 + aguante×0.75 (~+20 PT de regalo) y en el playtest daba la
  // sensación de que el rival tenía PT infinitos: encadenaba supertécnicas
  // cuando a ti ya no te quedaba gasolina. Ahora se agotan al mismo ritmo.
  const max = Math.round(28 + r.stats.aguante * 0.7)
  return {
    uid: `rv${i}`,
    baseId: r.baseId,
    name: r.name,
    position: r.position,
    element: r.element,
    rarity: r.rarity,
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
  const bossIdx = bossIndexForLayer(node.layer)
  const rivals = buildRivalTeam(teamId, node.level ?? 10, rng, rivalRarity(bossIdx), {
    rarityMap: rivalRarityMap(teamId, bossIdx),
    elite: true,
    // Randomizador de PLANTILLAS: el instituto sale con once sorteado.
    shuffleFrom: save.random?.plantillas ? (save.pools ?? [save.saga ?? 'ff']) : undefined,
  })

  const mineTeam = getTeam(save.teamId ?? 'raimon')
  const home = sideFromActors(save.customName ?? mineTeam.name, mineTeam.color, mineTeam.element, true,
    lineup.all.map((p, i) => actorFromPlayer(p, slotRole(save.formation, i))))
  // Tus FILOSOFÍAS viajan contigo al campo. El rival no lleva: son la señal de
  // identidad de TU partida.
  home.tactics = save.tactics ?? []
  const away = sideFromActors(team.name, team.color, team.element, false, rivals.map(actorFromRival))

  // El RIVAL también viaja con BANQUILLO (los suplentes de su plantilla real,
  // 12º-14º): al descanso su banquillo hace hasta 3 cambios, como el tuyo.
  const xiIds = new Set(rivals.map((r) => r.baseId))
  away.bench = startingSquad(teamId)
    .slice(11)
    .map(getPlayerBase)
    .filter((b) => !xiIds.has(b.id))
    .map((b, i) => actorFromRival(rivalFromBase(b, node.level ?? 10, team.power, rivalRarityMap(teamId, bossIdx).get(b.id) ?? rivalRarity(bossIdx)), 100 + i))

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
  const rivals = buildRivalTeam(node.teamId ?? 'occult', node.level ?? 8, rng, rivalRarity(bossIndexForLayer(node.layer)))
  const mineTeam = getTeam(save.teamId ?? 'raimon')
  const mine = sideFromActors(save.customName ?? mineTeam.name, mineTeam.color, mineTeam.element, true,
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
/** Partidos: +4 a quien jugó (titular o cambio), +2 al banquillo. */
export const MATCH_LEVELS_PLAYED = 4
export const MATCH_LEVELS_BENCH = 2
/**
 * EL BANQUILLO NUNCA SE DESCUELGA: tras repartir niveles, cualquier jugador a
 * más de esta distancia de la MEDIA del once se pone a esa distancia («los
 * suplentes entrenan aparte»). Sin esto, a las pocas rondas el banquillo
 * quedaba tan atrás que rotar o vender no tenía sentido — el banquillo entero
 * estaba «en desuso».
 */
export const BENCH_CATCHUP_GAP = 3

/** Sube a `p` hasta quedar como mucho a `BENCH_CATCHUP_GAP` de la media `ref`. */
function catchUp(p: PlayerInstance, ref: number): PlayerInstance {
  const target = Math.floor(ref) - BENCH_CATCHUP_GAP
  return p.level < target ? levelUp(p, target - p.level) : p
}

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
  // PARTICIPÓ = pisó el campo (once inicial O entró de cambio): cobra los
  // niveles completos aunque lo sustituyeran al descanso — antes el cambiado
  // al medio tiempo perdía sus +4. Estados viejos sin la lista caen al once
  // final.
  const played = new Set(match.participants ?? [...byUid.keys()])
  recordMatchStats(save, match.events, played)

  // Media de los que jugaron TRAS su subida: referencia del catch-up.
  const xiLevels = save.roster.filter((p) => played.has(p.uid)).map((p) => p.level + MATCH_LEVELS_PLAYED)
  const xiAvg = xiLevels.length ? xiLevels.reduce((x, y) => x + y, 0) / xiLevels.length : 0

  save.roster = save.roster.map((p) => {
    const a = played.has(p.uid)
    // El banquillo también progresa, pero MENOS que quien juega: si no
    // subiera nada, rotar te diluiría la plantilla y el banquillo sería una
    // trampa; si subiera igual, jugar no tendría premio.
    let next: PlayerInstance = levelUp(
      // El partido oficial cierra ronda: el equipo REPONE PT y aguante al
      // pitido final (el desgaste que se arrastra es el de las pachangas y la
      // ruta). Antes se salía del partido fundido y sin gasolina.
      { ...p, stamina: 100, pt: ptMax(p) },
      a ? MATCH_LEVELS_PLAYED : MATCH_LEVELS_BENCH,
    )
    // Y NUNCA descolgado: el suplente rezagado entrena hasta quedar a tiro de
    // la media del once — el banquillo siempre es alineable.
    if (!a) next = catchUp(next, xiAvg)
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
  // Tras CADA partido, 3 medallas de talento (planas, a petición): el resto
  // del material de rareza llega con el FICHAJE del equipo vencido, las
  // pachangas y las ventas.
  const medals = matchMedals(bossIndexForLayer(save.layer))
  save.bag = [...save.bag, ...Array.from({ length: medals }, () => 'medalla-rareza')]
}

/** Medallas que paga un partido. Planas: 3 (el fichaje del vencido compensa). */
export function matchMedals(_bossIndex: number): number {
  return 3
}

/**
 * Cierra una pachanga: devuelve el desgaste SIEMPRE (por eso cansa) y reparte
 * niveles solo si ganaste (por eso compensa jugarla).
 */
export interface RarityUp {
  uid: string
  baseId: string
  name: string
  rarity: number
  statsBefore: Stats
  statsAfter: Stats
}

export function applyPachangaResult(save: InazumaSave, s: PachangaState, node: TournamentNode): { rarityUps: RarityUp[] } {
  const actors = [s.mine.keeper, ...s.mine.defs, ...s.mine.mids, ...s.mine.fwds]
  const byUid = new Map(actors.map((a) => [a.uid, a]))
  const won = s.result === 'win'
  // Once: +2 si gana, +1 si pierde. El banquillo NO sube (0), pero descansa:
  // recupera algo de PT y aguante mientras los otros corren.
  const levels = won ? 2 : 1

  // El desgaste es de TODO el once, no solo de los que tocaron balón: correr
  // detrás de la pelota cansa igual. Y PERDER pasa factura de verdad — la
  // pachanga es una apuesta: ganas niveles o vuelves con el equipo fundido.
  const baseFatigue = Math.round(s.rounds.length * 1.5)
  const lossFatigue = won ? 0 : 18

  // El barrio te curte: tras cada pachanga, UNA Medalla de talento a la
  // mochila — TÚ eliges a quién subir.
  save.bag = [...save.bag, 'medalla-rareza']

  // Media del once tras su subida, para el catch-up del banquillo.
  const xiLevels = save.roster.filter((p) => byUid.has(p.uid)).map((p) => p.level + levels)
  const xiAvg = xiLevels.length ? xiLevels.reduce((x, y) => x + y, 0) / xiLevels.length : 0

  save.roster = save.roster.map((p) => {
    const a = byUid.get(p.uid)
    let next: PlayerInstance = a
      ? { ...p, stamina: Math.max(0, a.stamina - baseFatigue - lossFatigue), pt: a.pt }
      : { ...p }
    // La pachanga la juega TU ONCE (el mismo que alineas en el vestuario): los
    // once se llevan los niveles enteros y el banquillo uno menos. Antes solo
    // contaban «los que tocaron balón» en la tanda (3-5 jugadores) y nadie
    // entendía por qué unos subían más que otros.
    if (a) next = levelUp(next, levels)
    else {
      next = {
        ...next,
        stamina: Math.min(100, next.stamina + 12),
        pt: Math.min(ptMax(next), next.pt + Math.round(ptMax(next) * 0.2)),
      }
      // El suplente descolgado entrena aparte: nunca a más de 3 de la media.
      next = catchUp(next, xiAvg)
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

  // La subida es ahora ELEGIDA (medalla): aquí ya no hay sorteo que animar.
  return { rarityUps: [] }
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
      // Las técnicas sueltas ya NO existen (solo se aprende por cadena): el
      // premio es un Manual avanzado, que avanza la cadena de quien elijas.
      save.bag.push('manual-avanzado')
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

/** Medallas que cuesta subir la SIGUIENTE rareza de este jugador. */
export function medalCost(p: PlayerInstance): number {
  return Math.max(1, rarityOf(p))
}

/**
 * Gasta un objeto de la mochila. Muta `save` (ya clonado por el llamante) y
 * devuelve qué contar. Vive en el motor porque el bot de balance también bebe
 * y come: si la tabla de efectos estuviera en el store, los tests medirían un
 * juego en el que los consumibles no existen.
 */
export function applyConsumable(
  save: InazumaSave, itemId: string, uid: string,
  /** Para la Mejora: QUÉ técnica mejorar (sin ella cae a la primera mejorable). */
  choiceId?: string,
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
      // La técnica la ELIGE el que juega (`choiceId`); el fallback a la
      // primera mejorable queda para el bot de balance. Antes siempre caía a
      // la primera técnica aprendida sin preguntar.
      const up = target && choiceId && canUpgradeTechnique(target, choiceId)
        ? choiceId
        : target?.techniques.find((t) => canUpgradeTechnique(target, t))
      if (!target || !up) return { ok: false, message: 'Ese jugador no tiene ninguna técnica que se pueda mejorar más.' }
      one((p) => upgradeTechnique(p, up))
      return spend(`${getTechnique(up)?.name} mejorada (+25 % de potencia)`)
    }
    case 'medalla-rareza': {
      const target = save.roster.find((p) => p.uid === uid)
      if (!target) return { ok: false, message: 'No está en la plantilla.' }
      if (rarityOf(target) >= MAX_RARITY) return { ok: false, message: 'Ya es Legendario: no hay rareza más alta.' }
      // COSTE ESCALADO: subir cuesta tantas medallas como la rareza actual
      // (1 → Avanzado, 2 → Ídolo, 3 → Legendario). Con coste plano, a cuartos
      // se llegaba con medio equipo multicolor y el torneo se desinflaba.
      const need = medalCost(target)
      const have = save.bag.filter((x) => x === 'medalla-rareza').length
      if (have < need) return { ok: false, message: `Subir a ${RARITY_LABEL[rarityOf(target) + 1]} pide ${need} medallas (llevas ${have}).` }
      let left = need
      save.bag = save.bag.filter((x) => (x === 'medalla-rareza' && left > 0 ? (left--, false) : true))
      one((p) => upgradeRarity(p))
      const now = rarityOf(save.roster.find((p) => p.uid === uid)!)
      return { ok: true, message: `¡Sube a ${RARITY_LABEL[now]}! (${need} medalla${need > 1 ? 's' : ''})` }
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
  if (!p) return null
  const a = actorFromPlayer(p, role)
  // El suplente ha DESCANSADO toda la primera parte: entra a tope de PT y
  // aguante. Es la gracia de guardarse a alguien en el banquillo.
  a.pt = a.ptMax
  a.stamina = 100
  return a
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
  // Capada por RAREZA: un bronce solo alcanza el primer paso; cada subida de
  // rareza desbloquea el siguiente.
  const chain = reachableChain(p)
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
