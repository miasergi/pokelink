import { describe, it, expect } from 'vitest'
import { typeEffectiveness } from '@/data/typechart'
import { computeStats, levelFromExp, expForLevel } from '@/engine/team/leveling'
import { createInstance } from '@/engine/team/instance'
import { runBattle } from './battleEngine'
import { getSpecies } from '@/data'
import { RNG } from '@/utils/rng'

describe('tabla de tipos', () => {
  it('valores conocidos', () => {
    expect(typeEffectiveness('water', ['fire'])).toBe(2)
    expect(typeEffectiveness('fire', ['water'])).toBe(0.5)
    expect(typeEffectiveness('electric', ['ground'])).toBe(0)
    expect(typeEffectiveness('ghost', ['normal'])).toBe(0)
    expect(typeEffectiveness('fighting', ['normal'])).toBe(2)
    // dobles tipos: planta vs agua/tierra = 2 * 2 = 4
    expect(typeEffectiveness('grass', ['water', 'ground'])).toBe(4)
    // fuego vs agua/roca = 0.5 * 0.5 = 0.25
    expect(typeEffectiveness('fire', ['water', 'rock'])).toBe(0.25)
    // ice vs dragon/flying = 2 * 2 = 4
    expect(typeEffectiveness('ice', ['dragon', 'flying'])).toBe(4)
  })
})

describe('stats y niveles', () => {
  it('exp <-> nivel', () => {
    expect(expForLevel(10)).toBe(1000)
    expect(levelFromExp(1000)).toBe(10)
    expect(levelFromExp(1331)).toBe(11)
  })

  it('computeStats produce HP coherente para Charizard Nv50', () => {
    const charizard = getSpecies(6)
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
    const stats = computeStats(charizard.baseStats, ivs, 50)
    // HP a Nv50 con IV 31 ronda 153
    expect(stats.hp).toBeGreaterThan(140)
    expect(stats.hp).toBeLessThan(165)
    expect(stats.spa).toBeGreaterThan(100)
  })
})

describe('motor de combate', () => {
  it('resuelve un combate y produce ganador + eventos', () => {
    const rng = new RNG(12345)
    const playerTeam = [
      createInstance(6, 50, rng), // Charizard
      createInstance(9, 50, rng), // Blastoise
    ]
    const enemyTeam = [
      createInstance(3, 50, rng), // Venusaur
      createInstance(65, 48, rng), // Alakazam
    ]
    const result = runBattle({ playerTeam, enemyTeam, seed: 999 })
    expect(['player', 'enemy']).toContain(result.winner)
    expect(result.events.length).toBeGreaterThan(3)
    expect(result.events[0].kind).toBe('start')
    expect(result.events[result.events.length - 1]).toMatchObject({ kind: 'end' })
    // El equipo del jugador devuelto tiene el mismo tamaño
    expect(result.playerTeam).toHaveLength(2)
  })

  it('es determinista con la misma semilla', () => {
    const build = () => {
      const rng = new RNG(7)
      return [createInstance(25, 30, rng), createInstance(6, 30, rng)]
    }
    const r1 = runBattle({ playerTeam: build(), enemyTeam: build(), seed: 42 })
    const r2 = runBattle({ playerTeam: build(), enemyTeam: build(), seed: 42 })
    expect(r1.winner).toBe(r2.winner)
    expect(r1.events.length).toBe(r2.events.length)
  })

  it('no entra en bucle infinito (termina antes del cap)', () => {
    const rng = new RNG(1)
    const r = runBattle({
      playerTeam: [createInstance(143, 50, rng)], // Snorlax
      enemyTeam: [createInstance(143, 50, rng)],
      seed: 5,
    })
    expect(r.events.filter((e) => e.kind === 'end')).toHaveLength(1)
  })
})
