import { useEffect, useRef, useState } from 'react'
import type { PokemonInstance } from '@/types'
import { getSpecies, getMove } from '@/data'
import Sprite from './Sprite'
import HpBar from './HpBar'
import TypeBadge from './TypeBadge'
import PowerDots from './PowerDots'
import { typeGradient } from '@/ui/theme/types'
import { tryGetItem } from '@/data/items'

interface Props {
  party: PokemonInstance[]
  selectedUid: string | null
  onSelect: (uid: string) => void
  onReorder: (uids: string[]) => void
}

/** Equipo en rejilla de 2 columnas, reordenable por arrastre y tap para abrir. */
export default function PartyList({ party, selectedUid, onSelect, onReorder }: Props) {
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [order, setOrder] = useState<string[]>(party.map((p) => p.uid))
  const [dragUid, setDragUid] = useState<string | null>(null)

  useEffect(() => {
    if (!dragUid) setOrder(party.map((p) => p.uid))
  }, [party, dragUid])

  const centerOf = (uid: string) => {
    const el = cellRefs.current.get(uid)
    if (!el) return { x: Infinity, y: Infinity }
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  useEffect(() => {
    if (!dragUid) return
    const move = (e: PointerEvent) => {
      setOrder((cur) => {
        // Índice de inserción en orden de lectura (fila a fila).
        let idx = 0
        for (const uid of cur) {
          if (uid === dragUid) continue
          const c = centerOf(uid)
          const before = c.y < e.clientY - 24 || (Math.abs(c.y - e.clientY) <= 24 && c.x < e.clientX)
          if (before) idx++
        }
        const without = cur.filter((u) => u !== dragUid)
        without.splice(idx, 0, dragUid)
        return without
      })
    }
    const up = () => {
      setDragUid(null)
      setOrder((cur) => { onReorder(cur); return cur })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragUid, onReorder])

  const byUid = new Map(party.map((p) => [p.uid, p]))
  const cells = order.map((u) => byUid.get(u)).filter(Boolean) as PokemonInstance[]

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {cells.map((mon, i) => {
          const sp = getSpecies(mon.speciesId)
          const isDragging = dragUid === mon.uid
          const fainted = mon.currentHp <= 0
          return (
            <div
              key={mon.uid}
              ref={(el) => { if (el) cellRefs.current.set(mon.uid, el) }}
              onPointerDown={(e) => {
                // arrastre con pulsación larga sobre la tarjeta
                const t = window.setTimeout(() => setDragUid(mon.uid), 220)
                const cancel = () => window.clearTimeout(t)
                e.currentTarget.addEventListener('pointerup', cancel, { once: true })
                e.currentTarget.addEventListener('pointercancel', cancel, { once: true })
              }}
              onClick={() => !dragUid && onSelect(mon.uid)}
              className={`relative rounded-2xl p-2 border transition select-none ${
                selectedUid === mon.uid ? 'border-red-400' : 'border-slate-700/60'
              } ${isDragging ? 'scale-[1.04] shadow-2xl shadow-black/50 ring-2 ring-red-400/60 z-50' : ''}`}
              style={{ background: isDragging ? 'rgba(30,41,59,0.98)' : 'rgba(15,23,42,0.6)', touchAction: 'none' }}
            >
              <div className="flex items-center gap-2">
                <div className={`relative shrink-0 rounded-xl p-0.5 ${fainted ? 'grayscale opacity-50' : ''}`} style={{ background: typeGradient(sp.types) }}>
                  <Sprite speciesId={mon.speciesId} shiny={mon.shiny} className="w-12 h-12 object-contain pointer-events-none" />
                  {i === 0 && <span className="absolute -top-1.5 -left-1.5 text-[8px] bg-red-500 px-1 rounded-full font-black">LÍDER</span>}
                  {mon.heldItemId && tryGetItem(mon.heldItemId)?.sprite && (
                    <img src={tryGetItem(mon.heldItemId)!.sprite} alt="" title={tryGetItem(mon.heldItemId)!.name}
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-800 border border-slate-600" style={{ imageRendering: 'pixelated' }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-sm truncate">{sp.displayName}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">Nv.{mon.level}</span>
                  </div>
                  <div className="flex gap-0.5 mt-0.5">{sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {mon.moves.map((mv, i) => { const md = getMove(mv.moveId); return <PowerDots key={i} type={md.type} power={md.power} size={6} /> })}
              </div>
              <div className="mt-1"><HpBar current={mon.currentHp} max={mon.stats.hp} status={mon.status} showNumbers /></div>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-slate-500 text-center mt-1.5">
        Toca para ver detalles · mantén pulsado y arrastra para reordenar (el 1º es el líder)
      </p>
    </div>
  )
}
