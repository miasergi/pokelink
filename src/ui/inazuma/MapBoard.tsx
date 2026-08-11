// Tablero del mapa, calcado en forma al del roguelike Pokémon: las casillas se
// colocan por (columna, capa), se unen con líneas y solo se puede entrar en las
// CONECTADAS con la casilla en la que estás. Tocar una abre su previa.
//
// Antes esto era una lista vertical de tarjetas: se veía el contenido, pero no
// se leía como un recorrido ni había caminos que elegir.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { availableNextNodes, mapSegments, segmentForLayer } from '@/engine/inazuma/tournament'
import { TEAM_BY_ID } from '@/data/inazuma/teams'
import type { InazumaSave, NodeKind, TournamentNode } from '@/engine/inazuma/types'

const ROW_H = 96
const NODE = 46

/** Aspecto de cada tipo de casilla en el tablero. */
export const NODE_META: Record<NodeKind, { icon: string; color: string; label: string }> = {
  pachanga: { icon: '⚽', color: '#38bdf8', label: 'Pachanga' },
  objeto: { icon: '🎒', color: '#a78bfa', label: 'Objeto' },
  tecnica: { icon: '⚡', color: '#fbbf24', label: 'Técnica' },
  ojeador: { icon: '🔎', color: '#34d399', label: 'Ojeador' },
  descanso: { icon: '🛌', color: '#f472b6', label: 'Descanso' },
  tienda: { icon: '🛒', color: '#fcd34d', label: 'Tienda' },
  jefe: { icon: '⚔️', color: '#f87171', label: 'Instituto' },
  final: { icon: '🏆', color: '#fde047', label: 'FINAL' },
}

export default function MapBoard({
  save, onPick,
}: {
  save: InazumaSave
  onPick: (node: TournamentNode) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(360)
  const [viewH, setViewH] = useState(0)

  useLayoutEffect(() => {
    const el = wrapRef.current
    const sc = scrollRef.current
    if (!el || !sc) return
    const measure = () => {
      setWidth(el.clientWidth || 360)
      setViewH(sc.clientHeight || 0)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    ro.observe(sc)
    measure()
    return () => ro.disconnect()
  }, [])

  const segs = mapSegments(save.map)
  const seg = segmentForLayer(segs, save.layer)
  const reachable = new Set(availableNextNodes(save.map, save.currentNodeId).map((n) => n.id))

  const PAD = Math.min(46, width * 0.14)
  const rows = seg.end - seg.start + 1
  const contentH = rows * ROW_H + 24
  // Un tramo son 4 filas y en un móvil alto sobraba media pantalla en blanco.
  // Si el recorrido cabe entero, se centra en vertical; si no, se estira y
  // hace scroll con normalidad.
  const totalHeight = Math.max(contentH, viewH)
  const offsetY = Math.max(0, (totalHeight - contentH) / 2)

  // Coloca el scroll en la fila en la que estás al entrar o al cambiar de tramo.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = Math.max(0, offsetY + (save.layer - seg.start) * ROW_H - ROW_H)
  }, [seg.index, save.layer, seg.start, offsetY])

  const xOf = (col: number, len: number) => PAD + ((col + 0.5) / len) * (width - 2 * PAD)
  const yOf = (layer: number) => offsetY + (layer - seg.start) * ROW_H + ROW_H / 2
  const inSeg = (layer: number) => layer >= seg.start && layer <= seg.end

  const myLevel = save.roster.filter((p) => save.lineup.includes(p.uid))
    .reduce((a, p, _i, arr) => a + p.level / arr.length, 0)

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
      <div ref={wrapRef} className="relative w-full" style={{ height: totalHeight }}>
        {/* caminos */}
        <svg className="absolute inset-0 pointer-events-none" width={width} height={totalHeight}>
          {save.map.layers.map((layerIds, li) => (inSeg(li) && li < seg.end
            ? layerIds.map((id) => {
              const node = save.map.nodes[id]
              return node.next.map((nx) => {
                const target = save.map.nodes[nx]
                if (!target || !inSeg(target.layer)) return null
                const lit = node.cleared || reachable.has(id) || reachable.has(nx)
                return (
                  <line
                    key={`${id}-${nx}`}
                    x1={xOf(node.col, layerIds.length)}
                    y1={yOf(li)}
                    x2={xOf(target.col, save.map.layers[li + 1].length)}
                    y2={yOf(li + 1)}
                    stroke={node.cleared ? '#475569' : lit ? '#f59e0b88' : '#334155'}
                    strokeWidth={2}
                    strokeDasharray={lit || node.cleared ? '0' : '4 4'}
                  />
                )
              })
            })
            : null))}
        </svg>

        {/* casillas */}
        {save.map.layers.map((layerIds, li) => (inSeg(li)
          ? layerIds.map((id) => {
            const node = save.map.nodes[id]
            const meta = NODE_META[node.kind]
            const isReach = reachable.has(id)
            const isHere = save.currentNodeId === id
            const dim = !isReach && !node.cleared
            const team = node.teamId && (node.kind === 'jefe' || node.kind === 'final')
              ? TEAM_BY_ID.get(node.teamId)
              : null
            const gap = node.level != null ? node.level - myLevel : 0
            return (
              <button
                key={id}
                onClick={() => onPick(node)}
                className="absolute flex flex-col items-center"
                style={{ left: xOf(node.col, layerIds.length) - NODE / 2, top: yOf(li) - NODE / 2, width: NODE }}
              >
                <span
                  className={`grid place-items-center rounded-full border-2 transition ${
                    isReach ? 'animate-pop-in' : ''
                  } ${dim ? 'opacity-40' : ''}`}
                  style={{
                    width: NODE,
                    height: NODE,
                    borderColor: node.cleared ? '#475569' : isReach ? meta.color : '#334155',
                    background: node.cleared ? '#1e293b' : `${meta.color}22`,
                    boxShadow: isReach ? `0 0 12px ${meta.color}55` : undefined,
                  }}
                >
                  {team
                    ? <img
                        src={`${import.meta.env.BASE_URL}inazuma/teams/${node.teamId}.png`}
                        alt=""
                        className="w-7 h-7 object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    : <span className="text-lg leading-none">{node.cleared ? '✓' : meta.icon}</span>}
                </span>

                {/* aviso de dificultad, como las estrellas del mapa Pokémon */}
                {!node.cleared && node.level != null && gap > 1 && (
                  <span
                    className="absolute -top-1 -right-1 text-[9px] font-black leading-none rounded-full px-1 py-0.5 border border-black/40"
                    style={{ background: gap > 4 ? '#ef4444' : '#f59e0b', color: '#1e293b' }}
                  >
                    {'★'.repeat(gap > 4 ? 3 : gap > 2 ? 2 : 1)}
                  </span>
                )}

                <span
                  className={`mt-0.5 text-[8px] font-bold whitespace-nowrap leading-tight ${dim ? 'opacity-50' : ''}`}
                  style={{ color: node.cleared ? '#64748b' : meta.color }}
                >
                  {team ? team.name.replace('Instituto ', '') : meta.label}
                </span>
                {node.level != null && !node.cleared && (
                  <span className="text-[8px] text-slate-500 leading-none">Nv.{node.level}</span>
                )}
                {isHere && <span className="text-[8px] text-amber-300 leading-none">estás aquí</span>}
              </button>
            )
          })
          : null))}
      </div>
    </div>
  )
}

/** Previa de una casilla antes de entrar. */
export function NodePreview({
  node, save, canEnter, onEnter, onClose,
}: {
  node: TournamentNode
  save: InazumaSave
  canEnter: boolean
  onEnter: () => void
  onClose: () => void
}) {
  const meta = NODE_META[node.kind]
  const team = node.teamId && (node.kind === 'jefe' || node.kind === 'final')
    ? TEAM_BY_ID.get(node.teamId)
    : null
  const lineup = save.roster.filter((p) => save.lineup.includes(p.uid))
  const myLevel = lineup.length ? Math.round(lineup.reduce((a, p) => a + p.level, 0) / lineup.length) : 0
  const gap = node.level != null ? node.level - myLevel : 0

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-end p-3" onClick={onClose}>
      <div
        className="w-full rounded-3xl border bg-slate-900 p-4 animate-pop-in safe-bottom"
        style={{ borderColor: `${meta.color}66` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className="grid place-items-center rounded-2xl shrink-0"
            style={{ width: 52, height: 52, background: `${meta.color}22` }}
          >
            <span className="text-2xl">{meta.icon}</span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</div>
            <div className="font-extrabold text-base leading-tight">{node.title}</div>
            <div className="text-[11px] text-slate-400">{node.subtitle}</div>
          </div>
        </div>

        {node.level != null && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {team && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border"
                style={{
                  color: ELEMENT_INFO[team.element].color,
                  borderColor: `${ELEMENT_INFO[team.element].color}66`,
                }}
              >
                {ELEMENT_INFO[team.element].glyph} {ELEMENT_INFO[team.element].label}
              </span>
            )}
            <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 border ${
              gap > 4 ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                : gap > 1 ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                  : 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
            }`}>
              Nivel {node.level} · tu once {myLevel}
            </span>
            {node.risky && (
              <span className="text-[11px] font-bold rounded-full px-2 py-0.5 border border-rose-500/60 bg-rose-500/20 text-rose-200">
                Arriesgada
              </span>
            )}
          </div>
        )}

        <div className="mt-3 rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-[12px] text-emerald-300">
          🎁 {node.reward}
        </div>
        {team?.taunt && <p className="mt-2 text-[11px] italic text-slate-500">«{team.taunt}»</p>}

        <div className="mt-3 flex gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold text-slate-300 active:scale-95 transition"
          >
            Atrás
          </button>
          <button
            onClick={onEnter}
            disabled={!canEnter}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-extrabold text-white active:scale-[0.97] transition disabled:opacity-40"
            style={{ background: canEnter ? meta.color : '#334155', color: canEnter ? '#0f172a' : undefined }}
          >
            {canEnter ? 'Entrar' : node.cleared ? 'Ya jugada' : 'No llegas desde aquí'}
          </button>
        </div>
      </div>
    </div>
  )
}
