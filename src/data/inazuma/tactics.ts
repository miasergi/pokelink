// FILOSOFÍAS DE EQUIPO: lo que hace que dos partidas se sientan distintas.
//
// Hasta ahora todo lo que se ganaba en una run eran NÚMEROS por jugador (+30 %
// de tiro, un nivel, una rareza). Se acumulaba, pero el equipo nunca llegaba a
// ser *algo*: no había una partida en la que dijeras «este año somos el equipo
// de los tiros de fuera» o «este año no nos marcan».
//
// Una filosofía NO es un porcentaje más: cambia CÓMO se resuelve el partido —
// cuándo hay contraataque, cuánto castiga la distancia, si el balón vuelve
// tras un robo, cuánto aguanta la gente. Se eligen en el mapa y se acumulan
// durante toda la partida.
//
// Cada una lleva su `effect`, un puñado de palancas que el motor lee en el
// punto exacto donde toca (ver `tacticEffects` en `roster.ts` y sus usos en
// `match.ts`). Añadir una filosofía nueva es añadir su palanca aquí y leerla
// donde corresponda: NADA de casos especiales repartidos por el motor.
import type { Element } from '@/engine/inazuma/types'

/**
 * Palancas que una filosofía puede mover. Todas son MULTIPLICADORES o
 * PROBABILIDADES que ya existían en el motor: la gracia es que ahora se pueden
 * tocar, no que haya reglas nuevas escondidas.
 */
export interface TacticEffect {
  /** Sesgo del atacante en cada eslabón (×). Sube el ataque o lo baja. */
  attackBias?: Partial<Record<'construccion' | 'penetracion' | 'definicion', number>>
  /** Sesgo del DEFENSOR en cada eslabón (×): sube la potencia del que corta. */
  defendBias?: Partial<Record<'construccion' | 'penetracion' | 'definicion', number>>
  /** Probabilidad EXTRA de contraataque al robar (suma a la base). */
  counterChance?: number
  /** Probabilidad de RECUPERAR el balón al instante tras perder un duelo. */
  reclaimChance?: number
  /** Multiplicador del desgaste de aguante de los tuyos (0.8 = aguantan más). */
  staminaDrain?: number
  /** Multiplicador de la Ruptura ganada: llena antes la Supervibración. */
  burstGain?: number
  /** Multiplicador del castigo por distancia del tiro lejano (>1 = castiga menos). */
  longShotRelief?: number
  /** Multiplicador del coste en PT de TUS supertécnicas. */
  ptCost?: number
  /** Bonus a la ventaja elemental (0.15 = las ventajas pegan más). */
  elementEdge?: number
  /** Momentum extra por cada duelo ganado en la misma jugada. */
  momentumStep?: number
  /** Bonus de potencia cuando vas POR DEBAJO en el marcador. */
  comebackBoost?: number
  /** El PASE deja de gastarse: se puede pasar más de una vez por posesión. */
  freePassing?: boolean
  /** Elemento al que esta filosofía le da un plus de potencia. */
  elementAffinity?: { element: Element; power: number }
}

export interface Tactic {
  id: string
  name: string
  desc: string
  /** Icono (de `Icon.tsx`) para la chapa. */
  icon: string
  /** Color de la chapa. */
  color: string
  effect: TacticEffect
}

export const TACTICS: Tactic[] = [
  {
    id: 'gegenpressing',
    name: 'Presión tras pérdida',
    desc: 'Al perder un duelo, 22 % de recuperar el balón en el sitio. El rival nunca respira.',
    icon: 'bolt',
    color: '#f97316',
    effect: { reclaimChance: 0.22 },
  },
  {
    id: 'catenaccio',
    name: 'Cerrojo',
    desc: 'Cortar es más fácil en todo el campo, pero salir jugando cuesta más.',
    icon: 'shield',
    color: '#64748b',
    effect: {
      defendBias: { construccion: 1.12, penetracion: 1.18, definicion: 1.12 },
      attackBias: { construccion: 0.94 },
    },
  },
  {
    id: 'contragolpe',
    name: 'Contragolpe',
    desc: 'Robar el balón dispara un contraataque mucho más a menudo (+24 %).',
    icon: 'arrowRight',
    color: '#22c55e',
    effect: { counterChance: 0.24 },
  },
  {
    id: 'escuela-tiro',
    name: 'Escuela de tiro lejano',
    desc: 'La distancia castiga mucho menos: disparar de fuera pasa a ser una jugada de verdad.',
    icon: 'shoot',
    color: '#f43f5e',
    effect: { longShotRelief: 1.28 },
  },
  {
    id: 'fondo-fisico',
    name: 'Fondo físico',
    desc: 'Los tuyos se cansan un 30 % menos: llegáis enteros al tramo final.',
    icon: 'dumbbell',
    color: '#84cc16',
    effect: { staminaDrain: 0.7 },
  },
  {
    id: 'vibracion',
    name: 'Vibración colectiva',
    desc: 'La barra de Ruptura sube un 55 % más rápido. Supervibración casi cada jugada buena.',
    icon: 'bolt',
    color: '#a855f7',
    effect: { burstGain: 1.55 },
  },
  {
    id: 'futbol-total',
    name: 'Fútbol total',
    desc: 'Se puede pasar TODAS las veces que quieras en una misma jugada, no solo una.',
    icon: 'jersey',
    color: '#0ea5e9',
    effect: { freePassing: true },
  },
  {
    id: 'toque',
    name: 'Toque y paciencia',
    desc: 'Cada duelo ganado en una jugada empuja más al siguiente: las jugadas largas matan.',
    icon: 'ball',
    color: '#eab308',
    effect: { momentumStep: 0.06 },
  },
  {
    id: 'academia',
    name: 'Academia técnica',
    desc: 'Tus supertécnicas cuestan un 20 % menos de PT. Se lanzan muchas más por partido.',
    icon: 'book',
    color: '#38bdf8',
    effect: { ptCost: 0.8 },
  },
  {
    id: 'furinkazan',
    name: 'Fūrinkazan',
    desc: 'Las ventajas de elemento pegan bastante más fuerte. Emparejar bien decide el partido.',
    icon: 'fire',
    color: '#fb7185',
    effect: { elementEdge: 0.18 },
  },
  {
    id: 'remontada',
    name: 'Espíritu de remontada',
    desc: 'Yendo por detrás en el marcador, los tuyos pegan un 18 % más fuerte.',
    icon: 'star',
    color: '#f59e0b',
    effect: { comebackBoost: 0.18 },
  },
  {
    id: 'muro',
    name: 'El muro',
    desc: 'Bajo palos y en el área se defiende mucho mejor: los disparos rivales se estrellan.',
    icon: 'glove',
    color: '#14b8a6',
    effect: { defendBias: { definicion: 1.22 } },
  },
]

export const TACTIC_BY_ID = new Map(TACTICS.map((t) => [t.id, t]))

export function getTactic(id: string): Tactic | undefined {
  return TACTIC_BY_ID.get(id)
}
