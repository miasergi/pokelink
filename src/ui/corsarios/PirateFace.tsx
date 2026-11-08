// Retrato de pirata generado en SVG a partir de sus rasgos (`Look`). Así el
// modo no depende de ninguna imagen externa y cada pirata se reconoce de un
// vistazo: sombrero, pelo, barba, parche y el color de su ropa.
import { memo, useId } from 'react'
import type { Look, Rareza } from '@/engine/corsarios/types'
import { RAREZA_INFO } from '@/data/corsarios/piratas'

function Sombrero({ look }: { look: Look }) {
  switch (look.sombrero) {
    case 'tricornio':
      return (
        <g>
          <path d="M14 38 Q50 2 86 38 Q68 30 50 31 Q32 30 14 38Z" fill="#1c1917" />
          <path d="M14 38 Q32 30 50 31 Q68 30 86 38" fill="none" stroke="#d4a017" strokeWidth="1.6" />
          <circle cx="50" cy="20" r="4" fill="#f5f5f4" />
          <rect x="47.6" y="23" width="4.8" height="2" rx="1" fill="#f5f5f4" />
        </g>
      )
    case 'bicornio':
      return (
        <g>
          <path d="M6 35 Q50 -2 94 35 Q50 26 6 35Z" fill="#172554" />
          <path d="M6 35 Q50 26 94 35" fill="none" stroke="#fbbf24" strokeWidth="2" />
          <circle cx="50" cy="17" r="3.5" fill="#fbbf24" />
        </g>
      )
    case 'panuelo':
      return (
        <g>
          <path d="M28 40 Q28 18 50 17 Q72 18 72 40 Q50 31 28 40Z" fill={look.ropa === '#f8fafc' ? '#dc2626' : '#b91c1c'} />
          <circle cx="36" cy="27" r="1.6" fill="#fef2f2" opacity=".8" />
          <circle cx="58" cy="23" r="1.6" fill="#fef2f2" opacity=".8" />
          <circle cx="64" cy="32" r="1.6" fill="#fef2f2" opacity=".8" />
          <path d="M71 36 L82 42 L76 46 Z" fill="#991b1b" />
        </g>
      )
    case 'gorra':
      return (
        <g>
          <path d="M29 34 Q29 18 50 18 Q71 18 71 34 Z" fill="#f8fafc" />
          <rect x="27" y="31" width="46" height="6" rx="3" fill="#1e3a8a" />
          <path d="M27 37 Q50 44 73 37 L73 35 L27 35Z" fill="#0f172a" />
        </g>
      )
    case 'ala':
      return (
        <g>
          <ellipse cx="50" cy="35" rx="40" ry="7" fill="#292524" />
          <path d="M31 35 Q31 12 50 12 Q69 12 69 35 Z" fill="#292524" />
          <rect x="31" y="28" width="38" height="4" fill="#7f1d1d" />
          <path d="M66 26 Q80 12 74 6 Q72 18 64 24Z" fill="#f5f5f4" opacity=".9" />
        </g>
      )
    case 'corona':
      return (
        <g>
          <path d="M31 34 L31 18 L38 26 L44 14 L50 24 L56 14 L62 26 L69 18 L69 34 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
          <circle cx="44" cy="29" r="2" fill="#dc2626" />
          <circle cx="56" cy="29" r="2" fill="#2563eb" />
        </g>
      )
    case 'capucha':
      return <path d="M27 50 Q26 22 50 21 Q74 22 73 50 Q70 32 50 31 Q30 32 27 50Z" fill={look.ropa} stroke="#00000040" strokeWidth="1" />
    default:
      return null
  }
}

function PirateFaceRaw({ look, rareza, size = 64, apagado, className }: {
  look: Look
  rareza?: Rareza
  size?: number
  /** En gris: KO o sin reclutar. */
  apagado?: boolean
  className?: string
}) {
  const id = `pf${useId().replace(/:/g, '')}`
  const marco = rareza ? RAREZA_INFO[rareza] : { color: '#475569', brillo: '#94a3b8' }
  const sinSombrero = look.sombrero === 'nada'
  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden
      style={apagado ? { filter: 'grayscale(1) brightness(.55)' } : undefined}
    >
      <defs>
        <radialGradient id={`${id}bg`} cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor={marco.brillo} stopOpacity=".55" />
          <stop offset="100%" stopColor={marco.color} stopOpacity=".2" />
        </radialGradient>
        <clipPath id={`${id}c`}><rect x="0" y="0" width="100" height="100" rx="18" /></clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="100" height="100" fill="#0b1426" />
        <rect width="100" height="100" fill={`url(#${id}bg)`} />
        {/* Melena por detrás de la cabeza. */}
        {look.melena && <path d="M27 44 Q24 76 32 84 L68 84 Q76 76 73 44 Z" fill={look.pelo} />}
        {/* Cuerpo y cuello. */}
        <path d="M10 104 Q12 76 50 73 Q88 76 90 104Z" fill={look.ropa} />
        <path d="M38 74 L50 88 L62 74" fill="none" stroke="#00000033" strokeWidth="2" />
        <rect x="43" y="62" width="14" height="14" rx="4" fill={look.piel} />
        {/* Cabeza. */}
        <ellipse cx="29" cy="50" rx="3.5" ry="5" fill={look.piel} />
        <ellipse cx="71" cy="50" rx="3.5" ry="5" fill={look.piel} />
        <ellipse cx="50" cy="48" rx="21" ry="23" fill={look.piel} />
        {/* Pelo de arriba (asoma bajo el sombrero o lo sustituye). */}
        {sinSombrero
          ? <path d="M29 46 Q27 22 50 22 Q73 22 71 46 Q66 32 50 33 Q36 32 29 46Z" fill={look.pelo} />
          : look.sombrero !== 'capucha' && <path d="M29 44 Q30 34 38 36 Q50 32 62 36 Q70 34 71 44 Q64 38 50 39 Q36 38 29 44Z" fill={look.pelo} />}
        {look.pendiente && <circle cx="29" cy="57" r="2.6" fill="none" stroke="#fbbf24" strokeWidth="1.6" />}
        {/* Cejas, ojos, nariz. */}
        <path d="M37 42 L46 43" stroke={look.pelo} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M54 43 L63 42" stroke={look.pelo} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="42" cy="49" r="2.6" fill="#0f172a" />
        {look.parche
          ? (<g>
              <path d="M30 40 L70 56" stroke="#0f172a" strokeWidth="1.6" />
              <ellipse cx="58" cy="49" rx="6" ry="5" fill="#0f172a" />
            </g>)
          : <circle cx="58" cy="49" r="2.6" fill="#0f172a" />}
        <path d="M50 51 Q47 57 50 58" fill="none" stroke="#00000040" strokeWidth="1.6" strokeLinecap="round" />
        {/* Boca y barba. */}
        {look.barba === 'larga' && <path d="M30 54 Q32 88 50 90 Q68 88 70 54 Q66 66 50 66 Q34 66 30 54Z" fill={look.pelo} />}
        {look.barba === 'corta' && <path d="M31 54 Q34 74 50 74 Q66 74 69 54 Q64 64 50 64 Q36 64 31 54Z" fill={look.pelo} opacity=".92" />}
        <path d="M44 63 Q50 66 56 63" fill="none" stroke="#7f1d1d" strokeWidth="2" strokeLinecap="round" />
        {(look.barba === 'bigote' || look.barba === 'larga' || look.barba === 'corta') &&
          <path d="M40 61 Q45 56 50 59 Q55 56 60 61 Q55 59 50 61 Q45 59 40 61Z" fill={look.pelo} />}
        {look.cicatriz && <path d="M36 52 L42 60 M37 56 L40 54 M39 58 L42 56" stroke="#9f1239" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />}
        <Sombrero look={look} />
      </g>
      <rect x="1.5" y="1.5" width="97" height="97" rx="17" fill="none" stroke={marco.color} strokeWidth="3" />
    </svg>
  )
}

const PirateFace = memo(PirateFaceRaw)
export default PirateFace
