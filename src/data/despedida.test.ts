// El contenido de la despedida se va a editar a mano hasta el último día (y en
// grupo). Estos tests son la red: cazan la errata que rompería el marcador el
// sábado por la mañana, cuando ya no hay tiempo de arreglar nada.
import { describe, it, expect } from 'vitest'
import {
  BLOQUES, BLOQUE_GLOBAL, PUNTOS_MAXIMOS, PUNTOS_POR_DIFICULTAD, RECOMPENSAS, RETOS,
  bloqueEnCurso, bloqueSiguiente, puntosDe, rangoDe,
} from './despedida'

describe('datos de la despedida', () => {
  it('no hay ids repetidos', () => {
    for (const lista of [BLOQUES.map((b) => b.id), RETOS.map((r) => r.id), RECOMPENSAS.map((r) => r.id)]) {
      expect(new Set(lista).size).toBe(lista.length)
    }
  })

  it('todos los retos cuelgan de un bloque que existe', () => {
    const ids = new Set<string>([BLOQUE_GLOBAL.id, ...BLOQUES.map((b) => b.id)])
    for (const r of RETOS) expect(ids.has(r.bloque), `reto ${r.id}`).toBe(true)
  })

  it('cada bloque puntuable tiene retos y los de fuera de concurso no', () => {
    // Un bloque puntuable sin retos sale en el cartel sin puntos en juego y
    // parece roto. Y al revés: el básquet quedó fuera de concurso (la
    // despedida acaba el sábado), así que no puede tener retos colgando.
    for (const b of BLOQUES) {
      const tiene = RETOS.some((r) => r.bloque === b.id)
      if (b.sinPuntos) expect(tiene, `${b.id} está fuera de concurso pero tiene retos`).toBe(false)
      else expect(tiene, `bloque ${b.id} sin retos`).toBe(true)
    }
  })

  it('los logros ocultos dicen algo sin destriparse', () => {
    // La idea de Cla: hasta que caiga por primera vez solo se ve la pista. Sin
    // pista, en la web saldría un hueco mudo.
    for (const r of RETOS) {
      if (!r.oculto) continue
      expect(r.pista, `el logro oculto ${r.id} no tiene pista`).toBeTruthy()
      expect(r.castigo, `${r.id} es oculto pero no resta: no tiene sentido`).toBe(true)
    }
  })

  it('los puntos salen de la dificultad salvo que se pongan a mano', () => {
    for (const r of RETOS) {
      if (r.puntos === undefined) {
        expect(puntosDe(r), `reto ${r.id}`).toBe(PUNTOS_POR_DIFICULTAD[r.dificultad])
      }
      expect(puntosDe(r), `reto ${r.id}`).not.toBe(0)
    }
  })

  it('los castigos restan y el resto suma', () => {
    for (const r of RETOS) {
      if (r.castigo) expect(puntosDe(r), `reto ${r.id}`).toBeLessThan(0)
      else expect(puntosDe(r), `reto ${r.id}`).toBeGreaterThan(0)
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

  it('las cajas con caducidad apuntan a un bloque real y traen castigo', () => {
    const ids = new Set(BLOQUES.map((b) => b.id))
    for (const r of RECOMPENSAS) {
      if (!r.limite) continue
      // Una caducidad sin castigo no caduca de nada, y una que apunta a un
      // bloque inexistente no salta nunca: las dos pasarían desapercibidas.
      expect(ids.has(r.limite), `premio ${r.id} caduca en un bloque que no existe`).toBe(true)
      expect(r.penalizacion, `premio ${r.id} caduca pero no dice qué pasa`).toBeTruthy()
    }
  })

  it('cada caja se puede abrir antes de caducar', () => {
    // Si el umbral pide más puntos de los que se pueden tener cuando llega su
    // hora límite, el castigo es automático y la caja es decorativa.
    for (const r of RECOMPENSAS) {
      if (!r.limite) continue
      const corte = rangoDe(BLOQUES.find((b) => b.id === r.limite)!).desde
      const alcanzable = BLOQUES
        .filter((b) => rangoDe(b).hasta <= corte)
        .flatMap((b) => RETOS.filter((x) => x.bloque === b.id))
        .reduce((n, x) => n + Math.max(0, puntosDe(x)), 0)
      expect(alcanzable, `el premio ${r.id} caduca antes de poder pagarse`).toBeGreaterThanOrEqual(r.umbral)
    }
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
