import type { PokemonType } from '@/types'
import { TYPE_ES, TYPE_HEX, TYPE_ICON } from '@/ui/theme/types'

export default function TypeBadge({ type, size = 'md' }: { type: PokemonType; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-0.5' : 'text-xs px-2 py-0.5 gap-1'
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold text-white shadow-sm ${cls}`}
      style={{ backgroundColor: TYPE_HEX[type] }}
    >
      <span aria-hidden className="leading-none">{TYPE_ICON[type]}</span>
      {TYPE_ES[type]}
    </span>
  )
}
