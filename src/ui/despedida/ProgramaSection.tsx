// 01 — PROGRAMA. El Excel de Luis convertido en cartel: cada bloque es una
// línea de lineup con la hora enorme a la izquierda. Lo pasado se apaga, lo
// que toca ahora se enciende. Nada de tarjetitas redondeadas.
import { BLOQUES, retosDe, type Bloque, type Dia } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import {
  Antetitulo, ChapaDirecto, DIRECTO, FILETE, LIMA, Seccion, estadoDe, useAhora,
} from './despedidaKit'

const DIAS: Array<{ id: Dia; rotulo: string; fecha: string }> = [
  { id: 'sab', rotulo: 'Sábado', fecha: '12 sept' },
  { id: 'dom', rotulo: 'Domingo', fecha: '13 sept' },
]

export default function ProgramaSection() {
  const ahora = useAhora(30_000)
  const fijado = useDespedida((s) => s.save.bloqueFijado)

  return (
    <Seccion
      id="programa"
      n="01"
      titulo="Programa"
      apunte="Once bloques entre el sábado por la mañana y el domingo al mediodía. Los horarios son una intención, no una promesa."
    >
      <div className="flex flex-col gap-12 sm:gap-16">
        {DIAS.map((d) => (
          <div key={d.id}>
            <div className="flex items-baseline gap-4 mb-5">
              <h3 className="font-fest uppercase text-white text-3xl sm:text-4xl leading-none">{d.rotulo}</h3>
              <Antetitulo>{d.fecha}</Antetitulo>
            </div>
            <div className="border-t" style={{ borderColor: FILETE }}>
              {BLOQUES.filter((b) => b.dia === d.id).map((b) => (
                <Linea key={b.id} bloque={b} estado={estadoDe(b, ahora, fijado)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Seccion>
  )
}

function Linea({ bloque: b, estado }: { bloque: Bloque; estado: 'pasado' | 'ahora' | 'futuro' }) {
  const retos = retosDe(b.id).filter((r) => !r.castigo)
  const puntosEnJuego = retos.reduce((n, r) => n + r.puntos, 0)
  const pasado = estado === 'pasado'
  const enCurso = estado === 'ahora'

  return (
    <div
      className={`relative border-b transition-colors ${pasado ? 'opacity-55' : ''}`}
      style={{ borderColor: FILETE, background: enCurso ? `${DIRECTO}0A` : undefined }}
    >
      {/* Filo de color del bloque: el único resto de la paleta del Excel. */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: enCurso ? DIRECTO : b.color, opacity: enCurso ? 1 : 0.45 }} />

      <div className="pl-5 sm:pl-7 pr-1 py-5 sm:py-7 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
        {/* Hora */}
        <div className="sm:w-40 shrink-0 flex sm:block items-baseline gap-3">
          <div className="font-fest text-4xl sm:text-5xl leading-none tabular-nums text-white">{b.inicio}</div>
          <div className="font-festui text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600 sm:mt-1.5">
            hasta {b.fin}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h4 className="font-fest uppercase text-white text-2xl sm:text-4xl leading-none">
              <span className="mr-2">{b.emoji}</span>{b.titulo}
            </h4>
            {enCurso && <ChapaDirecto />}
          </div>
          <p className="font-festui text-[13px] sm:text-[15px] text-zinc-400 mt-2.5 leading-relaxed max-w-2xl">{b.desc}</p>

          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {b.participantes.map((n) => (
              <span
                key={n}
                className="font-festui text-[10.5px] font-bold uppercase tracking-[0.12em] px-2 py-1 border"
                style={
                  n === 'Óscar'
                    ? { color: LIMA, borderColor: `${LIMA}55`, background: `${LIMA}12` }
                    : { color: '#A1A1AA', borderColor: FILETE }
                }
              >
                {n}
              </span>
            ))}
          </div>

          {b.logistica && (
            <p className="font-festui text-[12px] text-zinc-600 mt-3 italic border-l pl-3" style={{ borderColor: FILETE }}>
              {b.logistica}
            </p>
          )}
        </div>

        {/* Puntos en juego */}
        {retos.length > 0 && (
          <div className="sm:w-28 shrink-0 sm:text-right">
            <div className="font-fest text-3xl sm:text-4xl leading-none tabular-nums" style={{ color: LIMA }}>
              {puntosEnJuego}
            </div>
            <div className="font-festui text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mt-1">
              pts en juego
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
