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
  pokedexShiny: number[]
  alias: string
}

export interface BestRun {
  date: number
  mode: string
  region: string
  difficulty: string
  durationMs: number
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
  pokedexShiny: [],
  alias: '',
}

export async function loadMeta(): Promise<MetaRecord> {
  const d = await db()
  const m = (await d.get('meta', 'meta')) as MetaRecord | undefined
  if (!m) return structuredClone(EMPTY_META)
  return { ...structuredClone(EMPTY_META), ...m } // backfill de campos nuevos
}

export async function saveMeta(meta: MetaRecord): Promise<void> {
  const d = await db()
  await d.put('meta', meta, 'meta')
}

export type { MetaRecord }

/** Combina dos metas (local + nube): unión de Pokédex, máximos de totales y
 *  mejores partidas unidas (sin duplicar por fecha). */
export function mergeMeta(a: MetaRecord, b: MetaRecord): MetaRecord {
  const uni = (x: number[], y: number[]) => [...new Set([...x, ...y])]
  const runsByDate = new Map<number, BestRun>()
  for (const r of [...a.bestRuns, ...b.bestRuns]) runsByDate.set(r.date, r)
  const bestRuns = [...runsByDate.values()].sort((x, y) => y.date - x.date).slice(0, 30)
  return {
    bestRuns,
    totals: {
      runs: Math.max(a.totals.runs, b.totals.runs),
      wins: Math.max(a.totals.wins, b.totals.wins),
      gymsDefeated: Math.max(a.totals.gymsDefeated, b.totals.gymsDefeated),
      pokemonCaught: Math.max(a.totals.pokemonCaught, b.totals.pokemonCaught),
    },
    pokedexSeen: uni(a.pokedexSeen, b.pokedexSeen),
    pokedexCaught: uni(a.pokedexCaught, b.pokedexCaught),
    pokedexShiny: uni(a.pokedexShiny, b.pokedexShiny),
    alias: a.alias || b.alias || '',
  }
}

// ---- Copia de seguridad (export/import) ----
// Sin backend: serializa meta + run a un código que el usuario puede guardar o
// llevar a otro dispositivo. (El "cloud" con cuentas reales requiere servidor.)
export async function exportData(): Promise<string> {
  const meta = await loadMeta()
  const run = await loadRun()
  const json = JSON.stringify({ v: 1, meta, run })
  // base64 seguro para UTF-8
  return btoa(unescape(encodeURIComponent(json)))
}

export async function importData(code: string): Promise<boolean> {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())))
    const data = JSON.parse(json) as { meta?: MetaRecord; run?: RunState | null }
    if (data.meta) await saveMeta({ ...structuredClone(EMPTY_META), ...data.meta })
    if (data.run) await saveRun(data.run)
    else await clearRun()
    return true
  } catch {
    return false
  }
}
