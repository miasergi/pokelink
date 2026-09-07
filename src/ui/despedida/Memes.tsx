// Los recortes de Óscar, repartidos por el cartel.
//
// La tentación era sembrarlos al azar por toda la página. Mala idea por dos
// motivos: al azar de verdad se mueven en cada recarga, y tarde o temprano una
// cara acaba encima de un texto. Aquí van en sitios DECIDIDOS —el hueco a la
// derecha de cada titular de sección, que siempre está vacío— con una rotación
// que parece descuidada pero es fija. Y en móvil no salen: no hay hueco, y
// para eso está el álbum.
import { MEMES, rutaMeme, type Meme } from '@/data/memes'
import { Antetitulo, FILETE, LIMA } from './despedidaKit'

/** Un recorte suelto, con su rotación y su pie. */
export function Sticker({ meme: m, ancho = 150, giro = -6, className = '' }: {
  meme: Meme
  ancho?: number
  giro?: number
  className?: string
}) {
  return (
    <figure
      className={`relative select-none pointer-events-none ${className}`}
      style={{ width: ancho, transform: `rotate(${giro}deg)` }}
    >
      <img
        src={rutaMeme(m)}
        alt={m.texto}
        width={ancho}
        height={Math.round(ancho * m.ratio)}
        loading="lazy"
        decoding="async"
        className={m.redondo ? 'w-full h-auto rounded-full' : 'w-full h-auto'}
        style={{
          filter: 'drop-shadow(0 18px 24px rgba(0,0,0,.55))',
          border: m.redondo ? `2px solid ${LIMA}` : undefined,
          borderRadius: m.redondo ? '9999px' : undefined,
        }}
      />
      <figcaption
        className="absolute left-1/2 -translate-x-1/2 -bottom-3 whitespace-nowrap font-festui text-[9.5px] font-bold uppercase tracking-[0.16em] px-2 py-1"
        style={{ background: LIMA, color: '#08080A' }}
      >
        {m.texto}
      </figcaption>
    </figure>
  )
}

/**
 * El álbum: todos los memes juntos. Es la única forma de que en el móvil se
 * vean, y de paso funciona como sección de "galería" del cartel.
 */
export function AlbumMemes() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-px" style={{ background: FILETE }}>
      {MEMES.map((m) => (
        <figure key={m.id} className="flex flex-col" style={{ background: '#0B0B0E' }}>
          <div className="relative overflow-hidden grid place-items-center p-4 sm:p-6" style={{ aspectRatio: '3 / 4' }}>
            <img
              src={rutaMeme(m)}
              alt={m.texto}
              loading="lazy"
              decoding="async"
              className={`max-h-full w-auto object-contain ${m.redondo ? 'rounded-full' : ''}`}
              style={{ filter: 'drop-shadow(0 14px 20px rgba(0,0,0,.6))' }}
            />
          </div>
          <figcaption
            className="font-fest uppercase text-center text-[13px] sm:text-lg leading-tight px-3 py-3 border-t"
            style={{ borderColor: FILETE, color: '#FFFFFF' }}
          >
            {m.texto}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

/** La cara pequeña que asoma en la caja abierta. */
export function CaraCelebracion() {
  const m = MEMES.find((x) => x.redondo)
  if (!m) return null
  return (
    <img
      src={rutaMeme(m)}
      alt=""
      aria-hidden
      width={84}
      height={84}
      className="absolute -bottom-7 -right-7 w-20 h-20 rounded-full"
      style={{ border: `2px solid ${LIMA}`, transform: 'rotate(8deg)', filter: 'drop-shadow(0 10px 18px rgba(0,0,0,.6))' }}
    />
  )
}

/** Rótulo del álbum, para no repetirlo en la sección. */
export function PieAlbum() {
  return (
    <Antetitulo className="mt-6">
      {MEMES.length} pruebas documentales · todas reales
    </Antetitulo>
  )
}
