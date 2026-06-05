import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar, money } from '@/ui/components/kit'
import { getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import EvolutionModal from '@/ui/components/EvolutionModal'

export default function TradeScreen() {
  const { run, screen, doTrade, skipTrade, tradeReveal, closeTradeReveal } = useGame()
  if (!run) return null
  const nodeId = screen.params?.nodeId as string | undefined
  const node = nodeId ? run.map.nodes[nodeId] : undefined
  const cost = node && node.content.kind === 'trade' ? node.content.cost : 0
  const canAfford = run.money >= cost

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Intercambio"
        right={<span className="text-amber-300 font-bold text-sm pr-1">{money(run.money)}</span>}
      />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
        <Card className="p-3 text-center">
          <div className="text-3xl">🔄</div>
          <p className="text-sm text-slate-300 mt-1">
            Elige un Pokémon para intercambiarlo. Recibirás otro <b>aleatorio de primera etapa</b> con
            <b> +3 niveles</b>.
          </p>
          <p className={`text-sm font-bold mt-1 ${canAfford ? 'text-amber-300' : 'text-rose-400'}`}>
            Coste: {money(cost)} {canAfford ? '' : '· no te llega'}
          </p>
        </Card>

        <div className="flex flex-col gap-2">
          {run.party.map((mon) => {
            const sp = getSpecies(mon.speciesId)
            return (
              <button
                key={mon.uid}
                disabled={!canAfford}
                onClick={() => doTrade(mon.uid)}
                className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/60 p-2.5 text-left active:scale-[0.98] transition disabled:opacity-40"
              >
                <Sprite speciesId={mon.speciesId} variant="front" className="w-12 h-12 object-contain" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{sp.displayName} <span className="text-xs text-slate-400">Nv.{mon.level}</span></div>
                  <div className="flex gap-1 mt-0.5">{sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
                </div>
                <span className="text-cyan-300 font-bold text-sm">Cambiar ›</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4 safe-bottom">
        <Button full variant="secondary" onClick={skipTrade}>No intercambiar</Button>
      </div>

      {tradeReveal && (
        <EvolutionModal
          fromId={tradeReveal.fromId}
          toId={tradeReveal.toId}
          level={tradeReveal.level}
          title="¡Intercambio recibido!"
          prelude="Intercambiando…"
          onClose={closeTradeReveal}
        />
      )}
    </div>
  )
}
