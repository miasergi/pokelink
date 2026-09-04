// El momento de abrir caja. Salta sola en cuanto los puntos cruzan un umbral,
// en TODAS las pantallas de la sección (también en la tele), porque es el único
// evento del día que merece interrumpir lo que estés mirando.
import { useEffect } from 'react'
import { RECOMPENSAS } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import { play } from '@/utils/sfx'

export default function Celebracion() {
  const celebrando = useDespedida((s) => s.celebrando)
  const cerrar = useDespedida((s) => s.celebrar)
  const r = RECOMPENSAS.find((x) => x.id === celebrando)

  useEffect(() => {
    if (r) play('victory')
  }, [r])

  if (!r) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-6 backdrop-blur-sm animate-fade-in"
      style={{ background: 'radial-gradient(60% 50% at 50% 38%, rgba(251,191,36,.22), rgba(3,6,17,.97) 62%), rgba(3,6,17,.96)' }}
      onClick={() => { play('confirm'); cerrar(null) }}
      role="dialog"
      aria-label={`Premio desbloqueado: ${r.titulo}`}
    >
      <div className="max-w-xs w-full text-center animate-pop-in">
        <div className="text-[11px] font-black uppercase tracking-[0.35em] text-amber-300 mb-3">Premio desbloqueado</div>
        <div className="text-[84px] leading-none animate-float">{r.emoji}</div>
        <div className="mt-3 text-3xl font-black text-amber-100 leading-tight">{r.titulo}</div>
        <div className="mt-2 text-[13px] text-slate-300 leading-snug">{r.detalle}</div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-amber-200">
          {r.umbral} puntos
        </div>
        <div className="mt-6 text-[11px] text-slate-500">Toca para seguir</div>
      </div>
    </div>
  )
}
