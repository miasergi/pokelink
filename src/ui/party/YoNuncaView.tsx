// YO NUNCA: cartas de «Yo nunca…»; quien lo haya hecho, bebe. Mazo barajado
// completo; el pack picante entra solo si está activado.
import { useState } from 'react'
import { YO_NUNCA } from '@/data/party/decks'
import { PartyHeader, SpicyToggle, loadSpicy } from '@/ui/party/partyKit'
import { play } from '@/utils/sfx'

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function YoNuncaView({ onBack }: { onBack: () => void }) {
  const [spicy, setSpicy] = useState(loadSpicy)
  const [deck, setDeck] = useState<Array<{ text: string; spicy?: boolean }> | null>(null)
  const [idx, setIdx] = useState(0)

  const start = () => {
    play('confirm')
    setDeck(shuffled(YO_NUNCA.filter((c) => spicy || !c.spicy)))
    setIdx(0)
  }

  if (!deck) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <PartyHeader title="Yo Nunca" emoji="🙊" onBack={onBack} />
        <div className="flex-1 p-5 flex flex-col gap-3 justify-center max-w-sm w-full mx-auto">
          <div className="text-center mb-1">
            <div className="text-5xl mb-2">🙊</div>
            <p className="text-sm text-slate-300">
              Se lee la carta en alto y <b>quien lo haya hecho, bebe</b>.
              Si nadie bebe… bebe quien la leyó, por aburrido.
            </p>
          </div>
          <SpicyToggle value={spicy} onChange={setSpicy} />
          <button onClick={start} className="w-full rounded-2xl bg-sky-500 text-white font-extrabold py-4 text-lg active:scale-[0.98] transition shadow-lg shadow-sky-500/30">
            ¡A confesar!
          </button>
        </div>
      </div>
    )
  }

  if (idx >= deck.length) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <PartyHeader title="Yo Nunca" emoji="🙊" onBack={onBack} />
        <div className="flex-1 grid place-items-center p-5">
          <div className="text-center max-w-sm w-full">
            <div className="text-6xl mb-3">😱</div>
            <div className="font-extrabold text-2xl mb-1">Se acabaron los secretos</div>
            <p className="text-sm text-slate-400 mb-5">{deck.length} confesiones después, ya os conocéis demasiado.</p>
            <button onClick={start} className="w-full rounded-2xl bg-sky-500 text-white font-extrabold py-4 text-lg active:scale-[0.98] transition">Barajar de nuevo</button>
            <button onClick={() => { play('back'); onBack() }} className="mt-2 text-sm text-slate-500">Volver a los juegos</button>
          </div>
        </div>
      </div>
    )
  }

  const card = deck[idx]
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PartyHeader title="Yo Nunca" emoji="🙊" onBack={onBack} right={<span className="text-[11px] font-bold text-slate-400">{idx + 1}/{deck.length}</span>} />
      <div className="flex-1 p-5 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div
          key={idx}
          role="button"
          tabIndex={0}
          onClick={() => { play('tap'); setIdx(idx + 1) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { play('tap'); setIdx(idx + 1) } }}
          className={`rounded-3xl border p-6 min-h-[15rem] flex flex-col justify-between cursor-pointer select-none animate-pop-in active:scale-[0.99] transition ${card.spicy ? 'border-rose-500/60' : 'border-sky-500/40'}`}
          style={{ background: card.spicy ? 'linear-gradient(160deg, #4c0519, #1e293b 70%)' : 'linear-gradient(160deg, #082f49, #1e293b 70%)' }}
        >
          <span className={`self-start rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider border ${card.spicy ? 'bg-rose-500/15 text-rose-300 border-rose-500/50' : 'bg-sky-500/15 text-sky-300 border-sky-500/40'}`}>
            {card.spicy ? 'Picante 🌶️' : 'Yo nunca…'}
          </span>
          <p className="text-2xl font-extrabold leading-snug text-slate-50">{card.text}</p>
          <span className="self-end text-[11px] text-slate-500 font-bold">quien lo haya hecho, bebe · toca para seguir ›</span>
        </div>
        <div className="mt-4 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${((idx + 1) / deck.length) * 100}%` }} />
        </div>
      </div>
    </div>
  )
}
