import type { PokemonType } from '@/types'
import { TYPE_HEX } from '@/ui/theme/types'
import { isZMove } from '@/data/typeAttacks'

/** Aclara (amt>0) u oscurece (amt<0) un color hex. amt en [-1,1]. */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const f = (c: number) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

/** Piedra Z facetada (cristal Z) coloreada con el color del tipo del movimiento. */
function ZCrystal({ color, px, title }: { color: string; px: number; title: string }) {
  const light = shade(color, 0.5), mid = shade(color, 0.22), midDark = shade(color, -0.12), dark = shade(color, -0.38)
  return (
    <svg viewBox="0 0 24 24" width={px} height={px} className="inline-block align-middle shrink-0 drop-shadow" role="img" aria-label={title}>
      <title>{title}</title>
      <g stroke={dark} strokeWidth={0.4} strokeLinejoin="round">
        {/* pabellón (parte baja, facetas que convergen al punto) */}
        <polygon points="3,9 8,9 12,22" fill={dark} />
        <polygon points="16,9 21,9 12,22" fill={dark} />
        <polygon points="8,9 16,9 12,22" fill={midDark} />
        {/* corona (parte alta) */}
        <polygon points="7,3 8,9 3,9" fill={mid} />
        <polygon points="17,3 21,9 16,9" fill={mid} />
        <polygon points="7,3 17,3 16,9 8,9" fill={light} />
      </g>
      {/* brillo sutil en la mesa */}
      <path d="M9 4.3 L14.5 4.3" stroke="#ffffff" strokeWidth={0.9} strokeLinecap="round" opacity={0.55} />
    </svg>
  )
}

/** Indicador de nivel de potencia del ataque (40/80/120) con 3 bolitas: las del
 *  color del tipo = nivel; el resto, blancas. Si es Movimiento Z (160), muestra
 *  una piedra Z del color del tipo del movimiento en vez de las bolitas. */
export default function PowerDots({ type, power, size = 7 }: { type: PokemonType; power: number; size?: number }) {
  const color = TYPE_HEX[type]
  if (isZMove(power)) {
    return <ZCrystal color={color} px={size * 3} title={`Movimiento Z de tipo ${type} (potencia ${power})`} />
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
