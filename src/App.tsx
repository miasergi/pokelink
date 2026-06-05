import { useEffect, useState } from 'react'
import { useGame, type ScreenName } from '@/state/gameStore'
import Onboarding from '@/ui/components/Onboarding'
import HomeScreen from '@/ui/screens/HomeScreen'
import ModeSelectScreen from '@/ui/screens/ModeSelectScreen'
import GenSelectScreen from '@/ui/screens/GenSelectScreen'
import StarterSelectScreen from '@/ui/screens/StarterSelectScreen'
import MapScreen from '@/ui/screens/MapScreen'
import BattleScreen from '@/ui/screens/BattleScreen'
import RewardScreen from '@/ui/screens/RewardScreen'
import CatchScreen from '@/ui/screens/CatchScreen'
import ItemScreen from '@/ui/screens/ItemScreen'
import ShopScreen from '@/ui/screens/ShopScreen'
import EventScreen from '@/ui/screens/EventScreen'
import HealScreen from '@/ui/screens/HealScreen'
import TeamScreen from '@/ui/screens/TeamScreen'
import PokedexScreen from '@/ui/screens/PokedexScreen'
import RecordsScreen from '@/ui/screens/RecordsScreen'
import SettingsScreen from '@/ui/screens/SettingsScreen'
import GameOverScreen from '@/ui/screens/GameOverScreen'
import VictoryScreen from '@/ui/screens/VictoryScreen'

const SCREENS: Record<ScreenName, () => JSX.Element | null> = {
  home: HomeScreen,
  modeSelect: ModeSelectScreen,
  genSelect: GenSelectScreen,
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
  settings: SettingsScreen,
  gameover: GameOverScreen,
  victory: VictoryScreen,
}

const ONBOARD_KEY = 'pokerogue:onboarded'

export default function App() {
  const { screen, init, loaded } = useGame()
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return typeof localStorage !== 'undefined' && !localStorage.getItem(ONBOARD_KEY)
    } catch {
      return false
    }
  })

  useEffect(() => {
    void init()
  }, [init])

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
      <div key={screen.name} className="flex flex-col flex-1 min-h-0 screen-enter">
        <Current />
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
    </>
  )
}
