import { useGame } from '@/state/gameStore'
import { mapSegments, activeSegment } from '@/engine/run/segments'
import { CHAPTERS } from '@/data/story/chapters'
import { segmentTheme } from './routeTheme'

/** Pantallas que forman parte del recorrido de una run: todas comparten el
 *  paisaje del tramo en el que estás, para que el mapa, el combate, la tienda o
 *  una captura se sientan del MISMO sitio. Fuera de esta lista (Inicio,
 *  Pokédex, Liga, Cyber...) se mantiene el patrón de Pokémon de siempre. */
const RUN_SCREENS = new Set([
  'map', 'battle', 'reward', 'catch', 'item', 'shop', 'event', 'heal',
  'team', 'trade', 'rescue', 'legendary',
])

/**
 * Imagen de fondo del "momento" de la run: el paisaje del tramo activo (ruta
 * costera, cañón, zona industrial...) o el fondo del capítulo en Modo Historia.
 * Devuelve null cuando no toca pintarlo.
 *
 * Reutiliza las mismas imágenes que la cabecera del mapa (`routeTheme`), así
 * que no añade descargas: cuando llegas al combate la imagen ya está en caché.
 */
export function useRunBackdrop(screenName: string): string | null {
  const run = useGame((s) => s.run)
  if (!run || !RUN_SCREENS.has(screenName)) return null
  // Modo Historia: el fondo es el del capítulo, no el paisaje por tipo.
  if (run.story) return CHAPTERS[run.story - 1]?.mapBg ?? null
  const segs = mapSegments(run.map)
  const seg = activeSegment(segs, run)
  return segmentTheme(seg, seg.index === segs.length - 1, run.gen).img
}
