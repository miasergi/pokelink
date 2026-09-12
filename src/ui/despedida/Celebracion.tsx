// ABRIR UNA CAJA. El momento del día.
//
// Salta sola en cuanto los puntos cruzan un umbral, en toda la sección —la
// tele y el panel del juez incluidos— porque es el único evento que merece
// interrumpir lo que estés mirando. Y con el marcador compartido salta en
// TODAS las pantallas, no solo en la del que marcó.
//
// Hay tres niveles de escándalo, y la diferencia importa: si la caja de las
// papas se celebra igual que el disfraz, ninguna de las dos significa nada.
//
//   normal      · fogonazo, aro y símbolo.
//   gorda       · lo anterior + confeti. Son los regalos de verdad.
//   legendaria  · paleta dorada, órbita que no para y el doble de todo. Tiene
//                 que colar como un drop de verdad, que es literalmente lo que
//                 pidió Luis en el Word.
//
// La coreografía va en CSS con retardos encadenados (ver index.css). Aquí solo
// se decide el nivel, se reparten ángulos y se tocan los sonidos a tiempo.
import { useEffect, useMemo, useRef, useState } from 'react'
import { RECOMPENSAS } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import { play } from '@/utils/sfx'
import Marca, { type MarcaId } from './Marcas'
import { CaraCelebracion } from './Memes'
import { Antetitulo, FILETE, LIMA, NEGRO } from './despedidaKit'

const ORO = '#FFD447'

/** Mientras dura el estallido no se puede cerrar: sería perderse el momento. */
const BLOQUEO_MS = 900

type Nivel = 'normal' | 'gorda' | 'legendaria'

interface Estilo {
  acento: string
  rotulo: string
  esquirlas: number
  confeti: number
}

const ESTILOS: Record<Nivel, Estilo> = {
  normal: { acento: LIMA, rotulo: 'Caja abierta', esquirlas: 12, confeti: 0 },
  gorda: { acento: LIMA, rotulo: 'Caja abierta', esquirlas: 18, confeti: 22 },
  legendaria: { acento: ORO, rotulo: '¡Objeto legendario!', esquirlas: 28, confeti: 40 },
}

export default function Celebracion() {
  const celebrando = useDespedida((s) => s.celebrando)
  const cerrar = useDespedida((s) => s.celebrar)
  const r = RECOMPENSAS.find((x) => x.id === celebrando)
  const [abierto, setAbierto] = useState(false)
  const temporizadores = useRef<number[]>([])

  const nivel: Nivel = r?.legendario ? 'legendaria' : r?.jugoso ? 'gorda' : 'normal'
  const estilo = ESTILOS[nivel]

  // Ángulos repartidos con una vuelta irregular: en abanico perfecto se ve el
  // patrón y deja de parecer una explosión.
  const esquirlas = useMemo(
    () => Array.from({ length: estilo.esquirlas }, (_, i) => ({
      a: (360 / estilo.esquirlas) * i + (i % 3) * 7,
      d: 120 + ((i * 37) % 140),
      tam: i % 4 === 0 ? 10 : 6,
    })),
    [estilo.esquirlas],
  )

  const confeti = useMemo(
    () => Array.from({ length: estilo.confeti }, (_, i) => ({
      x: (i * 97) % 100,
      t: 2.4 + ((i * 13) % 18) / 10,
      r: ((i * 29) % 12) / 10,
      color: i % 3 === 0 ? estilo.acento : i % 3 === 1 ? '#FFFFFF' : '#8A8A94',
    })),
    [estilo.confeti, estilo.acento],
  )

  useEffect(() => {
    temporizadores.current.forEach(clearTimeout)
    temporizadores.current = []
    if (!r) { setAbierto(false); return }

    setAbierto(false)
    // El sonido va escalonado: el golpe primero y la fanfarria cuando ya se lee
    // el premio. Juntos suenan a ruido.
    play(nivel === 'legendaria' ? 'mega' : 'levelup')
    temporizadores.current.push(
      window.setTimeout(() => play('victory'), nivel === 'legendaria' ? 700 : 450),
      window.setTimeout(() => setAbierto(true), BLOQUEO_MS),
    )
    return () => { temporizadores.current.forEach(clearTimeout) }
  }, [r, nivel])

  if (!r) return null

  const { acento } = estilo

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden font-festui"
      style={{ background: 'rgba(4,5,10,.985)', pointerEvents: abierto ? 'auto' : 'none' }}
      onClick={() => { if (abierto && !r.video) { play('confirm'); cerrar(null) } }}
      role="dialog"
      aria-label={`Caja abierta: ${r.titulo}`}
    >
      {/* Fogonazo de apertura */}
      <div aria-hidden className="caja-fogonazo absolute inset-0" style={{ background: acento }} />

      {/* Haz vertical detrás de todo */}
      <div
        aria-hidden
        className="caja-haz absolute left-1/2 -translate-x-1/2 bottom-0 w-[70vw] sm:w-[36rem] h-[110vh] pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${acento}00, ${acento}38 35%, ${acento}00)`,
          filter: 'blur(14px)',
        }}
      />

      {/* Resplandor que se queda */}
      <div
        aria-hidden
        className="caja-latido absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(42% 38% at 50% 44%, ${acento}2E, transparent 70%)` }}
      />

      {confeti.map((c, i) => (
        <span
          key={i}
          aria-hidden
          className="caja-confeti absolute top-0 w-1.5 h-3"
          style={{ left: `${c.x}%`, background: c.color, ['--t' as string]: `${c.t}s`, ['--r' as string]: `${c.r}s` }}
        />
      ))}

      <div className="caja-sacudida relative h-full w-full grid place-items-center p-6">
        <div className="relative w-full max-w-lg text-center">
          <Antetitulo color={acento} className="caja-texto" style={{ animationDelay: '.5s' }}>
            {estilo.rotulo}
          </Antetitulo>

          {/* --- El estallido y el símbolo --- */}
          <div className="relative grid place-items-center my-7 h-40 sm:h-48">
            <div
              aria-hidden
              className="caja-aro absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full"
              style={{ borderStyle: 'solid', borderColor: acento }}
            />
            {nivel === 'legendaria' && (
              <div
                aria-hidden
                className="caja-orbita absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-dashed"
                style={{ borderColor: `${ORO}66` }}
              />
            )}

            {esquirlas.map((e, i) => (
              <span
                key={i}
                aria-hidden
                className="caja-esquirla absolute rounded-full"
                style={{
                  width: e.tam,
                  height: e.tam,
                  background: i % 5 === 0 ? '#FFFFFF' : acento,
                  ['--a' as string]: `${e.a}deg`,
                  ['--d' as string]: `${e.d}px`,
                }}
              />
            ))}

            <div
              className="caja-simbolo relative grid place-items-center w-28 h-28 sm:w-32 sm:h-32 border"
              style={{
                borderColor: `${acento}77`,
                background: '#0B0B0E',
                boxShadow: `0 0 60px ${acento}55, inset 0 0 40px ${acento}18`,
              }}
            >
              <Marca id={r.marca as MarcaId} className="w-14 h-14 sm:w-16 sm:h-16" style={{ color: acento }} />
            </div>
          </div>

          {/* --- El premio --- */}
          <div
            className="caja-texto relative border"
            style={{ animationDelay: '.5s', borderColor: `${acento}44`, background: '#0B0B0E' }}
          >
            <CaraCelebracion />
            <div className="p-6 sm:p-7">
              <h2
                className="caja-texto font-fest uppercase text-white text-4xl sm:text-6xl leading-[0.85]"
                style={{ animationDelay: '.62s', textShadow: `0 0 40px ${acento}44` }}
              >
                {r.titulo}
              </h2>
              <p
                className="caja-texto text-[14px] text-zinc-400 mt-4 leading-relaxed"
                style={{ animationDelay: '.74s' }}
              >
                {r.detalle}
              </p>

              {/* Hay una caja que no contiene una cosa. Arranca cuando ya se
                  ha leído el título, para que el golpe llegue en orden:
                  fanfarria, título, y entonces la canción. */}
              {r.video && abierto && (
                <div className="caja-texto mt-5" style={{ animationDelay: '0s' }}>
                  <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                    <iframe
                      className="absolute inset-0 w-full h-full border"
                      style={{ borderColor: `${acento}44` }}
                      src={`https://www.youtube.com/embed/${r.video}?autoplay=1&rel=0&modestbranding=1`}
                      title={r.titulo}
                      allow="autoplay; encrypted-media; fullscreen"
                      allowFullScreen
                    />
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-2.5">
                    Si no suena, dale al play. Y súbelo.
                  </p>
                </div>
              )}
            </div>
            <div
              className="caja-texto py-4 text-center font-fest uppercase text-3xl leading-none tabular-nums border-t"
              style={{ animationDelay: '.86s', borderColor: FILETE, background: acento, color: NEGRO }}
            >
              {r.umbral} puntos
            </div>
          </div>

          {r.video ? (
            abierto && (
              <button
                onClick={() => { play('confirm'); cerrar(null) }}
                className="caja-texto text-[11px] font-bold uppercase tracking-[0.24em] px-6 py-3.5 border mt-6 text-zinc-400 hover:text-white transition"
                style={{ animationDelay: '0s', borderColor: FILETE }}
              >
                Ya vale, cerrar
              </button>
            )
          ) : (
            <p
              className="caja-texto text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-600 mt-6"
              style={{ animationDelay: '1s' }}
            >
              {abierto ? 'Toca para seguir' : ' '}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
