// COMPARADOR de jugadores: dos columnas, atributo a atributo, con el mejor de
// cada fila en verde. Se abre desde la ficha de cualquier jugador (tuyo o
// rival de la previa) y el segundo se elige de tu plantilla.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { effectiveStats } from '@/engine/inazuma/roster'
import { getPlayerBase } from '@/data/inazuma/players'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { PlayerRow, portraitUrl } from '@/ui/inazuma/PlayerCard'
import { ElementIcon, Stars } from '@/ui/inazuma/Glyphs'
import type { Element, Position, Stats } from '@/engine/inazuma/types'

/** Un lado de la comparación, ya resuelto a números. */
export interface CompareBlock {
  name: string
  baseId: string
  position: Position
  element: Element
  level: number
  rarity: number
  stats: Stats
}

const ROWS: { key: keyof Stats; label: string }[] = [
  { key: 'tiro', label: 'Tiro' },
  { key: 'control', label: 'Control' },
  { key: 'fisico', label: 'Físico' },
  { key: 'defensa', label: 'Defensa' },
  { key: 'velocidad', label: 'Velocidad' },
  { key: 'aguante', label: 'Aguante' },
]

export default function CompareSheet({ a, onClose }: { a: CompareBlock; onClose: () => void }) {
  const { save } = useInazuma()
  const [bUid, setBUid] = useState<string | null>(null)

  const bPlayer = bUid ? save?.roster.find((p) => p.uid === bUid) : null
  const b: CompareBlock | null = bPlayer
    ? {
        name: getPlayerBase(bPlayer.baseId).name,
        baseId: bPlayer.baseId,
        position: getPlayerBase(bPlayer.baseId).position,
        element: getPlayerBase(bPlayer.baseId).element,
        level: bPlayer.level,
        rarity: getPlayerBase(bPlayer.baseId).rarity,
        stats: effectiveStats(bPlayer),
      }
    : null

  return createPortal(
    <div className="fixed inset-0 z-[94]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md max-h-[88svh] overflow-y-auto rounded-t-3xl border-t border-x border-slate-700 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <Icon name="scales" className="w-5 h-5 text-amber-300" />
          <h2 className="font-extrabold">Comparar</h2>
          <button className="ml-auto text-slate-500" onClick={onClose}>
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {!b && (
          <>
            <p className="text-[12px] text-slate-400 mb-2">
              ¿Con quién comparo a <b className="text-slate-200">{a.name}</b>?
            </p>
            <div className="flex flex-col gap-1.5">
              {save?.roster.filter((p) => p.baseId !== a.baseId || p.uid !== bUid).map((p) => (
                <PlayerRow key={p.uid} player={p} onClick={() => setBUid(p.uid)} />
              ))}
            </div>
          </>
        )}

        {b && (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-3">
              <Head block={a} />
              <span className="text-base font-black text-slate-500">VS</span>
              <Head block={b} right />
            </div>

            <div className="flex flex-col gap-1">
              {ROWS.map(({ key, label }) => {
                const av = a.stats[key]
                const bv = b.stats[key]
                return (
                  <div key={key} className="grid grid-cols-[3rem_1fr_5rem_1fr_3rem] items-center gap-1.5">
                    <span className={`text-[13px] font-extrabold tabular-nums text-right ${
                      av > bv ? 'text-emerald-300' : av < bv ? 'text-slate-500' : 'text-slate-300'
                    }`}>
                      {av}
                    </span>
                    <Bar value={av} peer={bv} align="right" win={av >= bv} />
                    <span className="text-[10px] uppercase tracking-wide text-slate-500 text-center">{label}</span>
                    <Bar value={bv} peer={av} align="left" win={bv >= av} />
                    <span className={`text-[13px] font-extrabold tabular-nums ${
                      bv > av ? 'text-emerald-300' : bv < av ? 'text-slate-500' : 'text-slate-300'
                    }`}>
                      {bv}
                    </span>
                  </div>
                )
              })}
            </div>

            <Button variant="secondary" full className="mt-3" onClick={() => setBUid(null)}>
              Comparar con otro
            </Button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

function Head({ block, right }: { block: CompareBlock; right?: boolean }) {
  const info = ELEMENT_INFO[block.element]
  return (
    <div className={`flex items-center gap-2 min-w-0 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="w-11 h-11 rounded-xl overflow-hidden border-2 shrink-0 bg-slate-800" style={{ borderColor: info.color }}>
        <ImgFallback
          src={portraitUrl(block.baseId)}
          className="w-full h-full object-cover object-top"
          alt={block.name}
          fallback={<span className="grid place-items-center w-full h-full text-xs font-extrabold" style={{ color: info.color }}>
            {block.name.slice(0, 2).toUpperCase()}
          </span>}
        />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-extrabold truncate">{block.name}</div>
        <div className={`flex items-center gap-1 text-[10px] text-slate-400 ${right ? 'justify-end' : ''}`}>
          {block.position} · Nv.{block.level}
          <ElementIcon element={block.element} className="w-3 h-3" />
        </div>
        <Stars n={block.rarity} className="w-2 h-2" />
      </div>
    </div>
  )
}

/** Barra proporcional al MEJOR de la pareja, para leer la diferencia de reojo. */
function Bar({ value, peer, align, win }: { value: number; peer: number; align: 'left' | 'right'; win: boolean }) {
  const max = Math.max(value, peer, 1)
  return (
    <div className={`h-1.5 rounded-full bg-slate-800 overflow-hidden ${align === 'right' ? 'rotate-180' : ''}`}>
      <div
        className="h-full rounded-full"
        style={{ width: `${(value / max) * 100}%`, background: win ? '#34d399' : '#475569' }}
      />
    </div>
  )
}
