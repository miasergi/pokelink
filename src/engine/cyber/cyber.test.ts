import { describe, it, expect } from 'vitest'
import { RNG } from '@/utils/rng'
import { getSpecies, getMove } from '@/data'
import { createInstance } from '@/engine/team/instance'
import { mergeMeta, type MetaRecord } from '@/persistence/db'
import { buildCarousel, resolveStop, enemyAct, attemptFlee, awardExp, carouselStepMs, maybeRecoverStatus } from './timingBattle'
import { catchChance, resolveCapture } from './capture'
import { createRadar, radarRings, stepForward, turnLeft, turnRight, radarDistance } from './radar'
import {
  createAdventure, getLocations, rollEncounter, applyTrainerVictory, applyDefeat,
  buyShopItem, useCyberItem, dexCatch, saveRng,
} from './cyberEngine'
import {
  buildGymBattle, buildRivalBattle, buildEliteBattle, buildChampionBattle,
  buildMinorTrainer, buildRocketBattle, cyberWildPool, GYM_LEVELS, ELITE_LEVELS, CHAMPION_LEVEL,
} from './trainers'
import { simulateGhostBattle } from './ghost'
import { checkCyberAchievements } from './achievements'
import { CYBER_PARTY_MAX } from './types'

const emptyMeta = (): MetaRecord => ({
  bestRuns: [], totals: { runs: 0, wins: 0, gymsDefeated: 0, pokemonCaught: 0 },
  pokedexSeen: [], pokedexCaught: [], pokedexShiny: [], alias: '', achievements: [],
  regionsWon: [], pet: null,
})

describe('cyber: aventura', () => {
  it('createAdventure: inicial a nivel 3, equipo de 1, dex con el inicial', () => {
    const save = createAdventure(1, 25, 12345)
    expect(save.party).toHaveLength(1)
    expect(save.party[0].level).toBe(3)
    expect(save.party[0].speciesId).toBe(25)
    expect(save.dexSeen).toContain(25)
    expect(save.dexCaught).toContain(25)
    expect(save.items['ball']).toBeGreaterThan(0)
  })

  it('el save sobrevive a un round-trip de serialización (IndexedDB)', () => {
    const save = createAdventure(3, 255, 777)
    const clone = structuredClone(save)
    expect(clone).toEqual(save)
    // El RNG se rehidrata del estado guardado.
    const r1 = saveRng(save).next()
    const r2 = saveRng(clone).next()
    expect(r1).toBe(r2)
  })

  it('getLocations: gating por progreso', () => {
    const save = createAdventure(1, 1, 1)
    let kinds = getLocations(save).map((l) => l.kind)
    expect(kinds).toContain('center')
    expect(kinds).toContain('route')
    expect(kinds).toContain('gym')
    expect(kinds).not.toContain('league')
    expect(kinds).not.toContain('rival')

    save.progress.badges = 2
    kinds = getLocations(save).map((l) => l.kind)
    expect(kinds).toContain('rival') // 2 medallas → 1ª aparición del rival

    save.progress.badges = 8
    save.progress.rivalBeaten = 3
    kinds = getLocations(save).map((l) => l.kind)
    expect(kinds).not.toContain('gym')
    expect(kinds).toContain('league')

    save.progress.championBeaten = true
    kinds = getLocations(save).map((l) => l.kind)
    expect(kinds).not.toContain('league')
  })

  it('rollEncounter devuelve tipos válidos y salvajes de la gen', () => {
    const save = createAdventure(2, 152, 42)
    const rng = new RNG(42)
    for (let i = 0; i < 50; i++) {
      const enc = rollEncounter(save, 0, rng)
      expect(['wild', 'trainer', 'none']).toContain(enc.type)
      if (enc.type === 'wild') {
        expect(getSpecies(enc.species).generation).toBe(2)
        expect(enc.level).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('victoria de gimnasio/campeón actualiza el progreso', () => {
    const save = createAdventure(1, 4, 9)
    const rng = new RNG(9)
    const gym = buildGymBattle(1, 0, rng)
    expect(applyTrainerVictory(save, gym)).toBe(false)
    expect(save.progress.badges).toBe(1)
    const champ = buildChampionBattle(1, 4, rng)
    expect(applyTrainerVictory(save, champ)).toBe(true)
    expect(save.progress.championBeaten).toBe(true)
  })

  it('derrota: equipo curado, mitad del dinero, al centro', () => {
    const save = createAdventure(1, 7, 5)
    save.money = 1000
    save.party[0].currentHp = 0
    applyDefeat(save)
    expect(save.money).toBe(500)
    expect(save.party[0].currentHp).toBe(save.party[0].stats.hp)
    expect(save.phase).toBe('center')
  })

  it('tienda y objetos', () => {
    const save = createAdventure(1, 1, 3)
    save.money = 10000
    expect(buyShopItem(save, 'potion')).toBe(true)
    const mon = save.party[0]
    mon.currentHp = 1
    expect(useCyberItem(save, 'potion', mon)).toBeTruthy()
    expect(mon.currentHp).toBeGreaterThan(1)
    // revivir solo funciona con 0 PS
    save.items['revive'] = 1
    expect(useCyberItem(save, 'revive', mon)).toBeNull()
  })

  it('dexCatch registra especie base y no duplica', () => {
    const save = createAdventure(1, 1, 3)
    dexCatch(save, 16)
    dexCatch(save, 16)
    expect(save.dexCaught.filter((x) => x === 16)).toHaveLength(1)
  })
})

describe('cyber: radar', () => {
  it('nunca empieza encima y los anillos crecen al acercarse', () => {
    for (let s = 0; s < 30; s++) {
      const r = createRadar(new RNG(s))
      expect(radarDistance(r)).toBeGreaterThanOrEqual(2)
      expect(radarRings(r)).toBeLessThan(2)
    }
  })

  it('avanzar hacia el blip reduce la distancia', () => {
    let r = createRadar(new RNG(7))
    // Fuerza una posición conocida: al norte.
    r = { ...r, dx: 0, dy: 3, facing: 0 }
    const closer = stepForward(r)
    expect(radarDistance(closer)).toBe(2)
    expect(radarRings({ ...closer, dx: 0, dy: 0 })).toBe(2)
  })

  it('girar mantiene la distancia', () => {
    const r = createRadar(new RNG(11))
    expect(radarDistance(turnLeft(r))).toBe(radarDistance(r))
    expect(radarDistance(turnRight(r))).toBe(radarDistance(r))
  })
})

describe('cyber: combate por timing', () => {
  it('buildCarousel: 8 slots con al menos 1 movimiento; dormido casi todo tristes', () => {
    const rng = new RNG(1)
    const mon = createInstance(25, 20, rng)
    const c = buildCarousel(mon)
    expect(c).toHaveLength(8)
    expect(c.some((s) => s.kind === 'move')).toBe(true)
    expect(c.some((s) => s.kind === 'sad')).toBe(true)

    mon.status = 'slp'
    const asleep = buildCarousel(mon)
    expect(asleep.filter((s) => s.kind === 'sad').length).toBeGreaterThanOrEqual(6)
    expect(asleep.some((s) => s.kind === 'move')).toBe(true) // siempre hay 1 hueco
  })

  it('el carrusel se acelera con las medallas (con suelo)', () => {
    expect(carouselStepMs(0)).toBe(220)
    expect(carouselStepMs(8)).toBeLessThan(carouselStepMs(0))
    expect(carouselStepMs(50)).toBe(120)
  })

  it('parar en cara triste pierde el turno; parar en movimiento hace daño', () => {
    const rng = new RNG(2)
    const atk = createInstance(6, 30, rng) // Charizard
    const def = createInstance(1, 10, rng)
    const sad = resolveStop(atk, def, { kind: 'sad' }, 'perfect', 1, rng)
    expect(sad.playerDamage).toBeUndefined()
    expect(def.currentHp).toBe(def.stats.hp)

    const moveSlot = { kind: 'move' as const, moveId: atk.moves[0].moveId }
    const hit = resolveStop(atk, def, moveSlot, 'perfect', 1, rng)
    // Con nivel 30 vs 10 el daño es seguro salvo fallo de precisión del ataque.
    if (hit.playerDamage != null) expect(def.currentHp).toBeLessThan(def.stats.hp)
    expect(hit.messages.length).toBeGreaterThan(0)
  })

  it('la precisión del stop multiplica el daño (perfect > poor, misma semilla)', () => {
    const mk = () => {
      const rng = new RNG(1234)
      const atk = createInstance(150, 50, rng) // Mewtwo, pega seguro
      const def = createInstance(143, 50, rng) // Snorlax
      return { rng: new RNG(999), atk, def }
    }
    const a = mk()
    const slotA = { kind: 'move' as const, moveId: a.atk.moves[0].moveId }
    resolveStop(a.atk, a.def, slotA, 'perfect', 1, a.rng)
    const dmgPerfect = a.def.stats.hp - a.def.currentHp

    const b = mk()
    const slotB = { kind: 'move' as const, moveId: b.atk.moves[0].moveId }
    resolveStop(b.atk, b.def, slotB, 'poor', 1, b.rng)
    const dmgPoor = b.def.stats.hp - b.def.currentHp

    expect(dmgPerfect).toBeGreaterThan(dmgPoor)
  })

  it('enemyAct hace daño o falla, nunca cura al jugador', () => {
    const rng = new RNG(5)
    const enemy = createInstance(19, 15, rng)
    const player = createInstance(7, 15, rng)
    const before = player.currentHp
    enemyAct(enemy, player, rng)
    expect(player.currentHp).toBeLessThanOrEqual(before)
  })

  it('awardExp sube de nivel y recalcula stats', () => {
    const rng = new RNG(8)
    const winner = createInstance(25, 5, rng)
    const loser = createInstance(149, 60, rng) // mucha exp
    const hpBefore = winner.stats.hp
    const gained = awardExp(winner, loser)
    expect(gained).toBeGreaterThan(0)
    expect(winner.level).toBeGreaterThan(5)
    expect(winner.stats.hp).toBeGreaterThan(hpBefore)
  })

  it('el jugador también se recupera de dormido/congelado (40%)', () => {
    // Regresión: sin esto, slp/frz del jugador duraban para siempre (el
    // enemigo sí se recuperaba vía enemyAct → asimetría).
    const rng = new RNG(21)
    const mon = createInstance(25, 20, rng)
    mon.status = 'slp'
    let recovered = false
    for (let i = 0; i < 30 && !recovered; i++) {
      recovered = maybeRecoverStatus(mon, rng).length > 0
    }
    expect(recovered).toBe(true)
    expect(mon.status).toBe('none')
    // No toca quemadura/veneno (esos se curan en el Centro).
    mon.status = 'brn'
    for (let i = 0; i < 30; i++) maybeRecoverStatus(mon, rng)
    expect(mon.status).toBe('brn')
  })

  it('huir: probabilidad razonable y determinista por semilla', () => {
    const rng = new RNG(3)
    const fast = createInstance(25, 30, rng)
    const slow = createInstance(143, 30, rng)
    let escapes = 0
    const trials = 200
    const r = new RNG(77)
    for (let i = 0; i < trials; i++) if (attemptFlee(fast, slow, 1, r)) escapes++
    expect(escapes).toBeGreaterThan(trials * 0.5) // rápido + buen machaque escapa casi siempre
  })
})

describe('cyber: captura', () => {
  it('catchChance acotada en [0.02, 0.95] y mejora con menos PS', () => {
    const rng = new RNG(4)
    const mon = createInstance(150, 70, rng) // Mewtwo: catchRate 3
    const sp = getSpecies(150)
    const full = catchChance(mon, sp, 1)
    mon.currentHp = 1
    const low = catchChance(mon, sp, 1)
    expect(full).toBeGreaterThanOrEqual(0.02)
    expect(low).toBeLessThanOrEqual(0.95)
    expect(low).toBeGreaterThan(full)
  })

  it('resolveCapture: o captura o sigue/escapa', () => {
    const rng = new RNG(6)
    const mon = createInstance(10, 3, rng) // Caterpie: fácil
    const sp = getSpecies(10)
    mon.currentHp = 1
    let caught = 0
    for (let i = 0; i < 50; i++) {
      const r = resolveCapture(mon, sp, 1, rng)
      if (r.caught) { caught++; expect(r.escaped).toBe(false) }
    }
    expect(caught).toBeGreaterThan(30) // con 1 PS y buena sacudida cae casi siempre
  })
})

describe('cyber: entrenadores regionales (9 gens)', () => {
  it('gimnasios: equipos ≤3, niveles crecientes, ace al nivel de la curva', () => {
    for (let gen = 1; gen <= 9; gen++) {
      for (let gym = 0; gym < 8; gym++) {
        const t = buildGymBattle(gen, gym, new RNG(gen * 10 + gym))
        expect(t.team.length).toBeGreaterThanOrEqual(1)
        expect(t.team.length).toBeLessThanOrEqual(3)
        const ace = t.team[t.team.length - 1]
        expect(ace.level).toBe(GYM_LEVELS[gym])
        expect(t.name.length).toBeGreaterThan(0)
      }
    }
  })

  it('rival, Alto Mando y campeón para las 9 gens', () => {
    for (let gen = 1; gen <= 9; gen++) {
      const rng = new RNG(gen)
      for (let stage = 0; stage < 3; stage++) {
        const r = buildRivalBattle(gen, stage, 1, rng)
        expect(r.team.length).toBeGreaterThanOrEqual(1)
        expect(r.team.length).toBeLessThanOrEqual(3)
      }
      for (let e = 0; e < 4; e++) {
        const m = buildEliteBattle(gen, e, rng)
        expect(m.team.length).toBeLessThanOrEqual(3)
        expect(m.team[m.team.length - 1].level).toBe(ELITE_LEVELS[e])
      }
      const c = buildChampionBattle(gen, 1, rng)
      expect(c.team.length).toBeLessThanOrEqual(3)
      expect(c.team[c.team.length - 1].level).toBe(CHAMPION_LEVEL)
    }
  })

  it('menores y Team Rocket generan equipos válidos', () => {
    const rng = new RNG(55)
    const minor = buildMinorTrainer(1, 0, rng)
    expect(minor.team.length).toBeGreaterThanOrEqual(1)
    const rocket = buildRocketBattle(1, 4, rng)
    expect(rocket.team).toHaveLength(2)
  })

  it('el pool de salvajes respeta el techo de BST', () => {
    const low = cyberWildPool(1, 0)
    const bst = (id: number) => {
      const b = getSpecies(id).baseStats
      return b.hp + b.atk + b.def + b.spa + b.spd + b.spe
    }
    for (const s of low) expect(bst(s.id)).toBeLessThanOrEqual(320)
    expect(low.length).toBeGreaterThan(5)
  })
})

describe('cyber: meta y logros', () => {
  it('mergeMeta fusiona los campos cyber (unión y máximos)', () => {
    const a = emptyMeta()
    a.cyberDexSeen = [1, 2]
    a.cyberDexCaught = [1]
    a.cyberCompleted = [1]
    a.cyberTrades = 2
    const b = emptyMeta()
    b.cyberDexSeen = [2, 3]
    b.cyberDexCaught = [3]
    b.cyberCompleted = [2]
    b.cyberTrades = 1
    b.cyberGhostWins = 4
    const m = mergeMeta(a, b)
    expect(m.cyberDexSeen?.sort()).toEqual([1, 2, 3])
    expect(m.cyberDexCaught?.sort()).toEqual([1, 3])
    expect(m.cyberCompleted?.sort()).toEqual([1, 2])
    expect(m.cyberTrades).toBe(2)
    expect(m.cyberGhostWins).toBe(4)
  })

  it('checkCyberAchievements: dispara y no duplica', () => {
    const meta = emptyMeta()
    meta.cyberCompleted = [1]
    meta.cyberDexCaught = Array.from({ length: 50 }, (_, i) => i + 1)
    meta.cyberTrades = 1
    expect(checkCyberAchievements(meta).sort()).toEqual(['cyber_champion', 'cyber_dex50', 'cyber_online'])
    meta.achievements = ['cyber_champion', 'cyber_dex50', 'cyber_online']
    expect(checkCyberAchievements(meta)).toEqual([])
  })

  it('el equipo nunca supera el máximo del juguete', () => {
    expect(CYBER_PARTY_MAX).toBe(3)
  })
})

describe('cyber: combate fantasma (online)', () => {
  it('determinista: misma semilla ⇒ mismo resultado y mismo log', () => {
    const rng = new RNG(100)
    const mine = [createInstance(6, 40, rng), createInstance(9, 38, rng), createInstance(3, 36, rng)]
    const ghost = [createInstance(65, 39, rng), createInstance(112, 37, rng)]
    const a = simulateGhostBattle(mine, ghost, 4242)
    const b = simulateGhostBattle(mine, ghost, 4242)
    expect(a.won).toBe(b.won)
    expect(a.log).toEqual(b.log)
    // Y NO muta los equipos reales.
    expect(mine[0].currentHp).toBe(mine[0].stats.hp)
  })

  it('un equipo claramente superior gana', () => {
    const rng = new RNG(200)
    const strong = [createInstance(150, 70, rng), createInstance(149, 68, rng), createInstance(6, 66, rng)]
    const weak = [createInstance(10, 5, rng)]
    const r = simulateGhostBattle(strong, weak, 1)
    expect(r.won).toBe(true)
  })
})

describe('cyber: movimientos válidos', () => {
  it('los movesets sintéticos existen en la BD de movimientos', () => {
    const rng = new RNG(9)
    const mon = createInstance(94, 40, rng) // Gengar
    for (const mv of mon.moves) expect(() => getMove(mv.moveId)).not.toThrow()
  })
})
