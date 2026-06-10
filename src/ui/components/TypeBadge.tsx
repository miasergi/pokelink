import type { ExtType } from '@/types'
import { TYPE_ES, TYPE_HEX } from '@/ui/theme/types'
import { SONORO_GRADIENT, SONORO_NAME } from '@/data/story/sonoro'
import TypeIcon from './TypeIcon'
import { SonoroWave } from './SonoroBadge'

/** Insignia de tipo. Acepta también el tipo artificial «Sonoro» (Modo Historia),
 *  que se pinta con su degradado y su onda en vez del icono oficial. */
export default function TypeBadge({ type, size = 'md', shrink }: { type: ExtType; size?: 'sm' | 'md'; shrink?: boolean }) {
  const cls = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-0.5 gap-1'
  const sonoro = type === 'sonoro'
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold text-white shadow-sm ${cls} ${shrink ? 'min-w-0' : ''}`}
      style={sonoro ? { backgroundImage: SONORO_GRADIENT } : { backgroundColor: TYPE_HEX[type] }}
    >
      {sonoro ? <SonoroWave className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} /> : <TypeIcon type={type} />}
      {/* `shrink`: en espacios estrechos (tarjeta del equipo) el nombre se recorta
          con "..." en una sola línea en vez de descuadrar la tarjeta. */}
      <span className={shrink ? 'truncate' : ''}>{sonoro ? SONORO_NAME : TYPE_ES[type]}</span>
    </span>
  )
}
