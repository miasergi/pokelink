// LOS RETOS: el catálogo cerrado, agrupado por bloque. Solo el juez marca; el
// resto mira. Abajo, los puntos manuales para lo que surja y el historial con
// deshacer, que es lo que evita las discusiones de "eso no te lo había dado".
import { useEffect, useRef, useState } from 'react'
import { BLOQUES, retosDe, type Reto } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'
import { Marcador, ROSA } from './despedidaKit'

export default function RetosView({ bloqueDestacado }: { bloqueDestacado: string | null }) {
  const { juez, marcarReto, desmarcarReto } = useDespedida()
  const puntos = useDespedida((s) => s.puntos())
  const hecho = useDespedida((s) => s.hecho)
  const [abierto, setAbierto] = useState<string | null>(bloqueDestacado ?? BLOQUES[0].id)
  const destacadoRef = useRef<HTMLDivElement | null>(null)

  // Al llegar desde "retos de este bloque", el bloque en cuestión se abre y se
  // pone a la vista: nadie debería buscar su juego en una lista de once.
  useEffect(() => {
    if (!bloqueDestacado) return
    setAbierto(bloqueDestacado)
    const t = setTimeout(() => destacadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    return () => clearTimeout(t)
  }, [bloqueDestacado])

  const alternar = (r: Reto) => {
    if (!juez) { play('error'); return }
    if (hecho(r.id)) { play('back'); desmarcarReto(r.id) }
    else { play(r.castigo ? 'error' : 'levelup'); marcarReto(r.id) }
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24 pt-4 flex flex-col gap-3 max-w-md w-full mx-auto">
      <Marcador puntos={puntos} compacto />

      {!juez && (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 px-3.5 py-2.5">
          <Icon name="lock" className="w-4 h-4 shrink-0 text-slate-500" />
          <span className="text-[11.5px] text-slate-400 leading-snug">Solo el juez puede marcar retos. Tú puedes mirarlo todo.</span>
        </div>
      )}

      {BLOQUES.map((b) => {
        const retos = retosDe(b.id)
        if (retos.length === 0) return null
        const completados = retos.filter((r) => hecho(r.id)).length
        const esta = abierto === b.id
        return (
          <div
            key={b.id}
            ref={b.id === bloqueDestacado ? destacadoRef : undefined}
            className="shrink-0 rounded-2xl border overflow-hidden scroll-mt-4"
            style={{ borderColor: esta ? `${b.color}66` : '#1e293b', background: esta ? `${b.color}0d` : 'rgba(15,23,42,.55)' }}
          >
            <button
              onClick={() => { play('tap'); setAbierto(esta ? null : b.id) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left active:scale-[0.995] transition"
            >
              <span className="text-lg shrink-0">{b.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-black truncate" style={{ color: b.color }}>{b.titulo}</span>
                <span className="block text-[10.5px] text-slate-500">{completados} de {retos.length} · {b.inicio}</span>
              </span>
              <Icon name="arrowRight" className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${esta ? 'rotate-90' : ''}`} />
            </button>

            {esta && (
              <div className="px-2.5 pb-2.5 flex flex-col gap-1.5">
                {retos.map((r) => {
                  const ok = hecho(r.id)
                  return (
                    <button
                      key={r.id}
                      onClick={() => alternar(r)}
                      disabled={!juez}
                      className={`w-full flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${juez ? 'active:scale-[0.98]' : 'cursor-default'} ${
                        ok
                          ? r.castigo
                            ? 'border-rose-500/50 bg-rose-500/15'
                            : 'border-emerald-500/50 bg-emerald-500/15'
                          : 'border-slate-800 bg-slate-950/40'
                      }`}
                    >
                      <span
                        className={`shrink-0 mt-0.5 w-5 h-5 rounded-md grid place-items-center border ${
                          ok
                            ? r.castigo ? 'border-rose-400 bg-rose-500 text-slate-950' : 'border-emerald-400 bg-emerald-500 text-slate-950'
                            : 'border-slate-600'
                        }`}
                      >
                        {ok && <Icon name="check" className="w-3.5 h-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[12.5px] font-bold leading-snug ${ok ? 'text-slate-100' : 'text-slate-300'}`}>
                          {r.castigo && '💀 '}{r.texto}
                        </span>
                        {r.detalle && <span className="block text-[10.5px] text-slate-500 italic leading-snug mt-0.5">{r.detalle}</span>}
                      </span>
                      <span className={`shrink-0 text-[13px] font-black tabular-nums ${r.castigo ? 'text-rose-400' : ok ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {r.puntos > 0 ? `+${r.puntos}` : r.puntos}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {juez && <PuntosManuales />}
      <Historial />
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 flex flex-col gap-2.5">
      <div className="text-[11px] uppercase tracking-widest text-slate-400 font-black">Puntos a mano</div>
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo (p. ej. se ha bebido el chupito)"
        maxLength={60}
        className="w-full rounded-xl bg-slate-950/70 border border-slate-700 px-3 py-2.5 text-[12.5px] text-slate-100 placeholder:text-slate-600 outline-none focus:border-pink-500/60"
      />
      <div className="flex gap-1.5">
        {[5, 10, 15, 25].map((n) => (
          <button
            key={n}
            onClick={() => { play('tap'); setDelta(n) }}
            className={`flex-1 rounded-xl border py-2 text-[12px] font-black tabular-nums transition active:scale-95 ${
              delta === n ? 'border-pink-400/60 bg-pink-500/20 text-pink-200' : 'border-slate-700 bg-slate-800/60 text-slate-400'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => aplicar(-1)}
          className="flex-1 rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 text-[13px] font-black text-rose-300 active:scale-95 transition"
        >
          −{delta}
        </button>
        <button
          onClick={() => aplicar(1)}
          className="flex-[2] rounded-xl py-2.5 text-[13px] font-black text-slate-950 active:scale-95 transition"
          style={{ background: ROSA }}
        >
          +{delta} puntos
        </button>
      </div>
    </div>
  )
}

/** Todo lo que ha sumado o restado, con deshacer para el juez. */
function Historial() {
  const { juez, desmarcarReto, borrarAjuste } = useDespedida()
  const movs = useDespedida((s) => s.historial())
  const [todo, setTodo] = useState(false)
  const lista = todo ? movs : movs.slice(0, 6)

  if (movs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-3.5 py-4 text-center text-[12px] text-slate-500">
        Todavía no ha pasado nada. El marcador está a cero.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 flex flex-col gap-1.5">
      <div className="text-[11px] uppercase tracking-widest text-slate-400 font-black px-1 pb-0.5">Historial</div>
      {lista.map((m) => (
        <div key={m.key} className="flex items-center gap-2.5 rounded-xl bg-slate-950/50 px-3 py-2">
          <span className={`shrink-0 text-[12px] font-black tabular-nums w-9 ${m.puntos < 0 ? 'text-rose-400' : 'text-emerald-300'}`}>
            {m.puntos > 0 ? `+${m.puntos}` : m.puntos}
          </span>
          <span className="min-w-0 flex-1 text-[12px] text-slate-300 truncate">{m.texto}</span>
          <span className="shrink-0 text-[10px] text-slate-600 tabular-nums">
            {new Date(m.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {juez && (
            <button
              onClick={() => {
                play('back')
                if (m.retoId) desmarcarReto(m.retoId)
                else if (m.ajusteId) borrarAjuste(m.ajusteId)
              }}
              className="shrink-0 w-7 h-7 grid place-items-center rounded-full border border-slate-700 text-slate-500 active:scale-95 transition"
              aria-label="Deshacer"
            >
              <Icon name="x" className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      {movs.length > 6 && (
        <button onClick={() => setTodo(!todo)} className="text-[11px] font-bold text-slate-500 py-1.5 active:scale-95 transition">
          {todo ? 'Ver menos' : `Ver los ${movs.length}`}
        </button>
      )}
    </div>
  )
}
