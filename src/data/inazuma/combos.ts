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
  // --- La remesa grande: los combos canónicos de la serie, verificados en la
  // wiki (quiénes la usan en el anime). Juntar a TODOS los canónicos sobre el
  // césped desbloquea la combinada aunque nadie la lleve en su cadena.
  {
    // El legendario Inazuma Uno: Mark y Axel, el origen de todo.
    techniqueId: 'inazuma-1gou',
    members: ['mark-evans', 'axel-blaze'],
    label: 'con Mark y Axel',
  },
  {
    // El Doble Impulso de la Royal: Jude y David.
    techniqueId: 'twin-boost',
    members: ['jude-sharp', 'david-samford'],
    label: 'con Jude y David',
  },
  {
    // El Pingüino Emperador Nº 2: Jude, David y Jim, marca de la casa.
    techniqueId: 'koutei-penguin-2gou',
    members: ['jude-sharp', 'david-samford', 'jim-wraith'],
    label: 'con Jude, David y Jim',
  },
  {
    // El Nº 3, la versión de la selección: Jude, Caleb y David.
    techniqueId: 'koutei-penguin-3gou',
    members: ['jude-sharp', 'caleb-stonewall', 'david-samford'],
    label: 'con Jude, Caleb y David',
  },
  {
    // El Tri-Pegaso del Raimon: Erik, Bobby y Malcolm.
    techniqueId: 'tri-pegasus',
    members: ['erik-eagle', 'bobby-shearer', 'malcolm-night'],
    label: 'con Erik, Bobby y Malcolm',
  },
  {
    // Y su evolución, El Fénix: el mismo trío, más quemado que nunca.
    techniqueId: 'the-phoenix',
    members: ['erik-eagle', 'bobby-shearer', 'malcolm-night'],
    label: 'con Erik, Bobby y Malcolm',
  },
  {
    // Ventisca de Guiverno: el Golpe de Guiverno de Kevin dentro de la
    // Ventisca Eterna de Shawn.
    techniqueId: 'wyvern-blizzard',
    members: ['kevin-dragonfly', 'shawn-froste'],
    label: 'con Kevin y Shawn',
  },
  {
    // Gran Fuego: Xavier y Austin, fuego sobre fuego.
    techniqueId: 'grand-fire',
    members: ['xavier-foster', 'austin-hobbes'],
    label: 'con Xavier y Austin',
  },
  {
    // Big Bang, nacido en el entrenamiento de la selección: Shawn, Jude y Xavier.
    techniqueId: 'big-bang',
    members: ['shawn-froste', 'jude-sharp', 'xavier-foster'],
    label: 'con Shawn, Jude y Xavier',
  },
  {
    // La Supernova de la Génesis: Xavier, Isabelle y Wilbur.
    techniqueId: 'supernova',
    members: ['xavier-foster', 'isabelle-trick', 'wilbur-watkins'],
    label: 'con Xavier, Isabelle y Wilbur',
  },
  {
    // El Impulso Unicornio del equipo americano: Mark Krueger y Dylan.
    techniqueId: 'unicorn-boost',
    members: ['mark-krueger', 'dylan-keats'],
    label: 'con Mark K. y Dylan',
  },
  {
    // GO: el Tornado de Fuego DD de Arion y Victor.
    techniqueId: 'fire-tornado-dd',
    members: ['arion-sherwind', 'victor-blade'],
    label: 'con Arion y Victor',
  },
]

/**
 * La misma PERSONA aunque sea otra época: `jude-sharp-2` (selección) cuenta
 * como Jude a efectos de canon. Sin esto, los combos solo valían con la
 * versión exacta del personaje que se listó en `members`.
 */
export const person = (baseId: string): string => baseId.replace(/-\d+$/, '')

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
 * Combos que este jugador puede LANZAR. Tres puertas de entrada:
 *  1. la técnica está DESPERTADA en él (la sabe),
 *  2. es miembro canónico y la sabe alguien del campo, o
 *  3. TODOS los miembros canónicos están sobre el césped (da igual la época:
 *     `jude-sharp-2` cuenta como Jude) — juntar al equipo de la serie
 *     desbloquea su combinada aunque nadie la lleve en su cadena.
 * Y siempre con compañeros suficientes sobre el césped.
 */
export function launchableCombos(
  actorBaseId: string,
  onPitch: { baseId: string; techniques: string[] }[],
): Combo[] {
  const actor = onPitch.find((a) => a.baseId === actorBaseId)
  if (!actor) return []
  const actorP = person(actorBaseId)
  return COMBOS.filter((c) => {
    if (onPitch.length < c.members.length) return false
    const knows = (a: { techniques: string[] }) => a.techniques.includes(c.techniqueId)
    const esMiembro = c.members.some((mId) => person(mId) === actorP)
    const canonCompleto = c.members.every((mId) => onPitch.some((a) => person(a.baseId) === person(mId)))
    return knows(actor) || (esMiembro && (onPitch.some(knows) || canonCompleto))
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
