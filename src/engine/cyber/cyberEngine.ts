// Motor de aventura de la Cyber PokéBall: crear partida, mapa de ubicaciones
// ciclables (estilo juguete) y encuentros aleatorios al viajar.
import type { PokemonInstance } from '@/types'
import { toBaseSpeciesId } from '@/data'
import { createInstance } from '@/engine/team/instance'
import { healParty, applyHealItem } from '@/engine/run/party'
import { RNG } from '@/utils/rng'
import {
  buildGymBattle, buildRivalBattle, buildEliteBattle, buildChampionBattle,
  buildMinorTrainer, buildRocketBattle, cyberWildPool, wildLevel,
  RIVAL_BADGES,
} from './trainers'
import type { CyberLocation, CyberSave, CyberTrainerInfo } from './types'

export const CYBER_START_ITEMS: Record<string, number> = { ball: 5, potion: 2 }
export const CYBER_START_MONEY = 500

export function createAdventure(gen: number, starterId: number, seed: number): CyberSave {
  const rng = new RNG(seed)
  const starter = createInstance(starterId, 3, rng) // nivel 3, fiel al juguete
  const baseId = toBaseSpeciesId(starterId)
  return {
    v: 1,
    gen,
    seed,
    rngState: rng.getState(),
    startedAt: Date.now(),
    party: [starter],
    box: [],
    items: { ...CYBER_START_ITEMS },
    money: CYBER_START_MONEY,
    dexSeen: [baseId],
    dexCaught: [baseId],
    progress: { badges: 0, rivalBeaten: 0, eliteBeaten: 0, championBeaten: false },
    locationIndex: 0,
    phase: 'map',
  }
}

/** Rehidrata el RNG del save (todas las acciones consumen de aquí). */
export function saveRng(save: CyberSave): RNG {
  const rng = new RNG(save.seed)
  rng.setState(save.rngState)
  return rng
}

export function commitRng(save: CyberSave, rng: RNG): void {
  save.rngState = rng.getState()
}

/** ¿Toca aparición del rival? (con 2/5/8 medallas, una vez cada una). */
export function rivalPending(save: CyberSave): number | null {
  const stage = save.progress.rivalBeaten
  if (stage >= RIVAL_BADGES.length) return null
  return save.progress.badges >= RIVAL_BADGES[stage] ? stage : null
}

/** Ubicaciones visibles del mapa según el progreso (se ciclan con ◄ ►). */
export function getLocations(save: CyberSave): CyberLocation[] {
  const { badges, rivalBeaten, championBeaten } = save.progress
  const out: CyberLocation[] = [{ kind: 'center', label: 'CENTRO POKÉMON', index: 0 }]
  const routes = Math.min(8, badges + 1)
  for (let i = 0; i < routes; i++) out.push({ kind: 'route', label: `RUTA ${i + 1}`, index: i })
  if (badges < 8) out.push({ kind: 'gym', label: `GIMNASIO ${badges + 1}`, index: badges })
  if (rivalPending(save) != null) out.push({ kind: 'rival', label: '¡RIVAL!', index: save.progress.rivalBeaten })
  if (badges >= 8 && rivalBeaten >= 3 && !championBeaten) out.push({ kind: 'league', label: 'LIGA POKÉMON', index: save.progress.eliteBeaten })
  return out
}

export type RouteEncounter =
  | { type: 'wild'; species: number; level: number }
  | { type: 'trainer'; trainer: CyberTrainerInfo }
  | { type: 'none' }

/** Al viajar a una ruta: Pokémon salvaje (→ radar), entrenador, Team Rocket o
 *  nada. La ruta elegida sesga el nivel (rutas altas = más nivel). */
export function rollEncounter(save: CyberSave, routeIndex: number, rng: RNG): RouteEncounter {
  const badges = Math.min(save.progress.badges, routeIndex + 1)
  const roll = rng.next()
  if (roll < 0.55) {
    const pool = cyberWildPool(save.gen, badges)
    const species = rng.pick(pool)
    return { type: 'wild', species: species.id, level: wildLevel(badges, rng) }
  }
  if (roll < 0.75) return { type: 'trainer', trainer: buildMinorTrainer(save.gen, badges, rng) }
  if (roll < 0.85 && save.progress.badges >= 2) return { type: 'trainer', trainer: buildRocketBattle(save.gen, badges, rng) }
  return { type: 'none' }
}

/** Instancia el salvaje encontrado por el radar. */
export function makeWildInstance(speciesId: number, level: number, rng: RNG): PokemonInstance {
  return createInstance(speciesId, level, rng, { shinyChance: 0.01 })
}

/** Combate de la ubicación seleccionada (gimnasio/rival/liga). */
export function buildLocationBattle(save: CyberSave, loc: CyberLocation, rng: RNG): CyberTrainerInfo | null {
  const starterId = save.party[0]?.speciesId ?? 1
  switch (loc.kind) {
    case 'gym': return buildGymBattle(save.gen, loc.index, rng)
    case 'rival': return buildRivalBattle(save.gen, loc.index, save.dexCaught[0] ?? starterId, rng)
    case 'league':
      return save.progress.eliteBeaten < 4
        ? buildEliteBattle(save.gen, save.progress.eliteBeaten, rng)
        : buildChampionBattle(save.gen, save.dexCaught[0] ?? starterId, rng)
    default: return null
  }
}

/** Registra la victoria de un combate de progreso. Devuelve true si ganó la aventura. */
export function applyTrainerVictory(save: CyberSave, trainer: CyberTrainerInfo): boolean {
  save.money += trainer.money
  switch (trainer.kind) {
    case 'gym':
      save.progress.badges = Math.max(save.progress.badges, (trainer.progressIndex ?? 0) + 1)
      break
    case 'rival':
      save.progress.rivalBeaten = Math.max(save.progress.rivalBeaten, (trainer.progressIndex ?? 0) + 1)
      break
    case 'elite':
      save.progress.eliteBeaten = Math.max(save.progress.eliteBeaten, (trainer.progressIndex ?? 0) + 1)
      break
    case 'champion':
      save.progress.championBeaten = true
      return true
  }
  return false
}

/** Derrota total: vuelves al Centro con el equipo curado y la mitad del dinero. */
export function applyDefeat(save: CyberSave): void {
  healParty(save.party)
  save.money = Math.floor(save.money / 2)
  save.phase = 'center'
}

/** Alta en la dex del modo. */
export function dexSee(save: CyberSave, speciesId: number): void {
  const id = toBaseSpeciesId(speciesId)
  if (!save.dexSeen.includes(id)) save.dexSeen.push(id)
}

export function dexCatch(save: CyberSave, speciesId: number): void {
  dexSee(save, speciesId)
  const id = toBaseSpeciesId(speciesId)
  if (!save.dexCaught.includes(id)) save.dexCaught.push(id)
}

// ---- Tienda del Centro Pokémon (consumibles del modo) ----
export interface CyberShopItem { id: string; label: string; price: number }
export const CYBER_SHOP: CyberShopItem[] = [
  { id: 'ball', label: 'POKÉ BALL', price: 200 },
  { id: 'potion', label: 'POCIÓN', price: 300 },
  { id: 'super-potion', label: 'SUPERPOCIÓN', price: 700 },
  { id: 'revive', label: 'REVIVIR', price: 1500 },
]

export function buyShopItem(save: CyberSave, id: string): boolean {
  const item = CYBER_SHOP.find((i) => i.id === id)
  if (!item || save.money < item.price) return false
  save.money -= item.price
  save.items[id] = (save.items[id] ?? 0) + 1
  return true
}

/** Usa un consumible sobre un Pokémon del equipo. Devuelve mensaje o null si
 *  no aplica. La semántica de cada objeto es la MISMA que en el juego
 *  principal (applyHealItem); aquí solo se descuenta el inventario del modo. */
export function useCyberItem(save: CyberSave, itemId: string, mon: PokemonInstance): string | null {
  const count = save.items[itemId] ?? 0
  if (count <= 0) return null
  if (!applyHealItem(mon, itemId)) return null
  save.items[itemId] = count - 1
  return itemId === 'revive' ? '¡Se recuperó!' : '¡PS restaurados!'
}
