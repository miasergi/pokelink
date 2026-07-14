import { describe, it, expect } from 'vitest'
import { RNG } from '@/utils/rng'
import { getSpecies, getMove } from '@/data'
import { createInstance } from '@/engine/team/instance'
import { mergeMeta, type MetaRecord } from '@/persistence/db'
import {
  buildReel, firstToPick, enemyReelStop, performAttack, endOfTurn, maybeRecoverStatus,
  attemptFlee, awardExp, reelStepMs, REEL_SIZE, PRECISION_MULT,
} from './reelBattle'
import { buildCyberFrames, CYBER_DURATION } from './cyberFrames'
import { catchChance, resolveCapture } from './capture'
import {
  createExplore, rings, bearing, distance, turn, stepForward, canEngage, expired, MAX_STEPS,
} from './explore'
import {
  createAdventure, getLocations, rollEncounter, applyTrainerVictory, applyDefeat,
  buyShopItem, useCyberItem, dexCatch, saveRng, visibleSecrets, secretLegendary,
  markSecretCaught,
} from './cyberEngine'
import {
  buildGymBattle, buildRivalBattle, buildEliteBattle, buildChampionBattle,
  buildMinorTrainer, buildRocketBattle, cyberWildPool, GYM_LEVELS, ELITE_LEVELS, CHAMPION_LEVEL,
} from './trainers'
import { simulateGhostBattle } from './ghost'
import { checkCyberAchievements } from './achievements'
import { CYBER_PARTY_MAX, type CyberEvent } from './types'

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
    expect(save.dexCaught).toContain(25)
    expect(save.items['ball']).toBeGreaterThan(0)
  })

  it('el save sobrevive a un round-trip de serialización', () => {
    const save = createAdventure(3, 255, 777)
    const clone = structuredClone(save)
    expect(clone).toEqual(save)
    expect(saveRng(save).next()).toBe(saveRng(clone).next())
  })

  it('getLocations: gating por progreso', () => {
    const save = createAdventure(1, 1, 1)
    let kinds = getLocations(save).map((l) => l.kind)
    expect(kinds).toContain('center')
    expect(kinds).toContain('route')
    expect(kinds).toContain('gym')
    expect(kinds).not.toContain('league')
    expect(kinds).not.toContain('secret')

    save.progress.badges = 2
    expect(getLocations(save).map((l) => l.kind)).toContain('rival')

    save.progress.badges = 8
    save.progress.rivalBeaten = 3
    kinds = getLocations(save).map((l) => l.kind)
    expect(kinds).not.toContain('gym')
    expect(kinds).toContain('league')
  })

  it('victoria de gimnasio/campeón actualiza el progreso', () => {
    const save = createAdventure(1, 4, 9)
    const rng = new RNG(9)
    expect(applyTrainerVictory(save, buildGymBattle(1, 0, rng))).toBe(false)
    expect(save.progress.badges).toBe(1)
    expect(applyTrainerVictory(save, buildChampionBattle(1, 4, rng))).toBe(true)
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
    save.items['revive'] = 1
    expect(useCyberItem(save, 'revive', mon)).toBeNull() // solo con 0 PS
  })

  it('rollEncounter devuelve salvajes de la gen elegida', () => {
    const save = createAdventure(2, 152, 42)
    const rng = new RNG(42)
    for (let i = 0; i < 40; i++) {
      const enc = rollEncounter(save, 0, rng)
      expect(['wild', 'trainer', 'none']).toContain(enc.type)
      if (enc.type === 'wild') expect(getSpecies(enc.species).generation).toBe(2)
    }
  })

  it('dexCatch no duplica', () => {
    const save = createAdventure(1, 1, 3)
    dexCatch(save, 16)
    dexCatch(save, 16)
    expect(save.dexCaught.filter((x) => x === 16)).toHaveLength(1)
  })
})

describe('cyber: zonas secretas y legendarios (fiel al juguete)', () => {
  it('no hay zonas secretas antes de las 8 medallas', () => {
    const save = createAdventure(1, 1, 4)
    save.progress.badges = 7
    expect(visibleSecrets(save)).toHaveLength(0)
  })

  it('con 8 medallas se abren DOS; la tercera solo tras capturar una', () => {
    const save = createAdventure(1, 1, 4)
    save.progress.badges = 8
    expect(visibleSecrets(save)).toEqual([0, 1])

    markSecretCaught(save, 0)
    // La capturada desaparece y aparece la tercera (guiño a Latios/Latias).
    expect(visibleSecrets(save)).toEqual([1, 2])

    markSecretCaught(save, 1)
    markSecretCaught(save, 2)
    expect(visibleSecrets(save)).toHaveLength(0)
  })

  it('el legendario de cada zona es un legendario real y estable por semilla', () => {
    const save = createAdventure(1, 1, 99)
    for (let i = 0; i < 3; i++) {
      const id = secretLegendary(save, i)
      expect(getSpecies(id).legendary).toBe(true)
      expect(secretLegendary(save, i)).toBe(id) // estable
    }
  })

  it('las zonas secretas aparecen en el mapa con 8 medallas', () => {
    const save = createAdventure(1, 1, 4)
    save.progress.badges = 8
    const secrets = getLocations(save).filter((l) => l.kind === 'secret')
    expect(secrets).toHaveLength(2)
    expect(secrets[0].terrain).toBe('secret')
  })
})

describe('cyber: combate de DOBLE RODILLO', () => {
  it('buildReel: tira de 12 con movimientos y caras tristes', () => {
    const rng = new RNG(1)
    const mon = createInstance(25, 20, rng)
    const reel = buildReel(mon)
    expect(reel).toHaveLength(REEL_SIZE)
    expect(reel.some((s) => s.kind === 'move')).toBe(true)
    expect(reel.some((s) => s.kind === 'sad')).toBe(true)
  })

  it('los estados alterados METEN MÁS caras tristes (y se ven)', () => {
    const rng = new RNG(1)
    const mon = createInstance(25, 20, rng)
    const sane = buildReel(mon).filter((s) => s.kind === 'sad').length
    mon.status = 'par'
    const par = buildReel(mon).filter((s) => s.kind === 'sad').length
    mon.status = 'slp'
    const slp = buildReel(mon).filter((s) => s.kind === 'sad').length
    expect(par).toBeGreaterThan(sane)
    expect(slp).toBeGreaterThan(par)
    // Dormido deja la tira casi inservible, pero SIEMPRE queda un hueco.
    expect(buildReel(mon).some((s) => s.kind === 'move')).toBe(true)
  })

  it('el orden de elección lo decide la VELOCIDAD', () => {
    const rng = new RNG(3)
    const fast = createInstance(25, 30, rng)  // Pikachu
    const slow = createInstance(143, 30, rng) // Snorlax
    expect(firstToPick(fast, slow, rng)).toBe('player')
    expect(firstToPick(slow, fast, rng)).toBe('enemy')
  })

  it('el rodillo del rival para en un símbolo válido de SU tira', () => {
    const rng = new RNG(5)
    const enemy = createInstance(6, 40, rng)
    const player = createInstance(9, 40, rng)
    const reel = buildReel(enemy)
    for (let i = 0; i < 25; i++) {
      const idx = enemyReelStop(enemy, player, reel, rng)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(reel.length)
    }
  })

  it('el rodillo se acelera con las medallas (con suelo)', () => {
    expect(reelStepMs(0)).toBe(200)
    expect(reelStepMs(8)).toBeLessThan(reelStepMs(0))
    expect(reelStepMs(50)).toBe(110)
  })

  it('parar en CARA TRISTE = fallo (no hace daño)', () => {
    const rng = new RNG(2)
    const atk = createInstance(6, 30, rng)
    const def = createInstance(1, 10, rng)
    const events: CyberEvent[] = []
    performAttack('player', atk, def, { kind: 'sad' }, 1, rng, events)
    expect(def.currentHp).toBe(def.stats.hp)
    expect(events[0].kind).toBe('sad')
  })

  it('parar en un movimiento ataca y emite eventos de daño', () => {
    const rng = new RNG(21)
    const atk = createInstance(150, 50, rng) // Mewtwo
    const def = createInstance(143, 50, rng) // Snorlax
    const events: CyberEvent[] = []
    performAttack('player', atk, def, { kind: 'move', moveId: atk.moves[0].moveId }, 1, rng, events)
    expect(events[0].kind).toBe('move')
    const dmg = events.find((e) => e.kind === 'damage')
    if (dmg && dmg.kind === 'damage') {
      expect(dmg.side).toBe('enemy') // el daño lo recibe el OTRO lado
      expect(dmg.amount).toBeGreaterThan(0)
      expect(def.currentHp).toBeLessThan(def.stats.hp)
    }
  })

  it('la precisión del stop multiplica el daño (perfecto > flojo)', () => {
    const mk = () => {
      const seed = new RNG(1234)
      return { atk: createInstance(150, 50, seed), def: createInstance(143, 50, seed), rng: new RNG(999) }
    }
    const a = mk()
    performAttack('player', a.atk, a.def, { kind: 'move', moveId: a.atk.moves[0].moveId }, PRECISION_MULT.perfect, a.rng, [])
    const perfect = a.def.stats.hp - a.def.currentHp

    const b = mk()
    performAttack('player', b.atk, b.def, { kind: 'move', moveId: b.atk.moves[0].moveId }, PRECISION_MULT.poor, b.rng, [])
    const poor = b.def.stats.hp - b.def.currentHp

    expect(perfect).toBeGreaterThan(poor)
  })

  it('el jugador se recupera de dormido/congelado (40%), igual que el rival', () => {
    const rng = new RNG(21)
    const mon = createInstance(25, 20, rng)
    mon.status = 'slp'
    const events: CyberEvent[] = []
    for (let i = 0; i < 40 && events.length === 0; i++) {
      maybeRecoverStatus(mon, 'player', rng, events)
    }
    expect(mon.status).toBe('none')
    expect(events.some((e) => e.kind === 'recover')).toBe(true)
    // La quemadura NO se cura sola (eso es del Centro).
    mon.status = 'brn'
    for (let i = 0; i < 30; i++) maybeRecoverStatus(mon, 'player', rng, [])
    expect(mon.status).toBe('brn')
  })

  it('daño residual de veneno/quemadura', () => {
    const rng = new RNG(8)
    const mon = createInstance(143, 40, rng)
    mon.status = 'psn'
    const before = mon.currentHp
    const events: CyberEvent[] = []
    endOfTurn(mon, 'player', events)
    expect(mon.currentHp).toBeLessThan(before)
    expect(events[0].kind).toBe('statusDamage')
  })

  it('awardExp sube de nivel y recalcula stats', () => {
    const rng = new RNG(8)
    const winner = createInstance(25, 5, rng)
    const loser = createInstance(149, 60, rng)
    const hpBefore = winner.stats.hp
    expect(awardExp(winner, loser)).toBeGreaterThan(0)
    expect(winner.stats.hp).toBeGreaterThan(hpBefore)
  })

  it('huir: rápido + buen machaque escapa casi siempre', () => {
    const rng = new RNG(3)
    const fast = createInstance(25, 30, rng)
    const slow = createInstance(143, 30, rng)
    const r = new RNG(77)
    let escapes = 0
    for (let i = 0; i < 200; i++) if (attemptFlee(fast, slow, 1, r)) escapes++
    expect(escapes).toBeGreaterThan(100)
  })
})

describe('cyber: fotogramas de animación', () => {
  it('cada evento produce un fotograma y los PS BAJAN progresivamente', () => {
    const events: CyberEvent[] = [
      { kind: 'intro', text: '¡Salvaje!' },
      { kind: 'move', side: 'player', moveName: 'Ascuas', moveType: 'fire' },
      { kind: 'damage', side: 'enemy', amount: 10, crit: false, effectiveness: 2, moveType: 'fire', hp: 30 },
      { kind: 'damage', side: 'enemy', amount: 10, crit: true, effectiveness: 1, moveType: 'fire', hp: 20 },
      { kind: 'faint', side: 'enemy', text: '¡Cayó!' },
    ]
    const frames = buildCyberFrames(events, {
      hp: { player: 50, enemy: 40 },
      status: { player: 'none', enemy: 'none' },
    })
    expect(frames).toHaveLength(events.length)
    expect(frames[2].hp.enemy).toBe(30)
    expect(frames[3].hp.enemy).toBe(20)
    expect(frames[4].hp.enemy).toBe(0)      // el debilitado deja la barra a 0
    expect(frames[2].fx?.amount).toBe(10)   // número flotante
    expect(frames[3].flash).toBeTruthy()    // destello del crítico
    expect(frames[3].sound).toBe('crit')
    expect(frames[4].anim.enemy).toBe('faint')
    expect(frames[1].acting?.side).toBe('player') // embestida del atacante
  })

  it('todos los tipos de evento tienen duración definida', () => {
    const kinds: CyberEvent['kind'][] = [
      'intro', 'move', 'sad', 'miss', 'noEffect', 'damage', 'status', 'statusDamage',
      'recover', 'faint', 'heal', 'levelUp', 'sendOut', 'throwBall', 'caught', 'broke',
      'message', 'end',
    ]
    for (const k of kinds) expect(CYBER_DURATION[k]).toBeGreaterThan(0)
  })

  it('la captura anima la Poké Ball', () => {
    const frames = buildCyberFrames(
      [{ kind: 'throwBall', text: '¡Ve!' }, { kind: 'caught', text: '¡Atrapado!' }],
      { hp: { player: 10, enemy: 5 }, status: { player: 'none', enemy: 'none' } },
    )
    expect(frames[0].ball).toBe('throw')
    expect(frames[1].ball).toBe('caught')
  })
})

describe('cyber: exploración en 1ª persona', () => {
  it('empieza lejos (0 anillos) y nunca encima', () => {
    for (let s = 0; s < 30; s++) {
      const e = createExplore(new RNG(s))
      expect(distance(e)).toBeGreaterThan(3)
      expect(rings(e)).toBe(0)
      expect(canEngage(e)).toBe(false)
    }
  })

  it('avanzar HACIA el objetivo acerca; de espaldas, aleja', () => {
    const e = createExplore(new RNG(11))
    // Apunta al objetivo: girar el rumbo hasta que la marcación sea ~0.
    const aimed = turn(e, bearing(e))
    expect(Math.abs(bearing(aimed))).toBeLessThan(1)
    expect(distance(stepForward(aimed))).toBeLessThan(distance(aimed))
    // De espaldas
    const away = turn(aimed, 180)
    expect(distance(stepForward(away))).toBeGreaterThan(distance(away))
  })

  it('caminando de cara se llega a 2 anillos y se puede combatir', () => {
    let e = createExplore(new RNG(4))
    for (let i = 0; i < MAX_STEPS && !canEngage(e); i++) {
      e = turn(e, bearing(e))  // reorienta
      e = stepForward(e)
    }
    expect(canEngage(e)).toBe(true)
    expect(rings(e)).toBe(2)
  })

  it('los anillos crecen al acercarse', () => {
    let e = createExplore(new RNG(9))
    const seen = new Set<number>()
    for (let i = 0; i < MAX_STEPS && !canEngage(e); i++) {
      e = turn(e, bearing(e))
      e = stepForward(e)
      seen.add(rings(e))
    }
    expect(seen.has(1)).toBe(true) // pasa por «cerca» antes de «encima»
    expect(rings(e)).toBe(2)
  })

  it('si te quedas sin pasos sin llegar, el Pokémon se va', () => {
    let e = createExplore(new RNG(2))
    const away = turn(e, bearing(e) + 180) // camina justo al revés
    e = away
    for (let i = 0; i < MAX_STEPS; i++) e = stepForward(e)
    expect(expired(e)).toBe(true)
  })
})

describe('cyber: captura', () => {
  it('catchChance acotada y mejora con menos PS', () => {
    const rng = new RNG(4)
    const mon = createInstance(150, 70, rng)
    const sp = getSpecies(150)
    const full = catchChance(mon, sp, 1)
    mon.currentHp = 1
    const low = catchChance(mon, sp, 1)
    expect(full).toBeGreaterThanOrEqual(0.02)
    expect(low).toBeLessThanOrEqual(0.95)
    expect(low).toBeGreaterThan(full)
  })

  it('un salvaje débil a 1 PS cae casi siempre', () => {
    const rng = new RNG(6)
    const mon = createInstance(10, 3, rng)
    mon.currentHp = 1
    let caught = 0
    for (let i = 0; i < 50; i++) if (resolveCapture(mon, getSpecies(10), 1, rng).caught) caught++
    expect(caught).toBeGreaterThan(30)
  })
})

describe('cyber: entrenadores regionales (9 gens)', () => {
  it('gimnasios: equipos ≤3 y ace en la curva', () => {
    for (let gen = 1; gen <= 9; gen++) {
      for (let gym = 0; gym < 8; gym++) {
        const t = buildGymBattle(gen, gym, new RNG(gen * 10 + gym))
        expect(t.team.length).toBeGreaterThanOrEqual(1)
        expect(t.team.length).toBeLessThanOrEqual(3)
        expect(t.team[t.team.length - 1].level).toBe(GYM_LEVELS[gym])
      }
    }
  })

  it('rival, Alto Mando y campeón para las 9 gens', () => {
    for (let gen = 1; gen <= 9; gen++) {
      const rng = new RNG(gen)
      for (let s = 0; s < 3; s++) expect(buildRivalBattle(gen, s, 1, rng).team.length).toBeLessThanOrEqual(3)
      for (let e = 0; e < 4; e++) {
        const m = buildEliteBattle(gen, e, rng)
        expect(m.team[m.team.length - 1].level).toBe(ELITE_LEVELS[e])
      }
      expect(buildChampionBattle(gen, 1, rng).team[0].level).toBeLessThanOrEqual(CHAMPION_LEVEL)
    }
  })

  it('menores y Team Rocket generan equipos válidos', () => {
    const rng = new RNG(55)
    expect(buildMinorTrainer(1, 0, rng).team.length).toBeGreaterThanOrEqual(1)
    expect(buildRocketBattle(1, 4, rng).team).toHaveLength(2)
  })

  it('el pool de salvajes respeta el techo de BST', () => {
    const low = cyberWildPool(1, 0)
    const bst = (id: number) => {
      const b = getSpecies(id).baseStats
      return b.hp + b.atk + b.def + b.spa + b.spd + b.spe
    }
    for (const s of low) expect(bst(s.id)).toBeLessThanOrEqual(320)
  })
})

describe('cyber: meta y logros', () => {
  it('mergeMeta fusiona los campos cyber', () => {
    const a = emptyMeta()
    a.cyberDexSeen = [1, 2]; a.cyberCompleted = [1]; a.cyberTrades = 2
    const b = emptyMeta()
    b.cyberDexSeen = [2, 3]; b.cyberCompleted = [2]; b.cyberGhostWins = 4
    const m = mergeMeta(a, b)
    expect(m.cyberDexSeen?.sort()).toEqual([1, 2, 3])
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

  it('el equipo nunca supera el máximo del juguete (3)', () => {
    expect(CYBER_PARTY_MAX).toBe(3)
  })
})

describe('cyber: combate fantasma (online)', () => {
  it('determinista: misma semilla ⇒ mismo resultado', () => {
    const rng = new RNG(100)
    const mine = [createInstance(6, 40, rng), createInstance(9, 38, rng)]
    const ghost = [createInstance(65, 39, rng), createInstance(112, 37, rng)]
    const a = simulateGhostBattle(mine, ghost, 4242)
    const b = simulateGhostBattle(mine, ghost, 4242)
    expect(a.won).toBe(b.won)
    expect(a.log).toEqual(b.log)
    expect(mine[0].currentHp).toBe(mine[0].stats.hp) // no muta tu equipo
  })

  it('un equipo superior gana', () => {
    const rng = new RNG(200)
    const strong = [createInstance(150, 70, rng), createInstance(149, 68, rng)]
    const weak = [createInstance(10, 5, rng)]
    expect(simulateGhostBattle(strong, weak, 1).won).toBe(true)
  })
})

describe('cyber: partida completa (integración del bucle real)', () => {
  it('un combate de doble rodillo se juega hasta el final y termina', () => {
    const rng = new RNG(31)
    const player = createInstance(6, 30, rng)   // Charizard
    const enemy = createInstance(9, 26, rng)    // Blastoise
    const first = firstToPick(player, enemy, rng)
    expect(['player', 'enemy']).toContain(first)

    let turns = 0
    const allEvents: CyberEvent[] = []
    while (player.currentHp > 0 && enemy.currentHp > 0 && turns++ < 60) {
      const pReel = buildReel(player)
      const eReel = buildReel(enemy)
      // El jugador "para" su rodillo en un símbolo cualquiera; el rival en el suyo.
      const pSlot = pReel[turns % pReel.length]
      const eSlot = eReel[enemyReelStop(enemy, player, eReel, rng)]

      const events: CyberEvent[] = []
      const order = first === 'player' ? ['player', 'enemy'] as const : ['enemy', 'player'] as const
      for (const side of order) {
        if (player.currentHp <= 0 || enemy.currentHp <= 0) break
        if (side === 'player') performAttack('player', player, enemy, pSlot, PRECISION_MULT.good, rng, events)
        else performAttack('enemy', enemy, player, eSlot, 1, rng, events)
      }
      if (player.currentHp > 0 && enemy.currentHp > 0) {
        endOfTurn(player, 'player', events)
        endOfTurn(enemy, 'enemy', events)
      }
      allEvents.push(...events)

      // Cada turno debe poder animarse sin romperse.
      const frames = buildCyberFrames(events, {
        hp: { player: player.stats.hp, enemy: enemy.stats.hp },
        status: { player: 'none', enemy: 'none' },
      })
      expect(frames.length).toBe(events.length)
    }

    // El combate TERMINA (no hay bucles infinitos) con un ganador.
    expect(turns).toBeLessThan(60)
    expect(player.currentHp <= 0 || enemy.currentHp <= 0).toBe(true)
    expect(allEvents.some((e) => e.kind === 'faint')).toBe(true)
  })

  it('exploración completa: girar, avanzar, llegar y combatir', () => {
    const rng = new RNG(77)
    const save = createAdventure(1, 4, 77)
    // Encuentro en el área 0.
    let found: number | null = null
    for (let i = 0; i < 30 && found == null; i++) {
      const enc = rollEncounter(save, 0, rng)
      if (enc.type === 'wild') found = enc.species
    }
    expect(found).not.toBeNull()

    // Caminas guiándote por el radar hasta tenerlo encima.
    let e = createExplore(rng)
    let steps = 0
    while (!canEngage(e) && steps++ < MAX_STEPS) {
      e = turn(e, bearing(e))
      e = stepForward(e)
    }
    expect(canEngage(e)).toBe(true)
    expect(rings(e)).toBe(2)
  })
})

describe('cyber: datos', () => {
  it('los movesets sintéticos existen en la BD', () => {
    const rng = new RNG(9)
    const mon = createInstance(94, 40, rng)
    for (const mv of mon.moves) expect(() => getMove(mv.moveId)).not.toThrow()
  })
})
