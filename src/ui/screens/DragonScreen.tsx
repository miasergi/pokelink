// Pantalla del modo Dragon Ball Rogue: conmuta las vistas según la FSM del
// `dragonStore`. Igual que CyberScreen e InazumaScreen, es la única puerta de
// entrada del modo y no comparte estado con el roguelike Pokémon.
import { useEffect } from 'react'
import { useDragon } from '@/state/dragonStore'
import BattleView from '@/ui/dragon/BattleView'
import {
  EndView, IntroView, MapView, NodeView, OutcomeView, ShopView, TeamView,
  TitleView, WishView,
} from '@/ui/dragon/DragonViews'

/** Aviso efímero de lo que acaba de pasar (recompensa, deseo, entrenamiento). */
function Toast() {
  const { message, clearMessage } = useDragon()
  useEffect(() => {
    if (!message) return
    const t = setTimeout(clearMessage, 3200)
    return () => clearTimeout(t)
  }, [message, clearMessage])
  if (!message) return null
  return (
    <div className="absolute left-3 right-3 bottom-4 z-40 pointer-events-none">
      <div className="mx-auto max-w-sm rounded-xl bg-slate-900/95 px-3 py-2 text-[12.5px] text-center text-slate-100"
        style={{ boxShadow: '0 0 0 1px #ffffff1a, 0 8px 24px #00000066' }}>
        {message}
      </div>
    </div>
  )
}

export default function DragonScreen() {
  const { phase, initDragon } = useDragon()

  useEffect(() => { void initDragon() }, [initDragon])

  const view = (() => {
    switch (phase) {
      case 'title': return <TitleView />
      case 'intro': return <IntroView />
      case 'map': return <MapView />
      case 'node': return <NodeView />
      case 'battle': return <BattleView />
      case 'outcome': return <OutcomeView />
      case 'team': return <TeamView />
      case 'shop': return <ShopView />
      case 'wish': return <WishView />
      case 'victory': return <EndView won />
      case 'gameover': return <EndView won={false} />
      default: return <TitleView />
    }
  })()

  return (
    <div
      className="flex flex-col flex-1 min-h-0 relative"
      style={{
        background:
          'radial-gradient(90% 60% at 80% -10%, #f9731614, transparent 55%), radial-gradient(80% 60% at 10% 110%, #0ea5e91a, transparent 60%), #0b1220',
      }}
    >
      {view}
      <Toast />
    </div>
  )
}
