// CARÁCTER de cada luchador. No es decoración: cada rasgo es un bonus
// condicional que se activa por lo que pasa en el combate, así que dos
// luchadores con los mismos atributos se juegan distinto.
//
// Regla de diseño: todo rasgo tiene su condición y su contrapartida. Un
// «siempre +10 %» sería un atributo disfrazado; lo que queremos es que elegir
// a quién llevas cambie CÓMO peleas, no solo cuánto pegas.
import type { StatKey } from '@/engine/dragon/types'

export type TraitId =
  | 'orgulloso' | 'protector' | 'temerario' | 'sereno'
  | 'competitivo' | 'frio' | 'noble' | 'astuto'

export interface Trait {
  id: TraitId
  name: string
  desc: string
  /** Cuándo se enciende (lo comprueba `traitBonus` en el motor). */
  when: 'hpBajo' | 'hpAlto' | 'companeroCaido' | 'transformado' | 'rivalFuerte' | 'primerAsalto' | 'siempre'
  /** Multiplicadores mientras esté encendido. */
  mult: Partial<Record<StatKey, number>>
  /** Ki extra por turno mientras esté encendido. */
  ki?: number
}

export const TRAITS: Trait[] = [
  {
    id: 'orgulloso',
    name: 'Orgulloso',
    desc: 'Cuanto más fuerte es el rival, más se crece. +15 % de poder y ki contra quien le saque nivel.',
    when: 'rivalFuerte',
    mult: { poder: 1.15, ki: 1.15 },
  },
  {
    id: 'protector',
    name: 'Protector',
    desc: 'Si cae un compañero, se vuelve un muro: +25 % de defensa y aguante el resto del combate.',
    when: 'companeroCaido',
    mult: { defensa: 1.25, aguante: 1.25 },
  },
  {
    id: 'temerario',
    name: 'Temerario',
    desc: 'Al borde de la muerte pega como nunca: +30 % de poder por debajo de un tercio de vida.',
    when: 'hpBajo',
    mult: { poder: 1.3 },
  },
  {
    id: 'sereno',
    name: 'Sereno',
    desc: 'Administra el ki sin despeinarse: +6 de ki por turno, siempre.',
    when: 'siempre',
    mult: {},
    ki: 6,
  },
  {
    id: 'competitivo',
    name: 'Competitivo',
    desc: 'Sale enchufado: +20 % de velocidad mientras conserva más de la mitad de la vida.',
    when: 'hpAlto',
    mult: { velocidad: 1.2 },
  },
  {
    id: 'frio',
    name: 'Calculador',
    desc: 'Estudia al rival desde el primer cruce: +25 % de ki en el asalto de apertura.',
    when: 'primerAsalto',
    mult: { ki: 1.25 },
  },
  {
    id: 'noble',
    name: 'Noble',
    desc: 'No pelea por él: mientras siga en pie con más de media vida, +12 % a todo.',
    when: 'hpAlto',
    mult: { poder: 1.12, ki: 1.12, defensa: 1.12 },
  },
  {
    id: 'astuto',
    name: 'Astuto',
    desc: 'Saca partido de la transformación: +20 % de poder y +4 de ki por turno mientras esté transformado.',
    when: 'transformado',
    mult: { poder: 1.2 },
    ki: 4,
  },
]

const BY_ID = new Map(TRAITS.map((t) => [t.id, t]))

export function getTrait(id: string): Trait | undefined {
  return BY_ID.get(id as TraitId)
}

/**
 * VÍNCULOS entre luchadores. Pelear juntos los refuerza: si los dos están en
 * el equipo, ambos reciben el bonus. Son los del anime, no combinaciones al
 * azar — por eso Goku y Krilín valen más juntos que por separado.
 */
export interface Bond {
  a: string
  b: string
  name: string
  desc: string
  mult: Partial<Record<StatKey, number>>
}

export const BONDS: Bond[] = [
  { a: 'goku', b: 'krilin', name: 'Escuela Tortuga', desc: 'Se criaron entrenando juntos.', mult: { poder: 1.08, velocidad: 1.08 } },
  { a: 'goku', b: 'vegeta', name: 'Rivalidad saiyan', desc: 'Ninguno soporta quedar por debajo del otro.', mult: { poder: 1.12, ki: 1.12 } },
  { a: 'goku', b: 'gohan', name: 'Padre e hijo', desc: 'Gohan da lo que no sabe que tiene cuando su padre mira.', mult: { ki: 1.12, aguante: 1.08 } },
  { a: 'piccolo', b: 'gohan', name: 'El maestro', desc: 'Lo entrenó un año entero en el desierto.', mult: { defensa: 1.12, ki: 1.1 } },
  { a: 'krilin', b: 'a18', name: 'Lo imposible', desc: 'Nadie apostaba por ellos dos.', mult: { velocidad: 1.1, defensa: 1.1 } },
  { a: 'ten', b: 'chaoz', name: 'Inseparables', desc: 'Uno no pelea sin el otro.', mult: { poder: 1.1, ki: 1.1 } },
  { a: 'vegeta', b: 'trunks', name: 'Sangre real', desc: 'El príncipe y su heredero.', mult: { poder: 1.1, velocidad: 1.08 } },
  { a: 'gohan', b: 'videl', name: 'Compañeros', desc: 'Le enseñó a volar y algo más.', mult: { velocidad: 1.1, aguante: 1.08 } },
  { a: 'goku', b: 'yamcha', name: 'Viejos amigos', desc: 'Del desierto a la Patrulla Roja.', mult: { velocidad: 1.08, aguante: 1.06 } },
  { a: 'piccolo', b: 'dende', name: 'Namekianos', desc: 'Los últimos de su planeta.', mult: { ki: 1.1, defensa: 1.06 } },
]

/** Vínculos activos con el equipo que llevas. */
export function bondsFor(baseId: string, team: string[]): Bond[] {
  return BONDS.filter(
    (v) => (v.a === baseId && team.includes(v.b)) || (v.b === baseId && team.includes(v.a)),
  )
}

/** Carácter de cada personaje. Los que no aparecen no tienen rasgo. */
export const TRAIT_BY_FIGHTER: Record<string, TraitId> = {
  goku: 'competitivo',
  vegeta: 'orgulloso',
  piccolo: 'frio',
  gohan: 'temerario',
  krilin: 'astuto',
  yamcha: 'temerario',
  ten: 'sereno',
  chaoz: 'noble',
  trunks: 'protector',
  a18: 'frio',
  dende: 'noble',
  videl: 'competitivo',
  yajirobe: 'astuto',
  // --- rivales ---
  // TODOS llevan rasgo: si el jugador tiene cuatro luchadores con carácter y
  // los enemigos de relleno ninguno, el equilibrio se va solo (medido: el bot
  // que juega bien pasaba del 23 % al 37 % de runs ganadas).
  saibaman: 'temerario',
  soldado: 'competitivo',
  cui: 'astuto',
  dodoria: 'protector',
  a19: 'frio',
  vegeta_saiyan: 'orgulloso',
  freezer: 'frio',
  cell: 'astuto',
  buu: 'temerario',
  nappa: 'temerario',
  raditz: 'orgulloso',
  zarbon: 'astuto',
  ginyu: 'competitivo',
  recoome: 'protector',
  a17: 'competitivo',
  dabura: 'orgulloso',
  majin_vegeta: 'temerario',
}
