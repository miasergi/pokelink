import type { PokemonInstance } from '@/types'
import Sprite from './Sprite'

export default function PartyBar({
  party, onClick,
}: {
  party: PokemonInstance[]
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 px-2 py-2 bg-slate-900/70 rounded-2xl border border-slate-800 active:scale-[0.99] transition"
    >
      {party.map((mon) => {
        const frac = Math.max(0, mon.currentHp / mon.stats.hp)
        const fainted = mon.currentHp <= 0
        const color = frac > 0.5 ? '#34d399' : frac > 0.2 ? '#fbbf24' : '#f87171'
        return (
          <div key={mon.uid} className="flex flex-col items-center gap-0.5">
            <div className={`relative ${fainted ? 'opacity-40 grayscale' : ''}`}>
              <Sprite speciesId={mon.speciesId} variant="front" shiny={mon.shiny} className="w-9 h-9 object-contain" />
            </div>
            <div className="w-8 h-1 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${frac * 100}%`, backgroundColor: color }} />
            </div>
            <span className="text-[9px] font-bold text-slate-300 leading-none">Nv.{mon.level}</span>
          </div>
        )
      })}
      {Array.from({ length: Math.max(0, 6 - party.length) }).map((_, i) => (
        <div key={`empty-${i}`} className="w-9 h-9 rounded-lg border border-dashed border-slate-700/60" />
      ))}
    </button>
  )
}
