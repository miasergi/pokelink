import { describe, it, expect } from 'vitest'
import { createRun, availableNextNodes, enterNode, startNodeBattle, applyBattleOutcome } from './runEngine'

describe('creación de run y mapa', () => {
  it('crea una run jugable de Gen 1', () => {
    const run = createRun({ mode: 'generation', difficulty: 'normal', gen: 1, starterId: 4, seed: 123 })
    expect(run.party).toHaveLength(1)
    expect(run.party[0].speciesId).toBe(4)
    expect(run.party[0].level).toBe(5)
    expect(run.map.totalLayers).toBeGreaterThan(20)
    // rival con Squirtle (cuenta a Charmander)
    expect(run.rivalStarterId).toBe(7)
  })

  it('el mapa es totalmente conexo (cada nodo no final tiene salida)', () => {
    const run = createRun({ mode: 'generation', difficulty: 'normal', gen: 1, starterId: 1, seed: 7 })
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
    const run = createRun({ mode: 'generation', difficulty: 'normal', gen: 1, starterId: 7, seed: 99 })
    const types = Object.values(run.map.nodes).map((n) => n.type)
    expect(types.filter((t) => t === 'gym')).toHaveLength(8)
    expect(types.filter((t) => t === 'elite')).toHaveLength(4)
    expect(types.filter((t) => t === 'champion')).toHaveLength(1)
  })

  it('se puede entrar a un nodo y resolver un combate', () => {
    const run = createRun({ mode: 'generation', difficulty: 'normal', gen: 1, starterId: 4, seed: 555 })
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
