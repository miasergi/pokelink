import type { PokemonInstance } from '@/types'
import { encounterPoolFor, getSpecies, basePoolFor } from '@/data'
import { RNG } from '@/utils/rng'
import { createInstance } from '@/engine/team/instance'
import { gainLevel, refreshMoves, effectiveTier, applyCaptureTier } from '@/engine/team/leveling'
import { evolve, effectiveEvoLevel, evolutionBlockedByItem } from '@/engine/team/evolution'
import { runBattle } from '@/engine/battle/battleEngine'
import type { BattleResult } from '@/engine/battle/types'
import { generateMap, START_LEVEL } from './mapGen'
import { generateStoryMap, applySonoroGene } from './storyMap'
import { EVENTS, type EventEffect, GIFT_ITEMS } from './nodes'
import { getItem } from '@/data/items'
import { tierPool } from './nodes'
import { healParty, MAX_PARTY } from './party'
import { effectiveEnemyLevel } from './difficulty'
import { getGeneration } from '@/data/generations'
import type { Difficulty, MapNode, RandomFlags, RunState } from './types'
import type { PokemonType } from '@/types'

export interface NewRunConfig {
  /** Generaciones cuyos Pokémon aparecen. Por defecto, [gen]. */
  pools: number[]
  random: boolean
  /** Categorías a randomizar (si `random`). Por defecto (legacy) todas. */
  randomFlags?: RandomFlags
  /** Modo Monolocke: tipo único para todo lo que obtienes. */
  monotype?: PokemonType
  difficulty: Difficulty
  gen: number
  starterId: number
  seed: number
  /** Marca de reto diario (YYYY-MM-DD) si aplica. */
  daily?: string
  /** Modo Historia: nº de capítulo (usa un mapa temático propio). */
  story?: number
  /** Modo Historia: nivel inicial del compañero (acorde al capítulo). */
  starterLevel?: number
  /** Modo Historia: continuar con el equipo del capítulo anterior (en vez de
   *  empezar con un inicial nuevo). */
  party?: PokemonInstance[]
  /** Gen Sonoro (desbloqueado al completar la historia): aplica los tipos del
   *  dossier a las runs normales. */
  sonoro?: boolean
  /** Nivel LIBRE: desactiva el tope por medallas y deja subir sin límite
   *  (hasta 100). Lo elige el jugador al empezar la run. */
  freeLevel?: boolean
  /** Nuzlocke: veces que puedes perder un combate sin que acabe la run. Lo
   *  elige el jugador. Los Pokémon caídos se pierden igual, para siempre. */
  lives?: number
}

const ALL_RANDOM: RandomFlags = { starters: true, wild: true, trainers: true, elite: true }

/** Nombre de "región" mostrado para cada capítulo del Modo Historia. */
const STORY_CHAPTERS: Record<number, string> = {
  1: 'El Archipiélago de Niebla', 2: 'La Costa Prohibida', 3: 'Los Laboratorios Sumergidos',
  4: 'El Coro de los Inestables', 5: 'El Núcleo de Resonancia', 6: 'La Frecuencia Madre',
}

export function createRun(config: NewRunConfig): RunState {
  const rng = new RNG(config.seed)
  const pools = config.pools.length ? config.pools : [config.gen]
  // Runs antiguas/diario: `random` sin flags => randomiza todo (legacy).
  const randomFlags = config.random ? (config.randomFlags ?? ALL_RANDOM) : undefined
  const { map, rivalStarterId } = config.story
    ? { map: generateStoryMap(config.story, config.starterId, rng, config.difficulty).map, rivalStarterId: config.starterId }
    : generateMap(pools, config.gen, config.starterId, rng, config.difficulty, { randomFlags, monotype: config.monotype })
  // Modo Historia: si vienes del capítulo anterior, sigues con TU equipo (curado
  // y a pleno PS); si no, compañero nuevo al nivel del capítulo.
  const carried = config.party?.length ? structuredClone(config.party) : null
  if (carried) healParty(carried)
  const starter = createInstance(config.starterId, config.starterLevel ?? START_LEVEL, rng)
  if (config.story) starter.locked = true // Historia: tu compañero es intransferible
  // Gen Sonoro en runs normales: los Pokémon del dossier (y sus líneas) llevan
  // sus tipos alterados en TODO el mapa (enemigos, entrenadores, capturas,
  // rescates de Team Rocket) y también tu inicial si es uno de ellos.
  if (config.sonoro && !config.story) {
    applySonoroGene(starter)
    for (const node of Object.values(map.nodes)) {
      const c = node.content
      if (c.kind === 'wild') applySonoroGene(c.enemy)
      else if (c.kind === 'trainer') { c.team.forEach(applySonoroGene); if (c.rescue) applySonoroGene(c.rescue) }
      else if (c.kind === 'catch') c.offers.forEach(applySonoroGene)
    }
  }
  const region = config.story ? STORY_CHAPTERS[config.story] ?? 'Modo Historia' : getGeneration(config.gen).region

  return {
    pools,
    random: config.random,
    randomFlags,
    monotype: config.monotype,
    difficulty: config.difficulty,
    gen: config.gen,
    region,
    starterId: config.starterId,
    rivalStarterId,
    seed: config.seed,
    daily: config.daily,
    story: config.story,
    sonoro: config.sonoro,
    freeLevel: config.freeLevel,
    lives: config.difficulty === 'nuzlocke' ? Math.max(0, config.lives ?? 2) : undefined,
    rngState: rng.getState(),
    map,
    currentNodeId: null,
    currentLayer: -1,
    party: carried ?? [starter],
    box: [],
    inventory: { potion: 3, revive: 1 },
    money: 1000,
    status: 'active',
    stats: { battlesWon: 0, pokemonCaught: 0, gymsDefeated: 0, eliteDefeated: 0, turnsPlayed: 0 },
    startedAt: config.seed, // ancla de sesión; se fija a Date.now() en startRun
    elapsedMs: 0, // tiempo de juego activo acumulado
  }
}

/** Suma dinero llevando la cuenta del TOTAL ingresado en la run (para el
 *  resumen final). Los importes negativos restan del saldo pero no cuentan
 *  como ingreso. Úsala siempre en vez de tocar `run.money` a mano. */
export function addMoney(run: RunState, amount: number): void {
  run.money = Math.max(0, run.money + amount)
  if (amount > 0) run.stats.moneyEarned = (run.stats.moneyEarned ?? 0) + amount
}

/** Ejecuta una función con el RNG de la run y persiste su estado. */
function withRng<T>(run: RunState, fn: (rng: RNG) => T): T {
  const rng = new RNG(run.rngState)
  const out = fn(rng)
  run.rngState = rng.getState()
  return out
}

/** Nodos alcanzables ahora. */
export function availableNextNodes(run: RunState): MapNode[] {
  if (run.currentNodeId === null) {
    return run.map.layers[0].map((id) => run.map.nodes[id])
  }
  const cur = run.map.nodes[run.currentNodeId]
  return cur.next.map((id) => run.map.nodes[id])
}

export function enterNode(run: RunState, nodeId: string): MapNode {
  const node = run.map.nodes[nodeId]
  run.currentNodeId = nodeId
  run.currentLayer = node.layer
  run.stats.turnsPlayed++
  // OJO: las casillas que no son combate NO dan niveles. Se probó (+1 por
  // pisarlas) y se descartó: ya te pagan en objetos, caramelos y capturas, que
  // es su forma de fortalecer al equipo. Los niveles se ganan peleando y
  // comprando caramelos con el dinero de los combates.
  return node
}

// ---------------------------------------------------------------------------
// Combate
export function startNodeBattle(run: RunState, node: MapNode): BattleResult {
  const content = node.content
  let enemyTeam: PokemonInstance[]
  let enemyName: string | undefined
  if (content.kind === 'wild') {
    enemyTeam = [content.enemy]
    enemyName = getSpecies(content.enemy.speciesId).displayName
  } else if (content.kind === 'trainer') {
    enemyTeam = content.team
    enemyName = content.trainer.name
  } else {
    throw new Error('Nodo sin combate')
  }
  const isBoss = node.type === 'gym' || node.type === 'elite' || node.type === 'champion' || node.type === 'legendary'

  // Los enemigos pelean al nivel que pone el mapa, sin extras por dificultad:
  // Difícil y Nuzlocke ya vienen con su propia curva de jefes (nv.14 y +9 por
  // gimnasio frente a 11 y +8 de Normal), y las casillas de ruta se interpolan
  // entre esos anclas. Sumar niveles aquí solo hacía que el nivel de la ficha y
  // el del combate no coincidieran (v6.52).

  // SIN suelo de nivel: los Pokémon suben SOLO peleando (EXP) + el bonus de
  // casilla establecido (+1 salvaje / +2 entrenador / +3 jefe). Nada de subirles
  // niveles para "igualar" la zona ni al rival.
  // El Alto Mando / Campeón NO curan (gauntlet real): tu HP se arrastra entre
  // los 5 combates de la Liga. Ante los gimnasios decides tú si pasar por el
  // Centro Pokémon de la ruta previa.
  void isBoss

  const seed = withRng(run, (rng) => rng.int(1, 2 ** 30))
  return runBattle({ playerTeam: run.party, enemyTeam, seed, isBoss, enemyName })
}

export interface BattleOutcomeSummary {
  won: boolean
  moneyGained: number
  itemGained?: string
  evolutions: { uid: string; fromId: number; toId: number }[]
  /** Evoluciones con varias ramas: el jugador elige (uid + opciones). */
  evoChoices: { uid: string; options: number[] }[]
  /** Nuzlocke: nombres de los Pokémon perdidos para siempre en este combate. */
  lost: string[]
  /** Nuzlocke: perdiste el combate pero gastaste una vida y la run sigue. */
  lifeUsed?: boolean
  /** Nuzlocke: vidas que quedan tras gastar una. */
  livesLeft?: number
  /** Nombre del legendario capturado al vencer su guardián. */
  caughtLegendary?: string
  /** Legendario que te ofrece unirse tras vencerlo (tú decides). */
  legendaryOffer?: PokemonInstance
  /** Nombre del jefe derrotado (para celebrar / meme). */
  bossDefeated?: string
  /** Team Rocket: Pokémon secuestrado liberado que te ofrece unirse (tú decides,
   *  igual que con un legendario: añadir, liberar a uno para hacer hueco, o caja). */
  rescueOffer?: PokemonInstance
  /** Niveles ganados por Pokémon (combate + casilla). */
  levelGains: { name: string; levels: number }[]
  runEnded: boolean
  runWon: boolean
}

// (Megapiedra NO aquí: solo en tienda/casilla bien avanzada la run.)
// Botín variado compartido por jefes, nodos arriesgados y eventos de objeto.
const BOSS_DROPS = GIFT_ITEMS

/** Margen del tope de nivel RESPECTO AL NIVEL EFECTIVO del próximo jefe.
 *
 *  Normal +5 (colchón cómodo) · Difícil 0 (como mucho IGUALAS al as del jefe,
 *  nunca lo superas) · Nuzlocke −1 (llegas por debajo).
 *
 *  Difícil estuvo en +2 y se notaba: el equipo iba pegado al tope y por tanto
 *  SIEMPRE dos niveles por encima del as, con sensación de ir sobrado. Además
 *  las tres dificultades acababan dando el mismo tope en números absolutos
 *  (el extra del enemigo y el margen se cancelaban), así que el dial no
 *  diferenciaba nada.
 *
 *  −1 es el SUELO matemático, no un gusto: las casillas de ruta se interpolan
 *  hasta el nivel del próximo jefe menos 1, así que con un margen más bajo
 *  habría salvajes por encima del máximo que el jugador puede alcanzar y la run
 *  sería imposible por construcción (lo cubre `balance.test.ts`). */
const CAP_MARGIN: Record<string, number> = { normal: 5, hard: 0, nuzlocke: 0 }

/** Tope de nivel del equipo: el nivel EFECTIVO del próximo jefe sin vencer
 *  (gimnasio, Alto Mando o Campeón) más el margen de la dificultad. El tope
 *  sube al ganar cada medalla. Sin esto, apilar caramelos en un solo Pokémon lo
 *  dejaba muy por encima de la curva y trivializaba la run (feedback de testers).
 *
 *  Se calcula sobre el nivel EFECTIVO (el que ve el jugador en el mapa y el que
 *  se pelea de verdad) para que "tope" y "nivel del líder" sean comparables:
 *  antes el tope salía del nivel base y el líder se multiplicaba por 1.4, así
 *  que los dos números no cuadraban en pantalla. */
export function levelCap(run: RunState): number {
  // Nivel LIBRE (elección del jugador): sin tope, sube hasta 100 si quieres.
  // Sobrelevelear pasa a ser una decisión suya, no algo que el juego impide.
  if (run.freeLevel) return 100
  let next = 100
  for (const n of Object.values(run.map.nodes)) {
    if ((n.type === 'gym' || n.type === 'elite' || n.type === 'champion') && !n.cleared) {
      next = Math.min(next, effectiveEnemyLevel(n, run.difficulty))
    }
  }
  if (next >= 100) return 100
  return Math.max(5, Math.min(100, next + (CAP_MARGIN[run.difficulty] ?? 5)))
}

export function applyBattleOutcome(
  run: RunState, node: MapNode, result: BattleResult,
): BattleOutcomeSummary {
  // Quién participó = vivo ANTES del combate (para repartir niveles).
  const participated = new Set(run.party.filter((p) => p.currentHp > 0).map((p) => p.uid))
  // Sincroniza el equipo del jugador con el estado post-combate
  run.party = result.playerTeam

  const summary: BattleOutcomeSummary = {
    won: result.winner === 'player',
    moneyGained: 0,
    evolutions: [],
    evoChoices: [],
    lost: [],
    levelGains: [],
    runEnded: false,
    runWon: false,
  }

  const isBoss = node.type === 'gym' || node.type === 'elite' || node.type === 'champion'
  const isBossLike = isBoss || node.type === 'rival' || node.type === 'legendary'

  // Nuzlocke: los Pokémon debilitados se pierden para siempre.
  if (run.difficulty === 'nuzlocke') {
    const dead = run.party.filter((p) => p.currentHp <= 0)
    summary.lost = dead.map((p) => getSpecies(p.speciesId).displayName)
    run.party = run.party.filter((p) => p.currentHp > 0)
  }

  // Sin Pokémon = fin de la run.
  if (run.party.length === 0) {
    run.status = 'lost'
    summary.won = false
    summary.runEnded = true
    return summary
  }

  if (result.winner !== 'player') {
    // Nuzlocke: gastas una VIDA y sigues. Los caídos ya se han perdido para
    // siempre arriba, así que continuar duele igual; la vida solo evita que la
    // run muera de golpe. Sin vidas, se acabó.
    if (run.difficulty === 'nuzlocke' && (run.lives ?? 0) > 0) {
      run.lives = (run.lives ?? 0) - 1
      healParty(run.party) // los supervivientes se recomponen para seguir
      summary.lifeUsed = true
      summary.livesLeft = run.lives
      return summary
    }
    // En un autobattler, perder = todo el equipo debilitado: fin de la run
    // (salvo que tengas un Salvavidas, que se gestiona en finishBattle).
    run.status = 'lost'
    summary.runEnded = true
    void isBoss
    return summary
  }

  node.cleared = true
  run.stats.battlesWon++

  const content = node.content
  // Recompensa de dinero
  if (content.kind === 'trainer') {
    summary.moneyGained = content.trainer.reward.money
  } else if (content.kind === 'wild') {
    summary.moneyGained = 20 + node.enemyLevel * 6
  }
  // Nodo ARRIESGADO: doble dinero + objeto garantizado (mejor botín).
  if (node.risky && (content.kind === 'wild' || content.kind === 'trainer')) {
    summary.moneyGained *= 2
    summary.itemGained = withRng(run, (rng) => rng.pick(BOSS_DROPS))
    addItem(run, summary.itemGained, 1)
  }
  // Amuleto Moneda: +50% si algún Pokémon del equipo lo lleva equipado.
  if (run.party.some((p) => p.heldItemId === 'amulet-coin')) {
    summary.moneyGained = Math.round(summary.moneyGained * 1.5)
  }
  addMoney(run, summary.moneyGained)

  // Team Rocket: el Pokémon secuestrado te ofrece unirse (tú decides en pantalla,
  // igual que con un legendario). No se añade aquí: lo gestiona finishBattle.
  if (content.kind === 'trainer' && content.rescue) {
    summary.rescueOffer = structuredClone(content.rescue)
  }

  // Jefes: contador + drop + posible victoria final
  if (node.type === 'gym') run.stats.gymsDefeated++
  if (node.type === 'elite') run.stats.eliteDefeated++
  if (node.type === 'gym' || node.type === 'elite' || node.type === 'champion') {
    summary.itemGained = withRng(run, (rng) => rng.pick(BOSS_DROPS))
    addItem(run, summary.itemGained, 1)
  }
  if (node.type === 'champion') {
    run.status = 'won'
    summary.runWon = true
    summary.runEnded = true
  }

  // Al ganar a un jefe se celebra (meme), pero SOLO curan gimnasios, rival y
  // guardián. El Alto Mando / Campeón NO curan: la Liga es un gauntlet.
  if (isBossLike) {
    if (node.type !== 'elite' && node.type !== 'champion') healParty(run.party)
    summary.bossDefeated = content.kind === 'trainer' ? content.trainer.name : 'el guardián'
  }

  // Recompensa de nivel por casilla: salvaje +1 · entrenador de ruta +2
  // · TEAM ROCKET y JEFES +3 (gimnasio, rival, guardián, Alto Mando, Campeón).
  // Team Rocket cuenta como jefe aquí (van 3 Pokémon + el secuestrado) aunque
  // ocupe una casilla de entrenador normal.
  // Los combates de ruta dan poco a propósito, pero el grueso de la curva se
  // paga en los jefes, que son inevitables: así el equipo llega a nivel 100
  // ante el Campeón sin necesidad de convertir el mapa en un pasillo de peleas
  // (subir la frecuencia de combate a 75% se probó y hundía las runs, porque el
  // jugador sobrevive precisamente esquivando combates). Solo suben los que
  // participaron; el tope por medallas (levelCap) sigue poniendo el techo.
  const cap = levelCap(run)
  const isRocket = content.kind === 'trainer' && !!content.rescue
  const levelGain = node.type === 'battle' ? 1
    : node.type === 'trainer' ? (isRocket ? 3 : 2)
    : 3
  // Huevo Suerte: +1 nivel extra por combate al Pokémon que lo lleve.
  const boxBonus = (mon: PokemonInstance) => mon.heldItemId === 'lucky-egg' ? 1 : 0
  for (const mon of run.party) {
    if (!participated.has(mon.uid)) continue
    const gain = levelGain + boxBonus(mon)
    for (let i = 0; i < gain; i++) if (mon.level < cap) gainLevel(mon)
  }

  // Niveles ganados (combate por EXP + bonus de casilla) para mostrar logros.
  for (const mon of run.party) {
    const bonus = participated.has(mon.uid) ? levelGain + boxBonus(mon) : 0
    const total = (result.levelUps[mon.uid] || 0) + bonus
    if (total > 0) summary.levelGains.push({ name: getSpecies(mon.speciesId).displayName, levels: total })
  }

  // Guardián legendario: al vencerlo te ofrece unirse (tú decides en pantalla).
  if (node.type === 'legendary' && content.kind === 'wild') {
    addMoney(run, 2000)
    summary.legendaryOffer = content.enemy
  }

  // Evoluciones: una sola línea -> auto. Varias ramas (Eevee, Slowpoke,
  // Tyrogue, Wurmple...) -> SIEMPRE elige el jugador, aunque por nivel solo
  // calce una rama (p.ej. Slowking umbral 36 vs Slowbro 37).
  for (const mon of run.party) {
    if (evolutionBlockedByItem(mon)) continue
    const sp = getSpecies(mon.speciesId)
    if (!sp.evolutions.length) continue
    const ready = sp.evolutions.some((e) => mon.level >= effectiveEvoLevel(e.trigger))
    if (!ready) continue
    if (sp.evolutions.length === 1) {
      const to = getSpecies(sp.evolutions[0].toId)
      const fromId = mon.speciesId
      evolve(mon, to)
      summary.evolutions.push({ uid: mon.uid, fromId, toId: to.id })
    } else {
      summary.evoChoices.push({ uid: mon.uid, options: sp.evolutions.map((e) => e.toId) })
    }
  }

  return summary
}

// ---------------------------------------------------------------------------
// Nodos no-combate
export function resolveHeal(run: RunState, node: MapNode): void {
  healParty(run.party)
  node.cleared = true
}

export function catchPokemon(
  run: RunState, node: MapNode, accept: boolean, chosenUid?: string, replaceUid?: string,
): { caught: boolean; toBox: boolean } {
  node.cleared = true
  if (!accept || node.content.kind !== 'catch') return { caught: false, toBox: false }
  const offers = node.content.offers
  const mon = offers.find((o) => o.uid === chosenUid) ?? offers[0]
  // Reemplazo: el Pokémon del equipo elegido se LIBERA (no hay caja). Su objeto
  // equipado vuelve a la mochila (no se pierde).
  if (replaceUid) {
    const idx = run.party.findIndex((p) => p.uid === replaceUid)
    if (idx >= 0 && run.party[idx].locked) return { caught: false, toBox: false } // intransferible
    if (idx >= 0) {
      if (run.party[idx].heldItemId) addItem(run, run.party[idx].heldItemId!, 1)
      run.party[idx] = mon
      run.stats.pokemonCaught++
      return { caught: true, toBox: false }
    }
  }
  if (run.party.length < MAX_PARTY) {
    run.party.push(mon)
    run.stats.pokemonCaught++
    return { caught: true, toBox: false }
  }
  // Equipo lleno y sin liberar: no se puede capturar.
  return { caught: false, toBox: false }
}

export function pickItem(run: RunState, node: MapNode, itemId: string): void {
  if (node.content.kind !== 'item') return
  if (node.content.choices.includes(itemId)) addItem(run, itemId, 1)
  node.cleared = true
}

export function buyItem(run: RunState, itemId: string, price: number): boolean {
  if (run.money < price) return false
  run.money -= price
  addItem(run, itemId, 1)
  return true
}

export function leaveShop(_run: RunState, node: MapNode): void {
  node.cleared = true
}

/** Intercambio: cambias un Pokémon por otro aleatorio de primera etapa (+3 niveles). */
export function resolveTrade(
  run: RunState, node: MapNode, monUid: string,
): { fromId: number; toId: number; level: number; shiny: boolean } | null {
  if (node.content.kind !== 'trade') return null
  const idx = run.party.findIndex((p) => p.uid === monUid)
  if (idx < 0 || run.money < node.content.cost) return null
  if (run.party[idx].locked) return null // intransferible (Modo Historia)
  const traded = run.party[idx]
  // Monolocke: el Pokémon recibido también es del tipo elegido.
  const pool = monotypePool(basePoolFor(run.pools), run.monotype)
  const newMon = withRng(run, (rng) => createInstance(rng.pick(pool).id, traded.level + 3, rng))
  // El Pokémon recibido conserva el MISMO nivel de potencia del ataque que diste.
  newMon.moveTier = effectiveTier(traded)
  refreshMoves(newMon)
  if (run.sonoro) applySonoroGene(newMon) // gen Sonoro activo: también en intercambios
  // El objeto que sostenía el Pokémon entregado vuelve a la mochila.
  if (traded.heldItemId) addItem(run, traded.heldItemId, 1)
  run.party[idx] = newMon
  run.money -= node.content.cost
  run.stats.pokemonCaught++
  node.cleared = true
  return { fromId: traded.speciesId, toId: newMon.speciesId, level: newMon.level, shiny: !!newMon.shiny }
}

export function skipNode(node: MapNode): void {
  node.cleared = true
}

export function resolveEvent(run: RunState, node: MapNode, optionIndex: number): string {
  if (node.content.kind !== 'event') return ''
  const def = EVENTS[node.content.eventId]
  node.cleared = true
  const opt = def.options[optionIndex] ?? def.options[0]
  return withRng(run, (rng) => applyEventEffect(run, opt.effect, rng))
}

function applyEventEffect(run: RunState, eff: EventEffect, rng: RNG): string {
  switch (eff.kind) {
    case 'money':
      addMoney(run, eff.amount)
      return eff.amount >= 0 ? `Recibes ${eff.amount} ₽.` : `Pierdes ${-eff.amount} ₽.`
    case 'heal':
      healParty(run.party)
      return '¡Tu equipo recuperó toda la salud!'
    case 'damage':
      for (const p of run.party) if (p.currentHp > 0) p.currentHp = Math.max(1, p.currentHp - Math.floor(p.stats.hp * eff.frac))
      return 'Tu equipo recibió daño...'
    case 'item':
      addItem(run, eff.itemId, eff.qty)
      return `Conseguiste ${eff.qty}× ${getItem(eff.itemId).name}.`
    case 'randomItem': {
      const d = rng.pick(BOSS_DROPS)
      addItem(run, d, 1)
      return `¡Conseguiste ${getItem(d).name}!`
    }
    case 'addMon': {
      const mon = randomPartyLevelMon(run, rng)
      if (run.party.length < MAX_PARTY) run.party.push(mon)
      else run.box.push(mon)
      run.stats.pokemonCaught++
      return `¡Se unió ${getSpecies(mon.speciesId).displayName} a tu equipo!`
    }
    case 'levelUp': {
      // Respeta el tope de nivel por medallas (igual que el bonus de casilla).
      const cap = levelCap(run)
      for (let i = 0; i < eff.amount; i++) for (const p of run.party) if (p.currentHp > 0 && p.level < cap) gainLevel(p)
      return `¡Tu equipo subió ${eff.amount} nivel(es)!`
    }
    case 'loseMoneyFrac': {
      const lost = Math.floor(run.money * eff.frac)
      if (lost <= 0) return 'No pasó nada.'
      run.money -= lost
      return `Pierdes ${lost} ₽.`
    }
    case 'gamble':
      if (run.money < eff.cost) return 'No tienes suficiente dinero.'
      run.money -= eff.cost
      if (rng.chance(eff.chance)) { addMoney(run, eff.win); return `¡Suerte! Ganas ${eff.win} ₽.` }
      return 'No hubo suerte esta vez...'
    case 'risky':
      return applyEventEffect(run, rng.chance(eff.chance) ? eff.good : eff.bad, rng)
    case 'multi':
      // Aplica todos los efectos y junta los mensajes (p.ej. curar + dar objeto).
      return eff.effects.map((e) => applyEventEffect(run, e, rng)).filter(Boolean).join(' ')
    case 'none':
      return 'No pasó nada.'
  }
}

// ---------------------------------------------------------------------------
// Inventario / objetos
export function addItem(run: RunState, itemId: string, qty: number): void {
  run.inventory[itemId] = (run.inventory[itemId] || 0) + qty
}

export function removeItem(run: RunState, itemId: string, qty = 1): boolean {
  const have = run.inventory[itemId] || 0
  if (have < qty) return false
  run.inventory[itemId] = have - qty
  if (run.inventory[itemId] <= 0) delete run.inventory[itemId]
  return true
}

function randomPartyLevelMon(run: RunState, rng: RNG): PokemonInstance {
  const avg = Math.round(
    run.party.reduce((a, p) => a + p.level, 0) / Math.max(1, run.party.length),
  )
  // Monolocke: los Pokémon de evento (huevo/criador) también son del tipo.
  const pool = monotypePool(encounterPoolFor(run.pools), run.monotype)
  const tier = tierPool(pool, avg)
  const sp = rng.pick(tier)
  const mon = createInstance(sp.id, Math.max(2, avg), rng)
  applyCaptureTier(mon) // Pokémon obtenido: misma curva de potencia que una captura
  if (run.sonoro) applySonoroGene(mon) // gen Sonoro activo: también en eventos (huevo, criador…)
  return mon
}

/** Filtra un pool al tipo del Monolocke. Si no hay (o no es monolocke), el pool tal cual. */
function monotypePool(pool: import('@/types').SpeciesData[], monotype?: PokemonType): import('@/types').SpeciesData[] {
  if (!monotype) return pool
  const f = pool.filter((s) => s.types.includes(monotype))
  return f.length ? f : pool
}

// (Aquí vivía `enforceMinLevel`, que subía al equipo enemigo el extra de
// Difícil/Nuzlocke justo antes de pelear. Ya no hace falta: cada dificultad
// tiene su propia curva de jefes y los enemigos nacen con su nivel final.)

export function isNodeBattle(node: MapNode): boolean {
  return (
    node.type === 'battle' || node.type === 'trainer' || node.type === 'rival' ||
    node.type === 'gym' || node.type === 'elite' || node.type === 'champion' ||
    node.type === 'legendary'
  )
}
