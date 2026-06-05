import { useEffect, useRef, useState } from 'react'
import type { PokemonInstance } from '@/types'
import Sprite from './Sprite'
import { tryGetItem } from '@/data/items'

/** Barra de equipo con reordenado por arrastre (drag&drop) + botón mochila. */
export default function PartyBar({
  party, onReorder, onOpenBag,
}: {
  party: PokemonInstance[]
  onReorder: (uids: string[]) => void
  onOpenBag: () => void
}) {
  const [items, setItems] = useState(party)
  const [dragUid, setDragUid] = useState<string | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  // Sincroniza con el equipo real cuando no estás arrastrando.
  useEffect(() => {
    if (!dragUid) setItems(party)
  }, [party, dragUid])

  const slotAtX = (clientX: number): number => {
    const row = rowRef.current
    if (!row) return -1
    const kids = Array.from(row.querySelectorAll('[data-mon]')) as HTMLElement[]
    for (let i = 0; i < kids.length; i++) {
      const r = kids[i].getBoundingClientRect()
      if (clientX < r.left + r.width / 2) return i
    }
    return kids.length - 1
  }

  const onDown = (uid: string) => (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragUid(uid)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragUid) return
    const target = slotAtX(e.clientX)
    const from = items.findIndex((m) => m.uid === dragUid)
    if (target < 0 || target === from) return
    const next = [...items]
    const [m] = next.splice(from, 1)
    next.splice(target, 0, m)
    setItems(next)
  }
  const onUp = () => {
    if (dragUid) {
      const uids = items.map((m) => m.uid)
      if (uids.join() !== party.map((m) => m.uid).join()) onReorder(uids)
    }
    setDragUid(null)
  }

  return (
    <div className="flex items-stretch gap-2">
      <div
        ref={rowRef}
        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-slate-900/70 rounded-2xl border border-slate-800"
      >
        {items.map((mon) => {
          const frac = Math.max(0, mon.currentHp / mon.stats.hp)
          const fainted = mon.currentHp <= 0
          const color = frac > 0.5 ? '#34d399' : frac > 0.2 ? '#fbbf24' : '#f87171'
          const dragging = dragUid === mon.uid
          return (
            <div
              key={mon.uid}
              data-mon
              onPointerDown={onDown(mon.uid)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className={`flex flex-col items-center gap-0.5 touch-none cursor-grab select-none transition-transform ${dragging ? 'scale-125 -translate-y-1 z-10' : ''}`}
            >
              <div className={`relative ${fainted ? 'opacity-40 grayscale' : ''}`}>
                <Sprite speciesId={mon.speciesId} variant="front" shiny={mon.shiny} className="w-9 h-9 object-contain pointer-events-none" />
                {mon.heldItemId && tryGetItem(mon.heldItemId)?.sprite && (
                  <img src={tryGetItem(mon.heldItemId)!.sprite} alt="" title={tryGetItem(mon.heldItemId)!.name}
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-600 pointer-events-none"
                    style={{ imageRendering: 'pixelated' }} />
                )}
              </div>
              <div className="w-8 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${frac * 100}%`, backgroundColor: color }} />
              </div>
              <span className="text-[9px] font-bold text-slate-300 leading-none">Nv.{mon.level}</span>
            </div>
          )
        })}
        {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="w-9 h-9 rounded-lg border border-dashed border-slate-700/60" />
        ))}
      </div>
      <button
        onClick={onOpenBag}
        aria-label="Equipo y mochila"
        className="shrink-0 px-3 rounded-2xl bg-slate-800 border border-slate-700 grid place-items-center text-2xl active:scale-95 transition"
      >
        🎒
      </button>
    </div>
  )
}
