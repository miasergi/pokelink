// Generación del MAPA, con la misma forma que el roguelike Pokémon: capas de
// casillas conectadas, agrupadas en TRAMOS que cierra un jefe.
//
//   tramo 0 →  [pachanga|objeto|ojeador]  [pachanga|técnica|descanso]  [tienda|pachanga]  [JEFE: Occult]
//   tramo 1 →  …                                                                          [JEFE: Otaku]
//   …
//   tramo 7 →  …                                                                          [FINAL: Zeus]
//
// Equivalencias con el modo Pokémon:
//   pachanga ≈ combate salvaje      jefe ≈ gimnasio
//   objeto / técnica ≈ objeto       ojeador ≈ captura
//   descanso ≈ centro Pokémon       tienda ≈ tienda
//
// La versión anterior era «8 eliminatorias con interludios entre medias»: un
// cuadro de torneo, no un mapa. Se cambió por petición explícita del usuario
// para que se pareciese al roguelike Pokémon.
import type { RNG } from '@/utils/rng'
import { BRACKET, getTeam } from '@/data/inazuma/teams'
import { ITEMS } from '@/data/inazuma/items'
import { TECHNIQUES } from '@/data/inazuma/techniques'
import type { InazumaMap, MapSegment, NodeKind, TournamentNode } from './types'

/** Nivel del instituto que cierra cada tramo. */
export const RIVAL_LEVELS = [6, 9, 12, 15, 18, 21, 24, 27]
/** Niveles extra de una casilla arriesgada. */
export const RISKY_LEVEL_BONUS = 4
/** Casillas de ruta por tramo (más el jefe que lo cierra). */
export const ROUTE_LAYERS_PER_SEGMENT = 3
/** Casillas ofrecidas por capa de ruta. */
const NODES_PER_LAYER = 3

export const MATCH_ROUNDS = BRACKET.length
export const TOTAL_LAYERS = MATCH_ROUNDS * (ROUTE_LAYERS_PER_SEGMENT + 1)

/** Premio en metálico por ganar el jefe `i`. */
export function prizeMoney(i: number): number {
  return 600 + i * 260
}

/** Nivel del rival de una pachanga en la capa dada (algo por debajo del jefe). */
export function pachangaLevel(segment: number, routeIndex: number): number {
  const from = segment === 0 ? 4 : RIVAL_LEVELS[segment - 1]
  const to = RIVAL_LEVELS[segment]
  const t = (routeIndex + 1) / (ROUTE_LAYERS_PER_SEGMENT + 1)
  return Math.max(3, Math.round(from + (to - from) * t) - 2)
}

// ---------------------------------------------------------------------------
// Generación
// ---------------------------------------------------------------------------

/**
 * Reparto de casillas de ruta. Las pachangas pesan más que nada: son la fuente
 * principal de nivel, igual que los combates salvajes en el modo Pokémon.
 */
const ROUTE_WEIGHTS: { kind: NodeKind; weight: number }[] = [
  { kind: 'pachanga', weight: 42 },
  { kind: 'objeto', weight: 16 },
  { kind: 'tecnica', weight: 13 },
  { kind: 'ojeador', weight: 13 },
  { kind: 'descanso', weight: 10 },
  { kind: 'tienda', weight: 6 },
]

function pickKind(rng: RNG, exclude: Set<NodeKind>): NodeKind {
  const pool = ROUTE_WEIGHTS.filter((w) => !exclude.has(w.kind))
  const total = pool.reduce((a, w) => a + w.weight, 0)
  let r = rng.next() * total
  for (const w of pool) {
    r -= w.weight
    if (r <= 0) return w.kind
  }
  return pool[pool.length - 1]?.kind ?? 'pachanga'
}

export function generateMap(rng: RNG): InazumaMap {
  const layers: string[][] = []
  const nodes: Record<string, TournamentNode> = {}
  let layerIdx = 0

  for (let seg = 0; seg < MATCH_ROUNDS; seg++) {
    // --- capas de ruta del tramo ---
    for (let r = 0; r < ROUTE_LAYERS_PER_SEGMENT; r++) {
      const ids: string[] = []
      const used = new Set<NodeKind>()
      // Al menos UNA pachanga por capa: sin ella se podría cruzar un tramo
      // entero sin subir de nivel y llegar al jefe sin opciones, que es
      // exactamente el fallo que ya se corrigió en el mapa del modo Pokémon.
      const forced: NodeKind[] = ['pachanga']
      for (let c = 0; c < NODES_PER_LAYER; c++) {
        const kind = forced[c] ?? pickKind(rng, used)
        // Ni dos descansos ni dos tiendas en la misma capa.
        if (kind === 'descanso' || kind === 'tienda') used.add(kind)
        const node = buildRouteNode(`n${layerIdx}-${c}`, kind, layerIdx, c, seg, r, rng)
        nodes[node.id] = node
        ids.push(node.id)
      }
      layers.push(rng.shuffle(ids))
      layerIdx++
    }

    // --- jefe que cierra el tramo ---
    const entry = BRACKET[seg]
    const team = getTeam(entry.teamId)
    const isFinal = seg === MATCH_ROUNDS - 1
    const boss: TournamentNode = {
      id: `boss${seg}`,
      kind: isFinal ? 'final' : 'jefe',
      layer: layerIdx,
      col: 0,
      teamId: entry.teamId,
      level: RIVAL_LEVELS[seg],
      title: team.name,
      subtitle: `${entry.name} · nivel medio ${RIVAL_LEVELS[seg]}`,
      reward: `${prizeMoney(seg)} ₽ + carta de fichaje`,
      next: [],
    }
    nodes[boss.id] = boss
    layers.push([boss.id])
    layerIdx++
  }

  // Conecta cada capa con la siguiente: el mapa es un GRAFO, no una lista de
  // capas independientes. Desde dónde estás depende a dónde puedes ir.
  for (let i = 0; i < layers.length - 1; i++) {
    connect(layers[i].map((id) => nodes[id]), layers[i + 1].map((id) => nodes[id]), rng)
  }

  return { layers, nodes, totalLayers: layers.length }
}

/**
 * Traza los caminos entre dos capas. Cada casilla enlaza con la más cercana en
 * horizontal (y a veces con una segunda), y después se garantiza que TODA
 * casilla de la capa siguiente tenga al menos una entrada — si no, quedarían
 * casillas inalcanzables pintadas en el tablero.
 *
 * Es el mismo algoritmo que `connect` en el mapa del roguelike Pokémon.
 */
function connect(curr: TournamentNode[], next: TournamentNode[], rng: RNG): void {
  if (next.length === 1) {
    for (const c of curr) c.next = [next[0].id]
    return
  }
  const posOf = (n: TournamentNode, len: number) => (len <= 1 ? 0.5 : n.col / (len - 1))
  for (const c of curr) {
    const cp = posOf(c, curr.length)
    const sorted = [...next].sort(
      (a, b) => Math.abs(posOf(a, next.length) - cp) - Math.abs(posOf(b, next.length) - cp),
    )
    const edges = [sorted[0].id]
    if (sorted[1] && rng.chance(0.45)) edges.push(sorted[1].id)
    c.next = [...new Set(edges)]
  }
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

/** Casillas a las que puedes ir ahora mismo. */
export function availableNextNodes(map: InazumaMap, currentNodeId: string | null): TournamentNode[] {
  if (currentNodeId === null) return (map.layers[0] ?? []).map((id) => map.nodes[id])
  const cur = map.nodes[currentNodeId]
  if (!cur) return []
  return cur.next.map((id) => map.nodes[id]).filter(Boolean)
}

function buildRouteNode(
  id: string, kind: NodeKind, layer: number, col: number, seg: number, routeIndex: number, rng: RNG,
): TournamentNode {
  const base: TournamentNode = { id, kind, layer, col, title: '', subtitle: '', reward: '', next: [] }

  switch (kind) {
    case 'pachanga': {
      // Casilla arriesgada: rival más fuerte pero premio doble. Nunca en la
      // primera capa del mapa (no tendrías con qué).
      const risky = layer > 0 && rng.chance(0.22)
      const level = pachangaLevel(seg, routeIndex) + (risky ? RISKY_LEVEL_BONUS : 0)
      const rival = rng.pick(PACHANGA_RIVALS)
      return {
        ...base,
        risky,
        level,
        teamId: BRACKET[seg].teamId,
        title: risky ? `${rival.name} · a cara de perro` : rival.name,
        subtitle: `Pachanga · nivel ${level}`,
        reward: risky ? '+3 niveles y 300 ₽ si ganas' : '+2 niveles si ganas',
      }
    }
    case 'objeto': {
      const item = rng.pick(ITEMS.filter((i) => i.kind === 'equipo' || i.kind === 'consumible'))
      return { ...base, itemId: item.id, title: 'Material tirado', subtitle: 'Alguien se dejó algo aquí', reward: item.name }
    }
    case 'tecnica': {
      // Técnicas de potencia acorde al tramo: ni la definitiva en la ruta 1 ni
      // una básica en semifinales.
      const target = 45 + seg * 9
      const pool = TECHNIQUES.filter((t) => Math.abs(t.power - target) <= 25)
      const tech = rng.pick(pool.length ? pool : TECHNIQUES)
      return {
        ...base,
        techniqueId: tech.id,
        title: 'Entrenador veterano',
        subtitle: 'Te enseña una supertécnica',
        reward: `${tech.name} (${tech.kind})`,
      }
    }
    case 'ojeador':
      return { ...base, title: 'Ojeador', subtitle: 'Tiene tres fichas sobre la mesa', reward: 'Fichas a un jugador nuevo' }
    case 'descanso':
      return { ...base, title: 'Descanso', subtitle: 'Baños, fisio y nada de balón', reward: 'Recupera aguante y PT' }
    case 'tienda':
      return { ...base, title: 'Tienda de deportes', subtitle: 'El material bueno se paga', reward: 'Compra equipamiento' }
    default:
      return { ...base, title: 'Casilla', subtitle: '', reward: '' }
  }
}

/** Rivales de pachanga: equipos de barrio, sin escudo ni entidad propia. */
const PACHANGA_RIVALS = [
  { name: 'Chavales del descampado' },
  { name: 'Los del turno de tarde' },
  { name: 'Equipo del polideportivo' },
  { name: 'Panda del río' },
  { name: 'Veteranos del barrio' },
  { name: 'Club de la esquina' },
  { name: 'Suplentes del instituto' },
  { name: 'Peña del parque' },
]

// ---------------------------------------------------------------------------
// Tramos y consultas
// ---------------------------------------------------------------------------

/** Divide el mapa en tramos: uno por jefe. */
export function mapSegments(map: InazumaMap): MapSegment[] {
  const segs: MapSegment[] = []
  let start = 0
  for (let li = 0; li < map.layers.length; li++) {
    const boss = map.layers[li].map((id) => map.nodes[id]).find((n) => n.kind === 'jefe' || n.kind === 'final')
    if (boss) {
      segs.push({ index: segs.length, name: BRACKET[segs.length]?.name ?? '', start, end: li, boss })
      start = li + 1
    }
  }
  return segs
}

export function segmentForLayer(segs: MapSegment[], layer: number): MapSegment {
  const l = Math.max(0, layer)
  return segs.find((s) => l >= s.start && l <= s.end) ?? segs[segs.length - 1]
}

/** Casillas que puedes elegir ahora. */
export function currentOffer(map: InazumaMap, layer: number): TournamentNode[] {
  const ids = map.layers[layer] ?? []
  return ids.map((id) => map.nodes[id]).filter(Boolean)
}

/** Índice del jefe que toca (0-7): sirve para premios y para el ojeador. */
export function bossIndexForLayer(layer: number): number {
  return Math.min(MATCH_ROUNDS - 1, Math.floor(layer / (ROUTE_LAYERS_PER_SEGMENT + 1)))
}

/** Institutos ya derrotados: definen a quién puedes fichar. */
export function beatenTeams(layer: number): string[] {
  const done = Math.floor(layer / (ROUTE_LAYERS_PER_SEGMENT + 1))
  return BRACKET.slice(0, done).map((b) => b.teamId)
}

/** Nombre visible del punto del mapa en el que estás. */
export function layerName(layer: number): string {
  const seg = bossIndexForLayer(layer)
  const isBoss = (layer + 1) % (ROUTE_LAYERS_PER_SEGMENT + 1) === 0
  return isBoss ? BRACKET[seg].name : `Camino a ${getTeam(BRACKET[seg].teamId).name}`
}
