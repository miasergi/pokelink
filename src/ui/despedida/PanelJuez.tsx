// EL PANEL DEL JUEZ. Lo único de la sección que no es escaparate: es la
// herramienta con la que alguien lleva el marcador el sábado, con una mano y
// mirando la pantalla de reojo.
//
// Por eso está fuera de la landing: aquí manda la velocidad (fila gorda, un
// toque, deshacer a la vista) y no la puesta en escena. Y por eso arranca
// SIEMPRE en el bloque que toca ahora: nadie debería buscar su juego en una
// lista de once mientras los demás gritan por Discord.
import { useState } from 'react'
import { BLOQUES, retosDe, type Reto } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import { proximaRecompensa } from '@/state/despedidaStore'
import { play } from '@/utils/sfx'
import Marca, { type MarcaId } from './Marcas'
import { Antetitulo, DIRECTO, FILETE, LIMA, NEGRO, bloqueActual, useAhora } from './despedidaKit'

export default function PanelJuez({ onCerrar }: { onCerrar: () => void }) {
  const ahora = useAhora(30_000)
  const { save, marcarReto, desmarcarReto, fijarBloque, salirJuez } = useDespedida()
  const puntos = useDespedida((s) => s.puntos())
  const hecho = useDespedida((s) => s.hecho)

  const enCurso = bloqueActual(ahora, save.bloqueFijado)
  const [bloqueId, setBloqueId] = useState(() => enCurso?.id ?? BLOQUES[0].id)
  const bloque = BLOQUES.find((b) => b.id === bloqueId) ?? BLOQUES[0]
  const proxima = proximaRecompensa(puntos)

  const alternar = (r: Reto) => {
    if (hecho(r.id)) { play('back'); desmarcarReto(r.id) }
    else { play(r.castigo ? 'error' : 'levelup'); marcarReto(r.id) }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col font-festui" style={{ background: NEGRO }}>
      {/* Cabecera fija con el marcador siempre a la vista */}
      <div className="shrink-0 border-b safe-top" style={{ borderColor: FILETE, background: '#0B0B0E' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <Antetitulo color={LIMA}>Panel del juez</Antetitulo>
            <div className="flex items-baseline gap-2.5 mt-0.5">
              <span className="font-fest text-4xl leading-none tabular-nums text-white">{puntos}</span>
              {proxima && (
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 truncate">
                  −{proxima.umbral - puntos} para la caja {proxima.umbral}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => { play('back'); onCerrar() }}
            className="shrink-0 w-10 h-10 grid place-items-center border text-zinc-400 active:scale-95 transition"
            style={{ borderColor: FILETE }}
            aria-label="Cerrar el panel"
          >
            <span className="text-lg leading-none">✕</span>
          </button>
        </div>

        {/* Selector de bloque, en cinta horizontal */}
        <div className="flex gap-px overflow-x-auto no-scrollbar px-4 pb-3 max-w-3xl mx-auto">
          {BLOQUES.map((b) => {
            const activo = b.id === bloqueId
            const esAhora = enCurso?.id === b.id
            return (
              <button
                key={b.id}
                onClick={() => { play('tap'); setBloqueId(b.id) }}
                className="shrink-0 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] border transition whitespace-nowrap"
                style={{
                  borderColor: activo ? LIMA : FILETE,
                  color: activo ? LIMA : esAhora ? DIRECTO : '#71717A',
                  background: activo ? `${LIMA}12` : 'transparent',
                }}
              >
                {esAhora && '● '}{b.inicio} {b.titulo}
              </button>
            )
          })}
        </div>
      </div>

      {/* Retos del bloque elegido */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-3xl mx-auto px-4 py-5 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 font-fest uppercase text-white text-3xl leading-none min-w-0">
              <Marca id={bloque.marca as MarcaId} className="w-6 h-6 shrink-0" style={{ color: bloque.color }} />
              <span className="truncate">{bloque.titulo}</span>
            </h2>
            <button
              onClick={() => { play('tap'); fijarBloque(save.bloqueFijado === bloque.id ? null : bloque.id) }}
              className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] px-3 py-2 border transition"
              style={
                save.bloqueFijado === bloque.id
                  ? { borderColor: DIRECTO, color: DIRECTO, background: `${DIRECTO}12` }
                  : { borderColor: FILETE, color: '#71717A' }
              }
            >
              {save.bloqueFijado === bloque.id ? 'Fijado' : 'Fijar aquí'}
            </button>
          </div>

          {save.bloqueFijado && save.bloqueFijado !== bloque.id && (
            <p className="text-[12px] text-zinc-500 leading-snug border-l-2 pl-3" style={{ borderColor: DIRECTO }}>
              Ahora mismo está fijado <b className="text-zinc-300">{BLOQUES.find((b) => b.id === save.bloqueFijado)?.titulo}</b>.
              La página lo muestra como el bloque en directo, aunque el reloj diga otra cosa.
            </p>
          )}

          <div className="flex flex-col gap-px" style={{ background: FILETE }}>
            {retosDe(bloque.id).map((r) => {
              const ok = hecho(r.id)
              const castigo = !!r.castigo
              return (
                <button
                  key={r.id}
                  onClick={() => alternar(r)}
                  className="w-full flex items-center gap-4 px-4 py-4 text-left transition active:scale-[0.995]"
                  style={{ background: ok ? (castigo ? '#1A0C10' : '#111708') : '#0B0B0E' }}
                >
                  <span
                    className="shrink-0 w-7 h-7 grid place-items-center border text-sm font-bold"
                    style={
                      ok
                        ? { borderColor: castigo ? DIRECTO : LIMA, background: castigo ? DIRECTO : LIMA, color: NEGRO }
                        : { borderColor: '#3F3F46', color: 'transparent' }
                    }
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[14px] font-medium leading-snug ${ok ? 'text-zinc-400' : 'text-zinc-100'}`}>
                      {castigo && '💀 '}{r.texto}
                    </span>
                    {r.detalle && <span className="block text-[11.5px] italic text-zinc-600 mt-0.5 leading-snug">{r.detalle}</span>}
                  </span>
                  <span
                    className="shrink-0 font-fest text-2xl leading-none tabular-nums"
                    style={{ color: castigo ? DIRECTO : ok ? LIMA : '#52525B' }}
                  >
                    {r.puntos > 0 ? `+${r.puntos}` : r.puntos}
                  </span>
                </button>
              )
            })}
          </div>

          <PuntosManuales />
          <Historial />

          <button
            onClick={() => { play('back'); salirJuez(); onCerrar() }}
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600 py-4 border-t transition hover:text-zinc-400"
            style={{ borderColor: FILETE }}
          >
            Salir del modo juez en este dispositivo
          </button>
        </div>
      </div>
    </div>
  )
}

/** Para lo que no está en la lista: +/− puntos con motivo. */
function PuntosManuales() {
  const ajustar = useDespedida((s) => s.ajustar)
  const [motivo, setMotivo] = useState('')
  const [delta, setDelta] = useState(5)

  const aplicar = (signo: 1 | -1) => {
    play(signo > 0 ? 'buy' : 'error')
    ajustar(signo * delta, motivo || (signo > 0 ? 'Bonus de la cuadrilla' : 'Castigo de la cuadrilla'))
    setMotivo('')
  }

  return (
    <div className="border p-4 flex flex-col gap-3" style={{ borderColor: FILETE, background: '#0B0B0E' }}>
      <Antetitulo>Puntos a mano</Antetitulo>
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo (p. ej. se ha bebido el chupito)"
        maxLength={60}
        className="w-full border px-3 py-3 text-[13px] text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-zinc-500"
        style={{ borderColor: FILETE, background: NEGRO }}
      />
      <div className="flex gap-px" style={{ background: FILETE }}>
        {[5, 10, 15, 25].map((n) => (
          <button
            key={n}
            onClick={() => { play('tap'); setDelta(n) }}
            className="flex-1 py-2.5 text-[13px] font-bold tabular-nums transition"
            style={delta === n ? { background: `${LIMA}18`, color: LIMA } : { background: '#0B0B0E', color: '#71717A' }}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => aplicar(-1)}
          className="flex-1 py-3 text-[13px] font-bold border transition active:scale-95"
          style={{ borderColor: `${DIRECTO}55`, color: DIRECTO }}
        >
          −{delta}
        </button>
        <button
          onClick={() => aplicar(1)}
          className="flex-[2] py-3 text-[13px] font-bold uppercase tracking-[0.16em] transition active:scale-95"
          style={{ background: LIMA, color: NEGRO }}
        >
          +{delta} puntos
        </button>
      </div>
    </div>
  )
}

/** Lo que ha sumado o restado, con deshacer. Sin esto, el marcador se muere
 *  en la primera discusión de "eso no me lo habías dado". */
function Historial() {
  const { desmarcarReto, borrarAjuste } = useDespedida()
  const movs = useDespedida((s) => s.historial())
  const [todo, setTodo] = useState(false)
  const lista = todo ? movs : movs.slice(0, 6)

  if (movs.length === 0) return null

  return (
    <div className="border p-4" style={{ borderColor: FILETE, background: '#0B0B0E' }}>
      <Antetitulo>Historial</Antetitulo>
      <div className="mt-3">
        {lista.map((m) => (
          <div key={m.key} className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: FILETE }}>
            <span
              className="font-fest text-xl leading-none tabular-nums w-11 shrink-0"
              style={{ color: m.puntos < 0 ? DIRECTO : LIMA }}
            >
              {m.puntos > 0 ? `+${m.puntos}` : m.puntos}
            </span>
            <span className="text-[12.5px] text-zinc-400 flex-1 min-w-0 truncate">{m.texto}</span>
            <span className="text-[10.5px] tabular-nums text-zinc-700 shrink-0">
              {new Date(m.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={() => {
                play('back')
                if (m.retoId) desmarcarReto(m.retoId)
                else if (m.ajusteId) borrarAjuste(m.ajusteId)
              }}
              className="shrink-0 w-7 h-7 grid place-items-center border text-zinc-600 active:scale-95 transition"
              style={{ borderColor: FILETE }}
              aria-label="Deshacer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {movs.length > 6 && (
        <button
          onClick={() => setTodo(!todo)}
          className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-zinc-600 pt-3"
        >
          {todo ? 'Ver menos' : `Ver los ${movs.length}`}
        </button>
      )}
    </div>
  )
}
