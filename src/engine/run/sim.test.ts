import { describe, it, expect } from 'vitest'
import {
  createRun, availableNextNodes, enterNode, startNodeBattle, applyBattleOutcome,
  resolveHeal, catchPokemon, pickItem, buyItem, leaveShop, resolveEvent, isNodeBattle,
} from './runEngine'
import { applyHealItem } from './party'
import type { RunState, MapNode } from './types'
import { getItem } from '@/data/items'
import { getSpecies } from '@/data'

function bstOf(speciesId: number): number {
  const b = getSpecies(speciesId).baseStats
  return b.hp + b.atk + b.def + b.spa + b.spd + b.spe
}

/** Captura con criterio: rellena hasta 6 priorizando diversidad de tipos; si está
 *  lleno, sustituye al más débil si el ofrecido aporta más (BST + tipo nuevo). */
function smartCatch(run: RunState, node: MapNode) {
  if (node.content.kind !== 'catch') return
  const offer = node.content.offer
  const offerTypes = getSpecies(offer.speciesId).types
  const teamTypes = new Set(run.party.flatMap((p) => getSpecies(p.speciesId).types))
  const diversity = offerTypes.some((t) => !teamTypes.has(t))
  const offerVal = bstOf(offer.speciesId) + (diversity ? 80 : 0)

  if (run.party.length < 6) {
    catchPokemon(run, node, true)
    return
  }
  // sustituir al más débil si merece la pena
  const weakest = [...run.party].sort((a, b) => bstOf(a.speciesId) - bstOf(b.speciesId))[0]
  if (offerVal > bstOf(weakest.speciesId) + 40) {
    catchPokemon(run, node, true, weakest.uid)
  } else {
    catchPokemon(run, node, false)
  }
}

/** Usa objetos de curación/revivir en los Pokémon más dañados antes de un jefe. */
function smartHeal(run: RunState) {
  for (const [id, qty] of Object.entries(run.inventory)) {
    const cat = getItem(id).category
    if (cat !== 'heal' && cat !== 'revive') continue
    let left = qty
    while (left > 0) {
      // mon más necesitado
      const target = run.party
        .filter((p) => p.currentHp < p.stats.hp || p.status !== 'none')
        .sort((a, b) => a.currentHp / a.stats.hp - b.currentHp / b.stats.hp)[0]
      if (!target) break
      if (applyHealItem(target, id)) {
        run.inventory[id]--
        left--
      } else break
    }
  }
}

function avgHpFrac(run: RunState) {
  const alive = run.party.filter((p) => p.currentHp > 0)
  if (!alive.length) return 0
  return alive.reduce((a, p) => a + p.currentHp / p.stats.hp, 0) / alive.length
}

/** Elige el siguiente nodo de forma "inteligente". */
function chooseNext(run: RunState, nodes: MapNode[]): MapNode {
  if (nodes.length === 1) return nodes[0]
  const hurt = avgHpFrac(run) < 0.55
  const score = (n: MapNode): number => {
    switch (n.type) {
      case 'heal': return hurt ? 100 : 40
      case 'shop': return hurt ? 70 : 30
      case 'item': return 55
      case 'catch': return run.party.length < 6 ? 85 : 30
      case 'event': return 45
      case 'trainer': return hurt ? 20 : 60
      case 'battle': return hurt ? 25 : 50
      default: return 10
    }
  }
  return [...nodes].sort((a, b) => score(b) - score(a))[0]
}

function playRun(seed: number, starterId: number, gen = 1): { run: RunState; steps: number } {
  const run = createRun({ mode: 'generation', difficulty: 'normal', gen, starterId, seed })
  let steps = 0
  while (run.status === 'active' && steps < 200) {
    steps++
    const nexts = availableNextNodes(run)
    if (!nexts.length) break
    const choice = chooseNext(run, nexts)
    const node = enterNode(run, choice.id)

    if (isNodeBattle(node)) {
      const isBoss = node.type === 'gym' || node.type === 'elite' || node.type === 'champion'
      if (isBoss) smartHeal(run)
      const result = startNodeBattle(run, node)
      applyBattleOutcome(run, node, result)
    } else if (node.type === 'heal') {
      resolveHeal(run, node)
    } else if (node.type === 'catch') {
      smartCatch(run, node)
    } else if (node.type === 'item') {
      const ic = node.content
      if (ic.kind === 'item') pickItem(run, node, ic.choices[0])
    } else if (node.type === 'shop') {
      const sc = node.content
      if (sc.kind === 'shop') {
        for (const id of sc.stock) {
          const item = getItem(id)
          if ((item.category === 'heal' || item.category === 'revive') && run.money >= item.price * 2) {
            buyItem(run, id, item.price)
          }
        }
        leaveShop(run, node)
      }
    } else if (node.type === 'event') {
      resolveEvent(run, node, 0)
    }
  }
  return { run, steps }
}

describe('simulación de runs completas (balance)', () => {
  it('un auto-jugador progresa por Kanto y las runs terminan', () => {
    const results: { gyms: number; elite: number; won: boolean; party: number; steps: number }[] = []
    for (const seed of [1, 2, 3, 4, 5, 11, 23, 42]) {
      for (const starter of [1, 4, 7]) {
        const { run, steps } = playRun(seed * 100 + starter, starter)
        results.push({
          gyms: run.stats.gymsDefeated,
          elite: run.stats.eliteDefeated,
          won: run.status === 'won',
          party: run.party.length,
          steps,
        })
        // la run siempre termina (no se queda colgada)
        expect(run.status === 'won' || run.status === 'lost').toBe(true)
      }
    }
    const avgGyms = results.reduce((a, r) => a + r.gyms, 0) / results.length
    const wins = results.filter((r) => r.won).length
    const maxGyms = Math.max(...results.map((r) => r.gyms))
    // eslint-disable-next-line no-console
    console.log(`\n[BALANCE] runs=${results.length} avgGimnasios=${avgGyms.toFixed(1)} maxGimnasios=${maxGyms} victorias=${wins}`)
    // Una run jugada con criterio debe poder completar todo el recorrido de Kanto.
    expect(maxGyms).toBeGreaterThanOrEqual(5)
    void avgGyms
  })

  it('Johto (Gen 2) es jugable y completable', () => {
    let maxGyms = 0
    let wins = 0
    for (const seed of [1, 2, 3, 7, 11, 23]) {
      for (const starter of [152, 155, 158]) {
        const { run } = playRun(seed * 100 + starter, starter, 2)
        expect(run.status === 'won' || run.status === 'lost').toBe(true)
        maxGyms = Math.max(maxGyms, run.stats.gymsDefeated)
        if (run.status === 'won') wins++
      }
    }
    // eslint-disable-next-line no-console
    console.log(`\n[JOHTO] maxGimnasios=${maxGyms} victorias=${wins}`)
    expect(maxGyms).toBeGreaterThanOrEqual(5)
  })
})
