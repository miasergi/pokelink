import type { BaseStats, MoveInstance, PokemonInstance, SpeciesData } from '@/types'
import { getMove, getSpecies } from '@/data'
import { typeAttackId, tierForLevel } from '@/data/typeAttacks'
import { RNG } from '@/utils/rng'
import { computeStats, expForLevel } from './leveling'

let uidCounter = 0
function nextUid(): string {
  uidCounter += 1
  return `p${uidCounter}_${Date.now().toString(36)}`
}

function randomIvs(rng: RNG): BaseStats {
  const r = () => rng.int(0, 31)
  return { hp: r(), atk: r(), def: r(), spa: r(), spd: r(), spe: r() }
}

/**
 * Moveset ESTÁNDAR: un ataque por cada tipo del Pokémon (1 monotipo, 2 doble),
 * en su nivel de potencia (40/80/120) según el nivel. En combate la IA usa el
 * más eficaz por tipo.
 */
export function selectMoveset(species: SpeciesData, level: number): MoveInstance[] {
  const tier = tierForLevel(level)
  const types = [...new Set(species.types)].slice(0, 2)
  return types.map((type) => {
    const id = typeAttackId(type, tier)
    const m = getMove(id)
    return { moveId: id, pp: m.pp, maxPp: m.pp }
  })
}

export interface CreateOptions {
  moveIds?: number[]
  heldItemId?: string | null
  shinyChance?: number
}

/** Crea una instancia jugable de una especie a un nivel. */
export function createInstance(
  speciesId: number,
  level: number,
  rng: RNG,
  opts: CreateOptions = {},
): PokemonInstance {
  const species = getSpecies(speciesId)
  const ivs = randomIvs(rng)
  const stats = computeStats(species.baseStats, ivs, level)
  // Estandarizado: SIEMPRE ataques por tipo (ignoramos movesets de roster).
  void opts.moveIds
  const moves: MoveInstance[] = selectMoveset(species, level)

  const ability = species.abilities.length ? rng.pick(species.abilities) : 'none'

  return {
    uid: nextUid(),
    speciesId,
    level,
    exp: expForLevel(level),
    ivs,
    stats,
    currentHp: stats.hp,
    status: 'none',
    moves,
    heldItemId: opts.heldItemId ?? null,
    ability,
    shiny: rng.chance(opts.shinyChance ?? 0.01), // 1% shiny (iniciales, capturas, encuentros)
  }
}

export function isFainted(mon: PokemonInstance): boolean {
  return mon.currentHp <= 0
}

export function fullHeal(mon: PokemonInstance): void {
  mon.currentHp = mon.stats.hp
  mon.status = 'none'
  for (const mv of mon.moves) mv.pp = mv.maxPp
}
