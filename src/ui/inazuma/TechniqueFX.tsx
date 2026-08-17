// ANIMACIÓN PROCEDURAL de supertécnica: sustituye a la imagen estática de la
// wiki por un efecto NUESTRO, generado por clase y elemento.
//
// El sistema son 4 arquetipos (uno por clase de técnica) × 4 elementos:
//  · TIRO — el balón CARGA en el centro con partículas de su elemento
//    orbitándolo (el «tornado» alrededor del balón antes de salir).
//  · REGATE — ráfagas y estelas cruzando: velocidad y desmarque.
//  · BLOQUEO — el MURO: una mole del elemento se LEVANTA delante (la montaña
//    de «The Wall», la llamarada, la cresta de viento, el seto).
//  · PARADA — ondas expansivas desde el guante: la barrera del portero.
// La potencia de la técnica marca la INTENSIDAD (nº de partículas y brillo).
//
// Honesto y a propósito: esto es efecto ESTILIZADO (partículas, formas,
// brillos), no anime fotograma a fotograma — pero es nuestro, se lee en un
// vistazo y escala a las 500+ técnicas del catálogo sin dibujar 500 vídeos.
import Icon from '@/ui/components/Icon'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { Pic } from '@/ui/inazuma/Glyphs'
import type { Element, TechniqueKind } from '@/engine/inazuma/types'

/** Forma de partícula por elemento: llama, ráfaga, hoja, roca. */
function Particle({ element, color, size }: { element: Element; color: string; size: number }) {
  if (element === 'aire') {
    return <span className="block blur-[1px]" style={{ width: size * 2.4, height: Math.max(2, size * 0.35), background: color, transform: 'skewX(-30deg)', borderRadius: 999 }} />
  }
  if (element === 'bosque') {
    return <span className="block blur-[0.5px]" style={{ width: size, height: size, background: color, borderRadius: '80% 0 80% 0', transform: 'rotate(45deg)' }} />
  }
  if (element === 'montana') {
    return <span className="block" style={{ width: size, height: size, background: color, transform: 'rotate(45deg)', borderRadius: 2 }} />
  }
  return <span className="block blur-[2px] rounded-full" style={{ width: size, height: size, background: `radial-gradient(circle, #ffffff77, ${color})` }} />
}

export default function TechniqueFX({ kind, element, power, className = '' }: {
  kind: TechniqueKind
  element: Element
  /** Potencia de la técnica: marca la intensidad del efecto. */
  power: number
  className?: string
}) {
  const color = ELEMENT_INFO[element].color
  // Intensidad por potencia: flojita 6 partículas, definitiva 12.
  const n = Math.max(6, Math.min(12, Math.round(power / 12)))
  const parts = Array.from({ length: n }, (_, i) => i)

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ background: `radial-gradient(circle at 50% 55%, ${color}2e, #020617 78%)` }}>
      {/* Resplandor de fondo que respira. */}
      <div className="absolute inset-0 animate-flame-flicker" style={{ background: `radial-gradient(circle at 50% 55%, ${color}22, transparent 60%)` }} />

      {kind === 'tiro' && (
        <div className="absolute inset-0 grid place-items-center">
          {/* El balón CARGANDO, con su elemento orbitándolo. */}
          <div className="relative">
            <Pic name="ball" className="w-14 h-14 fx-charge drop-shadow-lg" />
            {parts.map((i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 fx-orbit"
                style={{
                  ['--fx-r' as string]: `${44 + (i % 3) * 14}px`,
                  ['--fx-t' as string]: `${0.9 + (i % 4) * 0.18}s`,
                  animationDelay: `-${(i / n) * 1.1}s`,
                }}
              >
                <Particle element={element} color={color} size={10 + (i % 3) * 4} />
              </span>
            ))}
            <span className="absolute -inset-6 rounded-full blur-md animate-flame-flicker" style={{ background: `radial-gradient(circle, ${color}66, transparent 70%)` }} />
          </div>
        </div>
      )}

      {kind === 'regate' && (
        <div className="absolute inset-0">
          {/* Ráfagas cruzando: pura velocidad. */}
          {parts.map((i) => (
            <span
              key={i}
              className="absolute fx-dash"
              style={{ top: `${12 + (i * 76) / n}%`, left: '10%', width: '80%', animationDelay: `-${(i / n) * 1.05}s` }}
            >
              <Particle element={element} color={color} size={9 + (i % 3) * 4} />
            </span>
          ))}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Pic name="ball" className="w-12 h-12 fx-charge drop-shadow-lg" />
          </div>
        </div>
      )}

      {kind === 'bloqueo' && (
        <div className="absolute inset-0">
          {/* EL MURO del elemento, levantándose: la montaña de «The Wall». */}
          <div
            className="absolute inset-x-4 bottom-0 h-[62%] fx-rise"
            style={{
              background: `linear-gradient(to top, ${color}, ${color}55 70%, transparent)`,
              clipPath: element === 'montana'
                ? 'polygon(0% 100%, 12% 46%, 26% 72%, 40% 22%, 55% 60%, 70% 10%, 84% 55%, 100% 100%)'
                : element === 'fuego'
                  ? 'polygon(0% 100%, 8% 55%, 18% 78%, 30% 30%, 42% 68%, 52% 15%, 64% 62%, 76% 35%, 88% 70%, 100% 100%)'
                  : 'polygon(0% 100%, 0% 38%, 12% 52%, 25% 30%, 40% 48%, 55% 26%, 70% 46%, 85% 30%, 100% 42%, 100% 100%)',
            }}
          />
          {parts.slice(0, Math.ceil(n / 2)).map((i) => (
            <span key={i} className="absolute fx-float-up" style={{ left: `${15 + (i * 70) / Math.ceil(n / 2)}%`, bottom: '18%', animationDelay: `-${(i / n) * 1.5}s` }}>
              <Particle element={element} color={color} size={8 + (i % 3) * 3} />
            </span>
          ))}
        </div>
      )}

      {kind === 'parada' && (
        <div className="absolute inset-0 grid place-items-center">
          {/* La BARRERA del portero: ondas expansivas desde el guante. */}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 fx-ring"
              style={{ borderColor: color, animationDelay: `${i * 0.38}s` }}
            />
          ))}
          <Icon name="glove" className="w-16 h-16 fx-charge" style={{ color }} />
          {parts.slice(0, 6).map((i) => (
            <span key={`p${i}`} className="absolute left-1/2 top-1/2 fx-orbit" style={{ ['--fx-r' as string]: '58px', ['--fx-t' as string]: '1.6s', animationDelay: `-${(i / 6) * 1.6}s` }}>
              <Particle element={element} color={color} size={8} />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
