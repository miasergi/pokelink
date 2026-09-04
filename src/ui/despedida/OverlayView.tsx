// MODO TELE. La misma información, para verse a tres metros o metida como
// browser source en el OBS del directo: sin nav, sin botones, todo en una
// pantalla y con la tipografía al máximo. Es el cartel del evento, en vivo.
import { puntosDe, retosDe } from '@/data/despedida'
import { proximaRecompensa, useDespedida } from '@/state/despedidaStore'
import { play } from '@/utils/sfx'
import {
  Antetitulo, DIRECTO, FILETE, LIMA, NEGRO, bloqueActual, duracion, useAhora,
} from './despedidaKit'
import { rangoDe } from '@/data/despedida'
import Marca, { type MarcaId } from './Marcas'

export default function OverlayView({ onSalir }: { onSalir: () => void }) {
  const ahora = useAhora(5000)
  const fijado = useDespedida((s) => s.save.bloqueFijado)
  const puntos = useDespedida((s) => s.puntos())
  const hecho = useDespedida((s) => s.hecho)
  const movs = useDespedida((s) => s.historial())

  const actual = bloqueActual(ahora, fijado)
  const proxima = proximaRecompensa(puntos)
  const retos = actual ? retosDe(actual.id).filter((r) => !r.castigo) : []
  const ultimos = movs.slice(0, 3)

  return (
    <div className="fixed inset-0 z-40 overflow-hidden font-festui text-white" style={{ background: NEGRO }}>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{ background: `radial-gradient(60% 50% at 50% -5%, ${LIMA}1A, transparent 70%)` }}
      />

      <button
        onClick={() => { play('back'); onSalir() }}
        className="absolute top-4 right-4 z-10 w-9 h-9 grid place-items-center border text-zinc-700 hover:text-zinc-300 transition"
        style={{ borderColor: FILETE }}
        aria-label="Salir del modo tele"
      >
        ✕
      </button>

      <div className="relative h-full w-full flex flex-col lg:flex-row">
        {/* Marcador */}
        <div className="lg:w-[40%] shrink-0 flex flex-col justify-center p-8 lg:p-14 border-b lg:border-b-0 lg:border-r" style={{ borderColor: FILETE }}>
          <div className="font-fest uppercase leading-none text-white text-4xl lg:text-6xl">
            Óscar<span style={{ color: LIMA }}>26</span>
          </div>
          <div
            className="font-fest leading-[0.92] tabular-nums text-[30vw] lg:text-[17vw] mt-4"
            style={{ color: LIMA, textShadow: `0 0 90px ${LIMA}33` }}
          >
            {puntos}
          </div>
          <Antetitulo className="!text-[11px] lg:!text-sm mt-2">Puntos</Antetitulo>

          {proxima ? (
            <div className="mt-8 lg:mt-12">
              <div className="flex items-baseline justify-between mb-2">
                <Antetitulo>Siguiente caja</Antetitulo>
                <span className="font-fest text-3xl lg:text-5xl leading-none tabular-nums text-white">
                  −{proxima.umbral - puntos}
                </span>
              </div>
              <div className="h-2.5" style={{ background: '#17171C' }}>
                <div
                  className="h-full transition-[width] duration-700"
                  style={{ width: `${Math.min(100, (puntos / proxima.umbral) * 100)}%`, background: LIMA }}
                />
              </div>
              <p className="text-[13px] lg:text-lg italic text-zinc-500 mt-3 truncate">🔒 {proxima.pista}</p>
            </div>
          ) : (
            <p className="font-fest uppercase text-3xl lg:text-5xl mt-10" style={{ color: LIMA }}>Todo abierto</p>
          )}
        </div>

        {/* Qué toca y retos vivos */}
        <div className="flex-1 min-h-0 flex flex-col p-8 lg:p-14">
          {actual ? (
            <>
              <div className="shrink-0">
                <span
                  className="inline-flex items-center gap-2.5 text-[11px] lg:text-base font-bold uppercase tracking-[0.3em]"
                  style={{ color: DIRECTO }}
                >
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: DIRECTO }} />
                  En directo
                </span>
                <h1 className="flex items-center gap-4 lg:gap-6 font-fest uppercase leading-[0.85] text-white text-[11vw] lg:text-[6.5vw] mt-3">
                  <Marca id={actual.marca as MarcaId} className="w-[9vw] h-[9vw] lg:w-[5vw] lg:h-[5vw] shrink-0" style={{ color: actual.color }} />
                  <span className="min-w-0">{actual.titulo}</span>
                </h1>
                <div className="text-base lg:text-2xl text-zinc-400 mt-3">
                  {actual.inicio} – {actual.fin}
                  {!fijado && <span className="text-zinc-600"> · quedan {duracion(rangoDe(actual).hasta.getTime() - ahora.getTime())}</span>}
                </div>
                <div className="text-sm lg:text-xl text-zinc-600 mt-1">{actual.participantes.join(' · ')}</div>
              </div>

              {retos.length > 0 && (
                <div
                  className="flex-1 min-h-0 overflow-hidden mt-7 lg:mt-10"
                  style={{
                    maskImage: 'linear-gradient(to bottom, #000 84%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, #000 84%, transparent)',
                  }}
                >
                  <Antetitulo>Retos en juego</Antetitulo>
                  <div className="border-t mt-3" style={{ borderColor: FILETE }}>
                    {retos.slice(0, 6).map((r) => {
                      const ok = hecho(r.id)
                      return (
                        <div key={r.id} className="flex items-center gap-4 lg:gap-6 py-3 lg:py-4 border-b" style={{ borderColor: FILETE }}>
                          <span
                            className="shrink-0 w-6 h-6 lg:w-7 lg:h-7 grid place-items-center border text-sm font-bold"
                            style={ok ? { borderColor: LIMA, background: LIMA, color: NEGRO } : { borderColor: '#3F3F46', color: 'transparent' }}
                          >
                            ✓
                          </span>
                          <span className={`flex-1 min-w-0 truncate text-base lg:text-2xl font-medium ${ok ? 'text-zinc-600 line-through' : 'text-zinc-100'}`}>
                            {r.texto}
                          </span>
                          <span
                            className="shrink-0 font-fest text-2xl lg:text-4xl leading-none tabular-nums"
                            style={{ color: ok ? LIMA : '#3F3F46' }}
                          >
                            +{puntosDe(r)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-center">
              <div>
                <div className="font-fest uppercase text-zinc-700 text-6xl lg:text-8xl leading-none">Pausa</div>
                <p className="text-base lg:text-2xl text-zinc-600 mt-4">Fuera de horario</p>
              </div>
            </div>
          )}

          {ultimos.length > 0 && (
            <div className="shrink-0 flex flex-wrap gap-2 mt-6">
              {ultimos.map((m) => (
                <span
                  key={m.key}
                  className="border px-3 py-2 text-[11px] lg:text-base font-bold uppercase tracking-[0.1em]"
                  style={
                    m.puntos < 0
                      ? { color: DIRECTO, borderColor: `${DIRECTO}44` }
                      : { color: LIMA, borderColor: `${LIMA}44` }
                  }
                >
                  {m.puntos > 0 ? `+${m.puntos}` : m.puntos} · {m.texto}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
