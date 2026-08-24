// LA BOTELLA: el clásico. La botella gira con CSS (transition larga con
// ease-out) y, si hay cuadrilla apuntada, los nombres se sientan en corro
// alrededor y el juego dice a quién apunta el cuello al parar.
import { useRef, useState } from 'react'
import { PartyHeader } from '@/ui/party/partyKit'
import { OCA_COLORS } from '@/engine/party/oca'
import { play } from '@/utils/sfx'

export default function BotellaView({ players, onBack }: { players: string[]; onBack: () => void }) {
  const [rot, setRot] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [chosen, setChosen] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const n = players.length
  const spin = () => {
    if (spinning) return
    play('confirm')
    setChosen(null)
    setSpinning(true)
    // 3-5 vueltas completas + un ángulo al azar, SIEMPRE hacia delante para
    // que la transición nunca retroceda.
    const extra = 1080 + Math.random() * 720 + Math.random() * 360
    const next = rot + extra
    setRot(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setSpinning(false)
      if (n >= 2) {
        // El cuello apunta al ángulo (next % 360), con el jugador 0 arriba
        // y el corro en sentido horario.
        const a = ((next % 360) + 360) % 360
        const step = 360 / n
        setChosen(Math.round(a / step) % n)
        play('levelup')
      } else {
        play('tap')
      }
    }, 3200)
  }

  const R = 42 // radio del corro, en % del contenedor
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PartyHeader title="La Botella" emoji="🍾" onBack={onBack} />
      <div className="flex-1 p-5 flex flex-col justify-center items-center gap-4 max-w-sm w-full mx-auto">
        <p className="text-sm text-slate-400 text-center">
          {n >= 2 ? 'Toca la botella. A quien apunte, le toca: verdad, reto o trago (lo decide el grupo).' : 'Sentaos en corro y toca la botella. A quien apunte el cuello, le toca.'}
        </p>

        <div className="relative w-full aspect-square max-w-[20rem]">
          {/* Corro de nombres (si hay cuadrilla) */}
          {n >= 2 && players.map((p, i) => {
            const ang = (i * 360) / n // 0 = arriba, sentido horario
            const rad = (ang * Math.PI) / 180
            const x = 50 + R * Math.sin(rad)
            const y = 50 - R * Math.cos(rad)
            const active = chosen === i
            return (
              <div
                key={i}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all ${active ? 'scale-125 text-slate-950 z-10' : 'text-slate-200'}`}
                style={{
                  left: `${x}%`, top: `${y}%`,
                  background: active ? OCA_COLORS[i % OCA_COLORS.length] : 'rgba(15,23,42,.85)',
                  borderColor: `${OCA_COLORS[i % OCA_COLORS.length]}${active ? '' : '88'}`,
                  boxShadow: active ? `0 0 18px ${OCA_COLORS[i % OCA_COLORS.length]}` : undefined,
                }}
              >
                {p}
              </div>
            )
          })}

          {/* La botella: gira sobre su centro; el CUELLO marca la dirección. */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Girar la botella"
            onClick={spin}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') spin() }}
            className="absolute inset-0 grid place-items-center cursor-pointer select-none"
          >
            <div
              className="text-7xl will-change-transform"
              style={{
                transform: `rotate(${rot}deg)`,
                transition: spinning ? 'transform 3.2s cubic-bezier(0.12, 0.8, 0.15, 1)' : undefined,
              }}
            >
              {/* El emoji 🍾 apunta con el corcho arriba-derecha (~45°); lo
                  compensamos para que el "cuello" real sea el ángulo 0. */}
              <span className="inline-block" style={{ transform: 'rotate(-45deg)' }}>🍾</span>
            </div>
          </div>
        </div>

        <div className="h-12 grid place-items-center">
          {spinning && <span className="text-sm font-bold text-slate-400 animate-pulse">Girando…</span>}
          {!spinning && chosen != null && (
            <span className="text-lg font-extrabold animate-pop-in" style={{ color: OCA_COLORS[chosen % OCA_COLORS.length] }}>
              ¡Le toca a {players[chosen]}!
            </span>
          )}
        </div>

        <button
          onClick={spin}
          disabled={spinning}
          className="w-full rounded-2xl bg-emerald-500 disabled:opacity-40 text-white font-extrabold py-4 text-lg active:scale-[0.98] transition shadow-lg shadow-emerald-500/30"
        >
          {spinning ? 'Girando…' : 'Girar la botella'}
        </button>
      </div>
    </div>
  )
}
