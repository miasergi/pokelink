// El contenido de la despedida se va a editar a mano hasta el último día (y en
// grupo). Estos tests son la red: cazan la errata que rompería el marcador el
// sábado por la mañana, cuando ya no hay tiempo de arreglar nada.
import { describe, it, expect } from 'vitest'
import {
  BLOQUES, PUNTOS_MAXIMOS, RECOMPENSAS, RETOS, bloqueEnCurso, bloqueSiguiente, rangoDe,
} from './despedida'

describe('datos de la despedida', () => {
  it('no hay ids repetidos', () => {
    for (const lista of [BLOQUES.map((b) => b.id), RETOS.map((r) => r.id), RECOMPENSAS.map((r) => r.id)]) {
      expect(new Set(lista).size).toBe(lista.length)
    }
  })

  it('todos los retos cuelgan de un bloque que existe', () => {
    const ids = new Set(BLOQUES.map((b) => b.id))
    for (const r of RETOS) expect(ids.has(r.bloque), `reto ${r.id}`).toBe(true)
  })

  it('los castigos restan y el resto suma', () => {
    for (const r of RETOS) {
      if (r.castigo) expect(r.puntos, `reto ${r.id}`).toBeLessThan(0)
      else expect(r.puntos, `reto ${r.id}`).toBeGreaterThan(0)
    }
  })

  it('las recompensas van de menor a mayor umbral y son alcanzables', () => {
    for (let i = 1; i < RECOMPENSAS.length; i++) {
      expect(RECOMPENSAS[i].umbral).toBeGreaterThan(RECOMPENSAS[i - 1].umbral)
    }
    // Si el último premio pidiera más puntos de los que se pueden sacar, sería
    // imposible de abrir y nadie se daría cuenta hasta el domingo.
    expect(RECOMPENSAS[RECOMPENSAS.length - 1].umbral).toBeLessThanOrEqual(PUNTOS_MAXIMOS)
  })

  it('los bloques no se solapan y van en orden', () => {
    for (let i = 1; i < BLOQUES.length; i++) {
      const anterior = rangoDe(BLOQUES[i - 1])
      const actual = rangoDe(BLOQUES[i])
      expect(actual.desde.getTime(), `${BLOQUES[i].id} empieza antes de que acabe el anterior`)
        .toBeGreaterThanOrEqual(anterior.hasta.getTime())
    }
  })

  it('cada bloque dura algo y el nocturno cruza la medianoche sin romperse', () => {
    for (const b of BLOQUES) {
      const { desde, hasta } = rangoDe(b)
      expect(hasta.getTime(), `bloque ${b.id}`).toBeGreaterThan(desde.getTime())
    }
    const noche = BLOQUES.find((b) => b.id === 'noche')!
    const { desde, hasta } = rangoDe(noche)
    expect(hasta.getDate()).toBe(desde.getDate() + 1)
  })

  it('Óscar está en todos los bloques (es su despedida)', () => {
    for (const b of BLOQUES) expect(b.participantes, `bloque ${b.id}`).toContain('Óscar')
  })

  it('el reloj sabe qué bloque toca', () => {
    const dentro = new Date(rangoDe(BLOQUES[0]).desde.getTime() + 60_000)
    expect(bloqueEnCurso(dentro)?.id).toBe(BLOQUES[0].id)

    const antes = new Date(rangoDe(BLOQUES[0]).desde.getTime() - 3_600_000)
    expect(bloqueEnCurso(antes)).toBeNull()
    expect(bloqueSiguiente(antes)?.id).toBe(BLOQUES[0].id)

    const despues = new Date(rangoDe(BLOQUES[BLOQUES.length - 1]).hasta.getTime() + 3_600_000)
    expect(bloqueEnCurso(despues)).toBeNull()
    expect(bloqueSiguiente(despues)).toBeNull()
  })
})
