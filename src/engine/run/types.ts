import type { ItemData, PokemonInstance, TrainerData } from '@/types'

export type GameMode = 'generation' | 'all' | 'random'

export type Difficulty = 'normal' | 'hard' | 'nuzlocke'

export type NodeType =
  | 'battle' // combate salvaje
  | 'trainer' // entrenador normal
  | 'catch' // captura/draft
  | 'item' // elegir objeto
  | 'shop' // tienda
  | 'event' // evento aleatorio
  | 'trade' // intercambio: cambias un Pokémon por otro aleatorio
  | 'heal' // centro Pokémon
  | 'rival' // combate de rival
  | 'legendary' // guardián legendario (capturable al vencerlo)
  | 'gym' // líder de gimnasio
  | 'elite' // Alto Mando
  | 'champion' // Campeón

export interface WildContent {
  kind: 'wild'
  enemy: PokemonInstance
}
export interface TrainerContent {
  kind: 'trainer'
  trainer: TrainerData
  team: PokemonInstance[]
}
export interface CatchContent {
  kind: 'catch'
  offer: PokemonInstance
}
export interface ItemContent {
  kind: 'item'
  choices: string[] // itemIds
}
export interface ShopContent {
  kind: 'shop'
  stock: string[] // itemIds
}
export interface HealContent {
  kind: 'heal'
}
export interface EventContent {
  kind: 'event'
  eventId: string
}
export interface TradeContent {
  kind: 'trade'
  cost: number
}

export type NodeContent =
  | WildContent
  | TrainerContent
  | CatchContent
  | ItemContent
  | ShopContent
  | HealContent
  | EventContent
  | TradeContent

export interface MapNode {
  id: string
  layer: number
  col: number
  type: NodeType
  next: string[] // ids en la capa siguiente
  enemyLevel: number
  content: NodeContent
  /** índice del jefe (0..7 gimnasios, 0..3 alto mando) para UI. */
  bossIndex?: number
  /** Nodo arriesgado: enemigo más fuerte pero mejor botín (doble dinero + objeto). */
  risky?: boolean
  cleared: boolean
}

export interface RunMap {
  layers: string[][] // ids por capa
  nodes: Record<string, MapNode>
  totalLayers: number
}

export type RunStatus = 'active' | 'won' | 'lost'

export interface RunState {
  /** Generaciones cuyos Pokémon pueden aparecer (salvajes, capturas, etc.). */
  pools: number[]
  /** Modo aleatorio: randomiza por completo las especies. */
  random: boolean
  difficulty: Difficulty
  gen: number
  region: string
  starterId: number
  rivalStarterId: number
  seed: number
  rngState: number // estado del RNG de la run (para nodos posteriores)
  map: RunMap
  /** id del nodo actual (null = elegir en la capa 0). */
  currentNodeId: string | null
  currentLayer: number
  party: PokemonInstance[]
  box: PokemonInstance[] // Pokémon capturados de más
  inventory: Record<string, number> // itemId -> cantidad
  money: number
  status: RunStatus
  /** Estadísticas de la run. */
  stats: {
    battlesWon: number
    pokemonCaught: number
    gymsDefeated: number
    eliteDefeated: number
    turnsPlayed: number
  }
  startedAt: number
  /** Reto diario (fecha YYYY-MM-DD) si esta run lo es. */
  daily?: string
}

export interface OfferedItem {
  item: ItemData
  price?: number
}
