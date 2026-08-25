// FUSIONES. Dos luchadores de tu equipo se convierten en uno solo, mucho más
// fuerte, para el resto del combate.
//
// Es la jugada más cara del juego a propósito: gastas DOS cuerpos (o sea, dos
// barras de vida y dos relevos) a cambio de uno muy superior. Si el fusionado
// cae, caen los dos, así que no es «pulsar para ganar»: es apostarlo todo a
// una carta cuando el combate se está torciendo.
import type { Stats } from '@/engine/dragon/types'

export interface FusionDef {
  id: string
  /** Los dos que se fusionan (por baseId, en cualquier orden). */
  a: string
  b: string
  name: string
  color: string
  /** Multiplicador sobre la MEDIA de los atributos de los dos. */
  mult: number
  techniques: string[]
  /** Ki que pone cada uno. */
  cost: number
  desc: string
}

export const FUSIONS: FusionDef[] = [
  {
    id: 'gotenks',
    a: 'goten', b: 'trunks_nino',
    name: 'Gotenks',
    color: '#c084fc',
    mult: 1.85,
    techniques: ['gigantica', 'multiforma', 'kamehameha'],
    cost: 35,
    desc: 'La danza más ridícula del universo y el resultado más insufrible.',
  },
  {
    id: 'gogeta',
    a: 'goku', b: 'vegeta',
    name: 'Gogeta',
    color: '#fde047',
    mult: 2.0,
    techniques: ['ult_kamehameha', 'gigantica', 'punodragon'],
    cost: 45,
    desc: 'Los dos saiyans más orgullosos, de acuerdo por una vez.',
  },
  {
    id: 'vegetto',
    a: 'goku', b: 'majin_vegeta',
    name: 'Vegetto',
    color: '#38bdf8',
    mult: 2.05,
    techniques: ['ult_kamehameha', 'resplandor', 'atomico'],
    cost: 48,
    desc: 'Los pendientes Potara. Esta no se deshace cuando te conviene.',
  },
  {
    id: 'piccolo_kami',
    a: 'piccolo', b: 'dende',
    name: 'Piccolo completo',
    color: '#22c55e',
    mult: 1.7,
    techniques: ['ult_makankosappo', 'regeneracion', 'muro'],
    cost: 32,
    desc: 'Las dos mitades del namekiano vuelven a ser una.',
  },
  {
    id: 'kefla',
    a: 'kale', b: 'caulifla',
    name: 'Kefla',
    color: '#22c55e',
    mult: 1.9,
    techniques: ['gigantica', 'resplandor', 'combo'],
    cost: 38,
    desc: 'Dos saiyans del Universo 6 y unos pendientes prestados.',
  },
]

/** La fusión que sale de estos dos, si existe. */
export function fusionOf(a: string, b: string): FusionDef | undefined {
  return FUSIONS.find(
    (f) => (f.a === a && f.b === b) || (f.a === b && f.b === a),
  )
}

/** Atributos del fusionado: la media de los dos, multiplicada. */
export function fusedStats(x: Stats, y: Stats, mult: number): Stats {
  return {
    poder: ((x.poder + y.poder) / 2) * mult,
    ki: ((x.ki + y.ki) / 2) * mult,
    defensa: ((x.defensa + y.defensa) / 2) * mult,
    velocidad: ((x.velocidad + y.velocidad) / 2) * mult,
    aguante: ((x.aguante + y.aguante) / 2) * mult,
  }
}
