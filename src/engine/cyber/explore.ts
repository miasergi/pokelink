// Exploración en PRIMERA PERSONA de la Cyber PokéBall (fiel al juguete).
//
// Fuente (Bulbapedia): «the left and right buttons are used to turn around left
// and right, and the main button is used to stop turning and move forward»…
// «a radar may appear with a dot in the centre — this indicates which direction
// to go»… «no rings being far, one ring being a medium distance and two rings
// being close»… «pressing the main button while there are two rings […] the
// player will enter a Pokémon battle».
//
// Modelo: tú tienes una posición y un RUMBO (grados). El Pokémon está en un
// punto del mundo. El radar te da su MARCACIÓN relativa a tu rumbo (hacia dónde
// girar) y los anillos salen de la DISTANCIA. Giras hasta centrar el punto y
// avanzas: es la lectura natural de una brújula.
import { RNG } from '@/utils/rng'

export interface ExploreState {
  /** Rumbo del jugador en grados (0 = norte, crece en sentido horario). */
  heading: number
  /** Posición del jugador. */
  x: number
  y: number
  /** Posición oculta del Pokémon. */
  tx: number
  ty: number
  /** Pasos dados (si te pasas, el Pokémon se cansa y huye). */
  steps: number
}

export const MAX_STEPS = 18
/** Cuánto avanzas por paso. */
export const STEP = 0.9
/** A esta distancia estás encima: 2 anillos → ¡combate! */
export const ENGAGE_DIST = 1.1
const NEAR_DIST = 2.8

export function createExplore(rng: RNG): ExploreState {
  // El Pokémon aparece a media distancia, en cualquier dirección.
  const angle = rng.float(0, Math.PI * 2)
  const dist = rng.float(4, 7)
  return {
    heading: rng.int(0, 359),
    x: 0,
    y: 0,
    tx: Math.sin(angle) * dist,
    ty: Math.cos(angle) * dist,
    steps: 0,
  }
}

export function distance(s: ExploreState): number {
  return Math.hypot(s.tx - s.x, s.ty - s.y)
}

/** Anillos del radar: 2 = encima (combate), 1 = cerca, 0 = lejos. */
export function rings(s: ExploreState): 0 | 1 | 2 {
  const d = distance(s)
  if (d <= ENGAGE_DIST) return 2
  if (d <= NEAR_DIST) return 1
  return 0
}

/** ¿Se puede iniciar el combate ya? */
export function canEngage(s: ExploreState): boolean {
  return rings(s) === 2
}

/** Marcación del Pokémon RELATIVA a tu rumbo, en grados (-180..180).
 *  0 = justo delante; negativo = a tu izquierda; positivo = a tu derecha. */
export function bearing(s: ExploreState): number {
  const worldDeg = (Math.atan2(s.tx - s.x, s.ty - s.y) * 180) / Math.PI // 0 = norte, horario
  let rel = worldDeg - s.heading
  while (rel > 180) rel -= 360
  while (rel < -180) rel += 360
  return rel
}

/** Gira el rumbo (grados; negativo = izquierda). */
export function turn(s: ExploreState, deltaDeg: number): ExploreState {
  let heading = (s.heading + deltaDeg) % 360
  if (heading < 0) heading += 360
  return { ...s, heading }
}

/** Avanza un paso en la dirección actual. Si vas de cara, te acercas; si vas de
 *  espaldas, te alejas — que es justo lo que hace legible el radar. */
export function stepForward(s: ExploreState): ExploreState {
  const rad = (s.heading * Math.PI) / 180
  return {
    ...s,
    x: s.x + Math.sin(rad) * STEP,
    y: s.y + Math.cos(rad) * STEP,
    steps: s.steps + 1,
  }
}

/** El Pokémon se cansa de esperar (te has quedado sin pasos sin llegar). */
export function expired(s: ExploreState): boolean {
  return s.steps >= MAX_STEPS && !canEngage(s)
}

export function stepsLeft(s: ExploreState): number {
  return Math.max(0, MAX_STEPS - s.steps)
}

/** Pista en pantalla según la cercanía (para que se ENTIENDA el radar). */
export function proximityHint(s: ExploreState): string {
  switch (rings(s)) {
    case 2: return '¡ESTÁ AQUÍ! ¡AGITA LA BOLA!'
    case 1: return 'La señal es fuerte… está cerca'
    default: return 'Señal débil… gira y busca'
  }
}
