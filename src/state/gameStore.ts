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
import * as Party from '@/engine/run/party'
import { getMegaForms, getSpecies, ALL_SPECIES, toBaseSpeciesId } from '@/data'
import { evolve, levelEvolutionTargets, evolutionBlockedByItem, cycleRegionalForm } from '@/engine/team/evolution'
import { gainLevel, refreshMoves, effectiveTier } from '@/engine/team/leveling'
import { saveRun, loadRun, clearRun, loadMeta, saveMeta, mergeMeta, recomputeTotals } from '@/persistence/db'
import { cloudEnabled, currentUser, signIn, signUp, signOut, loadCloudMeta, saveCloudMeta, submitGloryRun, type CloudUser } from '@/persistence/supabase'

export type ScreenName =
  | 'home' | 'modeSelect' | 'genSelect' | 'starterSelect'
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

interface GameState {
  screen: Screen
  history: Screen[]
  run: RunState | null
  pendingBattle: PendingBattle | null
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
  restartRun: () => void
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
  if (run && run.status === 'active') void saveRun(run)
}

function cloneRun(run: RunState): RunState {
  return structuredClone(run)
}

export const useGame = create<GameState>((set, get) => ({
  screen: { name: 'home' },
  history: [],
  run: null,
  pendingBattle: null,
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
    set({ cloudBusy: false, alias: merged.alias || get().alias, dexCaught: merged.pokedexCaught.length, pet: merged.pet ?? get().pet })
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
      set({ dexCaught: m.pokedexCaught.length, pet: m.pet ?? null })
      if (recomputeTotals(m)) await saveMeta(m) // corrige contadores antiguos (offline)
    })
    const saved = await loadRun()
    set({ loaded: true, hasSavedRun: !!saved })
  },

  startRun: (config) => {
    const seed = config.seed ?? Math.floor(Math.random() * 2 ** 31)
    const run = createRun({ pools: config.pools, random: config.random, randomFlags: config.randomFlags, monotype: config.monotype, difficulty: config.difficulty, gen: config.gen, starterId: config.starterId, seed, daily: config.daily })
    run.startedAt = Date.now()
    // Recompensa de Pokédex: +250 ₽ de salida por cada 25 especies (máx +2500).
    // EXCEPTO en el Reto diario: debe empezar idéntico para todo el mundo (1000 ₽).
    if (!config.daily) run.money += Math.min(2500, Math.floor(get().dexCaught / 25) * 250)
    void clearRun()
    saveRun(run)
    set({ run, hasSavedRun: true, lastEventResult: null, screen: { name: 'map' }, history: [] })
  },

  resumeRun: async () => {
    const run = await loadRun()
    if (run) set({ run, lastEventResult: null, screen: { name: 'map' }, history: [] })
  },

  restartRun: () => {
    const run = get().run
    if (!run) {
      set({ screen: { name: 'home' }, history: [] })
      return
    }
    // Reto diario: reinicia EXACTAMENTE el mismo desafío (misma semilla, mapa,
    // inicial y fecha). Una run normal reinicia con un mapa nuevo (semilla nueva).
    get().startRun({
      pools: run.pools, random: run.random, randomFlags: run.randomFlags, monotype: run.monotype,
      gen: run.gen, starterId: run.starterId, difficulty: run.difficulty,
      ...(run.daily ? { seed: run.seed, daily: run.daily } : {}),
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
      set({ run, lastSummary: summary, pendingBattle: null, battleSummary: null, legendaryOffer: summary.legendaryOffer, screen: { name: 'legendary' }, history: [] })
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
  addLegendary: (replaceUid) => {
    const cur = get().run
    const offer = get().legendaryOffer
    if (!cur || !offer) return
    const run = cloneRun(cur)
    if (replaceUid) {
      const idx = run.party.findIndex((p) => p.uid === replaceUid)
      if (idx >= 0) run.party[idx] = offer
    } else if (run.party.length < 6) {
      run.party.push(offer)
    } else return // lleno y sin reemplazo: no hacer nada
    run.stats.pokemonCaught++
    persist(run)
    void syncDexFromRun(run)
    set({ run, legendaryOffer: null, screen: { name: 'map' }, history: [] })
  },
  skipLegendary: () => set({ legendaryOffer: null, screen: { name: 'map' }, history: [] }),

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
  const meta = await loadMeta()
  const won = run.status === 'won'
  meta.totals.runs += 1
  if (won) meta.totals.wins += 1
  meta.totals.gymsDefeated += run.stats.gymsDefeated
  meta.totals.pokemonCaught += run.stats.pokemonCaught
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
  meta.bestRuns = [
    {
      date: Date.now(),
      mode: run.monotype ? 'Monolocke' : run.random ? 'Random' : run.pools.length > 1 ? 'Multi-región' : 'Región',
      region: run.region,
      difficulty: run.difficulty,
      durationMs: Math.max(0, Date.now() - run.startedAt),
      gymsDefeated: run.stats.gymsDefeated,
      eliteDefeated: run.stats.eliteDefeated,
      won: run.status === 'won',
      starterId: run.starterId,
      team: structuredClone(run.party),
    },
    ...meta.bestRuns,
  ].slice(0, 30)

  // Regiones ganadas y logros.
  if (won && !meta.regionsWon.includes(run.region)) meta.regionsWon.push(run.region)
  const newAchievements = checkAchievements(meta, run, won)
  if (newAchievements.length) meta.achievements = [...new Set([...meta.achievements, ...newAchievements])]

  await saveMeta(meta)
  // Sincroniza con la nube si hay sesión (fusiona por si hay datos de otro disp.).
  if (currentUser()) {
    const cloud = await loadCloudMeta()
    const merged = cloud ? mergeMeta(meta, cloud) : meta
    await saveMeta(merged)
    await saveCloudMeta(merged)
    // Glory Run: si GANASTE, envía tu tiempo al ranking online.
    const durationMs = Math.max(0, Date.now() - run.startedAt)
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

/** Devuelve los logros recién conseguidos (no presentes ya en meta). */
function checkAchievements(meta: Awaited<ReturnType<typeof loadMeta>>, run: RunState, won: boolean): string[] {
  const durationMs = Math.max(0, Date.now() - run.startedAt)
  const types = run.party.map((p) => new Set(getSpecies(p.speciesId).types))
  const monotype = run.party.length > 0 && [...types[0]].some((t) => types.every((s) => s.has(t)))
  const earned: string[] = []
  if (meta.totals.wins >= 1) earned.push('first_win')
  if (meta.totals.wins >= 10) earned.push('win10')
  if (run.stats.gymsDefeated >= 8) earned.push('gym_master')
  if (won && run.difficulty === 'hard') earned.push('champion_hard')
  if (won && run.difficulty === 'nuzlocke') earned.push('champion_nuzlocke')
  if (won && durationMs > 0 && durationMs < 25 * 60000) earned.push('speedrun')
  if (won && monotype) earned.push('monotype')
  if (won && run.daily) earned.push('daily_win')
  if (meta.pokedexShiny.length >= 1) earned.push('shiny')
  if (meta.pokedexCaught.length >= 50) earned.push('collector50')
  if (meta.pokedexCaught.length >= 100) earned.push('collector100')
  if (meta.pokedexCaught.length >= ALL_SPECIES.length) earned.push('collector_all')
  if (meta.regionsWon.length >= 9) earned.push('all_regions')
  return earned.filter((id) => !meta.achievements.includes(id))
}

export { Party }
