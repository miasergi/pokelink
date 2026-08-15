// Pantalla del modo Inazuma Rogue: conmuta las vistas según la FSM del
// `inazumaStore`. Igual que `CyberScreen`, es la única puerta de entrada del
// modo y no comparte estado con el roguelike Pokémon.
import { useEffect, useState } from 'react'
import { startMusic, stopMusic } from '@/utils/music'
import { useSettings } from '@/state/settingsStore'
import { useInazuma } from '@/state/inazumaStore'
import MatchView from '@/ui/inazuma/MatchView'
import PachangaView from '@/ui/inazuma/PachangaView'
import BagView from '@/ui/inazuma/BagView'
import EventView from '@/ui/inazuma/EventView'
import FirmaView from '@/ui/inazuma/FirmaView'
import TradeView from '@/ui/inazuma/TradeView'
import ItemFxOverlay from '@/ui/inazuma/ItemFxOverlay'
import PlayerRevealOverlay from '@/ui/inazuma/PlayerRevealOverlay'
import TechniqueSheet from '@/ui/inazuma/TechniqueSheet'
import SigningOverflowSheet from '@/ui/inazuma/SigningOverflowSheet'
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

  // Música de fondo del modo: mapa/gestión con su tema, partido con el suyo.
  const music = useSettings((s) => s.music)
  useEffect(() => {
    if (!music) { stopMusic(); return }
    if (phase === 'match' || phase === 'pachanga') startMusic('inazuma-match')
    else if (phase === 'title' || phase === 'victory' || phase === 'gameover') stopMusic()
    else startMusic('inazuma-map')
    return () => stopMusic()
  }, [phase, music])

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

  // Fondo del MODO: estadio nocturno en partidos, mapa oscuro en el resto —
  // dibujados con CSS propio (nada opaco: lo de encima manda).
  const bgMatch = phase === 'match' || phase === 'pachanga'
  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      style={{
        background: bgMatch
          ? 'radial-gradient(120% 90% at 50% -10%, #14532d33, transparent 60%), repeating-linear-gradient(0deg, #0b1220 0 42px, #0d1526 42px 84px), #0b1220'
          : 'radial-gradient(90% 60% at 80% -10%, #f59e0b14, transparent 55%), radial-gradient(80% 60% at 10% 110%, #0ea5e91a, transparent 60%), #0b1220',
      }}
    >
      {view}
      <ItemFxOverlay />
      <PlayerRevealOverlay />
      {/* Visor global de supertécnica: se abre al tocar cualquier estampa. */}
      <TechniqueSheet />
      {/* Plantilla llena + fichaje entrante: decidir a quién vender. */}
      <SigningOverflowSheet />
      <Toast />
      {intro && <InazumaOnboarding onClose={() => { markOnboarded(); setIntro(false) }} />}
    </div>
  )
}
