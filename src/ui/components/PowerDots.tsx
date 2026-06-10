import type { ExtType } from '@/types'
import { TYPE_HEX } from '@/ui/theme/types'
import { SONORO_COLOR } from '@/data/story/sonoro'
import { isZMove, zCrystalSprite, Z_MOVE_NAMES } from '@/data/typeAttacks'

/** Indicador de nivel de potencia del ataque (40/80/120) con 3 bolitas: las del
 *  color del tipo = nivel; el resto, blancas. Si es Movimiento Z (160), muestra
 *  el CRISTAL Z real del tipo del movimiento en vez de las bolitas. */
export default function PowerDots({ type, power, size = 7 }: { type: ExtType; power: number; size?: number }) {
  const color = type === 'sonoro' ? SONORO_COLOR : TYPE_HEX[type]
  if (isZMove(power)) {
    const px = size * 3
    return (
      <img
        src={zCrystalSprite(type)}
        alt={Z_MOVE_NAMES[type]}
        title={`${Z_MOVE_NAMES[type]} (Movimiento Z, potencia ${power})`}
        width={px}
        height={px}
        className="inline-block align-middle shrink-0 drop-shadow"
        style={{ imageRendering: 'pixelated' }}
      />
    )
  }
  const tier = power >= 120 ? 3 : power >= 80 ? 2 : 1
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
