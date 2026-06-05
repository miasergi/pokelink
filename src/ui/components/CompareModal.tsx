import { useState } from 'react'
import type { PokemonInstance } from '@/types'
import { getSpecies } from '@/data'
import { getItem } from '@/data/items'
import { displayStats } from '@/engine/team/itemEffect'
import Sprite from './Sprite'
import TypeBadge from './TypeBadge'
import { typeGradient } from '@/ui/theme/types'

/** Modal de comparación: elige un segundo Pokémon y ve ambos (arriba/abajo) con
 *  sus stats en 2 columnas; el mejor valor de cada stat en verde. */
export default function CompareModal({ team, baseUid, onClose }: { team: PokemonInstance[]; baseUid: string; onClose: () => void }) {
  const base = team.find((p) => p.uid === baseUid)
  const [otherUid, setOtherUid] = useState<string | null>(null)
  const other = otherUid ? team.find((p) => p.uid === otherUid) ?? null : null
  if (!base) return null

  return (
    <div className="absolute inset-0 z-[75] bg-black/75 backdrop-blur-sm grid place-items-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[94%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-extrabold">⚖ Comparar</div>
          <button className="text-slate-400 text-2xl leading-none px-1 active:scale-90" onClick={onClose}>✕</button>
        </div>

        {!other ? (
          <>
            <div className="text-xs text-slate-400 mb-2">Elige el segundo Pokémon para comparar con <b>{getSpecies(base.speciesId).displayName}</b>.</div>
            <div className="grid grid-cols-3 gap-2">
              {team.filter((p) => p.uid !== baseUid).map((p) => {
                const sp = getSpecies(p.speciesId)
                return (
                  <button key={p.uid} onClick={() => setOtherUid(p.uid)} className="rounded-2xl border border-slate-700 p-2 active:scale-95 transition" style={{ background: 'rgba(15,23,42,0.6)' }}>
                    <Sprite speciesId={p.speciesId} shiny={p.shiny} className="w-14 h-14 object-contain mx-auto" />
                    <div className="text-[11px] font-bold truncate text-center">{sp.displayName}</div>
                    <div className="text-[9px] text-slate-400 text-center">Nv.{p.level}</div>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <Mon mon={base} vs={other} />
            <div className="text-center text-slate-500 text-xl my-1">⚔</div>
            <Mon mon={other} vs={base} />
            <button onClick={() => setOtherUid(null)} className="w-full mt-3 py-2 rounded-xl bg-slate-700 text-slate-200 text-sm font-bold active:scale-[0.98]">Elegir otro</button>
          </>
        )}
      </div>
    </div>
  )
}

/** Tarjeta de un Pokémon con stats en 2 columnas; verde si gana la stat, rojo si pierde. */
function Mon({ mon, vs }: { mon: PokemonInstance; vs: PokemonInstance }) {
  const sp = getSpecies(mon.speciesId)
  const rows = displayStats(mon)
  const vsRows = displayStats(vs)
  const held = mon.heldItemId ? getItem(mon.heldItemId) : null
  return (
    <div className="rounded-2xl border border-slate-700 p-2.5" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="rounded-xl p-0.5 shrink-0" style={{ background: typeGradient(sp.types) }}>
          <Sprite speciesId={mon.speciesId} shiny={mon.shiny} className="w-11 h-11 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm truncate">{sp.displayName}{mon.shiny && <span className="text-amber-300"> ✨</span>} <span className="text-[10px] text-slate-400">Nv.{mon.level}</span></div>
          <div className="flex items-center gap-1 mt-0.5">
            {sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
            {held && <span className="text-[9px] text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded px-1 truncate max-w-[6rem]">{held.name}</span>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        {rows.map((r, i) => {
          const o = vsRows[i].eff
          const color = r.eff > o ? 'text-emerald-400' : r.eff < o ? 'text-rose-400' : 'text-slate-100'
          return (
            <div key={r.key} className="flex justify-between">
              <span className="text-slate-400">{r.label}</span>
              <span className={`font-bold tabular-nums ${color}`}>{r.eff}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
