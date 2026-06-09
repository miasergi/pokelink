import { lazy, Suspense, useEffect, useState } from 'react'
import { useGame, type ScreenName } from '@/state/gameStore'
import { useSettings } from '@/state/settingsStore'
import { startMusic, stopMusic } from '@/utils/music'
import Onboarding from '@/ui/components/Onboarding'
import EvolutionModal from '@/ui/components/EvolutionModal'
import EvoChoiceModal from '@/ui/components/EvoChoiceModal'
import HomeScreen from '@/ui/screens/HomeScreen'

// Pantallas cargadas bajo demanda (code-splitting) para aligerar el arranque.
const ModeSelectScreen = lazy(() => import('@/ui/screens/ModeSelectScreen'))
const GenSelectScreen = lazy(() => import('@/ui/screens/GenSelectScreen'))
const RandomSetupScreen = lazy(() => import('@/ui/screens/RandomSetupScreen'))
const LeagueSetupScreen = lazy(() => import('@/ui/screens/LeagueSetupScreen'))
const LeagueScreen = lazy(() => import('@/ui/screens/LeagueScreen'))
const StoryScreen = lazy(() => import('@/ui/screens/StoryScreen'))
const StoryDialogueScreen = lazy(() => import('@/ui/screens/StoryDialogueScreen'))
const StarterSelectScreen = lazy(() => import('@/ui/screens/StarterSelectScreen'))
const MapScreen = lazy(() => import('@/ui/screens/MapScreen'))
const BattleScreen = lazy(() => import('@/ui/screens/BattleScreen'))
const RewardScreen = lazy(() => import('@/ui/screens/RewardScreen'))
const CatchScreen = lazy(() => import('@/ui/screens/CatchScreen'))
const ItemScreen = lazy(() => import('@/ui/screens/ItemScreen'))
const ShopScreen = lazy(() => import('@/ui/screens/ShopScreen'))
const EventScreen = lazy(() => import('@/ui/screens/EventScreen'))
const HealScreen = lazy(() => import('@/ui/screens/HealScreen'))
const TeamScreen = lazy(() => import('@/ui/screens/TeamScreen'))
const PokedexScreen = lazy(() => import('@/ui/screens/PokedexScreen'))
const RecordsScreen = lazy(() => import('@/ui/screens/RecordsScreen'))
const RescueScreen = lazy(() => import('@/ui/screens/RescueScreen'))
const TradeScreen = lazy(() => import('@/ui/screens/TradeScreen'))
const SettingsScreen = lazy(() => import('@/ui/screens/SettingsScreen'))
const GameOverScreen = lazy(() => import('@/ui/screens/GameOverScreen'))
const VictoryScreen = lazy(() => import('@/ui/screens/VictoryScreen'))
const AccountScreen = lazy(() => import('@/ui/screens/AccountScreen'))
const LeaderboardScreen = lazy(() => import('@/ui/screens/LeaderboardScreen'))
const LegendaryScreen = lazy(() => import('@/ui/screens/LegendaryScreen'))
const AchievementsScreen = lazy(() => import('@/ui/screens/AchievementsScreen'))

const SCREENS: Record<ScreenName, React.ComponentType> = {
  home: HomeScreen,
  modeSelect: ModeSelectScreen,
  genSelect: GenSelectScreen,
  randomSetup: RandomSetupScreen,
  leagueSetup: LeagueSetupScreen,
  league: LeagueScreen,
  story: StoryScreen,
  storyDialogue: StoryDialogueScreen,
  starterSelect: StarterSelectScreen,
  map: MapScreen,
  battle: BattleScreen,
  reward: RewardScreen,
  catch: CatchScreen,
  item: ItemScreen,
  shop: ShopScreen,
  event: EventScreen,
  heal: HealScreen,
  team: TeamScreen,
  pokedex: PokedexScreen,
  records: RecordsScreen,
  rescue: RescueScreen,
  trade: TradeScreen,
  settings: SettingsScreen,
  gameover: GameOverScreen,
  victory: VictoryScreen,
  account: AccountScreen,
  leaderboard: LeaderboardScreen,
  legendary: LegendaryScreen,
  achievements: AchievementsScreen,
}

const ONBOARD_KEY = 'pokerogue:onboarded'

export default function App() {
  const { screen, init, loaded } = useGame()
  const storyMode = useGame((s) => !!s.run?.story)
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return typeof localStorage !== 'undefined' && !localStorage.getItem(ONBOARD_KEY)
    } catch {
      return false
    }
  })

  const music = useSettings((s) => s.music)
  useEffect(() => {
    void init()
  }, [init])

  // Música de fondo según la pantalla.
  useEffect(() => {
    if (!music) { stopMusic(); return }
    if (screen.name === 'story' || screen.name === 'storyDialogue') startMusic('story')
    else if (screen.name === 'league' || screen.name === 'leagueSetup') startMusic('league')
    else if (screen.name === 'map' || screen.name === 'team' || screen.name === 'shop' || screen.name === 'pokedex' || screen.name === 'records') startMusic(storyMode ? 'story' : 'map')
    else if (screen.name === 'battle') startMusic('battle')
    else if (screen.name === 'home' || screen.name === 'victory' || screen.name === 'gameover') stopMusic()
  }, [screen.name, music, storyMode])

  if (!loaded) {
    return (
      <div className="flex-1 grid place-items-center">
        <div className="text-4xl animate-float">⚡</div>
      </div>
    )
  }

  const Current = SCREENS[screen.name] ?? HomeScreen
  // key por pantalla -> animación de entrada al cambiar de pantalla
  return (
    <>
      {/* Fondo: patrón de Pokémon sutil (debajo de todo) */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -10,
          backgroundImage: `url(${import.meta.env.BASE_URL}bg-menu.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'invert(1) brightness(1.2)',
          opacity: 0.05,
        }}
      />
      <div key={screen.name} className="flex flex-col flex-1 min-h-0 screen-enter relative">
        <Suspense fallback={<div className="flex-1 grid place-items-center"><div className="text-4xl animate-float">⚡</div></div>}>
          <Current />
        </Suspense>
      </div>
      {showIntro && (
        <Onboarding
          onClose={() => {
            try {
              localStorage.setItem(ONBOARD_KEY, '1')
            } catch {
              /* ignore */
            }
            setShowIntro(false)
          }}
        />
      )}
      {/* Modales de evolución (globales: las elecciones tras combate salen aquí) */}
      <EvolutionFx />
    </>
  )
}

function EvolutionFx() {
  const { evoFx, clearEvoFx, evoChoice, chooseEvolution, cancelEvoChoice } = useGame()
  return (
    <>
      {evoFx && <EvolutionModal fromId={evoFx.fromId} toId={evoFx.toId} onClose={clearEvoFx} />}
      {evoChoice && <EvoChoiceModal options={evoChoice.options} onPick={chooseEvolution} onCancel={cancelEvoChoice} />}
    </>
  )
}
