import { useGame } from '@/state/gameStore'
import { Card } from '@/ui/components/kit'
import { getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'
import HpBar from '@/ui/components/HpBar'

export default function RescueScreen() {
  const { run, useRescue } = useGame()
  if (!run) return null
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-5 gap-4 text-center safe-top safe-bottom">
      <div className="text-5xl animate-float">🛟</div>
      <h2 className="text-2xl font-extrabold text-emerald-300">¡Salvavidas!</h2>
      <p className="text-sm text-slate-300 max-w-xs">
        Tu equipo cayó, pero un <b>Salvavidas</b> te da otra oportunidad. Elige un Pokémon
        para revivirlo a tope y seguir la aventura.
      </p>
      <div className="w-full max-w-sm flex flex-col gap-2">
        {run.party.map((mon) => {
          const sp = getSpecies(mon.speciesId)
          return (
            <Card
              key={mon.uid}
              className="p-2.5 flex items-center gap-3 active:scale-[0.98] transition cursor-pointer"
              onClick={() => useRescue(mon.uid)}
            >
              <Sprite speciesId={mon.speciesId} variant="front" className={`w-12 h-12 object-contain ${mon.currentHp <= 0 ? 'grayscale opacity-70' : ''}`} />
              <div className="flex-1 text-left">
                <div className="font-bold">{sp.displayName} <span className="text-xs text-slate-400">Nv.{mon.level}</span></div>
                <HpBar current={mon.currentHp} max={mon.stats.hp} status={mon.status} showNumbers />
              </div>
              <span className="text-emerald-300 font-bold text-sm">Revivir ›</span>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
