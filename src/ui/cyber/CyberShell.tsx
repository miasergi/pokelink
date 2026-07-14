// Marco físico de la Cyber PokéBall: la bola dibujada con la pantalla LCD
// incrustada. TÁCTIL: ya no hay botones físicos (◄ ● ►) — se juega tocando
// directamente dentro del LCD, que ahora ocupa casi toda la bola.
import type { ReactNode } from 'react'

export default function CyberShell({
  children, onExit, header,
}: {
  children: ReactNode
  onExit: () => void
  /** Rótulo de la base (dinero, medallas…). */
  header?: ReactNode
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 items-center safe-top safe-bottom px-3 pb-3 select-none">
      {/* Cabecera */}
      <div className="w-full max-w-sm flex items-center justify-between py-2 shrink-0">
        <button
          onClick={onExit}
          className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[10px] font-lcd text-slate-300 active:scale-95 transition"
        >
          ✕ SALIR
        </button>
        <div className="font-lcd text-[10px] text-red-400 tracking-tight">CYBER POKÉBALL</div>
        <div className="w-16" />
      </div>

      {/* La bola */}
      <div className="relative w-full max-w-sm flex-1 min-h-0 flex flex-col rounded-[2.5rem] overflow-hidden border-4 border-slate-950 shadow-2xl shadow-black/60">
        {/* Cuerpo rojo con el LCD */}
        <div
          className="relative flex-1 min-h-0 flex flex-col p-3"
          style={{ background: 'radial-gradient(120% 90% at 30% 8%, #f87171 0%, #dc2626 45%, #991b1b 100%)' }}
        >
          {/* Brillo del plástico */}
          <div className="absolute top-2 left-5 w-24 h-8 rounded-full bg-white/25 blur-md pointer-events-none" />
          {/* Pantalla LCD (el juego entero vive aquí) */}
          <div className="relative flex-1 min-h-0 flex flex-col rounded-2xl border-4 border-slate-900 bg-[#0c1a10] overflow-hidden shadow-inner">
            <div className="relative flex-1 min-h-0 flex flex-col p-3 font-lcd text-emerald-200">
              {children}
            </div>
            {/* Scanlines */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.35) 2px 3px)' }}
            />
          </div>
        </div>

        {/* Bisagra */}
        <div className="h-3 bg-slate-950 shrink-0 relative">
          <div className="absolute inset-y-0 left-6 right-6 bg-slate-900 rounded-sm" />
        </div>

        {/* Base blanca: el «botón» ya es solo decorativo (todo es táctil) */}
        <div
          className="shrink-0 h-14 px-5 flex items-center justify-between"
          style={{ background: 'radial-gradient(120% 200% at 50% 140%, #cbd5e1 0%, #f1f5f9 55%, #ffffff 100%)' }}
        >
          <span className="w-9 h-9 rounded-full bg-white border-4 border-slate-950 shadow-inner" aria-hidden />
          <span className="font-lcd text-[9px] text-slate-500 truncate">{header}</span>
          <span className="w-9 h-9 rounded-full border-2 border-slate-300" aria-hidden />
        </div>
      </div>
    </div>
  )
}
