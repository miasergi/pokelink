import { useMemo, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { STARTERS_BY_GEN } from '@/data/starters'
import { getSpecies, threeStageStarterPool } from '@/data'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import { typeGradient } from '@/ui/theme/types'
import type { Difficulty } from '@/engine/run/types'

const DIFFS: { id: Difficulty; label: string; desc: string }[] = [
  { id: 'normal', label: 'Normal', desc: 'Equilibrado. Los Pokémon suben de nivel por casilla (+1 salvaje, +2 entrenador/gimnasio, +3 Liga). Perder un combate = fin de la partida.' },
  { id: 'hard', label: 'Difícil', desc: 'Pokémon rivales (salvajes, entrenadores y jefes) a ×1.4 de nivel. En la tienda solo puedes comprar 1 objeto por visita.' },
  { id: 'nuzlocke', label: 'Nuzlocke', desc: 'Lo más difícil: enemigos a ×1.4; si un Pokémon se debilita lo PIERDES para siempre; no puedes subir de nivel más allá del próximo jefe; no puedes comprar pociones; 1 compra por tienda; al capturar solo se ofrece 1 Pokémon.' },
]

export default function StarterSelectScreen() {
  const { back, screen, startRun } = useGame()
  const gen = (screen.params?.gen as number) ?? 1
  const pools = (screen.params?.pools as number[] | undefined) ?? [gen]
  const random = (screen.params?.random as boolean | undefined) ?? false
  const daily = screen.params?.daily as string | undefined
  const dailySeed = screen.params?.seed as number | undefined
  // En Modo Random, 3 iniciales aleatorios con cadena de 3 etapas.
  const starters = useMemo(() => {
    if (!random) return STARTERS_BY_GEN[gen] ?? STARTERS_BY_GEN[1]
    // Iniciales random SOLO de las regiones elegidas.
    const set = new Set(pools)
    let pool = threeStageStarterPool().filter((s) => set.has(s.generation))
    if (pool.length < 3) pool = threeStageStarterPool() // respaldo si hay muy pocos
    const picks: number[] = []
    const used = new Set<number>()
    while (picks.length < 3 && used.size < pool.length) {
      const sp = pool[Math.floor(Math.random() * pool.length)]
      if (used.has(sp.id)) continue
      used.add(sp.id)
      picks.push(sp.id)
    }
    return picks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [random, gen, pools.join(',')])
  const [selected, setSelected] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Elige tu inicial" left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
        {starters.map((id) => {
          const sp = getSpecies(id)
          const isSel = selected === id
          return (
            <div
              key={id}
              onClick={() => setSelected(id)}
              className={`rounded-2xl p-3 border-2 transition active:scale-[0.99] ${
                isSel ? 'border-red-400 ring-2 ring-red-400/30' : 'border-slate-700/60'
              }`}
              style={{ background: isSel ? typeGradient(sp.types) : 'rgba(15,23,42,0.6)' }}
            >
              {(() => {
                const phys = sp.baseStats.atk >= sp.baseStats.spa
                return (
                  <div className="flex items-center gap-3">
                    <Sprite speciesId={id} className="w-24 h-24 object-contain drop-shadow-lg" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-extrabold text-xl">{sp.displayName}</div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">{phys ? 'Físico' : 'Especial'}</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {sp.types.map((t) => (
                          <TypeBadge key={t} type={t} />
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                        <Stat label="PS" v={sp.baseStats.hp} />
                        <Stat label={phys ? 'Ataque (Físico)' : 'Ataque (Especial)'} v={phys ? sp.baseStats.atk : sp.baseStats.spa} />
                        <Stat label="Defensa" v={sp.baseStats.def} />
                        <Stat label="Def. Esp." v={sp.baseStats.spd} />
                        <Stat label="Velocidad" v={sp.baseStats.spe} />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })}
        {/* Dificultad (fija en Reto diario) */}
        {daily ? (
          <div className="mt-1 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/40 px-3 py-2 text-sm">
            🗓️ <b>Reto diario {daily}</b> — misma región y mapa para todo el mundo hoy. Dificultad Normal.
          </div>
        ) : (
          <div className="mt-1">
            <div className="text-xs font-bold text-slate-400 mb-1.5">Dificultad</div>
            <div className="grid grid-cols-3 gap-2">
              {DIFFS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`rounded-xl py-2 text-sm font-bold transition ${
                    difficulty === d.id ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">{DIFFS.find((d) => d.id === difficulty)?.desc}</p>
          </div>
        )}
      </div>
      <div className="p-4 safe-bottom">
        <Button
          full
          variant="primary"
          disabled={selected === null}
          onClick={() => selected !== null && startRun(daily ? { gen, pools: [gen], random: false, starterId: selected, difficulty: 'normal', seed: dailySeed, daily } : { gen, pools, random, starterId: selected, difficulty })}
        >
          {selected !== null ? `¡Empezar con ${getSpecies(selected).displayName}!` : 'Selecciona un inicial'}
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-300/80">{label}</span>
      <span className="font-bold tabular-nums">{v}</span>
    </div>
  )
}
