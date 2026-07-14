// Pantalla del modo Cyber PokéBall: monta el marco físico (CyberShell) y
// conmuta las vistas internas según la FSM del cyberStore. TÁCTIL: todo se
// juega tocando dentro del LCD (no hay botones físicos).
import { useEffect } from 'react'
import { useCyber } from '@/state/cyberStore'
import { getSpecies } from '@/data'
import { GENERATIONS } from '@/data/generations'
import { play } from '@/utils/sfx'
import CyberShell from '@/ui/cyber/CyberShell'
import { TitleView, RegionView, StarterView } from '@/ui/cyber/CyberSetupViews'
import { MapView, ExploreView } from '@/ui/cyber/CyberMapViews'
import { BattleView } from '@/ui/cyber/CyberBattleView'
import { CenterView, PcView, DexView, BagView } from '@/ui/cyber/CyberCenterViews'
import { OnlineView } from '@/ui/cyber/CyberOnlineView'
import { LcdTitle, LcdText, LcdButton, LcdSprite } from '@/ui/cyber/lcd'

export default function CyberScreen() {
  const { phase, initCyber, exitCyber, save, evoPending } = useCyber()

  useEffect(() => { void initCyber() }, [initCyber])

  const view = (() => {
    switch (phase) {
      case 'title': return <TitleView />
      case 'region': return <RegionView />
      case 'starter': return <StarterView />
      case 'map': return <MapView />
      case 'explore': return <ExploreView />
      case 'battle': return <BattleView />
      case 'center': return <CenterView />
      case 'pc': return <PcView />
      case 'dex': return <DexView />
      case 'bag': return <BagView />
      case 'online': return <OnlineView />
      case 'victory': return <VictoryView />
      case 'gameover': return <GameOverView />
      default: return <TitleView />
    }
  })()

  // Solo evoluciones de Pokémon que sigan en el equipo (defensivo).
  const evo = evoPending.find((e) => save?.party.some((m) => m.uid === e.uid))

  const header = save && phase !== 'title'
    ? `${save.progress.badges}/8 ✦ · ${save.money} ₽`
    : 'BANDAI-STYLE'

  return (
    <CyberShell onExit={exitCyber} header={header}>
      {view}
      {evo && <EvolutionOverlay uid={evo.uid} options={evo.options} />}
    </CyberShell>
  )
}

function EvolutionOverlay({ uid, options }: { uid: string; options: number[] }) {
  const { save, confirmEvolution, skipEvolution } = useCyber()
  const mon = save?.party.find((m) => m.uid === uid)
  if (!mon) return null
  return (
    <div className="absolute inset-0 z-30 bg-[#0c1a10]/95 flex flex-col items-center justify-center gap-2 p-3">
      <LcdText center className="animate-pulse text-yellow-200">¡¿QUÉ?!</LcdText>
      <div className="relative">
        <div className="absolute -inset-3 rounded-full fx-evo-glow" style={{ background: 'conic-gradient(from 0deg, transparent, #fde047, transparent)' }} />
        <LcdSprite speciesId={mon.speciesId} shiny={mon.shiny} size="md" className="relative animate-float" />
      </div>
      <LcdText center>¡{getSpecies(mon.speciesId).displayName.toUpperCase()} ESTÁ EVOLUCIONANDO!</LcdText>
      <div className="flex flex-col gap-1.5 w-full max-w-[12rem]">
        {options.map((toId) => (
          <LcdButton key={toId} active onClick={() => { play('levelup'); confirmEvolution(uid, toId) }} className="text-center">
            ► {getSpecies(toId).displayName.toUpperCase()}
          </LcdButton>
        ))}
        <LcdButton onClick={() => skipEvolution(uid)} className="text-center">DETENER</LcdButton>
      </div>
    </div>
  )
}

function VictoryView() {
  const { save, goTo } = useCyber()
  const region = GENERATIONS.find((g) => g.gen === save?.gen)?.region ?? ''
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2">
      <div className="text-2xl">♛</div>
      <LcdTitle>¡CAMPEÓN DE {region.toUpperCase()}!</LcdTitle>
      <div className="flex gap-2 my-1">
        {save?.party.map((m) => <LcdSprite key={m.uid} speciesId={m.speciesId} shiny={m.shiny} size="sm" className="animate-float" />)}
      </div>
      <LcdText center>Has completado la aventura Cyber PokéBall.</LcdText>
      <LcdText dim center>Se han abierto las ZONAS SECRETAS: ¡hay legendarios!</LcdText>
      <div className="flex flex-col gap-1.5 w-full max-w-[12rem] mt-1">
        <LcdButton active onClick={() => goTo('map')} className="text-center">SEGUIR EXPLORANDO</LcdButton>
        <LcdButton onClick={() => goTo('title')} className="text-center">AL TÍTULO</LcdButton>
      </div>
    </div>
  )
}

function GameOverView() {
  const { goTo } = useCyber()
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2">
      <div className="text-xl text-red-300">✖</div>
      <LcdTitle>SIN POKÉMON…</LcdTitle>
      <LcdText center>Corres al Centro Pokémon.</LcdText>
      <LcdText dim center>Equipo curado · pierdes la mitad del dinero</LcdText>
      <LcdButton active onClick={() => goTo('center')} className="text-center mt-1">► AL CENTRO</LcdButton>
    </div>
  )
}
