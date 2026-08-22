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
  /**
   * ÉPOCA. Ausente = saga clásica (IE1-IE3). `'vr'` = Victory Road y `'go'` =
   * Inazuma Eleven GO: sus técnicas solo se reparten entre jugadores de esa
   * región, para que el relleno de cadenas no le cuelgue una técnica de otra
   * época a Mark Evans (ni una de los 2000 a los chavales nuevos).
   */
  era?: 'vr' | 'go'
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
  /**
   * Técnicas con las que un RIVAL sale al campo. Tu plantilla NO las hereda:
   * tus jugadores empiezan sin supertécnicas y las despiertan por el camino
   * (ver `signature` y las casillas de firma).
   */
  techniques: string[]
  /**
   * Cadena de técnicas CARACTERÍSTICAS, en orden: lo que este jugador puede
   * despertar en las casillas de firma (Mark Evans: Mano Celestial → Mano
   * Demoníaca → Mano Infinita). Generada por `emit-inazuma-players.mjs`.
   */
  signature?: string[]
  /**
   * PESO DEL PERSONAJE EN LA SERIE (1 = relleno de plantilla, 5 = leyenda).
   *
   * OJO: esto NO es la rareza que ves en el juego. La rareza (Normal,
   * Avanzado, Ídolo, Legendario) va de 1 a 4, vive en `PlayerInstance.rarity`,
   * empieza SIEMPRE en Normal para lo que fichas y sube con medallas. Esto de
   * aquí es otra cosa: cuánto pinta el personaje en la serie, y solo decide
   * con qué frecuencia lo ofrece el ojeador, lo que cuesta traspasarlo y si
   * sale de titular en SU equipo. Se llamaba `rarity` y las dos escalas se
   * confundían constantemente.
   */
  fame: 1 | 2 | 3 | 4 | 5
  /** Slug del retrato en `public/inazuma/players/<slug>.webp`. Opcional. */
  portrait?: string
}

/** Un jugador concreto de TU plantilla, con su progresión de la partida. */
export interface PlayerInstance {
  uid: string
  baseId: string
  level: number
  /**
   * RAREZA dinámica (1 bronce · 2 plata · 3 oro · 4 multicolor). Manda sobre
   * los atributos y los pasos de cadena alcanzables.
   * Ausente en saves viejos: `rarityOf` cae a la rareza de catálogo.
   */
  rarity?: number
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
  /** LESIONADO: no puede jugar ni subir de nivel hasta pasar por el fisio
   * (objeto/casilla) o terminar un partido oficial. La regla que lesiona es
   * una sola: AGOTARSE — quedarse a 0 de aguante, entrenando o jugando. */
  injured?: boolean
  /**
   * VÍNCULO del INICIAL: % extra a todos los atributos, que crece +1 por
   * partido jugado (tope 15). Solo lo tiene el jugador con el que fundaste
   * el club — el cariño, con mecánica (como el lazo del inicial en Pokémon).
   */
  bond?: number
}

export const TECHNIQUE_SLOTS = 4
/** FÚTBOL 5: el once pasa a ser un CINCO (portero + 4 de campo). */
export const SQUAD_SIZE = 5

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
/** Titulares + suplentes: 5 del cinco + 3 de banquillo. Se EMPIEZA con 1
 * (tu inicial) y el resto se recluta — el arco de «de la nada al Frontier». */
export const ROSTER_MAX = 8

// ---------------------------------------------------------------------------
// Institutos rivales
// ---------------------------------------------------------------------------

export interface TeamBase {
  id: string
  name: string
  /** Color principal del escudo/uniforme (hex). */
  color: string
  /** Colores de la CAMISETA (principal y secundario), para el césped. */
  kit?: [string, string]
  element: Element
  /** Frase del entrenador rival antes del partido. */
  taunt?: string
  /** Ids de `PlayerBase` que forman su once. Se rellena si faltan. */
  lineup: string[]
  /** Multiplicador de dificultad sobre el nivel del rival. */
  power: number
  /**
   * FILOSOFÍA CANÓNICA del instituto (id de `TACTICS`): su forma de jugar.
   * El rival sale al campo con ella — los equipos no son sacos de números,
   * tienen identidad, igual que tú vas acumulando las tuyas.
   */
  tactic?: string
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
  | {
    kind: 'possession'; minute: number; side: Side; text: string
    /** Si la posesión es un PASE, quién lo da y quién lo recibe (cinemática). */
    passFromUid?: string; passToUid?: string
  }
  | { kind: 'duel'; minute: number; side: Side; step: ChainStep; attacker: string; attackerUid: string; defender: string; defenderUid: string; technique?: string; counter?: string; element?: Element; effectiveness: number; success: boolean; /** Probabilidad REAL que tenía el atacante (transparencia de la mecánica). */ chance?: number; /** El disparo salió de LEJOS: el césped lo pinta desde su sitio. */ longShot?: boolean; /** Es el CRUCE de un defensa en la trayectoria, no el disparo final. */ intercept?: boolean; text: string }
  | {
    kind: 'goal'; minute: number; side: Side; scorer: string; scorerUid: string; technique?: string; score: [number, number]
    /** La técnica que el portero INTENTÓ y no bastó (para la frase de
        Chester; el momento en sí lo cuenta el evento `keeperTry` previo). */
    keeper?: string; keeperUid?: string; keeperTech?: string
  }
  /** EL MOMENTO DEL PORTERO: saca su técnica ANTES de saberse el veredicto.
      Se emite con el mismo compás pare o encaje — cero spoilers por ritmo. */
  | { kind: 'keeperTry'; minute: number; side: Side; keeper: string; keeperUid: string; technique: string; text: string }
  /** EL CHUT del tiro lejano, contado ANTES del cruce de la defensa: primero
      se dispara, luego el defensa se cruza — el orden en que pasa de verdad. */
  | { kind: 'longshotKick'; minute: number; side: Side; shooter: string; shooterUid: string; technique?: string; element?: Element; text: string }
  | {
    kind: 'save'; minute: number; side: Side; keeper: string; keeperUid: string; technique?: string; text: string
    /** Para el plano del paradón en la tele (`inazuma/keepers/<baseId>.png`). */
    keeperBaseId?: string
  }
  | { kind: 'turnover'; minute: number; side: Side; text: string }
  | { kind: 'burst'; minute: number; side: Side; text: string }
  | { kind: 'tactic'; minute: number; side: Side; tactic: string; name: string; text: string }
  | { kind: 'exhausted'; minute: number; player: string; text: string }
  /** LESIÓN en pleno partido: el jugador queda fuera de los lances (a la
      banda con su cruz); al descanso, fisio o cambio. */
  | { kind: 'injury'; minute: number; side: Side; player: string; playerUid: string; text: string }
  | { kind: 'halftime'; minute: number; score: [number, number] }
  | { kind: 'stage'; minute: number; stage: MatchStage; text: string }
  | { kind: 'penalty'; minute: number; side: Side; shooter: string; shooterUid: string; keeper: string; keeperUid: string; technique?: string; scored: boolean; text: string; shootout: [number, number] }
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
  /**
   * DEFENDIENDO: lo que el atacante viene a hacer — el nombre de su técnica, o
   * null si llega sin técnica. Se ve venir la jugada ANTES de decidir qué
   * gastar (la IA elige en el momento con la misma regla determinista con la
   * que se calculan las estrellas, así que esto no es una estimación: es lo
   * que va a pasar). En ataque no aplica (undefined).
   */
  rivalTech?: string | null
  rivalTechElement?: Element
  headline: string
  options: DecisionOption[]
}

/** Acumulado de un jugador a lo largo de la partida. */
export interface PlayerStats {
  goals: number
  saves: number
  duelsWon: number
  duelsLost: number
  matches: number  /** Veces que usó cada supertécnica (por NOMBRE), ganando el duelo. */
  techs?: Record<string, number>
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
  /** Rareza de la ronda (para la ficha y las estrellas de la previa). */
  rarity?: number
}

/**
 * Un jugador DENTRO de un partido, ya resuelto a números. Unifica tu plantilla
 * y la del rival para que el motor no tenga que saber de quién es cada uno.
 * Los tuyos conservan el `uid` de `PlayerInstance` para poder devolverles el
 * desgaste (PT y aguante) al terminar.
 */
export interface Actor {
  /** Rareza (1-4) para pintar su marco en césped y duelos. */
  rarity?: number
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
  /** Se ha LESIONADO en este partido: fuera del césped, no disputa lances. */
  injured?: boolean
  /** Mejoras del objeto «Mejora», por id de técnica. Solo las tuyas. */
  techLevels?: Record<string, number>
}

export interface MatchSide {
  name: string
  /** Filosofías del equipo (la tuya ARMADA; la canónica del rival). */
  tactics?: string[]
  /**
   * FILOSOFÍA ACTIVADA con la barra de Ruptura: sus efectos aplican mientras
   * queden acciones. Es la alternativa a la Supervibración — la barra se
   * gasta en una de las dos.
   */
  tacticActive?: { id: string; turns: number }
  color: string
  element: Element
  /** true en el lado que controla el usuario. */
  isPlayer: boolean
  keeper: Actor
  /** PAREJAS DE COMBO elegidas en el vestuario: técnica → uids preferidos.
   * Si el elegido no está en el campo, el motor auto-ajusta (canónico en
   * campo, y si no, el mejor compañero disponible). */
  comboPartners?: Record<string, string[]>
  defs: Actor[]
  mids: Actor[]
  fwds: Actor[]
  /** Suplentes (el RIVAL también viaja con banquillo y cambia al descanso). */
  bench?: Actor[]
  goals: number
  /**
   * Los que YA SALIERON del campo (sustituidos). Sin esta lista, el resumen
   * perdía sus goles y su MVP: `actorByUid` no los encontraba porque el cambio
   * los borra de las líneas, y la tarjeta desaparecía en silencio.
   */
  gone?: Actor[]
  /** Barra de Ruptura 0-100. A 100 se puede activar la Supervibración. */
  burst: number
  /** Acciones que quedan de Supervibración activa (0 = inactiva). */
  burstTurns: number
}

export type MatchPhase = 'playing' | 'decision' | 'finished'

/**
 * Cuánto decide el usuario en un partido:
 *  - auto: el banquillo lo juega todo (las decisiones existen pero se
 *    resuelven solas).
 *  - dinamico: paras en las jugadas con chicha (por defecto).
 *  - completo: TODAS las acciones son tuyas, duelo a duelo.
 */
export type DecisionMode = 'auto' | 'dinamico' | 'completo'

/**
 * Tramo del partido. Un partido de instituto NO puede acabar en tablas: si a
 * los 90 hay empate se juega prórroga, y si sigue el empate, penaltis.
 */
export type MatchStage = 'reglamentario' | 'prorroga' | 'penaltis'

/** Tanda de penaltis: tres cada uno y, si siguen igualados, muerte súbita. */
export interface ShootoutState {
  /** Penaltis ya lanzados, contando los de los dos equipos. */
  round: number
  /** Marcador de la tanda [local, visitante]. */
  goals: [number, number]
  /** Quién tira ahora mismo, mientras se espera tu decisión. */
  pending: { shooterUid: string; keeperUid: string; side: Side } | null
}

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
  /** Reglamentario, prórroga o penaltis. */
  stage: MatchStage
  /** Cuánto decide el usuario (ver `DecisionMode`). */
  decisionMode: DecisionMode
  /** Cambios que quedan (el descanso permite hasta 3). */
  subsLeft: number
  /** Sustituidos: YA no pueden volver a entrar (regla de fútbol de verdad). */
  subbedOut?: string[]
  /**
   * Todos los que han pisado el campo (once inicial + cambios): son los que
   * cobran los niveles COMPLETOS del partido, salgan o no en el once final.
   */
  participants?: string[]
  /** Tanda de penaltis, solo cuando `stage` es 'penaltis'. */
  shootout: ShootoutState | null
  /** Retransmisión completa, en orden. */
  events: MatchEvent[]
  /** Nombres de los goleadores propios, para el resumen post-partido. */
  scorers: string[]
}

export interface ChainState {
  /** SPRINT activado para este duelo: uid del que quema aguante (+20 %). */
  sprint?: { uid: string }
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
   * true si el usuario ha pasado el balón a propósito en esta posesión. El que
   * recibe se lo queda hasta el final de la jugada: si no, el motor volvía a
   * sortear quién la llevaba y el pase no cambiaba nada.
   */
  passed?: boolean
  /**
   * TIRO LEJANO: la jugada saltó de la penetración directamente al mano a
   * mano. La distancia penaliza la potencia del disparo (LONG_SHOT_MALUS).
   */
  longShot?: boolean
  /**
   * Potencia que le queda al TIRO LEJANO tras cruzarse con un defensa por el
   * camino: 1 = pasó limpio, <1 = le rozaron y llega desviado. Lo fija
   * `interceptLongShot`.
   */
  longShotPower?: number
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
  | 'pachanga' | 'objeto' | 'tecnica' | 'firma' | 'ojeador' | 'trade' | 'rairai' | 'tienda' | 'evento' | 'concentracion' | 'jefe' | 'final'
  // La RUEDA DE ENTRENAMIENTO (sustituye a las pachangas; 'pachanga' y
  // 'rairai' quedan en el tipo por los saves viejos, ya no se generan).
  | 'entrenamiento'

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
  /** Segundo objeto de la casilla de objeto (se elige uno de tres). */
  itemId2?: string
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
  | { kind: 'objeto'; id: string; title: string; desc: string; itemId: string; /** Precio en ₽: la carta se cobra al elegirla (0 o ausente = gratis). */ cost?: number }
  | { kind: 'entrenamiento'; id: string; title: string; desc: string; levels: number }
  | { kind: 'tecnica'; id: string; title: string; desc: string; techniqueId: string; toBag?: boolean }
  | { kind: 'dinero'; id: string; title: string; desc: string; amount: number }
  | { kind: 'descanso'; id: string; title: string; desc: string }
  /** FILOSOFÍA de equipo: la recompensa que define la identidad de la partida. */
  | { kind: 'tactica'; id: string; title: string; desc: string; tacticId: string }

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
  /** Solo surte efecto en jugadores de este ELEMENTO (emblemas). */
  element?: Element
  /** Solo surte efecto en jugadores de esta DEMARCACIÓN natural. */
  position?: Position
  /** +% a TODOS los atributos (brazalete, amuleto…). */
  all?: number
  /** +% al DEPÓSITO de PT (independiente del aguante). */
  ptPct?: number
  /** Retirado del catálogo activo: ni tienda ni botín, pero sigue
   * funcionando en las partidas que ya lo tienen. */
  legacy?: boolean
  kind: 'equipo' | 'consumible' | 'manual' | 'comida' | 'raro'
}

// ---------------------------------------------------------------------------
// Partida guardada
// ---------------------------------------------------------------------------

export type InazumaPhase =
  | 'title' | 'teamSelect' | 'setup' | 'map' | 'preview' | 'match' | 'pachanga' | 'result'
  | 'draft' | 'squad' | 'shop' | 'bag' | 'stats' | 'album' | 'evento' | 'firma' | 'trade' | 'entreno' | 'victory' | 'gameover'

/** Dificultad de la partida: cuánto nivel extra llevan TODOS los rivales. */
export type Difficulty = 'normal' | 'dificil' | 'leyenda'

/**
 * RANDOMIZADOR. Cada bandera desordena UNA cosa, para que se pueda subir el
 * caos poco a poco en vez de tener un botón de «todo loco». Calcado en espíritu
 * al del modo Pokémon (`RandomFlags` de `src/engine/run/types.ts`).
 */
export interface RandomFlags {
  /** Las plantillas RIVALES se sortean del pool en vez de ser las canónicas. */
  plantillas?: boolean
  /** El cuadro del torneo mezcla institutos de CUALQUIER época elegida. */
  cuadro?: boolean
  /** TU inicial se sortea del pool, y el ojeador trae solo 3 al azar (ni
   * canon del club ni Fichaje personalizado): caos también en tu lado. */
  inicial?: boolean
}

export interface InazumaSave {
  seed: number
  rngState: number
  /** Instituto con el que juegas. Define tu plantilla inicial y el cuadro. */
  teamId: string
  /** Dificultad elegida al empezar (ausente en partidas viejas = normal). */
  difficulty?: Difficulty
  /** Saga (región) de la partida: 'ff' clásica, 'alius' (IE2), 'ffi' (IE3). */
  saga?: 'ff' | 'alius' | 'ffi' | 'go' | 'vr'
  /** true si la plantilla inicial salió del bombo (modo aleatorio). */
  randomSquad?: boolean
  /** Nombre y escudo elegidos para el equipo del bombo. */
  /** TU INICIAL (id del catálogo): define el equipo CANON de tu club — el
   * ojeador siempre ofrece a uno de sus compañeros canónicos. */
  starterBaseId?: string
  /** PAREJAS DE COMBO del vestuario: técnica combinada → uids de la plantilla
   * que actuarán de compañeros (se auto-ajusta si no están en el campo). */
  comboPartners?: Record<string, string[]>
  customName?: string
  customCrest?: string
  /** Mapa completo de la partida, generado al empezar. */
  map: InazumaMap
  /** Capa en la que estás. Avanza una casilla por elección. */
  layer: number
  /** Casilla en la que estás. `null` al empezar = puedes entrar por cualquiera
   *  de la primera capa. Define a dónde puedes ir (ver `next`). */
  currentNodeId: string | null
  /**
   * FILOSOFÍAS del equipo, acumuladas durante la partida. Son lo que hace que
   * dos runs se sientan distintas: no dan números, cambian cómo se resuelve el
   * partido (ver `src/data/inazuma/tactics.ts`).
   */
  tactics?: string[]
  /**
   * ÉPOCAS de las que sale gente en esta partida (ojeador, recompensas y
   * fichajes). Vacío o ausente = solo la de tu saga. Multiselección: se puede
   * jugar el Football Frontier con fichajes del Mundial y de Victory Road.
   */
  pools?: ('ff' | 'alius' | 'ffi' | 'go' | 'vr')[]
  /**
   * FILOSOFÍAS ACTIVAS: subconjunto de `tactics` que sale al campo. Ausente =
   * todas las ganadas. Se configura en el vestuario — ganar una nueva ya no
   * interrumpe con un menú.
   */
  activeTactics?: string[]
  /**
   * La filosofía ARMADA: la que puedes ACTIVAR en el partido con la barra de
   * Ruptura (compite con la Supervibración por la misma barra). Se elige en
   * el vestuario entre las ganadas.
   */
  armedTactic?: string
  /** Randomizador de la partida (ver `RandomFlags`). */
  random?: RandomFlags
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
  /**
   * Últimos jugadores OFRECIDOS por el ojeador o llegados en intercambios:
   * no se repiten mientras sigan en esta lista (rota, se queda con ~20).
   * Sin ella, «siempre salen los mismos».
   */
  scoutSeen?: string[]
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
