import { describe, it, expect } from 'vitest'
import { createRun } from './runEngine'
import { generateStoryMap } from './storyMap'
import { createInstance } from '@/engine/team/instance'
import { RNG } from '@/utils/rng'

describe('Modo Historia — Capítulo 1', () => {
  it('createRun(story:1) crea una run del capítulo con su región', () => {
    const run = createRun({ gen: 1, pools: [1], random: false, starterId: 4, difficulty: 'normal', story: 1, seed: 123 })
    expect(run.story).toBe(1)
    expect(run.region).toBe('El Archipiélago de Niebla')
    expect(run.party).toHaveLength(1)
    expect(run.party[0].speciesId).toBe(4)
  })

  it('el mapa termina en un único jefe (El Capitán, tipo champion)', () => {
    const { map } = generateStoryMap(1, 4, new RNG(7), 'normal')
    const lastLayer = map.layers[map.layers.length - 1]
    expect(lastLayer).toHaveLength(1)
    const boss = map.nodes[lastLayer[0]]
    expect(boss.type).toBe('champion')
    expect(boss.content.kind).toBe('trainer')
    if (boss.content.kind === 'trainer') {
      expect(boss.content.trainer.name).toBe('El Capitán')
      expect(boss.content.team.length).toBeGreaterThan(0)
    }
    // todos los nodos no-último apuntan a algo (conectividad)
    for (let l = 0; l < map.layers.length - 1; l++) {
      for (const id of map.layers[l]) expect(map.nodes[id].next.length).toBeGreaterThan(0)
    }
  })

  it('el Capítulo 2 genera su propio mapa y jefe', () => {
    const run = createRun({ gen: 1, pools: [1], random: false, starterId: 1, difficulty: 'normal', story: 2, seed: 7 })
    expect(run.region).toBe('La Costa Prohibida')
    const last = run.map.layers[run.map.layers.length - 1]
    const boss = run.map.nodes[last[0]]
    expect(boss.type).toBe('champion')
    if (boss.content.kind === 'trainer') expect(boss.content.trainer.name).toBe('Comandante Vega')
    // el capítulo 2 es más largo que el 1
    expect(run.map.totalLayers).toBeGreaterThan(7)
  })
})

describe('Modo Historia — capítulos 3-6 y continuidad', () => {
  it('los capítulos nuevos generan su mapa con su jefe final', () => {
    const bosses: Record<number, string> = { 3: 'Dra. Lyra', 4: 'El Custodio', 5: 'Director Krell', 6: 'El Arquitecto' }
    for (const ch of [3, 4, 5, 6]) {
      const run = createRun({ gen: 1, pools: [1], random: false, starterId: 1, difficulty: 'normal', story: ch, seed: 11 + ch })
      const last = run.map.layers[run.map.layers.length - 1]
      const boss = run.map.nodes[last[0]]
      expect(boss.type).toBe('champion')
      if (boss.content.kind === 'trainer') expect(boss.content.trainer.name).toBe(bosses[ch])
    }
  })

  it('empezar de cero usa el nivel inicial del capítulo (starterLevel)', () => {
    const run = createRun({ gen: 1, pools: [1], random: false, starterId: 4, difficulty: 'normal', story: 3, starterLevel: 17, seed: 5 })
    expect(run.party[0].level).toBe(17)
  })

  it('continuar con el equipo del capítulo anterior lo conserva y lo cura', () => {
    const carried = createInstance(25, 22, new RNG(1)) // Pikachu del capítulo anterior
    carried.currentHp = 1
    const run = createRun({ gen: 1, pools: [1], random: false, starterId: 4, difficulty: 'normal', story: 3, party: [carried], seed: 5 })
    expect(run.party).toHaveLength(1)
    expect(run.party[0].speciesId).toBe(25)
    expect(run.party[0].level).toBe(22)
    expect(run.party[0].currentHp).toBe(run.party[0].stats.hp) // llega curado
  })

  it('la curva de cada capítulo empieza en su startLevel (no a nivel 5)', () => {
    const { map } = generateStoryMap(5, 1, new RNG(3), 'normal') // cap. 5: startLevel 33
    for (const id of map.layers[0]) expect(map.nodes[id].enemyLevel).toBeGreaterThanOrEqual(30)
  })
})
