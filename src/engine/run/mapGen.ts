import type { PokemonInstance, PokemonType, SpeciesData, TrainerData } from '@/types'
import { RNG } from '@/utils/rng'
import { encounterPoolFor, legendaryPoolFor, getMegaForms, getSpecies, ALL_MEGAS } from '@/data'
import { createInstance } from '@/engine/team/instance'
import { refreshMoves, applyCaptureTier } from '@/engine/team/leveling'
import { counterStarterId } from '@/data/trainers/gen1'
import { getRegion, buildRival } from '@/data/trainers/regions'
import { evolutionAtLevel, getFinalEvolution } from '@/engine/team/evolution'
import {
  makeWild, tierPool, itemChoices, shopStock, EVENT_IDS,
} from './nodes'
import type { MapNode, NodeType, RandomFlags, RunMap } from './types'

// Clases de entrenador genéricas con retrato real (Pokémon Showdown).
const SHOWDOWN_TRAINER = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`
// Niveles extra de un nodo ARRIESGADO (suma fija, no multiplicador).
const RISKY_LEVEL_BONUS = 4
// Especies base que tienen megaevolución (para garantizar mega en el Alto Mando).
const MEGA_BASES: number[] = [...new Set(ALL_MEGAS.map((m) => m.baseId).filter((b): b is number => b != null))]
// Cada clase de entrenador tiene una temática de tipo y SOLO lleva Pokémon de
// ese tipo (coherencia). Excepción: "Entrenador/a Guay" (mixed) lleva de todo.
// Cubre los 18 tipos con al menos una clase estricta.
const GENERIC_CLASSES: { slug: string; name: string; type: PokemonType; mixed?: boolean }[] = [
  // Normal
  { slug: 'youngster', name: 'Joven', type: 'normal' },
  { slug: 'lass', name: 'Chica', type: 'normal' },
  { slug: 'gentleman', name: 'Caballero', type: 'normal' },
  // Fuego
  { slug: 'firebreather', name: 'Tragafuegos', type: 'fire' },
  { slug: 'gambler', name: 'Apostador', type: 'fire' },
  // Agua
  { slug: 'fisherman', name: 'Pescador', type: 'water' },
  { slug: 'sailor', name: 'Marinero', type: 'water' },
  { slug: 'swimmer', name: 'Nadador', type: 'water' },
  // Eléctrico
  { slug: 'scientist', name: 'Científico', type: 'electric' },
  { slug: 'guitarist', name: 'Guitarrista', type: 'electric' },
  // Planta
  { slug: 'camper', name: 'Excursionista', type: 'grass' },
  { slug: 'picnicker', name: 'Senderista', type: 'grass' },
  { slug: 'aromalady', name: 'Floristera', type: 'grass' },
  // Hielo
  { slug: 'skier', name: 'Esquiadora', type: 'ice' },
  // Lucha
  { slug: 'blackbelt', name: 'Karateka', type: 'fighting' },
  // Veneno
  { slug: 'biker', name: 'Motorista', type: 'poison' },
  { slug: 'ninjaboy', name: 'Ninja', type: 'poison' },
  // Tierra
  { slug: 'pokemaniac', name: 'Pokémano', type: 'ground' },
  { slug: 'ruinmaniac', name: 'Arqueólogo', type: 'ground' },
  // Volador
  { slug: 'birdkeeper', name: 'Ornitólogo', type: 'flying' },
  // Psíquico
  { slug: 'psychic', name: 'Vidente', type: 'psychic' },
  { slug: 'juggler', name: 'Malabarista', type: 'psychic' },
  // Bicho
  { slug: 'bugcatcher', name: 'Cazabichos', type: 'bug' },
  // Roca
  { slug: 'hiker', name: 'Montañero', type: 'rock' },
  // Fantasma
  { slug: 'medium', name: 'Médium', type: 'ghost' },
  // Dragón
  { slug: 'dragontamer', name: 'Domadragones', type: 'dragon' },
  { slug: 'veteran', name: 'Veterano', type: 'dragon' },
  // Siniestro
  { slug: 'roughneck', name: 'Maleante', type: 'dark' },
  { slug: 'burglar', name: 'Ladrón', type: 'dark' },
  // Acero
  { slug: 'worker', name: 'Operario', type: 'steel' },
  // Hada
  { slug: 'beauty', name: 'Modelo', type: 'fairy' },
  // Mixtos: "Entrenador/a Guay" puede llevar Pokémon de cualquier tipo.
  { slug: 'acetrainer', name: 'Entrenador Guay', type: 'normal', mixed: true },
  { slug: 'acetrainerf', name: 'Entrenadora Guay', type: 'normal', mixed: true },
]

// --- Team Rocket: Jessie & James con los Pokémon que usan en el anime por región. ---
const ROCKET_SPRITE = 'https://play.pokemonshowdown.com/sprites/trainers/teamrocket.png'
const ROCKET_TEAMS: Record<number, number[]> = {
  1: [52, 24, 110], // Meowth, Arbok, Weezing (Kanto)
  2: [202, 24, 110], // Wobbuffet, Arbok, Weezing (Johto)
  3: [52, 336, 331], // Meowth, Seviper, Cacnea (Hoenn)
  4: [52, 336, 455], // Meowth, Seviper, Carnivine (Sinnoh)
  5: [52, 591, 593], // Meowth, Amoonguss, Jellicent (Teselia)
  6: [52, 711, 687], // Meowth, Gourgeist, Malamar (Kalos)
  7: [52, 778, 747], // Meowth, Mimikyu, Mareanie (Alola)
  8: [52, 711, 687], // Meowth, Gourgeist, Malamar (Galar)
  9: [52, 24, 110], // Meowth, Arbok, Weezing (Paldea, sin anime propio)
}

function buildRocketContent(level: number, rng: RNG, gen: number, pool: SpeciesData[], difficulty: string): MapNode['content'] {
  const roster = ROCKET_TEAMS[gen] ?? ROCKET_TEAMS[1]
  const size = level < 15 ? 2 : 3
  const team = roster.slice(0, size).map((id, i) => createInstance(id, Math.max(5, level + 1 - i * 2), rng))
  // Pokémon "secuestrado": uno aleatorio acorde al nivel. Forma parte del equipo
  // (lo combates) y, si ganas, lo liberas. Guardamos una copia prístina (PS llenos).
  const rescue = makeWild(pool, level, rng, difficulty)
  applyCaptureTier(rescue) // al liberarlo lo obtienes: misma curva que una captura
  team.push(structuredClone(rescue))
  const trainer: TrainerData = {
    id: `rocket-${level}-${rng.int(0, 9999)}`,
    name: 'Team Rocket', trainerClass: 'trainer',
    sprite: ROCKET_SPRITE, reward: { money: 500 + level * 45 },
    quote: 'Prepárate para los problemas... ¡y más vale que teman!',
    team: [],
  }
  return { kind: 'trainer', trainer, team, rescue }
}

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
  pools: number[],
  gen: number,
  starterId: number,
  rng: RNG,
  difficulty: string = 'normal',
  opts: { randomFlags?: RandomFlags; monotype?: PokemonType } = {},
): { map: RunMap; rivalStarterId: number } {
  const pool: SpeciesData[] = encounterPoolFor(pools)
  const monotype = opts.monotype
  // Pool del que el jugador OBTIENE Pokémon (capturas). En Monolocke, solo del
  // tipo elegido; los enemigos (salvajes/entrenadores) NO se filtran.
  const acquirePool: SpeciesData[] = monotype
    ? (pool.filter((s) => s.types.includes(monotype)).length ? pool.filter((s) => s.types.includes(monotype)) : pool)
    : pool
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
  // Curva de niveles de jefes: estirada hasta el CAMPEÓN A NIVEL 100 (v6.45).
  // Con el tope de nivel por medallas (levelCap = próximo jefe + margen),
  // llegar a 100 es el clímax natural de la run y el tramo final nunca se
  // trivializa chetando a un solo Pokémon con caramelos.
  // OJO: gym1 se queda en 8 para que la ENTRADA sea suave (con gym1=10 la
  // interpolación ponía el primer combate a nv.6 contra tu inicial nv.5 y
  // muchas runs morían en la primera ruta).
  const GYM_LEVELS = [8, 15, 23, 32, 41, 50, 59, 67]
  const ELITE_LEVELS = [74, 81, 88, 94]
  const CHAMPION_LEVEL = 100
  // Rivales situados ENTRE gimnasios -> nivel acorde a su posición en el mapa.
  // (El 2º rival va entre gym4=41 y gym5=50: debe quedar POR DEBAJO de 50.)
  const RIVAL_LEVELS = [13, 45, 70]
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
  const legends = legendaryPoolFor(pools)
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

  // Nivel del PRÓXIMO jefe en cada capa (para no ofrecer capturas con nivel
  // pegado al jefe que viene).
  const nextBossLevel: number[] = new Array(plan.length)
  {
    let nb = CHAMPION_LEVEL
    for (let i = plan.length - 1; i >= 0; i--) {
      if (anchors[i] !== null) nb = anchors[i] as number
      nextBossLevel[i] = nb
    }
  }

  // --- Construcción de nodos por capa ---
  const layers: string[][] = []
  const nodes: Record<string, MapNode> = {}
  let nodeSeq = 0
  const newId = () => `n${nodeSeq++}`
  const usedEvents = new Set<string>() // para no repetir eventos en la run

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
        // Nodo ARRIESGADO: combates con enemigo más fuerte y mejor botín.
        // Suma unos NIVELES FIJOS (antes multiplicaba ×1.35, que se disparaba a
        // alto nivel: un nv40 normal salía a 54).
        const risky = (type === 'battle' || type === 'trainer') && layerIdx > 1 && w > 1 && rng.chance(0.2)
        const nodeLevel = risky ? level + RISKY_LEVEL_BONUS : level
        nodes[id] = {
          id, layer: layerIdx, col: c, type, next: [], enemyLevel: nodeLevel, risky,
          content: type === 'heal' ? { kind: 'heal' } : buildRouteContent(type, pool, nodeLevel, layerIdx / plan.length, rng, usedEvents, difficulty, nextBossLevel[layerIdx], acquirePool, gen),
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
      // --- Difícil / Nuzlocke: jefes más duros ---
      const tough = difficulty === 'hard' || difficulty === 'nuzlocke'
      const aceMon = team[team.length - 1] // el de mayor nivel
      // Movimiento Z al mejor Pokémon: gimnasios desde la 6ª medalla + Alto Mando + Campeón.
      const lateBoss = (p.type === 'gym' && (p.bossIndex ?? 0) >= 5) || p.type === 'elite' || p.type === 'champion'
      if (tough && lateBoss && aceMon) { aceMon.moveTier = 3; refreshMoves(aceMon) }
      // Alto Mando: garantiza SIEMPRE una megaevolución (Megapiedra a un mega-capaz).
      if (tough && p.type === 'elite' && aceMon) {
        const mi = team.findIndex((m) => getMegaForms(m.speciesId).length > 0)
        if (mi >= 0) team[mi].heldItemId = 'mega-stone'
        else {
          // Nadie del equipo tiene mega: convierte al ace en una especie con mega
          // (del mismo tipo si es posible) y le da la Megapiedra.
          const aceTypes = new Set(getSpecies(aceMon.speciesId).types)
          const sameType = MEGA_BASES.filter((b) => getSpecies(b).types.some((t) => aceTypes.has(t)))
          const baseId = rng.pick(sameType.length ? sameType : MEGA_BASES)
          const newAce = createInstance(baseId, aceMon.level, rng, { heldItemId: 'mega-stone' })
          if (tough && lateBoss) { newAce.moveTier = 3; refreshMoves(newAce) }
          team[team.length - 1] = newAce
        }
      }
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

  // --- Modo Random: randomiza por CATEGORÍA las especies de las REGIONES
  //     elegidas, manteniendo los NIVELES para conservar coherencia.
  //       starters -> capturas (las capturas; los iniciales se eligen en la UI)
  //       wild     -> combates salvajes (y guardián legendario)
  //       trainers -> entrenadores normales, gimnasios, rival y campeón
  //       elite    -> Alto Mando
  const rf = opts.randomFlags
  if (rf) {
    const randPool = pool.filter((s) => !s.isMega)
    // Las capturas en Monolocke siguen siendo del tipo elegido.
    const catchPool = acquirePool.filter((s) => !s.isMega)
    const reroll = (mon: PokemonInstance, from: SpeciesData[]): PokemonInstance =>
      createInstance(rng.pick(from).id, mon.level, rng)
    for (const node of Object.values(nodes)) {
      const c = node.content
      if (c.kind === 'wild') {
        if (rf.wild) c.enemy = reroll(c.enemy, node.type === 'legendary' ? legends : randPool)
      } else if (c.kind === 'trainer') {
        const on = node.type === 'elite' ? rf.elite : rf.trainers
        if (on) c.team = c.team.map((m) => reroll(m, randPool))
      } else if (c.kind === 'catch') {
        if (rf.starters && catchPool.length) c.offers = c.offers.map((m) => reroll(m, catchPool))
      }
    }
  }

  return {
    map: { layers, nodes, totalLayers: layers.length },
    rivalStarterId,
  }
}

export function interpolateLevels(anchors: (number | null)[], startLevel: number): number[] {
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

export function pickRouteType(rng: RNG, frac: number): NodeType {
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

export function buildRouteContent(
  type: NodeType, pool: SpeciesData[], level: number, frac: number, rng: RNG, usedEvents: Set<string>, difficulty: string, nextBoss: number = level + 99, catchPool: SpeciesData[] = pool, gen: number = 1,
): MapNode['content'] {
  switch (type) {
    case 'battle':
      return { kind: 'wild', enemy: makeWild(pool, level, rng, difficulty) }
    case 'trainer':
      return synthTrainerContent(pool, level, rng, difficulty, gen)
    case 'catch': {
      // Pokémon a elegir, balanceados por nivel/dificultad. Nuzlocke: solo 1
      // (un único intento de captura por zona, como el modo clásico).
      // El nivel se limita para que un recién capturado no quede pegado (ni por
      // encima) del próximo jefe: con la variación de makeWild (+1), el tope
      // efectivo queda en jefe-1.
      const catchLevel = Math.max(2, Math.min(level, nextBoss - 2))
      const count = difficulty === 'nuzlocke' ? 1 : 3
      const offers: PokemonInstance[] = []
      const used = new Set<number>()
      for (let k = 0; k < count; k++) {
        let m = makeWild(catchPool, catchLevel, rng, difficulty)
        let tries = 0
        while (used.has(m.speciesId) && tries++ < 8) m = makeWild(catchPool, catchLevel, rng, difficulty)
        used.add(m.speciesId)
        applyCaptureTier(m) // capturas: potencia 1 hasta nv.35, 2 desde nv.36, nunca 3
        offers.push(m)
      }
      return { kind: 'catch', offers }
    }
    case 'item':
      return { kind: 'item', choices: itemChoices(rng, frac) }
    case 'shop':
      return { kind: 'shop', stock: shopStock(rng, frac) }
    case 'event': {
      // No repetir eventos dentro de una misma run hasta haberlos agotado todos.
      let avail = EVENT_IDS.filter((id) => !usedEvents.has(id))
      if (avail.length === 0) { usedEvents.clear(); avail = EVENT_IDS }
      const eventId = rng.pick(avail)
      usedEvents.add(eventId)
      return { kind: 'event', eventId }
    }
    case 'trade':
      return { kind: 'trade', cost: 300 + level * 20 }
    default:
      return { kind: 'heal' }
  }
}

/** Entrenador genérico: SOLO lleva Pokémon de su tipo (salvo los "Guay" mixtos).
 *  De vez en cuando aparece Team Rocket con su equipo del anime de la región. */
function synthTrainerContent(pool: SpeciesData[], level: number, rng: RNG, difficulty: string = 'normal', gen: number = 1): MapNode['content'] {
  // ~9% (a partir de nivel medio): Team Rocket.
  if (level >= 8 && rng.chance(0.09)) return buildRocketContent(level, rng, gen, pool, difficulty)

  // Solo clases cuyo tipo EXISTE en el pool (p. ej. nada de Siniestro en Kanto),
  // para que el equipo del entrenador siempre case con su tipo. Los "Guay" valen.
  const present = new Set(pool.flatMap((s) => s.types))
  const usable = GENERIC_CLASSES.filter((c) => c.mixed || present.has(c.type))
  const cls = rng.pick(usable.length ? usable : GENERIC_CLASSES)
  const trainer: TrainerData = {
    id: `trainer-${level}-${rng.int(0, 9999)}`,
    name: cls.name,
    trainerClass: 'trainer',
    // Mixto (Guay): sin tipo de especialidad. Estricto: su tipo.
    specialtyType: cls.mixed ? undefined : cls.type,
    sprite: SHOWDOWN_TRAINER(cls.slug),
    reward: { money: 200 + level * 25 },
    team: [],
  }
  const size = level < 15 ? 1 : level < 35 ? 2 : 3
  // Pool del que sale el equipo: del TIPO del entrenador (estricto) o general (mixto).
  // Para coherencia, un entrenador de tipo SIEMPRE lleva ese tipo (de todo el pool,
  // no solo de la ventana de nivel), eligiendo los más acordes al nivel.
  const typeBase = cls.mixed ? pool : pool.filter((s) => s.types.includes(cls.type))
  const usePool = typeBase.length ? tierPool(typeBase, level, difficulty) : tierPool(pool, level, difficulty)
  const team: PokemonInstance[] = []
  for (let i = 0; i < size; i++) {
    const sp = rng.pick(usePool)
    team.push(createInstance(sp.id, Math.max(2, level + rng.int(-2, 0)), rng))
  }
  return { kind: 'trainer', trainer, team }
}

/** Conecta dos capas con aristas estilo Slay the Spire. */
export function connect(curr: MapNode[], next: MapNode[], rng: RNG): void {
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
