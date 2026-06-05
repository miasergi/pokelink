import type { PokemonInstance, StatusCondition, StatKey } from '@/types'

export type Side = 'player' | 'enemy'

/** Eventos producidos por el motor; la UI los reproduce con animación. */
export type BattleEvent =
  | { kind: 'start'; playerLead: string; enemyLead: string }
  | { kind: 'sendOut'; side: Side; uid: string; name: string }
  | { kind: 'move'; side: Side; uid: string; moveName: string; moveType: string }
  | { kind: 'damage'; side: Side; uid: string; amount: number; hpAfter: number; maxHp: number; effectiveness: number; crit: boolean }
  | { kind: 'heal'; side: Side; uid: string; amount: number; hpAfter: number; maxHp: number }
  | { kind: 'miss'; side: Side; uid: string }
  | { kind: 'noEffect'; side: Side; uid: string }
  | { kind: 'status'; side: Side; uid: string; status: StatusCondition }
  | { kind: 'statChange'; side: Side; uid: string; stat: StatKey | 'accuracy' | 'evasion'; delta: number }
  | { kind: 'statusDamage'; side: Side; uid: string; status: StatusCondition; amount: number; hpAfter: number; maxHp: number }
  | { kind: 'cantMove'; side: Side; uid: string; reason: 'par' | 'slp' | 'frz' }
  | { kind: 'wokeUp'; side: Side; uid: string }
  | { kind: 'thawed'; side: Side; uid: string }
  | { kind: 'faint'; side: Side; uid: string; name: string }
  | { kind: 'mega'; side: Side; uid: string; toSpeciesId: number; name: string }
  | { kind: 'transform'; side: Side; uid: string; intoSpeciesId: number; intoName: string }
  | { kind: 'ability'; side: Side; uid: string; ability: string; text: string }
  | { kind: 'weather'; weather: 'none' | 'sun' | 'rain' | 'sand' | 'snow' }
  | { kind: 'message'; text: string }
  | { kind: 'end'; winner: Side }

export interface BattleConfig {
  playerTeam: PokemonInstance[]
  enemyTeam: PokemonInstance[]
  seed: number
  /** Combate de jefe: derrota = fin de run. */
  isBoss?: boolean
  enemyName?: string
}

export interface BattleResult {
  events: BattleEvent[]
  winner: Side
  /** Estado del equipo del jugador tras el combate (HP/estado/exp). */
  playerTeam: PokemonInstance[]
  /** EXP ganada por uid (ya aplicada a playerTeam). */
  expByUid: Record<string, number>
  /** Niveles subidos por uid (para animación de subida). */
  levelUps: Record<string, number>
}
