import { describe, it, expect } from 'vitest'
import { createRun, levelCap } from './runEngine'
import { effectiveEnemyLevel, enemyLevelBonus } from './difficulty'
import type { Difficulty, MapNode, RunState } from './types'

/**
 * Curva de nivel y dificultad (v6.46).
 *
 * El bug que blindan estos tests: en Difícil los enemigos iban a ×1.4 mientras
 * el jugador subía por bonus FIJOS de casilla, así que la separación crecía sin
 * freno (gym1 +3 niveles, gym4 +13, gym8 +27) y a partir del 3er/4º gimnasio la
 * run era matemáticamente imposible. La regla es: el hueco entre el jefe y lo
 * máximo a lo que puede llegar el jugador tiene que ser CONSTANTE, no crecer.
 */

const bosses = (run: RunState): MapNode[] =>
  Object.values(run.map.nodes)
    .filter((n) => n.type === 'gym' || n.type === 'elite' || n.type === 'champion')
    .sort((a, b) => a.layer - b.layer)

/** Tope de nivel del jugador cuando ese jefe es el próximo sin vencer. */
function capBefore(run: RunState, boss: MapNode): number {
  for (const n of bosses(run)) n.cleared = n.layer < boss.layer
  return levelCap(run)
}

describe('curva de nivel por dificultad', () => {
  it('el extra de nivel enemigo tiene techo (no es un multiplicador)', () => {
    for (const diff of ['hard', 'nuzlocke'] as Difficulty[]) {
      const early = enemyLevelBonus(diff, 8)
      const late = enemyLevelBonus(diff, 67)
      expect(early).toBeGreaterThan(0)
      // La clave: el extra NO escala con el nivel sin freno. Con ×1.4 esto
      // valía 3 al principio y 27 al final; ahora está acotado y ya saturado
      // mucho antes del final de la run.
      expect(late).toBeLessThanOrEqual(6)
      expect(late).toBeGreaterThan(early)
      expect(enemyLevelBonus(diff, 100)).toBe(late) // saturado, no crece más
    }
    expect(enemyLevelBonus('normal', 50)).toBe(0)
  })

  it('el hueco jefe-vs-tope del jugador no se dispara al avanzar la run', () => {
    for (const diff of ['normal', 'hard', 'nuzlocke'] as Difficulty[]) {
      const run = createRun({ pools: [1], random: false, difficulty: diff, gen: 1, starterId: 1, seed: 7 })
      const gaps = bosses(run).map((b) => effectiveEnemyLevel(b, diff) - capBefore(run, b))
      // El tope tiene que dejarte SIEMPRE llegar al jefe, en toda la run.
      for (const g of gaps) expect(g).toBeLessThanOrEqual(2)
      // Y la separación tiene que ser plana: entre el primer jefe y el último
      // no puede abrirse una brecha (con ×1.4 se abría más de 25 niveles).
      const drift = Math.max(...gaps) - Math.min(...gaps)
      expect(drift).toBeLessThanOrEqual(6)
    }
  })

  it('subir de dificultad endurece la curva de forma monótona', () => {
    const runs = (['normal', 'hard', 'nuzlocke'] as Difficulty[]).map((d) =>
      createRun({ pools: [1], random: false, difficulty: d, gen: 1, starterId: 1, seed: 7 }),
    )
    const [normal, hard, nuz] = runs
    const gym4 = (r: RunState) => bosses(r).filter((b) => b.type === 'gym')[3]
    // Enemigo más fuerte y menos colchón de nivel, en ese orden.
    expect(effectiveEnemyLevel(gym4(hard), 'hard')).toBeGreaterThan(effectiveEnemyLevel(gym4(normal), 'normal'))
    expect(effectiveEnemyLevel(gym4(nuz), 'nuzlocke')).toBeGreaterThan(effectiveEnemyLevel(gym4(hard), 'hard'))
    expect(capBefore(hard, gym4(hard)) - effectiveEnemyLevel(gym4(hard), 'hard'))
      .toBeLessThan(capBefore(normal, gym4(normal)) - effectiveEnemyLevel(gym4(normal), 'normal'))
  })

  it('ninguna casilla de ruta pide más nivel del que el tope permite tener', () => {
    // Incluye los nodos ARRIESGADOS: su extra también escala (antes +4 fijos
    // ponían un salvaje a nv.10 en la capa 4, con el equipo a nv.6).
    for (const diff of ['normal', 'hard', 'nuzlocke'] as Difficulty[]) {
      const run = createRun({ pools: [1], random: false, difficulty: diff, gen: 1, starterId: 1, seed: 11 })
      const bs = bosses(run)
      for (const node of Object.values(run.map.nodes)) {
        if (node.type !== 'battle' && node.type !== 'trainer') continue
        const nextBoss = bs.find((b) => b.layer >= node.layer) ?? bs[bs.length - 1]
        const cap = capBefore(run, nextBoss)
        expect(effectiveEnemyLevel(node, diff)).toBeLessThanOrEqual(cap)
      }
    }
  })
})
