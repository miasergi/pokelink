import type { TrainerData } from '@/types'
import { RNG } from '@/utils/rng'
import { getSpecies } from '@/data'
import { createInstance } from '@/engine/team/instance'
import { buildRouteContent, connect, interpolateLevels, pickRouteType } from './mapGen'
import { STORY_CONTENT, type ChapterContent } from '@/data/story/content'
import type { MapNode, NodeContent, RunMap } from './types'

const SHOWDOWN = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`

/** Entrenador temático del capítulo (contrabandista, guardia, técnico…). */
function storyTrainer(content: ChapterContent, level: number, rng: RNG): NodeContent {
  const cls = rng.pick(content.classes)
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

/** Mapa de un capítulo del Modo Historia: travesía temática (salvajes + entrenadores
 *  del capítulo) que culmina en el jefe. Más corto que una run de región. */
export function generateStoryMap(chapterId: number, starterId: number, rng: RNG, difficulty: string): { map: RunMap } {
  void starterId
  const content = STORY_CONTENT[chapterId] ?? STORY_CONTENT[1]
  const pool = content.pool.map((id) => getSpecies(id))
  const plan: { boss?: boolean; width?: number; heal?: boolean }[] = [...content.layers, { boss: true }]
  const ACE = content.boss.aceLevel
  const anchors = plan.map((p) => (p.boss ? ACE : null))
  // Cada capítulo arranca a su nivel (continuidad: el cap. N empieza cerca de
  // donde terminó el N−1) y la curva sube hasta el ace del jefe.
  const levels = interpolateLevels(anchors, content.startLevel ?? 5)

  const layers: string[][] = []
  const nodes: Record<string, MapNode> = {}
  let seq = 0
  const newId = () => `n${seq++}`
  const usedEvents = new Set<string>()

  plan.forEach((p, layerIdx) => {
    const level = levels[layerIdx]
    const ids: string[] = []
    if (p.boss) {
      const specs = content.boss.team
      const n = specs.length
      const team = specs.map((id, i) => createInstance(id, Math.max(5, ACE - (n - 1 - i) * 2), rng))
      const id = newId()
      nodes[id] = { id, layer: layerIdx, col: 0, type: 'champion', next: [], enemyLevel: ACE, content: { kind: 'trainer', trainer: content.boss.trainer, team }, cleared: false }
      ids.push(id)
    } else {
      const w = p.width ?? 3
      const healCol = p.heal ? rng.int(0, w - 1) : -1
      for (let c = 0; c < w; c++) {
        const type = c === healCol ? 'heal' : pickRouteType(rng, layerIdx / plan.length)
        const id = newId()
        const nc: NodeContent =
          type === 'heal' ? { kind: 'heal' }
            : type === 'trainer' ? storyTrainer(content, level, rng)
              : buildRouteContent(type, pool, level, layerIdx / plan.length, rng, usedEvents, difficulty, ACE, pool, 1)
        nodes[id] = { id, layer: layerIdx, col: c, type, next: [], enemyLevel: level, content: nc, cleared: false }
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
