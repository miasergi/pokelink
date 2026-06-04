import type { PokemonType } from '@/types'

export interface GenerationMeta {
  gen: number
  region: string
  /** ¿Hay rosters reales de entrenadores implementados para esta gen? */
  rostersReady: boolean
  /** Orden de tipos de los 8 gimnasios (para color/insignia del mapa). */
  gymTypes: PokemonType[]
  accent: string // color de acento para la UI
}

export const GENERATIONS: GenerationMeta[] = [
  {
    gen: 1,
    region: 'Kanto',
    rostersReady: true,
    gymTypes: ['rock', 'water', 'electric', 'grass', 'poison', 'psychic', 'fire', 'ground'],
    accent: '#ef4444',
  },
  { gen: 2, region: 'Johto', rostersReady: true, gymTypes: ['flying', 'bug', 'normal', 'ghost', 'fighting', 'steel', 'ice', 'dragon'], accent: '#f59e0b' },
  { gen: 3, region: 'Hoenn', rostersReady: true, gymTypes: ['rock', 'fighting', 'electric', 'fire', 'normal', 'flying', 'psychic', 'water'], accent: '#10b981' },
  { gen: 4, region: 'Sinnoh', rostersReady: true, gymTypes: ['rock', 'grass', 'fighting', 'water', 'ghost', 'steel', 'ice', 'electric'], accent: '#3b82f6' },
  { gen: 5, region: 'Teselia', rostersReady: true, gymTypes: ['grass', 'normal', 'bug', 'electric', 'ground', 'flying', 'ice', 'dragon'], accent: '#6366f1' },
  { gen: 6, region: 'Kalos', rostersReady: true, gymTypes: ['bug', 'rock', 'fighting', 'grass', 'electric', 'fairy', 'psychic', 'ice'], accent: '#ec4899' },
  { gen: 7, region: 'Alola', rostersReady: true, gymTypes: ['normal', 'water', 'fire', 'grass', 'electric', 'ghost', 'fairy', 'flying'], accent: '#f97316' },
  { gen: 8, region: 'Galar', rostersReady: true, gymTypes: ['grass', 'water', 'fire', 'fighting', 'ghost', 'fairy', 'ice', 'dragon'], accent: '#8b5cf6' },
  { gen: 9, region: 'Paldea', rostersReady: true, gymTypes: ['bug', 'grass', 'electric', 'water', 'normal', 'ghost', 'psychic', 'ice'], accent: '#14b8a6' },
]

export function getGeneration(gen: number): GenerationMeta {
  const g = GENERATIONS.find((x) => x.gen === gen)
  if (!g) throw new Error(`Generación desconocida: ${gen}`)
  return g
}
