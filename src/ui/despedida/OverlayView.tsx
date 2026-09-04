// MODO TELE: la misma información, pero para verse a tres metros o metida como
// browser source en el OBS del directo. Sin chrome, sin botones, tipografía
// enorme y todo en una pantalla: puntos, qué toca, retos vivos y qué falta para
// la siguiente caja.
import { BLOQUES, rangoDe, retosDe } from '@/data/despedida'
import { proximaRecompensa, useDespedida } from '@/state/despedidaStore'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'
import { duracion, ROSA, useAhora } from './despedidaKit'

export default function OverlayView({ onSalir }: { onSalir: () => void }) {
  const ahora = useAhora(10_000)
  const fijado = useDespedida((s) => s.save.bloqueFijado)
  const puntos = useDespedida((s) => s.puntos())
  const hecho = useDespedida((s) => s.hecho)
  const movs = useDespedida((s) => s.historial())

  const actual = fijado
    ? BLOQUES.find((b) => b.id === fijado) ?? null
    : BLOQUES.find((b) => {
        const { desde, hasta } = rangoDe(b)
        return ahora >= desde && ahora < hasta
      }) ?? null
  const proxima = proximaRecompensa(puntos)
  const retos = actual ? retosDe(actual.id).filter((r) => !r.castigo) : []
  const ultimos = movs.slice(0, 4)

  return (
    <div className="fixed inset-0 z-40 overflow-hidden text-slate-100" style={{ background: '#05070f' }}>
      {/* Aliento de color del bloque en curso: de un vistazo desde el sofá ya
          sabes en qué juego anda metido. */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{ background: `radial-gradient(70% 55% at 50% -10%, ${(actual?.color ?? ROSA)}33, transparent 65%)` }}
      />

      <button
        onClick={() => { play('back'); onSalir() }}
        className="absolute top-3 right-3 z-10 w-9 h-9 grid place-items-center rounded-full border border-slate-700/60 bg-slate-900/50 text-slate-600 hover:text-slate-300 transition"
        aria-label="Salir del modo tele"
      >
        <Icon name="x" className="w-4 h-4" />
      </button>

      <div className="relative h-full w-full flex flex-col lg:flex-row items-stretch gap-6 p-6 lg:p-10">
        {/* Marcador */}
        <div className="lg:w-[38%] flex flex-col justify-center items-center text-center shrink-0">
          <div className="text-[11px] lg:text-sm font-black uppercase tracking-[0.4em] text-slate-500">Despedida de Óscar</div>
          <div
            className="font-black leading-none tabular-nums text-[24vw] lg:text-[13vw]"
            style={{ color: ROSA, textShadow: `0 0 60px ${ROSA}55` }}
          >
            {puntos}
          </div>
          <div className="text-sm lg:text-lg font-black uppercase tracking-[0.3em] text-slate-400 -mt-2">puntos</div>

          {proxima ? (
            <div className="mt-6 w-full max-w-sm">
              <div className="flex items-baseline justify-between text-[11px] lg:text-sm font-bold text-slate-400 mb-1.5">
                <span className="uppercase tracking-widest">Siguiente caja</span>
                <span className="tabular-nums text-amber-300 font-black text-base lg:text-2xl">−{proxima.umbral - puntos}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${Math.min(100, (puntos / proxima.umbral) * 100)}%`, background: `linear-gradient(90deg, ${ROSA}, #fbbf24)` }}
                />
              </div>
              <div className="mt-2 text-[12px] lg:text-base italic text-slate-500 truncate">🔒 {proxima.pista}</div>
            </div>
          ) : (
            <div className="mt-6 text-lg lg:text-3xl font-black text-emerald-300 uppercase tracking-widest">Todo desbloqueado</div>
          )}
        </div>

        {/* Qué toca y retos vivos */}
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {actual ? (
            <>
              <div className="rounded-3xl border p-5 lg:p-7" style={{ borderColor: `${actual.color}55`, background: `${actual.color}12` }}>
                <div className="flex items-center gap-2 text-[11px] lg:text-sm font-black uppercase tracking-[0.3em] text-rose-300">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" /> En directo
                </div>
                <div className="text-4xl lg:text-6xl font-black mt-2 leading-none" style={{ color: actual.color }}>
                  {actual.emoji} {actual.titulo}
                </div>
                <div className="text-base lg:text-2xl font-bold text-slate-300 mt-2">
                  {actual.inicio} – {actual.fin}
                  {!fijado && <span className="text-slate-500 font-normal"> · quedan {duracion(rangoDe(actual).hasta.getTime() - ahora.getTime())}</span>}
                </div>
                <div className="text-sm lg:text-lg text-slate-400 mt-1">{actual.participantes.join(' · ')}</div>
              </div>

              {retos.length > 0 && (
                <div
                  className="flex-1 min-h-0 overflow-hidden"
                  style={{
                    maskImage: 'linear-gradient(to bottom, #000 84%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, #000 84%, transparent)',
                  }}
                >
                  <div className="text-[11px] lg:text-sm font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Retos en juego</div>
                  <div className="flex flex-col gap-2">
                    {retos.slice(0, 6).map((r) => {
                      const ok = hecho(r.id)
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 lg:py-3.5 ${
                            ok ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/50'
                          }`}
                        >
                          <span className={`shrink-0 w-6 h-6 rounded-md grid place-items-center border ${ok ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-slate-700'}`}>
                            {ok && <Icon name="check" className="w-4 h-4" />}
                          </span>
                          <span className={`flex-1 min-w-0 truncate text-sm lg:text-xl font-bold ${ok ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                            {r.texto}
                          </span>
                          <span className={`shrink-0 text-base lg:text-2xl font-black tabular-nums ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                            +{r.puntos}
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
                <div className="text-6xl lg:text-8xl animate-float">🎉</div>
                <div className="text-xl lg:text-4xl font-black text-slate-300 mt-4">Fuera de horario</div>
              </div>
            </div>
          )}

          {ultimos.length > 0 && (
            <div className="shrink-0 flex flex-wrap gap-2">
              {ultimos.map((m) => (
                <span
                  key={m.key}
                  className={`rounded-full border px-3 py-1.5 text-[11px] lg:text-base font-bold ${
                    m.puntos < 0 ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  }`}
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
