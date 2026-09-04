// 03 — RETOS. El catálogo completo, en rejilla y de solo lectura: aquí nadie
// marca nada. Marcar es cosa del juez y vive en su panel, para que esta página
// se pueda enseñar a cualquiera sin miedo a que toque el marcador.
import { useState } from 'react'
import { BLOQUES, retosDe, type Reto } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import { Antetitulo, DIRECTO, FILETE, LIMA, Seccion } from './despedidaKit'

export default function RetosSection() {
  const hecho = useDespedida((s) => s.hecho)
  const [soloPendientes, setSoloPendientes] = useState(false)

  return (
    <Seccion
      id="retos"
      n="03"
      titulo="Los retos"
      apunte="Puntos fijos y condición escrita, para que a las tres de la mañana no haya nada que discutir. Los marcados con calavera restan."
    >
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setSoloPendientes(!soloPendientes)}
          className="font-festui text-[11px] font-bold uppercase tracking-[0.2em] px-4 py-2.5 border transition hover:bg-white/5"
          style={soloPendientes ? { borderColor: LIMA, color: LIMA } : { borderColor: FILETE, color: '#A1A1AA' }}
        >
          {soloPendientes ? 'Viendo solo lo pendiente' : 'Ver solo lo pendiente'}
        </button>
      </div>

      <div className="flex flex-col gap-10 sm:gap-14">
        {BLOQUES.map((b) => {
          const retos = retosDe(b.id).filter((r) => !soloPendientes || !hecho(r.id))
          if (retos.length === 0) return null
          const total = retosDe(b.id).length
          const listos = retosDe(b.id).filter((r) => hecho(r.id)).length

          return (
            <div key={b.id}>
              <div className="flex items-baseline justify-between gap-4 pb-3 border-b" style={{ borderColor: FILETE }}>
                <h3 className="font-fest uppercase text-white text-2xl sm:text-3xl leading-none min-w-0 truncate">
                  <span className="mr-2">{b.emoji}</span>{b.titulo}
                </h3>
                <Antetitulo>{listos} / {total}</Antetitulo>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px mt-px" style={{ background: FILETE }}>
                {retos.map((r) => <Tarjeta key={r.id} reto={r} ok={hecho(r.id)} />)}
              </div>
            </div>
          )
        })}
      </div>
    </Seccion>
  )
}

function Tarjeta({ reto: r, ok }: { reto: Reto; ok: boolean }) {
  const castigo = !!r.castigo
  return (
    <div
      className="relative p-5 flex flex-col justify-between min-h-[130px] transition-colors"
      style={{ background: ok ? (castigo ? '#170B0E' : '#0F1408') : '#0B0B0E' }}
    >
      <div className="flex items-start justify-between gap-4">
        <p
          className={`font-festui text-[14px] font-medium leading-snug ${ok && !castigo ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}
        >
          {castigo && '💀 '}{r.texto}
        </p>
        <span
          className="font-fest text-3xl leading-none tabular-nums shrink-0"
          style={{ color: castigo ? DIRECTO : ok ? LIMA : '#3F3F46' }}
        >
          {r.puntos > 0 ? `+${r.puntos}` : r.puntos}
        </span>
      </div>

      <div className="mt-4">
        {r.detalle && <p className="font-festui text-[11.5px] italic text-zinc-600 leading-snug">{r.detalle}</p>}
        {ok && (
          <div
            className="font-festui text-[10px] font-bold uppercase tracking-[0.24em] mt-2"
            style={{ color: castigo ? DIRECTO : LIMA }}
          >
            {castigo ? 'La ha liado' : 'Conseguido'}
          </div>
        )}
      </div>
    </div>
  )
}
