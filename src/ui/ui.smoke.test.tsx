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
import CyberScreen from '@/ui/screens/CyberScreen'
import { useCyber } from '@/state/cyberStore'
import { createAdventure } from '@/engine/cyber/cyberEngine'
import InazumaScreen from '@/ui/screens/InazumaScreen'
import { useInazuma } from '@/state/inazumaStore'
import { createSave, startMatch } from '@/engine/inazuma/game'
import { advance, chooseOption } from '@/engine/inazuma/match'
import { buildDraft } from '@/engine/inazuma/rewards'
import { RNG } from '@/utils/rng'

describe('render de pantallas (smoke)', () => {
  it('App monta sin lanzar', () => {
    expect(() => renderToString(createElement(App))).not.toThrow()
  })

  it('Home y selección de inicial renderizan', () => {
    useGame.setState({ loaded: true, screen: { name: 'starterSelect', params: { pools: [1], random: false, gen: 1 } } })
    expect(() => renderToString(createElement(HomeScreen))).not.toThrow()
    expect(() => renderToString(createElement(StarterSelectScreen))).not.toThrow()
  })

  it('Cyber PokéBall: título, mapa y centro renderizan', () => {
    useGame.setState({ loaded: true, screen: { name: 'cyber' } })
    expect(() => renderToString(createElement(CyberScreen))).not.toThrow()
    const save = createAdventure(1, 25, 99)
    useCyber.setState({ save, hasSave: true, phase: 'map' })
    expect(() => renderToString(createElement(CyberScreen))).not.toThrow()
    useCyber.setState({ phase: 'center' })
    expect(() => renderToString(createElement(CyberScreen))).not.toThrow()
    useCyber.setState({ phase: 'dex' })
    expect(() => renderToString(createElement(CyberScreen))).not.toThrow()
  })

  it('pantallas dentro de una run renderizan', () => {
    const run = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 7, seed: 2024 })
    useGame.setState({ run, loaded: true, screen: { name: 'map' } })
    expect(() => renderToString(createElement(MapScreen))).not.toThrow()
    expect(() => renderToString(createElement(TeamScreen))).not.toThrow()
    expect(() => renderToString(createElement(PokedexScreen))).not.toThrow()
  })

  it('Inazuma Rogue: todas las fases renderizan y el partido se juega entero', () => {
    useGame.setState({ loaded: true, screen: { name: 'inazuma' } })
    expect(() => renderToString(createElement(InazumaScreen))).not.toThrow()

    const save = createSave(4242)
    for (const phase of ['map', 'squad', 'shop', 'victory', 'gameover'] as const) {
      useInazuma.setState({ save, hasSave: true, phase })
      expect(() => renderToString(createElement(InazumaScreen)), phase).not.toThrow()
    }

    // Previa y partido: se juega hasta el pitido final pasando por al menos una
    // jugada clave, que es donde vive el panel de decisión.
    const node = save.offer[0]
    useInazuma.setState({ save, matchNode: node, phase: 'preview' })
    expect(() => renderToString(createElement(InazumaScreen))).not.toThrow()

    const setup = startMatch(save, node)
    if ('error' in setup) throw new Error(setup.error)
    let decisions = 0
    let guard = 0
    while (setup.match.phase !== 'finished' && guard++ < 5000) {
      useInazuma.setState({ match: setup.match, feed: setup.match.events.slice(), phase: 'match' })
      expect(() => renderToString(createElement(InazumaScreen))).not.toThrow()
      if (setup.match.phase === 'decision') {
        decisions++
        chooseOption(setup.match, setup.rng, setup.match.decision!.options[0].id)
      } else {
        advance(setup.match, setup.rng)
      }
    }
    expect(setup.match.phase).toBe('finished')
    expect(decisions).toBeGreaterThan(0)

    // Y el resumen post-partido con sus cartas de recompensa.
    useInazuma.setState({
      save: { ...save, lastMatch: { rival: 'Instituto Occult', score: [2, 1], result: 'win', scorers: ['Axel Blaze'] } },
      match: null,
      draft: buildDraft(save, new RNG(1)),
      draftPicks: 1,
      phase: 'draft',
    })
    expect(() => renderToString(createElement(InazumaScreen))).not.toThrow()
  })
})
