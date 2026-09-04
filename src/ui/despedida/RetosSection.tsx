// 03 — RETOS. El catálogo completo, en rejilla y de solo lectura: aquí nadie
// marca nada. Marcar es cosa del juez y vive en su panel, para que esta página
// se pueda enseñar a cualquiera sin miedo a que toque el marcador.
import { useState } from 'react'
import { BLOQUES, BLOQUE_GLOBAL, puntosDe, retosDe, type Reto } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import Marca, { type MarcaId } from './Marcas'
import { Antetitulo, DIRECTO, FILETE, LIMA, Seccion, estaRevelado, useAhora } from './despedidaKit'

export default function RetosSection() {
  const ahora = useAhora(30_000)
  const hecho = useDespedida((s) => s.hecho)
  const juez = useDespedida((s) => s.juez)
  const revelados = useDespedida((s) => s.revelados)
  const revelar = useDespedida((s) => s.revelar)
  const [soloPendientes, setSoloPendientes] = useState(false)

  return (
    <Seccion
      id="retos"
      n="03"
      titulo="Los retos"
      apunte="Puntos por dificultad y condición escrita, para que a las tres de la mañana no haya nada que discutir. Los marcados con calavera restan."
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
        {/* Los de todo el fin de semana van los primeros: no tienen hora y
            aplican mientras dure la despedida. */}
        <div>
          <div className="flex items-baseline justify-between gap-4 pb-3 border-b" style={{ borderColor: FILETE }}>
            <h3 className="flex items-center gap-2.5 font-fest uppercase text-white text-2xl sm:text-3xl leading-none min-w-0">
              <Marca id={BLOQUE_GLOBAL.marca as MarcaId} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" style={{ color: BLOQUE_GLOBAL.color }} />
              <span className="truncate">{BLOQUE_GLOBAL.titulo}</span>
            </h3>
            <Antetitulo>siempre</Antetitulo>
          </div>
          <p className="font-festui text-[12.5px] text-zinc-600 mt-3">{BLOQUE_GLOBAL.desc}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px mt-4">
            {retosDe(BLOQUE_GLOBAL.id).map((r) => <Tarjeta key={r.id} reto={r} ok={hecho(r.id)} />)}
          </div>
        </div>

        {BLOQUES.map((b) => {
          const total = retosDe(b.id).length
          if (total === 0) return null
          const listos = retosDe(b.id).filter((r) => hecho(r.id)).length

          // Sin destapar no se enseñan: los retos SON el spoiler del bloque.
          if (!estaRevelado(b, ahora, juez, revelados)) {
            return (
              <button
                key={b.id}
                onClick={() => revelar(b.id)}
                className="w-full flex items-center justify-between gap-4 pb-3 border-b text-left group"
                style={{ borderColor: FILETE }}
              >
                <h3 className="font-fest uppercase text-zinc-700 text-2xl sm:text-3xl leading-none tracking-[0.18em]">
                  ?????? · {b.inicio}
                </h3>
                <span className="font-festui text-[11px] font-bold uppercase tracking-[0.2em] shrink-0 transition group-hover:text-white" style={{ color: LIMA }}>
                  Destapar
                </span>
              </button>
            )
          }

          const retos = retosDe(b.id).filter((r) => !soloPendientes || !hecho(r.id))
          if (retos.length === 0) return null

          return (
            <div key={b.id}>
              <div className="flex items-baseline justify-between gap-4 pb-3 border-b" style={{ borderColor: FILETE }}>
                <h3 className="flex items-center gap-2.5 font-fest uppercase text-white text-2xl sm:text-3xl leading-none min-w-0">
                  <Marca id={b.marca as MarcaId} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" style={{ color: b.color }} />
                  <span className="truncate">{b.titulo}</span>
                </h3>
                <Antetitulo>{listos} / {total}</Antetitulo>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px mt-px">
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
      className="relative p-5 flex flex-col justify-between sm:min-h-[130px] transition-colors"
      style={{
        background: ok ? (castigo ? '#170B0E' : '#0F1408') : '#0B0B0E',
        boxShadow: `0 0 0 1px ${FILETE}`,
      }}
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
          {puntosDe(r) > 0 ? `+${puntosDe(r)}` : puntosDe(r)}
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
