import type { PokemonType } from '@/types'
import { TYPE_HEX } from '@/ui/theme/types'

/** Indicador de nivel de potencia del ataque (40/80/120) con 3 bolitas:
 *  las del color del tipo = nivel; el resto, blancas. */
export default function PowerDots({ type, power, size = 7 }: { type: PokemonType; power: number; size?: number }) {
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
