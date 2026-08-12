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
import { BRACKET, buildBracket, getTeam } from '@/data/inazuma/teams'
import { lootPool } from '@/data/inazuma/items'
import { EVENTS } from '@/data/inazuma/events'
import { TECHNIQUES } from '@/data/inazuma/techniques'
import { formationFor, getPlayerBase, startingSquad } from '@/data/inazuma/players'
import type { InazumaMap, MapSegment, NodeKind, Technique, TournamentNode } from './types'

/**
 * Nivel del instituto que cierra cada tramo.
 *
 * Recalibrada para los tramos de OCHO casillas y para el arranque sin
 * supertécnicas: los dos primeros institutos van claramente por debajo de tu
 * nivel de llegada porque tú aún juegas casi sin técnicas y ellos salen con
 * las suyas. La curva se fijó MIDIENDO con qué nivel llega el bot a cada
 * eliminatoria; lo que decide el partido es la diferencia, no el número.
 */
export const RIVAL_LEVELS = [8, 15, 26, 40, 53, 65, 76, 85]
/** Niveles extra de una casilla arriesgada. */
export const RISKY_LEVEL_BONUS = 4
/** Casillas de ruta por tramo (más el jefe que lo cierra). */
export const ROUTE_LAYERS_PER_SEGMENT = 6
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
// La antigua casilla «Técnica» ya no se sortea: la casilla de OBJETO ofrece
// tres cosas a elegir y una de ellas es siempre una supertécnica, así que
// tener las dos era redundante. `NodeKind` conserva 'tecnica' por las
// partidas guardadas.
const ROUTE_WEIGHTS: { kind: NodeKind; weight: number }[] = [
  { kind: 'pachanga', weight: 20 },
  { kind: 'evento', weight: 16 },
  { kind: 'firma', weight: 15 },
  { kind: 'objeto', weight: 16 },
  { kind: 'ojeador', weight: 10 },
  { kind: 'trade', weight: 7 },
  { kind: 'rairai', weight: 9 },
  { kind: 'tienda', weight: 7 },
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

export function generateMap(rng: RNG, playerTeamId = 'raimon'): InazumaMap {
  const bracket = buildBracket(playerTeamId)
  const layers: string[][] = []
  const nodes: Record<string, TournamentNode> = {}
  let layerIdx = 0

  for (let seg = 0; seg < MATCH_ROUNDS; seg++) {
    // --- capas de ruta del tramo ---
    for (let r = 0; r < ROUTE_LAYERS_PER_SEGMENT; r++) {
      const ids: string[] = []
      const used = new Set<NodeKind>()
      // Una pachanga garantizada en capas ALTERNAS (no en todas: forzarla en
      // cada capa llenaba el mapa de fútbol de barrio y mataba la variedad).
      // En las impares puede tocar de todo. La primera capa de la partida
      // fuerza además una casilla de FIRMA: el equipo sale sin supertécnicas y
      // despertar la primera en los primeros pasos es el gancho del sistema.
      const forced: NodeKind[] = seg === 0 && r === 0
        ? ['pachanga', 'firma']
        : r % 2 === 0 ? ['pachanga'] : []
      for (let c = 0; c < NODES_PER_LAYER; c++) {
        const kind = forced[c] ?? pickKind(rng, used)
        // Ni dos descansos ni dos tiendas en la misma capa.
        if (kind === 'rairai' || kind === 'tienda') used.add(kind)
        const node = buildRouteNode(`n${layerIdx}-${c}`, kind, layerIdx, c, seg, r, rng, bracket, playerTeamId)
        nodes[node.id] = node
        ids.push(node.id)
      }
      layers.push(rng.shuffle(ids))
      layerIdx++
    }

    // --- jefe que cierra el tramo ---
    const entry = bracket[seg]
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
      // La recompensa dejó de ser un menú de tres cartas: ahora cae una al azar.
      reward: `${prizeMoney(seg)} ₽ + una recompensa`,
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
  bracket: { teamId: string; name: string }[] = BRACKET,
  playerTeamId = 'raimon',
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
        teamId: bracket[seg].teamId,
        title: risky ? `${rival.name} · a cara de perro` : rival.name,
        subtitle: `Pachanga · nivel ${level}`,
        reward: risky ? '+3 niveles y 300 ₽ si ganas' : '+2 niveles si ganas',
      }
    }
    case 'objeto': {
      // La casilla ofrece TRES cosas a elegir: dos objetos y una supertécnica
      // (que va a la mochila). El sorteo se hace aquí para que el mapa sea
      // reproducible con su semilla y la previa pueda enseñar qué toca.
      const pool = lootPool(seg)
      const a = rng.pick(pool)
      let b = rng.pick(pool)
      if (b.id === a.id) b = pool[(pool.indexOf(a) + 1) % pool.length]
      const target = 45 + seg * 9
      const fits = teachableTo(playerTeamId)
      const tp = TECHNIQUES.filter((t) => fits(t) && Math.abs(t.power - target) <= 25)
      const wide = TECHNIQUES.filter(fits)
      const tech = rng.pick(tp.length ? tp : wide.length ? wide : TECHNIQUES)
      const rare = a.kind === 'raro' || b.kind === 'raro'
      return {
        ...base,
        itemId: a.id,
        itemId2: b.id,
        techniqueId: tech.id,
        title: rare ? '¡Algo brillante!' : 'Material tirado',
        subtitle: 'Elige una de tres',
        reward: `${a.name}, ${b.name} o ${tech.name}`,
      }
    }
    case 'evento': {
      const ev = rng.pick(EVENTS)
      return { ...base, eventId: ev.id, title: ev.title, subtitle: 'Situación', reward: 'Depende de lo que elijas' }
    }
    case 'tecnica': {
      // Técnicas de potencia acorde al tramo: ni la definitiva en la ruta 1 ni
      // una básica en semifinales.
      //
      // Y, sobre todo, técnicas que ALGUIEN de tu plantilla pueda aprender:
      // desde que hacen falta demarcación Y elemento, sortear del catálogo
      // entero regalaba casillas muertas (un tiro de bosque a un equipo que no
      // tiene delanteros de bosque no es un premio, es un adorno).
      const target = 45 + seg * 9
      const fits = teachableTo(playerTeamId)
      const pool = TECHNIQUES.filter((t) => fits(t) && Math.abs(t.power - target) <= 25)
      const wide = TECHNIQUES.filter(fits)
      const tech = rng.pick(pool.length ? pool : wide.length ? wide : TECHNIQUES)
      return {
        ...base,
        techniqueId: tech.id,
        title: 'Entrenador veterano',
        subtitle: 'Te enseña una supertécnica',
        reward: `${tech.name} (${tech.kind})`,
      }
    }
    case 'firma':
      return {
        ...base,
        title: 'Entrenamiento especial',
        subtitle: 'Un jugador despierta SU técnica',
        reward: 'La siguiente supertécnica de su cadena',
      }
    case 'ojeador':
      return { ...base, title: 'Ojeador', subtitle: 'Tiene tres fichas sobre la mesa', reward: 'Fichas a un jugador nuevo' }
    case 'trade':
      return {
        ...base,
        title: 'Cazatalentos ambulante',
        subtitle: 'Un jugador por otro, a ciegas',
        reward: 'Cambia a quien elijas por otro al azar con +3 niveles',
      }
    case 'rairai':
      return {
        ...base,
        title: 'Restaurante Rai Rai',
        subtitle: 'El ramen que levanta a cualquiera',
        reward: 'Recupera aguante y PT · vende comida',
      }
    case 'tienda':
      return { ...base, title: 'Tienda de deportes', subtitle: 'El material bueno se paga', reward: 'Compra equipamiento' }
    default:
      return { ...base, title: 'Casilla', subtitle: '', reward: '' }
  }
}

/**
 * ¿Puede aprenderla alguien del instituto con el que juegas? Se mira sobre la
 * plantilla INICIAL, que es la única que el mapa conoce al generarse; con los
 * fichajes posteriores solo puede ampliarse, nunca reducirse.
 */
function teachableTo(teamId: string): (t: Technique) => boolean {
  // MISMA plantilla que monta `createSave` (formación incluida): si aquí se
  // mirase una lista más ancha, el mapa ofrecería técnicas para jugadores que
  // no tienes.
  const squad = startingSquad(teamId, formationFor(teamId)).map(getPlayerBase)
  const combos = new Set(squad.map((p) => `${KIND_FOR_POSITION[p.position]}|${p.element}`))
  // Y las que ya se saben de salida no cuentan: repetir una técnica que ya
  // lleva el único jugador que podría aprenderla es una casilla vacía.
  const known = new Set(squad.flatMap((p) => p.techniques))
  return (t) => combos.has(`${t.kind}|${t.element}`) && !known.has(t.id)
}

/** Qué clase de técnica usa cada demarcación (espejo de `learnBlocker`). */
const KIND_FOR_POSITION: Record<string, Technique['kind']> = {
  POR: 'parada', DEF: 'bloqueo', MED: 'regate', DEL: 'tiro',
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
export function beatenTeams(layer: number, playerTeamId?: string): string[] {
  const done = Math.floor(layer / (ROUTE_LAYERS_PER_SEGMENT + 1))
  // El cuadro depende del instituto con el que juegues (el que descartas entra
  // en él), así que mirar el cuadro por defecto daba equipos equivocados a
  // quien no jugara con el Raimon.
  const bracket = playerTeamId ? buildBracket(playerTeamId) : BRACKET
  return bracket.slice(0, done).map((b) => b.teamId)
}

/** Nombre visible del punto del mapa en el que estás. */
export function layerName(layer: number): string {
  const seg = bossIndexForLayer(layer)
  const isBoss = (layer + 1) % (ROUTE_LAYERS_PER_SEGMENT + 1) === 0
  return isBoss ? BRACKET[seg].name : `Camino a ${getTeam(BRACKET[seg].teamId).name}`
}
