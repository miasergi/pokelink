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
  /** Modo Historia: capítulos completados. */
  storyCompleted?: number[]
  /** Modo Historia: equipo con el que TERMINASTE cada capítulo (continuidad:
   *  el siguiente capítulo te ofrece seguir con él). */
  storyTeams?: Record<number, RunState['party']>
  /** Cyber PokéBall: dex propia del modo (NO toca la Pokédex global). */
  cyberDexSeen?: number[]
  cyberDexCaught?: number[]
  /** Cyber PokéBall: generaciones cuya aventura completaste (campeón batido). */
  cyberCompleted?: number[]
  /** Cyber PokéBall: intercambios y victorias fantasma online acumulados. */
  cyberTrades?: number
  cyberGhostWins?: number
  /** Inazuma Rogue: Football Frontiers ganados y mejor ronda alcanzada. */
  inazumaTitles?: number
  inazumaBestRound?: number
  /**
   * EQUIPOS con los que se terminó un torneo (campeón o eliminado), con toda
   * la información útil: base para modos futuros (revanchas, exhibiciones,
   * exportar tu once…). Se guardan los últimos 20.
   */
  inazumaTeams?: {
    finishedAt: number
    teamId: string
    result: 'campeon' | 'eliminado'
    round: number
    record: [number, number, number]
    goalsFor: number
    goalsAgainst: number
    coins: number
    /** Identidad del club (formato «de la nada al Frontier»). */
    name?: string
    crest?: string
    starterBaseId?: string
    roster: {
      baseId: string
      level: number
      techniques: string[]
      item?: string
      captain?: boolean
      rarity?: number
      bond?: number
      /** Números de la run: goles, paradas, duelos y partidos. */
      goals?: number
      saves?: number
      duelsWon?: number
      duelsLost?: number
      matches?: number
    }[]
    lineup: string[]
    formation: string
  }[]
  /** Inazuma Rogue: ids de jugadores que has llegado a fichar (su «Pokédex»). */
  inazumaSigned?: string[]
  /** Dragon Ball Rogue: sagas superadas, mejor saga y aventuras completadas. */
  dragonSagasCleared?: number[]
  dragonBestSaga?: number
  dragonRuns?: number
  dragonWins?: number
  /** Bolas de dragón reunidas en total (para el logro de las siete). */
  dragonBalls?: number
  /** Transformaciones que has llegado a despertar alguna vez. */
  dragonForms?: string[]
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

/** Almacén en memoria con lo justo que se usa de `idb`: get, put y delete. */
let memory: Promise<IDBPDatabase> | null = null
function memoryDb(): Promise<IDBPDatabase> {
  if (!memory) {
    const data = new Map<string, unknown>()
    const k = (store: string, key: string) => `${store}/${key}`
    memory = Promise.resolve({
      get: async (store: string, key: string) => data.get(k(store, key)),
      put: async (store: string, value: unknown, key: string) => { data.set(k(store, key), value) },
      delete: async (store: string, key: string) => { data.delete(k(store, key)) },
    } as unknown as IDBPDatabase)
  }
  return memory
}

let dbPromise: Promise<IDBPDatabase> | null = null
function db(): Promise<IDBPDatabase> {
  // Sin IndexedDB (tests en jsdom, modo privado de algunos navegadores) se
  // devuelve un almacén DE MENTIRA en memoria en vez de reventar: la partida
  // funciona igual, simplemente no sobrevive a recargar. Es preferible a que
  // cada `void save(...)` deje un rechazo suelto por ahí.
  if (typeof indexedDB === 'undefined') return memoryDb()
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

// ---- Cyber PokéBall (aventura del juguete) ----
export async function saveCyber(s: import('@/engine/cyber/types').CyberSave): Promise<void> {
  const d = await db()
  await d.put('runs', s, 'cyber')
}
export async function loadCyber(): Promise<import('@/engine/cyber/types').CyberSave | null> {
  const d = await db()
  return (await d.get('runs', 'cyber')) ?? null
}
export async function clearCyber(): Promise<void> {
  const d = await db()
  await d.delete('runs', 'cyber')
}

// ---- Inazuma Rogue (roguelite de fútbol) ----
export async function saveInazuma(s: import('@/engine/inazuma/types').InazumaSave): Promise<void> {
  const d = await db()
  await d.put('runs', s, 'inazuma')
}
export async function loadInazuma(): Promise<import('@/engine/inazuma/types').InazumaSave | null> {
  const d = await db()
  return (await d.get('runs', 'inazuma')) ?? null
}
export async function clearInazuma(): Promise<void> {
  const d = await db()
  await d.delete('runs', 'inazuma')
}

// ---- Dragon Ball Rogue ----
export async function saveDragon(s: import('@/engine/dragon/run').DragonSave): Promise<void> {
  const d = await db()
  await d.put('runs', s, 'dragon')
}
export async function loadDragon(): Promise<import('@/engine/dragon/run').DragonSave | null> {
  const d = await db()
  return (await d.get('runs', 'dragon')) ?? null
}
export async function clearDragon(): Promise<void> {
  const d = await db()
  await d.delete('runs', 'dragon')
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

// --- Copia de seguridad del progreso en localStorage -----------------------
// IndexedDB y localStorage se purgan por caminos distintos: iOS/Safari borra la
// IndexedDB de una PWA que no se abre en semanas, y ahí se iba TODO el progreso
// (Pokédex, logros, récords). Este espejo es la red de seguridad: si la meta
// vuelve vacía pero el respaldo tiene contenido, se restaura sola.
const BACKUP_KEY = 'pokerogue:meta-backup'

/** "Cuánto progreso" tiene una meta. Sirve para no pisar datos buenos con una
 *  meta vacía, venga de donde venga. */
function metaWeight(m: MetaRecord): number {
  return m.totals.runs + m.totals.wins + m.pokedexCaught.length
    + m.bestRuns.length + (m.achievements?.length ?? 0)
}

function readBackup(): MetaRecord | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    if (!raw) return null
    return { ...structuredClone(EMPTY_META), ...JSON.parse(raw) } as MetaRecord
  } catch {
    return null // respaldo corrupto: se ignora y se reescribirá al siguiente guardado
  }
}

function writeBackup(meta: MetaRecord): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(meta))
  } catch {
    /* cuota llena o modo privado: el respaldo es opcional, nunca rompe el guardado */
  }
}

export async function loadMeta(): Promise<MetaRecord> {
  const d = await db()
  const m = (await d.get('meta', 'meta')) as MetaRecord | undefined
  if (!m) {
    // Sin meta en IndexedDB: si hay respaldo, se restaura (y se reescribe en
    // IndexedDB para que el resto de la app lo vea con normalidad).
    const backup = readBackup()
    if (backup && metaWeight(backup) > 0) {
      await d.put('meta', backup, 'meta')
      return backup
    }
    return structuredClone(EMPTY_META)
  }
  const meta = { ...structuredClone(EMPTY_META), ...m } // backfill de campos nuevos
  meta.bestRuns = dedupeRuns(meta.bestRuns) // limpia duplicados antiguos
  // Migra Pokédex: ids de megas/formas regionales -> especie base.
  const toBase = (arr: number[]) => [...new Set(arr.map(toBaseSpeciesId))]
  meta.pokedexSeen = toBase(meta.pokedexSeen)
  meta.pokedexCaught = toBase(meta.pokedexCaught)
  meta.pokedexShiny = toBase(meta.pokedexShiny)
  // La meta existe pero está MÁS vacía que el respaldo: es el caso de una
  // escritura a medias o de una fila de nube recién creada. Se recupera lo
  // mejor de los dos en vez de dar por buena la versión pobre.
  const backup = readBackup()
  if (backup && metaWeight(backup) > metaWeight(meta)) {
    const restored = mergeMeta(meta, backup)
    await d.put('meta', restored, 'meta')
    return restored
  }
  return meta
}

export async function saveMeta(meta: MetaRecord): Promise<void> {
  const d = await db()
  await d.put('meta', meta, 'meta')
  // Espejo de seguridad. Solo si NO empobrece el respaldo existente, para que un
  // guardado defectuoso no arrastre también a la copia.
  const backup = readBackup()
  if (!backup || metaWeight(meta) >= metaWeight(backup)) writeBackup(meta)
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
    storyCompleted: [...new Set([...(a.storyCompleted ?? []), ...(b.storyCompleted ?? [])])],
    // Equipos de historia: por capítulo, gana el equipo de mayor nivel medio
    // (el más avanzado entre dispositivos).
    storyTeams: mergeStoryTeams(a.storyTeams, b.storyTeams),
    cyberDexSeen: uni(a.cyberDexSeen ?? [], b.cyberDexSeen ?? []),
    cyberDexCaught: uni(a.cyberDexCaught ?? [], b.cyberDexCaught ?? []),
    cyberCompleted: uni(a.cyberCompleted ?? [], b.cyberCompleted ?? []),
    cyberTrades: Math.max(a.cyberTrades ?? 0, b.cyberTrades ?? 0),
    cyberGhostWins: Math.max(a.cyberGhostWins ?? 0, b.cyberGhostWins ?? 0),
    inazumaTitles: Math.max(a.inazumaTitles ?? 0, b.inazumaTitles ?? 0),
    inazumaBestRound: Math.max(a.inazumaBestRound ?? 0, b.inazumaBestRound ?? 0),
    inazumaSigned: [...new Set([...(a.inazumaSigned ?? []), ...(b.inazumaSigned ?? [])])],
    dragonSagasCleared: uni(a.dragonSagasCleared ?? [], b.dragonSagasCleared ?? []),
    dragonBestSaga: Math.max(a.dragonBestSaga ?? 0, b.dragonBestSaga ?? 0),
    dragonRuns: Math.max(a.dragonRuns ?? 0, b.dragonRuns ?? 0),
    dragonWins: Math.max(a.dragonWins ?? 0, b.dragonWins ?? 0),
    dragonBalls: Math.max(a.dragonBalls ?? 0, b.dragonBalls ?? 0),
    dragonForms: [...new Set([...(a.dragonForms ?? []), ...(b.dragonForms ?? [])])],
  }
}

function mergeStoryTeams(
  a?: Record<number, RunState['party']>, b?: Record<number, RunState['party']>,
): Record<number, RunState['party']> {
  const avg = (t: RunState['party']) => t.reduce((s, p) => s + p.level, 0) / Math.max(1, t.length)
  const out: Record<number, RunState['party']> = { ...(a ?? {}) }
  for (const [k, team] of Object.entries(b ?? {})) {
    const key = Number(k)
    if (!out[key] || avg(team) > avg(out[key])) out[key] = team
  }
  return out
}

// ---- Copia de seguridad (export/import) ----
// Sin backend: serializa meta + run a un código que el usuario puede guardar o
// llevar a otro dispositivo. (El "cloud" con cuentas reales requiere servidor.)
export async function exportData(): Promise<string> {
  const meta = await loadMeta()
  const run = await loadRun()
  const cyber = await loadCyber()
  const inazuma = await loadInazuma()
  const dragon = await loadDragon()
  const json = JSON.stringify({ v: 1, meta, run, cyber, inazuma, dragon })
  // base64 seguro para UTF-8
  return btoa(unescape(encodeURIComponent(json)))
}

export async function importData(code: string): Promise<boolean> {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())))
    const data = JSON.parse(json) as {
      meta?: MetaRecord
      run?: RunState | null
      cyber?: import('@/engine/cyber/types').CyberSave | null
      inazuma?: import('@/engine/inazuma/types').InazumaSave | null
      dragon?: import('@/engine/dragon/run').DragonSave | null
    }
    if (data.meta) await saveMeta({ ...structuredClone(EMPTY_META), ...data.meta })
    if (data.run) await saveRun(data.run)
    else await clearRun()
    // Códigos antiguos (sin campo cyber) NO tocan la aventura Cyber local.
    if (data.cyber) await saveCyber(data.cyber)
    else if ('cyber' in data) await clearCyber()
    // Igual con Inazuma: los códigos anteriores a este modo no tocan su partida.
    if (data.inazuma) await saveInazuma(data.inazuma)
    else if ('inazuma' in data) await clearInazuma()
    // Y con Dragon Ball: un código exportado antes de este modo no lo borra.
    if (data.dragon) await saveDragon(data.dragon)
    else if ('dragon' in data) await clearDragon()
    return true
  } catch {
    return false
  }
}
