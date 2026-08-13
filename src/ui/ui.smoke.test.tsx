// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
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
import { createSave, startMatch, startPachanga } from '@/engine/inazuma/game'
import { actorByUid, advance, chooseOption } from '@/engine/inazuma/match'
import { signatureNext } from '@/engine/inazuma/game'
import { nextRound, shoot } from '@/engine/inazuma/pachanga'
import { buildSingleReward } from '@/engine/inazuma/rewards'
import { RNG } from '@/utils/rng'
import { rivalStartingXI } from '@/engine/inazuma/roster'
import { getPlayerBase } from '@/data/inazuma/players'
import { EVENTS } from '@/data/inazuma/events'
import { TECHNIQUES, techniqueStock } from '@/data/inazuma/techniques'

// jsdom no trae ni `scrollIntoView` ni `ResizeObserver`, y el tablero del mapa
// y la retransmisión los usan para medirse.
Element.prototype.scrollIntoView = () => {}
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

/**
 * Monta un componente DE VERDAD y devuelve su texto. Hace falta montar (y no
 * `renderToString`) para que los componentes lean el estado actual del store:
 * en servidor, zustand entrega el estado inicial.
 */
function mount(Comp: () => JSX.Element | null): string {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => { root.render(createElement(Comp)) })
  const out = host.textContent ?? ''
  act(() => { root.unmount() })
  host.remove()
  return out
}

/**
 * Igual que `mount`, pero dejando TERMINAR las animaciones (escenario de duelo,
 * celebración de gol) con timers falsos: el panel de decisión y el cierre del
 * partido esperan a que lo revelado esté al día y sin animación en pantalla —
 * que es exactamente lo que este montaje simula.
 */
function mountSettled(Comp: () => JSX.Element | null, ms = 8000): string {
  vi.useFakeTimers()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => { root.render(createElement(Comp)) })
  act(() => { vi.advanceTimersByTime(ms) })
  const out = host.textContent ?? ''
  act(() => { root.unmount() })
  host.remove()
  vi.useRealTimers()
  return out
}

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

  /**
   * OJO con `renderToString`: con un store de zustand devuelve el estado
   * INICIAL, así que por muchas fases que se pusieran en el store se acababa
   * pintando la pantalla de título una y otra vez. Este bloque monta de verdad
   * (createRoot + act) y comprueba el TEXTO que sale, que es lo único que
   * demuestra que la vista corresponde al estado del motor.
   */
  it('Inazuma Rogue: cada fase pinta lo suyo y el partido cuenta lo que pasa', () => {
    useGame.setState({ loaded: true, screen: { name: 'inazuma' } })
    const save = createSave(4242)

    for (const phase of ['map', 'squad', 'shop', 'bag', 'stats', 'album', 'victory', 'gameover'] as const) {
      useInazuma.setState({ save, hasSave: true, phase })
      expect(() => mount(InazumaScreen), phase).not.toThrow()
    }

    // La tienda vende material Y manuales de supertécnica, con su precio.
    useInazuma.setState({ save, matchNode: null, phase: 'shop' })
    const shop = mount(InazumaScreen)
    expect(shop).toContain('Manuales de supertécnica')
    for (const t of techniqueStock(save.seed, 0)) expect(shop).toContain(t.name)

    // Mochila con contenido: objetos y supertécnicas, cada una con su nombre.
    useInazuma.setState({
      save: {
        ...save,
        bag: ['botas-rayo', 'mejora', 'manual-avanzado'],
        techniqueBag: [TECHNIQUES[0].id],
        playerStats: { [save.roster[0].uid]: { goals: 3, saves: 5, duelsWon: 9, duelsLost: 4, matches: 2 } },
      },
      phase: 'bag',
    })
    const bag = mount(InazumaScreen)
    expect(bag).toContain('Botas Rayo')
    expect(bag).toContain(TECHNIQUES[0].name)

    useInazuma.setState({ phase: 'stats' })
    expect(mount(InazumaScreen)).toContain(getPlayerBase(save.roster[0].baseId).name)

    // El mapa de un tramo avanzado, para que se pinten casillas pasadas,
    // actuales y futuras a la vez.
    useInazuma.setState({ save: { ...save, layer: 6 }, phase: 'map' })
    expect(() => mount(InazumaScreen)).not.toThrow()
    useInazuma.setState({ save, phase: 'map' })

    // Pachanga: se juega entera y en cada ronda se ve quién tira y quién para.
    const pachNode = save.map.layers[0].map((id) => save.map.nodes[id]).find((n) => n.kind === 'pachanga')!
    const ps = startPachanga(save, pachNode)
    if ('error' in ps) throw new Error(ps.error)
    nextRound(ps.pachanga, ps.rng)
    let pGuard = 0
    while (ps.pachanga.phase !== 'finished' && pGuard++ < 50) {
      useInazuma.setState({ pachanga: ps.pachanga, matchNode: pachNode, phase: 'pachanga' })
      const html = mount(InazumaScreen)
      if (ps.pachanga.phase === 'decision' && ps.pachanga.pending) {
        expect(html).toContain(ps.pachanga.pending.shooter.name)
        expect(html).toContain(ps.pachanga.pending.keeper.name)
        shoot(ps.pachanga, ps.rng, ps.pachanga.options[0].id)
      }
      nextRound(ps.pachanga, ps.rng)
    }
    expect(ps.pachanga.phase).toBe('finished')
    useInazuma.setState({ pachanga: ps.pachanga, phase: 'pachanga' })
    expect(() => mount(InazumaScreen)).not.toThrow()
    useInazuma.setState({ pachanga: null })

    // Previa del instituto: su once, en formato alineación.
    const node = Object.values(save.map.nodes).find((n) => n.kind === 'jefe')!
    useInazuma.setState({ save, matchNode: node, phase: 'preview' })
    const preview = mount(InazumaScreen)
    for (const p of rivalStartingXI(node.teamId!)) {
      expect(preview).toContain(p.name.split(' ')[0])
    }

    // Partido: el campo tiene que contar la MISMA jugada que el motor.
    const setup = startMatch(save, node)
    if ('error' in setup) throw new Error(setup.error)
    let decisions = 0
    let guard = 0
    while (setup.match.phase !== 'finished' && guard++ < 5000) {
      useInazuma.setState({ match: setup.match, feed: setup.match.events.slice(), phase: 'match' })
      const html = mount(InazumaScreen)
      // El campo pinta el último DUELO revelado, no el `chain` vivo del motor
      // (que va por delante y destripaba el siguiente emparejamiento). Aquí el
      // feed está entero, así que el último duelo sin gol/saque posterior es
      // exactamente lo que tiene que verse.
      let lastDuel: { attackerUid: string; defenderUid: string } | null = null
      const evs = setup.match.events
      // La última línea, si abre escenario, está aún EN ANIMACIÓN (la vista la
      // oculta): el campo enseña el duelo anterior, igual que en pantalla.
      let end = evs.length
      const lastEv = evs[end - 1]
      if (lastEv?.kind === 'duel' && (lastEv.technique || lastEv.counter || lastEv.step === 'definicion')) end -= 1
      for (let i = end - 1; i >= 0; i--) {
        const e = evs[i]
        if (e.kind === 'duel') { lastDuel = e; break }
        if (e.kind === 'goal' || e.kind === 'kickoff') break
      }
      if (lastDuel) {
        // En el campo caben los nombres de pila; el completo va en la narración
        // y en el panel de decisión.
        const carrier = actorByUid(setup.match, lastDuel.attackerUid)!
        const marker = actorByUid(setup.match, lastDuel.defenderUid)!
        expect(html).toContain(carrier.name.split(' ')[0])
        expect(html).toContain(marker.name.split(' ')[0])
      }
      if (setup.match.phase === 'decision') {
        decisions++
        const d = setup.match.decision!
        // El panel de decisión espera a que la animación del último duelo
        // termine, así que se comprueba sobre el montaje «asentado».
        const settled = mountSettled(InazumaScreen)
        expect(settled).toContain(d.actorName)
        expect(settled).toContain(d.rivalName)
        chooseOption(setup.match, setup.rng, d.options[0].id)
      } else {
        advance(setup.match, setup.rng)
      }
    }
    expect(setup.match.phase).toBe('finished')
    expect(decisions).toBeGreaterThan(0)

    // Casilla de firma: la lista de jugadores con su próxima técnica.
    const firmaNode = { ...node, kind: 'firma' as const }
    useInazuma.setState({ save, match: null, matchNode: firmaNode, phase: 'firma' })
    const firma = mount(InazumaScreen)
    expect(firma).toContain('Entrenamiento especial')
    // La próxima técnica de la cadena de Mark aparece por nombre (la cadena es
    // la real de la wiki, así que se resuelve dinámicamente).
    const mark = save.roster.find((p) => p.baseId === 'mark-evans')!
    const next = signatureNext(mark)!
    expect(firma).toContain(next.name)

    // Situación: la escena y todas sus opciones.
    useInazuma.setState({
      save, match: null, matchNode: { ...node, kind: 'evento', eventId: EVENTS[0].id }, phase: 'evento',
    })
    const ev = mount(InazumaScreen)
    expect(ev).toContain(EVENTS[0].title)
    for (const o of EVENTS[0].options) expect(ev).toContain(o.label)

    // Y la recompensa post-instituto: UNA carta, no tres.
    useInazuma.setState({
      save: { ...save, lastMatch: { rival: 'Instituto Occult', score: [2, 1], result: 'win', scorers: ['Axel Blaze'] } },
      match: null,
      matchNode: null,
      draft: [buildSingleReward(save, new RNG(1))],
      draftPicks: 1,
      phase: 'draft',
    })
    expect(() => mount(InazumaScreen)).not.toThrow()
  })
})
