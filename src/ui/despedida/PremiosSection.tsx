// 04 — PREMIOS. Dieciocho cajas numeradas con el umbral a la vista y el
// contenido tapado. La tensión es toda la gracia: se ve cuánto falta y una
// pista, nada más. Los organizadores tienen un interruptor para espiarlas,
// porque alguien tiene que ir a comprarlas.
//
// Algunas cajas caducan: si llega la hora del bloque marcado como límite y
// siguen cerradas, se abren solas con el castigo dentro. Así nadie tiene que
// acordarse de destaparlo en mitad de la comida.
import { useState } from 'react'
import { PUNTOS_MAXIMOS, RECOMPENSAS, bloquePorId, type Recompensa } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import Marca, { type MarcaId } from './Marcas'
import { Antetitulo, DIRECTO, FILETE, LIMA, Seccion, premioFallado, useAhora } from './despedidaKit'

export default function PremiosSection() {
  const ahora = useAhora(30_000)
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
      apunte="Se abren solas al llegar a los puntos. Lo que hay dentro no se sabe hasta ese momento: solo la pista y lo que falta. Y algunas caducan."
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
        <p className="font-festui text-[13px] mb-8 border-l-2 pl-4 py-2" style={{ color: DIRECTO, borderColor: DIRECTO }}>
          La última caja pide {ultimo.umbral} puntos y como mucho se pueden sacar {PUNTOS_MAXIMOS}. Bajad el umbral o añadid retos.
        </p>
      )}

      <div className="border-t" style={{ borderColor: FILETE }}>
        {RECOMPENSAS.map((r, i) => (
          <Caja
            key={r.id}
            n={i + 1}
            recompensa={r}
            puntos={puntos}
            espiar={espiar}
            fallada={premioFallado(r, ahora, puntos)}
          />
        ))}
      </div>

      <p className="font-festui text-[12.5px] text-zinc-600 mt-8 max-w-lg leading-relaxed">
        Los puntos abren extras, nunca lo básico: de comer y de beber hay para todos pase lo que pase.
      </p>
    </Seccion>
  )
}

function Caja({ n, recompensa: r, puntos, espiar, fallada }: {
  n: number
  recompensa: Recompensa
  puntos: number
  espiar: boolean
  fallada: boolean
}) {
  const abierta = puntos >= r.umbral
  const visible = abierta || fallada || espiar
  const pct = Math.min(100, Math.max(0, (puntos / r.umbral) * 100))
  const acento = fallada ? DIRECTO : LIMA
  const limite = r.limite ? bloquePorId(r.limite) : undefined

  return (
    <div
      className={`relative border-b transition-colors ${abierta || fallada ? '' : 'rayado-fest'}`}
      style={{
        borderColor: FILETE,
        background: abierta ? `${LIMA}0D` : fallada ? `${DIRECTO}0D` : '#0A0A0C',
      }}
    >
      {/* Barra de progreso como fondo de la fila: la fila se "llena". */}
      {!abierta && !fallada && (
        <div aria-hidden className="absolute inset-y-0 left-0 transition-[width] duration-700" style={{ width: `${pct}%`, background: '#121216' }} />
      )}

      {/* El legendario lleva su propio resplandor: tiene que parecer un drop. */}
      {abierta && r.legendario && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(60% 100% at 20% 50%, ${LIMA}1F, transparent 70%)` }}
        />
      )}

      <div className="relative flex items-center gap-4 sm:gap-7 px-1 sm:px-3 py-5 sm:py-7">
        <span className="font-festui text-[11px] font-bold tabular-nums text-zinc-600 w-6 shrink-0">
          {String(n).padStart(2, '0')}
        </span>

        <span
          className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 grid place-items-center border"
          style={{
            borderColor: abierta ? `${LIMA}55` : fallada ? `${DIRECTO}55` : FILETE,
            background: abierta ? `${LIMA}12` : fallada ? `${DIRECTO}12` : '#0E0E12',
          }}
        >
          {abierta || fallada
            ? <Marca id={r.marca as MarcaId} className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: acento }} />
            : <Candado />}
        </span>

        <div className="min-w-0 flex-1">
          {/* Chapas: qué clase de caja es esto, sin destripar el contenido. */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {r.legendario && <Chapa texto="Legendaria" color={LIMA} />}
            {r.jugoso && !r.legendario && <Chapa texto="De las gordas" color={LIMA} />}
            {fallada && <Chapa texto="Caducada" color={DIRECTO} />}
            {!fallada && r.penalizacion && limite && (
              // Con el día: "a las 11:00" a secas no dice si es hoy o mañana.
              <Chapa
                texto={`Caduca ${limite.dia === 'dom' ? 'el domingo ' : ''}a las ${limite.inicio}`}
                color={DIRECTO}
              />
            )}
          </div>

          {visible ? (
            <>
              <h4 className="font-fest uppercase text-white text-xl sm:text-3xl leading-none">
                {!abierta && !fallada && espiar && <span className="text-zinc-600 mr-1.5">👀</span>}
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

          {fallada && (
            <p
              className="font-festui text-[12.5px] sm:text-sm mt-3 border-l-2 pl-3 leading-snug max-w-xl"
              style={{ color: DIRECTO, borderColor: DIRECTO }}
            >
              {r.penalizacion}
            </p>
          )}

          {/* La trastienda: cómo se monta. Solo para quien organiza. */}
          {espiar && r.nota && (
            <p className="font-festui text-[12px] text-amber-300/80 mt-3 border-l-2 border-amber-400/40 pl-3 leading-snug max-w-xl">
              👀 {r.nota}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div
            className="font-fest text-3xl sm:text-5xl leading-none tabular-nums"
            style={{ color: abierta ? LIMA : fallada ? DIRECTO : '#3F3F46' }}
          >
            {r.umbral}
          </div>
          <div className="font-festui text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mt-1">
            {abierta ? 'abierta' : fallada ? 'perdida' : `faltan ${r.umbral - puntos}`}
          </div>
        </div>
      </div>
    </div>
  )
}

function Chapa({ texto, color }: { texto: string; color: string }) {
  return (
    <span
      className="font-festui text-[9.5px] font-bold uppercase tracking-[0.2em] px-2 py-1 border"
      style={{ color, borderColor: `${color}55`, background: `${color}12` }}
    >
      {texto}
    </span>
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
