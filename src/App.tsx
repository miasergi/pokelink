import { useEffect } from 'react'
import { useGame, type ScreenName } from '@/state/gameStore'
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
  settings: SettingsScreen,
  gameover: GameOverScreen,
  victory: VictoryScreen,
}

export default function App() {
  const { screen, init, loaded } = useGame()

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
  return <Current />
}
