// Alineación sobre el campo, con arrastrar y soltar.
//
// Es la vista natural de un juego de fútbol: ves las líneas, quién ocupa cada
// puesto y a quién tienes en el banquillo. Arrastrando intercambias dos
// jugadores (titular↔titular para reordenar, titular↔suplente para rotar).
//
// Usa eventos de PUNTERO, no la API de drag & drop de HTML5: esta última no
// funciona en móvil, que es donde se juega. Se implementa a mano con
// `setPointerCapture` y detección del destino con `elementFromPoint`.
import { useRef, useState } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { overall } from '@/engine/inazuma/roster'
import { getFormation } from '@/data/inazuma/formations'
import { getPlayerBase } from '@/data/inazuma/players'
import { portraitUrl, staminaColor } from '@/ui/inazuma/PlayerCard'
import type { InazumaSave, PlayerInstance, Position } from '@/engine/inazuma/types'

/** Filas del campo, de portería a ataque. */
const ROWS: { pos: Position; label: string }[] = [
  { pos: 'DEL', label: 'Ataque' },
  { pos: 'MED', label: 'Centro' },
  { pos: 'DEF', label: 'Defensa' },
  { pos: 'POR', label: 'Portería' },
]

interface DragState {
  uid: string
  x: number
  y: number
}

export default function PitchView({
  save, onSwap, onTap,
}: {
  save: InazumaSave
  /** Intercambia dos jugadores (uno puede ser del banquillo). */
  onSwap: (a: string, b: string) => void
  onTap: (uid: string) => void
}) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const moved = useRef(false)

  const byUid = new Map(save.roster.map((p) => [p.uid, p]))
  const starters = save.lineup.map((u) => byUid.get(u)).filter((p): p is PlayerInstance => !!p)
  const bench = save.roster.filter((p) => !save.lineup.includes(p.uid))
  const formation = getFormation(save.formation)
  const posOf = (p: PlayerInstance) => getPlayerBase(p.baseId).position

  const start = (uid: string) => (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    moved.current = false
    setDrag({ uid, x: e.clientX, y: e.clientY })
  }

  const move = (e: React.PointerEvent) => {
    if (!drag) return
    if (Math.abs(e.clientX - drag.x) > 6 || Math.abs(e.clientY - drag.y) > 6) moved.current = true
    setDrag({ ...drag, x: e.clientX, y: e.clientY })
    // El elemento bajo el dedo marca el destino. `elementFromPoint` ignora la
    // ficha que se arrastra porque lleva `pointer-events: none`.
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const slot = el?.closest('[data-uid]') as HTMLElement | null
    const uid = slot?.dataset.uid
    setOver(uid && uid !== drag.uid ? uid : null)
  }

  const end = () => {
    if (!drag) return
    if (!moved.current) onTap(drag.uid)
    else if (over) onSwap(drag.uid, over)
    setDrag(null)
    setOver(null)
  }

  const dragged = drag ? byUid.get(drag.uid) : null

  return (
    <div className="flex flex-col gap-3" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      {/* Campo */}
      <div
        className="relative rounded-2xl border border-emerald-900/60 overflow-hidden select-none"
        style={{
          background: 'repeating-linear-gradient(180deg,#14532d22 0 26px,#16653422 26px 52px), #0b2a1a',
        }}
      >
        {/* líneas del campo */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-6 top-2 bottom-2 border-2 border-white/10 rounded-lg" />
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 w-16 h-16 -mt-8 border-2 border-white/10 rounded-full" />
          <div className="absolute inset-x-6 top-1/2 h-0 border-t-2 border-white/10" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-28 h-10 border-2 border-white/10 rounded-sm" />
        </div>

        <div className="relative p-3 flex flex-col gap-2.5">
          {ROWS.map(({ pos, label }) => {
            const line = starters.filter((p) => posOf(p) === pos)
            const want = pos === 'POR' ? 1 : pos === 'DEF' ? formation.defs : pos === 'MED' ? formation.mids : formation.fwds
            return (
              <div key={pos}>
                <div className="text-[8px] uppercase tracking-widest text-emerald-200/40 text-center mb-1">
                  {label} · {line.length}/{want}
                </div>
                <div className="flex justify-center gap-2 flex-wrap min-h-[52px]">
                  {line.map((p) => (
                    <PitchChip
                      key={p.uid}
                      player={p}
                      onPointerDown={start(p.uid)}
                      highlight={over === p.uid}
                      ghost={drag?.uid === p.uid}
                    />
                  ))}
                  {line.length < want && (
                    <span className="grid place-items-center w-11 h-11 rounded-xl border-2 border-dashed border-white/15 text-white/25 text-lg">
                      +
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Banquillo */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1.5">
          Banquillo · {bench.length}
        </div>
        {bench.length === 0 ? (
          <div className="text-[11px] text-slate-600">Sin suplentes. Ficha en el ojeador.</div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {bench.map((p) => (
              <PitchChip
                key={p.uid}
                player={p}
                bench
                onPointerDown={start(p.uid)}
                highlight={over === p.uid}
                ghost={drag?.uid === p.uid}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-600">
        Arrastra un jugador sobre otro para intercambiarlos. Un toque abre su ficha.
      </p>

      {/* Ficha que sigue al dedo */}
      {drag && dragged && (
        <div
          className="fixed z-[80] pointer-events-none opacity-90"
          style={{ left: drag.x - 22, top: drag.y - 22 }}
        >
          <PitchChip player={dragged} floating />
        </div>
      )}
    </div>
  )
}

function PitchChip({
  player, onPointerDown, highlight, ghost, bench, floating,
}: {
  player: PlayerInstance
  onPointerDown?: (e: React.PointerEvent) => void
  highlight?: boolean
  ghost?: boolean
  bench?: boolean
  floating?: boolean
}) {
  const base = getPlayerBase(player.baseId)
  const info = ELEMENT_INFO[base.element]
  return (
    <div
      data-uid={floating ? undefined : player.uid}
      onPointerDown={onPointerDown}
      className={`relative w-11 shrink-0 touch-none ${ghost ? 'opacity-30' : ''}`}
      style={{ cursor: 'grab' }}
    >
      <div
        className={`w-11 h-11 rounded-xl overflow-hidden border-2 grid place-items-center transition ${
          highlight ? 'scale-110 ring-2 ring-amber-300' : ''
        }`}
        style={{
          borderColor: highlight ? '#fcd34d' : `${info.color}88`,
          background: `${info.color}22`,
          boxShadow: floating ? '0 8px 20px rgba(0,0,0,.5)' : undefined,
        }}
      >
        <ImgFallback
          src={portraitUrl(base.id)}
          className="w-full h-full object-cover"
          alt={base.name}
          fallback={<span className="text-[11px] font-extrabold" style={{ color: info.color }}>{base.name[0]}</span>}
        />
      </div>
      {/* barra de aguante */}
      <div className="h-1 rounded-full bg-slate-800 overflow-hidden mt-0.5">
        <div className="h-full" style={{ width: `${player.stamina}%`, background: staminaColor(player.stamina) }} />
      </div>
      <div className={`text-[8px] leading-tight truncate text-center ${bench ? 'text-slate-500' : 'text-slate-300'}`}>
        {base.name.split(' ')[0]}
      </div>
      <span
        className="absolute -top-1.5 -right-1.5 rounded-full px-1 text-[8px] font-black leading-tight border border-black/40"
        style={{ background: info.color, color: '#0f172a' }}
      >
        {overall(player)}
      </span>
    </div>
  )
}
