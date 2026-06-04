import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar } from '@/ui/components/kit'

export default function ModeSelectScreen() {
  const { navigate, back } = useGame()
  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Modo de juego" left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 p-4 flex flex-col gap-4">
        <p className="text-slate-400 text-sm">Elige cómo quieres jugar tu run.</p>

        <Card className="p-4" onClick={() => navigate('genSelect', { mode: 'generation' })}>
          <div className="flex items-center gap-3">
            <div className="text-4xl">🗺️</div>
            <div className="flex-1">
              <div className="font-extrabold text-lg">Por generación</div>
              <div className="text-sm text-slate-400">
                Juega una región con solo sus Pokémon, sus líderes, rival y Alto
                Mando reales.
              </div>
            </div>
            <div className="text-slate-500 text-2xl">›</div>
          </div>
        </Card>

        <Card className="p-4" onClick={() => navigate('starterSelect', { mode: 'all', gen: 1 })}>
          <div className="flex items-center gap-3">
            <div className="text-4xl">🌍</div>
            <div className="flex-1">
              <div className="font-extrabold text-lg">Todos los Pokémon</div>
              <div className="text-sm text-slate-400">
                Cualquier Pokémon de cualquier generación puede aparecer. Liga de
                Kanto como reto base.
              </div>
            </div>
            <div className="text-slate-500 text-2xl">›</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
