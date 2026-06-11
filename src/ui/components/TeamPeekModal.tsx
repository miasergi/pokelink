import type { PokemonInstance } from '@/types'
import { getSpecies, getMove } from '@/data'
import { getItem } from '@/data/items'
import Sprite from './Sprite'
import HpBar from './HpBar'
import TypeBadge from './TypeBadge'
import PowerDots from './PowerDots'
import { monTypes } from '@/engine/team/leveling'

/** Vista RÁPIDA y de solo lectura del equipo (PS actuales, objeto, ataques).
 *  Pensada para consultar el contexto sin salir de donde estás (p. ej. en la
 *  tienda, para decidir qué pociones comprar). */
export default function TeamPeekModal({ team, onClose }: { team: PokemonInstance[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-extrabold">👥 Tu equipo</div>
          <button className="text-slate-400 text-2xl leading-none px-1 active:scale-90" onClick={onClose}>✕</button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {team.map((mon) => {
            const sp = getSpecies(mon.speciesId)
            const held = mon.heldItemId ? getItem(mon.heldItemId) : null
            return (
              <div key={mon.uid} className="rounded-2xl border border-slate-700 p-2 flex gap-2.5" style={{ background: 'rgba(15,23,42,0.6)' }}>
                <Sprite speciesId={mon.speciesId} shiny={mon.shiny} className="w-14 h-14 object-contain shrink-0 self-center" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-sm truncate">{sp.displayName}{mon.shiny && <span className="text-amber-300"> ✨</span>}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">Nv.{mon.level}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {monTypes(mon).map((t) => <TypeBadge key={t} type={t} size="sm" />)}
                    {held && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded px-1">
                        {held.sprite && <img src={held.sprite} alt="" className="w-3 h-3" style={{ imageRendering: 'pixelated' }} />}
                        <span className="truncate max-w-[5rem]">{held.name}</span>
                      </span>
                    )}
                    {mon.moves.map((mv, i) => { const md = getMove(mv.moveId); return <PowerDots key={i} type={md.type} power={md.power} size={6} /> })}
                  </div>
                  <div className="mt-1"><HpBar current={mon.currentHp} max={mon.stats.hp} status={mon.status} showNumbers /></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
