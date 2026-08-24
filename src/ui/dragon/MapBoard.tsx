// El tablero de la saga. Se ve el tramo ENTERO —de dónde vienes, dónde estás
// y qué te espera— con los caminos dibujados, igual que en Inazuma y en el
// mapa del roguelike Pokémon. Elegir casilla es elegir ruta, no coger una de
// una lista.
import { getFighter } from '@/data/dragon/fighters'
import { BOSS_LAYER, layerNodes, type DragonSave, type MapNode } from '@/engine/dragon/run'
import { Avatar } from './Bits'

export const NODE_STYLE: Record<MapNode['kind'], { label: string; color: string; glyph: string }> = {
  combate: { label: 'Combate', color: '#f87171', glyph: '✦' },
  elite: { label: 'Rival de peso', color: '#fb923c', glyph: '✸' },
  jefe: { label: 'Jefe', color: '#dc2626', glyph: '☠' },
  entreno: { label: 'Entrenamiento', color: '#a78bfa', glyph: '↑' },
  reclutar: { label: 'Aliado', color: '#4ade80', glyph: '+' },
  tienda: { label: 'Tienda', color: '#fbbf24', glyph: '$' },
  descanso: { label: 'Descanso', color: '#38bdf8', glyph: '~' },
  bola: { label: 'Bola de Dragón', color: '#f59e0b', glyph: '●' },
  maestro: { label: 'Maestro', color: '#22d3ee', glyph: '☯' },
}

const LAYER_H = 86
const NODE_R = 21

/** Coordenadas de una casilla dentro del tablero, en tanto por ciento de ancho. */
function xOf(n: MapNode, total: number): number {
  if (total <= 1) return 50
  // Margen del 18 % a cada lado para que los círculos no se salgan.
  return 18 + (n.col / (total - 1)) * 64
}

export default function MapBoard({ save, alcanzables, onPick }: {
  save: DragonSave
  alcanzables: MapNode[]
  onPick: (id: string) => void
}) {
  const capas = Array.from({ length: BOSS_LAYER + 1 }, (_, l) => layerNodes(save, l))
  const alcanzable = new Set(alcanzables.map((n) => n.id))
  const alto = (BOSS_LAYER + 1) * LAYER_H
  const yOf = (layer: number) => alto - (layer * LAYER_H + LAYER_H / 2)

  return (
    <div className="relative w-full" style={{ height: alto }}>
      {/* Los caminos van DEBAJO de las casillas, en un SVG a pantalla completa */}
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 100 ${alto}`} preserveAspectRatio="none">
        {capas.flatMap((capa, l) =>
          capa.flatMap((n) =>
            n.next.map((id) => {
              const destino = capas[l + 1]?.find((x) => x.id === id)
              if (!destino) return null
              const activo = alcanzable.has(id) && n.id === save.currentNode
              const pasado = n.layer < save.layer
              return (
                <line
                  key={`${n.id}-${id}`}
                  x1={xOf(n, capa.length)} y1={yOf(l)}
                  x2={xOf(destino, capas[l + 1].length)} y2={yOf(l + 1)}
                  stroke={activo ? '#fbbf24' : pasado ? '#334155' : '#1e293b'}
                  strokeWidth={activo ? 1.1 : 0.6}
                  strokeDasharray={activo ? undefined : '2 2'}
                  vectorEffect="non-scaling-stroke"
                />
              )
            }),
          ),
        )}
      </svg>

      {capas.map((capa, l) =>
        capa.map((n) => {
          const st = NODE_STYLE[n.kind]
          const abierta = alcanzable.has(n.id)
          const hecha = !!n.done
          const rival = n.enemies?.[0] ? getFighter(n.enemies[0]) : undefined
          return (
            <button
              key={n.id}
              type="button"
              disabled={!abierta}
              onClick={() => onPick(n.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full transition-transform active:scale-95 disabled:cursor-default"
              style={{
                left: `${xOf(n, capa.length)}%`,
                top: yOf(l),
                width: n.kind === 'jefe' ? NODE_R * 2.4 : NODE_R * 2,
                height: n.kind === 'jefe' ? NODE_R * 2.4 : NODE_R * 2,
                background: abierta ? `${st.color}22` : '#0f172a',
                boxShadow: abierta
                  ? `0 0 0 2px ${st.color}, 0 0 16px ${st.color}55`
                  : `0 0 0 1px ${hecha ? '#334155' : '#1e293b'}`,
                opacity: abierta ? 1 : hecha ? 0.35 : 0.55,
              }}
              aria-label={`${st.label}${n.level ? ` nivel ${n.level}` : ''}`}
            >
              {rival ? (
                <Avatar name={rival.name} color={rival.color} size={n.kind === 'jefe' ? 42 : 34} baseId={rival.id} />
              ) : (
                <span className="font-black text-[15px]" style={{ color: abierta ? st.color : '#475569' }}>
                  {st.glyph}
                </span>
              )}
              {n.level != null && (
                <span
                  className="absolute -bottom-1 text-[9px] font-bold px-1 rounded tabular-nums"
                  style={{ background: '#0b1220', color: abierta ? st.color : '#475569' }}
                >
                  {n.level}
                </span>
              )}
            </button>
          )
        }),
      )}
    </div>
  )
}
