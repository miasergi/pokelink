// Tests de LA PREVIA: integridad del tablero del Ocalimocho y de los mazos.
import { describe, expect, it } from 'vitest'
import { OCA_BOARD, OCA_SQUARES, resolveMove, squareAt } from './oca'
import { KINGS_RULES, PICOLO_CARDS, YO_NUNCA, buildPicoloRound, fillPlayers } from '@/data/party/decks'

describe('ocalimocho', () => {
  it('el tablero tiene 63 casillas bien numeradas y la meta al final', () => {
    expect(OCA_BOARD).toHaveLength(63)
    OCA_BOARD.forEach((sq, i) => expect(sq.idx).toBe(i + 1))
    expect(squareAt(63).kind).toBe('meta')
    for (const o of OCA_SQUARES) expect(squareAt(o).kind).toBe('oca')
  })

  it('toda casilla tiene título y regla', () => {
    for (const sq of OCA_BOARD) {
      expect(sq.title.length).toBeGreaterThan(0)
      expect(sq.rule.length).toBeGreaterThan(0)
    }
  })

  it('la oca salta a la SIGUIENTE oca y repite tirada', () => {
    const m = resolveMove(3, 2) // cae en la oca del 5
    expect(m.square.kind).toBe('oca')
    expect(m.final).toBe(9)
    expect(m.extraRoll).toBe(true)
  })

  it('la última oca (59) lleva a la meta y gana', () => {
    const m = resolveMove(55, 4)
    expect(m.final).toBe(63)
    expect(m.won).toBe(true)
  })

  it('pasarse de 63 rebota hacia atrás', () => {
    const m = resolveMove(61, 6) // 67 -> rebote a 59 (que además es oca -> 63)
    expect(m.bounced).toBe(true)
    expect(m.path[0]).toBe(59)
  })

  it('llegar exacto a la meta gana; la muerte te manda al 1', () => {
    expect(resolveMove(60, 3).won).toBe(true)
    const muerte = resolveMove(57, 1)
    expect(muerte.square.kind).toBe('muerte')
    expect(muerte.final).toBe(1)
    expect(muerte.won).toBe(false)
  })

  it('puente y dados saltan al gemelo y repiten; posada/pozo/cárcel quitan turnos', () => {
    expect(resolveMove(4, 2)).toMatchObject({ final: 12, extraRoll: true })
    expect(resolveMove(24, 2)).toMatchObject({ final: 53, extraRoll: true })
    expect(resolveMove(16, 3).skipTurns).toBe(1) // posada 19
    expect(resolveMove(28, 3).skipTurns).toBe(2) // pozo 31
    expect(resolveMove(49, 3).skipTurns).toBe(2) // cárcel 52
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
