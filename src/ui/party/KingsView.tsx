// EL REY DE COPAS (Kings): baraja de 52 virtual. Cada valor tiene su regla
// clásica; el CUARTO rey se bebe el vaso del centro y ahí acaba la partida
// (como en la vida real — lo que quede de mazo ya da igual).
import { useState } from 'react'
import { KINGS_RULES } from '@/data/party/decks'
import { PartyHeader } from '@/ui/party/partyKit'
import { play } from '@/utils/sfx'

interface PlayingCard { value: string; suit: string; red: boolean }

const SUITS = [
  { s: '♠', red: false }, { s: '♥', red: true }, { s: '♦', red: true }, { s: '♣', red: false },
]

function buildDeck(): PlayingCard[] {
  const deck: PlayingCard[] = []
  for (const r of KINGS_RULES) for (const su of SUITS) deck.push({ value: r.value, suit: su.s, red: su.red })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export default function KingsView({ onBack }: { onBack: () => void }) {
  const [deck, setDeck] = useState<PlayingCard[] | null>(null)
  const [drawn, setDrawn] = useState(0)
  const [kings, setKings] = useState(0)
  const [over, setOver] = useState(false)

  const start = () => {
    play('confirm')
    setDeck(buildDeck())
    setDrawn(0)
    setKings(0)
    setOver(false)
  }

  const draw = () => {
    if (!deck || over || drawn >= deck.length) return
    const card = deck[drawn]
    const isKing = card.value === 'K'
    const k = kings + (isKing ? 1 : 0)
    play(isKing ? (k >= 4 ? 'defeat' : 'mega') : 'tap')
    setDrawn(drawn + 1)
    if (isKing) {
      setKings(k)
      if (k >= 4) setOver(true)
    }
  }

  if (!deck) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <PartyHeader title="El Rey de Copas" emoji="👑" onBack={onBack} />
        <div className="flex-1 p-5 flex flex-col gap-3 justify-center max-w-sm w-full mx-auto">
          <div className="text-center mb-1">
            <div className="text-5xl mb-2">👑</div>
            <p className="text-sm text-slate-300">
              Poned un <b>vaso vacío en el centro</b>. Por turnos, sacad carta y cumplid su regla.
              Cada rey echa parte de su bebida al vaso… y el <b>cuarto rey se lo bebe entero</b>.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-[12px] text-slate-300 grid grid-cols-2 gap-x-3 gap-y-1">
            {KINGS_RULES.map((r) => (
              <div key={r.value} className="flex gap-1.5 min-w-0">
                <span className="font-black text-amber-300 w-5 shrink-0">{r.value}</span>
                <span className="truncate">{r.title}</span>
              </div>
            ))}
          </div>
          <button onClick={start} className="w-full rounded-2xl bg-amber-500 text-slate-950 font-extrabold py-4 text-lg active:scale-[0.98] transition shadow-lg shadow-amber-500/30">
            Barajar y jugar
          </button>
        </div>
      </div>
    )
  }

  const finished = over || drawn >= deck.length
  const card = drawn > 0 ? deck[drawn - 1] : null
  const rule = card ? KINGS_RULES.find((r) => r.value === card.value) : null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PartyHeader
        title="El Rey de Copas"
        emoji="👑"
        onBack={onBack}
        right={<span className="text-[11px] font-bold text-slate-400">{deck.length - drawn} 🂠</span>}
      />
      <div className="flex-1 p-5 flex flex-col justify-center gap-4 max-w-sm w-full mx-auto">
        {/* Contador de reyes: la cuenta atrás del vaso del centro. */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`text-2xl transition ${i < kings ? '' : 'grayscale opacity-30'}`}>👑</span>
          ))}
          <span className="text-[11px] font-bold text-slate-400 ml-1">reyes {kings}/4</span>
        </div>

        {finished ? (
          <div className="text-center animate-pop-in">
            <div className="text-6xl mb-3">{over ? '🍻' : '🃏'}</div>
            <div className="font-extrabold text-2xl mb-1">{over ? '¡Cuarto rey!' : 'Fin del mazo'}</div>
            <p className="text-sm text-slate-300 mb-5">
              {over ? 'Quien lo sacó se bebe el vaso del centro ENTERO. La partida acaba aquí.' : 'Se acabaron las cartas y solo salieron ' + kings + ' reyes. El vaso del centro se lo reparte el grupo.'}
            </p>
            <button onClick={start} className="w-full rounded-2xl bg-amber-500 text-slate-950 font-extrabold py-4 text-lg active:scale-[0.98] transition">Otra partida</button>
            <button onClick={() => { play('back'); onBack() }} className="mt-2 text-sm text-slate-500">Volver a los juegos</button>
          </div>
        ) : card && rule ? (
          <div key={drawn} className="animate-pop-in">
            {/* La carta, en plan naipe de verdad. */}
            <div className="mx-auto w-56 rounded-2xl bg-slate-50 text-slate-900 p-4 shadow-2xl relative">
              <div className={`absolute top-2 left-3 text-left leading-none font-black ${card.red ? 'text-red-600' : 'text-slate-900'}`}>
                <div className="text-xl">{card.value}</div>
                <div className="text-lg">{card.suit}</div>
              </div>
              <div className={`absolute bottom-2 right-3 rotate-180 text-left leading-none font-black ${card.red ? 'text-red-600' : 'text-slate-900'}`}>
                <div className="text-xl">{card.value}</div>
                <div className="text-lg">{card.suit}</div>
              </div>
              <div className={`text-center text-6xl py-8 ${card.red ? 'text-red-600' : 'text-slate-900'}`}>{card.suit}</div>
            </div>
            <div className="mt-4 rounded-2xl border border-amber-500/40 bg-slate-800/80 px-4 py-3 text-center">
              <div className="font-extrabold text-amber-300">{rule.title}</div>
              <p className="text-sm text-slate-200 mt-1">{rule.rule}</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 text-sm py-16">Toca «Sacar carta» para empezar. 🂠</div>
        )}

        {!finished && (
          <button onClick={draw} className="w-full rounded-2xl bg-amber-500 text-slate-950 font-extrabold py-4 text-lg active:scale-[0.98] transition shadow-lg shadow-amber-500/30">
            Sacar carta
          </button>
        )}
      </div>
    </div>
  )
}
