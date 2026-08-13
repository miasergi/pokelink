// CELEBRACIÓN DE GOL, compartida por el partido y la pachanga: el escudo del
// equipo que marca, el balón, el rótulo y el goleador. Mientras está en
// pantalla el juego NO avanza (el partido lo garantiza la cola de revelado;
// la pachanga esconde el panel de decisión hasta que termina).
import { useEffect } from 'react'
import { Pic } from '@/ui/inazuma/Glyphs'

export const GOAL_OVERLAY_MS = 2400

export default function GoalOverlay({ scorer, mine, teamId, onDone }: {
  scorer: string
  mine: boolean
  teamId?: string
  onDone: () => void
}) {
  // El timer corre UNA vez por montaje (la celebración se remonta por `key`).
  // Con `onDone` en las deps, cada re-render del padre lo reiniciaba y la
  // celebración podía alargarse o cortarse a destiempo.
  useEffect(() => {
    const t = setTimeout(onDone, GOAL_OVERLAY_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const color = mine ? '#22c55e' : '#f43f5e'
  return (
    <div className="absolute inset-0 z-[65] grid place-items-center pointer-events-none">
      <div className="absolute inset-0 animate-inazuma-flash" style={{ background: color }} />
      <div className="relative flex flex-col items-center gap-1">
        {/* EL BALÓN PERFORA LA RED: la portería de frente, el balón que se te
            viene encima y la red hinchándose con el impacto. */}
        <div className="relative w-48 h-32">
          <svg viewBox="0 0 192 128" className="absolute inset-0 w-full h-full">
            {/* palos */}
            <path d="M6 122V8h180v114" fill="none" stroke="#e2e8f0" strokeWidth="7" strokeLinecap="round" />
            {/* la RED, que se hincha al recibir el balón */}
            <g stroke="rgba(255,255,255,.55)" strokeWidth="1.4" fill="none" className="animate-net-bulge" style={{ transformOrigin: '50% 60%' }}>
              {Array.from({ length: 11 }, (_, i) => (
                <path key={`v${i}`} d={`M${14 + i * 16.5} 12 Q ${14 + i * 16.5} 70 ${18 + i * 15.8} 120`} />
              ))}
              {Array.from({ length: 7 }, (_, i) => (
                <path key={`h${i}`} d={`M10 ${14 + i * 16} Q 96 ${20 + i * 17.5} 182 ${14 + i * 16}`} />
              ))}
            </g>
          </svg>
          {/* el balón entra creciendo hacia la escuadra */}
          <Pic name="ball" className="absolute left-1/2 top-1/2 w-12 h-12 -ml-6 -mt-6 animate-ball-pierce drop-shadow-lg" />
          {/* el escudo del que marca, asomado a la esquina */}
          {teamId && (
            <img
              src={`${import.meta.env.BASE_URL}inazuma/teams/${teamId}.png`}
              alt=""
              className="absolute -top-3 -right-4 w-14 h-14 object-contain drop-shadow-[0_0_16px_rgba(0,0,0,0.6)] animate-pop-in"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>
        <div
          className="px-4 py-1 rounded-full text-2xl font-black uppercase tracking-widest bg-slate-950/85 border-2 animate-goal"
          style={{ color, borderColor: color }}
        >
          {mine ? '¡GOOOL!' : 'Gol rival'}
        </div>
        <div className="text-[12px] font-bold text-white/85 bg-slate-950/70 rounded-full px-2 py-0.5">{scorer}</div>
      </div>
    </div>
  )
}
