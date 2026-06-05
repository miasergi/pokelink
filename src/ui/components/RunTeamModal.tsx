import type { BestRun } from '@/persistence/db'
import { getSpecies, getMove } from '@/data'
import { getItem } from '@/data/items'
import Sprite from './Sprite'
import TypeBadge from './TypeBadge'
import PowerDots from './PowerDots'
import { typeGradient } from '@/ui/theme/types'
import { formatDuration } from './RunTimer'

const DIFF_ES: Record<string, string> = { normal: 'Normal', hard: 'Difícil', nuzlocke: 'Nuzlocke' }

/** Detalle del equipo con el que se terminó una partida. */
export default function RunTeamModal({ run, onClose }: { run: BestRun; onClose: () => void }) {
  const team = run.team ?? []
  return (
    <div className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-extrabold flex items-center gap-2">
              {run.region}
              {run.won && <span className="text-[10px] bg-amber-500 text-black px-1.5 rounded-full font-black">CAMPEÓN</span>}
            </div>
            <div className="text-[11px] text-slate-400">
              {run.mode} · {DIFF_ES[run.difficulty] ?? run.difficulty} · {run.gymsDefeated}/8 gim.{run.durationMs > 0 && ` · ⏱ ${formatDuration(run.durationMs)}`}
            </div>
          </div>
          <button className="text-slate-400 text-2xl leading-none px-1 active:scale-90" onClick={onClose}>✕</button>
        </div>

        {team.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No se guardó el equipo de esta partida (es anterior a esta función).</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {team.map((mon) => {
              const sp = getSpecies(mon.speciesId)
              const held = mon.heldItemId ? getItem(mon.heldItemId) : null
              const phys = mon.stats.atk >= mon.stats.spa
              return (
                <div key={mon.uid} className="rounded-2xl border border-slate-700 p-2 flex gap-2.5" style={{ background: 'rgba(15,23,42,0.6)' }}>
                  <div className="rounded-xl p-0.5 shrink-0 self-start" style={{ background: typeGradient(sp.types) }}>
                    <Sprite speciesId={mon.speciesId} shiny={mon.shiny} className="w-14 h-14 object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-sm truncate">{sp.displayName}{mon.shiny && <span className="text-amber-300"> ✨</span>}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">Nv.{mon.level}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
                      {held && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded px-1">
                          {held.sprite && <img src={held.sprite} alt="" className="w-3 h-3" style={{ imageRendering: 'pixelated' }} />}
                          <span className="truncate max-w-[5rem]">{held.name}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[8px] font-bold px-1 rounded bg-slate-700 text-slate-200">{phys ? 'Físico' : 'Especial'}</span>
                      {mon.moves.map((mv, i) => { const md = getMove(mv.moveId); return <PowerDots key={i} type={md.type} power={md.power} size={6} /> })}
                    </div>
                    <div className="grid grid-cols-3 gap-x-2 text-[9px] text-slate-400 mt-1 tabular-nums">
                      <span>PS {mon.stats.hp}</span>
                      <span>{phys ? 'Atq' : 'AtqEsp'} {phys ? mon.stats.atk : mon.stats.spa}</span>
                      <span>Vel {mon.stats.spe}</span>
                      <span>Def {mon.stats.def}</span>
                      <span>DefEsp {mon.stats.spd}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
