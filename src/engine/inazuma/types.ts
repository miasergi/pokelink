// Tipos del modo «Inazuma Rogue»: un roguelite de fútbol inspirado en Inazuma
// Eleven que vive DENTRO de esta app pero está completamente aislado del
// roguelike Pokémon (igual que el modo Cyber PokéBall): store propio, motor
// puro propio y su propia clave de guardado.
//
// Vocabulario del modo:
//  - «Instituto» = equipo.  «Plantilla» = jugadores fichados.  «Once» = titulares.
//  - PT = Puntos de Técnica (maná para lanzar supertécnicas).
//  - Aguante = fatiga acumulada durante el torneo, NO se recupera sola del todo.
//  - Ruptura = barra de hype que habilita la Supervibración.

/** Los cuatro elementos de la saga (Fūrinkazan). */
export type Element = 'fuego' | 'bosque' | 'aire' | 'montana'

export const ELEMENTS: readonly Element[] = ['fuego', 'bosque', 'aire', 'montana'] as const

/** Demarcación. El once siempre lleva 1 POR, y el resto reparte 3-4-3 por defecto. */
export type Position = 'POR' | 'DEF' | 'MED' | 'DEL'

export const POSITIONS: readonly Position[] = ['POR', 'DEF', 'MED', 'DEL'] as const

/**
 * Atributos. Se guardan como BASE (valor a nivel 1) y se escalan por nivel en
 * `scaleStats`. Rango base sano: 30 (relleno) … 85 (estrella de la saga).
 */
export interface Stats {
  /** Potencia de disparo. Decide los duelos de definición. */
  tiro: number
  /** Manejo de balón: regates y conducción. */
  control: number
  /** Cuerpo a cuerpo: entradas y aguantar la carga. */
  fisico: number
  /** Contención: bloqueos y cortes. */
  defensa: number
  /** Velocidad: desempata duelos y da iniciativa en el contraataque. */
  velocidad: number
  /** Aguante: PT máximos y resistencia a la fatiga. */
  aguante: number
}

/** Qué clase de duelo resuelve una supertécnica. */
export type TechniqueKind = 'tiro' | 'regate' | 'bloqueo' | 'parada'

export interface Technique {
  id: string
  name: string
  kind: TechniqueKind
  element: Element
  /** Bonificador de potencia en %. 20 = flojita, 150 = técnica definitiva. */
  power: number
  /** PT que consume al usarse. */
  cost: number
  /** Texto de sabor que se ve en la carta. */
  desc?: string
  /**
   * Técnica a la que evoluciona con el objeto «Manual avanzado» o al subir de
   * nivel (Pingüinos Emperador nº1 → nº2). Encadenable.
   */
  evolvesTo?: string
  /** Nivel mínimo del jugador para poder aprenderla en un draft. */
  minLevel?: number
}

/** Ficha inmutable de un jugador (la «especie», por analogía con Pokémon). */
export interface PlayerBase {
  id: string
  name: string
  /** Instituto de origen. Sirve para el retrato y para el sabor del fichaje. */
  team: string
  position: Position
  element: Element
  stats: Stats
  /** Técnicas con las que aparece. Máximo 4 (`TECHNIQUE_SLOTS`). */
  techniques: string[]
  /** 1 = relleno, 5 = leyenda. Controla el precio y la rareza en el draft. */
  rarity: 1 | 2 | 3 | 4 | 5
  /** Slug del retrato en `public/inazuma/players/<slug>.webp`. Opcional. */
  portrait?: string
  /**
   * Espíritu Guerrero. Solo lo tienen los jugadores grandes (★4-★5): es la
   * carta que te guardas para un duelo concreto, no un pasivo.
   */
  spirit?: string
}

/** Un jugador concreto de TU plantilla, con su progresión de la partida. */
export interface PlayerInstance {
  uid: string
  baseId: string
  level: number
  /** PT actuales. El máximo sale de `ptMax(player)`. */
  pt: number
  /** 0-100. Baja al disputar duelos y penaliza los atributos por debajo de 40. */
  stamina: number
  /** Ids de técnica. Puede diferir de la base (aprendidas o evolucionadas). */
  techniques: string[]
  /** Bonos permanentes de entrenamiento, sumados a los atributos escalados. */
  boosts?: Partial<Stats>
  /** Objeto equipado (`InazumaItem.id`). */
  item?: string
  /**
   * Mejoras aplicadas a cada supertécnica con el objeto «Mejora», por id.
   * Cada nivel sube la potencia un 25 % (tope `MAX_TECH_LEVEL`). Es el
   * equivalente a la Mejora del modo Pokémon, que sube el tier del ataque.
   */
  techLevels?: Record<string, number>
  /** Capitán: no se puede traspasar ni sacar del once. */
  captain?: boolean
}

export const TECHNIQUE_SLOTS = 4
export const SQUAD_SIZE = 11

/**
 * Formación del once. No es decorativa: la cadena del partido
 * (construcción → penetración → definición) reparte los duelos entre MED y DEL,
 * así que jugar con 5-3-2 o con 3-4-3 cambia de verdad dónde se decide el
 * partido.
 */
export interface Formation {
  id: string
  name: string
  defs: number
  mids: number
  fwds: number
  desc: string
}
/** Titulares + suplentes. El draft ofrece traspasar cuando se llena. */
export const ROSTER_MAX = 16

// ---------------------------------------------------------------------------
// Institutos rivales
// ---------------------------------------------------------------------------

export interface TeamBase {
  id: string
  name: string
  /** Color principal del escudo/uniforme (hex). */
  color: string
  element: Element
  /** Frase del entrenador rival antes del partido. */
  taunt: string
  /** Ids de `PlayerBase` que forman su once. Se rellena si faltan. */
  lineup: string[]
  /** Multiplicador de dificultad sobre el nivel del rival. */
  power: number
}

// ---------------------------------------------------------------------------
// Partido
// ---------------------------------------------------------------------------

export type Side = 'home' | 'away'

/** Los tres eslabones de una posesión: sacar el balón, romper la defensa, definir. */
export type ChainStep = 'construccion' | 'penetracion' | 'definicion'

/**
 * Evento emitido por el motor. La UI los reproduce como una retransmisión
 * (mismo patrón que `BattleEvent` en el combate Pokémon: motor puro → eventos
 * → animación) para que el partido no sea un muro de texto instantáneo.
 */
export type MatchEvent =
  | { kind: 'kickoff'; minute: number }
  | { kind: 'possession'; minute: number; side: Side; text: string }
  | { kind: 'duel'; minute: number; side: Side; step: ChainStep; attacker: string; attackerUid: string; defender: string; defenderUid: string; technique?: string; counter?: string; element?: Element; effectiveness: number; success: boolean; text: string }
  | { kind: 'goal'; minute: number; side: Side; scorer: string; scorerUid: string; technique?: string; score: [number, number] }
  | { kind: 'save'; minute: number; side: Side; keeper: string; keeperUid: string; technique?: string; text: string }
  | { kind: 'turnover'; minute: number; side: Side; text: string }
  | { kind: 'burst'; minute: number; side: Side; text: string }
  | { kind: 'spirit'; minute: number; side: Side; player: string; spirit: string; text: string }
  | { kind: 'exhausted'; minute: number; player: string; text: string }
  | { kind: 'halftime'; minute: number; score: [number, number] }
  | { kind: 'fulltime'; minute: number; score: [number, number]; result: 'win' | 'draw' | 'loss' }

/** Una opción que el motor ofrece al jugador en una jugada clave. */
export interface DecisionOption {
  id: string
  label: string
  /** Sublínea: «Tiro · Fuego · 18 PT». */
  detail: string
  /** Estimación 1-3 estrellas que se pinta en el botón. */
  odds: 1 | 2 | 3
  /** Probabilidad real 0-1. La UI la enseña si el ajuste está activo. */
  chance: number
  cost: number
  element?: Element
  /** Motivo por el que la opción está deshabilitada (sin PT, etc.). */
  disabled?: string
}

export interface Decision {
  minute: number
  step: ChainStep
  /** Si es una jugada tuya de ataque o una parada tuya. */
  mode: 'ataque' | 'defensa'
  /** uid del jugador que decide. */
  actorUid: string
  actorName: string
  /** uid del rival al que se enfrenta, para pintar su retrato. */
  rivalUid: string
  /** Nombre del rival al que se enfrenta. */
  rivalName: string
  rivalElement: Element
  headline: string
  options: DecisionOption[]
}

/** Acumulado de un jugador a lo largo de la partida. */
export interface PlayerStats {
  goals: number
  saves: number
  duelsWon: number
  duelsLost: number
  matches: number
}

/** Jugador rival: instancia ligera, sin progresión ni uid persistente. */
export interface RivalPlayer {
  baseId: string
  name: string
  position: Position
  element: Element
  level: number
  stats: Stats
  techniques: string[]
}

/**
 * Un jugador DENTRO de un partido, ya resuelto a números. Unifica tu plantilla
 * y la del rival para que el motor no tenga que saber de quién es cada uno.
 * Los tuyos conservan el `uid` de `PlayerInstance` para poder devolverles el
 * desgaste (PT y aguante) al terminar.
 */
export interface Actor {
  uid: string
  /** Id del `PlayerBase`: la UI lo necesita para pintar el retrato. */
  baseId: string
  name: string
  position: Position
  element: Element
  stats: Stats
  stamina: number
  pt: number
  ptMax: number
  /** Ids de técnica; se resuelven con `actorTechnique`. */
  techniques: string[]
  /** Mejoras del objeto «Mejora», por id de técnica. Solo las tuyas. */
  techLevels?: Record<string, number>
  /** Id del Espíritu Guerrero, si lo tiene. */
  spirit?: string
}

export interface MatchSide {
  name: string
  color: string
  element: Element
  /** true en el lado que controla el usuario. */
  isPlayer: boolean
  keeper: Actor
  defs: Actor[]
  mids: Actor[]
  fwds: Actor[]
  goals: number
  /** Barra de Ruptura 0-100. A 100 se puede activar la Supervibración. */
  burst: number
  /** Acciones que quedan de Supervibración activa (0 = inactiva). */
  burstTurns: number
  /** El Espíritu Guerrero se invoca UNA vez por partido y por equipo. */
  spiritUsed?: boolean
}

export type MatchPhase = 'playing' | 'decision' | 'finished'

/**
 * Estado VIVO del partido. NO se persiste a propósito: igual que en el modo
 * Cyber, abandonar a mitad de partido no guarda nada (anti-trampa: si vas
 * perdiendo 3-0 no puedes cerrar la app y volver a intentarlo).
 */
export interface MatchState {
  seed: number
  minute: number
  /** Índice de la posesión actual dentro de `schedule`. */
  play: number
  /** Minutos en los que ocurre cada posesión. */
  schedule: number[]
  home: MatchSide
  away: MatchSide
  phase: MatchPhase
  /** Estado intermedio de la posesión en curso (cadena de duelos). */
  chain: ChainState | null
  decision: Decision | null
  result: 'win' | 'draw' | 'loss' | null
  /** true si ya se emitió el descanso. */
  halftimeDone: boolean
  /** Retransmisión completa, en orden. */
  events: MatchEvent[]
  /** Nombres de los goleadores propios, para el resumen post-partido. */
  scorers: string[]
}

export interface ChainState {
  side: Side
  step: ChainStep
  /** uid del que lleva el balón. */
  carrier: string
  /**
   * uid del defensor de ESTE eslabón. Se fija al entrar en el eslabón y no se
   * vuelve a sortear: si se re-sorteara al confirmar la decisión, las
   * probabilidades que enseñan los botones no serían las del duelo real.
   */
  defenderUid: string
  /** Bonus acumulado por encadenar duelos ganados en la misma jugada. */
  momentum: number
  /**
   * Espíritu invocado para ESTE duelo. Se invoca primero y luego eliges la
   * técnica, así que el multiplicador tiene que sobrevivir a la reconstrucción
   * de la decisión.
   */
  spirit?: { uid: string; power: number }
}

// ---------------------------------------------------------------------------
// Torneo (la capa roguelite)
// ---------------------------------------------------------------------------

/**
 * Casillas del mapa, calcadas en espíritu a las del roguelike Pokémon:
 *   pachanga ≈ combate salvaje   ·  jefe ≈ gimnasio
 *   objeto/tecnica ≈ objeto       ·  ojeador ≈ captura
 *   descanso ≈ centro Pokémon     ·  tienda ≈ tienda
 */
export type NodeKind =
  | 'pachanga' | 'objeto' | 'tecnica' | 'ojeador' | 'rairai' | 'tienda' | 'evento' | 'jefe' | 'final'

export interface TournamentNode {
  id: string
  kind: NodeKind
  /** Capa del mapa (0 = salida) y columna dentro de la capa. */
  layer: number
  col: number
  /** Instituto rival (jefes, final y pachangas). */
  teamId?: string
  /** Nivel medio del rival. */
  level?: number
  title: string
  subtitle: string
  reward: string
  /**
   * Casillas de la capa siguiente a las que se puede saltar desde esta. Igual
   * que en el mapa del roguelike Pokémon: no eliges «una casilla de la capa»,
   * eliges un CAMINO, y desde dónde estás depende a dónde puedes ir.
   */
  next: string[]
  /** Ya jugada. */
  cleared?: boolean
  /** Contenido ya sorteado al generar el mapa (para que la previa no mienta). */
  itemId?: string
  techniqueId?: string
  /** Situación de la casilla de evento (id de `EVENTS`). */
  eventId?: string
  /** Casilla arriesgada: rival más fuerte, premio doble. */
  risky?: boolean
}

/** Mapa completo de una partida: capas de casillas conectadas en cadena. */
export interface InazumaMap {
  /** Ids de casilla por capa. */
  layers: string[][]
  nodes: Record<string, TournamentNode>
  totalLayers: number
}

/**
 * Tramo del mapa: las capas que van desde el jefe anterior hasta el siguiente.
 * Se pinta UNA PANTALLA POR TRAMO, igual que en el roguelike Pokémon.
 */
export interface MapSegment {
  index: number
  name: string
  start: number
  end: number
  boss: TournamentNode | null
}

/**
 * Carta de recompensa post-partido. Se ofrecen 3 y eliges 1 (el «draft» de
 * fichajes): es el momento en el que la partida se personaliza.
 */
export type DraftOption =
  | { kind: 'fichaje'; id: string; title: string; desc: string; playerId: string; level: number }
  | { kind: 'objeto'; id: string; title: string; desc: string; itemId: string }
  | { kind: 'entrenamiento'; id: string; title: string; desc: string; levels: number }
  | { kind: 'tecnica'; id: string; title: string; desc: string; techniqueId: string }
  | { kind: 'dinero'; id: string; title: string; desc: string; amount: number }
  | { kind: 'descanso'; id: string; title: string; desc: string }

// ---------------------------------------------------------------------------
// Objetos
// ---------------------------------------------------------------------------

export interface InazumaItem {
  id: string
  name: string
  desc: string
  price: number
  /** Atributo que mejora, aplicado en `effectiveStats`. */
  stat?: keyof Stats
  /**
   * Bonificación en PORCENTAJE, no en puntos.
   *
   * La primera versión daba puntos planos (+12, +14) y medido con el bot valía
   * exactamente cero: +12 sobre un atributo de 60 al empezar el torneo es un
   * +20 %, pero sobre los ~140 de la final es un +8 %… justo cuando por fin
   * tienes dinero para comprarlo. Un objeto tiene que valer lo mismo en la
   * primera ronda que en la última, así que escala con el jugador.
   */
  amount?: number
  /** Consumibles: se gastan al usarlos desde la plantilla. */
  consumable?: boolean
  kind: 'equipo' | 'consumible' | 'manual' | 'comida' | 'raro'
}

// ---------------------------------------------------------------------------
// Partida guardada
// ---------------------------------------------------------------------------

export type InazumaPhase =
  | 'title' | 'teamSelect' | 'setup' | 'map' | 'preview' | 'match' | 'pachanga' | 'result'
  | 'draft' | 'squad' | 'shop' | 'bag' | 'stats' | 'album' | 'evento' | 'victory' | 'gameover'

export interface InazumaSave {
  seed: number
  rngState: number
  /** Instituto con el que juegas. Define tu plantilla inicial y el cuadro. */
  teamId: string
  /** Mapa completo de la partida, generado al empezar. */
  map: InazumaMap
  /** Capa en la que estás. Avanza una casilla por elección. */
  layer: number
  /** Casilla en la que estás. `null` al empezar = puedes entrar por cualquiera
   *  de la primera capa. Define a dónde puedes ir (ver `next`). */
  currentNodeId: string | null
  /** Ids de casilla ya jugadas. */
  cleared: string[]
  roster: PlayerInstance[]
  /** uids del once titular, en orden POR, DEF…, MED…, DEL…. */
  lineup: string[]
  coins: number
  /** Partidos ganados / empatados / perdidos en esta partida. */
  record: [number, number, number]
  goalsFor: number
  goalsAgainst: number
  /** Ids de objeto en la mochila (sin equipar). */
  bag: string[]
  /** Supertécnicas encontradas y aún sin enseñar a nadie. */
  techniqueBag: string[]
  /** Formación del once (id de `FORMATIONS`). */
  formation: string
  /** Acumulado de la partida por jugador: goles, paradas, duelos… */
  playerStats: Record<string, PlayerStats>
  /**
   * Partido de jefe interrumpido en el descanso. Es la ÚNICA forma de guardar
   * a mitad de partido: se ofrece en el minuto 45 para no obligar a jugar 90
   * minutos del tirón en un móvil, y no permite esquivar derrotas porque el
   * marcador se guarda tal cual está.
   */
  pausedMatch?: { nodeId: string; rngState: number; match: MatchState }
  /** Resultado del último partido, para la pantalla de resumen y el draft. */
  lastMatch?: {
    rival: string
    score: [number, number]
    result: 'win' | 'draw' | 'loss'
    scorers: string[]
  }
  startedAt: number
  finishedAt?: number
}
