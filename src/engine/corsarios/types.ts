// Tipos del modo Corsarios: gacha de tripulación + islas de 3-4 rivales.
// Es un juego de PROGRESO (no roguelike): la cuenta crece entre partidas y
// nada se pierde al caer en un combate.

/** Oficio del pirata. Triángulo: espada > puño > tirador > espada. */
export type Clase = 'espada' | 'puno' | 'tirador' | 'apoyo'

/** Rareza de la taberna: Común, Raro, Épico y Legendario. */
export type Rareza = 'C' | 'R' | 'E' | 'L'

export type SkillKind =
  | 'golpe'    // un objetivo, multiplicador alto
  | 'barrido'  // todos los rivales
  | 'doble'    // dos objetivos al azar
  | 'aturde'   // un objetivo + pierde su próximo turno
  | 'veneno'   // un objetivo + daño 3 turnos
  | 'cura'     // cura a todo el equipo
  | 'escudo'   // escudo a todo el equipo
  | 'rabia'    // se sube el ataque y golpea
  | 'remate'   // golpea al más débil; si lo tumba, recupera energía

export interface Skill {
  nombre: string
  kind: SkillKind
  /** Multiplicador sobre el ataque (daño, cura o escudo). */
  mult: number
  desc: string
}

/** Rasgos del retrato generado (SVG paramétrico, sin imágenes externas). */
export interface Look {
  piel: string
  pelo: string
  ropa: string
  sombrero: 'tricornio' | 'panuelo' | 'gorra' | 'ala' | 'corona' | 'capucha' | 'nada' | 'bicornio'
  barba?: 'corta' | 'larga' | 'bigote'
  parche?: boolean
  cicatriz?: boolean
  pendiente?: boolean
  melena?: boolean
  /** Imagen que sustituye al dibujo (la ponen los mods). */
  retrato?: string
}

export interface Stats { hp: number; atk: number; def: number; spd: number }

export interface PirataDef {
  id: string
  nombre: string
  apodo: string
  clase: Clase
  rareza: Rareza
  base: Stats
  skill: Skill
  look: Look
  /** Solo sale en la taberna tras vencerlo como jefe de esa isla (índice). */
  desbloqueaIsla?: number
  /** Línea de presentación al reclutarlo. */
  frase: string
}

/** Un pirata que tienes en la tripulación. */
export interface Tripulante {
  id: string
  nivel: number
  /** 1..5, sube con duplicados. */
  estrellas: number
  /** XP hacia el siguiente nivel (la ganan al pelear en la formación). */
  xp?: number
  /** uid de las piezas equipadas. */
  arma?: string
  amuleto?: string
}

/** Arma (sube el ataque) o amuleto (sube vida y defensa). */
export type TipoPieza = 'arma' | 'amuleto'

export interface Pieza {
  uid: string
  tipo: TipoPieza
  rareza: Rareza
  nombre: string
  /** Fracción que suma a la estadística (0.1 = +10%). */
  bonus: number
}

export interface Diario {
  dia: string
  victorias: number
  tiradas: number
  entrenos: number
  /** Índices de encargos ya cobrados hoy. */
  cobrados: number[]
}

/** Unidad en combate (aliada o rival). */
export interface Unidad {
  uid: string
  defId: string
  nombre: string
  clase: Clase
  rareza: Rareza
  look: Look
  skill: Skill
  nivel: number
  lado: 'a' | 'e'
  maxHp: number
  hp: number
  atk: number
  def: number
  spd: number
  energia: number
  escudo: number
  aturdido: number
  veneno: { turnos: number; dano: number } | null
  rabia: number
}

export interface Impacto {
  uid: string
  dano?: number
  cura?: number
  escudo?: number
  critico?: boolean
  ventaja?: boolean
  aturde?: boolean
  veneno?: boolean
  ko?: boolean
  /** HP tras el impacto, para que la UI no tenga que recalcular. */
  hp: number
  escudoRestante: number
}

export type Evento =
  | { t: 'ronda'; n: number }
  | { t: 'accion'; actor: string; especial: boolean; nombre: string; kind: SkillKind | 'basico'; impactos: Impacto[]; energia: number }
  | { t: 'aturdido'; actor: string }
  | { t: 'veneno'; impactos: Impacto[] }
  | { t: 'fin'; gana: 'a' | 'e' }

export interface Resultado {
  gana: 'a' | 'e'
  eventos: Evento[]
  inicial: Unidad[]
  /** Aliados en pie al terminar. */
  vivos: number
  rondas: number
}

export interface Fase {
  nombre: string
  /** Ids de PirataDef de los rivales (3-4) y su nivel. */
  rivales: { id: string; nivel: number }[]
  jefe?: boolean
}

export interface Isla {
  nombre: string
  lema: string
  color: string
  fases: Fase[]
}

export interface CorsariosSave {
  v: 1
  capitan: { nombre: string; clase: Exclude<Clase, 'apoyo'> }
  nivel: number
  xp: number
  doblones: number
  perlas: number
  tripulacion: Tripulante[]
  /** Formación: ids en orden (el capitán va siempre, con id 'capitan'). */
  formacion: string[]
  /** Estrellas por fase, clave `isla-fase`. */
  estrellas: Record<string, number>
  /** Tiradas de perlas sin Legendario (para la garantía). */
  piedad: number
  /** Fecha (AAAA-MM-DD) de la última tirada gratis de la taberna. */
  gratisDia: string
  seed: number
  combates: number
  creado: number
  /** Equipo del capitán (el resto lo lleva cada Tripulante). */
  equipoCapitan: { arma?: string; amuleto?: string }
  inventario: Pieza[]
  piezasSeq: number
  /** Mar Abierto: último piso superado (0 = ninguno). */
  marPiso: number
  /** Escenas ya vistas: 'tuto', 'isla-N', 'fin'. */
  vistos: string[]
  diario: Diario
  victorias: number
}
