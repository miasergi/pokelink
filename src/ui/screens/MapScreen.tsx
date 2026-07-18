import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { CHAPTERS } from '@/data/story/chapters'
import { useSettings } from '@/state/settingsStore'
import { availableNextNodes } from '@/engine/run/runEngine'
import { mapSegments, activeSegment } from '@/engine/run/segments'
import { nodeDifficulty, isCombatNode } from '@/engine/run/difficulty'
import NodeIcon, { NODE_META } from '@/ui/components/NodeIcon'
import { IconCrown, IconTrophy, IconBadge } from '@/ui/components/icons'
import { badgeSprite } from '@/ui/components/nodeImage'
import { segmentTheme } from '@/ui/components/routeTheme'
import { ImgFallback } from '@/ui/components/kit'
import PartyBar from '@/ui/components/PartyBar'
import NodePreview from '@/ui/components/NodePreview'
import { TYPE_ES, TYPE_HEX } from '@/ui/theme/types'
import TypeIcon from '@/ui/components/TypeIcon'
import type { MapNode } from '@/engine/run/types'
import { Button, money, TopBar } from '@/ui/components/kit'
import RunTimer from '@/ui/components/RunTimer'
import { getRegion } from '@/data/trainers/regions'

const ROW_H = 124
const NODE = 60

export default function MapScreen() {
  const { run, chooseNode, navigate, lastEventResult, clearEventResult, setPartyOrder } = useGame()
  const skipNodeInfo = useSettings((s) => s.skipNodeInfo)
  const wrapRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(360)
  const [toast, setToast] = useState<string | null>(null)
  const [preview, setPreview] = useState<MapNode | null>(null)

  // --- Tramos: una pantalla por medalla (+ el tramo final de la Liga) ---
  const segs = useMemo(() => (run ? mapSegments(run.map) : []), [run])
  const active = run ? activeSegment(segs, run) : null
  const [viewIdx, setViewIdx] = useState(active?.index ?? 0)
  // Al avanzar de tramo (medalla conseguida), la vista salta sola al nuevo.
  useEffect(() => {
    if (active) setViewIdx(active.index)
  }, [active?.index]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Consume el mensaje de evento (lo limpia para que no reaparezca al volver).
  useEffect(() => {
    if (lastEventResult) {
      setToast(lastEventResult)
      clearEventResult()
    }
  }, [lastEventResult, clearEventResult])

  // Auto-cierre del toast a los 3,5 s (independiente del store).
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const seg = segs[Math.min(viewIdx, segs.length - 1)] ?? null

  // Al cambiar de tramo visible, coloca el scroll: en el tramo activo, cerca de
  // la capa actual; en los demás, arriba del todo.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !run || !seg) return
    const cur = Math.max(0, run.currentLayer)
    el.scrollTop = seg.index === active?.index && cur >= seg.start
      ? Math.max(0, (cur - seg.start) * ROW_H - 160)
      : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewIdx, run?.seed])

  if (!run || !seg) return null
  const { map } = run
  const reachable = new Set(availableNextNodes(run).map((n) => n.id))
  const partyAvg = run.party.length ? run.party.reduce((s, m) => s + m.level, 0) / run.party.length : 0

  // Margen lateral para que los nodos queden más centrados (no pegados al borde).
  const PAD = Math.min(48, width * 0.13)
  const xOf = (col: number, len: number) => PAD + ((col + 0.5) / len) * (width - 2 * PAD)
  const yOf = (layer: number) => (layer - seg.start) * ROW_H + ROW_H / 2

  const segLayers = seg.end - seg.start + 1
  const totalHeight = segLayers * ROW_H + 40
  const inSeg = (layer: number) => layer >= seg.start && layer <= seg.end

  const isLastSeg = seg.index === segs.length - 1
  const theme = segmentTheme(seg, isLastSeg)
  const chapter = run.story ? CHAPTERS[run.story - 1] : undefined
  const headerImg = chapter?.mapBg ?? theme.img
  const headerName = chapter ? run.region : theme.name
  const bossNode = seg.boss
  const bossTrainer = bossNode?.content.kind === 'trainer' ? bossNode.content.trainer : null
  const bossType = bossTrainer?.specialtyType
  const storyBg = chapter?.mapBg

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {storyBg && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: -1, backgroundImage: `linear-gradient(rgba(2,6,23,0.66), rgba(2,6,23,0.82)), url(${storyBg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(3px) saturate(0.9)', transform: 'scale(1.06)' }}
        />
      )}
      <TopBar
        title={
          <span className="text-sm">
            {run.region} · <span className="text-amber-300">{money(run.money)}</span>
            {' · '}<RunTimer run={run} className="text-slate-400" />
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

      {/* cabecera del tramo: imagen de la ruta + hacia qué jefe vas */}
      <div key={`hdr-${seg.index}`} className="relative h-24 shrink-0 overflow-hidden border-b border-slate-800 animate-pop-in">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: `url(${headerImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(2,6,23,0.85) 0%, rgba(2,6,23,0.45) 45%, rgba(2,6,23,0.75) 100%)' }} />
        <div className="relative h-full flex items-center justify-between px-2">
          <button
            onClick={() => setViewIdx((i) => Math.max(0, i - 1))}
            disabled={seg.index === 0}
            className={`w-8 h-8 rounded-full bg-slate-900/70 border border-slate-700 text-lg leading-none ${seg.index === 0 ? 'opacity-25' : ''}`}
            aria-label="Tramo anterior"
          >
            ‹
          </button>
          <div className="flex-1 min-w-0 px-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              {segs.length > 1 ? `Tramo ${seg.index + 1} de ${segs.length}` : 'Capítulo'}
              {active && seg.index !== active.index && (
                <button onClick={() => setViewIdx(active.index)} className="ml-2 text-amber-300 normal-case tracking-normal underline">
                  volver al actual
                </button>
              )}
            </div>
            <div className="text-base font-black text-white drop-shadow">{headerName}</div>
            <div className="text-[11px] text-slate-200 flex items-center gap-1 min-w-0">
              {bossNode?.type === 'gym' && bossTrainer ? (
                <>
                  <ImgFallback
                    src={badgeSprite(getRegion(run.gen).badgeBase + seg.index + 1)}
                    alt=""
                    className={`w-4 h-4 object-contain ${bossNode.cleared ? '' : 'grayscale opacity-60'}`}
                    style={{ imageRendering: 'pixelated' }}
                    fallback={<IconBadge size={14} />}
                  />
                  <span className="truncate">
                    {bossNode.cleared ? 'Medalla conseguida · ' : 'Hacia el gimnasio de '}
                    <b>{bossTrainer.name}</b> · Nv.{bossNode.enemyLevel}
                  </span>
                  {bossType && (
                    <span className="inline-flex items-center gap-0.5 font-bold" style={{ color: TYPE_HEX[bossType] }}>
                      <TypeIcon type={bossType} />
                      {TYPE_ES[bossType]}
                    </span>
                  )}
                </>
              ) : (
                <span className="truncate">
                  {chapter
                    ? <>Hacia el jefe del capítulo{bossNode ? <> · Nv.{bossNode.enemyLevel}</> : null}</>
                    : <>Alto Mando y Campeón · hasta Nv.{bossNode?.enemyLevel ?? 100}</>}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setViewIdx((i) => Math.min(segs.length - 1, i + 1))}
            disabled={seg.index >= segs.length - 1}
            className={`w-8 h-8 rounded-full bg-slate-900/70 border border-slate-700 text-lg leading-none ${seg.index >= segs.length - 1 ? 'opacity-25' : ''}`}
            aria-label="Tramo siguiente"
          >
            ›
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
        <div ref={wrapRef} className="relative mx-auto" style={{ height: totalHeight, width: '100%' }}>
          {/* líneas de conexión (solo dentro del tramo visible) */}
          <svg className="absolute inset-0 pointer-events-none" width={width} height={totalHeight}>
            {map.layers.map((layerIds, li) =>
              inSeg(li) && li < seg.end
                ? layerIds.map((id) => {
                    const node = map.nodes[id]
                    return node.next.map((nx) => {
                      const target = map.nodes[nx]
                      if (!inSeg(target.layer)) return null
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
                  })
                : null,
            )}
          </svg>

          {/* nodos del tramo */}
          {map.layers.map((layerIds, li) =>
            inSeg(li)
              ? layerIds.map((id) => {
                  const node = map.nodes[id]
                  const isReach = reachable.has(id)
                  const isCurrent = run.currentNodeId === id
                  const meta = NODE_META[node.type]
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        // Con "omitir info": entra directo si la casilla es accesible.
                        if (skipNodeInfo && isReach && !node.cleared) chooseNode(id)
                        else setPreview(node)
                      }}
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
                      {!node.cleared && isCombatNode(node) && (() => {
                        const d = nodeDifficulty(node, partyAvg, run.difficulty)
                        if (d.tier === 0) return null
                        return (
                          <span
                            title={`${d.label}: enemigo +${d.delta} niveles sobre tu equipo${node.risky ? ' · mejor botín' : ''}`}
                            className="absolute -top-1.5 -right-1.5 text-[9px] font-black leading-none rounded-full px-1 py-0.5 border border-black/40"
                            style={{ background: d.color, color: '#1e293b', filter: 'drop-shadow(0 0 2px #000)' }}
                          >
                            {'★'.repeat(d.tier)}
                          </span>
                        )
                      })()}
                      {(node.type === 'gym' || node.type === 'elite' || node.type === 'champion' || node.type === 'rival' || node.type === 'legendary') && (
                        <div className="flex flex-col items-center mt-0.5 leading-tight">
                          <span className="text-[8px] font-bold whitespace-nowrap" style={{ color: meta.color }}>
                            Nv.{node.enemyLevel}
                          </span>
                          {node.content.kind === 'trainer' && node.content.trainer.specialtyType && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[8px] font-bold whitespace-nowrap"
                              style={{ color: TYPE_HEX[node.content.trainer.specialtyType] }}
                            >
                              <TypeIcon type={node.content.trainer.specialtyType} />{TYPE_ES[node.content.trainer.specialtyType]}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })
              : null,
          )}
        </div>
      </div>

      {toast && (
        <div onClick={() => setToast(null)} className="absolute top-20 left-1/2 -translate-x-1/2 z-30 max-w-[90%] text-center bg-slate-800 border border-slate-600 px-4 py-2 rounded-xl text-sm shadow-xl animate-pop-in cursor-pointer">
          {toast}
        </div>
      )}

      <div className="p-2.5 safe-bottom">
        <PartyBar party={run.party} onReorder={setPartyOrder} onOpenBag={() => navigate('team')} />
      </div>

      {preview && (
        <NodePreview
          node={preview}
          partyAvgLevel={partyAvg}
          difficulty={run.difficulty}
          canEnter={reachable.has(preview.id) && !preview.cleared}
          onEnter={() => {
            const id = preview.id
            setPreview(null)
            chooseNode(id)
          }}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
