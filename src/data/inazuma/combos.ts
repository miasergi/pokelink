// TÉCNICAS COMBINADAS: las de dos o tres jugadores de la serie.
//
// NO son gratis. Para lanzar una hacen falta las dos cosas:
//  1. Que ALGÚN miembro haya DESPERTADO la técnica (está al final de su
//     cadena característica: el Tornado de Dragón es el segundo paso de la
//     cadena de Kevin, la Zona Mortal el de Jude…), y
//  2. que TODOS los miembros estén sobre el campo.
//
// Cumplidas las dos, cualquiera de los miembros puede lanzarla cuando le toca
// decidir, con bono de potencia por combinarse.
import { getTechnique } from '@/data/inazuma/techniques'
import type { Technique } from '@/engine/inazuma/types'

export interface Combo {
  /** Técnica del catálogo que se lanza (con bono de potencia). */
  techniqueId: string
  /** `baseId` de TODOS los implicados. */
  members: string[]
  /** Con quién se combina, para el rótulo de la opción. */
  label: string
}

export const COMBOS: Combo[] = [
  {
    // Axel + Kevin: el Tornado de Fuego y el Golpe de Dragón, a la vez.
    techniqueId: 'dragon-tornado',
    members: ['axel-blaze', 'kevin-dragonfly'],
    label: 'con Kevin y Axel',
  },
  {
    // El tiro insignia del Raimon: Mark, Axel y Jude (si lo has fichado).
    techniqueId: 'inazuma-break',
    members: ['mark-evans', 'axel-blaze', 'jude-sharp'],
    label: 'con Mark, Axel y Jude',
  },
  {
    // La Zona Mortal de la Royal: Jude y David Samford.
    techniqueId: 'death-zone',
    members: ['jude-sharp', 'david-samford'],
    label: 'con Jude y David',
  },
]

/**
 * Bonos de potencia por combinarse: son varias piernas empujando. Con
 * CUALQUIER compañero ya empuja más que en solitario; con los compañeros
 * CANÓNICOS de la serie, la AFINIDAD la lleva a su máximo.
 */
export const COMBO_MULT = 1.15
export const COMBO_MULT_AFINIDAD = 1.35

/**
 * Coste TOTAL del combo respecto a la técnica base (se reparte a partes
 * iguales entre los que la lanzan). Más caro que una individual a propósito:
 * es la artillería de emergencia, no el botón por defecto.
 */
export const COMBO_COST_MULT = 1.6

/** Aguante que paga CADA compañero que entra al combo (el que lanza ya paga
 * el del duelo). */
export const COMBO_PARTNER_STAMINA = 8

export const COMBO_BY_TECHNIQUE = new Map(COMBOS.map((c) => [c.techniqueId, c]))

/**
 * Combos que este jugador puede LANZAR: la técnica está DESPERTADA (la sabe
 * él, o es miembro canónico y la sabe alguien del campo — no es un regalo) y
 * hay compañeros suficientes sobre el césped. La PAREJA ya no exige a los
 * canónicos: cualquiera vale (con ellos, plus de AFINIDAD).
 */
export function launchableCombos(
  actorBaseId: string,
  onPitch: { baseId: string; techniques: string[] }[],
): Combo[] {
  const actor = onPitch.find((a) => a.baseId === actorBaseId)
  if (!actor) return []
  return COMBOS.filter((c) => {
    if (onPitch.length < c.members.length) return false
    const knows = (a: { techniques: string[] }) => a.techniques.includes(c.techniqueId)
    return knows(actor) || (c.members.includes(actorBaseId) && onPitch.some(knows))
  })
}

/** ¿Es una técnica combinada? Para la insignia de la UI. */
export function comboOf(techniqueId: string): Combo | undefined {
  return COMBO_BY_TECHNIQUE.get(techniqueId)
}

/** La técnica del combo con el bono que toque (afinidad = canónicos). */
export function comboTechnique(id: string, afinidad = false): Technique | undefined {
  const t = getTechnique(id)
  return t ? { ...t, power: Math.round(t.power * (afinidad ? COMBO_MULT_AFINIDAD : COMBO_MULT)) } : undefined
}
