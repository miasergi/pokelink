import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { availableNextNodes } from '@/engine/run/runEngine'
import NodeIcon, { NODE_META } from '@/ui/components/NodeIcon'
import { IconCrown, IconTrophy, IconBadge } from '@/ui/components/icons'
import { badgeSprite } from '@/ui/components/nodeImage'
import { ImgFallback } from '@/ui/components/kit'
import PartyBar from '@/ui/components/PartyBar'
import NodePreview from '@/ui/components/NodePreview'
import { TYPE_ES, TYPE_HEX } from '@/ui/theme/types'
import type { MapNode } from '@/engine/run/types'
import { Button, money, TopBar } from '@/ui/components/kit'
import { getRegion } from '@/data/trainers/regions'

const ROW_H = 124
const NODE = 60

export default function MapScreen() {
  const { run, chooseNode, navigate, lastEventResult } = useGame()
  const wrapRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(360)
  const [toast, setToast] = useState<string | null>(null)
  const [preview, setPreview] = useState<MapNode | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (lastEventResult) {
      setToast(lastEventResult)
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [lastEventResult])

  // auto-scroll a la capa actual
  useEffect(() => {
    const target = !run || run.currentLayer < 0 ? 0 : run.currentLayer
    scrollRef.current?.scrollTo({ top: Math.max(0, target * ROW_H - 200), behavior: 'smooth' })
  }, [run?.currentNodeId])

  if (!run) return null
  const { map } = run
  const reachable = new Set(availableNextNodes(run).map((n) => n.id))

  // Margen lateral para que los nodos queden más centrados (no pegados al borde).
  const PAD = Math.min(48, width * 0.13)
  const xOf = (col: number, len: number) => PAD + ((col + 0.5) / len) * (width - 2 * PAD)
  const yOf = (layer: number) => layer * ROW_H + ROW_H / 2

  const totalHeight = map.layers.length * ROW_H + 40

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        title={
          <span>
            {run.region} · <span className="text-amber-300">{money(run.money)}</span>
          </span>
        }
        left={
          <Button variant="ghost" onClick={() => navigate('team')}>
            👥
          </Button>
        }
        right={
          <Button variant="ghost" onClick={() => navigate('settings')}>
            ⚙
          </Button>
        }
      />

      {/* progreso de medallas */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/60 border-b border-slate-800 overflow-x-auto no-scrollbar">
        {getRegion(run.gen).gymLeaders.map((g, i) => {
          const earned = i < run.stats.gymsDefeated
          return (
            <ImgFallback
              key={g.id}
              src={badgeSprite(getRegion(run.gen).badgeBase + i + 1)}
              alt={g.name}
              className={`w-5 h-5 object-contain ${earned ? '' : 'grayscale opacity-30'}`}
              style={{ imageRendering: 'pixelated' }}
              fallback={
                <span style={{ color: earned ? '#fcd34d' : '#475569' }}>
                  <IconBadge size={18} />
                </span>
              }
            />
          )
        })}
        <span className="mx-0.5 text-slate-600">·</span>
        {getRegion(run.gen).eliteFour.map((g, i) => (
          <span key={g.id} style={{ color: i < run.stats.eliteDefeated ? '#c084fc' : '#475569' }}>
            <IconCrown size={18} />
          </span>
        ))}
        <span style={{ color: run.status === 'won' ? '#fde047' : '#475569' }}>
          <IconTrophy size={18} />
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
        <div ref={wrapRef} className="relative mx-auto" style={{ height: totalHeight, width: '100%' }}>
          {/* líneas de conexión */}
          <svg className="absolute inset-0 pointer-events-none" width={width} height={totalHeight}>
            {map.layers.map((layerIds, li) =>
              layerIds.map((id) => {
                const node = map.nodes[id]
                return node.next.map((nx) => {
                  const target = map.nodes[nx]
                  const lit = node.cleared || reachable.has(id) || reachable.has(nx)
                  return (
                    <line
                      key={`${id}-${nx}`}
                      x1={xOf(node.col, layerIds.length)}
                      y1={yOf(li)}
                      x2={xOf(target.col, map.layers[li + 1].length)}
                      y2={yOf(li + 1)}
                      stroke={node.cleared ? '#475569' : lit ? '#f59e0b88' : '#334155'}
                      strokeWidth={2}
                      strokeDasharray={node.cleared ? '0' : lit ? '0' : '4 4'}
                    />
                  )
                })
              }),
            )}
          </svg>

          {/* nodos */}
          {map.layers.map((layerIds, li) =>
            layerIds.map((id) => {
              const node = map.nodes[id]
              const isReach = reachable.has(id)
              const isCurrent = run.currentNodeId === id
              const meta = NODE_META[node.type]
              return (
                <button
                  key={id}
                  onClick={() => setPreview(node)}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: xOf(node.col, layerIds.length) - NODE / 2,
                    top: yOf(li) - NODE / 2,
                    width: NODE,
                  }}
                >
                  <NodeIcon
                    node={node}
                    size={NODE}
                    active={isReach}
                    cleared={node.cleared && !isCurrent}
                    dim={!isReach && !node.cleared}
                  />
                  {(node.type === 'gym' || node.type === 'elite' || node.type === 'champion' || node.type === 'rival' || node.type === 'legendary') && (
                    <div className="flex flex-col items-center mt-0.5 leading-tight">
                      <span className="text-[8px] font-bold whitespace-nowrap" style={{ color: meta.color }}>
                        Nv.{node.enemyLevel}
                      </span>
                      {node.content.kind === 'trainer' && node.content.trainer.specialtyType && (
                        <span
                          className="text-[8px] font-bold whitespace-nowrap"
                          style={{ color: TYPE_HEX[node.content.trainer.specialtyType] }}
                        >
                          {TYPE_ES[node.content.trainer.specialtyType]}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            }),
          )}
        </div>
      </div>

      {toast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-800 border border-slate-600 px-4 py-2 rounded-xl text-sm shadow-xl animate-pop-in">
          {toast}
        </div>
      )}

      <div className="p-2.5 safe-bottom">
        <PartyBar party={run.party} onClick={() => navigate('team')} />
      </div>

      {preview && (
        <NodePreview
          node={preview}
          canEnter={reachable.has(preview.id) && !preview.cleared}
          onEnter={() => {
            const id = preview.id
            setPreview(null)
            chooseNode(id)
          }}
          onPrepare={() => {
            setPreview(null)
            navigate('team')
          }}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
