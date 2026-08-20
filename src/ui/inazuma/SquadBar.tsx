// LA PLANTILLA A LA VISTA en el mapa, como la barra del equipo de 6 del modo
// Pokémon: el CINCO titular, el banquillo y los huecos por reclutar, con
// foto, nivel, reborde de rareza y barras de PT/aguante. Drag & drop para
// mover a cualquiera entre el cinco y el banquillo (mismo patrón de pointer
// events + elementFromPoint que PitchView — sin librerías).
import { useState } from 'react'
import { useInazuma } from '@/state/inazumaStore'
import { getPlayerBase } from '@/data/inazuma/players'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { rarityBorder } from '@/ui/inazuma/Glyphs'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { ptMax, rarityOf } from '@/engine/inazuma/roster'
import { ROSTER_MAX, SQUAD_SIZE, type PlayerInstance } from '@/engine/inazuma/types'

function Chip({ p, dragging, onDown, onUp }: {
  p: PlayerInstance
  dragging: boolean
  onDown: (e: React.PointerEvent) => void
  onUp: (e: React.PointerEvent) => void
}) {
  const b = getPlayerBase(p.baseId)
  const r = rarityOf(p)
  const pt = Math.max(0, Math.min(1, p.pt / Math.max(1, ptMax(p))))
  const agu = Math.max(0, Math.min(1, p.stamina / 100))
  return (
    <div
      data-uid={p.uid}
      onPointerDown={onDown}
      onPointerUp={onUp}
      className={`shrink-0 w-11 flex flex-col items-center touch-none cursor-grab select-none transition ${
        dragging ? 'opacity-40 scale-95' : ''
      }`}
    >
      <div className="relative">
        <span
          className="block w-10 h-10 rounded-full overflow-hidden border-2 bg-slate-900"
          style={{ borderColor: r === 4 ? 'transparent' : rarityBorder(r) }}
        >
          <ImgFallback
            src={portraitUrl(b.id)}
            className="w-full h-full object-cover object-top pointer-events-none"
            alt={b.name}
            fallback={<span className="grid place-items-center w-full h-full text-[10px] font-extrabold">{b.name.slice(0, 2).toUpperCase()}</span>}
          />
          {r === 4 && <span className="mc-ring rounded-full" />}
        </span>
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/95 border border-slate-700 px-1 text-[8px] font-bold tabular-nums leading-tight">
          {p.level}
        </span>
      </div>
      {/* PT (azul) y aguante (verde), en miniatura. */}
      <div className="mt-1.5 w-9 h-[3px] rounded-full bg-slate-800 overflow-hidden">
        <span className="block h-full bg-sky-400" style={{ width: `${pt * 100}%` }} />
      </div>
      <div className="mt-0.5 w-9 h-[3px] rounded-full bg-slate-800 overflow-hidden">
        <span className="block h-full bg-emerald-400" style={{ width: `${agu * 100}%` }} />
      </div>
    </div>
  )
}

export default function SquadBar() {
  const { save, swapPlayers } = useInazuma()
  const [dragUid, setDragUid] = useState<string | null>(null)
  if (!save) return null

  const byUid = new Map(save.roster.map((p) => [p.uid, p]))
  const titulares = save.lineup.map((u) => byUid.get(u)).filter((p): p is PlayerInstance => !!p)
  const bench = save.roster.filter((p) => !save.lineup.includes(p.uid))
  const holes = Math.max(0, ROSTER_MAX - save.roster.length)

  const down = (uid: string) => (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragUid(uid)
  }
  const up = (e: React.PointerEvent) => {
    if (dragUid) {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-uid]')
      const target = el?.getAttribute('data-uid')
      if (target && target !== dragUid) swapPlayers(dragUid, target)
    }
    setDragUid(null)
  }

  return (
    <div className="shrink-0 border-t border-slate-800 bg-slate-900/85 px-2 pt-2 pb-1.5">
      <div className="flex items-end gap-1.5 overflow-x-auto no-scrollbar">
        {/* EL CINCO */}
        {titulares.map((p) => (
          <Chip key={p.uid} p={p} dragging={dragUid === p.uid} onDown={down(p.uid)} onUp={up} />
        ))}
        {/* Huecos del cinco aún sin cubrir (plantilla en construcción). */}
        {Array.from({ length: Math.max(0, Math.min(SQUAD_SIZE, save.roster.length, SQUAD_SIZE) - titulares.length) }).map((_, i) => (
          <div key={`s${i}`} className="shrink-0 w-11 grid place-items-center">
            <span className="w-10 h-10 rounded-full border-2 border-dashed border-slate-700" />
          </div>
        ))}
        {/* Separador cinco/banquillo. */}
        <div className="shrink-0 self-stretch w-px bg-slate-700/80 mx-0.5" />
        {/* EL BANQUILLO */}
        {bench.map((p) => (
          <Chip key={p.uid} p={p} dragging={dragUid === p.uid} onDown={down(p.uid)} onUp={up} />
        ))}
        {/* Huecos por RECLUTAR hasta los 8. */}
        {Array.from({ length: holes }).map((_, i) => (
          <div key={`h${i}`} className="shrink-0 w-11 flex flex-col items-center opacity-50">
            <span className="w-10 h-10 rounded-full border-2 border-dashed border-slate-700 grid place-items-center">
              <Icon name="plus" className="w-4 h-4 text-slate-600" />
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[8px] uppercase tracking-widest text-slate-600 px-0.5">
        <span>El cinco</span>
        <span>{save.roster.length}/{ROSTER_MAX} · arrastra para cambiar</span>
      </div>
    </div>
  )
}
