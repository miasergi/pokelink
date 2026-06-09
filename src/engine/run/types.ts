import type { ItemData, PokemonInstance, PokemonType, TrainerData } from '@/types'

export type GameMode = 'generation' | 'all' | 'random'

export type Difficulty = 'normal' | 'hard' | 'nuzlocke'

/** Qué categorías randomiza el Modo Random (cada una por separado). */
export interface RandomFlags {
  /** Iniciales y Pokémon capturables. */
  starters: boolean
  /** Combates salvajes (y guardián legendario). */
  wild: boolean
  /** Entrenadores normales, gimnasios, rival y campeón. */
  trainers: boolean
  /** Alto Mando. */
  elite: boolean
}

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
  /** Team Rocket: Pokémon "secuestrado" (forma parte del equipo). Si ganas, lo
   *  liberas y se une a tu equipo. Copia prístina (PS llenos) para entregarla. */
  rescue?: PokemonInstance
}
export interface CatchContent {
  kind: 'catch'
  /** 3 Pokémon a elegir para capturar. */
  offers: PokemonInstance[]
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
  /** Modo aleatorio: ¿hay alguna categoría randomizada? (etiquetas/ranking). */
  random: boolean
  /** Qué categorías randomiza (si `random`). Ausente en runs antiguas/diario. */
  randomFlags?: RandomFlags
  /** Modo Monolocke: si está, solo obtienes Pokémon de este tipo (inicial,
   *  capturas, intercambios y eventos). */
  monotype?: PokemonType
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
  /** Ancla de la SESIÓN en curso (timestamp). Al reanudar se reinicia a "ahora"
   *  para no contar el tiempo con la app cerrada. */
  startedAt: number
  /** Tiempo de juego ACTIVO acumulado de sesiones anteriores (ms). El tiempo
   *  total de la run = elapsedMs + (ahora − startedAt). */
  elapsedMs?: number
  /** Reto diario (fecha YYYY-MM-DD) si esta run lo es. */
  daily?: string
  /** Modo Historia: nº de capítulo (si esta run es de la historia). */
  story?: number
}

export interface OfferedItem {
  item: ItemData
  price?: number
}
