import type { PokemonType } from '@/types'
import { TYPE_HEX } from '@/ui/theme/types'
import { isZMove } from '@/data/typeAttacks'

// Icono propio (local) del Movimiento Z.
const ZMOVE_ICON = import.meta.env.BASE_URL + 'items/z-move.png'

/** Indicador de nivel de potencia del ataque (40/80/120) con 3 bolitas: las del
 *  color del tipo = nivel; el resto, blancas. Si es Movimiento Z (160), muestra
 *  el icono del Movimiento Z en vez de las bolitas. */
export default function PowerDots({ type, power, size = 7 }: { type: PokemonType; power: number; size?: number }) {
  if (isZMove(power)) {
    return (
      <img
        src={ZMOVE_ICON}
        alt="Movimiento Z"
        title={`Movimiento Z (potencia ${power})`}
        className="inline-block align-middle object-contain shrink-0 drop-shadow"
        style={{ width: size * 3, height: size * 3 }}
      />
    )
  }
  const tier = power >= 120 ? 3 : power >= 80 ? 2 : 1
  const color = TYPE_HEX[type]
  return (
    <span className="inline-flex items-center gap-0.5 align-middle" title={`Potencia ${power} (nivel ${tier}/3)`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: size, height: size,
            backgroundColor: i < tier ? color : '#f8fafc',
            boxShadow: i < tier ? `0 0 0 1px ${color}` : '0 0 0 1px #94a3b8',
          }}
        />
      ))}
    </span>
  )
}
