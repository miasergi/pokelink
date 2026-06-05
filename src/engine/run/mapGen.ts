import type { PokemonInstance, PokemonType, SpeciesData, TrainerData } from '@/types'
import { RNG } from '@/utils/rng'
import { encounterPool, legendaryPool, ALL_SPECIES } from '@/data'
import { createInstance } from '@/engine/team/instance'
import { counterStarterId } from '@/data/trainers/gen1'
import { getRegion, buildRival } from '@/data/trainers/regions'
import { evolutionAtLevel, getFinalEvolution } from '@/engine/team/evolution'
import {
  makeWild, tierPool, itemChoices, shopStock, EVENT_IDS,
} from './nodes'
import type { GameMode, MapNode, NodeType, RunMap } from './types'

// Clases de entrenador genéricas con retrato real (Pokémon Showdown).
const SHOWDOWN_TRAINER = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`
// Cada clase de entrenador tiene una temática de tipo coherente.
const GENERIC_CLASSES: { slug: string; name: string; type: PokemonType }[] = [
  { slug: 'youngster', name: 'Joven', type: 'normal' },
  { slug: 'lass', name: 'Chica', type: 'normal' },
  { slug: 'bugcatcher', name: 'Cazabichos', type: 'bug' },
  { slug: 'hiker', name: 'Montañero', type: 'rock' },
  { slug: 'beauty', name: 'Modelo', type: 'fairy' },
  { slug: 'acetrainer', name: 'Entrenador Guay', type: 'flying' },
  { slug: 'acetrainerf', name: 'Entrenadora Guay', type: 'psychic' },
  { slug: 'blackbelt', name: 'Karateka', type: 'fighting' },
  { slug: 'sailor', name: 'Marinero', type: 'water' },
  { slug: 'pokemaniac', name: 'Pokémano', type: 'ground' },
  { slug: 'gambler', name: 'Apostador', type: 'fire' },
  { slug: 'juggler', name: 'Malabarista', type: 'psychic' },
  { slug: 'scientist', name: 'Científico', type: 'electric' },
  { slug: 'burglar', name: 'Ladrón', type: 'dark' },
  { slug: 'fisherman', name: 'Pescador', type: 'water' },
  { slug: 'biker', name: 'Motorista', type: 'poison' },
  { slug: 'gentleman', name: 'Caballero', type: 'normal' },
  { slug: 'supernerd', name: 'Empollón', type: 'electric' },
  { slug: 'camper', name: 'Excursionista', type: 'grass' },
  { slug: 'picnicker', name: 'Senderista', type: 'grass' },
]

interface LayerPlan {
  kind: 'route' | 'boss' | 'heal' | 'legendary'
  width?: number
  type?: NodeType
  bossIndex?: number
  trainer?: TrainerData
  legendarySpeciesId?: number
  level?: number
  /** Fuerza que uno de los nodos de la capa sea un Centro Pokémon (opción de cura). */
  withHeal?: boolean
}


export function generateMap(
  mode: GameMode,
  gen: number,
  starterId: number,
  rng: RNG,
): { map: RunMap; rivalStarterId: number } {
  const pool: SpeciesData[] = encounterPool(mode === 'generation' ? gen : 'all')
  const rivalStarterId = counterStarterId(starterId)
  const rivalFinalId = getFinalEvolution(rivalStarterId)
  const region = getRegion(gen)

  // --- Plan de capas (secuencia de la región) ---
  const plan: LayerPlan[] = []
  const gyms = region.gymLeaders
  let rivalStage = 0
  // Rutas anchas (3-4 nodos) y largas: la mayor parte del recorrido roguelike
  // transcurre entre líderes (capturas, objetos, entrenadores, eventos...).
  const routeWidth = () => rng.int(3, 4)

  const pushRoute = (n: number, healLast = false) => {
    for (let i = 0; i < n; i++) {
      plan.push({ kind: 'route', width: routeWidth(), withHeal: healLast && i === n - 1 })
    }
  }
  // Curva de niveles de jefes COHERENTE (no copia exacta de los juegos):
  // gimnasios 10→66, guardián legendario 70, Alto Mando 75/80/85/90, Campeón 100.
  const GYM_LEVELS = [10, 18, 26, 34, 42, 50, 58, 66]
  const ELITE_LEVELS = [75, 80, 85, 90]
  const CHAMPION_LEVEL = 100
  // Rivales situados ENTRE gimnasios -> nivel acorde a su posición en el mapa
  // (rival 1 entre gym0-1, rival 2 entre gym4-5, rival 3 tras gym7).
  const RIVAL_LEVELS = [14, 46, 70]
  const LEGENDARY_LEVEL = 62 // guardián entre gym6 y gym7

  const gym = (i: number) => plan.push({ kind: 'boss', type: 'gym', bossIndex: i, trainer: gyms[i], level: GYM_LEVELS[i] })
  const pushRival = () => {
    const level = RIVAL_LEVELS[Math.min(rivalStage, RIVAL_LEVELS.length - 1)]
    const extras = region.rivalExtras[Math.min(rivalStage, region.rivalExtras.length - 1)]
    rivalStage++
    const ridMid = evolutionAtLevel(rivalStarterId, level)
    plan.push({ kind: 'boss', type: 'rival', trainer: buildRival(region, ridMid, level, extras), level })
  }
  const elite = (i: number) => plan.push({ kind: 'boss', type: 'elite', bossIndex: i, trainer: region.eliteFour[i], level: ELITE_LEVELS[i] })
  const legends = legendaryPool(mode === 'generation' ? gen : 'all')
  const legendary = () => {
    const sp = rng.pick(legends)
    plan.push({ kind: 'legendary', type: 'legendary', legendarySpeciesId: sp.id, level: LEGENDARY_LEVEL })
  }

  // --- Recorrido de la región (con un Centro Pokémon como OPCIÓN antes de cada
  //     gimnasio: el último nodo de ruta antes del jefe ofrece curarse) ---
  pushRoute(6, true); gym(0)
  pushRoute(4); pushRival(); pushRoute(2, true); gym(1)
  pushRoute(5, true); gym(2)
  pushRoute(6, true); gym(3)
  pushRoute(5, true); gym(4)
  pushRoute(4); pushRival(); pushRoute(2, true); gym(5)
  pushRoute(5, true); gym(6)
  pushRoute(3); legendary(); pushRoute(2, true); gym(7)
  // Calle Victoria + Liga Pokémon (el Alto Mando y el Campeón curan al entrar)
  pushRoute(4); pushRival(); pushRoute(2, true)
  elite(0); elite(1); elite(2); elite(3)
  plan.push({ kind: 'boss', type: 'champion', trainer: region.buildChampion(rivalFinalId), level: CHAMPION_LEVEL })

  // --- Niveles ancla (interpolación de niveles de ruta) usando la curva ---
  const anchors: (number | null)[] = plan.map((p) =>
    (p.kind === 'boss' || p.kind === 'legendary') ? p.level ?? null : null,
  )
  const levels = interpolateLevels(anchors, 5)

  // --- Construcción de nodos por capa ---
  const layers: string[][] = []
  const nodes: Record<string, MapNode> = {}
  let nodeSeq = 0
  const newId = () => `n${nodeSeq++}`

  plan.forEach((p, layerIdx) => {
    const level = levels[layerIdx]
    const ids: string[] = []
    if (p.kind === 'route') {
      const w = p.width ?? 3
      // Si la capa garantiza cura, uno de los nodos será un Centro Pokémon.
      const healCol = p.withHeal ? rng.int(0, w - 1) : -1
      for (let c = 0; c < w; c++) {
        const type = c === healCol ? 'heal' : pickRouteType(rng, layerIdx / plan.length)
        const id = newId()
        nodes[id] = {
          id, layer: layerIdx, col: c, type, next: [], enemyLevel: level,
          content: type === 'heal' ? { kind: 'heal' } : buildRouteContent(type, pool, level, layerIdx / plan.length, rng),
          cleared: false,
        }
        ids.push(id)
      }
    } else if (p.kind === 'heal') {
      const id = newId()
      nodes[id] = {
        id, layer: layerIdx, col: 0, type: 'heal', next: [], enemyLevel: level,
        content: { kind: 'heal' }, cleared: false,
      }
      ids.push(id)
    } else if (p.kind === 'legendary') {
      const id = newId()
      const enemy = createInstance(p.legendarySpeciesId!, p.level ?? level, rng)
      nodes[id] = {
        id, layer: layerIdx, col: 0, type: 'legendary', next: [], enemyLevel: p.level ?? level,
        content: { kind: 'wild', enemy }, cleared: false,
      }
      ids.push(id)
    } else {
      // boss: re-nivela el equipo a la curva (el ace queda en p.level)
      const id = newId()
      const ace = p.level ?? level
      const specs = p.trainer!.team
      const n = specs.length
      const team = specs.map((spec, i) =>
        createInstance(spec.speciesId, Math.max(5, ace - (n - 1 - i) * 2), rng, {
          moveIds: spec.moveIds,
          heldItemId: spec.heldItemId ?? null,
        }),
      )
      nodes[id] = {
        id, layer: layerIdx, col: 0, type: p.type!, next: [], enemyLevel: ace,
        bossIndex: p.bossIndex,
        content: { kind: 'trainer', trainer: p.trainer!, team },
        cleared: false,
      }
      ids.push(id)
    }
    layers.push(ids)
  })

  // --- Conectividad entre capas ---
  for (let i = 0; i < layers.length - 1; i++) {
    connect(layers[i].map((id) => nodes[id]), layers[i + 1].map((id) => nodes[id]), rng)
  }

  // --- Modo Random: randomiza TODAS las especies (salvajes, entrenadores,
  //     jefes) manteniendo los NIVELES para conservar la coherencia. ---
  if (mode === 'random') {
    const randPool = ALL_SPECIES.filter((s) => !s.legendary && !s.isMega)
    const reroll = (mon: PokemonInstance, isLegendary: boolean): PokemonInstance =>
      createInstance(rng.pick(isLegendary ? legends : randPool).id, mon.level, rng)
    for (const node of Object.values(nodes)) {
      const c = node.content
      if (c.kind === 'wild') c.enemy = reroll(c.enemy, node.type === 'legendary')
      else if (c.kind === 'trainer') c.team = c.team.map((m) => reroll(m, false))
    }
  }

  return {
    map: { layers, nodes, totalLayers: layers.length },
    rivalStarterId,
  }
}

function interpolateLevels(anchors: (number | null)[], startLevel: number): number[] {
  const out = new Array(anchors.length).fill(0)
  let prevLevel = startLevel
  let prevIdx = -1
  for (let i = 0; i < anchors.length; i++) {
    if (anchors[i] !== null) {
      const target = anchors[i] as number
      const span = i - prevIdx
      for (let j = prevIdx + 1; j <= i; j++) {
        const t = (j - prevIdx) / span
        out[j] = Math.max(2, Math.round(prevLevel + (target - prevLevel) * t) - (anchors[j] === null ? 1 : 0))
      }
      prevLevel = target
      prevIdx = i
    }
  }
  // capas tras el último ancla
  for (let j = prevIdx + 1; j < anchors.length; j++) out[j] = prevLevel
  return out
}

function pickRouteType(rng: RNG, frac: number): NodeType {
  const r = rng.next()
  // pesos: battle 28, trainer 22, catch 15, item 11, shop 8, trade 6, event 10
  if (r < 0.28) return 'battle'
  if (r < 0.5) return 'trainer'
  if (r < 0.65) return 'catch'
  if (r < 0.76) return 'item'
  if (r < 0.84) return 'shop'
  if (r < 0.9) return 'trade'
  void frac
  return 'event'
}

function buildRouteContent(
  type: NodeType, pool: SpeciesData[], level: number, frac: number, rng: RNG,
): MapNode['content'] {
  switch (type) {
    case 'battle':
      return { kind: 'wild', enemy: makeWild(pool, level, rng) }
    case 'trainer':
      return synthTrainerContent(pool, level, rng)
    case 'catch':
      return { kind: 'catch', offer: makeWild(pool, level, rng) }
    case 'item':
      return { kind: 'item', choices: itemChoices(rng, frac) }
    case 'shop':
      return { kind: 'shop', stock: shopStock(rng, frac) }
    case 'event':
      return { kind: 'event', eventId: rng.pick(EVENT_IDS) }
    case 'trade':
      return { kind: 'trade', cost: 300 + level * 20 }
    default:
      return { kind: 'heal' }
  }
}

/** Entrenador genérico con temática de tipo coherente y equipo de ese tipo. */
function synthTrainerContent(pool: SpeciesData[], level: number, rng: RNG): MapNode['content'] {
  const cls = rng.pick(GENERIC_CLASSES)
  const trainer: TrainerData = {
    id: `trainer-${level}-${rng.int(0, 9999)}`,
    name: cls.name,
    trainerClass: 'trainer',
    specialtyType: cls.type,
    sprite: SHOWDOWN_TRAINER(cls.slug),
    reward: { money: 200 + level * 25 },
    team: [],
  }
  const tier = tierPool(pool, level)
  const size = level < 15 ? 1 : level < 35 ? 2 : 3
  // Filtra al tipo temático; si no hay suficientes, usa el pool general.
  const typed = tier.filter((s) => s.types.includes(cls.type))
  const usePool = typed.length >= size ? typed : tier
  const team: PokemonInstance[] = []
  for (let i = 0; i < size; i++) {
    const sp = rng.pick(usePool)
    team.push(createInstance(sp.id, Math.max(2, level + rng.int(-2, 0)), rng))
  }
  return { kind: 'trainer', trainer, team }
}

/** Conecta dos capas con aristas estilo Slay the Spire. */
function connect(curr: MapNode[], next: MapNode[], rng: RNG): void {
  if (next.length === 1) {
    for (const c of curr) c.next = [next[0].id]
    return
  }
  const posOf = (n: MapNode, len: number) => (len <= 1 ? 0.5 : n.col / (len - 1))
  for (const c of curr) {
    const cp = posOf(c, curr.length)
    const sorted = [...next].sort(
      (a, b) => Math.abs(posOf(a, next.length) - cp) - Math.abs(posOf(b, next.length) - cp),
    )
    const edges = [sorted[0].id]
    if (sorted[1] && rng.chance(0.45)) edges.push(sorted[1].id)
    c.next = [...new Set(edges)]
  }
  // garantiza que todo nodo siguiente tenga al menos una entrada
  for (const n of next) {
    if (!curr.some((c) => c.next.includes(n.id))) {
      const np = posOf(n, next.length)
      const nearest = [...curr].sort(
        (a, b) => Math.abs(posOf(a, curr.length) - np) - Math.abs(posOf(b, curr.length) - np),
      )[0]
      nearest.next = [...new Set([...nearest.next, n.id])]
    }
  }
}
