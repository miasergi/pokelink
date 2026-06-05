import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { GENERATIONS, getGeneration } from '@/data/generations'

export default function ModeSelectScreen() {
  const { navigate, back, screen } = useGame()
  const gen = (screen.params?.gen as number) ?? 1
  const region = getGeneration(gen).region

  const [pools, setPools] = useState<Set<number>>(() => new Set([gen]))
  const [random, setRandom] = useState(false)

  const toggle = (g: number) => {
    setPools((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      if (next.size === 0) next.add(gen) // siempre al menos una
      return next
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title={`Modo · ${region}`} left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
        <div>
          <p className="text-slate-300 text-sm font-bold">¿De qué regiones pueden aparecer Pokémon?</p>
          <p className="text-slate-500 text-xs mt-0.5">Marca todas las que quieras. Los jefes y la estructura serán de <b style={{ color: getGeneration(gen).accent }}>{region}</b>.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {GENERATIONS.map((g) => {
            const on = pools.has(g.gen)
            const isHome = g.gen === gen
            return (
              <button
                key={g.gen}
                onClick={() => toggle(g.gen)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border text-left transition active:scale-[0.98] ${on ? 'border-transparent' : 'border-slate-700/60'}`}
                style={{ background: on ? `${g.accent}26` : 'rgba(15,23,42,0.5)', borderColor: on ? `${g.accent}` : undefined }}
              >
                <span className={`w-5 h-5 rounded-md grid place-items-center text-xs font-black shrink-0 ${on ? 'text-slate-900' : 'text-slate-500'}`} style={{ background: on ? g.accent : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 2px #475569' }}>
                  {on ? '✓' : ''}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate" style={{ color: on ? g.accent : '#cbd5e1' }}>{g.region}</div>
                  {isHome && <div className="text-[9px] text-amber-300 font-bold">★ región elegida</div>}
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setRandom((r) => !r)}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 border text-left transition active:scale-[0.98] ${random ? 'border-fuchsia-400' : 'border-slate-700/60'}`}
          style={{ background: random ? 'rgba(168,85,247,0.18)' : 'rgba(15,23,42,0.5)' }}
        >
          <div className="text-3xl">🎲</div>
          <div className="flex-1">
            <div className="font-extrabold text-fuchsia-300">Modo Random {random ? '· activado' : ''}</div>
            <div className="text-xs text-slate-400">Randomiza por completo salvajes, entrenadores y jefes (de las regiones marcadas). Los niveles se mantienen.</div>
          </div>
          <span className={`w-11 h-6 rounded-full relative transition ${random ? 'bg-fuchsia-500' : 'bg-slate-600'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${random ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
      </div>

      <div className="p-4 safe-bottom">
        <Button full variant="primary" onClick={() => navigate('starterSelect', { gen, pools: [...pools].sort((a, b) => a - b), random })}>
          Continuar ›
        </Button>
      </div>
    </div>
  )
}
