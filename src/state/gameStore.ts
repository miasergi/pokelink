import { create } from 'zustand'
import type { RunState } from '@/engine/run/types'
import type { BattleResult } from '@/engine/battle/types'
import {
  createRun, enterNode, startNodeBattle, applyBattleOutcome, isNodeBattle,
  resolveHeal, catchPokemon, pickItem, buyItem, leaveShop, resolveEvent, removeItem,
  type BattleOutcomeSummary, type NewRunConfig,
} from '@/engine/run/runEngine'
import { applyHealItem } from '@/engine/run/party'
import * as Party from '@/engine/run/party'
import { getMegaForms } from '@/data'
import { evolutionByItem, evolve } from '@/engine/team/evolution'
import { saveRun, loadRun, clearRun, loadMeta, saveMeta } from '@/persistence/db'

export type ScreenName =
  | 'home' | 'modeSelect' | 'genSelect' | 'starterSelect'
  | 'map' | 'battle' | 'reward' | 'catch' | 'item' | 'shop' | 'event' | 'heal'
  | 'team' | 'pokedex' | 'settings' | 'gameover' | 'victory'

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
  lastEventResult: string | null
  evoFx: { uid: string; fromId: number; toId: number } | null
  loaded: boolean
  hasSavedRun: boolean

  // navegación
  navigate: (name: ScreenName, params?: Record<string, unknown>) => void
  back: () => void

  // ciclo de vida de la run
  init: () => Promise<void>
  startRun: (config: Omit<NewRunConfig, 'seed'> & { seed?: number }) => void
  resumeRun: () => Promise<void>
  abandonRun: () => Promise<void>

  // interacción con nodos
  chooseNode: (nodeId: string) => void
  finishBattle: () => void
  doHeal: (nodeId: string) => void
  doCatch: (nodeId: string, accept: boolean, replaceUid?: string) => void
  doPickItem: (nodeId: string, itemId: string) => void
  doBuy: (itemId: string, price: number) => void
  doLeaveShop: (nodeId: string) => void
  doEvent: (nodeId: string, optionIndex: number) => void

  // objetos sobre el equipo
  useItem: (itemId: string, monUid: string) => boolean
  useEvolutionItem: (itemId: string, monUid: string) => boolean
  clearEvoFx: () => void
  setLead: (monUid: string) => void
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
  lastEventResult: null,
  evoFx: null,
  loaded: false,
  hasSavedRun: false,

  navigate: (name, params) =>
    set((s) => ({ screen: { name, params }, history: [...s.history, s.screen] })),
  back: () =>
    set((s) => {
      const prev = s.history[s.history.length - 1]
      return prev ? { screen: prev, history: s.history.slice(0, -1) } : {}
    }),

  init: async () => {
    const saved = await loadRun()
    set({ loaded: true, hasSavedRun: !!saved })
  },

  startRun: (config) => {
    const seed = config.seed ?? Math.floor(Math.random() * 2 ** 31)
    const run = createRun({ mode: config.mode, gen: config.gen, starterId: config.starterId, seed })
    run.startedAt = Date.now()
    void clearRun()
    saveRun(run)
    set({ run, hasSavedRun: true, screen: { name: 'map' }, history: [] })
  },

  resumeRun: async () => {
    const run = await loadRun()
    if (run) set({ run, screen: { name: 'map' }, history: [] })
  },

  abandonRun: async () => {
    const run = get().run
    if (run) await recordRunEnd(run)
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
      case 'catch':
        set({ run, screen: { name: 'catch', params: { nodeId } }, history: [] })
        break
      case 'item':
        set({ run, screen: { name: 'item', params: { nodeId } }, history: [] })
        break
      case 'shop':
        set({ run, screen: { name: 'shop', params: { nodeId } }, history: [] })
        break
      case 'event':
        set({ run, screen: { name: 'event', params: { nodeId } }, history: [] })
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

    if (summary.runWon) {
      void recordRunEnd(run)
      set({ run, lastSummary: summary, pendingBattle: null, screen: { name: 'victory' }, history: [] })
    } else if (summary.runEnded) {
      void recordRunEnd(run)
      set({ run, lastSummary: summary, pendingBattle: null, screen: { name: 'gameover' }, history: [] })
    } else {
      set({ run, lastSummary: summary, pendingBattle: null, screen: { name: 'reward' }, history: [] })
    }
  },

  doHeal: (nodeId) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    resolveHeal(run, run.map.nodes[nodeId])
    persist(run)
    set({ run, screen: { name: 'map' }, history: [] })
  },

  doCatch: (nodeId, accept, replaceUid) => {
    const cur = get().run
    if (!cur) return
    const run = cloneRun(cur)
    catchPokemon(run, run.map.nodes[nodeId], accept, replaceUid)
    persist(run)
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
    set({ run, lastEventResult: msg, screen: { name: 'map' }, history: [] })
  },

  useItem: (itemId, monUid) => {
    const cur = get().run
    if (!cur) return false
    const run = cloneRun(cur)
    const mon = run.party.find((p) => p.uid === monUid)
    if (!mon) return false
    const ok = applyHealItem(mon, itemId)
    if (ok) removeItem(run, itemId, 1)
    persist(run)
    set({ run })
    return ok
  },

  useEvolutionItem: (itemId, monUid) => {
    const cur = get().run
    if (!cur) return false
    const run = cloneRun(cur)
    const mon = run.party.find((p) => p.uid === monUid)
    if (!mon) return false
    const fromId = mon.speciesId
    let target = null
    if (itemId === 'mega-stone') {
      const forms = getMegaForms(mon.speciesId)
      target = forms[0] ?? null
    } else {
      target = evolutionByItem(mon, itemId)
    }
    if (!target) return false
    evolve(mon, target)
    removeItem(run, itemId, 1)
    persist(run)
    set({ run, evoFx: { uid: monUid, fromId, toId: target.id } })
    return true
  },

  clearEvoFx: () => set({ evoFx: null }),

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
}))

async function recordRunEnd(run: RunState) {
  const meta = await loadMeta()
  meta.totals.runs += 1
  if (run.status === 'won') meta.totals.wins += 1
  meta.totals.gymsDefeated += run.stats.gymsDefeated
  meta.totals.pokemonCaught += run.stats.pokemonCaught
  // pokédex
  const seen = new Set(meta.pokedexSeen)
  const caught = new Set(meta.pokedexCaught)
  for (const p of [...run.party, ...run.box]) {
    seen.add(p.speciesId)
    caught.add(p.speciesId)
  }
  meta.pokedexSeen = [...seen]
  meta.pokedexCaught = [...caught]
  meta.bestRuns = [
    {
      date: Date.now(),
      mode: run.mode,
      region: run.region,
      gymsDefeated: run.stats.gymsDefeated,
      eliteDefeated: run.stats.eliteDefeated,
      won: run.status === 'won',
      starterId: run.starterId,
    },
    ...meta.bestRuns,
  ].slice(0, 20)
  await saveMeta(meta)
}

export { Party }
