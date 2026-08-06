import { describe, it, expect } from 'vitest'
import { createRun, levelCap } from './runEngine'
import { effectiveEnemyLevel, enemyLevelBonus } from './difficulty'
import { getSpecies } from '@/data'
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
    // Nuzlocke usa a propósito la MISMA curva de combate que Difícil: lo que lo
    // hace más duro es la muerte permanente y el número de vidas, no unos
    // enemigos más altos. Por eso aquí se compara con ">=" y no con ">".
    expect(effectiveEnemyLevel(gym4(nuz), 'nuzlocke')).toBeGreaterThanOrEqual(effectiveEnemyLevel(gym4(hard), 'hard'))

    // Colchón = cuánto puedes superar al AS del jefe. Tiene que MENGUAR al subir
    // de dificultad. Estuvo aplanado (+5/+2/+0 con extras que se cancelaban:
    // las tres daban el mismo tope absoluto y en Difícil ibas +2 sobre el as).
    const slack = (r: RunState, d: Difficulty) => capBefore(r, gym4(r)) - effectiveEnemyLevel(gym4(r), d)
    const sNormal = slack(normal, 'normal')
    const sHard = slack(hard, 'hard')
    const sNuz = slack(nuz, 'nuzlocke')
    expect(sNormal).toBeGreaterThan(sHard)
    expect(sHard).toBeGreaterThanOrEqual(sNuz) // Nuzlocke iguala a Difícil
    // En Difícil, como mucho IGUALAS al as: nunca por encima.
    expect(sHard).toBeLessThanOrEqual(0)
  })

  it('en Difícil los acompañantes del jefe son SIEMPRE de su tipo', () => {
    const hard = createRun({ pools: [1], random: false, difficulty: 'hard', gen: 1, starterId: 1, seed: 7 })
    const teamOf = (n: MapNode) => (n.content.kind === 'trainer' ? n.content.team : [])

    for (const b of bosses(hard)) {
      if (b.content.kind !== 'trainer') continue
      const specialty = b.content.trainer.specialtyType
      if (!specialty) continue // el Campeón no tiene especialidad: lleva de todo
      const t = teamOf(b)
      // El as histórico cierra el equipo; los añadidos van delante y TIENEN que
      // ser del tipo del líder. Antes, si la región tenía pocas especies de ese
      // tipo, se caía al pool general y a Lance le salían Pokémon sin relación
      // con Dragón. Nunca más: si no hay de su tipo, se rellena menos.
      const filler = t.slice(0, t.length - b.content.trainer.team.length)
      for (const m of filler) {
        const types = getSpecies(m.speciesId).types
        expect(types, `${b.content.trainer.name} (${specialty}) lleva ${getSpecies(m.speciesId).displayName}`)
          .toContain(specialty)
      }
      // Abanico apretado: la media del equipo no puede quedar muy por debajo
      // de su as, o tu equipo (pegado al tope) los supera a casi todos.
      const ace = Math.max(...t.map((m) => m.level))
      const avg = t.reduce((a, m) => a + m.level, 0) / t.length
      expect(ace - avg).toBeLessThanOrEqual(3)
    }
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
