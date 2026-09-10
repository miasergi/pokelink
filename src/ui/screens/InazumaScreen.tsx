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
import EntrenoView from '@/ui/inazuma/EntrenoView'
import ItemFxOverlay from '@/ui/inazuma/ItemFxOverlay'
import PlayerRevealOverlay from '@/ui/inazuma/PlayerRevealOverlay'
import InjuryRogueOverlay from '@/ui/inazuma/InjuryOverlay'
import TechniqueLearnOverlay from '@/ui/inazuma/TechniqueLearnOverlay'
import TechniqueSheet from '@/ui/inazuma/TechniqueSheet'
import CromoOverlay from '@/ui/inazuma/CromoCard'
import SigningOverflowSheet from '@/ui/inazuma/SigningOverflowSheet'
import {
  AlbumView, InazumaOnboarding, StatsView, TeamSelectView, markOnboarded, shouldShowOnboarding,
} from '@/ui/inazuma/ExtraViews'
import {
  DraftView, EndView, MapView, PreviewView, ShopView, SquadView, TitleView, Toast,
} from '@/ui/inazuma/InazumaViews'

/**
 * EL ESCENARIO de cada momento del rogue: el fondo de pantalla cambia con la
 * fase, como los paisajes de tramo del modo Pokémon. Por defecto (título,
 * mapa, gestión) el INSTITUTO RAIMON; los partidos se juegan bajo el estadio
 * del Football Frontier, el entrenamiento en la ribera del río al atardecer y
 * las compras sobre la Ciudad Inazuma. Imágenes en `public/inazuma/bg/`.
 */
const BG_BY_PHASE: Record<string, string> = {
  preview: 'estadio', match: 'estadio', pachanga: 'estadio', result: 'estadio', victory: 'estadio',
  entreno: 'ribera', gameover: 'ribera',
  shop: 'ciudad', bag: 'ciudad', trade: 'ciudad',
  // El resto (título, mapa, vestuario, draft, álbum…) cae al Raimon.
}

function InazumaBackdrop({ phase }: { phase: string }) {
  const img = BG_BY_PHASE[phase] ?? 'raimon'
  return (
    <div
      key={img}
      aria-hidden
      className="fixed inset-0 pointer-events-none animate-fade-in"
      style={{
        // Por ENCIMA del patrón de Pokémon del App (-10) y por debajo de todo
        // lo demás. El velo oscuro mantiene legible la UI clara del modo.
        zIndex: -5,
        backgroundImage: `linear-gradient(rgba(2,6,23,0.55), rgba(2,6,23,0.82)), url(${import.meta.env.BASE_URL}inazuma/bg/${img}.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'saturate(1.05)',
      }}
    />
  )
}

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
      case 'entreno': return <EntrenoView />
      case 'stats': return <StatsView />
      case 'album': return <AlbumView />
      case 'teamSelect': return <TeamSelectView />
      case 'draft': return <DraftView />
      case 'victory': return <EndView won />
      case 'gameover': return <EndView won={false} />
      default: return <TitleView />
    }
  })()

  // Fondo del MODO: el ESCENARIO del momento (InazumaBackdrop, fijo detrás)
  // más un tinte translúcido. OJO: nada de base opaca aquí — taparía el
  // escenario; la oscuridad para leer la pone el velo del propio backdrop.
  const bgMatch = phase === 'match' || phase === 'pachanga'
  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      style={{
        background: bgMatch
          ? 'radial-gradient(120% 90% at 50% -10%, #14532d33, transparent 60%)'
          : 'radial-gradient(90% 60% at 80% -10%, #f59e0b14, transparent 55%), radial-gradient(80% 60% at 10% 110%, #0ea5e91a, transparent 60%)',
      }}
    >
      <InazumaBackdrop phase={phase} />
      {view}
      <ItemFxOverlay />
      <PlayerRevealOverlay />
      <InjuryRogueOverlay />
      {/* ¡Nueva supertécnica!: la evolución de la casa. */}
      <TechniqueLearnOverlay />
      {/* Visor global de supertécnica: se abre al tocar cualquier estampa. */}
      <TechniqueSheet />
      <CromoOverlay />
      {/* Plantilla llena + fichaje entrante: decidir a quién vender. */}
      <SigningOverflowSheet />
      <Toast />
      {intro && <InazumaOnboarding onClose={() => { markOnboarded(); setIntro(false) }} />}
    </div>
  )
}
