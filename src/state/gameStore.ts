import { create } from 'zustand'
import type { RunState } from '@/engine/run/types'
import type { BattleResult } from '@/engine/battle/types'
import {
  createRun, enterNode, startNodeBattle, applyBattleOutcome, isNodeBattle,
  resolveHeal, catchPokemon, pickItem, buyItem, leaveShop, resolveEvent, removeItem, addItem,
  resolveTrade, skipNode, levelCap,
  type BattleOutcomeSummary, type NewRunConfig,
} from '@/engine/run/runEngine'
import { applyHealItem } from '@/engine/run/party'
import { commitElapsed } from '@/engine/run/playtime'
import * as Party from '@/engine/run/party'
import { getMegaForms, getSpecies, toBaseSpeciesId } from '@/data'
import { checkAchievements } from '@/engine/run/achievements'
import { evolve, levelEvolutionTargets, evolutionBlockedByItem, cycleRegionalForm } from '@/engine/team/evolution'
import { gainLevel, refreshMoves, effectiveTier } from '@/engine/team/leveling'
import { saveRun, loadRun, clearRun, loadMeta, saveMeta, mergeMeta, recomputeTotals, saveLeague, loadLeague, clearLeague } from '@/persistence/db'
import type { PokemonInstance } from '@/types'
import type { LeagueState } from '@/engine/league/types'
import { runBattle } from '@/engine/battle/battleEngine'
import {
  createLeague, playerGroupMatch, recordGroupResult, advanceMatchday,
  playerKnockoutMatch, recordKnockoutResult, advanceKnockoutRound,
  leagueAchievements, playerBestStage, stageRank,
} from '@/engine/league/league'
import { cloudEnabled, currentUser, signIn, signUp, signOut, loadCloudMeta, saveCloudMeta, submitGloryRun, type CloudUser } from '@/persistence/supabase'

export type ScreenName =
  | 'home' | 'modeSelect' | 'genSelect' | 'starterSelect' | 'randomSetup'
  | 'leagueSetup' | 'league' | 'story'
  | 'map' | 'battle' | 'reward' | 'catch' | 'item' | 'shop' | 'event' | 'heal'
  | 'team' | 'pokedex' | 'records' | 'settings' | 'gameover' | 'victory' | 'rescue' | 'trade' | 'account' | 'leaderboard' | 'legendary' | 'achievements'

interface Screen {
  name: ScreenName
  params?: Record<string, unknown>
}

interface PendingBattle {
  nodeId: string
  result: BattleResult
}

interface LeagueBattle {
  result: BattleResult
  playerTeam: PokemonInstance[]
  enemyTeam: PokemonInstance[]
  enemyName: string
  enemySprite: string
}

interface GameState {
  screen: Screen
  history: Screen[]
  run: RunState | null
  pendingBattle: PendingBattle | null
  // --- Liga Pokémon ---
  league: LeagueState | null
  leagueBattle: LeagueBattle | null
  hasSavedLeague: boolean
  totalWins: number
  startLeague: (team: PokemonInstance[], playerName: string, sprite: string) => void
  startLeagueWithRunTeam: (sprite: string) => void
  resumeLeague: () => Promise<void>
  abandonLeague: () => Promise<void>
  startLeagueMatch: () => void
  finishLeagueBattle: () => void
  equipLeagueItem: (uid: string, itemId: string) => void
  unequipLeagueItem: (uid: string) => void
  setLeagueOrder: (uids: string[]) => void
  lastSummary: BattleOutcomeSummary | null
  battleSummary: BattleOutcomeSummary | null
  closeBattle: () => void
  lastEventResult: string | null
  clearEventResult: () => void
  newAchievements: string[]
  clearNewAchievements: () => void
  /** Nº de especies capturadas (para la recompensa de dinero inicial por Pokédex). */
  dexCaught: number
  /** Pokémon compañero (speciesId) que se ve en Inicio. */
  pet: number | null
  setPet: (speciesId: number | null) => Promise<void>
  evoFx: { uid: string; fromId: number; toId: number } | null
  evoChoice: { uid: string; itemId: string | null; options: number[] } | null
  evoQueue: { uid: string; options: number[] }[]
  evolveByLevel: (monUid: string) => boolean
  chooseEvolution: (targetId: number) => void
  cancelEvoChoice: () => void
  rescueNodeId: string | null
  legendaryOffer: import('@/types').PokemonInstance | null
  /** Origen de la oferta de unirse: legendario vencido o Pokémon liberado de Team Rocket. */
  offerKind: 'legendary' | 'rescue'
  addLegendary: (replaceUid?: string) => void
  skipLegendary: () => void
  useRescue: (monUid: string) => void
  doTrade: (monUid: string) => void
  skipTrade: () => void
  tradeReveal: { fromId: number; toId: number; level: number; shiny: boolean } | null
  closeTradeReveal: () => void
  loaded: boolean
  hasSavedRun: boolean

  // cuentas en la nube (Supabase)
  cloudUser: CloudUser | null
  cloudBusy: boolean
  cloudMsg: string | null
  alias: string
  setAlias: (name: string) => Promise<void>
  cloudAuth: (mode: 'in' | 'up', email: string, password: string) => Promise<boolean>
  cloudLogout: () => void
  cloudSync: () => Promise<void>

  // navegación
  navigate: (name: ScreenName, params?: Record<string, unknown>) => void
  back: () => void

  // ciclo de vida de la run
  init: () => Promise<void>
  startRun: (config: Omit<NewRunConfig, 'seed'> & { seed?: number }) => void
  resumeRun: () => Promise<void>
  /** Reinicia la run. Con `sameSeed`, reusa la misma semilla (mismo mapa/inicial). */
  restartRun: (sameSeed?: boolean) => void
  abandonRun: () => Promise<void>

  // interacción con nodos
  chooseNode: (nodeId: string) => void
  finishBattle: () => void
  doHeal: (nodeId: string) => void
  doCatch: (nodeId: string, accept: boolean, chosenUid?: string, replaceUid?: string) => void
  doPickItem: (nodeId: string, itemId: string) => void
  doBuy: (itemId: string, price: number) => void
  doLeaveShop: (nodeId: string) => void
  doEvent: (nodeId: string, optionIndex: number) => void

  // objetos sobre el equipo
  useItem: (itemId: string, monUid: string) => boolean
  useEvolutionItem: (itemId: string, monUid: string) => boolean
  clearEvoFx: () => void
  setLead: (monUid: string) => void
  setPartyOrder: (uids: string[]) => void
  equipItem: (itemId: string, monUid: string) => void
  unequipHeld: (monUid: string) => void
}

function persist(run: RunState | null) {
  // Acumula el tiempo de juego activo antes de guardar, para que al cerrar y
  // reabrir no se cuente el tiempo con la app cerrada.
  if (run && run.status === 'active') { commitElapsed(run); void saveRun(run) }
}

function cloneRun(run: RunState): RunState {
  return structuredClone(run)
}

/** Si el jugador ya no tiene combate (eliminado o no clasificó), simula el resto
 *  de eliminatorias hasta coronar al campeón. */
function autoFinishLeague(league: LeagueState): void {
  if (league.phase !== 'knockout') return
  let guard = 0
  while (league.phase === 'knockout' && !playerKnockoutMatch(league) && guard++ < 12) {
    advanceKnockoutRound(league)
  }
}

/** Otorga logros de Liga y actualiza récords (campeonatos, mejor fase). */
async function awardLeague(league: LeagueState): Promise<void> {
  const meta = await loadMeta()
  const ach = leagueAchievements(league).filter((id) => !meta.achievements.includes(id))
  const stage = playerBestStage(league)
  let changed = false
  if (!meta.leagueBestStage || stageRank(stage) > stageRank(meta.leagueBestStage)) { meta.leagueBestStage = stage; changed = true }
  if (ach.includes('league_champion')) { meta.leagueChampionships = (meta.leagueChampionships ?? 0) + 1; changed = true }
  if (ach.length) { meta.achievements = [...new Set([...meta.achievements, ...ach])]; changed = true }
  if (changed) { await saveMeta(meta); if (currentUser()) await saveCloudMeta(meta) }
  if (ach.length) useGame.setState((s) => ({ newAchievements: [...s.newAchievements, ...ach] }))
}

export const useGame = create<GameState>((set, get) => ({
  screen: { name: 'home' },
  history: [],
  run: null,
  pendingBattle: null,
  league: null,
  leagueBattle: null,
  hasSavedLeague: false,
  totalWins: 0,
  lastSummary: null,
  battleSummary: null,
  lastEventResult: null,
  evoFx: null,
  evoChoice: null,
  evoQueue: [],
  rescueNodeId: null,
  tradeReveal: null,
  loaded: false,
  hasSavedRun: false,
  cloudUser: currentUser(),
  cloudBusy: false,
  cloudMsg: null,
  alias: '',
  pet: null,

  setPet: async (speciesId) => {
    set({ pet: speciesId })
    const meta = await loadMeta()
    meta.pet = speciesId
    await saveMeta(meta)
    if (currentUser()) await saveCloudMeta(meta)
  },

  setAlias: async (name) => {
    const alias = name.trim().slice(0, 20)
    set({ alias })
    const meta = await loadMeta()
    meta.alias = alias
    await saveMeta(meta)
    if (currentUser()) await saveCloudMeta(meta)
  },

  cloudAuth: async (mode, email, password) => {
    if (!cloudEnabled()) { set({ cloudMsg: 'La nube no está configurada.' }); return false }
    set({ cloudBusy: true, cloudMsg: null })
    const r = mode === 'in' ? await signIn(email, password) : await signUp(email, password)
    if (!r.ok) { set({ cloudBusy: false, cloudMsg: r.error ?? 'Error' }); return false }
    set({ cloudUser: currentUser() })
    await get().cloudSync()
    set({ cloudBusy: false, cloudMsg: '✅ Sesión iniciada y sincronizada' })
    return true
  },
  cloudLogout: () => { signOut(); set({ cloudUser: null, cloudMsg: 'Sesión cerrada' }) },
  cloudSync: async () => {
    if (!get().cloudUser) return
    set({ cloudBusy: true })
    const local = await loadMeta()
    const cloud = await loadCloudMeta()
    const merged = cloud ? mergeMeta(local, cloud) : local
    recomputeTotals(merged) // corrige contadores inflados por el antiguo bug
    await saveMeta(merged)
    await saveCloudMeta(merged)
    set({ cloudBusy: false, alias: merged.alias || get().alias, dexCaught: merged.pokedexCaught.length, pet: merged.pet ?? get().pet, totalWins: merged.totals.wins })
  },

  navigate: (name, params) =>
    set((s) => ({ screen: { name, params }, history: [...s.history, s.screen] })),
  back: () =>
    set((s) => {
      const prev = s.history[s.history.length - 1]
      return prev ? { screen: prev, history: s.history.slice(0, -1) } : {}
    }),

  init: async () => {
    if (get().cloudUser) void get().cloudSync()
    void loadMeta().then(async (m) => {
      if (m.alias) set({ alias: m.alias })
      set({ dexCaught: m.pokedexCaught.length, pet: m.pet ?? null, totalWins: m.totals.wins })
      if (recomputeTotals(m)) await saveMeta(m) // corrige contadores antiguos (offline)
    })
    const saved = await loadRun()
    const savedLeague = await loadLeague()
    set({ loaded: true, hasSavedRun: !!saved, hasSavedLeague: !!savedLeague })
  },

  startRun: (config) => {
    const seed = config.seed ?? Math.floor(Math.random() * 2 ** 31)
    const run = createRun({ pools: config.pools, random: config.random, randomFlags: config.randomFlags, monotype: config.monotype, difficulty: config.difficulty, gen: config.gen, starterId: config.starterId, seed, daily: config.daily })
    run.startedAt = Date.now()
    run.elapsedMs = 0 // cronómetro de juego activo (no cuenta app cerrada)
    // Todas las runs empiezan con el MISMO dinero (1000 ₽). Sin bono de Pokédex.
    void clearRun()
    saveRun(run)
    set({ run, hasSavedRun: true, lastEventResult: null, screen: { name: 'map' }, history: [] })
  },

  resumeRun: async () => {
    const run = await loadRun()
    if (run) {
      // Reanudar: reinicia el ancla del cronómetro a "ahora" para NO contar el
      // tiempo que la app estuvo cerrada (el activo ya está en elapsedMs).
      run.startedAt = Date.now()
      void saveRun(run)
      set({ run, lastEventResult: null, screen: { name: 'map' }, history: [] })
    }
  },

  restartRun: (sameSeed?: boolean) => {
    const run = get().run
    if (!run) {
      set({ screen: { name: 'home' }, history: [] })
      return
    }
    // Reto diario: reinicia SIEMPRE el mismo desafío (misma semilla/mapa/fecha).
    // En una run normal, `sameSeed` permite reintentar el MISMO mapa; si no, mapa nuevo.
    const keepSeed = sameSeed || !!run.daily
    get().startRun({
      pools: run.pools, random: run.random, randomFlags: run.randomFlags, monotype: run.monotype,
      gen: run.gen, starterId: run.starterId, difficulty: run.difficulty,
      ...(keepSeed ? { seed: run.seed } : {}),
      ...(run.daily ? { daily: run.daily } : {}),
    })
  },

  doTrade: (monUid) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    const nodeId = get().screen.params?.nodeId as string | undefined
    const node = nodeId ? run.map.nodes[nodeId] : undefined
    if (!node) return
    const res = resolveTrade(run, node, monUid)
    persist(run)
    if (res) void syncDexFromRun(run)
    if (res) set({ run, tradeReveal: res }) // se queda en la pantalla mostrando la animación
    else set({ run, screen: { name: 'map' }, history: [] })
  },

  closeTradeReveal: () => set({ tradeReveal: null, screen: { name: 'map' }, history: [] }),

  skipTrade: () => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    const nodeId = get().screen.params?.nodeId as string | undefined
    if (nodeId && run.map.nodes[nodeId]) skipNode(run.map.nodes[nodeId])
    persist(run)
    set({ run, screen: { name: 'map' }, history: [] })
  },

  useRescue: (monUid) => {
    const cur = get().run
    const nodeId = get().rescueNodeId
    if (!cur) return
    const run = cloneRun(cur)
    const mon = run.party.find((p) => p.uid === monUid)
    if (mon) { mon.currentHp = mon.stats.hp; mon.status = 'none' }
    removeItem(run, 'revive-charm', 1)
    run.status = 'active'
    if (nodeId && run.map.nodes[nodeId]) run.map.nodes[nodeId].cleared = true // superas la casilla
    persist(run)
    set({ run, rescueNodeId: null, screen: { name: 'map' }, history: [] })
  },

  abandonRun: async () => {
    const run = get().run
    // Solo registrar si la run sigue activa (abandono real). Si ya está ganada
    // o perdida, finishBattle ya la registró: NO duplicar.
    if (run && run.status === 'active') { const a = await recordRunEnd(run); if (a.length) set({ newAchievements: a }) }
    await clearRun()
    set({ run: null, hasSavedRun: false, pendingBattle: null, screen: { name: 'home' }, history: [] })
  },

  // --- Liga Pokémon ---
  startLeague: (team, playerName, sprite) => {
    const seed = Math.floor(Math.random() * 2 ** 31)
    const league = createLeague(playerName, sprite, team, seed)
    void clearLeague(); void saveLeague(league)
    set({ league, hasSavedLeague: true, leagueBattle: null, screen: { name: 'league' }, history: [] })
  },
  // Desde la pantalla de victoria: entra a la Liga con el equipo ganador y limpia la run.
  startLeagueWithRunTeam: (sprite) => {
    const run = get().run
    if (!run) return
    const team = run.party.map((p) => structuredClone(p))
    void clearRun()
    const seed = Math.floor(Math.random() * 2 ** 31)
    const league = createLeague(get().alias || 'Tú', sprite, team, seed)
    void clearLeague(); void saveLeague(league)
    set({ run: null, hasSavedRun: false, pendingBattle: null, league, hasSavedLeague: true, leagueBattle: null, screen: { name: 'league' }, history: [] })
  },
  resumeLeague: async () => {
    const league = await loadLeague()
    if (league) set({ league, leagueBattle: null, screen: { name: 'league' }, history: [] })
  },
  abandonLeague: async () => {
    await clearLeague()
    set({ league: null, hasSavedLeague: false, leagueBattle: null, screen: { name: 'home' }, history: [] })
  },
  startLeagueMatch: () => {
    const league = get().league
    if (!league) return
    const gm = playerGroupMatch(league)
    const km = gm ? null : playerKnockoutMatch(league)
    let opp: number
    if (gm) opp = gm.a === league.playerIdx ? gm.b : gm.a
    else if (km && km.a != null && km.b != null) opp = km.a === league.playerIdx ? km.b : km.a
    else return
    const player = league.participants[league.playerIdx]
    const enemy = league.participants[opp]
    const seed = Math.floor(Math.random() * 2 ** 30)
    const result = runBattle({ playerTeam: structuredClone(player.team), enemyTeam: structuredClone(enemy.team), seed, isBoss: true, enemyName: enemy.name })
    set({
      leagueBattle: { result, playerTeam: structuredClone(player.team), enemyTeam: structuredClone(enemy.team), enemyName: enemy.name, enemySprite: enemy.sprite },
      pendingBattle: { nodeId: '', result }, battleSummary: null, screen: { name: 'battle' }, history: [],
    })
  },
  finishLeagueBattle: () => {
    const cur = get().league
    const lb = get().leagueBattle
    if (!cur || !lb) { set({ leagueBattle: null, pendingBattle: null, screen: { name: 'league' }, history: [] }); return }
    const league = structuredClone(cur)
    // Qué Pokémon cayeron en cada bando (por uid) para el detalle del combate.
    const fpSet = new Set<string>(), feSet = new Set<string>()
    for (const e of lb.result.events) if (e.kind === 'faint') (e.side === 'player' ? fpSet : feSet).add(e.uid)
    const fp = fpSet.size, fe = feSet.size
    const side = (team: PokemonInstance[], dead: Set<string>) => team.map((m) => ({ speciesId: m.speciesId, shiny: m.shiny, fainted: dead.has(m.uid) }))
    const playerDetail = side(lb.playerTeam, fpSet)
    const enemyDetail = side(lb.enemyTeam, feSet)
    const playerWon = lb.result.winner === 'player'
    const gm = playerGroupMatch(league)
    if (gm) {
      const isA = gm.a === league.playerIdx
      recordGroupResult(league, gm, isA
        ? { winner: playerWon ? 'a' : 'b', killsA: fe - fp, killsB: fp - fe, detailA: playerDetail, detailB: enemyDetail }
        : { winner: playerWon ? 'b' : 'a', killsA: fp - fe, killsB: fe - fp, detailA: enemyDetail, detailB: playerDetail })
      advanceMatchday(league)
    } else {
      const km = playerKnockoutMatch(league)
      if (km && km.a != null && km.b != null) {
        const isA = km.a === league.playerIdx
        recordKnockoutResult(league, km, playerWon ? league.playerIdx : (isA ? km.b : km.a), {
          winner: (isA ? playerWon : !playerWon) ? 'a' : 'b',
          killsA: isA ? fe - fp : fp - fe, killsB: isA ? fp - fe : fe - fp,
          detailA: isA ? playerDetail : enemyDetail, detailB: isA ? enemyDetail : playerDetail,
        })
      }
      advanceKnockoutRound(league)
    }
    autoFinishLeague(league)
    void saveLeague(league)
    void awardLeague(league)
    set({ league, leagueBattle: null, pendingBattle: null, battleSummary: null, screen: { name: 'league' }, history: [] })
  },
  equipLeagueItem: (uid, itemId) => {
    const cur = get().league
    if (!cur) return
    const league = structuredClone(cur)
    const mon = league.participants[league.playerIdx].team.find((m) => m.uid === uid)
    if (!mon) return
    mon.heldItemId = itemId
    void saveLeague(league)
    set({ league })
  },
  unequipLeagueItem: (uid) => {
    const cur = get().league
    if (!cur) return
    const league = structuredClone(cur)
    const mon = league.participants[league.playerIdx].team.find((m) => m.uid === uid)
    if (!mon) return
    mon.heldItemId = null
    void saveLeague(league)
    set({ league })
  },
  setLeagueOrder: (uids) => {
    const cur = get().league
    if (!cur) return
    const league = structuredClone(cur)
    const team = league.participants[league.playerIdx].team
    const map = new Map(team.map((m) => [m.uid, m]))
    const reordered = uids.map((u) => map.get(u)).filter((m): m is NonNullable<typeof m> => !!m)
    if (reordered.length === team.length) league.participants[league.playerIdx].team = reordered
    void saveLeague(league)
    set({ league })
  },

  chooseNode: (nodeId) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    const node = enterNode(run, nodeId)

    if (isNodeBattle(node)) {
      const result = startNodeBattle(run, node)
      set({ run, pendingBattle: { nodeId, result }, screen: { name: 'battle' }, history: [] })
      persist(run)
      return
    }
    persist(run)
    switch (node.type) {
      case 'heal':
        set({ run, screen: { name: 'heal', params: { nodeId } }, history: [] })
        break
      case 'catch': {
        // Incienso Shiny: la próxima captura es shiny (se gasta). Marca las 3 ofertas.
        if ((run.inventory['shiny-incense'] || 0) > 0 && node.content.kind === 'catch') {
          for (const o of node.content.offers) o.shiny = true
          removeItem(run, 'shiny-incense', 1)
        }
        set({ run, screen: { name: 'catch', params: { nodeId } }, history: [] })
        break
      }
      case 'item':
        set({ run, screen: { name: 'item', params: { nodeId } }, history: [] })
        break
      case 'shop':
        set({ run, screen: { name: 'shop', params: { nodeId } }, history: [] })
        break
      case 'event':
        set({ run, screen: { name: 'event', params: { nodeId } }, history: [] })
        break
      case 'trade':
        set({ run, screen: { name: 'trade', params: { nodeId } }, history: [] })
        break
      default:
        set({ run, screen: { name: 'map' }, history: [] })
    }
  },

  finishBattle: () => {
    const cur = get().run
    const pending = get().pendingBattle
    if (!cur || !pending) return
    const run = cloneRun(cur)
    const node = run.map.nodes[pending.nodeId]
    const summary = applyBattleOutcome(run, node, pending.result)
    persist(run)

    // Evoluciones con ramas: encola las elecciones (modal global).
    if (summary.evoChoices.length) {
      const [first, ...rest] = summary.evoChoices
      set({ evoChoice: { uid: first.uid, itemId: null, options: first.options }, evoQueue: rest })
    }

    if (summary.runWon) {
      void recordRunEnd(run).then((a) => { if (a.length) set({ newAchievements: a }) })
      set({ run, lastSummary: summary, pendingBattle: null, screen: { name: 'victory' }, history: [] })
    } else if (summary.runEnded) {
      // Salvavidas: revive 1 y continúa, SOLO al perder vs salvajes o entrenadores
      // normales (NUNCA contra jefes, rival, guardián ni Liga Pokémon).
      const rescuable = node.type === 'battle' || node.type === 'trainer'
      if (rescuable && (run.inventory['revive-charm'] || 0) > 0 && run.party.some((p) => p.currentHp <= 0)) {
        set({ run, lastSummary: summary, pendingBattle: null, rescueNodeId: node.id, screen: { name: 'rescue' }, history: [] })
        return
      }
      void recordRunEnd(run).then((a) => { if (a.length) set({ newAchievements: a }) })
      set({ run, lastSummary: summary, pendingBattle: null, screen: { name: 'gameover' }, history: [] })
    } else if (summary.legendaryOffer) {
      // Venciste a un legendario: pantalla para decidir si se une al equipo.
      set({ run, lastSummary: summary, pendingBattle: null, battleSummary: null, legendaryOffer: summary.legendaryOffer, offerKind: 'legendary', screen: { name: 'legendary' }, history: [] })
    } else if (summary.rescueOffer) {
      // Team Rocket: Pokémon liberado. MISMA pantalla/lógica que un legendario.
      set({ run, lastSummary: summary, pendingBattle: null, battleSummary: null, legendaryOffer: summary.rescueOffer, offerKind: 'rescue', screen: { name: 'legendary' }, history: [] })
    } else {
      // Victoria normal: mostramos las recompensas EN la pantalla de batalla.
      set({ run, lastSummary: summary, battleSummary: summary })
    }
  },

  closeBattle: () => set({ pendingBattle: null, battleSummary: null, screen: { name: 'map' }, history: [] }),

  clearEventResult: () => set({ lastEventResult: null }),
  newAchievements: [],
  clearNewAchievements: () => set({ newAchievements: [] }),
  dexCaught: 0,

  legendaryOffer: null,
  offerKind: 'legendary',
  addLegendary: (replaceUid) => {
    const cur = get().run
    const offer = get().legendaryOffer
    if (!cur || !offer) return
    const run = cloneRun(cur)
    if (replaceUid) {
      const idx = run.party.findIndex((p) => p.uid === replaceUid)
      if (idx >= 0) {
        // El Pokémon que liberas para hacer hueco devuelve su objeto a la mochila.
        if (run.party[idx].heldItemId) addItem(run, run.party[idx].heldItemId!, 1)
        run.party[idx] = offer
      }
    } else if (run.party.length < 6) {
      run.party.push(offer)
    } else return // lleno y sin reemplazo: no hacer nada
    run.stats.pokemonCaught++
    persist(run)
    void syncDexFromRun(run)
    set({ run, legendaryOffer: null, offerKind: 'legendary', screen: { name: 'map' }, history: [] })
  },
  skipLegendary: () => {
    // Un legendario rechazado se marcha (se pierde). Un Pokémon liberado de Team
    // Rocket NO se pierde: va a la caja (no lo dejamos abandonado tras salvarlo).
    if (get().offerKind === 'rescue') {
      const cur = get().run
      const offer = get().legendaryOffer
      if (cur && offer) {
        const run = cloneRun(cur)
        run.box.push(offer)
        run.stats.pokemonCaught++
        persist(run)
        void syncDexFromRun(run)
        set({ run, legendaryOffer: null, offerKind: 'legendary', screen: { name: 'map' }, history: [] })
        return
      }
    }
    set({ legendaryOffer: null, offerKind: 'legendary', screen: { name: 'map' }, history: [] })
  },

  doHeal: (nodeId) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    resolveHeal(run, run.map.nodes[nodeId])
    persist(run)
    set({ run, screen: { name: 'map' }, history: [] })
  },

  doCatch: (nodeId, accept, chosenUid, replaceUid) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    catchPokemon(run, run.map.nodes[nodeId], accept, chosenUid, replaceUid)
    persist(run)
    if (accept) void syncDexFromRun(run)
    set({ run, screen: { name: 'map' }, history: [] })
  },

  doPickItem: (nodeId, itemId) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    pickItem(run, run.map.nodes[nodeId], itemId)
    persist(run)
    set({ run, screen: { name: 'map' }, history: [] })
  },

  doBuy: (itemId, price) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    buyItem(run, itemId, price)
    persist(run)
    set({ run })
  },

  doLeaveShop: (nodeId) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    leaveShop(run, run.map.nodes[nodeId])
    persist(run)
    set({ run, screen: { name: 'map' }, history: [] })
  },

  doEvent: (nodeId, optionIndex) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    const msg = resolveEvent(run, run.map.nodes[nodeId], optionIndex)
    persist(run)
    void syncDexFromRun(run) // algunos eventos añaden Pokémon (huevo, criador…)
    set({ run, lastEventResult: msg, screen: { name: 'map' }, history: [] })
  },

  useItem: (itemId, monUid) => {
    const cur = get().run
    if (!cur) return false
    const run = cloneRun(cur)
    const mon = run.party.find((p) => p.uid === monUid)
    if (!mon) return false
    let ok: boolean
    const cap = levelCap(run) // Nuzlocke: no pasar del próximo jefe
    if (itemId === 'rare-candy') {
      ok = false
      for (let i = 0; i < 3; i++) if (mon.level < cap && gainLevel(mon)) ok = true // +3 niveles
    } else if (itemId === 'super-candy') {
      ok = false
      for (let i = 0; i < 5; i++) if (mon.level < cap && gainLevel(mon)) ok = true // +5 niveles
    } else if (itemId === 'upgrade') {
      // Adelanta el nivel de potencia del ataque (40 -> 80 -> 120), si no es máx.
      const cur = effectiveTier(mon)
      if (cur >= 2) ok = false
      else { mon.moveTier = cur + 1; refreshMoves(mon); ok = true }
    } else if (itemId === 'z-move') {
      // Movimiento Z: 4º nivel (160). Requiere estar ANTES a potencia máxima (120).
      if (effectiveTier(mon) !== 2) ok = false
      else { mon.moveTier = 3; refreshMoves(mon); ok = true }
    } else if (itemId === 'metamorph') {
      ok = cycleRegionalForm(mon) // cambia de forma regional (se gasta al usarlo)
    } else ok = applyHealItem(mon, itemId)
    if (ok) removeItem(run, itemId, 1)
    // Tras subir de nivel (caramelos), evoluciona si alcanzó su nivel (rama
    // única; las múltiples las elige el jugador).
    let evoFx: { uid: string; fromId: number; toId: number } | null = null
    if (ok && (itemId === 'rare-candy' || itemId === 'super-candy')) {
      const targets = levelEvolutionTargets(mon)
      if (targets.length === 1) {
        const fromId = mon.speciesId
        evolve(mon, targets[0])
        evoFx = { uid: mon.uid, fromId, toId: targets[0].id }
      }
    }
    persist(run)
    set({ run, ...(evoFx ? { evoFx } : {}) })
    return ok
  },

  useEvolutionItem: (itemId, monUid) => {
    const cur = get().run
    if (!cur) return false
    const run = cloneRun(cur)
    const mon = run.party.find((p) => p.uid === monUid)
    if (!mon) return false
    // Mineraluz/Supermineral bloquean la evolución (no la megaevolución).
    if (itemId === 'evo-stone' && evolutionBlockedByItem(mon)) return false
    // Opciones según el objeto.
    const options =
      itemId === 'mega-stone'
        ? getMegaForms(mon.speciesId).map((s) => s.id)
        : getSpecies(mon.speciesId).evolutions.map((e) => e.toId)
    if (!options.length) return false
    // Varias opciones (Charizard X/Y, Eevee...) -> que elija el jugador.
    if (options.length > 1) {
      set({ evoChoice: { uid: monUid, itemId, options } })
      return true
    }
    const fromId = mon.speciesId
    evolve(mon, getSpecies(options[0]))
    removeItem(run, itemId, 1)
    persist(run)
    set({ run, evoFx: { uid: monUid, fromId, toId: options[0] } })
    return true
  },

  // Evolución por nivel manual (ramas múltiples: Eevee, Tyrogue...).
  evolveByLevel: (monUid) => {
    const cur = get().run
    if (!cur) return false
    const run = cloneRun(cur)
    const mon = run.party.find((p) => p.uid === monUid)
    if (!mon) return false
    const targets = levelEvolutionTargets(mon)
    if (!targets.length) return false
    if (targets.length > 1) {
      set({ evoChoice: { uid: monUid, itemId: null, options: targets.map((t) => t.id) } })
      return true
    }
    const fromId = mon.speciesId
    evolve(mon, targets[0])
    persist(run)
    set({ run, evoFx: { uid: monUid, fromId, toId: targets[0].id } })
    return true
  },

  // Confirma la opción elegida en el modal de elección.
  chooseEvolution: (targetId) => {
    const choice = get().evoChoice
    const cur = get().run
    if (!choice || !cur) return
    const run = cloneRun(cur)
    const mon = run.party.find((p) => p.uid === choice.uid)
    if (!mon) { set({ evoChoice: null }); return }
    const fromId = mon.speciesId
    evolve(mon, getSpecies(targetId))
    if (choice.itemId) removeItem(run, choice.itemId, 1)
    persist(run)
    set({ run, evoChoice: null, evoFx: { uid: choice.uid, fromId, toId: targetId } })
  },

  cancelEvoChoice: () => {
    const q = get().evoQueue
    if (q.length) { const [next, ...rest] = q; set({ evoChoice: { uid: next.uid, itemId: null, options: next.options }, evoQueue: rest }) }
    else set({ evoChoice: null })
  },

  clearEvoFx: () => {
    // Tras la animación, muestra la siguiente elección de evolución pendiente.
    const q = get().evoQueue
    if (q.length) { const [next, ...rest] = q; set({ evoFx: null, evoChoice: { uid: next.uid, itemId: null, options: next.options }, evoQueue: rest }) }
    else set({ evoFx: null })
  },

  setLead: (monUid) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    const idx = run.party.findIndex((p) => p.uid === monUid)
    if (idx > 0) {
      const [mon] = run.party.splice(idx, 1)
      run.party.unshift(mon)
    }
    persist(run)
    set({ run })
  },

  equipItem: (itemId, monUid) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    const mon = run.party.find((p) => p.uid === monUid)
    if (!mon) return
    if (!removeItem(run, itemId, 1)) return
    if (mon.heldItemId) addItem(run, mon.heldItemId, 1) // devuelve el anterior
    mon.heldItemId = itemId
    persist(run)
    set({ run })
  },

  unequipHeld: (monUid) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    const mon = run.party.find((p) => p.uid === monUid)
    if (!mon || !mon.heldItemId) return
    addItem(run, mon.heldItemId, 1)
    mon.heldItemId = null
    persist(run)
    set({ run })
  },

  setPartyOrder: (uids) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    const byUid = new Map(run.party.map((p) => [p.uid, p]))
    const reordered = uids.map((u) => byUid.get(u)).filter(Boolean) as typeof run.party
    // conserva cualquier miembro no incluido (seguridad)
    for (const p of run.party) if (!uids.includes(p.uid)) reordered.push(p)
    if (reordered.length === run.party.length) run.party = reordered
    persist(run)
    set({ run })
  },
}))

/**
 * Registra EN VIVO en la Pokédex persistente las especies del equipo/caja
 * actuales (capturas, intercambios, legendarios, eventos). Antes la dex solo se
 * grababa al terminar la run, así que un Pokémon capturado seguía saliendo como
 * "NUEVO" durante esa misma partida. Idempotente: solo guarda si hay cambios.
 */
async function syncDexFromRun(run: RunState): Promise<void> {
  const meta = await loadMeta()
  const seen = new Set(meta.pokedexSeen)
  const caught = new Set(meta.pokedexCaught)
  const shiny = new Set(meta.pokedexShiny)
  let changed = false
  for (const p of [...run.party, ...run.box]) {
    const base = toBaseSpeciesId(p.speciesId) // especie base (no mega/forma)
    if (!seen.has(base)) { seen.add(base); changed = true }
    if (!caught.has(base)) { caught.add(base); changed = true }
    if (p.shiny && !shiny.has(base)) { shiny.add(base); changed = true }
  }
  if (!changed) return
  meta.pokedexSeen = [...seen]
  meta.pokedexCaught = [...caught]
  meta.pokedexShiny = [...shiny]
  await saveMeta(meta)
  useGame.setState({ dexCaught: meta.pokedexCaught.length })
}

async function recordRunEnd(run: RunState): Promise<string[]> {
  // Cierra el cronómetro: tiempo total = solo juego activo (no app cerrada).
  commitElapsed(run)
  const durationMs = run.elapsedMs ?? 0
  const meta = await loadMeta()
  const won = run.status === 'won'
  // El Modo Historia no contamina las estadísticas/récords normales (solo la Pokédex).
  const story = !!run.story
  if (!story) {
    meta.totals.runs += 1
    if (won) { meta.totals.wins += 1; useGame.setState({ totalWins: meta.totals.wins }) }
    meta.totals.gymsDefeated += run.stats.gymsDefeated
    meta.totals.pokemonCaught += run.stats.pokemonCaught
  }
  // pokédex (+ shinies)
  const seen = new Set(meta.pokedexSeen)
  const caught = new Set(meta.pokedexCaught)
  const shiny = new Set(meta.pokedexShiny)
  for (const p of [...run.party, ...run.box]) {
    const base = toBaseSpeciesId(p.speciesId) // registra la especie base (no mega/forma)
    seen.add(base)
    caught.add(base)
    if (p.shiny) shiny.add(base)
  }
  meta.pokedexSeen = [...seen]
  meta.pokedexCaught = [...caught]
  meta.pokedexShiny = [...shiny]
  if (!story) meta.bestRuns = [
    {
      date: Date.now(),
      mode: run.daily ? 'Reto diario' : run.monotype ? 'Monolocke' : run.random ? 'Random' : run.pools.length > 1 ? 'Multi-región' : 'Región',
      region: run.region,
      difficulty: run.difficulty,
      durationMs,
      gymsDefeated: run.stats.gymsDefeated,
      eliteDefeated: run.stats.eliteDefeated,
      won: run.status === 'won',
      starterId: run.starterId,
      daily: run.daily,
      team: structuredClone(run.party),
    },
    ...meta.bestRuns,
  ].slice(0, 30)

  // Regiones ganadas y logros (no aplican al Modo Historia).
  if (won && !story && !meta.regionsWon.includes(run.region)) meta.regionsWon.push(run.region)
  const newAchievements = story ? [] : checkAchievements(meta, run, won)
  if (newAchievements.length) meta.achievements = [...new Set([...meta.achievements, ...newAchievements])]

  await saveMeta(meta)
  // Sincroniza con la nube si hay sesión (fusiona por si hay datos de otro disp.).
  if (currentUser()) {
    const cloud = await loadCloudMeta()
    const merged = cloud ? mergeMeta(meta, cloud) : meta
    await saveMeta(merged)
    await saveCloudMeta(merged)
    // Glory Run: si GANASTE, envía tu tiempo (de juego activo) al ranking online.
    if (run.status === 'won' && durationMs > 0) {
      await submitGloryRun({
        alias: merged.alias || currentUser()!.email.split('@')[0],
        region: run.region,
        difficulty: run.difficulty,
        mode: run.daily ? 'Reto diario' : run.monotype ? 'Monolocke' : run.random ? 'Random' : run.pools.length > 1 ? 'Multi-región' : 'Región',
        pools: run.pools,
        random: run.random,
        duration_ms: durationMs,
      })
    }
  }
  return newAchievements
}

export { Party }
