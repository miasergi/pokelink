// Botín equipable de Corsarios: armas (+ataque) y amuletos (+vida y defensa).
import type { Rareza, TipoPieza } from '@/engine/corsarios/types'

/** Bonus por rareza (0.1 = +10%). */
export const BONUS: Record<Rareza, number> = { C: 0.06, R: 0.1, E: 0.16, L: 0.25 }

/** Doblones al vender una pieza. */
export const VENTA: Record<Rareza, number> = { C: 40, R: 120, E: 350, L: 900 }

export const NOMBRES: Record<TipoPieza, Record<Rareza, string[]>> = {
  arma: {
    C: ['Cuchillo oxidado', 'Garrote de muelle', 'Pistola de chispa', 'Bichero'],
    R: ['Sable de abordaje', 'Mosquete largo', 'Hacha de cubierta', 'Ballesta de cofa'],
    E: ['Alfanje de Damasco', 'Trabuco de bronce', 'Florete del Conde', 'Arpón de ballenero'],
    L: ['Colmillo del Kraken', 'Cañón de mano', 'Hoja de la Tormenta', 'Tridente hundido'],
  },
  amuleto: {
    C: ['Diente de tiburón', 'Cuerda de la suerte', 'Moneda agujereada', 'Pluma de gaviota'],
    R: ['Brújula de latón', 'Escapulario marino', 'Caracola pulida', 'Anillo de coral'],
    E: ['Perla negra', 'Ojo de cristal', 'Catalejo del abuelo', 'Ancla de plata'],
    L: ['Corazón de coral', 'Rosa de los vientos', 'Calavera dorada', 'Lágrima de sirena'],
  },
}

/** Probabilidad de rareza del botín según lo avanzado (0 = isla 1, 1 = final). */
export function tablaBotin(progreso: number): [Rareza, number][] {
  const p = Math.max(0, Math.min(1.4, progreso))
  const L = 0.01 + 0.09 * p
  const E = 0.09 + 0.21 * p
  const R = 0.3 + 0.15 * p
  return [['L', L], ['E', E], ['R', R], ['C', Math.max(0, 1 - L - E - R)]]
}
