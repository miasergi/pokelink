import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, Card } from '@/ui/components/kit'
import { getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'
import MemeOverlay from '@/ui/components/MemeOverlay'
import RunTimer from '@/ui/components/RunTimer'

export default function GameOverScreen() {
  const { run, abandonRun, restartRun } = useGame()
  const [meme, setMeme] = useState(true)
  if (!run) return null
  const starterName = getSpecies(run.starterId).displayName
  const memeMon = run.party.find((p) => p.currentHp <= 0) ?? run.party[0]
  return (
    <div className="flex flex-col flex-1 min-h-0 safe-top safe-bottom">
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 flex flex-col items-center gap-4 text-center">
        <div className="text-6xl mt-2">💀</div>
        <h2 className="text-3xl font-extrabold text-rose-400">Fin de la partida</h2>
        <p className="text-slate-300 text-sm">Tu aventura en {run.region} ha terminado.</p>
        <RunTimer startedAt={run.startedAt} frozen className="text-slate-400 font-bold" />

        <Card className="p-4 w-full max-w-sm">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Gimnasios" value={`${run.stats.gymsDefeated}/8`} />
            <Stat label="Alto Mando" value={`${run.stats.eliteDefeated}/4`} />
            <Stat label="Combates ganados" value={run.stats.battlesWon} />
            <Stat label="Pokémon capturados" value={run.stats.pokemonCaught} />
          </div>
        </Card>

        <div className="flex gap-1.5 flex-wrap justify-center max-w-sm">
          {run.party.map((p) => (
            <Sprite key={p.uid} speciesId={p.speciesId} variant="front" className="w-11 h-11 object-contain grayscale opacity-70" />
          ))}
        </div>
      </div>

      {/* Botones siempre visibles abajo */}
      <div className="p-4 flex flex-col gap-2 border-t border-slate-800 bg-slate-900/80">
        <Button full variant="primary" onClick={restartRun}>
          🔄 Reiniciar ({run.region} · {starterName})
        </Button>
        <Button full variant="secondary" onClick={() => void abandonRun()}>
          🏠 Volver a Inicio
        </Button>
      </div>

      {meme && memeMon && (
        <MemeOverlay mood="lose" speciesId={memeMon.speciesId} shiny={memeMon.shiny} onClose={() => setMeme(false)} />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className="font-bold text-lg">{value}</span>
    </div>
  )
}
