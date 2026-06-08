import { describe, it, expect } from 'vitest'
import { createRun, availableNextNodes, enterNode, startNodeBattle, applyBattleOutcome, resolveEvent, resolveTrade } from './runEngine'
import { EVENTS } from './nodes'
import { runElapsedMs, commitElapsed } from './playtime'
import { checkAchievements } from './achievements'
import type { MetaRecord } from '@/persistence/db'
import { getSpecies } from '@/data'

describe('todas las generaciones', () => {
  it('cada generación (1-9) crea una run válida (IDs y rosters correctos)', () => {
    const starters: Record<number, number> = {
      1: 1, 2: 152, 3: 252, 4: 387, 5: 495, 6: 650, 7: 722, 8: 810, 9: 906,
    }
    for (let gen = 1; gen <= 9; gen++) {
      const run = createRun({ pools: [gen], random: false, difficulty: 'normal', gen, starterId: starters[gen], seed: 1000 + gen })
      const types = Object.values(run.map.nodes).map((n) => n.type)
      expect(types.filter((t) => t === 'gym')).toHaveLength(8)
      expect(types.filter((t) => t === 'elite')).toHaveLength(4)
      expect(types.filter((t) => t === 'champion')).toHaveLength(1)
      // todos los equipos de jefe deben tener instancias (species válidas)
      for (const n of Object.values(run.map.nodes)) {
        if (n.content.kind === 'trainer') {
          expect(n.content.team.length).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('Modo Random', () => {
  it('randomiza especies pero mantiene la estructura/niveles', () => {
    const real = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 4, seed: 42 })
    const rand = createRun({ pools: [1], random: true, difficulty: 'normal', gen: 1, starterId: 4, seed: 42 })
    // misma estructura
    expect(Object.keys(rand.map.nodes).length).toBe(Object.keys(real.map.nodes).length)
    // los equipos de jefe tienen las mismas posiciones/niveles pero (casi siempre)
    // especies distintas
    const realGym = Object.values(real.map.nodes).find((n) => n.type === 'gym')!
    const randGym = Object.values(rand.map.nodes).find((n) => n.type === 'gym')!
    if (realGym.content.kind === 'trainer' && randGym.content.kind === 'trainer') {
      expect(randGym.content.team.length).toBe(realGym.content.team.length)
      expect(randGym.content.team.map((m) => m.level)).toEqual(realGym.content.team.map((m) => m.level))
      const sameSpecies = randGym.content.team.every((m, i) => m.speciesId === (realGym.content as { team: typeof randGym.content.team }).team[i].speciesId)
      expect(sameSpecies).toBe(false)
    }
  })
})

describe('Modo Random por categorías', () => {
  it('randomizar solo salvajes deja intactos los equipos de jefe', () => {
    const base = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 4, seed: 7 })
    const wildOnly = createRun({ pools: [1], random: true, randomFlags: { starters: false, wild: true, trainers: false, elite: false }, difficulty: 'normal', gen: 1, starterId: 4, seed: 7 })
    const gymBase = Object.values(base.map.nodes).find((n) => n.type === 'gym')!
    const gymRand = Object.values(wildOnly.map.nodes).find((n) => n.type === 'gym')!
    if (gymBase.content.kind === 'trainer' && gymRand.content.kind === 'trainer') {
      // los jefes NO se tocan si solo randomizamos salvajes
      expect(gymRand.content.team.map((m) => m.speciesId)).toEqual(gymBase.content.team.map((m) => m.speciesId))
    }
    // pero algún salvaje sí cambia
    const wildIds = (run: typeof base) => Object.values(run.map.nodes).filter((n) => n.type === 'battle' && n.content.kind === 'wild').map((n) => (n.content as { enemy: { speciesId: number } }).enemy.speciesId)
    expect(wildIds(wildOnly)).not.toEqual(wildIds(base))
  })
})

describe('Modo Monolocke', () => {
  it('todas las capturas son del tipo elegido', () => {
    const mono = createRun({ pools: [1], random: false, monotype: 'water', difficulty: 'normal', gen: 1, starterId: 7, seed: 31 })
    const catches = Object.values(mono.map.nodes).filter((n) => n.content.kind === 'catch')
    expect(catches.length).toBeGreaterThan(0)
    for (const n of catches) {
      if (n.content.kind !== 'catch') continue
      for (const o of n.content.offers) {
        expect(getSpecies(o.speciesId).types).toContain('water')
      }
    }
  })
})

describe('Eventos: objetos prometidos se entregan', () => {
  const freshRun = () => createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 1, seed: 4242 })
  const asEventNode = (run: ReturnType<typeof freshRun>, eventId: string) => {
    const node = run.map.nodes[Object.keys(run.map.nodes)[0]]
    node.content = { kind: 'event', eventId }
    node.cleared = false
    return node
  }

  it('Aguas termales entrega de verdad los Restos que promete', () => {
    const run = freshRun()
    resolveEvent(run, asEventNode(run, 'hot_spring'), 0)
    expect(run.inventory['leftovers'] ?? 0).toBeGreaterThan(0)
  })

  it('toda opción con efecto «item» entrega exactamente ese objeto', () => {
    for (const def of Object.values(EVENTS)) {
      def.options.forEach((opt, i) => {
        if (opt.effect.kind !== 'item') return
        const run = freshRun()
        const before = run.inventory[opt.effect.itemId] ?? 0
        resolveEvent(run, asEventNode(run, def.id), i)
        expect(run.inventory[opt.effect.itemId] ?? 0).toBe(before + opt.effect.qty)
      })
    }
  })
})

describe('Intercambio: el objeto equipado vuelve a la mochila', () => {
  it('al intercambiar un Pokémon con objeto, el objeto no se pierde', () => {
    const run = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 1, seed: 9 })
    run.party[0].heldItemId = 'leftovers'
    run.money = 99_999
    const node = run.map.nodes[Object.keys(run.map.nodes)[0]]
    node.content = { kind: 'trade', cost: 0 }
    node.cleared = false
    const res = resolveTrade(run, node, run.party[0].uid)
    expect(res).not.toBeNull()
    expect(run.inventory['leftovers'] ?? 0).toBeGreaterThan(0)
  })
})

describe('Cronómetro: solo tiempo de juego activo', () => {
  it('al reanudar NO cuenta el tiempo con la app cerrada', () => {
    const run = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 1, seed: 1 })
    // Simula una sesión de ~60 s y un guardado (volcado a elapsedMs).
    run.elapsedMs = 0
    run.startedAt = Date.now() - 60_000
    commitElapsed(run)
    expect(run.elapsedMs).toBeGreaterThanOrEqual(59_000)
    // Cierras el navegador y vuelves 1 h después: reanudar reinicia el ancla.
    run.startedAt = Date.now() // lo que hace resumeRun
    const total = runElapsedMs(run)
    expect(total).toBeGreaterThanOrEqual(59_000)
    expect(total).toBeLessThan(62_000) // ~60 s, NO +1 h
  })
})

describe('Logros: Reto diario', () => {
  const emptyMeta = (): MetaRecord => ({
    bestRuns: [], totals: { runs: 1, wins: 1, gymsDefeated: 8, pokemonCaught: 0 },
    pokedexSeen: [], pokedexCaught: [], pokedexShiny: [], alias: '', achievements: [], regionsWon: [], pet: null,
  })

  it('ganar un Reto diario concede el logro daily_win', () => {
    const run = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 1, seed: 1, daily: '2026-06-07' })
    run.status = 'won'; run.stats.gymsDefeated = 8
    const earned = checkAchievements(emptyMeta(), run, true, run.startedAt + 1000)
    expect(earned).toContain('daily_win')
  })

  it('una victoria NO diaria no concede daily_win', () => {
    const run = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 1, seed: 1 })
    run.status = 'won'; run.stats.gymsDefeated = 8
    const earned = checkAchievements(emptyMeta(), run, true, run.startedAt + 1000)
    expect(earned).not.toContain('daily_win')
  })
})

describe('creación de run y mapa', () => {
  it('crea una run jugable de Gen 1', () => {
    const run = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 4, seed: 123 })
    expect(run.party).toHaveLength(1)
    expect(run.party[0].speciesId).toBe(4)
    expect(run.party[0].level).toBe(5)
    expect(run.map.totalLayers).toBeGreaterThan(20)
    // rival con Squirtle (cuenta a Charmander)
    expect(run.rivalStarterId).toBe(7)
  })

  it('el mapa es totalmente conexo (cada nodo no final tiene salida)', () => {
    const run = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 1, seed: 7 })
    const { layers, nodes } = run.map
    for (let i = 0; i < layers.length - 1; i++) {
      for (const id of layers[i]) {
        expect(nodes[id].next.length).toBeGreaterThan(0)
        for (const nx of nodes[id].next) {
          expect(nodes[nx].layer).toBe(i + 1)
        }
      }
    }
    // último jefe es el campeón
    const last = layers[layers.length - 1]
    expect(last).toHaveLength(1)
    expect(nodes[last[0]].type).toBe('champion')
  })

  it('hay 8 gimnasios, 4 del alto mando y 1 campeón', () => {
    const run = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 7, seed: 99 })
    const types = Object.values(run.map.nodes).map((n) => n.type)
    expect(types.filter((t) => t === 'gym')).toHaveLength(8)
    expect(types.filter((t) => t === 'elite')).toHaveLength(4)
    expect(types.filter((t) => t === 'champion')).toHaveLength(1)
  })

  it('se puede entrar a un nodo y resolver un combate', () => {
    const run = createRun({ pools: [1], random: false, difficulty: 'normal', gen: 1, starterId: 4, seed: 555 })
    const first = availableNextNodes(run)
    expect(first.length).toBeGreaterThan(0)
    // navega hasta encontrar un nodo de combate
    let guard = 0
    let node = enterNode(run, first[0].id)
    while (!(node.type === 'battle' || node.type === 'trainer') && guard < 30) {
      const nexts = availableNextNodes(run)
      if (!nexts.length) break
      node = enterNode(run, nexts[0].id)
      guard++
    }
    if (node.type === 'battle' || node.type === 'trainer') {
      const result = startNodeBattle(run, node)
      const summary = applyBattleOutcome(run, node, result)
      expect(typeof summary.won).toBe('boolean')
    }
  })
})
