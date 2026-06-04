import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { STARTERS_BY_GEN } from '@/data/starters'
import { getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import { typeGradient } from '@/ui/theme/types'
import type { GameMode } from '@/engine/run/types'

export default function StarterSelectScreen() {
  const { back, screen, startRun } = useGame()
  const mode = (screen.params?.mode as GameMode) ?? 'generation'
  const gen = (screen.params?.gen as number) ?? 1
  const starters = STARTERS_BY_GEN[gen] ?? STARTERS_BY_GEN[1]
  const [selected, setSelected] = useState<number | null>(null)

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
              <div className="flex items-center gap-3">
                <Sprite speciesId={id} className="w-24 h-24 object-contain drop-shadow-lg" />
                <div className="flex-1">
                  <div className="font-extrabold text-xl">{sp.displayName}</div>
                  <div className="flex gap-1 mt-1">
                    {sp.types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-0.5 text-[11px]">
                    <Stat label="PS" v={sp.baseStats.hp} />
                    <Stat label="Atq" v={sp.baseStats.atk} />
                    <Stat label="Def" v={sp.baseStats.def} />
                    <Stat label="AtE" v={sp.baseStats.spa} />
                    <Stat label="DeE" v={sp.baseStats.spd} />
                    <Stat label="Vel" v={sp.baseStats.spe} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="p-4 safe-bottom">
        <Button
          full
          variant="primary"
          disabled={selected === null}
          onClick={() => selected !== null && startRun({ mode, gen, starterId: selected })}
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
