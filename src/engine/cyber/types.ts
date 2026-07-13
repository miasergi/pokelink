// ============================================================================
// Modo Cyber PokéBall: tipos del minijuego (recreación del juguete de Bandai).
// Aislado del roguelike: guardado y Pokédex propios, equipo máximo de 3.
// ============================================================================
import type { PokemonInstance, StatusCondition } from '@/types'

/** Sub-pantalla activa dentro de la Poké Ball (FSM del cyberStore).
 *  (La captura no es fase propia: es un overlay dentro de 'battle'.) */
export type CyberPhase =
  | 'title' | 'region' | 'starter'
  | 'map' | 'radar' | 'battle'
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

/** Ubicaciones del mapa ciclable (estilo juguete: iconos que rotas con ◄ ►). */
export type CyberLocationKind = 'center' | 'route' | 'gym' | 'rival' | 'rocket' | 'league'

export interface CyberLocation {
  kind: CyberLocationKind
  /** Etiqueta LCD («RUTA 3», «GIMNASIO 2»…). */
  label: string
  /** Índice de gimnasio (0..7) o de ruta (0..n) según kind. */
  index: number
}

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
  /** Ubicación actual en el mapa ciclable. */
  locationIndex: number
  phase: CyberPhase
  /** Cable Link: fantasmas (user_id) ya vencidos — la recompensa de 500 ₽ solo
   *  se paga la primera vez (anti-farmeo). Opcional: saves antiguos no lo tienen. */
  ghostsBeaten?: string[]
}

// ---- Combate por timing ----

export type CarouselSlot = { kind: 'move'; moveId: number } | { kind: 'sad' }

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
  | 'intro'      // presentación («¡PIDGEY salvaje!»)
  | 'carousel'   // el carrusel gira, esperando el stop del jugador
  | 'mash'       // minijuego machacar ◄/►
  | 'anim'       // reproduciendo el resultado del turno (jugador + enemigo)
  | 'switch'     // eligiendo relevo (voluntario o por debilitamiento)
  | 'end'        // combate terminado (victoria/derrota/huida/captura)

export interface CyberBattleState {
  kind: 'wild' | 'trainer'
  trainer?: CyberTrainerInfo
  /** Enemigo activo (en salvajes es el único). */
  enemy: PokemonInstance
  enemyIndex: number
  /** Índice del Pokémon activo del jugador dentro del party. */
  playerIndex: number
  turn: number
  carousel: CarouselSlot[]
  phase: CyberBattlePhase
  /** Resultado final ('end'). */
  outcome?: 'win' | 'lose' | 'fled' | 'caught'
  /** Mensajes LCD del último paso (la UI los muestra en cola). */
  log: string[]
}

/** Resultado de parar el carrusel / resolver un turno. */
export interface TurnEvents {
  messages: string[]
  playerDamage?: number   // daño infligido POR el jugador
  enemyDamage?: number    // daño recibido del enemigo
  playerFainted?: boolean
  enemyFainted?: boolean
  effectiveness?: number
  crit?: boolean
}

// ---- Estado alterado: etiquetas cortas LCD ----
export const CYBER_STATUS_SAD: Record<Exclude<StatusCondition, 'none'>, number> = {
  // nº de caras tristes EXTRA que añade cada estado al carrusel
  par: 2,
  brn: 1,
  psn: 1,
  tox: 1,
  slp: 5,
  frz: 5,
}
