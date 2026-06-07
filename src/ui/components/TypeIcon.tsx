import type { PokemonType } from '@/types'
import { TYPE_ICON_PATH } from '@/ui/theme/typeIconPaths'

/** Icono oficial monocromo del tipo. Se pinta con `currentColor`, así que hereda
 *  el color del texto (blanco en las insignias). Por defecto escala con la fuente
 *  (1em); pásale una clase de tamaño para fijarlo. */
export default function TypeIcon({ type, className = 'w-[1em] h-[1em]' }: { type: PokemonType; className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={`inline-block shrink-0 ${className}`}
      fill="currentColor"
      aria-hidden
      // Sombra sutil: da definición al icono blanco sobre tipos de color claro
      // (hielo, eléctrico, hada...).
      style={{ filter: 'drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.45))' }}
    >
      <path fillRule="evenodd" clipRule="evenodd" d={TYPE_ICON_PATH[type]} />
    </svg>
  )
}
