import type { RunState } from './types'

/**
 * Tiempo de juego ACTIVO total de la run (ms): lo acumulado en sesiones previas
 * más la sesión en curso. NO cuenta el tiempo con la app cerrada, porque al
 * reanudar se reinicia el ancla `startedAt`.
 */
export function runElapsedMs(run: { elapsedMs?: number; startedAt: number }): number {
  return Math.max(0, (run.elapsedMs ?? 0) + (Date.now() - run.startedAt))
}

/**
 * Vuelca el tiempo de la sesión en curso a `elapsedMs` y reinicia el ancla a
 * "ahora". Se llama al guardar (cada acción) y al terminar la run, para que el
 * tiempo guardado refleje solo el juego activo.
 */
export function commitElapsed(run: RunState): void {
  const now = Date.now()
  run.elapsedMs = Math.max(0, (run.elapsedMs ?? 0) + (now - run.startedAt))
  run.startedAt = now
}
