// Radar del juguete: un blip indica lo cerca que está el Pokémon oculto.
// 0 anillos = lejos, 1 = media distancia, 2 = al lado (se puede iniciar combate
// agitando). El jugador gira con ◄ ► y avanza con el botón central.
import { RNG } from '@/utils/rng'

export interface RadarState {
  /** Posición del Pokémon RELATIVA al jugador, en marco de mundo (x este, y norte). */
  dx: number
  dy: number
  /** Orientación del jugador (0=N, 1=E, 2=S, 3=O). */
  facing: number
  /** Pasos dados (tras demasiados, el Pokémon huye). */
  steps: number
}

export const RADAR_MAX_STEPS = 14

/** Desplazamiento de un paso según orientación (marco de mundo). */
const FACING_DELTA: ReadonlyArray<readonly [number, number]> = [
  [0, 1],   // N
  [1, 0],   // E
  [0, -1],  // S
  [-1, 0],  // O
]

export function createRadar(rng: RNG): RadarState {
  // Nunca empieza encima (distancia 2..5) para que haya que buscar.
  let dx = 0, dy = 0
  while (Math.abs(dx) + Math.abs(dy) < 2) {
    dx = rng.int(-3, 3)
    dy = rng.int(-3, 3)
  }
  return { dx, dy, facing: 0, steps: 0 }
}

export function radarDistance(r: RadarState): number {
  return Math.abs(r.dx) + Math.abs(r.dy)
}

/** Anillos alrededor del blip: 2 = encima (combate posible), 1 = cerca, 0 = lejos. */
export function radarRings(r: RadarState): 0 | 1 | 2 {
  const d = radarDistance(r)
  if (d <= 0) return 2
  if (d <= 2) return 1
  return 0
}

export function turnLeft(r: RadarState): RadarState {
  return { ...r, facing: (r.facing + 3) % 4 }
}

export function turnRight(r: RadarState): RadarState {
  return { ...r, facing: (r.facing + 1) % 4 }
}

/** Avanza un paso: el jugador se mueve, así que el blip se acerca o aleja. */
export function stepForward(r: RadarState): RadarState {
  const [mx, my] = FACING_DELTA[r.facing]
  return { ...r, dx: r.dx - mx, dy: r.dy - my, steps: r.steps + 1 }
}

/** ¿El Pokémon se ha cansado de esperar y ha huido? */
export function radarExpired(r: RadarState): boolean {
  return r.steps >= RADAR_MAX_STEPS && radarRings(r) < 2
}

/** Ángulo del blip en el LCD, RELATIVO a la orientación del jugador.
 *  0 = delante (arriba en pantalla); crece en sentido horario. */
export function radarAngle(r: RadarState): number {
  const world = Math.atan2(r.dx, r.dy) // 0 = norte, horario
  return world - (r.facing * Math.PI) / 2
}
