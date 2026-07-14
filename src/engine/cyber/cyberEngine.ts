// Motor de aventura de la Cyber PokéBall: crear partida, mapa de áreas y
// encuentros. Fiel al juguete: pueblo con Centro Pokémon, áreas que se van
// abriendo con las medallas, y ZONAS SECRETAS con legendarios tras las 8
// medallas (en el original: Groudon/Kyogre y, solo si ya cazaste uno de ellos,
// Latios/Latias).
import type { PokemonInstance } from '@/types'
import { legendaryPool, toBaseSpeciesId } from '@/data'
import { createInstance } from '@/engine/team/instance'
import { healParty, applyHealItem } from '@/engine/run/party'
import { RNG } from '@/utils/rng'
import {
  buildGymBattle, buildRivalBattle, buildEliteBattle, buildChampionBattle,
  buildMinorTrainer, buildRocketBattle, cyberWildPool, wildLevel,
  RIVAL_BADGES,
} from './trainers'
import type {
  CyberLocation, CyberSave, CyberTerrain, CyberTrainerInfo,
} from './types'

export const CYBER_START_ITEMS: Record<string, number> = { ball: 5, potion: 2 }
export const CYBER_START_MONEY = 500

/** Nº de zonas secretas. Las 2 primeras se abren con 8 medallas; la 3ª solo
 *  aparece tras capturar el legendario de una de ellas (fiel a Latios/Latias). */
export const SECRET_ZONES = 3
export const SECRET_LEVEL = 55

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
    secretsCaught: [],
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

/** Terreno de un área (ambienta la escena en 1ª persona). */
function routeTerrain(index: number): CyberTerrain {
  if (index % 3 === 1) return 'cave'
  if (index % 3 === 2) return 'water'
  return 'grass'
}

const AREA_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/** ¿Están abiertas las zonas secretas? (fiel: tras las 8 medallas). */
export function secretsUnlocked(save: CyberSave): boolean {
  return save.progress.badges >= 8
}

/** Zonas secretas visibles ahora mismo. Las 2 primeras con 8 medallas; la 3ª
 *  SOLO tras capturar el legendario de una de ellas. */
export function visibleSecrets(save: CyberSave): number[] {
  if (!secretsUnlocked(save)) return []
  const caught = save.secretsCaught ?? []
  const out = [0, 1]
  if (caught.includes(0) || caught.includes(1)) out.push(2)
  return out.filter((i) => !caught.includes(i))
}

/** Ubicaciones del mapa según el progreso. */
export function getLocations(save: CyberSave): CyberLocation[] {
  const { badges, rivalBeaten, championBeaten } = save.progress
  const out: CyberLocation[] = [{ kind: 'center', label: 'CENTRO POKÉMON', index: 0 }]

  // Las áreas se van iluminando con las medallas (fiel: «clearing seven of the
  // gyms will open the whole map»).
  const areas = Math.min(8, badges + 1)
  for (let i = 0; i < areas; i++) {
    out.push({ kind: 'route', label: `ÁREA ${AREA_NAMES[i]}`, index: i, terrain: routeTerrain(i) })
  }
  if (badges < 8) out.push({ kind: 'gym', label: `GIMNASIO ${badges + 1}`, index: badges })
  if (rivalPending(save) != null) out.push({ kind: 'rival', label: '¡RIVAL!', index: save.progress.rivalBeaten })
  if (badges >= 8 && rivalBeaten >= 3 && !championBeaten) {
    out.push({ kind: 'league', label: 'LIGA POKÉMON', index: save.progress.eliteBeaten })
  }
  for (const i of visibleSecrets(save)) {
    out.push({ kind: 'secret', label: `ZONA SECRETA ${i + 1}`, index: i, terrain: 'secret' })
  }
  return out
}

/** Legendario que habita una zona secreta (estable por semilla + índice). */
export function secretLegendary(save: CyberSave, index: number): number {
  const pool = legendaryPool(save.gen)
  const rng = new RNG(save.seed + 7777 + index * 131)
  return rng.pick(pool).id
}

export type RouteEncounter =
  | { type: 'wild'; species: number; level: number }
  | { type: 'trainer'; trainer: CyberTrainerInfo }
  | { type: 'none' }

/** Al viajar a un área: Pokémon salvaje (→ exploración), entrenador, Team
 *  Rocket o nada. El área elegida sesga el nivel. */
export function rollEncounter(save: CyberSave, routeIndex: number, rng: RNG): RouteEncounter {
  const badges = Math.min(save.progress.badges, routeIndex + 1)
  const roll = rng.next()
  if (roll < 0.6) {
    const pool = cyberWildPool(save.gen, badges)
    const species = rng.pick(pool)
    return { type: 'wild', species: species.id, level: wildLevel(badges, rng) }
  }
  if (roll < 0.8) return { type: 'trainer', trainer: buildMinorTrainer(save.gen, badges, rng) }
  if (roll < 0.9 && save.progress.badges >= 2) {
    return { type: 'trainer', trainer: buildRocketBattle(save.gen, badges, rng) }
  }
  return { type: 'none' }
}

/** Instancia el salvaje encontrado al explorar. */
export function makeWildInstance(speciesId: number, level: number, rng: RNG): PokemonInstance {
  return createInstance(speciesId, level, rng, { shinyChance: 0.01 })
}

/** Combate de la ubicación seleccionada (gimnasio/rival/liga). */
export function buildLocationBattle(save: CyberSave, loc: CyberLocation, rng: RNG): CyberTrainerInfo | null {
  const starterId = save.dexCaught[0] ?? save.party[0]?.speciesId ?? 1
  switch (loc.kind) {
    case 'gym': return buildGymBattle(save.gen, loc.index, rng)
    case 'rival': return buildRivalBattle(save.gen, loc.index, starterId, rng)
    case 'league':
      return save.progress.eliteBeaten < 4
        ? buildEliteBattle(save.gen, save.progress.eliteBeaten, rng)
        : buildChampionBattle(save.gen, starterId, rng)
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

/** Marca capturado el legendario de una zona secreta (abre la 3ª zona). */
export function markSecretCaught(save: CyberSave, index: number): void {
  const caught = save.secretsCaught ?? []
  if (!caught.includes(index)) save.secretsCaught = [...caught, index]
}

// ---- Tienda del Centro Pokémon ----
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

/** Usa un consumible sobre un Pokémon. La semántica de cada objeto es la MISMA
 *  que en el juego principal (applyHealItem); aquí solo se descuenta el
 *  inventario del modo. */
export function useCyberItem(save: CyberSave, itemId: string, mon: PokemonInstance): string | null {
  const count = save.items[itemId] ?? 0
  if (count <= 0) return null
  if (!applyHealItem(mon, itemId)) return null
  save.items[itemId] = count - 1
  return itemId === 'revive' ? '¡Se recuperó!' : '¡PS restaurados!'
}
