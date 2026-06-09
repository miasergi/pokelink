import type { TrainerData } from '@/types'
import { RNG } from '@/utils/rng'
import { getSpecies } from '@/data'
import { createInstance } from '@/engine/team/instance'
import { buildRouteContent, connect, interpolateLevels, pickRouteType } from './mapGen'
import { ARCHIPELAGO_POOL, CHAPTER1_CLASSES, CHAPTER1_BOSS } from '@/data/story/chapter1'
import type { MapNode, NodeContent, RunMap } from './types'

const SHOWDOWN = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`

/** Entrenador temático del capítulo (contrabandista, marinero, guardia…). */
function storyTrainer(level: number, rng: RNG): NodeContent {
  const cls = rng.pick(CHAPTER1_CLASSES)
  const size = level < 12 ? 1 : level < 22 ? 2 : 3
  const team = Array.from({ length: size }, () => createInstance(rng.pick(cls.pool), Math.max(2, level + rng.int(-2, 0)), rng))
  const trainer: TrainerData = {
    id: `story-${level}-${rng.int(0, 9999)}`,
    name: cls.name,
    trainerClass: 'trainer',
    sprite: SHOWDOWN(cls.slug),
    reward: { money: 200 + level * 25 },
    team: [],
  }
  return { kind: 'trainer', trainer, team }
}

/** Mapa del Capítulo 1 «El Archipiélago de Niebla»: travesía hacia el ferry
 *  clandestino (rutas con salvajes costeros + contrabandistas/guardias) que
 *  culmina en el jefe El Capitán. Más corto que una run de región (es un capítulo). */
export function generateStoryMap(starterId: number, rng: RNG, difficulty: string): { map: RunMap } {
  void starterId
  const pool = ARCHIPELAGO_POOL.map((id) => getSpecies(id))
  // Plan: rutas (width) + jefe final. Una capa con cura garantizada antes del jefe.
  const plan: { boss?: boolean; width?: number; heal?: boolean }[] = [
    { width: 2 }, { width: 3 }, { width: 3, heal: true }, { width: 3 },
    { width: 3 }, { width: 2, heal: true }, { boss: true },
  ]
  const ACE = CHAPTER1_BOSS.aceLevel
  const anchors = plan.map((p) => (p.boss ? ACE : null))
  const levels = interpolateLevels(anchors, 5)

  const layers: string[][] = []
  const nodes: Record<string, MapNode> = {}
  let seq = 0
  const newId = () => `n${seq++}`
  const usedEvents = new Set<string>()

  plan.forEach((p, layerIdx) => {
    const level = levels[layerIdx]
    const ids: string[] = []
    if (p.boss) {
      const specs = CHAPTER1_BOSS.team
      const n = specs.length
      const team = specs.map((id, i) => createInstance(id, Math.max(5, ACE - (n - 1 - i) * 2), rng))
      const id = newId()
      nodes[id] = { id, layer: layerIdx, col: 0, type: 'champion', next: [], enemyLevel: ACE, content: { kind: 'trainer', trainer: CHAPTER1_BOSS.trainer, team }, cleared: false }
      ids.push(id)
    } else {
      const w = p.width ?? 3
      const healCol = p.heal ? rng.int(0, w - 1) : -1
      for (let c = 0; c < w; c++) {
        const type = c === healCol ? 'heal' : pickRouteType(rng, layerIdx / plan.length)
        const id = newId()
        const content: NodeContent =
          type === 'heal' ? { kind: 'heal' }
            : type === 'trainer' ? storyTrainer(level, rng)
              : buildRouteContent(type, pool, level, layerIdx / plan.length, rng, usedEvents, difficulty, ACE, pool, 1)
        nodes[id] = { id, layer: layerIdx, col: c, type, next: [], enemyLevel: level, content, cleared: false }
        ids.push(id)
      }
    }
    layers.push(ids)
  })

  for (let i = 0; i < layers.length - 1; i++) {
    connect(layers[i].map((id) => nodes[id]), layers[i + 1].map((id) => nodes[id]), rng)
  }

  return { map: { layers, nodes, totalLayers: plan.length } }
}
