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
  /** Transformaciones YA desbloqueadas (las de `forms` empiezan bloqueadas). */
  forms: string[]
  /** Objeto equipado. */
  item?: string
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
  /** Ya usó la Semilla del Ermitaño en este combate. */
  seedUsed: boolean
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

/** Momento en que el motor PARA y espera al jugador. */
export type Pending =
  | { kind: 'accion' }
  /** Choque de rayos: cuánto ki extra empujas. */
  | { kind: 'choque'; enemyTech: string; myTech: string }
  /** Se te ha debilitado el luchador: elige relevo. */
  | { kind: 'relevo' }

export interface Battle {
  seed: number
  rngState: number
  turn: number
  allies: Combatant[]
  enemies: Combatant[]
  /** Índice del activo en cada bando. */
  active: number
  enemyActive: number
  log: BattleEvent[]
  pending?: Pending
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
  /** Jefe multifase: fase actual y definición de las siguientes. */
  phase: number
  phases?: string[]
  /** Nombre del combate (para la UI). */
  title: string
  /** Escenario de fondo. */
  scene: string
  /** Modo automático: el motor resuelve tus turnos con la IA. */
  auto: boolean
}
