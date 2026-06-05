import { describe, it, expect } from 'vitest'
import {
  createRun, availableNextNodes, enterNode, startNodeBattle, applyBattleOutcome,
  resolveHeal, catchPokemon, pickItem, buyItem, leaveShop, resolveEvent, isNodeBattle,
} from './runEngine'
import { applyHealItem } from './party'
import { gainLevel, refreshMoves, effectiveTier } from '@/engine/team/leveling'
import type { RunState, MapNode } from './types'
import { getItem } from '@/data/items'
import { getSpecies } from '@/data'
import { typeEffectiveness } from '@/data/typechart'

function lead(run: RunState) { return run.party[0] }

/** Ordena el equipo para liderar con el mejor contador por tipo. */
function orderForBattle(run: RunState, node: MapNode) {
  const enemy = node.content.kind === 'wild' ? node.content.enemy : node.content.kind === 'trainer' ? node.content.team[0] : null
  if (!enemy) return
  const eTypes = getSpecies(enemy.speciesId).types
  const score = (m: RunState['party'][number]) => {
    if (m.currentHp <= 0) return -1000
    const tps = getSpecies(m.speciesId).types
    return Math.max(...tps.map((t) => typeEffectiveness(t, eTypes))) * 2
      - Math.max(...eTypes.map((t) => typeEffectiveness(t, tps)))
      + effectiveTier(m) * 0.5 + m.level * 0.02
  }
  run.party.sort((a, b) => score(b) - score(a))
}

/** Usa Mejoras y caramelos en el líder + cura antes de jefes. */
function manageItems(run: RunState, beforeBoss: boolean) {
  const inv = run.inventory
  const use = (id: string) => { if ((inv[id] || 0) > 0) { inv[id]--; return true } return false }
  // Mejora: sube el tier del líder al máximo posible.
  while ((inv['upgrade'] || 0) > 0 && effectiveTier(lead(run)) < 2) {
    use('upgrade'); lead(run).moveTier = effectiveTier(lead(run)) + 1; refreshMoves(lead(run))
  }
  // Caramelos al líder.
  while (use('rare-candy')) for (let i = 0; i < 3; i++) gainLevel(lead(run))
  while (use('super-candy')) for (let i = 0; i < 5; i++) gainLevel(lead(run))
  if (beforeBoss) {
    for (const [id, qty] of Object.entries(inv)) {
      const cat = getItem(id).category
      if (cat !== 'heal' && cat !== 'revive') continue
      let left = qty
      while (left > 0) {
        const t = run.party.filter((p) => p.currentHp < p.stats.hp).sort((a, b) => a.currentHp / a.stats.hp - b.currentHp / b.stats.hp)[0]
        if (!t || !applyHealItem(t, id)) break
        inv[id]--; left--
      }
    }
  }
}

function chooseNext(run: RunState, nodes: MapNode[]): MapNode {
  if (nodes.length === 1) return nodes[0]
  const hurt = run.party.filter((p) => p.currentHp > 0).reduce((a, p) => a + p.currentHp / p.stats.hp, 0) / Math.max(1, run.party.filter((p) => p.currentHp > 0).length) < 0.5
  const tbl: Record<string, number> = { heal: hurt ? 100 : 35, shop: 60, item: 80, catch: run.party.length < 6 ? 85 : 25, event: 40, trainer: 55, battle: 50 }
  const score = (n: MapNode) => tbl[n.type] ?? 10
  return [...nodes].sort((a, b) => score(b) - score(a))[0]
}

function playStrategic(seed: number, starterId: number, gen: number): RunState {
  const run = createRun({ pools: [gen], random: false, difficulty: 'normal', gen, starterId, seed })
  let steps = 0
  while (run.status === 'active' && steps++ < 250) {
    const nexts = availableNextNodes(run)
    if (!nexts.length) break
    const node = enterNode(run, chooseNext(run, nexts).id)
    if (isNodeBattle(node)) {
      const isBoss = ['gym', 'elite', 'champion', 'rival', 'legendary'].includes(node.type)
      manageItems(run, isBoss)
      orderForBattle(run, node)
      applyBattleOutcome(run, node, startNodeBattle(run, node))
    } else if (node.type === 'heal') resolveHeal(run, node)
    else if (node.type === 'catch') catchPokemon(run, node, run.party.length < 6)
    else if (node.type === 'item' && node.content.kind === 'item') pickItem(run, node, node.content.choices[0])
    else if (node.type === 'shop' && node.content.kind === 'shop') {
      for (const id of node.content.stock) {
        const it = getItem(id)
        if ((it.category === 'battle' || it.category === 'heal') && run.money >= it.price * 2) buyItem(run, id, it.price)
      }
      leaveShop(run, node)
    } else if (node.type === 'event') resolveEvent(run, node, 0)
  }
  return run
}

describe('E2E: run completa de principio a fin', () => {
  it('una run estratégica termina siempre y llega lejos en alguna semilla', () => {
    let maxGyms = 0, maxElite = 0, wins = 0, ended = 0
    for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
      for (const starter of [1, 4, 7]) {
        const run = playStrategic(seed * 10 + starter, starter, 1)
        expect(run.status === 'won' || run.status === 'lost').toBe(true) // termina, no se cuelga
        if (run.status === 'won' || run.status === 'lost') ended++
        maxGyms = Math.max(maxGyms, run.stats.gymsDefeated)
        maxElite = Math.max(maxElite, run.stats.eliteDefeated)
        if (run.status === 'won') wins++
      }
    }
    // eslint-disable-next-line no-console
    console.log(`\n[E2E] runs=24 terminadas=${ended} maxGimnasios=${maxGyms} maxAltoMando=${maxElite} victorias=${wins}`)
    expect(ended).toBe(24) // todas terminan sin colgarse
    expect(maxGyms).toBe(8) // alguna recorre los 8 gimnasios
  })

  it('completa el recorrido en las 9 regiones sin errores', () => {
    const starters: Record<number, number> = { 1: 4, 2: 155, 3: 255, 4: 390, 5: 498, 6: 653, 7: 725, 8: 813, 9: 909 }
    for (let gen = 1; gen <= 9; gen++) {
      const run = playStrategic(5000 + gen, starters[gen], gen)
      expect(run.status === 'won' || run.status === 'lost').toBe(true)
    }
  })
})
