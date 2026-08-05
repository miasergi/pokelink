import { describe, it, expect } from 'vitest'
import { createRun, levelCap, addMoney } from './runEngine'
import type { Difficulty, RunState } from './types'

const newRun = (over: Partial<Parameters<typeof createRun>[0]> = {}): RunState =>
  createRun({ pools: [1], random: false, difficulty: 'normal' as Difficulty, gen: 1, starterId: 1, seed: 3, ...over })

describe('opción de tope de nivel', () => {
  it('con tope: no puedes pasar del próximo jefe (+ margen de dificultad)', () => {
    for (const d of ['normal', 'hard', 'nuzlocke'] as Difficulty[]) {
      const run = newRun({ difficulty: d })
      expect(levelCap(run)).toBeLessThan(100)
    }
  })

  it('nivel libre: el tope desaparece en cualquier dificultad', () => {
    for (const d of ['normal', 'hard', 'nuzlocke'] as Difficulty[]) {
      const run = newRun({ difficulty: d, freeLevel: true })
      expect(levelCap(run)).toBe(100)
    }
  })

  it('el nivel libre viaja en la run (se guarda y se recarga con ella)', () => {
    const run = newRun({ freeLevel: true })
    expect(run.freeLevel).toBe(true)
    // Round-trip por JSON: así se persiste en IndexedDB y se sube a la nube.
    const revived = JSON.parse(JSON.stringify(run)) as RunState
    expect(levelCap(revived)).toBe(100)
  })
})

describe('dinero ganado en la run', () => {
  it('acumula solo los ingresos, no las pérdidas', () => {
    const run = newRun()
    const start = run.money
    addMoney(run, 500)
    addMoney(run, -200)
    addMoney(run, 300)
    expect(run.money).toBe(start + 600)
    expect(run.stats.moneyEarned).toBe(800) // 500 + 300; el gasto no cuenta
  })

  it('nunca deja el saldo en negativo', () => {
    const run = newRun()
    addMoney(run, -999_999)
    expect(run.money).toBe(0)
  })
})
