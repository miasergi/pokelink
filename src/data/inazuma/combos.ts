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

/** Bono de potencia por combinarse: son varias piernas empujando. */
export const COMBO_MULT = 1.25

/**
 * Combos que este jugador puede LANZAR ahora mismo: él es miembro, todos los
 * miembros están en el campo y alguno ha DESPERTADO la técnica (aprendida por
 * cadena, casilla o manual — por eso no es un regalo).
 */
export function availableCombos(
  actorBaseId: string,
  onPitch: { baseId: string; techniques: string[] }[],
): Combo[] {
  const ids = new Set(onPitch.map((a) => a.baseId))
  return COMBOS.filter((c) =>
    c.members.includes(actorBaseId)
    && c.members.every((m) => ids.has(m))
    && onPitch.some((a) => c.members.includes(a.baseId) && a.techniques.includes(c.techniqueId)))
}

/** La técnica del combo, ya con el bono aplicado. */
export function comboTechnique(id: string): Technique | undefined {
  const t = getTechnique(id)
  return t ? { ...t, power: Math.round(t.power * COMBO_MULT) } : undefined
}
