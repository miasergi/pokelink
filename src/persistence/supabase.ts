// Cliente Supabase MÍNIMO (sin SDK): Auth por email/contraseña + tabla `profiles`
// para guardar el progreso (meta) en la nube. Si no hay claves configuradas,
// todo queda deshabilitado y el juego funciona en local.
import type { MetaRecord } from './db'

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

/** Devuelve un access_token válido (refrescándolo si hace falta). */
async function validToken(): Promise<string | null> {
  const s = loadSession()
  if (!s) return null
  if (s.expires_at > Math.floor(Date.now() / 1000)) return s.access_token
  const r = await authFetch('token?grant_type=refresh_token', { refresh_token: s.refresh_token })
  if (!r.ok) { storeSession(null); return null }
  const ns = sessionFrom(r.data as never)
  storeSession(ns)
  return ns.access_token
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
export async function fetchLeaderboard(opts: { region?: string; difficulty?: string; limit?: number } = {}): Promise<GloryRow[] | null> {
  if (!URL || !KEY) return null
  const params = new URLSearchParams({ select: '*', order: 'duration_ms.asc', limit: String(opts.limit ?? 50) })
  if (opts.region) params.set('region', `eq.${opts.region}`)
  if (opts.difficulty) params.set('difficulty', `eq.${opts.difficulty}`)
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
