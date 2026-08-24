// Tablero de la saga, calcado en forma al de Inazuma y al del roguelike
// Pokémon: las casillas se colocan por (columna, capa), se unen con líneas y
// solo se entra en las CONECTADAS con donde estás.
//
// Dos cosas que la primera versión hacía mal y se notaban mucho:
//  1. El recorrido iba de abajo hacia arriba, al revés que el resto del juego.
//     Ahora la salida está ARRIBA y se avanza hacia abajo, como en Inazuma.
//  2. Las casillas eran un símbolo suelto sin más. No había forma de saber qué
//     era cada una: ahora llevan icono, ETIQUETA de texto, nivel y aviso de
//     dificultad, que es lo que hace legible un mapa de rogue.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from '@/ui/components/Icon'
import { getFighter } from '@/data/dragon/fighters'
import { BOSS_LAYER, layerNodes, type DragonSave, type MapNode, type NodeKind } from '@/engine/dragon/run'
import { avgLevel } from '@/engine/dragon/run'
import { Avatar } from './Bits'

const ROW_H = 92
const NODE = 46

/** Aspecto de cada tipo de casilla: icono del repo, color y NOMBRE visible. */
export const NODE_META: Record<NodeKind, { icon: string; color: string; label: string; short: string }> = {
  combate: { icon: 'swords', color: '#f87171', label: 'Combate', short: 'Combate' },
  elite: { icon: 'flame', color: '#fb923c', label: 'Rival de peso', short: 'Rival' },
  jefe: { icon: 'skull', color: '#dc2626', label: 'Jefe de saga', short: 'JEFE' },
  entreno: { icon: 'chartUp', color: '#a78bfa', label: 'Entrenamiento', short: 'Entreno' },
  reclutar: { icon: 'people', color: '#4ade80', label: 'Aliado', short: 'Aliado' },
  tienda: { icon: 'coin', color: '#fbbf24', label: 'Tienda', short: 'Tienda' },
  descanso: { icon: 'heal', color: '#38bdf8', label: 'Descanso', short: 'Descanso' },
  bola: { icon: 'gem', color: '#f59e0b', label: 'Bola de Dragón', short: 'Bola' },
  maestro: { icon: 'book', color: '#22d3ee', label: 'Maestro', short: 'Maestro' },
}

export default function MapBoard({ save, alcanzables, onPick }: {
  save: DragonSave
  alcanzables: MapNode[]
  onPick: (n: MapNode) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(360)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth || 360)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  const capas = Array.from({ length: BOSS_LAYER + 1 }, (_, l) => layerNodes(save, l))
  const alcanzable = new Set(alcanzables.map((n) => n.id))
  const alto = (BOSS_LAYER + 1) * ROW_H + 24
  const PAD = Math.min(46, width * 0.15)

  const xOf = (col: number, len: number) => PAD + ((col + 0.5) / len) * (width - 2 * PAD)
  // Capa 0 ARRIBA: se avanza hacia abajo, como el resto de mapas del proyecto.
  const yOf = (layer: number) => layer * ROW_H + ROW_H / 2 + 12

  // El mapa se abre por donde vas, no por el principio ni por el final.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = Math.max(0, yOf(save.layer) - ROW_H * 1.2)
  }, [save.layer, save.saga])

  const media = avgLevel(save)

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
      <div ref={wrapRef} className="relative w-full" style={{ height: alto }}>
        {/* Los caminos, por debajo de las casillas */}
        <svg className="absolute inset-0 pointer-events-none" width={width} height={alto}>
          {capas.map((capa, l) => (l < BOSS_LAYER
            ? capa.map((n) => n.next.map((id) => {
              const destino = capas[l + 1]?.find((x) => x.id === id)
              if (!destino) return null
              // Se ilumina el camino que sale de donde estás: es la ruta viva.
              const vivo = n.id === save.currentNode && alcanzable.has(id)
              const hecho = !!n.done
              return (
                <line
                  key={`${n.id}-${id}`}
                  x1={xOf(n.col, capa.length)} y1={yOf(l)}
                  x2={xOf(destino.col, capas[l + 1].length)} y2={yOf(l + 1)}
                  stroke={vivo ? '#f59e0b' : hecho ? '#475569' : '#334155'}
                  strokeWidth={vivo ? 3 : 2}
                  strokeDasharray={vivo || hecho ? '0' : '4 4'}
                />
              )
            }))
            : null))}
        </svg>

        {capas.map((capa, l) => capa.map((n) => {
          const meta = NODE_META[n.kind]
          const abierta = alcanzable.has(n.id)
          const hecha = !!n.done
          const aqui = save.currentNode === n.id
          const apagada = !abierta && !hecha
          const rival = n.enemies?.[0] ? getFighter(n.enemies[0]) : undefined
          // Aviso de dificultad, igual que las estrellas del mapa de Pokémon.
          const gap = n.level != null ? n.level - media : 0
          const size = n.kind === 'jefe' ? NODE + 12 : NODE
          return (
            <button
              key={n.id}
              type="button"
              disabled={!abierta}
              onClick={() => onPick(n)}
              className="absolute flex flex-col items-center disabled:cursor-default"
              style={{ left: xOf(n.col, capa.length) - size / 2, top: yOf(l) - size / 2, width: size }}
            >
              <span
                className={`relative grid place-items-center rounded-full border-2 overflow-hidden transition ${
                  abierta ? 'animate-pop-in' : ''
                } ${apagada ? 'opacity-40' : ''}`}
                style={{
                  width: size,
                  height: size,
                  borderColor: hecha ? '#475569' : abierta ? meta.color : '#334155',
                  background: hecha ? '#1e293b' : `${meta.color}22`,
                  boxShadow: abierta ? `0 0 14px ${meta.color}66` : undefined,
                }}
              >
                {hecha ? (
                  <Icon name="check" className="w-6 h-6" style={{ color: '#64748b' }} />
                ) : rival ? (
                  <Avatar name={rival.name} color={rival.color} size={size - 6} baseId={rival.id} />
                ) : (
                  <Icon name={meta.icon} className="w-6 h-6" style={{ color: meta.color }} />
                )}

                {/* Las casillas de pelea llevan la cara del rival, así que el
                    tipo se marca con una insignia para no perder la lectura. */}
                {rival && !hecha && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full border"
                    style={{ width: 17, height: 17, background: '#0b1220', borderColor: meta.color }}
                  >
                    <Icon name={meta.icon} className="w-2.5 h-2.5" style={{ color: meta.color }} />
                  </span>
                )}
              </span>

              {!hecha && gap > 1 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center rounded-full px-1 py-0.5 border bg-slate-950/90"
                  style={{ borderColor: gap > 4 ? '#ef4444' : '#f59e0b' }}
                >
                  {Array.from({ length: gap > 4 ? 3 : gap > 2 ? 2 : 1 }, (_, i) => (
                    <Icon key={i} name="star" className="w-2 h-2" style={{ color: gap > 4 ? '#ef4444' : '#f59e0b' }} />
                  ))}
                </span>
              )}

              {/* LO QUE FALTABA: decir qué es cada casilla, con todas sus letras */}
              <span
                className={`mt-0.5 text-[8.5px] font-bold whitespace-nowrap leading-tight ${apagada ? 'opacity-50' : ''}`}
                style={{ color: hecha ? '#64748b' : meta.color }}
              >
                {rival?.name ?? meta.short}
              </span>
              {n.level != null && !hecha && (
                <span className="text-[8px] text-slate-500 leading-none">Nv.{n.level}</span>
              )}
              {aqui && <span className="text-[8px] text-amber-300 leading-none">estás aquí</span>}
            </button>
          )
        }))}
      </div>
    </div>
  )
}
