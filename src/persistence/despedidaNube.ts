// Marcador compartido de la despedida, contra Supabase y SIN cuentas.
//
// El resto de la app usa PostgREST con sesión (`persistence/supabase.ts`), pero
// aquí no puede haberla: el sábado nadie va a registrarse para marcar un reto.
// Se va con la clave anónima contra UNA fila pública, y el único cerrojo es el
// PIN del juez, que vive en el cliente. Para un marcador de coña es el
// equilibrio correcto; no guarda ningún secreto y así está documentado.
//
// Todo devuelve null en vez de lanzar: si no hay tabla, no hay red o no hay
// claves, la sección tiene que seguir funcionando en local sin enterarse.
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** La única fila que existe. El SQL está en SUPABASE.md. */
const FILA = 'oscar26'

/** Qué tal se lleva este dispositivo con la nube, para poder decirlo en pantalla. */
export type SaludNube =
  | 'apagada'    // no hay claves compiladas: modo local puro
  | 'sin-tabla'  // hay claves pero la tabla aún no existe (falta el SQL)
  | 'sin-red'    // debería funcionar pero ahora mismo no contesta
  | 'ok'

let salud: SaludNube = URL && KEY ? 'sin-red' : 'apagada'

export function saludNube(): SaludNube {
  return salud
}

export function nubeConfigurada(): boolean {
  return !!(URL && KEY)
}

function cabeceras(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: KEY!, Authorization: `Bearer ${KEY!}`, 'Content-Type': 'application/json', ...extra }
}

export interface FilaNube<T> {
  estado: T
  /** Marca de tiempo del SERVIDOR, no del móvil de nadie. */
  updatedAt: string
}

/** Lee la fila del evento. null si no se puede (y deja dicho por qué en `salud`). */
export async function leerNube<T>(): Promise<FilaNube<T> | null> {
  if (!URL || !KEY) { salud = 'apagada'; return null }
  try {
    const res = await fetch(`${URL}/rest/v1/despedida?id=eq.${FILA}&select=estado,updated_at`, {
      headers: cabeceras(),
    })
    // 404 (o 42P01 en el cuerpo) = la tabla todavía no está creada.
    if (res.status === 404) { salud = 'sin-tabla'; return null }
    if (!res.ok) { salud = res.status >= 500 ? 'sin-red' : 'sin-tabla'; return null }
    const filas = (await res.json()) as Array<{ estado: T; updated_at: string }>
    salud = 'ok'
    // Sin fila todavía: la tabla existe pero nadie ha escrito. No es un error.
    if (!filas.length) return null
    return { estado: filas[0].estado, updatedAt: filas[0].updated_at }
  } catch {
    salud = 'sin-red'
    return null
  }
}

/**
 * Guarda el estado completo. Usa upsert para no tener que saber si la fila ya
 * existe (el SQL la siembra, pero si alguien la borra esto la repone).
 */
export async function escribirNube<T>(estado: T): Promise<boolean> {
  if (!URL || !KEY) { salud = 'apagada'; return false }
  try {
    const res = await fetch(`${URL}/rest/v1/despedida?on_conflict=id`, {
      method: 'POST',
      headers: cabeceras({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ id: FILA, estado }),
    })
    if (res.status === 404) { salud = 'sin-tabla'; return false }
    if (!res.ok) { salud = res.status >= 500 ? 'sin-red' : 'sin-tabla'; return false }
    salud = 'ok'
    return true
  } catch {
    salud = 'sin-red'
    return false
  }
}
