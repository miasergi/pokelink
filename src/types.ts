// ============================================================================
// Tipos del dominio del juego. Compartidos por datos, motor y UI.
// ============================================================================

export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy'

export type MoveCategory = 'physical' | 'special' | 'status'

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'

export type StatusCondition = 'none' | 'brn' | 'psn' | 'par' | 'slp' | 'frz' | 'tox'

export interface BaseStats {
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
}

/** Cambio de stat producido por un movimiento de estado / efecto. */
export interface StatChange {
  stat: StatKey | 'accuracy' | 'evasion'
  stages: number // -6..+6
  target: 'self' | 'opponent'
}

export interface MoveEffect {
  /** Probabilidad (0..1) de aplicar estado/cambios secundarios. status moves = 1. */
  chance?: number
  ailment?: StatusCondition
  statChanges?: StatChange[]
  /** Curación como fracción del daño infligido (drenadoras) o del HP máx (recover). */
  drain?: number
  heal?: number
  /** Daño fijo de retroceso como fracción del daño infligido. */
  recoil?: number
  /** Golpea 2..N veces. */
  multiHit?: [number, number]
  /** Ignora cambios de stat / siempre acierta, etc. */
  flags?: string[]
}

export interface MoveData {
  id: number
  name: string
  type: PokemonType
  category: MoveCategory
  power: number // 0 para status
  accuracy: number // 0..100 (0 = nunca falla)
  pp: number
  priority: number
  effect?: MoveEffect
}

export interface LearnsetEntry {
  moveId: number
  level: number // 0 = aprendido por otros medios; usamos level-up
}

export type EvolutionTrigger =
  | { kind: 'level'; level: number }
  | { kind: 'item'; itemId: string }
  | { kind: 'trade' }
  | { kind: 'friendship' }

export interface EvolutionStep {
  toId: number
  trigger: EvolutionTrigger
}

/** Especie estática (de la "BD" generada desde PokeAPI). */
export interface SpeciesData {
  id: number // national dex id
  name: string
  displayName: string
  types: PokemonType[]
  baseStats: BaseStats
  generation: number // 1..9
  learnset: LearnsetEntry[]
  evolutions: EvolutionStep[]
  /** Es etapa final (no evoluciona) — útil para rosters/encuentros. */
  isFinal: boolean
  /** Es legendario/mítico — se excluye de encuentros normales. */
  legendary: boolean
  spriteArtwork: string
  spriteFront: string
  catchRate: number // 0..255
  baseExp: number
}

// ----- Instancias jugables (estado mutable durante una run) -----

export interface MoveInstance {
  moveId: number
  pp: number
  maxPp: number
}

export interface PokemonInstance {
  uid: string
  speciesId: number
  level: number
  exp: number
  /** IVs simples 0..31 por stat. */
  ivs: BaseStats
  /** Stats calculadas a nivel actual (incluye HP máx). */
  stats: BaseStats
  currentHp: number
  status: StatusCondition
  moves: MoveInstance[]
  heldItemId: string | null
  /** mote opcional. */
  nickname?: string
  shiny: boolean
}

// ----- Entrenadores / rosters -----

export interface TrainerPokemonSpec {
  speciesId: number
  level: number
  /** moveIds explícitos; si falta, se derivan del learnset al nivel. */
  moveIds?: number[]
  heldItemId?: string
}

export type TrainerClass =
  | 'wild' | 'trainer' | 'rival' | 'gym' | 'elite' | 'champion'

export interface TrainerData {
  id: string
  name: string
  trainerClass: TrainerClass
  /** Tipo principal (gimnasios/Alto Mando) para UI/insignia. */
  specialtyType?: PokemonType
  team: TrainerPokemonSpec[]
  sprite?: string
  reward: { money: number }
  /** Frase al iniciar/perder (sabor). */
  quote?: string
}

// ----- Objetos -----

export type ItemCategory = 'heal' | 'revive' | 'battle' | 'held' | 'evolution' | 'ball'

export interface ItemData {
  id: string
  name: string
  category: ItemCategory
  description: string
  price: number
  sprite?: string
}
