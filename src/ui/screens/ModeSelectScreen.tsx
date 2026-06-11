import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { GENERATIONS, getGeneration } from '@/data/generations'
import { TYPE_ES, TYPE_HEX } from '@/ui/theme/types'
import TypeIcon from '@/ui/components/TypeIcon'
import Icon from '@/ui/components/Icon'
import type { PokemonType } from '@/types'
import type { RandomFlags } from '@/engine/run/types'

const RANDOM_CATS: { key: keyof RandomFlags; label: string; desc: string }[] = [
  { key: 'starters', label: 'Iniciales y capturables', desc: 'Tu inicial y los Pokémon que capturas' },
  { key: 'wild', label: 'Salvajes', desc: 'Los Pokémon de los combates salvajes' },
  { key: 'trainers', label: 'Entrenadores y jefes', desc: 'Entrenadores, gimnasios, rival y campeón' },
  { key: 'elite', label: 'Alto Mando', desc: 'Los miembros del Alto Mando' },
]

const TYPES = Object.keys(TYPE_ES) as PokemonType[]

export default function ModeSelectScreen() {
  const { navigate, back, screen, storyCompleted } = useGame()
  const gen = (screen.params?.gen as number) ?? 1
  const region = getGeneration(gen).region

  const [pools, setPools] = useState<Set<number>>(() => new Set([gen]))
  const [rand, setRand] = useState<RandomFlags>({ starters: false, wild: false, trainers: false, elite: false })
  const [monoOn, setMonoOn] = useState(false)
  const [mono, setMono] = useState<PokemonType | null>(null)
  // Gen Sonoro: se desbloquea al COMPLETAR el Modo Historia (capítulo final).
  const sonoroUnlocked = storyCompleted.includes(6)
  const [sonoroOn, setSonoroOn] = useState(false)

  const anyRandom = rand.starters || rand.wild || rand.trainers || rand.elite
  const monotype = monoOn ? mono ?? undefined : undefined
  const blocked = monoOn && !mono // monolocke activado pero sin tipo elegido

  const toggle = (g: number) => {
    setPools((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      if (next.size === 0) next.add(gen) // siempre al menos una
      return next
    })
  }
  const toggleCat = (key: keyof RandomFlags) => setRand((r) => ({ ...r, [key]: !r[key] }))
  const toggleAllRandom = () => {
    const v = !anyRandom
    setRand({ starters: v, wild: v, trainers: v, elite: v })
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

        {/* --- Modo Random (por categorías) --- */}
        <div className={`rounded-2xl px-4 py-3 border transition ${anyRandom ? 'border-fuchsia-400' : 'border-slate-700/60'}`} style={{ background: anyRandom ? 'rgba(168,85,247,0.14)' : 'rgba(15,23,42,0.5)' }}>
          <button onClick={toggleAllRandom} className="flex items-center gap-3 w-full text-left active:scale-[0.99] transition">
            <Icon name="dadoballs" className="w-12 h-8 shrink-0" />
            <div className="flex-1">
              <div className="font-extrabold text-fuchsia-300">Modo Random {anyRandom ? '· activado' : ''}</div>
              <div className="text-xs text-slate-400">Elige qué randomizar (de las regiones marcadas). Los niveles se mantienen.</div>
            </div>
            <span className={`w-11 h-6 rounded-full relative transition shrink-0 ${anyRandom ? 'bg-fuchsia-500' : 'bg-slate-600'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${anyRandom ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>

          <div className="mt-2 grid gap-1.5">
            {RANDOM_CATS.map((c) => {
              const on = rand[c.key]
              return (
                <button
                  key={c.key}
                  onClick={() => toggleCat(c.key)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border text-left transition active:scale-[0.98] ${on ? 'border-fuchsia-400/60 bg-fuchsia-500/10' : 'border-slate-700/50 bg-slate-900/30'}`}
                >
                  <span className={`w-5 h-5 rounded-md grid place-items-center text-xs font-black shrink-0 ${on ? 'bg-fuchsia-400 text-slate-900' : 'text-slate-500'}`} style={{ boxShadow: on ? 'none' : 'inset 0 0 0 2px #475569' }}>
                    {on ? '✓' : ''}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm" style={{ color: on ? '#f0abfc' : '#cbd5e1' }}>{c.label}</div>
                    <div className="text-[10px] text-slate-500 leading-tight">{c.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* --- Monolocke (tipo único) --- */}
        <div className={`rounded-2xl px-4 py-3 border transition ${monoOn ? 'border-emerald-400' : 'border-slate-700/60'}`} style={{ background: monoOn ? 'rgba(16,185,129,0.12)' : 'rgba(15,23,42,0.5)' }}>
          <button onClick={() => setMonoOn((v) => !v)} className="flex items-center gap-3 w-full text-left active:scale-[0.99] transition">
            <div className="text-3xl">🔒</div>
            <div className="flex-1">
              <div className="font-extrabold text-emerald-300 inline-flex items-center gap-1">
                Monolocke
                {monoOn && (mono
                  ? <span className="inline-flex items-center gap-1">· <TypeIcon type={mono} />{TYPE_ES[mono]}</span>
                  : <span>· elige tipo</span>)}
              </div>
              <div className="text-xs text-slate-400">Solo podrás llevar Pokémon de UN tipo: inicial, capturas, intercambios y eventos.</div>
            </div>
            <span className={`w-11 h-6 rounded-full relative transition shrink-0 ${monoOn ? 'bg-emerald-500' : 'bg-slate-600'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${monoOn ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>

          {monoOn && (
            <div className="mt-2.5">
              <p className="text-[11px] text-slate-400 mb-1.5">¿De qué tipo quieres tu Monolocke?</p>
              <div className="grid grid-cols-3 gap-1.5">
                {TYPES.map((t) => {
                  const sel = mono === t
                  return (
                    <button
                      key={t}
                      onClick={() => setMono(t)}
                      className={`rounded-lg py-1.5 text-xs font-bold text-white transition active:scale-[0.96] inline-flex items-center justify-center gap-1 ${sel ? 'ring-2 ring-white' : 'opacity-75'}`}
                      style={{ backgroundColor: TYPE_HEX[t] }}
                    >
                      <TypeIcon type={t} />{TYPE_ES[t]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* --- Gen Sonoro (recompensa por completar el Modo Historia) --- */}
        {sonoroUnlocked && (
          <div className={`rounded-2xl px-4 py-3 border transition ${sonoroOn ? 'border-fuchsia-400' : 'border-slate-700/60'}`}
            style={{ background: sonoroOn ? 'rgba(124,58,237,0.14)' : 'rgba(15,23,42,0.5)' }}>
            <button onClick={() => setSonoroOn((v) => !v)} className="flex items-center gap-3 w-full text-left active:scale-[0.99] transition">
              <div className="text-3xl">🔊</div>
              <div className="flex-1">
                <div className="font-extrabold" style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed, #db2777, #06b6d4)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                  Gen Sonoro {sonoroOn ? '· activado' : ''}
                </div>
                <div className="text-xs text-slate-400">Recompensa de Mistery Island: los Pokémon del dossier (Exploud, Noivern, Toxtricity… y sus líneas) aparecen con su tipo SONORO también en esta run.</div>
              </div>
              <span className={`w-11 h-6 rounded-full relative transition shrink-0 ${sonoroOn ? 'bg-fuchsia-500' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${sonoroOn ? 'left-[22px]' : 'left-0.5'}`} />
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="p-4 safe-bottom">
        <Button
          full
          variant="primary"
          disabled={blocked}
          onClick={() => navigate('starterSelect', { gen, pools: [...pools].sort((a, b) => a - b), random: anyRandom, randomFlags: rand, monotype, sonoro: sonoroOn || undefined })}
        >
          {blocked ? 'Elige un tipo para el Monolocke' : 'Continuar ›'}
        </Button>
      </div>
    </div>
  )
}
