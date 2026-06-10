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

  it('tipo Sonoro — ataque', () => {
    expect(typeEffectiveness('sonoro', ['psychic'])).toBe(2)
    expect(typeEffectiveness('sonoro', ['ice'])).toBe(2)
    expect(typeEffectiveness('sonoro', ['water'])).toBe(2)
    expect(typeEffectiveness('sonoro', ['flying'])).toBe(0.5)
    expect(typeEffectiveness('sonoro', ['fairy'])).toBe(0.5)
    expect(typeEffectiveness('sonoro', ['steel'])).toBe(0.5)
    expect(typeEffectiveness('sonoro', ['ground'])).toBe(0)
    expect(typeEffectiveness('sonoro', ['normal'])).toBe(1)
  })

  it('tipo Sonoro — defensa', () => {
    expect(typeEffectiveness('normal', ['sonoro'])).toBe(2)
    expect(typeEffectiveness('steel', ['sonoro'])).toBe(2)
    expect(typeEffectiveness('rock', ['sonoro'])).toBe(2)
    expect(typeEffectiveness('flying', ['sonoro'])).toBe(0.5)
    expect(typeEffectiveness('fairy', ['sonoro'])).toBe(0.5)
    expect(typeEffectiveness('water', ['sonoro'])).toBe(1)
    // Sonoro vs Sonoro = neutro
    expect(typeEffectiveness('sonoro', ['sonoro'])).toBe(1)
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

  it('Baya Zidra: cura el 50% al caer a media vida, solo una vez, y no se gasta', () => {
    const rng = new RNG(2)
    const holder = createInstance(143, 50, rng) // Snorlax tanque
    holder.heldItemId = 'sitrus-berry'
    const r = runBattle({
      playerTeam: [holder],
      enemyTeam: [createInstance(68, 52, rng)], // Machamp (pega fuerte)
      seed: 9,
    })
    const berryHeals = r.events.filter((e) => e.kind === 'message' && e.text.includes('Baya Zidra'))
    expect(berryHeals.length).toBeLessThanOrEqual(1)
    // El objeto sigue equipado al terminar (no se consume).
    expect(r.playerTeam[0].heldItemId).toBe('sitrus-berry')
    // Si llegó a activarse, hubo un heal de ~50% de los PS máximos justo después.
    if (berryHeals.length === 1) {
      const idx = r.events.indexOf(berryHeals[0])
      const heal = r.events[idx + 1]
      expect(heal).toMatchObject({ kind: 'heal', uid: holder.uid })
    }
  })

  it('Vidasfera: el portador pierde PS al atacar (recoil del 10%)', () => {
    const rng = new RNG(3)
    const holder = createInstance(6, 50, rng) // Charizard
    holder.heldItemId = 'life-orb'
    const r = runBattle({
      playerTeam: [holder],
      enemyTeam: [createInstance(143, 50, rng)],
      seed: 11,
    })
    // Algún evento de daño al propio portador (recoil de la Vidasfera).
    const selfDamage = r.events.some((e) => e.kind === 'damage' && e.side === 'player' && e.uid === holder.uid)
    expect(selfDamage).toBe(true)
  })
})
