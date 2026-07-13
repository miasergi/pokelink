// Cliente Supabase MÍNIMO (sin SDK): Auth por email/contraseña + tabla `profiles`
// para guardar el progreso (meta) en la nube. Si no hay claves configuradas,
// todo queda deshabilitado y el juego funciona en local.
import type { MetaRecord } from './db'
import type { PokemonInstance } from '@/types'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const SESSION_KEY = 'pokerogue:supabase-session'

export function cloudEnabled(): boolean {
  return !!(URL && KEY)
}

export interface CloudUser {
  id: string
  email: string
}
interface Session {
  access_token: string
  refresh_token: string
  expires_at: number // epoch seconds
  user: CloudUser
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}
function storeSession(s: Session | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else localStorage.removeItem(SESSION_KEY)
}

function sessionFrom(json: { access_token: string; refresh_token: string; expires_in: number; user: { id: string; email: string } }): Session {
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600) - 60,
    user: { id: json.user.id, email: json.user.email },
  }
}

async function authFetch(path: string, body: unknown): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  if (!URL || !KEY) return { ok: false, error: 'Nube no configurada' }
  try {
    const res = await fetch(`${URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error_description || data.msg || data.message || 'Error de autenticación' }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Sin conexión' }
  }
}

export function currentUser(): CloudUser | null {
  return loadSession()?.user ?? null
}

export async function signUp(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const r = await authFetch('signup', { email, password })
  if (!r.ok) return r
  const d = r.data as { access_token?: string; user?: { id: string; email: string } }
  // Si la confirmación por email está activada, no hay token aún.
  if (d.access_token && d.user) {
    storeSession(sessionFrom(d as never))
    return { ok: true }
  }
  return { ok: false, error: 'Revisa tu email para confirmar la cuenta (o desactiva la confirmación en Supabase).' }
}

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const r = await authFetch('token?grant_type=password', { email, password })
  if (!r.ok) return r
  storeSession(sessionFrom(r.data as never))
  return { ok: true }
}

export function signOut() {
  storeSession(null)
}

/** Devuelve un access_token válido (refrescándolo si hace falta). NO cierra la
 *  sesión por errores de red transitorios (solo si el refresh es rechazado). */
async function validToken(): Promise<string | null> {
  const s = loadSession()
  if (!s) return null
  if (s.expires_at > Math.floor(Date.now() / 1000)) return s.access_token
  const r = await authFetch('token?grant_type=refresh_token', { refresh_token: s.refresh_token })
  if (r.ok) {
    const ns = sessionFrom(r.data as never)
    storeSession(ns)
    return ns.access_token
  }
  // Sin conexión: mantenemos la sesión y reintentamos con el token actual.
  if (r.error === 'Sin conexión') return s.access_token
  // Refresh rechazado de verdad (token revocado/caducado): cerramos sesión.
  storeSession(null)
  return null
}

/** Carga la meta guardada en la nube del usuario (o null). */
export async function loadCloudMeta(): Promise<MetaRecord | null> {
  if (!URL || !KEY) return null
  const token = await validToken()
  const user = currentUser()
  if (!token || !user) return null
  try {
    const res = await fetch(`${URL}/rest/v1/profiles?id=eq.${user.id}&select=meta`, {
      headers: { apikey: KEY, Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const rows = (await res.json()) as { meta: MetaRecord }[]
    return rows[0]?.meta ?? null
  } catch {
    return null
  }
}

// ---- Ranking online de Glory Runs ----
export interface GloryEntry {
  alias: string
  region: string
  difficulty: string
  mode: string
  pools: number[]
  random: boolean
  duration_ms: number
}
export interface GloryRow extends GloryEntry {
  id: number
  user_id: string
  created_at: string
}

/** Envía una Glory Run (partida ganada) al ranking. */
export async function submitGloryRun(e: GloryEntry): Promise<boolean> {
  if (!URL || !KEY) return false
  const token = await validToken()
  const user = currentUser()
  if (!token || !user) return false
  try {
    const res = await fetch(`${URL}/rest/v1/glory_runs`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...e, user_id: user.id }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Ranking público: mejores tiempos (lectura abierta, sin login). */
export async function fetchLeaderboard(opts: { region?: string; difficulty?: string; limit?: number; since?: string; daily?: boolean } = {}): Promise<GloryRow[] | null> {
  if (!URL || !KEY) return null
  const params = new URLSearchParams({ select: '*', order: 'duration_ms.asc', limit: String(opts.limit ?? 50) })
  if (opts.region) params.set('region', `eq.${opts.region}`)
  if (opts.difficulty) params.set('difficulty', `eq.${opts.difficulty}`)
  // El Reto diario tiene su propio ranking; las demás tablas lo excluyen.
  params.set('mode', opts.daily ? 'eq.Reto diario' : 'neq.Reto diario')
  if (opts.since) params.set('created_at', `gte.${opts.since}`)
  try {
    const res = await fetch(`${URL}/rest/v1/glory_runs?${params.toString()}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    })
    if (!res.ok) return null
    return (await res.json()) as GloryRow[]
  } catch {
    return null
  }
}

// ---- Cyber PokéBall online (Cable Link): intercambios + combate fantasma ----
// Tablas: cyber_trades, cyber_ghosts, cyber_battle_results (SQL en SUPABASE.md).

/** fetch REST autenticado contra PostgREST. Devuelve null sin sesión/nube. */
async function restFetch(path: string, init: RequestInit = {}): Promise<Response | null> {
  if (!URL || !KEY) return null
  const token = await validToken()
  if (!token) return null
  try {
    return await fetch(`${URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    })
  } catch {
    return null
  }
}

export type CyberTradeStatus = 'open' | 'accepted' | 'completed' | 'closed' | 'cancelled'

export interface CyberTradeRow {
  id: number
  owner_id: string
  owner_alias: string
  gen: number
  offered: PokemonInstance
  wanted_species: number | null
  status: CyberTradeStatus
  taker_id: string | null
  taker_alias: string | null
  counter: PokemonInstance | null
  created_at: string
  updated_at: string
}

export interface CyberGhostRow {
  user_id: string
  gen: number
  alias: string
  team: PokemonInstance[]
  badges: number
  updated_at: string
}

/** Ofertas abiertas de otros jugadores (misma gen). */
export async function cyberListOpenTrades(gen: number): Promise<CyberTradeRow[] | null> {
  const user = currentUser()
  const res = await restFetch(`cyber_trades?status=eq.open&gen=eq.${gen}&order=created_at.desc&limit=30`)
  if (!res?.ok) return null
  const rows = (await res.json()) as CyberTradeRow[]
  return user ? rows.filter((r) => r.owner_id !== user.id) : rows
}

/** Mis intercambios (como dueño o como aceptante), recientes primero. */
export async function cyberMyTrades(): Promise<CyberTradeRow[] | null> {
  const user = currentUser()
  if (!user) return null
  const res = await restFetch(`cyber_trades?or=(owner_id.eq.${user.id},taker_id.eq.${user.id})&order=updated_at.desc&limit=20`)
  if (!res?.ok) return null
  return (await res.json()) as CyberTradeRow[]
}

export async function cyberCreateTrade(gen: number, offered: PokemonInstance, wantedSpecies: number | null, alias: string): Promise<boolean> {
  const user = currentUser()
  if (!user) return false
  const res = await restFetch('cyber_trades', {
    method: 'POST',
    body: JSON.stringify({ owner_id: user.id, owner_alias: alias || 'Anónimo', gen, offered, wanted_species: wantedSpecies, status: 'open' }),
  })
  return !!res?.ok
}

/** Acepta una oferta abierta aportando tu Pokémon (open → accepted). */
export async function cyberAcceptTrade(id: number, counter: PokemonInstance, alias: string): Promise<boolean> {
  const user = currentUser()
  if (!user) return false
  const res = await restFetch(`cyber_trades?id=eq.${id}&status=eq.open`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'accepted', taker_id: user.id, taker_alias: alias || 'Anónimo', counter, updated_at: new Date().toISOString() }),
  })
  if (!res?.ok) return false
  // PostgREST devuelve las filas afectadas: si otro se adelantó, viene vacío.
  const rows = (await res.json()) as unknown[]
  return rows.length > 0
}

/** Cambia el estado de un intercambio SOLO si sigue en `expected` (guarda
 *  contra carreras con listas rancias: cancelar una oferta ya aceptada
 *  perdería el Pokémon del otro jugador, y confirmar dos veces lo duplicaría).
 *  Devuelve true únicamente si la fila realmente cambió. */
export async function cyberSetTradeStatus(
  id: number, status: CyberTradeStatus, expected: CyberTradeStatus,
): Promise<boolean> {
  const res = await restFetch(`cyber_trades?id=eq.${id}&status=eq.${expected}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  })
  if (!res?.ok) return false
  const rows = (await res.json()) as unknown[]
  return rows.length > 0
}

/** El aceptante se retira de un trato 'accepted' que el dueño no confirma:
 *  la oferta vuelve a 'open' y recupera su Pokémon. Guardado igual que arriba. */
export async function cyberWithdrawTrade(id: number): Promise<boolean> {
  const res = await restFetch(`cyber_trades?id=eq.${id}&status=eq.accepted`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'open', taker_id: null, taker_alias: null, counter: null, updated_at: new Date().toISOString() }),
  })
  if (!res?.ok) return false
  const rows = (await res.json()) as unknown[]
  return rows.length > 0
}

/** Publica/actualiza tu equipo fantasma de una gen (upsert por user+gen). */
export async function cyberPublishGhost(gen: number, team: PokemonInstance[], badges: number, alias: string): Promise<boolean> {
  const user = currentUser()
  if (!user) return false
  const res = await restFetch('cyber_ghosts', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: user.id, gen, alias: alias || 'Anónimo', team, badges, updated_at: new Date().toISOString() }),
  })
  return !!res?.ok
}

/** Equipos fantasma de otros jugadores de la misma gen. */
export async function cyberFetchGhosts(gen: number, limit = 20): Promise<CyberGhostRow[] | null> {
  const user = currentUser()
  const res = await restFetch(`cyber_ghosts?gen=eq.${gen}&order=updated_at.desc&limit=${limit}`)
  if (!res?.ok) return null
  const rows = (await res.json()) as CyberGhostRow[]
  return user ? rows.filter((r) => r.user_id !== user.id) : rows
}

/** Registra el resultado de un combate fantasma (reproducible por semilla). */
export async function cyberSubmitResult(r: { ghost_id: string; gen: number; seed: number; challenger_won: boolean }): Promise<boolean> {
  const user = currentUser()
  if (!user) return false
  const res = await restFetch('cyber_battle_results', {
    method: 'POST',
    body: JSON.stringify({ challenger_id: user.id, ghost_id: r.ghost_id, gen: r.gen, seed: r.seed, challenger_won: r.challenger_won }),
  })
  return !!res?.ok
}

/** Guarda (upsert) la meta del usuario en la nube. */
export async function saveCloudMeta(meta: MetaRecord): Promise<boolean> {
  if (!URL || !KEY) return false
  const token = await validToken()
  const user = currentUser()
  if (!token || !user) return false
  try {
    const res = await fetch(`${URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ id: user.id, meta, updated_at: new Date().toISOString() }),
    })
    return res.ok
  } catch {
    return false
  }
}
