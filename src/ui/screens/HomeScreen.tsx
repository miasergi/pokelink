import { useGame } from '@/state/gameStore'
import { Button } from '@/ui/components/kit'
import { APP_VERSION } from '@/version'

export default function HomeScreen() {
  const { navigate, hasSavedRun, resumeRun } = useGame()
  return (
    <div className="flex flex-col flex-1 items-center justify-between p-6 safe-top safe-bottom">
      <div className="flex-1 flex flex-col items-center justify-center gap-2 mt-10">
        <div className="text-6xl animate-float">⚡</div>
        <h1 className="text-4xl font-extrabold tracking-tight text-center leading-none">
          Poké<span className="text-red-500">Rogue</span>
        </h1>
        <p className="text-slate-400 text-sm text-center max-w-[16rem]">
          Roguelike autobattler. Construye tu equipo, derrota a los gimnasios y
          conquista la Liga Pokémon.
        </p>
      </div>

      <div className="w-full flex flex-col gap-3 max-w-sm">
        {hasSavedRun && (
          <Button variant="success" full onClick={() => void resumeRun()}>
            ▶ Continuar partida
          </Button>
        )}
        <Button variant="primary" full onClick={() => navigate('genSelect')}>
          {hasSavedRun ? 'Nueva partida' : '⚔ Jugar'}
        </Button>
        <div className="grid grid-cols-3 gap-3">
          <Button variant="secondary" onClick={() => navigate('pokedex')}>
            📕 Pokédex
          </Button>
          <Button variant="secondary" onClick={() => navigate('records')}>
            🏆 Récords
          </Button>
          <Button variant="secondary" onClick={() => navigate('settings')}>
            ⚙ Ajustes
          </Button>
        </div>
        <div className="text-center text-[11px] text-slate-600 mt-1">{APP_VERSION}</div>
      </div>
    </div>
  )
}
