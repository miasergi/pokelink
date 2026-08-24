// Tests de LA PREVIA: integridad del tablero del Ocalimocho y de los mazos.
import { describe, expect, it } from 'vitest'
import { OCA_BOARD, OCA_SQUARES, resolveMove, squareAt, walkPath } from './oca'
import { KINGS_RULES, PICOLO_CARDS, YO_NUNCA, buildPicoloRound, fillPlayers } from '@/data/party/decks'

describe('ocalimocho', () => {
  it('el tablero tiene 63 casillas bien numeradas, ocas de 8 en 8 y la meta al final', () => {
    expect(OCA_BOARD).toHaveLength(63)
    OCA_BOARD.forEach((sq, i) => expect(sq.idx).toBe(i + 1))
    expect(squareAt(63).kind).toBe('meta')
    expect(OCA_SQUARES).toEqual([8, 16, 24, 32, 40, 48, 56])
    for (const o of OCA_SQUARES) expect(squareAt(o).kind).toBe('oca')
  })

  it('toda casilla tiene título, regla y emoji; las ¡A beber! llevan sus tragos y los patinazos destino válido', () => {
    for (const sq of OCA_BOARD) {
      expect(sq.title.length).toBeGreaterThan(0)
      expect(sq.rule.length).toBeGreaterThan(0)
      expect(sq.emoji.length).toBeGreaterThan(0)
      if (sq.kind === 'beber') expect(sq.x).toBeGreaterThan(0)
      if (sq.kind === 'patinazo') {
        expect(sq.jumpTo).toBeGreaterThanOrEqual(1)
        expect(sq.jumpTo).toBeLessThan(sq.idx) // siempre resbala hacia ATRÁS
      }
    }
  })

  it('la oca salta a la SIGUIENTE oca y repite tirada', () => {
    const m = resolveMove(6, 2) // cae en la oca del 8
    expect(m.square.kind).toBe('oca')
    expect(m.final).toBe(16)
    expect(m.extraRoll).toBe(true)
  })

  it('la última oca (56) lleva a la meta y gana', () => {
    const m = resolveMove(50, 6)
    expect(m.square.kind).toBe('oca')
    expect(m.final).toBe(63)
    expect(m.won).toBe(true)
  })

  it('pasarse de 63 rebota hacia atrás', () => {
    const m = resolveMove(61, 6) // 67 -> rebote a 59
    expect(m.bounced).toBe(true)
    expect(m.path[0]).toBe(59)
    expect(m.final).toBe(59)
  })

  it('llegar exacto a la meta gana; la muerte te manda al 1', () => {
    expect(resolveMove(60, 3).won).toBe(true)
    const muerte = resolveMove(59, 1)
    expect(muerte.square.kind).toBe('muerte')
    expect(muerte.final).toBe(1)
    expect(muerte.won).toBe(false)
  })

  it('los patinazos resbalan a su casilla (42→12, 57→31)', () => {
    expect(resolveMove(40, 2)).toMatchObject({ final: 12, extraRoll: false })
    expect(resolveMove(55, 2)).toMatchObject({ final: 31, extraRoll: false })
  })

  it('laberinto atrapa, cárcel quita 1 turno y la posada del abstemio no castiga', () => {
    expect(resolveMove(7, 2).trap).toBe('laberinto') // laberinto 9
    expect(resolveMove(33, 2).trap).toBe('laberinto') // laberinto 35
    expect(resolveMove(25, 1).skipTurns).toBe(1) // cárcel 26
    expect(resolveMove(44, 1).skipTurns).toBe(1) // cárcel 45
    const posada = resolveMove(3, 1) // posada 4
    expect(posada.square.kind).toBe('posada')
    expect(posada.skipTurns).toBe(0)
    expect(posada.trap).toBeUndefined()
  })

  it('el paseo animado termina EXACTAMENTE donde dice el motor', () => {
    for (let pos = 0; pos <= 62; pos++) {
      for (let die = 1; die <= 6; die++) {
        const steps = walkPath(pos, die)
        expect(steps).toHaveLength(die)
        expect(steps[steps.length - 1]).toBe(resolveMove(pos, die).path[0])
        // Cada paso mueve UNA casilla y nunca se sale del tablero.
        let prev = pos
        for (const s of steps) {
          expect(Math.abs(s - prev)).toBe(1)
          expect(s).toBeGreaterThanOrEqual(1)
          expect(s).toBeLessThanOrEqual(63)
          prev = s
        }
      }
    }
  })

  it('ninguna tirada legal puede salirse del tablero', () => {
    for (let pos = 0; pos <= 62; pos++) {
      for (let die = 1; die <= 6; die++) {
        const m = resolveMove(pos, die)
        expect(m.final).toBeGreaterThanOrEqual(1)
        expect(m.final).toBeLessThanOrEqual(63)
      }
    }
  })
})

describe('mazos de la previa', () => {
  it('los mazos tienen contenido de sobra y el picante está marcado', () => {
    expect(PICOLO_CARDS.length).toBeGreaterThanOrEqual(50)
    expect(YO_NUNCA.length).toBeGreaterThanOrEqual(40)
    expect(KINGS_RULES).toHaveLength(13)
    expect(PICOLO_CARDS.some((c) => c.spicy)).toBe(true)
    expect(YO_NUNCA.some((c) => c.spicy)).toBe(true)
  })

  it('todo virus tiene carta de cierre', () => {
    for (const c of PICOLO_CARDS.filter((c) => c.kind === 'virus')) {
      expect(c.end && c.end.length > 0).toBe(true)
    }
  })

  it('fillPlayers sustituye {j} y {j2} por jugadores DISTINTOS', () => {
    for (let i = 0; i < 50; i++) {
      const out = fillPlayers('{j}|{j2}', ['Ana', 'Bea', 'Carlos'])
      expect(out).not.toContain('{j}')
      expect(out).not.toContain('{j2}')
      const [a, b] = out.split('|')
      expect(a).not.toBe(b)
    }
  })

  it('buildPicoloRound resuelve nombres y cierra cada virus DESPUÉS de abrirlo', () => {
    for (let i = 0; i < 20; i++) {
      const round = buildPicoloRound(['Ana', 'Bea', 'Carlos'], true)
      expect(round.length).toBeGreaterThan(10)
      for (const card of round) {
        expect(card.text).not.toContain('{j}')
        expect(card.text).not.toContain('{j2}')
      }
      const starts = round.filter((c) => c.kind === 'virus').length
      const ends = round.filter((c) => c.kind === 'virusEnd').length
      expect(ends).toBe(starts)
      // Recorrido: nunca puede haber más cierres que aperturas acumuladas.
      let open = 0
      for (const card of round) {
        if (card.kind === 'virus') open++
        if (card.kind === 'virusEnd') { open--; expect(open).toBeGreaterThanOrEqual(0) }
      }
      expect(open).toBe(0)
    }
  })

  it('sin pack picante no entra NINGUNA carta picante', () => {
    // Las cartas picantes contienen palabras clave que no aparecen en las suaves;
    // comprobamos por construcción: filtramos el pool igual que el builder.
    const pool = PICOLO_CARDS.filter((c) => !c.spicy)
    expect(pool.every((c) => !c.spicy)).toBe(true)
    const round = buildPicoloRound(['Ana', 'Bea'], false, 100)
    const spicyTexts = new Set(PICOLO_CARDS.filter((c) => c.spicy).map((c) => c.kind + '|' + c.text))
    // No podemos comparar texto directamente (los nombres ya están resueltos),
    // así que verificamos contra la plantilla rellenada con los mismos nombres.
    for (const card of round) {
      for (const s of PICOLO_CARDS.filter((c) => c.spicy)) {
        const filled = s.text.replace(/\{j\}/g, 'Ana').replace(/\{j2\}/g, 'Bea')
        const filled2 = s.text.replace(/\{j\}/g, 'Bea').replace(/\{j2\}/g, 'Ana')
        expect(card.text).not.toBe(filled)
        expect(card.text).not.toBe(filled2)
      }
    }
    expect(spicyTexts.size).toBeGreaterThan(0)
  })
})
