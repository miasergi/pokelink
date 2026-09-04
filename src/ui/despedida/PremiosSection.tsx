// 04 — PREMIOS. Siete cajas numeradas con el umbral a la vista y el contenido
// tapado. La tensión es toda la gracia: se ve cuánto falta y una pista, nada
// más. Los organizadores tienen un interruptor para espiarlas, porque alguien
// tiene que ir a comprarlas.
import { useState } from 'react'
import { PUNTOS_MAXIMOS, RECOMPENSAS, type Recompensa } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import { Antetitulo, FILETE, LIMA, Seccion } from './despedidaKit'

export default function PremiosSection() {
  const juez = useDespedida((s) => s.juez)
  const puntos = useDespedida((s) => s.puntos())
  const [espiar, setEspiar] = useState(false)

  const ultimo = RECOMPENSAS[RECOMPENSAS.length - 1]
  const abiertas = RECOMPENSAS.filter((r) => puntos >= r.umbral).length

  return (
    <Seccion
      id="premios"
      n="04"
      titulo="Las cajas"
      apunte="Se abren solas al llegar a los puntos. Lo que hay dentro no se sabe hasta ese momento: solo la pista y lo que falta."
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <Antetitulo color={LIMA}>{abiertas} de {RECOMPENSAS.length} abiertas</Antetitulo>
        {juez && (
          <button
            onClick={() => setEspiar(!espiar)}
            className="font-festui text-[11px] font-bold uppercase tracking-[0.2em] px-4 py-2.5 border transition hover:bg-white/5"
            style={espiar ? { borderColor: LIMA, color: LIMA } : { borderColor: FILETE, color: '#A1A1AA' }}
          >
            {espiar ? 'Espiando 👀' : 'Modo organizador'}
          </button>
        )}
      </div>

      {juez && ultimo.umbral > PUNTOS_MAXIMOS && (
        <p className="font-festui text-[13px] mb-8 border-l-2 pl-4 py-2" style={{ color: '#FF3D57', borderColor: '#FF3D57' }}>
          La última caja pide {ultimo.umbral} puntos y como mucho se pueden sacar {PUNTOS_MAXIMOS}. Bajad el umbral o añadid retos.
        </p>
      )}

      <div className="border-t" style={{ borderColor: FILETE }}>
        {RECOMPENSAS.map((r, i) => (
          <Caja key={r.id} n={i + 1} recompensa={r} puntos={puntos} espiar={espiar} />
        ))}
      </div>

      <p className="font-festui text-[12.5px] text-zinc-600 mt-8 max-w-lg leading-relaxed">
        Los puntos abren extras, nunca lo básico: de comer y de beber hay para todos pase lo que pase.
      </p>
    </Seccion>
  )
}

function Caja({ n, recompensa: r, puntos, espiar }: {
  n: number
  recompensa: Recompensa
  puntos: number
  espiar: boolean
}) {
  const abierta = puntos >= r.umbral
  const visible = abierta || espiar
  const pct = Math.min(100, Math.max(0, (puntos / r.umbral) * 100))

  return (
    <div
      className={`relative border-b transition-colors ${abierta ? '' : 'rayado-fest'}`}
      style={{ borderColor: FILETE, background: abierta ? `${LIMA}0D` : '#0A0A0C' }}
    >
      {/* Barra de progreso como fondo de la fila: la fila se "llena". */}
      {!abierta && (
        <div aria-hidden className="absolute inset-y-0 left-0 transition-[width] duration-700" style={{ width: `${pct}%`, background: '#121216' }} />
      )}

      <div className="relative flex items-center gap-4 sm:gap-7 px-1 sm:px-3 py-5 sm:py-7">
        <span className="font-festui text-[11px] font-bold tabular-nums text-zinc-600 w-6 shrink-0">
          {String(n).padStart(2, '0')}
        </span>

        <span
          className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 grid place-items-center text-2xl sm:text-3xl border"
          style={{ borderColor: abierta ? `${LIMA}55` : FILETE, background: abierta ? `${LIMA}12` : '#0E0E12' }}
        >
          {abierta ? r.emoji : <Candado />}
        </span>

        <div className="min-w-0 flex-1">
          {visible ? (
            <>
              <h4 className="font-fest uppercase text-white text-xl sm:text-3xl leading-none">
                {!abierta && espiar && <span className="text-zinc-600 mr-1.5">👀</span>}
                {r.titulo}
              </h4>
              <p className="font-festui text-[12.5px] sm:text-sm text-zinc-400 mt-2 leading-snug max-w-xl">{r.detalle}</p>
            </>
          ) : (
            <>
              <h4 className="font-fest uppercase text-zinc-700 text-xl sm:text-3xl leading-none tracking-[0.2em]">
                ??????
              </h4>
              <p className="font-festui text-[12.5px] sm:text-sm italic text-zinc-500 mt-2 leading-snug max-w-xl">{r.pista}</p>
            </>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div
            className="font-fest text-3xl sm:text-5xl leading-none tabular-nums"
            style={{ color: abierta ? LIMA : '#3F3F46' }}
          >
            {r.umbral}
          </div>
          <div className="font-festui text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mt-1">
            {abierta ? 'abierta' : `faltan ${r.umbral - puntos}`}
          </div>
        </div>
      </div>
    </div>
  )
}

function Candado() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="5" y="10.5" width="14" height="10" rx="1" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  )
}
