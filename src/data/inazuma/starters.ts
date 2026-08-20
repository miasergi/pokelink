import type { RegionId } from '@/data/inazuma/teams'

/**
 * LOS INICIALES de cada saga: el jugador con el que ARRANCAS la run (solo 1,
 * como el inicial de Pokémon). Tres canónicos por época + «Buscar» (elegir a
 * cualquiera del catálogo de esa época) como modo libre.
 *
 * Ids verificados contra el catálogo generado (players.ts).
 */
export const STARTERS_BY_SAGA: Record<RegionId, string[]> = {
  // IE1 — el trío fundacional del Raimon.
  ff: ['mark-evans', 'axel-blaze', 'jude-sharp'],
  // IE2 — la caravana contra el Instituto Alius: Mark, el lobo de Hakuren y
  // el capitán de Génesis.
  alius: ['mark-evans', 'shawn-froste-2', 'xavier-foster'],
  // IE3 — el Mundial: Mark, el capitán de Orpheus y el portero de Little
  // Gigant (elegidos a dedo por el míster).
  ffi: ['mark-evans-2', 'paolo-bianchi', 'hector-helio'],
  // IEVR — la nueva generación (elegidos a dedo por el míster).
  vr: ['harper-evans', 'destin-billows', 'cedric-freud'],
}
