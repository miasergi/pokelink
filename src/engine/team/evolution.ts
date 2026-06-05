import type { PokemonInstance, SpeciesData } from '@/types'
import { getSpecies } from '@/data'
import { recalcStats } from './leveling'

/** Evolución por nivel disponible para este Pokémon (si la hay). */
export function pendingLevelEvolution(mon: PokemonInstance): SpeciesData | null {
  const species = getSpecies(mon.speciesId)
  for (const evo of species.evolutions) {
    if (evo.trigger.kind === 'level' && mon.level >= evo.trigger.level) {
      return getSpecies(evo.toId)
    }
  }
  return null
}

/** ¿Una piedra concreta evoluciona a este Pokémon? */
export function evolutionByItem(
  mon: PokemonInstance,
  itemId: string,
): SpeciesData | null {
  const species = getSpecies(mon.speciesId)
  for (const evo of species.evolutions) {
    if (evo.trigger.kind === 'item' && evo.trigger.itemId === itemId) {
      return getSpecies(evo.toId)
    }
  }
  return null
}

/** Aplica una evolución a una instancia (muta especie, stats y habilidad). */
export function evolve(mon: PokemonInstance, toSpecies: SpeciesData): void {
  mon.speciesId = toSpecies.id
  recalcStats(mon, toSpecies)
  // Si la habilidad actual no existe en la nueva especie, hereda la primera.
  if (toSpecies.abilities.length && !toSpecies.abilities.includes(mon.ability)) {
    mon.ability = toSpecies.abilities[0]
  }
}

/** Evolución final por cadena de niveles (usado para rivales/campeón). */
export function getFinalEvolution(speciesId: number, maxLevel = 100): number {
  let current = getSpecies(speciesId)
  const guard = new Set<number>()
  while (true) {
    if (guard.has(current.id)) break
    guard.add(current.id)
    const levelEvo = current.evolutions.find(
      (e) => e.trigger.kind === 'level' && e.trigger.level <= maxLevel,
    )
    const anyEvo = current.evolutions[0]
    const next = levelEvo ?? anyEvo
    if (!next) break
    current = getSpecies(next.toId)
  }
  return current.id
}

/** Evolución intermedia aproximada a un nivel (para escalar rivales). */
export function evolutionAtLevel(speciesId: number, level: number): number {
  let current = getSpecies(speciesId)
  const guard = new Set<number>()
  while (true) {
    if (guard.has(current.id)) break
    guard.add(current.id)
    const evo = current.evolutions.find(
      (e) => e.trigger.kind === 'level' && level >= e.trigger.level,
    )
    if (!evo) {
      // permite también evoluciones por piedra/intercambio si el nivel es alto
      const other = current.evolutions[0]
      if (other && level >= 30) {
        current = getSpecies(other.toId)
        continue
      }
      break
    }
    current = getSpecies(evo.toId)
  }
  return current.id
}
