// Marco físico de la Cyber PokéBall: mitad roja con la pantalla LCD incrustada,
// bisagra negra, mitad blanca con los 3 controles del juguete (◄ ● ►).
// Las vistas del modo se renderizan DENTRO del LCD; los botones físicos y el
// teclado (←/Enter/→) disparan los handlers que pase la vista activa.
import { createContext, useContext, useEffect, type ReactNode, type DependencyList } from 'react'
import { play } from '@/utils/sfx'

export interface ShellControls {
  onLeft?: () => void
  onRight?: () => void
  onCenter?: () => void
  /** Etiquetas bajo los botones (por defecto ◄ ● ►). */
  centerLabel?: string
  disabled?: boolean
}

/** Las vistas registran aquí qué hacen los botones físicos de la bola. */
export const ShellControlsContext = createContext<(c: ShellControls) => void>(() => {})

export function useShellControls(controls: ShellControls, deps: DependencyList): void {
  const set = useContext(ShellControlsContext)
  // El cleanup limpia los controles al desmontar la vista: sin él, una vista
  // que no registre (o registre tarde) heredaría los botones de la anterior.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    set(controls)
    return () => set({})
  }, deps)
}

export default function CyberShell({
  children, controls, onExit, header,
}: {
  children: ReactNode
  controls: ShellControls
  onExit: () => void
  /** Contenido extra sobre la bola (dinero, título de fase…). */
  header?: ReactNode
}) {
  const { onLeft, onRight, onCenter, disabled } = controls

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return
      if (e.key === 'ArrowLeft' && onLeft) { e.preventDefault(); onLeft() }
      else if (e.key === 'ArrowRight' && onRight) { e.preventDefault(); onRight() }
      else if ((e.key === 'Enter' || e.key === ' ') && onCenter) { e.preventDefault(); onCenter() }
      else if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onLeft, onRight, onCenter, onExit, disabled])

  const press = (fn?: () => void) => () => {
    if (disabled || !fn) return
    play('select')
    fn()
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 items-center safe-top safe-bottom px-3 pb-3 select-none">
      {/* Cabecera: salir + título retro */}
      <div className="w-full max-w-sm flex items-center justify-between py-2 shrink-0">
        <button
          onClick={onExit}
          className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[10px] font-lcd text-slate-300 active:scale-95 transition"
        >
          ✕ SALIR
        </button>
        <div className="font-lcd text-[10px] text-red-400 tracking-tight">CYBER POKÉBALL</div>
        <div className="w-16 text-right text-[10px] font-lcd text-slate-400">{header}</div>
      </div>

      {/* La bola */}
      <div className="relative w-full max-w-sm flex-1 min-h-0 flex flex-col rounded-[2.5rem] overflow-hidden border-4 border-slate-950 shadow-2xl shadow-black/60">
        {/* Mitad superior roja con el LCD */}
        <div
          className="relative flex-1 min-h-0 flex flex-col p-4 pb-6"
          style={{ background: 'radial-gradient(120% 90% at 30% 10%, #f87171 0%, #dc2626 45%, #991b1b 100%)' }}
        >
          {/* Brillo de plástico */}
          <div className="absolute top-2 left-5 w-20 h-8 rounded-full bg-white/25 blur-md pointer-events-none" />
          {/* Pantalla LCD */}
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
        <div className="h-4 bg-slate-950 shrink-0 relative">
          <div className="absolute inset-y-0 left-6 right-6 bg-slate-900 rounded-sm" />
        </div>

        {/* Mitad inferior blanca con los controles */}
        <div
          className="shrink-0 px-6 pt-4 pb-5"
          style={{ background: 'radial-gradient(120% 140% at 50% 120%, #cbd5e1 0%, #f1f5f9 55%, #ffffff 100%)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <BallButton label="◄" onClick={press(onLeft)} disabled={disabled || !onLeft} />
            {/* Botón central: el «botón de la Poké Ball» */}
            <button
              onClick={press(onCenter)}
              disabled={disabled || !onCenter}
              className="relative w-20 h-20 rounded-full bg-white border-8 border-slate-950 shadow-lg active:scale-95 transition disabled:opacity-50 grid place-items-center"
              aria-label={controls.centerLabel ?? 'Aceptar'}
            >
              <span className="w-8 h-8 rounded-full border-4 border-slate-300 bg-slate-100" />
              {controls.centerLabel && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-lcd text-slate-500 whitespace-nowrap">
                  {controls.centerLabel}
                </span>
              )}
            </button>
            <BallButton label="►" onClick={press(onRight)} disabled={disabled || !onRight} />
          </div>
        </div>
      </div>
    </div>
  )
}

function BallButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-14 h-14 rounded-full bg-slate-200 border-4 border-slate-400 text-slate-700 font-lcd text-sm shadow active:scale-95 active:bg-slate-300 transition disabled:opacity-40"
    >
      {label}
    </button>
  )
}
