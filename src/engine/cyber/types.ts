// ============================================================================
// Modo Cyber PokéBall: tipos del minijuego (recreación del juguete de Bandai).
// Aislado del roguelike: guardado y Pokédex propios, equipo máximo de 3.
// ============================================================================
import type { ExtType, PokemonInstance, StatusCondition } from '@/types'

export type Side = 'player' | 'enemy'

/** Sub-pantalla activa dentro de la Poké Ball (FSM del cyberStore).
 *  (La captura no es fase propia: es un overlay dentro de 'battle'.) */
export type CyberPhase =
  | 'title' | 'region' | 'starter'
  | 'map' | 'explore' | 'battle'
  | 'center' | 'pc' | 'dex' | 'bag' | 'online'
  | 'victory' | 'gameover'

/** Fases en las que es seguro persistir el save (fuera de combate). */
export const SAFE_PHASES: CyberPhase[] = ['title', 'map', 'center', 'pc', 'dex', 'bag', 'online', 'victory']

export const CYBER_PARTY_MAX = 3

export interface CyberProgress {
  /** Líderes de gimnasio derrotados, en orden (0..8). */
  badges: number
  /** Apariciones del rival superadas (0..3). */
  rivalBeaten: number
  /** Miembros del Alto Mando derrotados (0..4). */
  eliteBeaten: number
  championBeaten: boolean
}

/** Ubicaciones del mapa. `secret` = zonas ocultas con legendarios (tras 8 medallas). */
export type CyberLocationKind = 'center' | 'route' | 'gym' | 'rival' | 'league' | 'secret'

export interface CyberLocation {
  kind: CyberLocationKind
  /** Etiqueta LCD («ÁREA C», «GIMNASIO 2»…). */
  label: string
  /** Índice de gimnasio (0..7), ruta (0..n) o zona secreta (0..2). */
  index: number
  /** Ambientación de la escena en 1ª persona. */
  terrain?: CyberTerrain
}

/** Escenario de la exploración en primera persona. */
export type CyberTerrain = 'grass' | 'cave' | 'water' | 'secret'

export interface CyberSave {
  v: 1
  gen: number
  seed: number
  /** Estado del RNG al persistir (se rehidrata con setState). */
  rngState: number
  startedAt: number
  party: PokemonInstance[]
  box: PokemonInstance[]
  /** Objetos consumibles: id → cantidad ('ball', 'potion', 'super-potion', 'revive'). */
  items: Record<string, number>
  money: number
  /** Pokédex PROPIA del modo (ids de especie base). */
  dexSeen: number[]
  dexCaught: number[]
  progress: CyberProgress
  /** Ubicación actual en el mapa. */
  locationIndex: number
  phase: CyberPhase
  /** Cable Link: fantasmas (user_id) ya vencidos — la recompensa solo se paga
   *  la primera vez (anti-farmeo). */
  ghostsBeaten?: string[]
  /** Zonas secretas: legendarios ya capturados (índices 0..2). La 3ª zona solo
   *  aparece tras cazar uno de los dos primeros (fiel a Latios/Latias). */
  secretsCaught?: number[]
}

// ---- Combate de doble rodillo ----

export type ReelSlot = { kind: 'move'; moveId: number } | { kind: 'sad' }

export type CyberTrainerKind = 'minor' | 'rocket' | 'gym' | 'rival' | 'elite' | 'champion'

export interface CyberTrainerInfo {
  kind: CyberTrainerKind
  name: string
  sprite?: string
  team: PokemonInstance[]
  money: number
  /** Índice de gimnasio/elite que otorga progreso al ganar. */
  progressIndex?: number
  quote?: string
}

export type CyberBattlePhase =
  | 'intro'    // presentación del rival
  | 'reels'    // los dos rodillos giran; se paran de uno en uno
  | 'mash'     // minijuego de machacar ◄ ►
  | 'anim'     // reproduciendo los fotogramas del turno
  | 'switch'   // eligiendo relevo
  | 'end'      // combate terminado

export interface CyberBattleState {
  kind: 'wild' | 'trainer'
  trainer?: CyberTrainerInfo
  /** Legendario de zona secreta (índice) — al capturarlo se marca en el save. */
  secretIndex?: number
  enemy: PokemonInstance
  enemyIndex: number
  playerIndex: number
  turn: number
  /** Tiras visibles de ambos lados (se reconstruyen cada turno). */
  reels: Record<Side, ReelSlot[]>
  /** Quién para su rodillo primero (por Velocidad). */
  first: Side
  phase: CyberBattlePhase
  /** Eventos del turno en curso → la UI los convierte en fotogramas animados. */
  events: CyberEvent[]
  outcome?: 'win' | 'lose' | 'fled' | 'caught'
}

// ---- Eventos (se convierten en fotogramas animados: cyberFrames.ts) ----

export type CyberEvent =
  | { kind: 'intro'; text: string }
  | { kind: 'move'; side: Side; moveName: string; moveType: ExtType }
  | { kind: 'sad'; side: Side; text: string }
  | { kind: 'miss'; side: Side; text: string }
  | { kind: 'noEffect'; side: Side; text: string }
  | { kind: 'damage'; side: Side; amount: number; crit: boolean; effectiveness: number; moveType: ExtType; hp: number }
  | { kind: 'status'; side: Side; status: StatusCondition; text: string }
  | { kind: 'statusDamage'; side: Side; amount: number; hp: number; text: string }
  | { kind: 'recover'; side: Side; text: string }
  | { kind: 'faint'; side: Side; text: string }
  | { kind: 'heal'; side: Side; amount: number; hp: number; text: string }
  | { kind: 'levelUp'; text: string }
  | { kind: 'sendOut'; side: Side; text: string }
  | { kind: 'throwBall'; text: string }
  | { kind: 'caught'; text: string }
  | { kind: 'broke'; text: string }
  | { kind: 'message'; text: string }
  | { kind: 'end'; won: boolean; text: string }

/** Caras tristes EXTRA que añade cada estado a la tira (fiel al juguete: el
 *  estado alterado sustituye símbolos por caras tristes, y lo VES). */
export const CYBER_STATUS_SAD: Record<Exclude<StatusCondition, 'none'>, number> = {
  par: 1,
  brn: 1,
  psn: 1,
  tox: 1,
  slp: 4,
  frz: 4,
}
