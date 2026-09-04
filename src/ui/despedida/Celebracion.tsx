// El momento de abrir caja. Salta sola en cuanto los puntos cruzan un umbral,
// en toda la sección (también en la tele y en el panel del juez), porque es el
// único evento del día que merece interrumpir lo que estés mirando.
import { useEffect } from 'react'
import { RECOMPENSAS } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import { play } from '@/utils/sfx'
import Marca, { type MarcaId } from './Marcas'
import { Antetitulo, FILETE, LIMA, NEGRO } from './despedidaKit'

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
      className="fixed inset-0 z-[60] grid place-items-center p-6 animate-fade-in font-festui"
      style={{ background: 'rgba(8,8,10,.97)' }}
      onClick={() => { play('confirm'); cerrar(null) }}
      role="dialog"
      aria-label={`Caja abierta: ${r.titulo}`}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(45% 40% at 50% 42%, ${LIMA}26, transparent 70%)` }}
      />

      <div className="relative w-full max-w-lg animate-pop-in">
        <Antetitulo color={LIMA} className="text-center">Caja abierta</Antetitulo>

        <div className="border mt-5" style={{ borderColor: `${LIMA}44`, background: '#0B0B0E' }}>
          <div className="grid place-items-center py-10 border-b" style={{ borderColor: FILETE }}>
            <Marca id={r.marca as MarcaId} className="w-24 h-24 animate-float" style={{ color: LIMA }} />
          </div>
          <div className="p-7 text-center">
            <h2 className="font-fest uppercase text-white text-5xl sm:text-6xl leading-[0.85]">{r.titulo}</h2>
            <p className="text-[14px] text-zinc-400 mt-4 leading-relaxed">{r.detalle}</p>
          </div>
          <div
            className="py-4 text-center font-fest uppercase text-3xl leading-none tabular-nums border-t"
            style={{ borderColor: FILETE, background: LIMA, color: NEGRO }}
          >
            {r.umbral} puntos
          </div>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-600 text-center mt-6">
          Toca para seguir
        </p>
      </div>
    </div>
  )
}
