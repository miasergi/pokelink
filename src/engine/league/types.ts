import type { PokemonInstance } from '@/types'

/** Un participante del torneo (jugador o rival generado). */
export interface LeagueParticipant {
  id: string
  name: string
  /** Retrato del entrenador (URL). */
  sprite: string
  isPlayer: boolean
  /** Equipo de 6 Pokémon a nivel 100 (con objetos, 1 mega y 1 Movimiento Z). */
  team: PokemonInstance[]
}

/** Estado final de un Pokémon en un combate (para mostrar el resultado). */
export interface MatchSide {
  speciesId: number
  shiny: boolean
  fainted: boolean
}

/** Un combate de fase de grupos. `a`/`b` son índices de participante. */
export interface LeagueMatch {
  a: number
  b: number
  matchday: number // 0..2
  played: boolean
  winner?: 'a' | 'b'
  /** Kills netas en ESTE combate (rivales debilitados − propios debilitados). */
  killsA?: number
  killsB?: number
  /** Equipos al final del combate (qué Pokémon cayeron). */
  detailA?: MatchSide[]
  detailB?: MatchSide[]
}

export interface LeagueGroup {
  idx: number
  /** 4 índices de participante. */
  members: number[]
  /** 6 combates (todos contra todos), repartidos en 3 jornadas. */
  matches: LeagueMatch[]
}

/** Fila de clasificación de un grupo. */
export interface Standing {
  participant: number
  played: number
  won: number
  points: number
  kills: number
}

export interface KnockoutMatch {
  a: number | null
  b: number | null
  played: boolean
  winner?: number // índice de participante
  killsA?: number
  killsB?: number
  detailA?: MatchSide[]
  detailB?: MatchSide[]
}
export interface KnockoutRound {
  name: string
  matches: KnockoutMatch[]
}

export interface LeagueState {
  seed: number
  rngState: number
  participants: LeagueParticipant[] // 32
  playerIdx: number
  groups: LeagueGroup[] // 8
  phase: 'groups' | 'knockout' | 'champion'
  /** Jornada de grupos actual (0..2) mientras phase === 'groups'. */
  matchday: number
  knockout: KnockoutRound[]
  koRound: number
  /** Pokémon debilitados del jugador (para mostrar), reseteados por combate. */
  startedAt: number
}

/** Resultado de un combate para la liga (independiente del motor). */
export interface MatchOutcome {
  winner: 'a' | 'b'
  killsA: number
  killsB: number
  detailA: MatchSide[]
  detailB: MatchSide[]
}
