// RULETA DE RETOS (estilo Picolo): rondas de ~30 cartas con los nombres del
// grupo metidos en el texto, y VIRUS que se abren y se cierran solos dentro
// de la misma ronda (buildPicoloRound coloca cada cierre 4-8 cartas después).
import { useState } from 'react'
import { buildPicoloRound, type PicoloRoundCard } from '@/data/party/decks'
import { PartyHeader, SpicyToggle, loadSpicy } from '@/ui/party/partyKit'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'

const KIND_STYLE: Record<PicoloRoundCard['kind'], { label: string; color: string; bg: string }> = {
  reto: { label: 'Reto', color: '#fb7185', bg: 'linear-gradient(160deg, #4c0519, #1e293b 70%)' },
  pregunta: { label: 'Pregunta', color: '#38bdf8', bg: 'linear-gradient(160deg, #082f49, #1e293b 70%)' },
  juego: { label: 'Minijuego', color: '#4ade80', bg: 'linear-gradient(160deg, #052e16, #1e293b 70%)' },
  todos: { label: 'Para todos', color: '#fbbf24', bg: 'linear-gradient(160deg, #451a03, #1e293b 70%)' },
  virus: { label: 'Virus 🦠', color: '#e879f9', bg: 'linear-gradient(160deg, #4a044e, #1e293b 70%)' },
  virusEnd: { label: 'Fin del virus 💊', color: '#c084fc', bg: 'linear-gradient(160deg, #2e1065, #1e293b 70%)' },
}

export default function PicoloView({ players, onBack }: { players: string[]; onBack: () => void }) {
  const [spicy, setSpicy] = useState(loadSpicy)
  const [round, setRound] = useState<PicoloRoundCard[] | null>(null)
  const [idx, setIdx] = useState(0)

  const start = () => {
    play('confirm')
    setRound(buildPicoloRound(players, spicy))
    setIdx(0)
  }

  // --- Portada de la ronda ---
  if (!round) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <PartyHeader title="Ruleta de retos" emoji="🎡" onBack={onBack} />
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col gap-3 justify-center max-w-sm w-full mx-auto">
          <div className="text-center mb-1">
            <div className="text-5xl mb-2">🎡</div>
            <p className="text-sm text-slate-300">
              Una ronda de <b>~30 cartas</b> con retos, preguntas, minijuegos y virus,
              con vuestros nombres dentro. Leed en alto y pasad el móvil.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm">
            <div className="font-bold text-slate-200 mb-1 inline-flex items-center gap-1.5"><Icon name="people" className="w-4 h-4 text-violet-300" /> Jugadores</div>
            <div className="text-slate-300">{players.length >= 2 ? players.join(', ') : 'Necesitáis apuntar al menos a 2 en «La cuadrilla».'}</div>
          </div>
          <SpicyToggle value={spicy} onChange={setSpicy} />
          <button
            onClick={start}
            disabled={players.length < 2}
            className="w-full rounded-2xl bg-violet-500 disabled:opacity-40 text-white font-extrabold py-4 text-lg active:scale-[0.98] transition shadow-lg shadow-violet-500/30"
          >
            ¡Empezar ronda!
          </button>
        </div>
      </div>
    )
  }

  // --- Fin de ronda ---
  if (idx >= round.length) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <PartyHeader title="Ruleta de retos" emoji="🎡" onBack={onBack} />
        <div className="flex-1 grid place-items-center p-5">
          <div className="text-center max-w-sm w-full">
            <div className="text-6xl mb-3">🎉</div>
            <div className="font-extrabold text-2xl mb-1">¡Ronda completada!</div>
            <p className="text-sm text-slate-400 mb-5">Habéis sobrevivido a {round.length} cartas. ¿Otra?</p>
            <button onClick={start} className="w-full rounded-2xl bg-violet-500 text-white font-extrabold py-4 text-lg active:scale-[0.98] transition">
              ¡Otra ronda!
            </button>
            <button onClick={() => { play('back'); onBack() }} className="mt-2 text-sm text-slate-500">Volver a los juegos</button>
          </div>
        </div>
      </div>
    )
  }

  // --- Carta actual ---
  const card = round[idx]
  const st = KIND_STYLE[card.kind]
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PartyHeader
        title="Ruleta de retos"
        emoji="🎡"
        onBack={onBack}
        right={<span className="text-[11px] font-bold text-slate-400">{idx + 1}/{round.length}</span>}
      />
      <div className="flex-1 p-5 flex flex-col justify-center max-w-sm w-full mx-auto">
        {/* Un toque en la carta = siguiente. key=idx para la animación de entrada. */}
        <div
          key={idx}
          role="button"
          tabIndex={0}
          onClick={() => { play('tap'); setIdx(idx + 1) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { play('tap'); setIdx(idx + 1) } }}
          className="rounded-3xl border p-6 min-h-[16rem] flex flex-col justify-between cursor-pointer select-none animate-pop-in active:scale-[0.99] transition"
          style={{ background: st.bg, borderColor: `${st.color}66`, boxShadow: `0 18px 40px -18px ${st.color}88` }}
        >
          <span className="self-start rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider" style={{ background: `${st.color}22`, color: st.color, border: `1px solid ${st.color}55` }}>
            {st.label}
          </span>
          <p className="text-xl font-bold leading-snug text-slate-50">{card.text}</p>
          <span className="self-end text-[11px] text-slate-500 font-bold">toca para seguir ›</span>
        </div>
        {/* Progreso */}
        <div className="mt-4 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${((idx + 1) / round.length) * 100}%`, background: st.color }} />
        </div>
      </div>
    </div>
  )
}
