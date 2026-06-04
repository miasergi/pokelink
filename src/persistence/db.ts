import { openDB, type IDBPDatabase } from 'idb'
import type { RunState } from '@/engine/run/types'

const DB_NAME = 'pokerogue'
const VERSION = 1

interface MetaRecord {
  bestRuns: BestRun[]
  totals: {
    runs: number
    wins: number
    gymsDefeated: number
    pokemonCaught: number
  }
  pokedexSeen: number[]
  pokedexCaught: number[]
}

export interface BestRun {
  date: number
  mode: string
  region: string
  gymsDefeated: number
  eliteDefeated: number
  won: boolean
  starterId: number
}

let dbPromise: Promise<IDBPDatabase> | null = null
function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('runs')) database.createObjectStore('runs')
        if (!database.objectStoreNames.contains('meta')) database.createObjectStore('meta')
      },
    })
  }
  return dbPromise
}

// ---- Run activa (reanudar) ----
export async function saveRun(run: RunState): Promise<void> {
  const d = await db()
  await d.put('runs', run, 'current')
}

export async function loadRun(): Promise<RunState | null> {
  const d = await db()
  return (await d.get('runs', 'current')) ?? null
}

export async function clearRun(): Promise<void> {
  const d = await db()
  await d.delete('runs', 'current')
}

// ---- Meta-progresión ----
const EMPTY_META: MetaRecord = {
  bestRuns: [],
  totals: { runs: 0, wins: 0, gymsDefeated: 0, pokemonCaught: 0 },
  pokedexSeen: [],
  pokedexCaught: [],
}

export async function loadMeta(): Promise<MetaRecord> {
  const d = await db()
  return (await d.get('meta', 'meta')) ?? structuredClone(EMPTY_META)
}

export async function saveMeta(meta: MetaRecord): Promise<void> {
  const d = await db()
  await d.put('meta', meta, 'meta')
}

export type { MetaRecord }
