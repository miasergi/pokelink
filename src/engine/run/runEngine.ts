import type { PokemonInstance } from '@/types'
import { encounterPool, getSpecies } from '@/data'
import { RNG } from '@/utils/rng'
import { createInstance, selectMoveset } from '@/engine/team/instance'
import { computeStats, expForLevel } from '@/engine/team/leveling'
import { pendingLevelEvolution, evolve } from '@/engine/team/evolution'
import { runBattle } from '@/engine/battle/battleEngine'
import type { BattleResult } from '@/engine/battle/types'
import { generateMap } from './mapGen'
import { EVENTS } from './nodes'
import { tierPool } from './nodes'
import { healParty, MAX_PARTY } from './party'
import { fullHeal } from '@/engine/team/instance'
import { getGeneration } from '@/data/generations'
import type { GameMode, MapNode, RunState } from './types'

export interface NewRunConfig {
  mode: GameMode
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
    inventory: { potion: 3, 'super-potion': 1, 'poke-ball': 5, revive: 1 },
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
  const isBoss = node.type === 'gym' || node.type === 'elite' || node.type === 'champion'
  // Suelo de nivel: el equipo nunca va muy por debajo del área (sin grindeo).
  // Ante jefes el equipo iguala su nivel (la ventaja del jugador es el nº de
  // Pokémon y la composición de tipos); en rutas va ligeramente por debajo.
  const floor = Math.max(5, node.enemyLevel - (isBoss ? 0 : 2))
  for (const mon of run.party) enforceMinLevel(mon, floor)
  // Ante un jefe llegas preparado: equipo curado al completo (PS, estado y PP).
  if (isBoss) for (const mon of run.party) fullHeal(mon)

  const seed = withRng(run, (rng) => rng.int(1, 2 ** 30))
  return runBattle({ playerTeam: run.party, enemyTeam, seed, isBoss, enemyName })
}

export interface BattleOutcomeSummary {
  won: boolean
  moneyGained: number
  itemGained?: string
  evolutions: { uid: string; fromId: number; toId: number }[]
  runEnded: boolean
  runWon: boolean
}

const BOSS_DROPS = ['hyper-potion', 'max-revive', 'leftovers', 'rare-candy', 'ultra-ball', 'life-orb']

export function applyBattleOutcome(
  run: RunState, node: MapNode, result: BattleResult,
): BattleOutcomeSummary {
  // Sincroniza el equipo del jugador con el estado post-combate
  run.party = result.playerTeam

  const summary: BattleOutcomeSummary = {
    won: result.winner === 'player',
    moneyGained: 0,
    evolutions: [],
    runEnded: false,
    runWon: false,
  }

  const isBoss = node.type === 'gym' || node.type === 'elite' || node.type === 'champion'

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

export function resolveEvent(run: RunState, node: MapNode, optionIndex: number): string {
  if (node.content.kind !== 'event') return ''
  const def = EVENTS[node.content.eventId]
  node.cleared = true
  return withRng(run, (rng) => {
    switch (def.id) {
      case 'hiker_heal':
        if (optionIndex === 0) {
          healParty(run.party)
          return '¡Tu equipo recuperó toda la salud!'
        }
        run.money += 500
        return 'Recibiste 500 ₽.'
      case 'mystery_egg':
        if (optionIndex === 0) {
          const mon = randomPartyLevelMon(run, rng)
          if (run.party.length < MAX_PARTY) run.party.push(mon)
          else run.box.push(mon)
          return `¡El huevo eclosionó en ${getSpecies(mon.speciesId).displayName}!`
        }
        return 'Dejaste el huevo donde estaba.'
      case 'wishing_well':
        if (optionIndex === 0) {
          if (run.money < 300) return 'No tienes suficiente dinero.'
          run.money -= 300
          if (rng.chance(0.5)) {
            run.money += 600
            return '¡La fortuna te sonríe! Recibes 600 ₽.'
          }
          return 'La moneda se hunde sin más...'
        }
        for (const p of run.party) p.status = 'none'
        return 'El agua curó los estados de tu equipo.'
      case 'rare_candy_cache':
        if (optionIndex === 0) {
          addItem(run, 'rare-candy', 2)
          return 'Conseguiste 2 Caramelos Raros.'
        }
        run.money += 1200
        return 'Conseguiste 1200 ₽.'
      case 'risky_cave':
        if (optionIndex === 0) {
          for (const p of run.party) {
            p.currentHp = Math.max(1, p.currentHp - Math.floor(p.stats.hp * 0.25))
          }
          const drop = rng.pick(BOSS_DROPS)
          addItem(run, drop, 1)
          return `¡Saliste magullado pero con un objeto raro!`
        }
        return 'Decidiste no arriesgarte.'
      default:
        return ''
    }
  })
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
    node.type === 'gym' || node.type === 'elite' || node.type === 'champion'
  )
}
