// Piezas compartidas de LA PREVIA: cabecera de juego, toggle del pack
// picante y la lista de jugadores persistida en localStorage (los nombres
// sobreviven entre sesiones: la cuadrilla suele ser la misma).
import { useState } from 'react'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'

const PLAYERS_KEY = 'pokerogue:party-players'
const SPICY_KEY = 'pokerogue:party-spicy'

export function loadPlayers(): string[] {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string').slice(0, 8) : []
  } catch {
    return []
  }
}

export function savePlayers(players: string[]) {
  try { localStorage.setItem(PLAYERS_KEY, JSON.stringify(players.slice(0, 8))) } catch { /* ignore */ }
}

export function loadSpicy(): boolean {
  try { return localStorage.getItem(SPICY_KEY) === '1' } catch { return false }
}

export function saveSpicy(v: boolean) {
  try { localStorage.setItem(SPICY_KEY, v ? '1' : '0') } catch { /* ignore */ }
}

/** Cabecera de un juego: volver al hub + título. */
export function PartyHeader({ title, emoji, onBack, right }: {
  title: string
  emoji: string
  onBack: () => void
  right?: React.ReactNode
}) {
  return (
    <div className="safe-top sticky top-0 z-20 bg-slate-900/85 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center justify-between px-3 h-12 gap-2">
        <button
          onClick={() => { play('back'); onBack() }}
          className="shrink-0 w-9 h-9 grid place-items-center rounded-full border border-slate-700 bg-slate-800/80 text-slate-300 active:scale-95 transition"
          aria-label="Volver"
        >
          <Icon name="arrowRight" className="w-4 h-4 rotate-180" />
        </button>
        <div className="flex-1 text-center font-extrabold tracking-wide truncate">{emoji} {title}</div>
        <div className="shrink-0 w-9 flex justify-end">{right}</div>
      </div>
    </div>
  )
}

/** Interruptor del pack picante 🌶️ (compartido por Ruleta y Yo Nunca). */
export function SpicyToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => { play('tap'); onChange(!value); saveSpicy(!value) }}
      className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 transition active:scale-[0.98] ${value ? 'border-rose-500/60 bg-rose-500/15' : 'border-slate-700 bg-slate-800/70'}`}
    >
      <div className="text-left">
        <div className={`text-sm font-extrabold ${value ? 'text-rose-300' : 'text-slate-200'}`}>Pack picante 🌶️</div>
        <div className="text-[11px] text-slate-400">Preguntas y retos subidos de tono. Solo mayores.</div>
      </div>
      <div className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition ${value ? 'bg-rose-500' : 'bg-slate-600'}`}>
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
      </div>
    </button>
  )
}

/** Editor de la cuadrilla (nombres). Modal a pantalla completa dentro de la sección. */
export function PlayersEditor({ players, onChange, onClose }: {
  players: string[]
  onChange: (p: string[]) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const add = () => {
    const n = name.trim()
    if (!n || players.length >= 8) return
    if (players.some((p) => p.toLowerCase() === n.toLowerCase())) { play('error'); return }
    play('confirm')
    const next = [...players, n]
    onChange(next)
    savePlayers(next)
    setName('')
  }
  const remove = (i: number) => {
    play('tap')
    const next = players.filter((_, j) => j !== i)
    onChange(next)
    savePlayers(next)
  }
  return (
    <div className="absolute inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-violet-500/50 bg-slate-900 p-4 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-3">
          <Icon name="people" className="w-8 h-8 mx-auto text-violet-300" />
          <div className="font-extrabold text-lg">La cuadrilla</div>
          <p className="text-[11px] text-slate-400">De 2 a 8 nombres. Se guardan para la próxima previa.</p>
        </div>
        <div className="flex gap-2 mb-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }}
            placeholder="Nombre…"
            maxLength={14}
            className="flex-1 min-w-0 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
          />
          <button
            onClick={add}
            disabled={!name.trim() || players.length >= 8}
            className="shrink-0 rounded-xl bg-violet-500 disabled:opacity-40 text-white font-bold px-4 active:scale-95 transition"
          >
            <Icon name="plus" className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
          {players.length === 0 && <span className="text-[12px] text-slate-500">Aún no hay nadie apuntado…</span>}
          {players.map((p, i) => (
            <button key={i} onClick={() => remove(i)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-200 active:scale-95 transition">
              {p} <Icon name="x" className="w-3 h-3 text-slate-500" />
            </button>
          ))}
        </div>
        <button onClick={() => { play('confirm'); onClose() }} className="w-full rounded-xl bg-violet-500 text-white font-bold py-3 active:scale-[0.98] transition">
          ¡Listos!
        </button>
      </div>
    </div>
  )
}
