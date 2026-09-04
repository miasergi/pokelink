// LAS RECOMPENSAS: cajas cerradas con su umbral a la vista y el contenido en
// secreto. La gracia entera está en que Óscar vea "faltan 12 puntos" y no sepa
// para qué. El juez puede espiarlas (alguien tiene que ir a comprarlas).
import { useState } from 'react'
import { PUNTOS_MAXIMOS, RECOMPENSAS, type Recompensa } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'
import { Marcador } from './despedidaKit'

export default function RecompensasView() {
  const juez = useDespedida((s) => s.juez)
  const puntos = useDespedida((s) => s.puntos())
  const [espiar, setEspiar] = useState(false)

  const ultimo = RECOMPENSAS[RECOMPENSAS.length - 1]
  const inalcanzable = ultimo && ultimo.umbral > PUNTOS_MAXIMOS

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24 pt-4 flex flex-col gap-3 max-w-md w-full mx-auto">
      <Marcador puntos={puntos} compacto />

      {juez && (
        <button
          onClick={() => { play('tap'); setEspiar(!espiar) }}
          className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 transition active:scale-[0.98] ${
            espiar ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-800 bg-slate-900/50'
          }`}
        >
          <span className="text-left">
            <span className={`block text-[12.5px] font-black ${espiar ? 'text-amber-300' : 'text-slate-200'}`}>Modo organizador 👀</span>
            <span className="block text-[10.5px] text-slate-500">Ver el contenido de las cajas aún cerradas.</span>
          </span>
          <span className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition ${espiar ? 'bg-amber-500' : 'bg-slate-600'}`}>
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${espiar ? 'translate-x-5' : ''}`} />
          </span>
        </button>
      )}

      {inalcanzable && juez && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5">
          <Icon name="warning" className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span className="text-[11.5px] text-rose-200 leading-snug">
            El último premio pide {ultimo.umbral} puntos y como mucho se pueden sacar {PUNTOS_MAXIMOS}. Bajad el umbral o añadid retos.
          </span>
        </div>
      )}

      {RECOMPENSAS.map((r) => (
        <Caja key={r.id} recompensa={r} puntos={puntos} espiar={espiar} />
      ))}

      <p className="text-[11px] text-slate-500 leading-snug text-center px-4 pt-1">
        Los puntos abren extras, no lo básico: de comer y de beber hay para todos pase lo que pase.
      </p>
    </div>
  )
}

function Caja({ recompensa: r, puntos, espiar }: { recompensa: Recompensa; puntos: number; espiar: boolean }) {
  const abierta = puntos >= r.umbral
  const faltan = r.umbral - puntos
  const visible = abierta || espiar

  return (
    <div
      className={`relative shrink-0 rounded-2xl border overflow-hidden transition ${
        abierta ? 'border-amber-400/50' : 'border-slate-800'
      }`}
      style={{
        background: abierta
          ? 'linear-gradient(150deg, rgba(251,191,36,.18), rgba(15,23,42,.8))'
          : 'rgba(15,23,42,.55)',
        boxShadow: abierta ? '0 18px 40px -30px #fbbf24' : undefined,
      }}
    >
      <div className="flex items-center gap-3 p-3.5">
        <div
          className={`shrink-0 w-14 h-14 rounded-2xl grid place-items-center text-2xl border ${
            abierta ? 'border-amber-400/50 bg-amber-500/15' : 'border-slate-700 bg-slate-950/60'
          }`}
        >
          {abierta ? r.emoji : <Icon name="lock" className="w-6 h-6 text-slate-600" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${abierta ? 'text-amber-300' : 'text-slate-500'}`}>
              {r.umbral} puntos
            </span>
            {abierta && (
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                Abierto
              </span>
            )}
          </div>

          {visible ? (
            <>
              <div className={`text-[14px] font-black leading-tight ${abierta ? 'text-amber-100' : 'text-slate-300'}`}>
                {!abierta && espiar && <span className="text-slate-600">👀 </span>}
                {r.titulo}
              </div>
              <div className="text-[11.5px] text-slate-400 leading-snug mt-0.5">{r.detalle}</div>
            </>
          ) : (
            <>
              <div className="text-[14px] font-black text-slate-400 leading-tight tracking-wider">· · · · · ·</div>
              <div className="text-[11.5px] text-slate-500 italic leading-snug mt-0.5">{r.pista}</div>
            </>
          )}
        </div>
      </div>

      {!abierta && (
        <div className="px-3.5 pb-3">
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-600 transition-[width] duration-700"
              style={{ width: `${Math.min(100, Math.max(0, (puntos / r.umbral) * 100))}%` }}
            />
          </div>
          <div className="text-[10.5px] text-slate-500 font-bold mt-1">Faltan {faltan} puntos</div>
        </div>
      )}
    </div>
  )
}
