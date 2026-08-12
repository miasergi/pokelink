// CELEBRACIÓN DE GOL, compartida por el partido y la pachanga: el escudo del
// equipo que marca, el balón, el rótulo y el goleador. Mientras está en
// pantalla el juego NO avanza (el partido lo garantiza la cola de revelado;
// la pachanga esconde el panel de decisión hasta que termina).
import { useEffect } from 'react'
import { Pic } from '@/ui/inazuma/Glyphs'

export const GOAL_OVERLAY_MS = 1900

export default function GoalOverlay({ scorer, mine, teamId, onDone }: {
  scorer: string
  mine: boolean
  teamId?: string
  onDone: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDone, GOAL_OVERLAY_MS)
    return () => clearTimeout(t)
  }, [onDone])
  const color = mine ? '#22c55e' : '#f43f5e'
  return (
    <div className="absolute inset-0 z-[65] grid place-items-center pointer-events-none">
      <div className="absolute inset-0 animate-inazuma-flash" style={{ background: color }} />
      <div className="relative flex flex-col items-center gap-1 animate-goal">
        {/* El ESCUDO del equipo que marca, con el balón asomando. */}
        {teamId ? (
          <div className="relative">
            <img
              src={`${import.meta.env.BASE_URL}inazuma/teams/${teamId}.png`}
              alt=""
              className="w-24 h-24 object-contain drop-shadow-[0_0_16px_rgba(0,0,0,0.6)]"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <Pic name="ball" className="absolute -bottom-2 -right-3 w-10 h-10 drop-shadow-lg" />
          </div>
        ) : (
          <Pic name="ball" className="w-16 h-16 drop-shadow-lg" />
        )}
        <div
          className="px-4 py-1 rounded-full text-2xl font-black uppercase tracking-widest bg-slate-950/85 border-2"
          style={{ color, borderColor: color }}
        >
          {mine ? '¡GOOOL!' : 'Gol rival'}
        </div>
        <div className="text-[12px] font-bold text-white/85 bg-slate-950/70 rounded-full px-2 py-0.5">{scorer}</div>
      </div>
    </div>
  )
}
