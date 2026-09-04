// 02 — MARCADOR. La cifra grande del evento, la barra hasta la siguiente caja
// y el registro de lo que ha ido pasando. Es la sección que la gente va a
// recargar cada media hora, así que tiene que leerse de un vistazo.
import { PUNTOS_MAXIMOS, RETOS } from '@/data/despedida'
import { proximaRecompensa, useDespedida } from '@/state/despedidaStore'
import { Antetitulo, Cifra, FILETE, LIMA, Seccion } from './despedidaKit'

export default function MarcadorSection() {
  const puntos = useDespedida((s) => s.puntos())
  const save = useDespedida((s) => s.save)
  const movs = useDespedida((s) => s.historial())
  const proxima = proximaRecompensa(puntos)

  const hechos = Object.keys(save.retos).length
  const pct = proxima ? Math.min(100, Math.max(0, (puntos / proxima.umbral) * 100)) : 100

  return (
    <Seccion
      id="marcador"
      n="02"
      titulo="Marcador"
      apunte="Cada reto vale unos puntos decididos de antemano. Solo el juez los da, y todo movimiento queda anotado."
    >
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16">
        {/* La cifra */}
        <div>
          <Antetitulo>Puntos de Óscar</Antetitulo>
          <div className="flex items-baseline gap-4 mt-1">
            <span
              className="font-fest leading-[0.8] tabular-nums text-[26vw] sm:text-[9rem]"
              style={{ color: LIMA, textShadow: `0 0 80px ${LIMA}33` }}
            >
              {puntos}
            </span>
            <span className="font-festui text-sm font-bold uppercase tracking-[0.2em] text-zinc-600">
              / {PUNTOS_MAXIMOS}
            </span>
          </div>

          {proxima ? (
            <div className="mt-8">
              <div className="flex items-baseline justify-between mb-2">
                <Antetitulo>Siguiente caja</Antetitulo>
                <span className="font-fest text-3xl leading-none tabular-nums text-white">
                  −{proxima.umbral - puntos}
                </span>
              </div>
              <div className="h-2" style={{ background: '#17171C' }}>
                <div className="h-full transition-[width] duration-700" style={{ width: `${pct}%`, background: LIMA }} />
              </div>
              <p className="font-festui text-[13px] italic text-zinc-500 mt-3">🔒 {proxima.pista}</p>
            </div>
          ) : (
            <p className="font-festui text-lg font-bold uppercase tracking-[0.2em] mt-8" style={{ color: LIMA }}>
              Todo desbloqueado
            </p>
          )}

          <div className="grid grid-cols-3 gap-4 sm:gap-6 mt-10">
            <Cifra valor={hechos} etiqueta="retos hechos" />
            <Cifra valor={RETOS.filter((r) => !r.castigo).length} etiqueta="retos totales" />
            <Cifra valor={save.ajustes.length} etiqueta="a mano" />
          </div>
        </div>

        {/* El registro */}
        <div>
          <Antetitulo>Lo que ha pasado</Antetitulo>
          <div className="mt-4 border-t" style={{ borderColor: FILETE }}>
            {movs.length === 0 ? (
              <p className="font-festui text-[14px] text-zinc-600 py-8">
                Todavía nada. El marcador está a cero y Óscar aún duerme tranquilo.
              </p>
            ) : (
              movs.slice(0, 12).map((m) => (
                <div key={m.key} className="flex items-baseline gap-4 py-3.5 border-b" style={{ borderColor: FILETE }}>
                  <span
                    className="font-fest text-2xl leading-none tabular-nums w-14 shrink-0"
                    style={{ color: m.puntos < 0 ? '#FF3D57' : LIMA }}
                  >
                    {m.puntos > 0 ? `+${m.puntos}` : m.puntos}
                  </span>
                  <span className="font-festui text-[13.5px] text-zinc-300 flex-1 min-w-0 leading-snug">{m.texto}</span>
                  <span className="font-festui text-[11px] tabular-nums text-zinc-600 shrink-0">
                    {new Date(m.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
          {movs.length > 12 && (
            <p className="font-festui text-[11px] uppercase tracking-[0.2em] text-zinc-600 mt-4">
              y {movs.length - 12} movimientos más
            </p>
          )}
        </div>
      </div>
    </Seccion>
  )
}
