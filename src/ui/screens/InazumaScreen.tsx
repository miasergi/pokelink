// Pantalla del modo Inazuma Rogue: conmuta las vistas según la FSM del
// `inazumaStore`. Igual que `CyberScreen`, es la única puerta de entrada del
// modo y no comparte estado con el roguelike Pokémon.
import { useEffect, useState } from 'react'
import { useInazuma } from '@/state/inazumaStore'
import MatchView from '@/ui/inazuma/MatchView'
import PachangaView from '@/ui/inazuma/PachangaView'
import BagView from '@/ui/inazuma/BagView'
import EventView from '@/ui/inazuma/EventView'
import FirmaView from '@/ui/inazuma/FirmaView'
import TradeView from '@/ui/inazuma/TradeView'
import {
  AlbumView, InazumaOnboarding, StatsView, TeamSelectView, markOnboarded, shouldShowOnboarding,
} from '@/ui/inazuma/ExtraViews'
import {
  DraftView, EndView, MapView, PreviewView, ShopView, SquadView, TitleView, Toast,
} from '@/ui/inazuma/InazumaViews'

export default function InazumaScreen() {
  const { phase, initInazuma } = useInazuma()
  const [intro, setIntro] = useState(shouldShowOnboarding)

  useEffect(() => { void initInazuma() }, [initInazuma])

  const view = (() => {
    switch (phase) {
      case 'title': return <TitleView />
      case 'map': return <MapView />
      case 'preview': return <PreviewView />
      case 'match': return <MatchView />
      case 'pachanga': return <PachangaView />
      case 'squad': return <SquadView />
      case 'shop': return <ShopView />
      case 'bag': return <BagView />
      case 'evento': return <EventView />
      case 'firma': return <FirmaView />
      case 'trade': return <TradeView />
      case 'stats': return <StatsView />
      case 'album': return <AlbumView />
      case 'teamSelect': return <TeamSelectView />
      case 'draft': return <DraftView />
      case 'victory': return <EndView won />
      case 'gameover': return <EndView won={false} />
      default: return <TitleView />
    }
  })()

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {view}
      <Toast />
      {intro && <InazumaOnboarding onClose={() => { markOnboarded(); setIntro(false) }} />}
    </div>
  )
}
