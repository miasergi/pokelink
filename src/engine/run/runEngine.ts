import type { PokemonInstance } from '@/types'
import { encounterPoolFor, getSpecies, basePoolFor } from '@/data'
import { RNG } from '@/utils/rng'
import { createInstance, selectMoveset } from '@/engine/team/instance'
import { computeStats, expForLevel, gainLevel, refreshMoves, effectiveTier, applyCaptureTier } from '@/engine/team/leveling'
import { evolve, effectiveEvoLevel, evolutionBlockedByItem } from '@/engine/team/evolution'
import { runBattle } from '@/engine/battle/battleEngine'
import type { BattleResult } from '@/engine/battle/types'
import { generateMap } from './mapGen'
import { generateStoryMap, applySonoroGene } from './storyMap'
import { EVENTS, type EventEffect, GIFT_ITEMS } from './nodes'
import { getItem } from '@/data/items'
import { tierPool } from './nodes'
import { healParty, MAX_PARTY } from './party'
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
  const starter = createInstance(config.starterId, config.starterLevel ?? 5, rng)
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
  const hard = run.difficulty === 'hard'

  // Difícil y Nuzlocke: Pokémon rivales (salvajes, entrenadores y jefes) a
  // ×1.4 de nivel (con la nueva curva ya alta, ×1.5 saturaba todo a 100).
  const tough = hard || run.difficulty === 'nuzlocke'
  if (tough) for (const m of enemyTeam) enforceMinLevel(m, Math.min(100, Math.round(m.level * 1.4)))

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

/** Tope de nivel del equipo: el nivel del próximo jefe sin vencer (gimnasio,
 *  Alto Mando o Campeón) más un margen por dificultad. El tope sube al ganar
 *  cada medalla. Sin esto, apilar caramelos en un solo Pokémon lo dejaba muy
 *  por encima de la curva y trivializaba la run entera (feedback de testers).
 *  Normal +5 · Difícil +1 sobre el nivel EFECTIVO (×1.4) · Nuzlocke +0 (clásico). */
export function levelCap(run: RunState): number {
  let next = 100
  for (const n of Object.values(run.map.nodes)) {
    if ((n.type === 'gym' || n.type === 'elite' || n.type === 'champion') && !n.cleared) {
      next = Math.min(next, n.enemyLevel)
    }
  }
  if (next >= 100) return 100
  if (run.difficulty === 'nuzlocke') return next
  if (run.difficulty === 'hard') return Math.min(100, Math.round(next * 1.4) + 1)
  return Math.min(100, next + 5)
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
  run.money += summary.moneyGained

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

  // Recompensa de nivel por casilla: salvaje +2; entrenadores, gimnasios, rival
  // y guardián +3; Alto Mando y Campeón +4. Solo a los que participaron.
  // Bonus GENEROSOS a propósito (v6.45): el equipo ENTERO debe seguir la curva
  // de forma natural (antes +1/+2 se quedaban atrás y la única estrategia viable
  // era chetar a UN Pokémon con caramelos). El tope por medallas (levelCap)
  // impide pasarse: la generosidad no rompe la curva porque el tope la frena.
  const cap = levelCap(run)
  const levelGain = node.type === 'battle' ? 2
    : (node.type === 'elite' || node.type === 'champion') ? 4
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
    run.money += 2000
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
      run.money = Math.max(0, run.money + eff.amount)
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
      if (rng.chance(eff.chance)) { run.money += eff.win; return `¡Suerte! Ganas ${eff.win} ₽.` }
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

/** Sube un Pokémon a un nivel mínimo (mantiene fracción de PS y aprende movimientos del nivel). */
function enforceMinLevel(mon: PokemonInstance, minLevel: number): void {
  if (mon.level >= minLevel) return
  const fainted = mon.currentHp <= 0
  const frac = mon.stats.hp > 0 ? mon.currentHp / mon.stats.hp : 1
  mon.level = minLevel
  mon.exp = expForLevel(minLevel)
  const sp = getSpecies(mon.speciesId)
  mon.stats = computeStats(sp.baseStats, mon.ivs, minLevel, mon.bonus)
  mon.currentHp = fainted ? 0 : Math.max(1, Math.round(mon.stats.hp * frac))
  // Refresca el moveset al nivel actual para no pelear con ataques flojos.
  const fresh = selectMoveset(sp, minLevel)
  if (fresh.length) mon.moves = fresh
}

export function isNodeBattle(node: MapNode): boolean {
  return (
    node.type === 'battle' || node.type === 'trainer' || node.type === 'rival' ||
    node.type === 'gym' || node.type === 'elite' || node.type === 'champion' ||
    node.type === 'legendary'
  )
}
