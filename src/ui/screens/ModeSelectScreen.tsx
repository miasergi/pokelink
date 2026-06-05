import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar } from '@/ui/components/kit'
import { getGeneration } from '@/data/generations'

export default function ModeSelectScreen() {
  const { navigate, back, screen } = useGame()
  const gen = (screen.params?.gen as number) ?? 1
  const region = getGeneration(gen).region

  return (
    <div className="flex flex-col flex-1">
      <TopBar title={`Modo · ${region}`} left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 p-4 flex flex-col gap-3">
        <p className="text-slate-400 text-sm">¿Cómo quieres jugar {region}?</p>

        <Card className="p-4" onClick={() => navigate('starterSelect', { mode: 'generation', gen })}>
          <div className="flex items-center gap-3">
            <div className="text-4xl">🗺️</div>
            <div className="flex-1">
              <div className="font-extrabold text-lg">Solo Pokémon de {region}</div>
              <div className="text-sm text-slate-400">Aparecen únicamente los Pokémon de esta región.</div>
            </div>
            <div className="text-slate-500 text-2xl">›</div>
          </div>
        </Card>

        <Card className="p-4" onClick={() => navigate('starterSelect', { mode: 'all', gen })}>
          <div className="flex items-center gap-3">
            <div className="text-4xl">🌍</div>
            <div className="flex-1">
              <div className="font-extrabold text-lg">Todos los Pokémon</div>
              <div className="text-sm text-slate-400">Puede aparecer cualquier Pokémon de cualquier generación.</div>
            </div>
            <div className="text-slate-500 text-2xl">›</div>
          </div>
        </Card>

        <Card className="p-4" onClick={() => navigate('starterSelect', { mode: 'random', gen })} style={{ borderColor: '#a855f755' }}>
          <div className="flex items-center gap-3">
            <div className="text-4xl">🎲</div>
            <div className="flex-1">
              <div className="font-extrabold text-lg text-fuchsia-300">Modo Random</div>
              <div className="text-sm text-slate-400">
                Salvajes, entrenadores y jefes con Pokémon <b>totalmente aleatorios</b> (los niveles se
                mantienen). ¡Cada partida es distinta!
              </div>
            </div>
            <div className="text-slate-500 text-2xl">›</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
