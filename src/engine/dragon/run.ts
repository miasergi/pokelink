// La run: mapa por sagas, nodos, recompensas y el save. Puro.
//
// Estructura heredada de lo que ya funciona en el repo: un tramo por saga
// (como los `segments` del roguelike Pokémon), capas con 2-3 opciones y
// **siempre al menos un combate por capa** — sin eso salen capas de solo
// tienda/descanso donde es imposible subir de nivel y llegas al jefe pelado.
import { RNG } from '@/utils/rng'
import {
  bossLevel, getArc, getMaster, getSaga, sagaLevels,
} from '@/data/dragon/sagas'
import { getFighter } from '@/data/dragon/fighters'
import { getForm } from '@/data/dragon/transformations'
import { getItem } from '@/data/dragon/items'
import { getTechnique } from '@/data/dragon/techniques'
import { advance, setAiSkill, startBattle } from './battle'
import {
  createEnemy, createFighter, fighterMaxHp, itemLevel, learnTechnique, levelUp,
  resetUids, TECH_LEVEL_MAX, upgradeTechnique,
} from './roster'
import type { Battle, Fighter } from './types'

/** Capas por saga: 5 de camino + el jefe. */
export const LAYERS_PER_SAGA = 6
export const BOSS_LAYER = LAYERS_PER_SAGA - 1
/**
 * Nivel del inicial. Se toca MUY poco a propósito: los rivales de la primera
 * capa salen a nivel 6, así que cada punto de más aquí desplaza la curva
 * entera. Con 10 el bot que juega bien ganaba el 80 % de las runs.
 *
 * Lo que compensa empezar con un solo luchador NO es el nivel, es el aliado
 * garantizado de la primera capa: el problema de ir solo es la fragilidad
 * (un KO acaba la run), no ir corto de atributos.
 */
export const START_LEVEL = 6
/** Tamaño máximo del equipo. Tres es el número de relevos del anime. */
export const TEAM_MAX = 4
/** Bolas necesarias para pedir un deseo. */
export const BALLS_FOR_WISH = 7

export type NodeKind =
  | 'combate' | 'elite' | 'jefe'
  | 'entreno' | 'reclutar' | 'tienda' | 'descanso' | 'bola' | 'maestro'

export interface MapNode {
  id: string
  kind: NodeKind
  layer: number
  /** Columna dentro de la capa: manda en cómo se dibuja y con quién conecta. */
  col: number
  /**
   * Casillas de la capa siguiente a las que se puede saltar desde esta. Igual
   * que en Inazuma y en el mapa del roguelike Pokémon: no eliges «una casilla
   * de la capa», eliges un CAMINO, y desde dónde estás depende a dónde puedes
   * ir después.
   */
  next: string[]
  label: string
  desc: string
  /** Rivales (combate/elite/jefe). */
  enemies?: string[]
  level?: number
  phases?: string[]
  /** Candidato a reclutar. */
  recruit?: string
  /** Maestro que espera en esta casilla. */
  master?: string
  /** Casilla del arranque de la aventura: entrena como un combate. */
  saga0Prologue?: boolean
  /** Niveles que reparte un nodo de entrenamiento. */
  levels?: number
  /**
   * Género de la tienda, fijado la PRIMERA vez que entras. Si se regenerase en
   * cada visita bastaría con entrar y salir hasta que apareciese la Semilla del
   * Ermitaño.
   */
  stock?: string[]
  done?: boolean
}

export interface DragonSave {
  seed: number
  rngState: number
  /** Arco elegido (ver `ARCS`). Manda en qué sagas se juegan y en qué orden. */
  arc: string
  /** Índice de la saga DENTRO del arco, no su id. */
  saga: number
  /** Capa actual dentro de la saga. */
  layer: number
  team: Fighter[]
  zeni: number
  bag: Record<string, number>
  /** Bolas de dragón reunidas en ESTA run. */
  balls: number
  /** Deseos ya pedidos (para no repetirlos). */
  wishes: string[]
  map: MapNode[]
  /** Nodo elegido pendiente de resolver. */
  currentNode: string | null
  battles: number
  wins: number
  /** Zenkais que se han disparado (para el resumen y los logros). */
  zenkais: number
  finished?: 'victoria' | 'derrota'
  startedAt: number
}

/** La saga que toca en esa posición del arco. */
export function sagaOf(arc: string, indexInArc: number) {
  const ids = getArc(arc).sagas
  return getSaga(ids[Math.max(0, Math.min(ids.length - 1, indexInArc))])
}

/** Cuántas sagas tiene el arco elegido. */
export function arcLength(arc: string): number {
  return getArc(arc).sagas.length
}

// --------------------------------------------------------------- el mapa ---

function nodeLevel(indexInArc: number, layer: number): number {
  const [a, b] = sagaLevels(indexInArc, START_LEVEL)
  const t = layer / Math.max(1, BOSS_LAYER - 1)
  return Math.round(a + (b - a) * t)
}

const REST_DESC = 'Un respiro. El equipo recupera buena parte de sus fuerzas.'

function makeNode(kind: NodeKind, layer: number, saga: number, rng: RNG, idx: number, arc: string): MapNode {
  const s = sagaOf(arc, saga)
  const id = `${saga}-${layer}-${idx}`
  const col = idx
  const next: string[] = []
  const level = nodeLevel(saga, layer)
  switch (kind) {
    case 'combate': {
      const n = layer >= 3 && rng.chance(0.35) ? 2 : 1
      const enemies = Array.from({ length: n }, () => rng.pick(s.pool))
      return {
        id, kind, layer, col, next, level, enemies,
        label: n > 1 ? 'Emboscada' : 'Combate',
        desc: n > 1
          ? 'Más de uno te ha visto llegar: caerán uno tras otro, y el segundo entra furioso.'
          : 'Alguien te cierra el paso.',
      }
    }
    case 'elite': {
      const enemies = [rng.pick(s.elites)]
      // +2, no +4: medido que con +4 una élite de la capa 3 salía a nivel 19
      // contra un equipo de 12 y era una sentencia, no un reto.
      return {
        id, kind, layer, col, next, level: level + 2, enemies,
        label: 'Rival de peso',
        desc: 'Este no es carne de cañón. Pega más fuerte y da mejor botín.',
      }
    }
    case 'jefe': {
      return {
        id, kind, layer, col, next, level: bossLevel(saga, START_LEVEL),
        enemies: [s.boss.id], phases: s.boss.phases,
        label: getFighter(s.boss.id)?.name ?? 'Jefe',
        desc: s.boss.intro,
      }
    }
    case 'entreno':
      return {
        id, kind, layer, col, next, levels: layer >= 3 ? 4 : 3,
        label: 'Entrenamiento',
        desc: 'Gravedad aumentada y horas de sparring. Subes niveles sin arriesgar la piel.',
      }
    case 'reclutar':
      return {
        id, kind, layer, col, next, recruit: rng.pick(s.recruits),
        label: 'Aliado',
        desc: 'Alguien quiere unirse a la pelea.',
      }
    case 'tienda':
      return { id, kind, layer, col, next, label: 'Tienda', desc: 'Cápsulas, semillas y trastos varios.' }
    case 'descanso':
      return { id, kind, layer, col, next, label: 'Descanso', desc: REST_DESC }
    case 'maestro':
      return {
        id, kind, layer, col, next, master: rng.pick(s.masters),
        label: 'Maestro',
        desc: 'Alguien con mucho que enseñar y poca paciencia.',
      }
    case 'bola':
      return {
        id, kind, layer, col, next,
        label: 'Bola de Dragón',
        desc: 'El radar pita. Hay una esfera de cristal enterrada por aquí cerca.',
      }
  }
}

/**
 * Conecta cada casilla con las de la capa siguiente que le quedan cerca, y se
 * asegura de que TODA casilla de la capa siguiente tenga al menos una entrada
 * — si no, quedarían casillas inalcanzables pintadas en el tablero.
 *
 * Es el mismo algoritmo que usan el mapa de Inazuma y el del roguelike Pokémon.
 */
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
    // Bien trenzado: casi siempre hay bifurcación de verdad. Con una sola
    // salida por casilla el mapa deja de ser un mapa y es un pasillo.
    const edges = [sorted[0].id]
    if (sorted[1] && rng.chance(0.7)) edges.push(sorted[1].id)
    if (sorted[2] && rng.chance(0.25)) edges.push(sorted[2].id)
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

/**
 * Mapa de una saga: un GRAFO de caminos, no una lista de opciones por capa.
 * Cada capa tiene 2-3 casillas y **al menos una de combate** (sin eso salen
 * capas de solo tienda y descanso donde es imposible subir de nivel y llegas
 * al jefe pelado); la última es el jefe, al que llevan todos los caminos.
 */
export function generateSagaMap(saga: number, rng: RNG, arc = 'z'): MapNode[] {
  const capas: MapNode[][] = []
  for (let layer = 0; layer < BOSS_LAYER; layer++) {
    // Siempre un combate (o élite en las capas altas), y luego relleno variado.
    const kinds: NodeKind[] = [layer >= 2 && rng.chance(0.45) ? 'elite' : 'combate']
    // ARRANQUE DE LA AVENTURA: la primera capa ofrece SIEMPRE un aliado.
    // Se empieza con un solo luchador (como el inicial de Pokémon) y un KO es
    // el fin de la run, así que sin esto la primera casilla era una moneda al
    // aire: medido, el bot moría en las capas 0-3 antes de encontrar a nadie.
    // Así la primera decisión real es «¿peleo ya o busco compañía?».
    if (saga === 0 && layer === 0) kinds.push('reclutar')
    const filler: NodeKind[] = ['entreno', 'tienda', 'descanso', 'bola', 'reclutar', 'maestro', 'combate']
    // El descanso y la tienda no aparecen en la primera capa: no hay dinero ni
    // heridas todavía, y ocupaban el sitio de algo útil.
    const pool = layer === 0 ? filler.filter((k) => k !== 'tienda' && k !== 'descanso') : filler
    const extra = layer === 0 ? 1 : rng.int(1, 2)
    const used = new Set<NodeKind>(kinds)
    for (let i = 0; i < extra; i++) {
      const choices = pool.filter((k) => !used.has(k))
      const k = choices.length ? rng.pick(choices) : 'combate'
      used.add(k)
      kinds.push(k)
    }
    rng.shuffle(kinds)
    capas.push(kinds.map((k, i) => {
      const n = makeNode(k, layer, saga, rng, i, arc)
      if (saga === 0 && layer === 0) n.saga0Prologue = true
      return n
    }))
  }
  capas.push([makeNode('jefe', BOSS_LAYER, saga, rng, 0, arc)])

  for (let i = 0; i < capas.length - 1; i++) connect(capas[i], capas[i + 1], rng)
  return capas.flat()
}

/** Casillas a las que puedes ir AHORA, según dónde estés parado. */
export function availableNodes(save: DragonSave): MapNode[] {
  // Sin casilla previa (arranque de saga, o un save de antes del grafo) se
  // abre la capa actual entera: más vale eso que dejarte sin salidas.
  if (!save.currentNode) return save.map.filter((n) => n.layer === save.layer)
  const actual = save.map.find((n) => n.id === save.currentNode)
  if (!actual) return save.map.filter((n) => n.layer === save.layer)
  return actual.next
    .map((id) => save.map.find((n) => n.id === id))
    .filter((n): n is MapNode => !!n)
}

/** Todas las casillas de una capa (para dibujar el tablero entero). */
export function layerNodes(save: DragonSave, layer = save.layer): MapNode[] {
  return save.map.filter((n) => n.layer === layer)
}

// ---------------------------------------------------------------- el save ---

export interface NewRunOptions {
  /** El inicial: se empieza SOLO con él, como el inicial de Pokémon. */
  starter?: string
  /** Arco a jugar (ver `ARCS`). Por defecto, el clásico de Z. */
  arc?: string
}

export function createSave(seed: number, opts: NewRunOptions = {}): DragonSave {
  resetUids()
  const rng = new RNG(seed)
  // UN solo luchador para empezar. El equipo se hace por el camino, que es de
  // donde sale el arco de la aventura: los aliados se ganan, no se regalan.
  const team = [createFighter(opts.starter ?? 'goku', START_LEVEL)]
  const arc = opts.arc ?? 'z'
  return {
    seed,
    rngState: rng.getState(),
    arc,
    saga: 0,
    layer: 0,
    team,
    zeni: 800,
    bag: { semilla_media: 1 },
    balls: 0,
    wishes: [],
    map: generateSagaMap(0, rng, arc),
    currentNode: null,
    battles: 0,
    wins: 0,
    zenkais: 0,
    startedAt: 0,
  }
}

export function isRunOver(save: DragonSave): boolean {
  return !!save.finished
}

/** Nivel medio del equipo (para escalar reclutas y pintar el resumen). */
export function avgLevel(save: DragonSave): number {
  if (!save.team.length) return START_LEVEL
  return Math.round(save.team.reduce((a, f) => a + f.level, 0) / save.team.length)
}

export function isTeamWiped(save: DragonSave): boolean {
  return save.team.every((f) => f.hp <= 0)
}

// ------------------------------------------------------------- combates ---

export function buildEnemies(node: MapNode): Fighter[] {
  return (node.enemies ?? []).map((id) => createEnemy(id, node.level ?? 10))
}

export function startNodeBattle(save: DragonSave, node: MapNode, rng: RNG): Battle {
  const s = sagaOf(save.arc, save.saga)
  // La pericia del rival sube por saga y un punto más en jefes y élites: es la
  // palanca de dificultad que NO toca ningún número, así que subirla no
  // desequilibra el daño ni la economía de ki.
  setAiSkill(Math.min(0.75, s.aiSkill + (node.kind === 'jefe' ? 0.1 : node.kind === 'elite' ? 0.05 : 0)))
  const b = startBattle(save.team, buildEnemies(node), {
    seed: rng.int(1, 0x7fffffff),
    title: node.kind === 'jefe' ? `${node.label}` : node.label,
    scene: s.scene,
    phases: node.phases,
    bag: save.bag,
  })
  advance(b)
  return b
}

/** % de PS que cuesta una victoria: los PS PERSISTEN entre nodos. */
export interface BattleOutcome {
  win: boolean
  zeni: number
  levels: number
  zenkai: string[]
  learned: { name: string; techs: string[] }[]
  /** Transformaciones despertadas en este combate (ver `checkAwakenings`). */
  awakened: string[]
  /** Objetos que han subido de nivel por el uso. */
  itemUp: string[]
}

/**
 * Vuelca el resultado del combate al save: PS, dinero, niveles, bolsa y
 * **Zenkai**. Aguantar al borde de la muerte es EL incentivo de riesgo del
 * juego: ganar con menos de un cuarto de vida hace más fuerte al saiyan que lo
 * consiguió, para siempre y de forma acumulable.
 */
export const ZENKAI_THRESHOLD = 0.25
export const ZENKAI_GAIN = 0.07
export const ZENKAI_CAP = 1.7

export function applyBattleResult(save: DragonSave, b: Battle, node: MapNode): BattleOutcome {
  const out: BattleOutcome = { win: !!b.win, zeni: 0, levels: 0, zenkai: [], learned: [], awakened: [], itemUp: [] }
  save.battles += 1

  // PS de vuelta al equipo, y la bolsa tal como quedó (las semillas gastadas
  // en combate no vuelven).
  for (const c of b.allies) {
    const f = save.team.find((x) => x.uid === c.uid)
    if (f) f.hp = Math.max(0, c.hp)
  }
  save.bag = { ...b.bag }

  if (!b.win) {
    save.finished = 'derrota'
    return out
  }

  save.wins += 1
  const lastEnemyLevel = node.level ?? 10
  out.zeni = Math.round(
    (node.kind === 'jefe' ? 900 : node.kind === 'elite' ? 480 : 280) + lastEnemyLevel * 9,
  )
  save.zeni += out.zeni

  // Medido: con +3 por combate llegabas al jefe cuatro niveles por debajo y
  // los bots perdían el 100 % de los jefes de la primera saga.
  out.levels = node.kind === 'jefe' ? 6 : node.kind === 'elite' ? 6 : 4
  for (const f of save.team) {
    if (f.hp <= 0) continue // el que cae no aprende nada
    // El objeto que te acompaña se va dominando: solo cuenta si sobreviviste.
    if (f.item) {
      const antes = itemLevel(f)
      f.itemXp = (f.itemXp ?? 0) + 1
      if (itemLevel(f) > antes) {
        out.itemUp.push(`${f.name}: ${getItem(f.item)?.name} +${itemLevel(f)}`)
      }
    }
    // El lastre entrena el doble: penaliza en combate y se cobra aquí.
    const bonus = f.item ? (getItem(f.item)?.train ?? 0) : 0
    const res = levelUp(f, out.levels + bonus)
    if (res.learned.length) out.learned.push({ name: f.name, techs: res.learned })
  }

  // Zenkai: solo saiyans, solo si sobrevivieron con el depósito en rojo.
  for (const c of b.allies) {
    const f = save.team.find((x) => x.uid === c.uid)
    if (!f || f.lineage !== 'saiyan') continue
    if (c.hp <= 0 || c.hp > c.hpMax * ZENKAI_THRESHOLD) continue
    if (f.zenkai >= ZENKAI_CAP) continue
    f.zenkai = Math.min(ZENKAI_CAP, f.zenkai + ZENKAI_GAIN)
    save.zenkais += 1
    out.zenkai.push(f.name)
  }

  out.awakened = checkAwakenings(save, b, node)
  node.done = true
  return out
}

/**
 * DESPERTAR de transformaciones. La pieza que hace que el juego sea Dragon
 * Ball y no un autobattler con nombres prestados.
 *
 * No se compran ni se eligen en un menú: aparecen cuando llegas al nivel Y el
 * combate se ha puesto feo de verdad — un compañero ha caído, has ganado con
 * la vida en rojo, o acabas de tumbar a un jefe. Es literalmente cómo funciona
 * en el anime, y de paso premia justo lo que el Zenkai ya premia: pelear al
 * límite en vez de esconderse.
 */
export function checkAwakenings(save: DragonSave, b: Battle, node: MapNode): string[] {
  const cayoUnCompanero = b.allies.some((c) => c.fainted || c.hp <= 0)
  const out: string[] = []
  for (const c of b.allies) {
    const f = save.team.find((x) => x.uid === c.uid)
    if (!f || f.hp <= 0) continue
    const dramatico = cayoUnCompanero || c.hp <= c.hpMax * 0.35 || node.kind === 'jefe'
    if (!dramatico) continue
    const catalogo = getFighter(f.baseId)?.forms ?? []
    for (const id of catalogo) {
      if (f.forms.includes(id)) continue
      const def = getForm(id)
      if (!def) continue
      if (def.lineage && !def.lineage.includes(f.lineage)) continue
      if (f.level < (def.unlock ?? 999)) continue
      // El árbol: no se salta un escalón. A Superguerrero 2 no se llega sin
      // haber despertado antes el Superguerrero.
      if (def.requires && !f.forms.includes(def.requires)) continue
      f.forms.push(id)
      out.push(`${f.name} despierta: ${def.name}`)
      break // una por combate: que cada despertar sea un momento
    }
  }
  return out
}

// ---------------------------------------------- resolución de nodos suaves ---

/**
 * Nivel que reparte un nodo QUE NO ES COMBATE (tienda, descanso, aliado, bola).
 *
 * Sin esto, cuánto subías dependía de cuántos nodos de combate te hubiera
 * tocado en el mapa: unas runs llegaban al jefe a nivel 29 y otras a 17, y eso
 * no lo decide el jugador. Con +1, elegir el descanso sigue costando (un
 * combate da 4) pero ya no te descuelga de la curva para siempre.
 */
export const INTERLUDE_LEVELS = 1

/**
 * El PRÓLOGO (capa 0 de la primera saga) entrena casi como un combate. Buscar
 * compañía al empezar no puede costarte la curva: con el +1 de un interludio
 * normal, el bot llegaba corto al primer jefe y moría ahí 14 de cada 30 veces.
 *
 * El 3 está medido y es un filo: con 4, el bot que juega bien se va al 40 % de
 * runs ganadas; con 3 se queda en el 23 %, que es donde estaba el juego antes
 * de pasar a empezar con un solo luchador.
 */
export const PROLOGUE_LEVELS = 3

export function applyInterlude(save: DragonSave, node?: MapNode): void {
  const n = node && node.saga0Prologue ? PROLOGUE_LEVELS : INTERLUDE_LEVELS
  for (const f of save.team) {
    if (f.hp > 0) levelUp(f, n)
  }
}

export function applyRest(save: DragonSave): void {
  for (const f of save.team) {
    if (f.hp <= 0) continue // los caídos necesitan una judía, no una siesta
    f.hp = Math.min(fighterMaxHp(f), f.hp + Math.round(fighterMaxHp(f) * 0.6))
  }
}

export function applyTraining(save: DragonSave, uid: string, levels: number): string[] {
  const f = save.team.find((x) => x.uid === uid)
  if (!f) return []
  return levelUp(f, levels).learned
}

export function canRecruit(save: DragonSave): boolean {
  return save.team.length < TEAM_MAX
}

/**
 * A quién ofrece de verdad un nodo de aliado. El mapa se genera antes de saber
 * a quién llevas, así que si el candidato ya está en el equipo se busca otro
 * del tramo: si no, el nodo se gasta sin dar nada (medido en el diagnóstico).
 */
export function recruitCandidate(save: DragonSave, node: MapNode, rng: RNG): string | null {
  const s = sagaOf(save.arc, save.saga)
  const has = (id: string) => save.team.some((f) => f.baseId === id)
  if (node.recruit && !has(node.recruit)) return node.recruit
  const libres = s.recruits.filter((id) => !has(id))
  if (!libres.length) return null
  const pick = rng.pick(libres)
  node.recruit = pick
  return pick
}

/**
 * Ficha a alguien. Si el equipo está lleno NO lo mete: devuelve el luchador ya
 * construido para que la UI pregunte a quién sustituye (ver `swapIn`).
 *
 * Antes esto era un callejón sin salida: el mapa te anunciaba a Vegeta, entrabas
 * y te decía que estaba completo… gastando tu única elección de la capa.
 */
export function recruit(save: DragonSave, baseId: string): Fighter | null {
  if (save.team.some((f) => f.baseId === baseId)) return null
  // Entra al nivel medio del equipo: un fichaje a nivel 1 sería papel mojado.
  const f = createFighter(baseId, Math.max(START_LEVEL, avgLevel(save)))
  if (save.team.length >= TEAM_MAX) return f
  save.team.push(f)
  return f
}

/** Mete al nuevo en el sitio de otro. El que sale se queda por el camino. */
export function swapIn(save: DragonSave, entra: Fighter, saleUid: string): boolean {
  const i = save.team.findIndex((f) => f.uid === saleUid)
  if (i < 0) return false
  save.team[i] = entra
  return true
}

/** Lo que un maestro puede hacer por tu equipo, ya resuelto a opciones. */
export interface MasterOffer {
  uid: string
  fighterName: string
  kind: 'aprender' | 'mejorar'
  techId: string
  techName: string
  /** Nivel al que quedaría (solo en 'mejorar'). */
  level?: number
}

/**
 * Ofertas del maestro: primero enseñar lo que nadie sabe, y si no, subir de
 * nivel lo que ya se usa. Se limita a tres para que sea una decisión y no un
 * listado — y por eso las mejores van delante.
 */
export function masterOffers(save: DragonSave, masterId: string): MasterOffer[] {
  const m = getMaster(masterId)
  if (!m) return []
  const out: MasterOffer[] = []
  for (const f of save.team) {
    if (f.hp <= 0) continue
    for (const techId of m.teaches) {
      const t = getTechnique(techId)
      if (!t) continue
      if (!f.techniques.includes(techId)) {
        out.push({ uid: f.uid, fighterName: f.name, kind: 'aprender', techId, techName: t.name })
      } else {
        const lv = f.techLevels?.[techId] ?? 0
        if (lv < TECH_LEVEL_MAX) {
          out.push({
            uid: f.uid, fighterName: f.name, kind: 'mejorar', techId,
            techName: t.name, level: lv + 2,
          })
        }
      }
    }
  }
  // Aprender algo nuevo pesa más que pulir lo de siempre.
  out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'aprender' ? -1 : 1))
  return out.slice(0, 4)
}

export function applyMasterOffer(save: DragonSave, offer: MasterOffer): string {
  const f = save.team.find((x) => x.uid === offer.uid)
  if (!f) return ''
  if (offer.kind === 'aprender') {
    learnTechnique(f, offer.techId)
    return `${f.name} aprende ${offer.techName}.`
  }
  upgradeTechnique(f, offer.techId)
  return `${f.name} domina ${offer.techName} V${offer.level}.`
}

export function useItemOutOfBattle(save: DragonSave, itemId: string, uid: string): string | null {
  const it = getItem(itemId)
  if (!it || !it.field || !(save.bag[itemId] > 0)) return null
  const f = save.team.find((x) => x.uid === uid)
  if (!f) return null
  if (it.revive) {
    if (f.hp > 0) return null
    f.hp = Math.round(fighterMaxHp(f) * ((it.heal ?? 50) / 100))
  } else {
    if (f.hp <= 0) return null // curar a un caído no funciona: hace falta revivir
    if (it.heal) f.hp = Math.min(fighterMaxHp(f), f.hp + Math.round(fighterMaxHp(f) * (it.heal / 100)))
  }
  save.bag[itemId] -= 1
  if (save.bag[itemId] <= 0) delete save.bag[itemId]
  return `${f.name} usa ${it.name}`
}

// ---------------------------------------------------------- avance del mapa ---

/** Avanza a la siguiente capa o a la siguiente saga. Devuelve qué pasó. */
export function advanceMap(save: DragonSave, rng: RNG): 'capa' | 'saga' | 'fin' {
  if (save.layer < BOSS_LAYER) {
    save.layer += 1
    // Curación completa ANTES del jefe, igual que en el roguelike Pokémon: el
    // clímax tiene que decidirse por cómo peleas, no por con cuánta vida te
    // dejó el mapa. Los caídos siguen caídos (para eso están las judías).
    if (save.layer === BOSS_LAYER) {
      for (const f of save.team) {
        if (f.hp > 0) f.hp = fighterMaxHp(f)
      }
    }
    return 'capa'
  }
  // Jefe caído: siguiente saga del arco.
  if (save.saga >= arcLength(save.arc) - 1) {
    save.finished = 'victoria'
    return 'fin'
  }
  save.saga += 1
  save.layer = 0
  save.currentNode = null
  save.map = generateSagaMap(save.saga, rng, save.arc)
  // Entre sagas se cura al equipo Y SE LEVANTA A LOS CAÍDOS (a media vida). El
  // corte narrativo es el respiro: sin esto, perder a dos compañeros en la saga
  // 1 dejaba la run en una espiral de la que solo se salía comprando una Judía
  // de Karin de 3.000, y quedarte solo con Goku contra Freezer no es un reto,
  // es una run muerta que todavía hay que jugar.
  for (const f of save.team) {
    if (f.hp > 0) f.hp = fighterMaxHp(f)
  }
  // Y se levanta UN caído, el de más nivel. Solo uno: devolver el equipo
  // entero medía un salto del 10 % al 27 % de runs ganadas y hasta el bot que
  // juega a lo tonto se terminaba el juego. Perder gente tiene que doler.
  const caido = save.team.filter((f) => f.hp <= 0).sort((a, b) => b.level - a.level)[0]
  if (caido) caido.hp = Math.round(fighterMaxHp(caido) * 0.5)
  return 'saga'
}

// -------------------------------------------------------------- deseos ---

export interface Wish {
  id: string
  name: string
  desc: string
}

export const WISHES: Wish[] = [
  { id: 'revivir', name: 'Devolver la vida a mis amigos', desc: 'Todos los caídos vuelven con todas sus fuerzas.' },
  { id: 'poder', name: 'Quiero ser más fuerte', desc: '+8 niveles a todo el equipo.' },
  { id: 'zeni', name: 'Una fortuna', desc: '8.000 zeni de golpe.' },
  { id: 'semillas', name: 'La cosecha de Karin', desc: '3 Semillas del Ermitaño.' },
  { id: 'inmortal', name: 'La juventud eterna', desc: '+25 % de aguante permanente a todo el equipo.' },
]

export function grantWish(save: DragonSave, wishId: string): string {
  save.balls -= BALLS_FOR_WISH
  save.wishes.push(wishId)
  switch (wishId) {
    case 'revivir':
      for (const f of save.team) f.hp = fighterMaxHp(f)
      return 'Los caídos se levantan como si nada hubiera pasado.'
    case 'poder':
      for (const f of save.team) levelUp(f, 8)
      return 'Una descarga recorre a todo el equipo.'
    case 'zeni':
      save.zeni += 8000
      return 'Una montaña de billetes cae del cielo.'
    case 'semillas':
      save.bag.semilla = (save.bag.semilla ?? 0) + 3
      return 'Tres judías en la palma de la mano.'
    case 'inmortal':
      for (const f of save.team) {
        f.zenkai = Math.min(ZENKAI_CAP, f.zenkai + 0.25)
        f.hp = fighterMaxHp(f)
      }
      return 'El cuerpo deja de pesar. Nadie envejece hoy.'
    default:
      return ''
  }
}
