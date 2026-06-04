import { useGame } from '@/state/gameStore'
import { Button, Card, money } from '@/ui/components/kit'
import { getSpecies } from '@/data'
import { getItem } from '@/data/items'
import Sprite from '@/ui/components/Sprite'

export default function RewardScreen() {
  const { lastSummary, navigate } = useGame()
  if (!lastSummary) {
    navigate('map')
    return null
  }
  return (
    <div className="flex flex-col flex-1 p-5 safe-top safe-bottom items-center justify-center gap-5">
      <div className="text-5xl animate-pop-in">🎉</div>
      <h2 className="text-2xl font-extrabold">¡Victoria!</h2>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {lastSummary.moneyGained > 0 && (
          <Card className="p-3 flex items-center justify-between">
            <span className="text-slate-300">Recompensa</span>
            <span className="font-bold text-amber-300">+{money(lastSummary.moneyGained)}</span>
          </Card>
        )}

        {lastSummary.itemGained && (
          <Card className="p-3 flex items-center gap-3">
            <img src={getItem(lastSummary.itemGained).sprite} alt="" className="w-8 h-8" />
            <div>
              <div className="text-xs text-slate-400">Objeto conseguido</div>
              <div className="font-bold">{getItem(lastSummary.itemGained).name}</div>
            </div>
          </Card>
        )}

        {lastSummary.evolutions.map((evo) => (
          <Card key={evo.uid} className="p-3 flex items-center justify-center gap-3 animate-pop-in">
            <Sprite speciesId={evo.fromId} variant="front" className="w-12 h-12 object-contain opacity-70" />
            <span className="text-2xl">→</span>
            <Sprite speciesId={evo.toId} variant="front" className="w-14 h-14 object-contain" />
            <div className="text-sm">
              <span className="text-emerald-300 font-bold">¡Evolucionó!</span>
              <div>{getSpecies(evo.toId).displayName}</div>
            </div>
          </Card>
        ))}
      </div>

      <Button full variant="primary" className="max-w-sm" onClick={() => navigate('map')}>
        Continuar ›
      </Button>
    </div>
  )
}
