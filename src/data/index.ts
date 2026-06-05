import type { MoveData, SpeciesData } from '@/types'
import pokemonJson from './generated/pokemon.json'
import movesJson from './generated/moves.json'
import megasJson from './generated/megas.json'
import { buildTypeMoves } from './typeAttacks'

// Cast único de los JSON generados a tipos del dominio.
export const ALL_SPECIES = pokemonJson as unknown as SpeciesData[]
export const ALL_MOVES = movesJson as unknown as MoveData[]
export const ALL_MEGAS = megasJson as unknown as SpeciesData[]

// El mapa de búsqueda incluye base + formas mega (para getSpecies/sprites).
// ALL_SPECIES (pools/Pokédex) contiene solo el dex base.
const speciesById = new Map<number, SpeciesData>()
for (const s of ALL_SPECIES) speciesById.set(s.id, s)
for (const m of ALL_MEGAS) speciesById.set(m.id, m)

// baseId -> formas mega disponibles
const megasByBase = new Map<number, SpeciesData[]>()
for (const m of ALL_MEGAS) {
  if (m.baseId == null) continue
  if (!megasByBase.has(m.baseId)) megasByBase.set(m.baseId, [])
  megasByBase.get(m.baseId)!.push(m)
}

/** Formas mega/primigenias de una especie base (vacío si no tiene). */
export function getMegaForms(baseId: number): SpeciesData[] {
  return megasByBase.get(baseId) ?? []
}

export function hasMega(baseId: number): boolean {
  return megasByBase.has(baseId)
}

const moveById = new Map<number, MoveData>()
for (const m of ALL_MOVES) moveById.set(m.id, m)
// Ataques estándar por tipo (40/80/120) sintéticos.
for (const m of buildTypeMoves()) moveById.set(m.id, m)

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

/** Pool de legendarios (no míticos) de una generación, para guardianes. */
export function legendaryPool(gen: number | 'all'): SpeciesData[] {
  const list = speciesByGeneration(gen).filter((s) => s.legendary && !s.mythical && s.isFinal)
  return list.length ? list : ALL_SPECIES.filter((s) => s.legendary && !s.mythical)
}

const EVOLVED_IDS = (() => {
  const set = new Set<number>()
  for (const s of ALL_SPECIES) for (const e of s.evolutions) set.add(e.toId)
  return set
})()

/** Pool de formas base (primera etapa, sin pre-evolución), no legendarias. */
export function basePool(gen: number | 'all'): SpeciesData[] {
  const list = speciesByGeneration(gen).filter((s) => !EVOLVED_IDS.has(s.id) && !s.legendary)
  return list.length ? list : ALL_SPECIES.filter((s) => !EVOLVED_IDS.has(s.id) && !s.legendary)
}

/** Iniciales válidos para Modo Random: formas base con cadena de 3 etapas. */
export function threeStageStarterPool(): SpeciesData[] {
  return ALL_SPECIES.filter((s) => {
    if (EVOLVED_IDS.has(s.id) || s.legendary || s.isMega) return false
    const mid = s.evolutions[0]
    if (!mid) return false
    const midSp = speciesById.get(mid.toId)
    return !!midSp && midSp.evolutions.length > 0
  })
}
