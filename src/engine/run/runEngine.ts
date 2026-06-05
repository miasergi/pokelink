import type { PokemonInstance } from '@/types'
import { encounterPool, getSpecies, basePool } from '@/data'
import { RNG } from '@/utils/rng'
import { createInstance, selectMoveset } from '@/engine/team/instance'
import { computeStats, expForLevel, gainLevel } from '@/engine/team/leveling'
import { pendingLevelEvolution, evolve } from '@/engine/team/evolution'
import { runBattle } from '@/engine/battle/battleEngine'
import type { BattleResult } from '@/engine/battle/types'
import { generateMap } from './mapGen'
import { EVENTS, type EventEffect } from './nodes'
import { getItem } from '@/data/items'
import { tierPool } from './nodes'
import { healParty, MAX_PARTY } from './party'
import { fullHeal } from '@/engine/team/instance'
import { getGeneration } from '@/data/generations'
import type { Difficulty, GameMode, MapNode, RunState } from './types'

export interface NewRunConfig {
  mode: GameMode
  difficulty: Difficulty
  gen: number
  starterId: number
  seed: number
}

export function createRun(config: NewRunConfig): RunState {
  const rng = new RNG(config.seed)
  const { map, rivalStarterId } = generateMap(config.mode, config.gen, config.starterId, rng)
  const starter = createInstance(config.starterId, 5, rng)
  const region = getGeneration(config.gen).region

  return {
    mode: config.mode,
    difficulty: config.difficulty,
    gen: config.gen,
    region,
    starterId: config.starterId,
    rivalStarterId,
    seed: config.seed,
    rngState: rng.getState(),
    map,
    currentNodeId: null,
    currentLayer: -1,
    party: [starter],
    box: [],
    inventory: { potion: 3, revive: 1 },
    money: 1000,
    status: 'active',
    stats: { battlesWon: 0, pokemonCaught: 0, gymsDefeated: 0, eliteDefeated: 0, turnsPlayed: 0 },
    startedAt: config.seed, // timestamp se fija fuera del engine
  }
}

/** Ejecuta una función con el RNG de la run y persiste su estado. */
function withRng<T>(run: RunState, fn: (rng: RNG) => T): T {
  const rng = new RNG(run.rngState)
  const out = fn(rng)
  run.rngState = rng.getState()
  return out
}

/** Nodos alcanzables ahora. */
export function availableNextNodes(run: RunState): MapNode[] {
  if (run.currentNodeId === null) {
    return run.map.layers[0].map((id) => run.map.nodes[id])
  }
  const cur = run.map.nodes[run.currentNodeId]
  return cur.next.map((id) => run.map.nodes[id])
}

export function enterNode(run: RunState, nodeId: string): MapNode {
  const node = run.map.nodes[nodeId]
  run.currentNodeId = nodeId
  run.currentLayer = node.layer
  run.stats.turnsPlayed++
  return node
}

// ---------------------------------------------------------------------------
// Combate
export function startNodeBattle(run: RunState, node: MapNode): BattleResult {
  const content = node.content
  let enemyTeam: PokemonInstance[]
  let enemyName: string | undefined
  if (content.kind === 'wild') {
    enemyTeam = [content.enemy]
    enemyName = getSpecies(content.enemy.speciesId).displayName
  } else if (content.kind === 'trainer') {
    enemyTeam = content.team
    enemyName = content.trainer.name
  } else {
    throw new Error('Nodo sin combate')
  }
  const isBoss = node.type === 'gym' || node.type === 'elite' || node.type === 'champion' || node.type === 'legendary'
  const hard = run.difficulty === 'hard'

  // Difícil: enemigos más fuertes.
  if (hard) for (const m of enemyTeam) enforceMinLevel(m, Math.round(m.level * 1.12))

  // Suelo de nivel: el equipo nunca va muy por debajo del área (sin grindeo).
  // Como cada Pokémon solo lleva 1-2 ataques (de su tipo), ante un GIMNASIO el
  // jugador va un par de niveles por encima para compensar la falta de cobertura.
  // El Alto Mando/Campeón curan al entrar, así que ahí va igualado.
  let bossFloor = node.enemyLevel
  if (node.type === 'gym') bossFloor = hard ? node.enemyLevel : node.enemyLevel + 3
  else if (hard) bossFloor = node.enemyLevel - 2
  const floor = Math.max(5, isBoss ? bossFloor : node.enemyLevel - 1)
  for (const mon of run.party) enforceMinLevel(mon, floor)
  // El Alto Mando y el Campeón curan al entrar (es un gauntlet). Ante los
  // gimnasios decides tú si pasar por el Centro Pokémon de la ruta previa.
  const autoHeal = (node.type === 'elite' || node.type === 'champion') && !hard
  if (autoHeal) for (const mon of run.party) fullHeal(mon)

  const seed = withRng(run, (rng) => rng.int(1, 2 ** 30))
  return runBattle({ playerTeam: run.party, enemyTeam, seed, isBoss, enemyName })
}

export interface BattleOutcomeSummary {
  won: boolean
  moneyGained: number
  itemGained?: string
  evolutions: { uid: string; fromId: number; toId: number }[]
  /** Nuzlocke: nombres de los Pokémon perdidos para siempre en este combate. */
  lost: string[]
  /** Nombre del legendario capturado al vencer su guardián. */
  caughtLegendary?: string
  /** Nombre del jefe derrotado (para celebrar / meme). */
  bossDefeated?: string
  runEnded: boolean
  runWon: boolean
}

const BOSS_DROPS = ['max-potion', 'max-revive', 'leftovers', 'rare-candy', 'attack-boost', 'life-orb', 'evo-stone', 'mega-stone', 'revive-charm']

export function applyBattleOutcome(
  run: RunState, node: MapNode, result: BattleResult,
): BattleOutcomeSummary {
  // Quién participó = vivo ANTES del combate (para repartir niveles).
  const participated = new Set(run.party.filter((p) => p.currentHp > 0).map((p) => p.uid))
  // Sincroniza el equipo del jugador con el estado post-combate
  run.party = result.playerTeam

  const summary: BattleOutcomeSummary = {
    won: result.winner === 'player',
    moneyGained: 0,
    evolutions: [],
    lost: [],
    runEnded: false,
    runWon: false,
  }

  const isBoss = node.type === 'gym' || node.type === 'elite' || node.type === 'champion'
  const isBossLike = isBoss || node.type === 'rival' || node.type === 'legendary'

  // Nuzlocke: los Pokémon debilitados se pierden para siempre.
  if (run.difficulty === 'nuzlocke') {
    const dead = run.party.filter((p) => p.currentHp <= 0)
    summary.lost = dead.map((p) => getSpecies(p.speciesId).displayName)
    run.party = run.party.filter((p) => p.currentHp > 0)
  }

  // Sin Pokémon = fin de la run.
  if (run.party.length === 0) {
    run.status = 'lost'
    summary.won = false
    summary.runEnded = true
    return summary
  }

  if (result.winner !== 'player') {
    if (isBoss) {
      // Perder ante un jefe = fin de la run
      run.status = 'lost'
      summary.runEnded = true
    } else {
      // Combate normal perdido: tu equipo queda debilitado, pero la run continúa.
      node.cleared = true
    }
    return summary
  }

  node.cleared = true
  run.stats.battlesWon++

  const content = node.content
  // Recompensa de dinero
  if (content.kind === 'trainer') {
    summary.moneyGained = content.trainer.reward.money
  } else if (content.kind === 'wild') {
    summary.moneyGained = 20 + node.enemyLevel * 6
  }
  run.money += summary.moneyGained

  // Jefes: contador + drop + posible victoria final
  if (node.type === 'gym') run.stats.gymsDefeated++
  if (node.type === 'elite') run.stats.eliteDefeated++
  if (node.type === 'gym' || node.type === 'elite' || node.type === 'champion') {
    summary.itemGained = withRng(run, (rng) => rng.pick(BOSS_DROPS))
    addItem(run, summary.itemGained, 1)
  }
  if (node.type === 'champion') {
    run.status = 'won'
    summary.runWon = true
    summary.runEnded = true
  }

  // Al ganar a un jefe, el equipo se cura por completo.
  if (isBossLike) {
    healParty(run.party)
    summary.bossDefeated = content.kind === 'trainer' ? content.trainer.name : 'el guardián'
  }

  // Recompensa de nivel por casilla: hierba alta +1, entrenador +2.
  // Solo a los que participaron (entrar debilitado no da nivel; debilitarse
  // durante el combate sí lo da).
  const levelGain = node.type === 'battle' ? 1 : node.type === 'trainer' ? 2 : 0
  for (let i = 0; i < levelGain; i++) for (const mon of run.party) if (participated.has(mon.uid)) gainLevel(mon)

  // Guardián legendario: ¡lo capturas al vencerlo!
  if (node.type === 'legendary' && content.kind === 'wild') {
    const mon = content.enemy
    run.stats.pokemonCaught++
    run.money += 2000
    if (run.party.length < MAX_PARTY) run.party.push(mon)
    else run.box.push(mon)
    summary.caughtLegendary = getSpecies(mon.speciesId).displayName
  }

  // Evoluciones por nivel
  for (const mon of run.party) {
    const evoSpecies = pendingLevelEvolution(mon)
    if (evoSpecies) {
      const fromId = mon.speciesId
      evolve(mon, evoSpecies)
      summary.evolutions.push({ uid: mon.uid, fromId, toId: evoSpecies.id })
    }
  }

  return summary
}

// ---------------------------------------------------------------------------
// Nodos no-combate
export function resolveHeal(run: RunState, node: MapNode): void {
  healParty(run.party)
  node.cleared = true
}

export function catchPokemon(
  run: RunState, node: MapNode, accept: boolean, replaceUid?: string,
): { caught: boolean; toBox: boolean } {
  node.cleared = true
  if (!accept || node.content.kind !== 'catch') return { caught: false, toBox: false }
  const mon = node.content.offer
  run.stats.pokemonCaught++
  if (replaceUid) {
    const idx = run.party.findIndex((p) => p.uid === replaceUid)
    if (idx >= 0) {
      run.box.push(run.party[idx])
      run.party[idx] = mon
      return { caught: true, toBox: false }
    }
  }
  if (run.party.length < MAX_PARTY) {
    run.party.push(mon)
    return { caught: true, toBox: false }
  }
  run.box.push(mon)
  return { caught: true, toBox: true }
}

export function pickItem(run: RunState, node: MapNode, itemId: string): void {
  if (node.content.kind !== 'item') return
  if (node.content.choices.includes(itemId)) addItem(run, itemId, 1)
  node.cleared = true
}

export function buyItem(run: RunState, itemId: string, price: number): boolean {
  if (run.money < price) return false
  run.money -= price
  addItem(run, itemId, 1)
  return true
}

export function leaveShop(_run: RunState, node: MapNode): void {
  node.cleared = true
}

/** Intercambio: cambias un Pokémon por otro aleatorio de primera etapa (+3 niveles). */
export function resolveTrade(
  run: RunState, node: MapNode, monUid: string,
): { fromName: string; toName: string } | null {
  if (node.content.kind !== 'trade') return null
  const idx = run.party.findIndex((p) => p.uid === monUid)
  if (idx < 0 || run.money < node.content.cost) return null
  const traded = run.party[idx]
  const pool = basePool(run.mode === 'all' ? 'all' : run.gen)
  const newMon = withRng(run, (rng) => createInstance(rng.pick(pool).id, traded.level + 3, rng))
  run.party[idx] = newMon
  run.money -= node.content.cost
  run.stats.pokemonCaught++
  node.cleared = true
  return { fromName: getSpecies(traded.speciesId).displayName, toName: getSpecies(newMon.speciesId).displayName }
}

export function skipNode(node: MapNode): void {
  node.cleared = true
}

export function resolveEvent(run: RunState, node: MapNode, optionIndex: number): string {
  if (node.content.kind !== 'event') return ''
  const def = EVENTS[node.content.eventId]
  node.cleared = true
  const opt = def.options[optionIndex] ?? def.options[0]
  return withRng(run, (rng) => applyEventEffect(run, opt.effect, rng))
}

function applyEventEffect(run: RunState, eff: EventEffect, rng: RNG): string {
  switch (eff.kind) {
    case 'money':
      run.money = Math.max(0, run.money + eff.amount)
      return eff.amount >= 0 ? `Recibes ${eff.amount} ₽.` : `Pierdes ${-eff.amount} ₽.`
    case 'heal':
      healParty(run.party)
      return '¡Tu equipo recuperó toda la salud!'
    case 'damage':
      for (const p of run.party) if (p.currentHp > 0) p.currentHp = Math.max(1, p.currentHp - Math.floor(p.stats.hp * eff.frac))
      return 'Tu equipo recibió daño...'
    case 'item':
      addItem(run, eff.itemId, eff.qty)
      return `Conseguiste ${eff.qty}× ${getItem(eff.itemId).name}.`
    case 'randomItem': {
      const d = rng.pick(BOSS_DROPS)
      addItem(run, d, 1)
      return `¡Conseguiste ${getItem(d).name}!`
    }
    case 'addMon': {
      const mon = randomPartyLevelMon(run, rng)
      if (run.party.length < MAX_PARTY) run.party.push(mon)
      else run.box.push(mon)
      run.stats.pokemonCaught++
      return `¡Se unió ${getSpecies(mon.speciesId).displayName} a tu equipo!`
    }
    case 'levelUp':
      for (let i = 0; i < eff.amount; i++) for (const p of run.party) if (p.currentHp > 0) gainLevel(p)
      return `¡Tu equipo subió ${eff.amount} nivel(es)!`
    case 'loseMoneyFrac': {
      const lost = Math.floor(run.money * eff.frac)
      run.money -= lost
      return `Pierdes ${lost} ₽.`
    }
    case 'gamble':
      if (run.money < eff.cost) return 'No tienes suficiente dinero.'
      run.money -= eff.cost
      if (rng.chance(eff.chance)) { run.money += eff.win; return `¡Suerte! Ganas ${eff.win} ₽.` }
      return 'No hubo suerte esta vez...'
    case 'risky':
      return applyEventEffect(run, rng.chance(eff.chance) ? eff.good : eff.bad, rng)
    case 'none':
      return 'No pasó nada.'
  }
}

// ---------------------------------------------------------------------------
// Inventario / objetos
export function addItem(run: RunState, itemId: string, qty: number): void {
  run.inventory[itemId] = (run.inventory[itemId] || 0) + qty
}

export function removeItem(run: RunState, itemId: string, qty = 1): boolean {
  const have = run.inventory[itemId] || 0
  if (have < qty) return false
  run.inventory[itemId] = have - qty
  if (run.inventory[itemId] <= 0) delete run.inventory[itemId]
  return true
}

function randomPartyLevelMon(run: RunState, rng: RNG): PokemonInstance {
  const avg = Math.round(
    run.party.reduce((a, p) => a + p.level, 0) / Math.max(1, run.party.length),
  )
  const pool = encounterPool(run.mode === 'all' ? 'all' : run.gen)
  const tier = tierPool(pool, avg)
  const sp = rng.pick(tier)
  return createInstance(sp.id, Math.max(2, avg), rng)
}

/** Sube un Pokémon a un nivel mínimo (mantiene fracción de PS y aprende movimientos del nivel). */
function enforceMinLevel(mon: PokemonInstance, minLevel: number): void {
  if (mon.level >= minLevel) return
  const frac = mon.stats.hp > 0 ? mon.currentHp / mon.stats.hp : 1
  mon.level = minLevel
  mon.exp = expForLevel(minLevel)
  const sp = getSpecies(mon.speciesId)
  mon.stats = computeStats(sp.baseStats, mon.ivs, minLevel)
  mon.currentHp = Math.max(1, Math.round(mon.stats.hp * frac))
  // Refresca el moveset al nivel actual para no pelear con ataques flojos.
  const fresh = selectMoveset(sp, minLevel)
  if (fresh.length) mon.moves = fresh
}

export function isNodeBattle(node: MapNode): boolean {
  return (
    node.type === 'battle' || node.type === 'trainer' || node.type === 'rival' ||
    node.type === 'gym' || node.type === 'elite' || node.type === 'champion' ||
    node.type === 'legendary'
  )
}
