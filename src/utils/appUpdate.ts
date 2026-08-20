// ACTUALIZACIÓN A LA CARTA: el botón «Actualizar» del inicio, para quien no
// sabe (ni tiene por qué saber) vaciar cachés a mano.
//
// Plan A: pedirle al service worker NUEVO que tome el control (la vía
// educada de la PWA). Plan B, si no había actualización esperando o algo se
// quedó atascado: fuera TODOS los service workers y TODAS las cachés, y
// recarga limpia del servidor. Las partidas guardadas viven en IndexedDB y
// no se tocan jamás.

let doUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null

/** La registra `main.tsx` con el manejador que devuelve `registerSW`. */
export function setUpdater(fn: (reloadPage?: boolean) => Promise<void>): void {
  doUpdate = fn
}

export async function forceUpdate(): Promise<void> {
  // Plan A: si hay un worker nuevo esperando, esto activa y recarga solo.
  try {
    await doUpdate?.(true)
  } catch {
    /* al plan B */
  }
  // Plan B: limpieza total de workers y cachés + recarga. Si el plan A ya
  // recargó la página, nunca llegamos aquí (y si no, esto lo garantiza).
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? []
    await Promise.all(regs.map((r) => r.unregister()))
  } catch {
    /* sin SW no hay nada que limpiar */
  }
  try {
    const keys = (await caches?.keys?.()) ?? []
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch {
    /* sin CacheStorage, la recarga basta */
  }
  window.location.reload()
}
