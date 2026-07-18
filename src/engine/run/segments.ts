import type { MapNode, RunMap, RunState } from './types'

/** Tramo del mapa: las capas entre la medalla anterior y el jefe que lo cierra.
 *  El mapa se muestra UNA PANTALLA POR TRAMO (feedback de testers: "una
 *  pantalla por cada medalla"), no como un scroll continuo de toda la región. */
export interface MapSegment {
  index: number
  /** Primera capa del tramo. */
  start: number
  /** Última capa del tramo (inclusive; normalmente la del jefe que lo cierra). */
  end: number
  /** Gimnasio que cierra el tramo, o el jefe final (Campeón / jefe de capítulo).
   *  Puede ser null en mapas sin jefes (no ocurre en la práctica). */
  boss: MapNode | null
}

/** Divide el mapa en tramos: uno por gimnasio + el tramo final (Calle
 *  Victoria + Liga). En Modo Historia (un solo jefe 'champion') sale 1 tramo. */
export function mapSegments(map: RunMap): MapSegment[] {
  const segs: MapSegment[] = []
  let start = 0
  for (let li = 0; li < map.layers.length; li++) {
    const boss = map.layers[li].map((id) => map.nodes[id]).find((n) => n.type === 'gym')
    if (boss) {
      segs.push({ index: segs.length, start, end: li, boss })
      start = li + 1
    }
  }
  if (start < map.layers.length || segs.length === 0) {
    const lastLayer = map.layers.length - 1
    const ids = map.layers[lastLayer]
    segs.push({ index: segs.length, start: Math.min(start, lastLayer), end: lastLayer, boss: map.nodes[ids[0]] ?? null })
  }
  return segs
}

/** Tramo que contiene una capa dada. */
export function segmentForLayer(segs: MapSegment[], layer: number): MapSegment {
  const l = Math.max(0, layer)
  return segs.find((s) => l >= s.start && l <= s.end) ?? segs[segs.length - 1]
}

/** Tramo ACTIVO de una run: donde está la próxima casilla jugable. Si el jefe
 *  del tramo ya cayó (estás en su capa, superada), el activo es el siguiente. */
export function activeSegment(segs: MapSegment[], run: RunState): MapSegment {
  const cur = Math.max(0, run.currentLayer)
  const seg = segmentForLayer(segs, cur)
  if (cur >= seg.end && seg.boss?.cleared && seg.index < segs.length - 1) {
    return segs[seg.index + 1]
  }
  return seg
}
