import { create } from 'zustand'
import type { RunState } from '@/engine/run/types'
import type { BattleResult } from '@/engine/battle/types'
import {
  createRun, enterNode, startNodeBattle, applyBattleOutcome, isNodeBattle,
  resolveHeal, catchPokemon, pickItem, buyItem, leaveShop, resolveEvent, removeItem, addItem,
  resolveTrade, skipNode,
  type BattleOutcomeSummary, type NewRunConfig,
} from '@/engine/run/runEngine'
import { applyHealItem } from '@/engine/run/party'
import * as Party from '@/engine/run/party'
import { getMegaForms, getSpecies } from '@/data'
import { evolve, levelEvolutionTargets } from '@/engine/team/evolution'
import { gainLevel, recalcStats } from '@/engine/team/leveling'
import { saveRun, loadRun, clearRun, loadMeta, saveMeta } from '@/persistence/db'

export type ScreenName =
  | 'home' | 'modeSelect' | 'genSelect' | 'starterSelect'
  | 'map' | 'battle' | 'reward' | 'catch' | 'item' | 'shop' | 'event' | 'heal'
  | 'team' | 'pokedex' | 'records' | 'settings' | 'gameover' | 'victory' | 'rescue' | 'trade'

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
  evoFx: { uid: string; fromId: number; toId: number } | null
  evoChoice: { uid: string; itemId: string | null; options: number[] } | null
  evolveByLevel: (monUid: string) => boolean
  chooseEvolution: (targetId: number) => void
  cancelEvoChoice: () => void
  rescueNodeId: string | null
  useRescue: (monUid: string) => void
  doTrade: (monUid: string) => void
  skipTrade: () => void
  tradeReveal: { fromId: number; toId: number; level: number } | null
  closeTradeReveal: () => void
  loaded: boolean
  hasSavedRun: boolean

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
  rescueNodeId: null,
  tradeReveal: null,
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
    const run = createRun({ mode: config.mode, difficulty: config.difficulty, gen: config.gen, starterId: config.starterId, seed })
    run.startedAt = Date.now()
    void clearRun()
    saveRun(run)
    set({ run, hasSavedRun: true, screen: { name: 'map' }, history: [] })
  },

  resumeRun: async () => {
    const run = await loadRun()
    if (run) set({ run, screen: { name: 'map' }, history: [] })
  },

  restartRun: () => {
    const run = get().run
    if (!run) {
      set({ screen: { name: 'home' }, history: [] })
      return
    }
    get().startRun({ mode: run.mode, gen: run.gen, starterId: run.starterId, difficulty: run.difficulty })
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

    if (summary.runWon) {
      void recordRunEnd(run)
      set({ run, lastSummary: summary, pendingBattle: null, screen: { name: 'victory' }, history: [] })
    } else if (summary.runEnded) {
      // Salvavidas: si tienes uno y hay debilitados, revives 1 y continúas.
      if ((run.inventory['revive-charm'] || 0) > 0 && run.party.some((p) => p.currentHp <= 0)) {
        set({ run, lastSummary: summary, pendingBattle: null, rescueNodeId: node.id, screen: { name: 'rescue' }, history: [] })
        return
      }
      void recordRunEnd(run)
      set({ run, lastSummary: summary, pendingBattle: null, screen: { name: 'gameover' }, history: [] })
    } else {
      // Victoria normal: mostramos las recompensas EN la pantalla de batalla.
      set({ run, lastSummary: summary, battleSummary: summary })
    }
  },

  closeBattle: () => set({ pendingBattle: null, battleSummary: null, screen: { name: 'map' }, history: [] }),

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
    let ok: boolean
    const boost = (stats: Partial<Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>>) => {
      const b = { ...mon.bonus }
      for (const [k, v] of Object.entries(stats)) (b as Record<string, number>)[k] = ((b as Record<string, number>)[k] ?? 0) + v
      mon.bonus = b
      recalcStats(mon, getSpecies(mon.speciesId))
    }
    if (itemId === 'rare-candy') {
      ok = false
      for (let i = 0; i < 3; i++) if (gainLevel(mon)) ok = true // +3 niveles
    } else if (itemId === 'super-candy') {
      ok = false
      for (let i = 0; i < 5; i++) if (gainLevel(mon)) ok = true // +5 niveles
    } else if (itemId === 'attack-boost') {
      boost({ atk: 18, spa: 18 }); ok = true
    } else if (itemId === 'defense-boost') {
      boost({ def: 18, spd: 18 }); ok = true
    } else if (itemId === 'hp-boost') {
      boost({ hp: 24 }); ok = true
    } else if (itemId === 'speed-boost') {
      boost({ spe: 18 }); ok = true
    } else ok = applyHealItem(mon, itemId)
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

  cancelEvoChoice: () => set({ evoChoice: null }),

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
