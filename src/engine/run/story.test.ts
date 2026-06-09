import { describe, it, expect } from 'vitest'
import { createRun } from './runEngine'
import { generateStoryMap } from './storyMap'
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
