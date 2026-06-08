import type { PokemonType } from '@/types'
import { TYPE_ES, TYPE_HEX } from '@/ui/theme/types'
import TypeIcon from './TypeIcon'

export default function TypeBadge({ type, size = 'md', shrink }: { type: PokemonType; size?: 'sm' | 'md'; shrink?: boolean }) {
  const cls = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-0.5 gap-1'
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold text-white shadow-sm ${cls} ${shrink ? 'min-w-0' : ''}`}
      style={{ backgroundColor: TYPE_HEX[type] }}
    >
      <TypeIcon type={type} />
      {/* `shrink`: en espacios estrechos (tarjeta del equipo) el nombre se recorta
          con "..." en una sola línea en vez de descuadrar la tarjeta. */}
      <span className={shrink ? 'truncate' : ''}>{TYPE_ES[type]}</span>
    </span>
  )
}
