// @vitest-environment jsdom
// La tabla real todavía no existe, así que el camino "marcar → subir → que lo
// vea otro" no se puede probar contra Supabase. Lo que sí se puede probar, y es
// donde estaría el fallo silencioso, es la ORQUESTACIÓN: que al marcar se relea
// antes de escribir, que lo que se sube lleve lo de los dos, y que lo que baja
// se funda en vez de pisar.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const nube = vi.hoisted(() => ({
  fila: null as unknown,
  escrito: [] as unknown[],
}))

vi.mock('@/persistence/despedidaNube', () => ({
  nubeConfigurada: () => true,
  saludNube: () => 'ok' as const,
  leerNube: async () => (nube.fila ? { estado: nube.fila, updatedAt: '2026-09-12T10:00:00Z' } : null),
  escribirNube: async (estado: unknown) => { nube.escrito.push(estado); nube.fila = estado; return true },
}))

const { useDespedida } = await import('./despedidaStore')

/** Espera a que la cadena de subidas se vacíe. */
const reposo = () => new Promise((r) => setTimeout(r, 30))

describe('marcador compartido, de punta a punta', () => {
  beforeEach(async () => {
    nube.fila = null
    nube.escrito = []
    localStorage.clear()
    useDespedida.getState().reiniciar()
    await reposo()
    nube.escrito = []
  })

  it('lo que baja de la nube se funde con lo de aquí, no lo pisa', async () => {
    // Este móvil marca una cosa...
    useDespedida.getState().marcarReto('ina-1')
    await reposo()
    // ...y mientras, otro juez había marcado otra.
    nube.fila = {
      v: 2,
      retos: { 'ina-2': Date.now() },
      retosBorrados: {},
      ajustes: [],
      ajustesBorrados: {},
      bloqueFijado: null,
      bloqueFijadoTs: 0,
    }
    await useDespedida.getState().sincronizar()

    expect(useDespedida.getState().hecho('ina-1'), 'se ha perdido lo de este móvil').toBe(true)
    expect(useDespedida.getState().hecho('ina-2'), 'no ha llegado lo del otro').toBe(true)
  })

  it('antes de escribir relee, para no borrar lo que otro acaba de marcar', async () => {
    // Alguien marca en la nube algo que este móvil aún no conoce.
    nube.fila = {
      v: 2,
      retos: { 'ina-3': 1000 },
      retosBorrados: {},
      ajustes: [],
      ajustesBorrados: {},
      bloqueFijado: null,
      bloqueFijadoTs: 0,
    }
    // Y aquí se marca otra cosa distinta, sin haber sincronizado antes.
    useDespedida.getState().marcarReto('ina-1')
    await reposo()

    const ultimo = nube.escrito[nube.escrito.length - 1] as { retos: Record<string, number> }
    expect(Object.keys(ultimo.retos).sort()).toEqual(['ina-1', 'ina-3'])
  })

  it('el deshacer viaja: no basta con quitarlo de aquí', async () => {
    useDespedida.getState().marcarReto('ina-1')
    await reposo()
    useDespedida.getState().desmarcarReto('ina-1')
    await reposo()

    const ultimo = nube.escrito[nube.escrito.length - 1] as { retosBorrados: Record<string, number> }
    expect(ultimo.retosBorrados['ina-1'], 'la lápida no ha subido').toBeGreaterThan(0)
    expect(useDespedida.getState().hecho('ina-1')).toBe(false)
  })

  it('lo que celebra cada pantalla no se comparte', async () => {
    useDespedida.getState().ajustar(10, 'prueba')
    await reposo()
    const ultimo = nube.escrito[nube.escrito.length - 1] as Record<string, unknown>
    expect(ultimo).not.toHaveProperty('vistas')
  })

  it('una caja que abre OTRO también se celebra aquí', async () => {
    // Nadie ha tocado nada en este móvil, pero en la nube hay 10 puntos.
    nube.fila = {
      v: 2,
      retos: {},
      retosBorrados: {},
      ajustes: [{ id: 'x', delta: 10, motivo: 'lo marcó Luis', ts: Date.now() }],
      ajustesBorrados: {},
      bloqueFijado: null,
      bloqueFijadoTs: 0,
    }
    await useDespedida.getState().sincronizar()

    expect(useDespedida.getState().puntos()).toBe(10)
    expect(useDespedida.getState().celebrando, 'la caja no ha saltado en esta pantalla').toBe('r01')
  })
})
