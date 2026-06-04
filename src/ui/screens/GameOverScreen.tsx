import { useGame } from '@/state/gameStore'
import { Button, Card } from '@/ui/components/kit'
import { getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'

export default function GameOverScreen() {
  const { run, abandonRun } = useGame()
  if (!run) return null
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 gap-5 text-center safe-top safe-bottom">
      <div className="text-6xl">💀</div>
      <h2 className="text-3xl font-extrabold text-rose-400">Fin de la partida</h2>
      <p className="text-slate-300 text-sm">Tu aventura en {run.region} ha terminado.</p>

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
          <Sprite key={p.uid} speciesId={p.speciesId} variant="front" className="w-12 h-12 object-contain grayscale opacity-70" />
        ))}
      </div>
      <div className="text-xs text-slate-500">
        Equipo final: {run.party.map((p) => getSpecies(p.speciesId).displayName).join(', ')}
      </div>

      <Button full variant="primary" className="max-w-sm" onClick={() => void abandonRun()}>
        Volver al menú
      </Button>
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
