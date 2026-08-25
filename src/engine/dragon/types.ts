// Tipos del roguelite de Dragon Ball. Igual que Cyber/Inazuma, el juego vive
// aislado: nada de aquí se importa desde el roguelike de Pokémon ni al revés.
//
// La idea rectora: **el combate se gana administrando ki, no eligiendo el
// ataque más fuerte**. Todo lo caro (técnicas, transformaciones, empujar en un
// choque de rayos) sale del mismo depósito, y llenarlo exige bajar la guardia.

/** Escuela de combate. Triángulo suave: bruto ▶ técnico ▶ ki ▶ bruto. */
export type Style = 'bruto' | 'tecnico' | 'ki'

/** Estirpe. Manda en el Zenkai y en qué transformaciones puedes aprender. */
export type Lineage = 'saiyan' | 'terricola' | 'namek' | 'androide' | 'majin' | 'dios'

export interface Stats {
  /** Ataque cuerpo a cuerpo. */
  poder: number
  /** Ataque de energía: potencia las técnicas y el empuje en los choques. */
  ki: number
  defensa: number
  velocidad: number
  /** Sale los PS máximos. */
  aguante: number
}

export type StatKey = keyof Stats

/** Naturaleza de una técnica: decide con qué atributo pega y si puede chocar. */
export type TechKind = 'fisica' | 'energia' | 'apoyo'

export interface Technique {
  id: string
  name: string
  kind: TechKind
  style: Style
  /** Potencia bruta. 0 en las de apoyo. */
  power: number
  /** Ki que cuesta lanzarla. */
  cost: number
  /** Nº de golpes (el Puño Múltiple pega 3 veces a potencia repartida). */
  hits?: number
  /** Probabilidad 0-1 de aturdir (pierde el turno siguiente). */
  stun?: number
  /** Se cura este % de los PS máximos al usarla. */
  heal?: number
  /** Sube estos atributos (multiplicador) hasta el fin del combate. */
  buff?: Partial<Record<StatKey, number>>
  /** Baja estos atributos del rival hasta el fin del combate. */
  debuff?: Partial<Record<StatKey, number>>
  /** % de los PS MÁXIMOS propios que cuesta usarla (técnicas suicidas). */
  recoil?: number
  /** Ignora la guardia del rival. */
  pierce?: boolean
  desc: string
}

export interface Transformation {
  id: string
  name: string
  /** Multiplicadores sobre los atributos mientras esté activa. */
  mult: Partial<Record<StatKey, number>>
  /** Ki que cuesta activarla. */
  cost: number
  /** Ki que drena cada turno. Si no puedes pagarlo, se te cae. */
  upkeep: number
  /** % de PS máximos que te quema cada turno (Kaio-ken). */
  burn?: number
  /** Solo estas estirpes pueden aprenderla. */
  lineage?: Lineage[]
  /** Nivel mínimo para que pueda despertar (ver `checkAwakenings`). */
  unlock?: number
  /**
   * Color del aura. Es lo que hace que una transformación se DISTINGA de otra
   * de un vistazo aunque no haya retrato de esa forma concreta: el dorado del
   * Superguerrero no se confunde con el azul del ki divino.
   */
  aura?: string
  /**
   * Forma que hay que haber despertado ANTES. Convierte la lista de
   * transformaciones en un árbol: a Superguerrero 2 no se llega sin pasar por
   * Superguerrero, y el Kaio-Ken ×3 no existe sin el ×2.
   */
  requires?: string
  desc: string
}

/** Ficha de catálogo de un luchador (los datos, no la instancia en juego). */
export interface FighterData {
  id: string
  name: string
  lineage: Lineage
  style: Style
  /** Atributos a nivel 1. La subida de nivel escala sobre esto. */
  base: Stats
  /** Técnicas que sabe de salida. */
  techniques: string[]
  /** Técnicas que aprende al llegar a estos niveles. */
  learn?: { level: number; tech: string }[]
  /** Transformaciones disponibles (se desbloquean por trigger, ver `unlocks`). */
  forms?: string[]
  /** Color de la carta cuando no hay retrato. */
  color: string
  /** Power level narrativo de referencia (solo cosmético, ver `powerLevel`). */
  plBase?: number
}

/** Un luchador CONCRETO de tu equipo, con su progreso. */
export interface Fighter {
  uid: string
  baseId: string
  name: string
  lineage: Lineage
  style: Style
  level: number
  /** Atributos permanentes ganados por Zenkai/entrenamiento, en multiplicador. */
  zenkai: number
  /** PS actuales fuera de combate (0 = KO, hay que revivirlo). */
  hp: number
  techniques: string[]
  /**
   * Nivel de cada técnica (0 = de serie, 1 = V2, 2 = V3…). Sube potencia y
   * abarata el coste; lo mueven los maestros del mapa.
   */
  techLevels?: Record<string, number>
  /** Transformaciones YA desbloqueadas (las de `forms` empiezan bloqueadas). */
  forms: string[]
  /** Objeto equipado. */
  item?: string
  /**
   * Combates ganados con el objeto puesto. Cada `ITEM_XP_PER_LEVEL` sube su
   * nivel y refuerza sus multiplicadores: el equipo que te acompaña toda la
   * run acaba valiendo más que el que acabas de comprar.
   */
  itemXp?: number
  color: string
  plBase: number
}

// ---------------------------------------------------------------- combate ---

/** Lo que puede hacer un luchador en su turno. */
export type ActionKind = 'golpe' | 'tecnica' | 'cargar' | 'guardia' | 'transformar' | 'objeto' | 'nada'

export interface Action {
  kind: ActionKind
  /** id de técnica, de transformación o de objeto según el `kind`. */
  id?: string
}

/** Estado de un luchador DENTRO del combate. */
export interface Combatant {
  uid: string
  /** Id de catálogo: con él la UI encuentra el retrato. */
  baseId: string
  name: string
  lineage: Lineage
  style: Style
  level: number
  color: string
  plBase: number
  /** Atributos ya resueltos (nivel + zenkai + objeto), SIN transformación. */
  stats: Stats
  hp: number
  hpMax: number
  ki: number
  kiMax: number
  techniques: string[]
  techLevels?: Record<string, number>
  forms: string[]
  /** Transformación activa. */
  form?: string
  /** Multiplicadores temporales acumulados por buffs/debuffs. */
  mods: Partial<Record<StatKey, number>>
  /** Está en guardia (se resuelve al recibir el golpe). */
  guarding: boolean
  /** Se pasa el turno aturdido. */
  stunned: boolean
  /** Cargó el turno pasado: recibe más daño. */
  exposed: boolean
  /** Ya usó una técnica de apoyo (la IA no las encadena). */
  buffed?: boolean
  /** Entró de relevo tras ver caer a un compañero. */
  raging?: boolean
  /** Carácter (ver data/dragon/personalities.ts). */
  trait?: string
  /** Multiplicadores fijos por vínculos con el equipo que llevas. */
  bond?: Partial<Record<StatKey, number>>
  /** Ha visto caer a un compañero (enciende el rasgo Protector). */
  sawFall?: boolean
  item?: string
  fainted: boolean
}

export type Side = 'aliado' | 'rival'

/** Eventos que emite el motor para que la UI los reproduzca en orden. */
export type BattleEvent =
  | { t: 'turn'; n: number }
  | { t: 'action'; side: Side; uid: string; kind: ActionKind; name?: string }
  | { t: 'damage'; side: Side; uid: string; amount: number; crit?: boolean; eff?: number }
  | { t: 'heal'; side: Side; uid: string; amount: number }
  | { t: 'ki'; side: Side; uid: string; amount: number }
  | { t: 'guard'; side: Side; uid: string }
  | { t: 'transform'; side: Side; uid: string; form: string; name: string }
  | { t: 'formEnd'; side: Side; uid: string; reason: 'ki' | 'ko' }
  | { t: 'stun'; side: Side; uid: string }
  | { t: 'buff'; side: Side; uid: string; text: string }
  | { t: 'clash'; winner: Side | 'empate'; margin: number }
  | { t: 'faint'; side: Side; uid: string }
  | { t: 'switch'; side: Side; uid: string; name: string }
  | { t: 'zenkai'; uid: string; name: string }
  | { t: 'text'; text: string }
  | { t: 'end'; win: boolean }

/** En qué punto está el combate. */
export type BattlePhase = 'idle' | 'decision' | 'finished'

/** Una de las cosas que puedes elegir en un momento clave. */
export interface DecisionOption {
  id: string
  label: string
  desc?: string
  /** Ki que cuesta (0 o ausente = gratis). */
  cost?: number
  /**
   * 0-1: cómo de bien pinta la jugada. Se calcula SIN gastar RNG para que la
   * UI pueda pintar las estrellas antes de tirar, igual que en Inazuma — si se
   * tirase aquí, el combate dejaría de ser reproducible por semilla.
   */
  chance: number
  disabled?: boolean
  /** Etiqueta corta destacada («CHOQUE», «LÍMITE»…). */
  tag?: string
  /** Lo que ejecuta de verdad. */
  action: Action
}

/** Momento clave: el motor PARA aquí y espera. */
export interface Decision {
  kind: 'jugada' | 'choque' | 'relevo'
  headline: string
  desc?: string
  actorUid: string
  rivalUid: string
  /**
   * DEFENDIÉNDOTE de un choque: la técnica que el rival ya ha decidido lanzar.
   * No es una estimación, es lo que va a pasar.
   */
  rivalTech?: string
  options: DecisionOption[]
}

export interface Battle {
  seed: number
  rngState: number
  turn: number
  allies: Combatant[]
  enemies: Combatant[]
  /** Índice del activo en cada bando. */
  active: number
  enemyActive: number
  /** Retransmisión completa, en orden. La UI la revela a su ritmo. */
  log: BattleEvent[]
  phase: BattlePhase
  /** Momento clave en curso. */
  decision: Decision | null
  /**
   * Asalto: cada cuántos intercambios te toca decidir. Entre decisiones, el
   * combate se juega solo — es el patrón de Inazuma, donde no decides cada
   * balón sino los que importan.
   */
  round: number
  /** Acción ya elegida por el jugador, pendiente de resolver contra el rival. */
  chosen?: Action
  /** Acción del rival ya decidida, congelada mientras se pregunta el choque. */
  foeChosen?: Action
  /** Ki extra que el jugador ha decidido meter en el choque de rayos. */
  push?: number
  /** Objetos disponibles en el combate (id → unidades). Se consumen aquí. */
  bag: Record<string, number>
  over: boolean
  win?: boolean
  /** Jefe multifase: fase actual y las transformaciones que encadena al caer. */
  bossPhase: number
  phases?: string[]
  /** Nombre del combate (para la UI). */
  title: string
  /** Escenario de fondo. */
  scene: string
  /** Modo automático: el motor resuelve tus turnos con la IA. */
  auto: boolean
}
