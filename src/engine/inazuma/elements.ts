// Sistema elemental (Fūrinkazan). Es el equivalente a la tabla de tipos del
// modo Pokémon, pero en piedra-papel-tijera cerrado de cuatro:
//
//    fuego ▶ bosque ▶ aire ▶ montaña ▶ fuego
//
// Cada elemento vence al siguiente del ciclo y pierde contra el anterior. Al ser
// un ciclo perfecto NO hay elemento dominante: la ventaja se gana eligiendo a
// qué rival te enfrentas y a quién pones en cada línea, no fichando «el mejor».
import type { Element } from './types'

/** A quién vence cada elemento. */
const BEATS: Record<Element, Element> = {
  fuego: 'bosque',
  bosque: 'aire',
  aire: 'montana',
  montana: 'fuego',
}

/** Ventaja: ×1.35. Desventaja: ×0.78. Neutro: ×1. */
export const ELEMENT_ADVANTAGE = 1.35
export const ELEMENT_WEAKNESS = 0.78

/**
 * Multiplicador de `atk` atacando a `def`.
 * Deliberadamente más suave que la tabla de tipos Pokémon (×2/×0.5): aquí cada
 * duelo es una tirada única, así que un ×2 convertiría el elemento en el juego
 * entero y la plantilla en decoración.
 */
export function elementMultiplier(atk: Element, def: Element): number {
  if (BEATS[atk] === def) return ELEMENT_ADVANTAGE
  if (BEATS[def] === atk) return ELEMENT_WEAKNESS
  return 1
}

/**
 * Aspecto de cada elemento. `icon` es el nombre del SVG en `Icon.tsx`: el modo
 * no usa emojis porque los dibuja el sistema operativo (se ven distintos en
 * cada móvil, no se pueden teñir y varios salen en blanco y negro en Windows).
 */
export const ELEMENT_INFO: Record<Element, { label: string; color: string; ring: string; text: string; icon: string }> = {
  fuego: { label: 'Fuego', color: '#ef4444', ring: 'border-red-500/60', text: 'text-red-300', icon: 'fire' },
  bosque: { label: 'Bosque', color: '#22c55e', ring: 'border-emerald-500/60', text: 'text-emerald-300', icon: 'leaf' },
  aire: { label: 'Aire', color: '#38bdf8', ring: 'border-sky-500/60', text: 'text-sky-300', icon: 'wind' },
  montana: { label: 'Montaña', color: '#eab308', ring: 'border-amber-500/60', text: 'text-amber-300', icon: 'mountain' },
}

/** Etiqueta corta de la ventaja, para la retransmisión del partido. */
export function effectivenessLabel(mult: number): string | null {
  if (mult > 1.01) return '¡Ventaja elemental!'
  if (mult < 0.99) return 'Elemento en contra…'
  return null
}
