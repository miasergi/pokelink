// EL DIRECTO: marcador arriba y el horario del Excel de Luis convertido en algo
// que se mira de reojo entre partida y partida. Lo importante es que en dos
// segundos sepas qué toca AHORA, cuánto queda y quién juega.
import { BLOQUES, bloqueSiguiente, rangoDe, retosDe, type Bloque } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'
import { duracion, EstadoChip, estadoDe, Marcador, Participantes, useAhora } from './despedidaKit'

export default function AgendaView({ onIrARetos }: { onIrARetos: (bloqueId: string) => void }) {
  const ahora = useAhora()
  const { save, juez, fijarBloque } = useDespedida()
  const puntos = useDespedida((s) => s.puntos())
  const hecho = useDespedida((s) => s.hecho)

  const fijado = save.bloqueFijado
  const actual = fijado
    ? BLOQUES.find((b) => b.id === fijado) ?? null
    : BLOQUES.find((b) => {
        const { desde, hasta } = rangoDe(b)
        return ahora >= desde && ahora < hasta
      }) ?? null
  const siguiente = actual ? BLOQUES[BLOQUES.findIndex((b) => b.id === actual.id) + 1] ?? null : bloqueSiguiente(ahora)

  const sabado = BLOQUES.filter((b) => b.dia === 'sab')
  const domingo = BLOQUES.filter((b) => b.dia === 'dom')

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24 pt-4 flex flex-col gap-4 max-w-md w-full mx-auto">
      <Marcador puntos={puntos} />

      {actual ? (
        <AhoraCard bloque={actual} ahora={ahora} fijado={!!fijado} onIrARetos={onIrARetos} hecho={hecho} />
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-center">
          <div className="text-3xl mb-1">⏳</div>
          <div className="text-sm font-black text-slate-200">Aún no ha empezado</div>
          <div className="text-[12px] text-slate-400 mt-1">
            {siguiente
              ? <>Empieza <b className="text-slate-200">{siguiente.titulo}</b> {siguiente.dia === 'dom' ? 'el domingo' : 'el sábado'} a las {siguiente.inicio}.</>
              : 'Se acabó la despedida. Óscar ha sobrevivido.'}
          </div>
        </div>
      )}

      {siguiente && actual && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/50 px-3.5 py-2.5">
          <Icon name="next" className="w-4 h-4 shrink-0 text-slate-500" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Después</div>
            <div className="text-[13px] font-bold text-slate-200 truncate">{siguiente.emoji} {siguiente.titulo} · {siguiente.inicio}</div>
          </div>
        </div>
      )}

      <Dia titulo="Sábado 12" bloques={sabado} ahora={ahora} fijado={fijado} juez={juez} onFijar={fijarBloque} onIrARetos={onIrARetos} />
      <Dia titulo="Domingo 13" bloques={domingo} ahora={ahora} fijado={fijado} juez={juez} onFijar={fijarBloque} onIrARetos={onIrARetos} />

      {juez && fijado && (
        <button
          onClick={() => { play('back'); fijarBloque(null) }}
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[12px] font-bold text-amber-300 active:scale-[0.98] transition"
        >
          Bloque fijado a mano · volver a seguir el reloj
        </button>
      )}
    </div>
  )
}

/** La tarjeta gorda de "esto es lo que toca". */
function AhoraCard({ bloque, ahora, fijado, onIrARetos, hecho }: {
  bloque: Bloque
  ahora: Date
  fijado: boolean
  onIrARetos: (id: string) => void
  hecho: (retoId: string) => boolean
}) {
  const { hasta } = rangoDe(bloque)
  const retos = retosDe(bloque.id)
  const pendientes = retos.filter((r) => !r.castigo && !hecho(r.id))
  const restante = hasta.getTime() - ahora.getTime()

  return (
    <div
      className="rounded-3xl border p-4 animate-pop-in"
      style={{ borderColor: `${bloque.color}66`, background: `linear-gradient(160deg, ${bloque.color}1f, rgba(15,23,42,.75))`, boxShadow: `0 22px 46px -30px ${bloque.color}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <EstadoChip estado="ahora" />
          <div className="mt-2 text-2xl font-black leading-tight" style={{ color: bloque.color }}>
            {bloque.emoji} {bloque.titulo}
          </div>
          <div className="text-[12px] font-bold text-slate-300 mt-0.5">
            {bloque.inicio} – {bloque.fin}
            {!fijado && restante > 0 && <span className="text-slate-400 font-normal"> · quedan {duracion(restante)}</span>}
          </div>
        </div>
      </div>

      <p className="text-[12.5px] text-slate-300 mt-2 leading-snug">{bloque.desc}</p>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Juegan</div>
        <Participantes nombres={bloque.participantes} />
      </div>

      {bloque.logistica && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-700/70 bg-slate-950/40 px-3 py-2">
          <Icon name="warning" className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
          <span className="text-[11.5px] text-slate-300 leading-snug">{bloque.logistica}</span>
        </div>
      )}

      {retos.length > 0 && (
        <button
          onClick={() => { play('confirm'); onIrARetos(bloque.id) }}
          className="mt-3 w-full flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 active:scale-[0.98] transition"
        >
          <span className="flex items-center gap-2 text-[13px] font-bold text-slate-100">
            <Icon name="target" className="w-4 h-4 text-pink-300" />
            {pendientes.length > 0 ? `${pendientes.length} reto${pendientes.length === 1 ? '' : 's'} en juego` : 'Retos de este bloque'}
          </span>
          <Icon name="arrowRight" className="w-4 h-4 text-slate-500" />
        </button>
      )}
    </div>
  )
}

function Dia({ titulo, bloques, ahora, fijado, juez, onFijar, onIrARetos }: {
  titulo: string
  bloques: Bloque[]
  ahora: Date
  fijado: string | null
  juez: boolean
  onFijar: (id: string | null) => void
  onIrARetos: (id: string) => void
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500 font-black mb-2 px-1">{titulo}</div>
      <div className="flex flex-col gap-1.5">
        {bloques.map((b) => {
          const rango = rangoDe(b)
          const estado = estadoDe(b, ahora, fijado, rango)
          return (
            <div
              key={b.id}
              role="button"
              tabIndex={0}
              onClick={() => { play('tap'); onIrARetos(b.id) }}
              onKeyDown={(e) => { if (e.key === 'Enter') onIrARetos(b.id) }}
              className={`relative rounded-2xl border px-3 py-2.5 flex items-center gap-3 transition active:scale-[0.99] cursor-pointer ${
                estado === 'ahora'
                  ? 'border-rose-400/50 bg-rose-500/10'
                  : estado === 'pasado'
                    ? 'border-slate-800 bg-slate-900/40 opacity-55'
                    : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              <div className="shrink-0 w-11 text-center">
                <div className="text-[12px] font-black tabular-nums text-slate-200">{b.inicio}</div>
                <div className="text-[9px] text-slate-500 tabular-nums">{b.fin}</div>
              </div>
              <div className="w-px self-stretch" style={{ background: `${b.color}55` }} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold truncate" style={{ color: estado === 'pasado' ? '#94a3b8' : b.color }}>
                  {b.emoji} {b.titulo}
                </div>
                <div className="text-[10.5px] text-slate-400 truncate">{b.participantes.join(' · ')}</div>
              </div>
              {estado === 'ahora' && <EstadoChip estado="ahora" />}
              {juez && (
                <button
                  onClick={(e) => { e.stopPropagation(); play('tap'); onFijar(fijado === b.id ? null : b.id) }}
                  className={`shrink-0 w-8 h-8 grid place-items-center rounded-full border transition active:scale-95 ${
                    fijado === b.id ? 'border-amber-400/60 bg-amber-500/20 text-amber-300' : 'border-slate-700 bg-slate-800/70 text-slate-500'
                  }`}
                  aria-label={fijado === b.id ? 'Dejar de fijar este bloque' : 'Fijar este bloque como el actual'}
                >
                  <Icon name="pointer" className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
