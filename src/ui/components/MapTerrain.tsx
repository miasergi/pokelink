import { useMemo } from 'react'
import type { TerrainPalette } from './routeTheme'

/**
 * Tablero del mapa dibujado con TILES, al estilo de un mapa de Pokémon: damero
 * de suelo, motitas de vegetación y maleza en los bordes laterales.
 *
 * Se genera como SVG en línea (patrones que se repiten), no con imágenes: así
 * cada tramo pinta su propio bioma —hierba, arena, nieve, roca...— sin añadir
 * un solo fichero ni una descarga, y se ve nítido a cualquier tamaño.
 * `shapeRendering: crispEdges` conserva el borde duro del pixel art.
 */
const TILE = 24 // lado del tile en px

export default function MapTerrain({
  palette, width, height, seed = 1,
}: {
  palette: TerrainPalette
  width: number
  height: number
  seed?: number
}) {
  // Decoración dispersa (matojos/piedras). Determinista por `seed` para que el
  // tramo se vea igual cada vez que vuelves a él.
  const decos = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number }[] = []
    let s = seed * 9301 + 49297
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    const cols = Math.ceil(width / TILE)
    const rows = Math.ceil(height / TILE)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rnd() > 0.09) continue
        out.push({ x: c * TILE + TILE * 0.28, y: r * TILE + TILE * 0.34, w: TILE * 0.2, h: TILE * 0.14 })
      }
    }
    return out
  }, [width, height, seed])

  // Maleza de los bordes: masa de arbustos SOLAPADOS que enmarca la ruta, como
  // los árboles que cierran los caminos en los juegos. Con radios y posiciones
  // variados; en rejilla regular parecía una cadena, no vegetación.
  const edgeW = TILE * 1.6
  const bushes = useMemo(() => {
    const out: { x: number; y: number; r: number }[] = []
    let s = seed * 7717 + 13
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    const step = TILE * 0.62
    const rows = Math.ceil(height / step) + 1
    for (let r = 0; r < rows; r++) {
      const y = r * step
      for (const side of [0, 1]) {
        for (const k of [0.3, 0.68]) {
          const jitterX = (rnd() - 0.5) * TILE * 0.5
          const jitterY = (rnd() - 0.5) * TILE * 0.4
          const rad = TILE * (0.44 + rnd() * 0.24)
          const x = side === 0 ? edgeW * k : width - edgeW * k
          out.push({ x: x + jitterX, y: y + jitterY, r: rad })
        }
      }
    }
    return out
  }, [width, height, edgeW, seed])

  if (width <= 0 || height <= 0) return null

  return (
    <svg
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ shapeRendering: 'crispEdges' }}
    >
      <defs>
        {/* Damero del suelo: dos tonos alternos, como el césped de los juegos. */}
        <pattern id="terrain-floor" width={TILE * 2} height={TILE * 2} patternUnits="userSpaceOnUse">
          <rect width={TILE * 2} height={TILE * 2} fill={palette.base} />
          <rect x={TILE} width={TILE} height={TILE} fill={palette.alt} />
          <rect y={TILE} width={TILE} height={TILE} fill={palette.alt} />
        </pattern>
      </defs>

      <rect width={width} height={height} fill="url(#terrain-floor)" />

      {/* Motitas de vegetación/piedra sueltas por el suelo. */}
      <g fill={palette.deco} opacity={0.75}>
        {decos.map((d, i) => (
          <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h} rx={1} />
        ))}
      </g>

      {/* Bordes: franja oscura + arbustos que cierran la ruta a los lados. */}
      <rect x={0} width={edgeW} height={height} fill={palette.edge} />
      <rect x={width - edgeW} width={edgeW} height={height} fill={palette.edge} />
      <g fill={palette.edge}>
        {bushes.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} />
        ))}
      </g>
      {/* Brillo superior de los arbustos, para que no sean una mancha plana. */}
      <g fill={palette.deco} opacity={0.28}>
        {bushes.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y - b.r * 0.32} r={b.r * 0.55} />
        ))}
      </g>
    </svg>
  )
}
