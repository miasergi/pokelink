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
import PartyScreen from '@/ui/screens/PartyScreen'
import PicoloView from '@/ui/party/PicoloView'
import YoNuncaView from '@/ui/party/YoNuncaView'
import BotellaView from '@/ui/party/BotellaView'
import KingsView from '@/ui/party/KingsView'
import OcaView from '@/ui/party/OcaView'
import { useCyber } from '@/state/cyberStore'
import { createAdventure } from '@/engine/cyber/cyberEngine'
import InazumaScreen from '@/ui/screens/InazumaScreen'
import DragonScreen from '@/ui/screens/DragonScreen'
import { useDragon } from '@/state/dragonStore'
import { createSave as createDragonSave, startNodeBattle } from '@/engine/dragon/run'
// Alias: `advance` ya está cogido por el motor de Inazuma en este fichero.
import { advance as advanceDragon } from '@/engine/dragon/battle'
import { useInazuma } from '@/state/inazumaStore'
import { createSave, startMatch } from '@/engine/inazuma/game'
import { actorByUid, advance, chooseOption } from '@/engine/inazuma/match'
import { signatureNext } from '@/engine/inazuma/game'
import { buildSingleReward } from '@/engine/inazuma/rewards'
import { RNG } from '@/utils/rng'
import { rivalStartingXI } from '@/engine/inazuma/roster'
import { getPlayerBase } from '@/data/inazuma/players'
import { EVENTS } from '@/data/inazuma/events'
import { TECHNIQUES } from '@/data/inazuma/techniques'

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
function mountSettled(Comp: () => JSX.Element | null, ms = 9000): string {
  vi.useFakeTimers()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => { root.render(createElement(Comp)) })
  // EN PASOS: un solo advanceTimersByTime(ms) NO dispara los timers que
  // programan los EFECTOS de componentes montados a mitad del avance (la
  // celebración de gol montaba a los 1.9s y su cierre quedaba sin correr:
  // el overlay se quedaba «para siempre» y el panel de decisión no salía).
  for (let t = 0; t < ms; t += 1000) act(() => { vi.advanceTimersByTime(1000) })
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

  it('La Previa: hub y los cinco juegos montan', () => {
    useGame.setState({ loaded: true, screen: { name: 'party' } })
    // Sin cuadrilla: el hub debe montar y avisar de apuntar nombres.
    localStorage.removeItem('pokerogue:party-players')
    expect(mount(PartyScreen)).toContain('La Previa')
    // Con cuadrilla: cada juego monta su portada/tablero.
    localStorage.setItem('pokerogue:party-players', JSON.stringify(['Ana', 'Bea', 'Carlos']))
    const players = ['Ana', 'Bea', 'Carlos']
    expect(mount(() => createElement(PicoloView, { players, onBack: () => {} }))).toContain('ronda')
    expect(mount(() => createElement(YoNuncaView, { onBack: () => {} }))).toContain('bebe')
    expect(mount(() => createElement(BotellaView, { players, onBack: () => {} }))).toContain('botella')
    expect(mount(() => createElement(KingsView, { onBack: () => {} }))).toContain('rey')
    expect(mount(() => createElement(OcaView, { players, onBack: () => {} }))).toContain('Tirar')
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
    // La primera tienda vende lo asequible: las pociones estándar.
    expect(shop).toContain('Poción de PT')

    // Mochila con contenido: objetos y supertécnicas, cada una con su nombre.
    useInazuma.setState({
      save: {
        ...save,
        bag: ['emblema-fuego', 'mejora', 'manual-avanzado'],
        techniqueBag: [TECHNIQUES[0].id],
        playerStats: { [save.roster[0].uid]: { goals: 3, saves: 5, duelsWon: 9, duelsLost: 4, matches: 2 } },
      },
      phase: 'bag',
    })
    const bag = mount(InazumaScreen)
    expect(bag).toContain('Emblema de Fuego')
    // Las técnicas sueltas están suprimidas: si una partida vieja aún guarda
    // alguna, la mochila ofrece convertirla en Manual avanzado.
    expect(bag).toContain('suelta')

    useInazuma.setState({ phase: 'stats' })
    expect(mount(InazumaScreen)).toContain(getPlayerBase(save.roster[0].baseId).name)

    // El mapa de un tramo avanzado, para que se pinten casillas pasadas,
    // actuales y futuras a la vez.
    useInazuma.setState({ save: { ...save, layer: 6 }, phase: 'map' })
    expect(() => mount(InazumaScreen)).not.toThrow()
    useInazuma.setState({ save, phase: 'map' })

    // La RUEDA DE ENTRENAMIENTO (la casilla que sustituye a la pachanga):
    // los cuatro planes a la vista, y el intensivo pide elegir víctima.
    const entrenoNode = save.map.layers[0].map((id) => save.map.nodes[id]).find((n) => n.kind === 'entrenamiento')!
    expect(entrenoNode, 'la capa 0 no trae rueda de entrenamiento').toBeDefined()
    useInazuma.setState({ save, matchNode: entrenoNode, phase: 'entreno' })
    const entreno = mount(InazumaScreen)
    expect(entreno).toContain('Intensivo a uno')
    expect(entreno).toContain('Recuperación total')
    useInazuma.setState({ matchNode: null })

    // Previa del instituto: su once, en formato alineación.
    const node = Object.values(save.map.nodes).find((n) => n.kind === 'jefe')!
    useInazuma.setState({ save, matchNode: node, phase: 'preview' })
    const preview = mount(InazumaScreen)
    for (const p of rivalStartingXI(node.teamId!)) {
      expect(preview).toContain(p.name.split(' ')[0])
    }
    // Los BANQUILLOS también se ven en la previa (el rival y el tuyo).
    expect(preview).toContain('Banquillo')

    // CASILLA DE SUPERTÉCNICA ESPECIAL: con cadena por despertar Y técnicas
    // mejorables, ofrece LAS DOS (antes imponía despertar hasta completar la
    // cadena y no había forma de reforzar la técnica que de verdad usas).
    {
      const firmaNode = Object.values(save.map.nodes).find((n) => n.kind === 'firma')
        ?? { ...Object.values(save.map.nodes)[0], kind: 'firma' as const }
      // Un jugador con un paso despertado (mejorable) y cadena por delante.
      const conAmbas = save.roster.map((p) => {
        const chain = getPlayerBase(p.baseId).signature ?? []
        return chain.length >= 2 ? { ...p, rarity: 4, level: 40, techniques: [chain[0]] } : p
      })
      useInazuma.setState({
        save: { ...save, roster: conAmbas },
        matchNode: firmaNode,
        phase: 'firma',
      })
      // Y al TOCAR la fila sale el menú de las dos vías, no se ejecuta a
      // ciegas la que al juego le parezca.
      const host = document.createElement('div')
      document.body.appendChild(host)
      const root = createRoot(host)
      act(() => { root.render(createElement(InazumaScreen)) })
      const firma = host.textContent ?? ''
      expect(firma).toContain('Despierta')
      expect(firma).toContain('mejora')
      const fila = [...host.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes('Despierta'))
      expect(fila, 'no hay ninguna fila accionable').toBeDefined()
      act(() => { fila!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
      const menu = host.textContent ?? ''
      expect(menu, 'tocar la fila no ofrece elegir').toContain('¿Qué entrena')
      expect(menu).toContain('Despertar')
      expect(menu).toContain('Mejorar')
      act(() => { root.unmount() })
      host.remove()
      useInazuma.setState({ save, matchNode: null, phase: 'map' })
    }

    // EL CRONÓMETRO corre a un minuto por segundo real y se PARA cuando hay
    // una cinemática en pantalla (`uiBusy`), que es lo que se pidió para las
    // supertécnicas.
    {
      const live = startMatch(save, node)
      if ('error' in live) throw new Error(live.error)
      useInazuma.setState({ match: live.match, feed: live.match.events.slice(), phase: 'match', playing: true, clock: 0, uiBusy: false })
      vi.useFakeTimers()
      const host = document.createElement('div')
      document.body.appendChild(host)
      const root = createRoot(host)
      act(() => { root.render(createElement(InazumaScreen)) })
      act(() => { useInazuma.getState().tick() })
      act(() => { vi.advanceTimersByTime(3000) })
      const corriendo = useInazuma.getState().clock
      expect(corriendo, 'el cronómetro no avanza').toBeGreaterThan(1)
      // Con cinemática en pantalla, el reloj se planta.
      act(() => { useInazuma.getState().setUiBusy(true) })
      act(() => { vi.advanceTimersByTime(3000) })
      expect(useInazuma.getState().clock, 'el cronómetro no se para en las cinemáticas')
        .toBeCloseTo(corriendo, 5)
      act(() => { useInazuma.getState().setUiBusy(false) })
      act(() => { root.unmount() })
      host.remove()
      vi.useRealTimers()
      useInazuma.setState({ playing: false, uiBusy: false })
    }

    // EL RONDO corre aunque el MOTOR ya esté en «decision»: el motor entra en
    // esa fase nada más generar la siguiente jugada — AL PRINCIPIO de la
    // espera — y lo que congela el campo es el PANEL en pantalla, no la fase.
    // La condición vieja apagaba el rondo en modo dinámico y el césped se
    // quedaba quieto minutos enteros.
    {
      const live = startMatch(save, node)
      if ('error' in live) throw new Error(live.error)
      const rng3 = new RNG(31)
      for (let i = 0; i < 200 && !(live.match.phase === 'decision' && live.match.events.some((e) => e.kind === 'duel')); i++) {
        if (live.match.phase === 'decision') chooseOption(live.match, rng3, live.match.decision!.options[0].id)
        else advance(live.match, rng3)
      }
      expect(live.match.phase).toBe('decision')
      // Feed SIN el último evento: el panel aún no puede mostrarse.
      useInazuma.setState({
        match: live.match,
        feed: live.match.events.slice(0, live.match.events.length - 1),
        phase: 'match',
        playing: false,
      })
      vi.useFakeTimers()
      const host = document.createElement('div')
      document.body.appendChild(host)
      const root = createRoot(host)
      act(() => { root.render(createElement(InazumaScreen)) })
      const spots = () => [...host.querySelectorAll<HTMLElement>('[style*="left"]')]
        .map((e) => `${e.style.left},${e.style.top}`).join('|')
      act(() => { vi.advanceTimersByTime(4000) })
      const a = spots()
      act(() => { vi.advanceTimersByTime(4000) })
      const b = spots()
      act(() => { root.unmount() })
      host.remove()
      vi.useRealTimers()
      expect(a, 'el rondo no corre con el motor en decision').not.toBe(b)
    }

    // EL PARTIDO NO VA POR TURNOS: sin que llegue ni un evento nuevo, el
    // césped se mueve solo (la jugada avanza y luego el balón circula). Si
    // esto se rompe, el campo vuelve a quedarse congelado entre eventos —
    // que es justo lo que se veía como «juego por turnos».
    {
      const live = startMatch(save, node)
      if ('error' in live) throw new Error(live.error)
      const rng2 = new RNG(9)
      // Se avanza hasta tener un duelo revelado (algo que pintar en el campo).
      for (let i = 0; i < 60 && !live.match.events.some((e) => e.kind === 'duel'); i++) {
        if (live.match.phase === 'decision') chooseOption(live.match, rng2, live.match.decision!.options[0].id)
        else advance(live.match, rng2)
      }
      // `playing: false` A PROPÓSITO: con la retransmisión parada el feed NO
      // puede cambiar, así que si el campo se mueve es porque se mueve SOLO —
      // que es justo lo que se quiere demostrar.
      useInazuma.setState({ match: live.match, feed: live.match.events.slice(), phase: 'match', playing: false })
      vi.useFakeTimers()
      const host = document.createElement('div')
      document.body.appendChild(host)
      const root = createRoot(host)
      act(() => { root.render(createElement(InazumaScreen)) })
      const spots = () => [...host.querySelectorAll<HTMLElement>('[style*="left"]')]
        .map((e) => `${e.style.left},${e.style.top}`).join('|')
      const before = spots()
      act(() => { vi.advanceTimersByTime(1500) })
      const mid = spots()
      act(() => { vi.advanceTimersByTime(6000) })
      const later = spots()
      act(() => { root.unmount() })
      host.remove()
      vi.useRealTimers()
      expect(before, 'el campo no se mueve mientras avanza la jugada').not.toBe(mid)
      expect(mid, 'el campo se congela al terminar de avanzar la jugada').not.toBe(later)
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
      // El campo espeja SIEMPRE el último duelo: si la última línea es un
      // duelo, su cinemática está en pantalla y el césped acompaña ESE
      // emparejamiento; si es otra cosa (pase, posesión), manda el duelo
      // anterior. En ambos casos: el último duelo del feed.
      for (let i = evs.length - 1; i >= 0; i--) {
        const e = evs[i]
        if (e.kind === 'duel') { lastDuel = e; break }
        if (e.kind === 'goal' || e.kind === 'kickoff') break
      }
      // Con DECISIÓN a la vista el campo pinta el emparejamiento de la
      // decisión (no el último duelo): esa pareja se comprueba más abajo en el
      // montaje asentado. Aquí solo el caso «jugada en curso».
      if (lastDuel && setup.match.phase !== 'decision') {
        // En el campo caben los nombres de pila; el completo va en el ticker
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
    expect(firma).toContain('Supertécnica Especial')
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
  /**
   * Dragon Ball Rogue: mismo criterio que Inazuma — montar de verdad cada fase
   * y comprobar el TEXTO, que es lo único que demuestra que la vista responde
   * al estado del motor y no a los valores iniciales del store.
   */
  it('Dragon Ball Rogue: cada fase pinta lo suyo y el combate narra lo que pasa', () => {
    useGame.setState({ loaded: true, screen: { name: 'dragon' } })
    const save = createDragonSave(4242, { starter: 'piccolo' })

    for (const phase of ['title', 'intro', 'map', 'team', 'wish', 'victory', 'gameover'] as const) {
      useDragon.setState({ save, hasSave: true, phase, battle: null, node: null, outcome: null })
      expect(() => mount(DragonScreen), phase).not.toThrow()
    }

    // El mapa nombra la saga y ofrece las casillas del tramo con su etiqueta.
    useDragon.setState({ save, hasSave: true, phase: 'map' })
    const map = mount(DragonScreen)
    expect(map).toContain('Los Saiyans')
    // El tablero dice QUÉ ES cada casilla con todas sus letras: sin eso no se
    // entiende el mapa, que fue justo la queja de la primera versión.
    expect(map).toContain('Tramo 1')
    expect(map).toMatch(/Combate|Aliado|Entreno|Bola|Maestro|Tienda|Descanso/)
    // La barra de equipo va bajo el mapa con el NIVEL de cada luchador y los
    // huecos libres, para no tener que entrar a ninguna pantalla a mirarlo.
    expect(map).toContain('Piccolo')
    expect(map).toContain('libre')

    // El equipo: el inicial (se empieza SOLO con él), el TOPE a la vista y los
    // huecos libres, que es lo que explica el tope sin contarlo.
    useDragon.setState({ phase: 'team' })
    const team = mount(DragonScreen)
    expect(team).toContain('Piccolo')
    expect(team, 'el tope de equipo tiene que verse').toContain('de 4 luchadores')
    expect(team, 'los huecos libres explican el tope sin contarlo').toContain('Hueco libre')

    // Y la bolsa separa lo que se lleva puesto de lo que se gasta, diciendo
    // qué hace cada objeto en números.
    useDragon.setState({
      save: { ...save, bag: { guantes: 1, semilla: 2 } },
      phase: 'team',
    })
    const bolsa = mount(DragonScreen)
    expect(bolsa).toContain('Bolsa')

    // Tocar una casilla abre su previa SOBRE el mapa (modal, no otra pantalla)
    // y explica qué te llevas antes de entrar.
    const nodo = save.map.find((n) => n.kind === 'combate' || n.kind === 'elite')!
    useDragon.setState({ node: nodo, phase: 'node' })
    const previa = mount(DragonScreen)
    expect(previa).toContain('tu equipo')
    expect(previa).toMatch(/niveles/)

    // Y el combate: se monta, narra y ofrece la jugada del asalto. Ojo, la
    // retransmisión se revela poco a poco (`revealed`), así que las opciones
    // solo salen cuando ya se ha contado todo lo anterior.
    const battle = startNodeBattle(save, nodo, new RNG(9))
    advanceDragon(battle)
    useDragon.setState({ battle, node: nodo, phase: 'battle', revealed: battle.log.length })
    const fight = mount(DragonScreen)
    expect(fight).toContain('Piccolo')
    expect(fight).toContain('Cuerpo a cuerpo')
    expect(fight).toContain('Concentrar ki')
    expect(fight).toContain('Cubrirse')

    // El deseo de las siete bolas enseña las cinco opciones.
    useDragon.setState({ save: { ...save, balls: 7 }, battle: null, phase: 'wish' })
    expect(mount(DragonScreen)).toContain('Las siete esferas')
  })
})
