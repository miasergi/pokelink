import { useGame } from '@/state/gameStore'
import { useSettings, type BattleSpeed } from '@/state/settingsStore'
import { Button, Card, TopBar } from '@/ui/components/kit'

export default function SettingsScreen() {
  const { back, run, abandonRun } = useGame()
  const s = useSettings()

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Ajustes" left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
        <Card className="p-4">
          <div className="font-bold mb-2">Velocidad de combate por defecto</div>
          <div className="flex gap-2">
            {([1, 2, 4] as BattleSpeed[]).map((v) => (
              <button
                key={v}
                onClick={() => s.setBattleSpeed(v)}
                className={`flex-1 py-2.5 rounded-xl font-bold ${s.battleSpeed === v ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                {v}×
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="font-bold">Sonido y vibración</div>
            <div className="text-xs text-slate-400">Efectos de combate y feedback táctil</div>
          </div>
          <Toggle on={s.sound} onClick={s.toggleSound} />
        </Card>

        <div className="text-xs text-slate-500 text-center mt-2">
          PokéRogue · v0.1 — uso personal
        </div>

        {run && (
          <Card className="p-4">
            <div className="font-bold text-rose-300 mb-1">Zona de peligro</div>
            <p className="text-xs text-slate-400 mb-2">Abandonar la run actual la dará por perdida.</p>
            <Button full variant="danger" onClick={() => void abandonRun()}>
              Abandonar run
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-12 h-7 rounded-full transition relative ${on ? 'bg-emerald-500' : 'bg-slate-600'}`}
    >
      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${on ? 'left-[1.625rem]' : 'left-0.5'}`} />
    </button>
  )
}
