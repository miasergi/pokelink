// La fusión del marcador compartido es la pieza que puede perder puntos en
// silencio, y eso el sábado no se detecta: nadie va a echar en falta un reto
// que nunca llegó a aparecer. Por eso está cubierta aparte.
import { describe, it, expect } from 'vitest'
import { fundir, type DespedidaSave } from './despedidaStore'

const VACIO: DespedidaSave = {
  v: 2,
  retos: {},
  retosBorrados: {},
  ajustes: [],
  ajustesBorrados: {},
  bloqueFijado: null,
  bloqueFijadoTs: 0,
  vistas: [],
}

const con = (p: Partial<DespedidaSave>): DespedidaSave => ({ ...VACIO, ...p })

describe('fusión del marcador compartido', () => {
  it('junta lo que han marcado dos jueces a la vez', () => {
    const luis = con({ retos: { 'val-1': 1000 } })
    const sergi = con({ retos: { 'for-1': 1001 } })
    const r = fundir(luis, sergi)
    expect(Object.keys(r.retos).sort()).toEqual(['for-1', 'val-1'])
  })

  it('da igual el orden en que lleguen las copias', () => {
    const a = con({ retos: { x: 5 }, ajustes: [{ id: 'a1', delta: 10, motivo: 'a', ts: 5 }] })
    const b = con({ retos: { y: 7 }, ajustes: [{ id: 'b1', delta: -5, motivo: 'b', ts: 7 }] })
    expect(fundir(a, b)).toEqual(fundir(b, a))
  })

  it('un deshacer posterior gana a la marca', () => {
    const marcado = con({ retos: { x: 100 } })
    const deshecho = con({ retos: { x: 100 }, retosBorrados: { x: 200 } })
    const r = fundir(marcado, deshecho)
    expect(r.retosBorrados.x).toBe(200)
    // Y si el otro lo vuelve a marcar DESPUÉS, manda el gesto más nuevo.
    const remarcado = fundir(r, con({ retos: { x: 300 } }))
    expect(remarcado.retos.x).toBeGreaterThan(remarcado.retosBorrados.x)
  })

  it('no resucita un reto deshecho aunque el otro móvil aún lo tuviera', () => {
    // El caso real: Luis deshace, y el móvil de Sergi todavía no se ha
    // enterado y sigue teniéndolo marcado. Al fundir NO puede volver.
    const luisDeshace = con({ retos: { x: 100 }, retosBorrados: { x: 200 } })
    const sergiDesactualizado = con({ retos: { x: 100 } })
    const r = fundir(luisDeshace, sergiDesactualizado)
    expect(r.retosBorrados.x).toBe(200)
    expect(r.retos.x).toBe(100)
  })

  it('no duplica un ajuste que ya está en las dos copias', () => {
    const ajuste = { id: 'a1', delta: 15, motivo: 'chupito', ts: 50 }
    const r = fundir(con({ ajustes: [ajuste] }), con({ ajustes: [ajuste] }))
    expect(r.ajustes).toHaveLength(1)
  })

  it('el bloque fijado más reciente manda', () => {
    const viejo = con({ bloqueFijado: 'elsword', bloqueFijadoTs: 10 })
    const nuevo = con({ bloqueFijado: 'lol', bloqueFijadoTs: 20 })
    expect(fundir(viejo, nuevo).bloqueFijado).toBe('lol')
    expect(fundir(nuevo, viejo).bloqueFijado).toBe('lol')
  })

  it('lo ya celebrado no viaja: es de cada pantalla', () => {
    const mio = con({ vistas: ['r01'] })
    const otro = con({ vistas: ['r02', 'r03'] })
    expect(fundir(mio, otro).vistas).toEqual(['r01'])
  })
})
