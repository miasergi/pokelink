import type { PokemonInstance } from '@/types'
import { getSpecies } from '@/data'
import Sprite from './Sprite'
import HpBar from './HpBar'
import TypeBadge from './TypeBadge'
import { typeGradient } from '@/ui/theme/types'

interface Props {
  mon: PokemonInstance
  onClick?: () => void
  showHp?: boolean
  compact?: boolean
  selected?: boolean
}

export default function PokemonCard({ mon, onClick, showHp = true, compact, selected }: Props) {
  const species = getSpecies(mon.speciesId)
  const fainted = mon.currentHp <= 0
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl p-2.5 border transition ${
        selected ? 'border-red-400 ring-2 ring-red-400/40' : 'border-slate-700/60'
      } ${onClick ? 'active:scale-[0.98] cursor-pointer' : ''} ${fainted ? 'opacity-50 grayscale' : ''}`}
      style={{ background: 'rgba(15,23,42,0.6)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="shrink-0 rounded-xl p-0.5"
          style={{ background: typeGradient(species.types) }}
        >
          <Sprite
            speciesId={mon.speciesId}
            shiny={mon.shiny}
            className={`object-contain ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold truncate">{mon.nickname ?? species.displayName}</span>
            <span className="text-xs text-slate-400 shrink-0">Nv.{mon.level}</span>
          </div>
          <div className="flex gap-1 mt-0.5 items-center flex-wrap">
            {species.types.map((t) => (
              <TypeBadge key={t} type={t} size="sm" />
            ))}
            {species.isMega && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-white">
                MEGA
              </span>
            )}
            {mon.shiny && <span className="text-[10px] text-amber-300">✨</span>}
          </div>
          {showHp && (
            <div className="mt-1.5">
              <HpBar current={mon.currentHp} max={mon.stats.hp} status={mon.status} showNumbers />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
