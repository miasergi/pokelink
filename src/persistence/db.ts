import { openDB, type IDBPDatabase } from 'idb'
import type { RunState } from '@/engine/run/types'
import { toBaseSpeciesId } from '@/data'

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
  /** Logros desbloqueados (ids). */
  achievements: string[]
  /** Regiones en las que has ganado (para el logro "todas las regiones"). */
  regionsWon: string[]
  /** Pokémon mascota/compañero (speciesId) que se ve en Inicio. */
  pet: number | null
  /** Liga Pokémon: campeonatos ganados y mejor fase alcanzada. */
  leagueChampionships?: number
  leagueBestStage?: string
}

const LEAGUE_STAGES = ['Fase de grupos', 'Octavos', 'Cuartos', 'Semifinal', 'Final', 'Campeón']
const bestStage = (a?: string, b?: string) => {
  const ai = a ? LEAGUE_STAGES.indexOf(a) : -1, bi = b ? LEAGUE_STAGES.indexOf(b) : -1
  return ai >= bi ? a : b
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
  /** Fecha del Reto diario (YYYY-MM-DD) si esta run lo era. */
  daily?: string
  /** Instantánea del equipo con el que se terminó (para ver el detalle). */
  team?: import('@/engine/run/types').RunState['party']
}

/** Quita runs casi-idénticas (mismo resultado/región/inicial/avance y tiempo a
 *  menos de 60 s) — corrige duplicados de registros antiguos. */
export function dedupeRuns(runs: BestRun[]): BestRun[] {
  const out: BestRun[] = []
  for (const r of runs) {
    const dup = out.find(
      (o) => o.won === r.won && o.region === r.region && o.difficulty === r.difficulty &&
        o.starterId === r.starterId && o.gymsDefeated === r.gymsDefeated &&
        o.eliteDefeated === r.eliteDefeated && Math.abs(o.durationMs - r.durationMs) < 60000,
    )
    if (dup) {
      if (!dup.team && r.team) dup.team = r.team
      if (r.durationMs < dup.durationMs) dup.durationMs = r.durationMs
      continue
    }
    out.push(r)
  }
  return out
}

/** Recalcula los contadores a partir del historial deduplicado (corrige el
 *  inflado por el antiguo bug de doble registro). Solo si el historial completo
 *  cabe en bestRuns (<30 runs); si está truncado, respeta el acumulado. Devuelve
 *  true si cambió algo. */
export function recomputeTotals(meta: MetaRecord): boolean {
  if (meta.bestRuns.length >= 30) return false
  const runs = meta.bestRuns.length
  const wins = meta.bestRuns.filter((r) => r.won).length
  const gyms = meta.bestRuns.reduce((a, r) => a + r.gymsDefeated, 0)
  if (meta.totals.runs === runs && meta.totals.wins === wins && meta.totals.gymsDefeated === gyms) return false
  meta.totals.runs = runs
  meta.totals.wins = wins
  meta.totals.gymsDefeated = gyms
  return true
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

// ---- Liga Pokémon (torneo en curso) ----
export async function saveLeague(state: import('@/engine/league/types').LeagueState): Promise<void> {
  const d = await db()
  await d.put('runs', state, 'league')
}
export async function loadLeague(): Promise<import('@/engine/league/types').LeagueState | null> {
  const d = await db()
  return (await d.get('runs', 'league')) ?? null
}
export async function clearLeague(): Promise<void> {
  const d = await db()
  await d.delete('runs', 'league')
}

// ---- Meta-progresión ----
const EMPTY_META: MetaRecord = {
  bestRuns: [],
  totals: { runs: 0, wins: 0, gymsDefeated: 0, pokemonCaught: 0 },
  pokedexSeen: [],
  pokedexCaught: [],
  pokedexShiny: [],
  alias: '',
  achievements: [],
  regionsWon: [],
  pet: null,
}

export async function loadMeta(): Promise<MetaRecord> {
  const d = await db()
  const m = (await d.get('meta', 'meta')) as MetaRecord | undefined
  if (!m) return structuredClone(EMPTY_META)
  const meta = { ...structuredClone(EMPTY_META), ...m } // backfill de campos nuevos
  meta.bestRuns = dedupeRuns(meta.bestRuns) // limpia duplicados antiguos
  // Migra Pokédex: ids de megas/formas regionales -> especie base.
  const toBase = (arr: number[]) => [...new Set(arr.map(toBaseSpeciesId))]
  meta.pokedexSeen = toBase(meta.pokedexSeen)
  meta.pokedexCaught = toBase(meta.pokedexCaught)
  meta.pokedexShiny = toBase(meta.pokedexShiny)
  return meta
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
  const bestRuns = dedupeRuns([...runsByDate.values()].sort((x, y) => y.date - x.date)).slice(0, 30)
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
    achievements: [...new Set([...(a.achievements ?? []), ...(b.achievements ?? [])])],
    regionsWon: [...new Set([...(a.regionsWon ?? []), ...(b.regionsWon ?? [])])],
    pet: a.pet ?? b.pet ?? null,
    leagueChampionships: Math.max(a.leagueChampionships ?? 0, b.leagueChampionships ?? 0),
    leagueBestStage: bestStage(a.leagueBestStage, b.leagueBestStage),
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
