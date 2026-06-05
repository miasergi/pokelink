// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { useGame } from '@/state/gameStore'
import { createRun } from '@/engine/run/runEngine'
import App from '@/App'
import HomeScreen from '@/ui/screens/HomeScreen'
import MapScreen from '@/ui/screens/MapScreen'
import TeamScreen from '@/ui/screens/TeamScreen'
import PokedexScreen from '@/ui/screens/PokedexScreen'
import StarterSelectScreen from '@/ui/screens/StarterSelectScreen'

describe('render de pantallas (smoke)', () => {
  it('App monta sin lanzar', () => {
    expect(() => renderToString(createElement(App))).not.toThrow()
  })

  it('Home y selección de inicial renderizan', () => {
    useGame.setState({ loaded: true, screen: { name: 'starterSelect', params: { pools: [1], random: false, gen: 1 } } })
    expect(() => renderToString(createElement(HomeScreen))).not.toThrow()
    expect(() => renderToString(createElement(StarterSelectScreen))).not.toThrow()
  })

  it('pantallas dentro de una run renderizan', () => {
    const run = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 7, seed: 2024 })
    useGame.setState({ run, loaded: true, screen: { name: 'map' } })
    expect(() => renderToString(createElement(MapScreen))).not.toThrow()
    expect(() => renderToString(createElement(TeamScreen))).not.toThrow()
    expect(() => renderToString(createElement(PokedexScreen))).not.toThrow()
  })
})
