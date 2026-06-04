import type { MoveData, SpeciesData } from '@/types'
import pokemonJson from './generated/pokemon.json'
import movesJson from './generated/moves.json'

// Cast único de los JSON generados a tipos del dominio.
export const ALL_SPECIES = pokemonJson as unknown as SpeciesData[]
export const ALL_MOVES = movesJson as unknown as MoveData[]

const speciesById = new Map<number, SpeciesData>()
for (const s of ALL_SPECIES) speciesById.set(s.id, s)

const moveById = new Map<number, MoveData>()
for (const m of ALL_MOVES) moveById.set(m.id, m)

export function getSpecies(id: number): SpeciesData {
  const s = speciesById.get(id)
  if (!s) throw new Error(`Especie desconocida: ${id}`)
  return s
}

export function tryGetSpecies(id: number): SpeciesData | undefined {
  return speciesById.get(id)
}

export function getMove(id: number): MoveData {
  const m = moveById.get(id)
  if (!m) throw new Error(`Movimiento desconocido: ${id}`)
  return m
}

export function tryGetMove(id: number): MoveData | undefined {
  return moveById.get(id)
}

/** Especies de una generación (o todas si gen === 'all'). */
export function speciesByGeneration(gen: number | 'all'): SpeciesData[] {
  if (gen === 'all') return ALL_SPECIES
  return ALL_SPECIES.filter((s) => s.generation === gen)
}

/** Pool de encuentros: excluye legendarios; opcionalmente limita a una gen. */
export function encounterPool(gen: number | 'all'): SpeciesData[] {
  return speciesByGeneration(gen).filter((s) => !s.legendary)
}
