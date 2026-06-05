import type { BaseStats, MoveData, MoveInstance, PokemonInstance, PokemonType, SpeciesData } from '@/types'
import { getMove, getSpecies, tryGetMove } from '@/data'
import { RNG } from '@/utils/rng'
import { computeStats, expForLevel } from './leveling'

// Movimiento de daño básico por tipo (respaldo si el learnset no tiene uno).
const TYPE_DEFAULT_MOVE: Record<PokemonType, number> = {
  normal: 33, // Placaje
  fire: 52, // Ascuas
  water: 55, // Pistola Agua
  electric: 84, // Impactrueno
  grass: 22, // Látigo Cepa
  ice: 181, // Nieve Polvo
  fighting: 2, // Golpe Karate
  poison: 40, // Picotazo Veneno
  ground: 189, // Bofetón Lodo
  flying: 16, // Tornado
  psychic: 93, // Confusión
  bug: 450, // Picadura
  rock: 88, // Lanzarrocas
  ghost: 425, // Sombra Vil
  dragon: 239, // Ciclón
  dark: 44, // Mordisco
  steel: 232, // Garra Metal
  fairy: 584, // Viento Feérico
}

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
 * Moveset simplificado (roguelike ágil): UN movimiento de daño por cada tipo del
 * Pokémon (1 si es monotipo, 2 si es doble). En combate, la IA usa el más eficaz.
 * Para cada tipo elige el mejor movimiento de daño de ese tipo en su learnset;
 * si no tiene ninguno, usa el movimiento básico de ese tipo.
 */
export function selectMoveset(species: SpeciesData, level: number): MoveInstance[] {
  const learned = [...new Set(species.learnset.filter((e) => e.level <= level).map((e) => e.moveId))]
    .map((id) => tryGetMove(id))
    .filter((m): m is MoveData => !!m && m.category !== 'status' && m.power > 0)

  const moves: MoveData[] = []
  for (const type of species.types) {
    const best = learned
      .filter((m) => m.type === type)
      .sort((a, b) => b.power - a.power)[0]
    moves.push(best ?? getMove(TYPE_DEFAULT_MOVE[type]))
  }

  // De-dup por id y garantiza al menos un movimiento.
  const seen = new Set<number>()
  const final = moves.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
  if (final.length === 0) final.push(getMove(TYPE_DEFAULT_MOVE.normal))

  return final.map((m) => ({ moveId: m.id, pp: m.pp, maxPp: m.pp }))
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
  const moves: MoveInstance[] = opts.moveIds
    ? opts.moveIds.map((id) => {
        const m = getMove(id)
        return { moveId: id, pp: m.pp, maxPp: m.pp }
      })
    : selectMoveset(species, level)

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
