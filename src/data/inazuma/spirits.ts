// ESPÍRITUS GUERREROS. La carta que te guardas para un duelo concreto.
//
// Se invocan UNA vez por partido y consumen la barra de Ruptura entera, así que
// compiten con la Supervibración por el mismo recurso: o tres acciones gratis,
// o un único duelo brutal. Esa es la decisión.
//
// Solo los llevan jugadores ★4-★5: es lo que separa a una estrella de un buen
// jugador cuando ambos llegan al mismo nivel.
import type { Element } from '@/engine/inazuma/types'

export interface Spirit {
  id: string
  name: string
  element: Element
  /** Multiplicador de potencia del duelo en el que se invoca. */
  power: number
  desc: string
}

export const SPIRITS: Spirit[] = [
  { id: 'majin', name: 'Majin el Grande', element: 'montana', power: 2.1, desc: 'Un titán de piedra se alza tras el portero.' },
  { id: 'pegaso', name: 'Pegaso Ardiente', element: 'fuego', power: 2.0, desc: 'Un caballo alado envuelto en llamas.' },
  { id: 'kraken', name: 'Kraken Abisal', element: 'aire', power: 2.0, desc: 'Tentáculos de escarcha barren el área.' },
  { id: 'ent', name: 'Guardián del Bosque', element: 'bosque', power: 2.0, desc: 'Un coloso de raíces cierra el paso.' },
  { id: 'ave-fenix', name: 'Ave Fénix', element: 'fuego', power: 2.2, desc: 'Renace sobre el campo y lo incendia todo.' },
  { id: 'lobo-blanco', name: 'Lobo Blanco', element: 'aire', power: 2.1, desc: 'La manada cruza el campo en ventisca.' },
]

export const SPIRIT_BY_ID = new Map(SPIRITS.map((s) => [s.id, s]))

export function getSpirit(id: string | undefined): Spirit | undefined {
  return id ? SPIRIT_BY_ID.get(id) : undefined
}
