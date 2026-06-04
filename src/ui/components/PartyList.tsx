import { useEffect, useRef, useState } from 'react'
import type { PokemonInstance } from '@/types'
import { getSpecies } from '@/data'
import Sprite from './Sprite'
import HpBar from './HpBar'
import TypeBadge from './TypeBadge'
import { typeGradient } from '@/ui/theme/types'

interface Props {
  party: PokemonInstance[]
  selectedUid: string | null
  onSelect: (uid: string) => void
  onReorder: (uids: string[]) => void
}

/** Lista de equipo reordenable con drag & drop (asa lateral) y tap para seleccionar. */
export default function PartyList({ party, selectedUid, onSelect, onReorder }: Props) {
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [order, setOrder] = useState<string[]>(party.map((p) => p.uid))
  const [dragUid, setDragUid] = useState<string | null>(null)

  // Sincroniza el orden cuando cambia el equipo (y no estamos arrastrando)
  useEffect(() => {
    if (!dragUid) setOrder(party.map((p) => p.uid))
  }, [party, dragUid])

  const centerOf = (uid: string) => {
    const el = rowRefs.current.get(uid)
    if (!el) return Infinity
    const r = el.getBoundingClientRect()
    return r.top + r.height / 2
  }

  useEffect(() => {
    if (!dragUid) return
    const move = (e: PointerEvent) => {
      const y = e.clientY
      setOrder((cur) => {
        let idx = 0
        for (const uid of cur) {
          if (uid === dragUid) continue
          if (centerOf(uid) < y) idx++
        }
        const without = cur.filter((u) => u !== dragUid)
        without.splice(idx, 0, dragUid)
        return without
      })
    }
    const up = () => {
      setDragUid(null)
      setOrder((cur) => {
        onReorder(cur)
        return cur
      })
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
  const rows = order.map((u) => byUid.get(u)).filter(Boolean) as PokemonInstance[]

  return (
    <div className="flex flex-col gap-2">
      {rows.map((mon, i) => {
        const sp = getSpecies(mon.speciesId)
        const isDragging = dragUid === mon.uid
        const fainted = mon.currentHp <= 0
        return (
          <div
            key={mon.uid}
            ref={(el) => {
              if (el) rowRefs.current.set(mon.uid, el)
            }}
            onClick={() => !dragUid && onSelect(mon.uid)}
            className={`flex items-center gap-2.5 rounded-2xl p-2.5 border transition select-none ${
              selectedUid === mon.uid ? 'border-red-400' : 'border-slate-700/60'
            } ${isDragging ? 'scale-[1.03] shadow-2xl shadow-black/50 ring-2 ring-red-400/60 z-50 relative' : ''}`}
            style={{ background: isDragging ? 'rgba(30,41,59,0.98)' : 'rgba(15,23,42,0.6)' }}
          >
            <div className={`relative shrink-0 rounded-xl p-0.5 ${fainted ? 'grayscale opacity-50' : ''}`} style={{ background: typeGradient(sp.types) }}>
              <Sprite speciesId={mon.speciesId} shiny={mon.shiny} className="w-12 h-12 object-contain" />
              {i === 0 && (
                <span className="absolute -top-1.5 -left-1.5 text-[8px] bg-red-500 px-1 rounded-full font-black">LÍDER</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="font-bold truncate">{sp.displayName}</span>
                <span className="text-xs text-slate-400">Nv.{mon.level}</span>
              </div>
              <div className="flex gap-1 mt-0.5">
                {sp.types.map((t) => (
                  <TypeBadge key={t} type={t} size="sm" />
                ))}
              </div>
              <div className="mt-1">
                <HpBar current={mon.currentHp} max={mon.stats.hp} status={mon.status} showNumbers />
              </div>
            </div>
            {/* asa de arrastre */}
            <button
              aria-label="Reordenar"
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragUid(mon.uid)
              }}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 px-1.5 py-2 text-slate-500 active:text-red-400 cursor-grab touch-none"
              style={{ touchAction: 'none' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
              </svg>
            </button>
          </div>
        )
      })}
      <p className="text-[11px] text-slate-500 text-center mt-0.5">
        Arrastra <span className="text-slate-400">⠿</span> para reordenar · el primero es el líder · toca para ver detalles
      </p>
    </div>
  )
}
