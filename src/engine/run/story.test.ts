import { describe, it, expect } from 'vitest'
import { createRun, resolveTrade, catchPokemon } from './runEngine'
import { generateStoryMap, applySonoroGene } from './storyMap'
import { applyStoryChapterRewards } from './storyRewards'
import { createInstance } from '@/engine/team/instance'
import { monTypes } from '@/engine/team/leveling'
import { getMove, getSpecies } from '@/data'
import { typeEffectiveness } from '@/data/typechart'
import { RNG } from '@/utils/rng'

describe('Modo Historia — Capítulo 1', () => {
  it('createRun(story:1) crea una run del capítulo con su región', () => {
    const run = createRun({ gen: 1, pools: [1], random: false, starterId: 4, difficulty: 'normal', story: 1, seed: 123 })
    expect(run.story).toBe(1)
    expect(run.region).toBe('El Archipiélago de Niebla')
    expect(run.party).toHaveLength(1)
    expect(run.party[0].speciesId).toBe(4)
  })

  it('el mapa termina en un único jefe (El Capitán, tipo champion)', () => {
    const { map } = generateStoryMap(1, 4, new RNG(7), 'normal')
    const lastLayer = map.layers[map.layers.length - 1]
    expect(lastLayer).toHaveLength(1)
    const boss = map.nodes[lastLayer[0]]
    expect(boss.type).toBe('champion')
    expect(boss.content.kind).toBe('trainer')
    if (boss.content.kind === 'trainer') {
      expect(boss.content.trainer.name).toBe('El Capitán')
      expect(boss.content.team.length).toBeGreaterThan(0)
    }
    // todos los nodos no-último apuntan a algo (conectividad)
    for (let l = 0; l < map.layers.length - 1; l++) {
      for (const id of map.layers[l]) expect(map.nodes[id].next.length).toBeGreaterThan(0)
    }
  })

  it('el Capítulo 2 genera su propio mapa y jefe', () => {
    const run = createRun({ gen: 1, pools: [1], random: false, starterId: 1, difficulty: 'normal', story: 2, seed: 7 })
    expect(run.region).toBe('La Costa Prohibida')
    const last = run.map.layers[run.map.layers.length - 1]
    const boss = run.map.nodes[last[0]]
    expect(boss.type).toBe('champion')
    if (boss.content.kind === 'trainer') expect(boss.content.trainer.name).toBe('Comandante Vega')
    // el capítulo 2 es más largo que el 1
    expect(run.map.totalLayers).toBeGreaterThan(7)
  })
})

describe('Modo Historia — capítulos 3-6 y continuidad', () => {
  it('los capítulos nuevos generan su mapa con su jefe final', () => {
    const bosses: Record<number, string> = { 3: 'Dra. Lyra', 4: 'El Custodio', 5: 'Director Krell', 6: 'El Arquitecto' }
    for (const ch of [3, 4, 5, 6]) {
      const run = createRun({ gen: 1, pools: [1], random: false, starterId: 1, difficulty: 'normal', story: ch, seed: 11 + ch })
      const last = run.map.layers[run.map.layers.length - 1]
      const boss = run.map.nodes[last[0]]
      expect(boss.type).toBe('champion')
      if (boss.content.kind === 'trainer') expect(boss.content.trainer.name).toBe(bosses[ch])
    }
  })

  it('empezar de cero usa el nivel inicial del capítulo (starterLevel)', () => {
    const run = createRun({ gen: 1, pools: [1], random: false, starterId: 4, difficulty: 'normal', story: 3, starterLevel: 17, seed: 5 })
    expect(run.party[0].level).toBe(17)
  })

  it('continuar con el equipo del capítulo anterior lo conserva y lo cura', () => {
    const carried = createInstance(25, 22, new RNG(1)) // Pikachu del capítulo anterior
    carried.currentHp = 1
    const run = createRun({ gen: 1, pools: [1], random: false, starterId: 4, difficulty: 'normal', story: 3, party: [carried], seed: 5 })
    expect(run.party).toHaveLength(1)
    expect(run.party[0].speciesId).toBe(25)
    expect(run.party[0].level).toBe(22)
    expect(run.party[0].currentHp).toBe(run.party[0].stats.hp) // llega curado
  })

  it('la curva de cada capítulo empieza en su startLevel (no a nivel 5)', () => {
    const { map } = generateStoryMap(5, 1, new RNG(3), 'normal') // cap. 5: startLevel 33
    for (const id of map.layers[0]) expect(map.nodes[id].enemyLevel).toBeGreaterThanOrEqual(30)
  })
})

describe('Modo Historia — tipo Sonoro en combate', () => {
  it('applySonoroGene altera tipos y ataques (Exploud y su preevolución Whismur)', () => {
    for (const id of [293, 295]) {
      const mon = createInstance(id, 20, new RNG(1))
      applySonoroGene(mon)
      expect(monTypes(mon)).toEqual(['sonoro'])
      // Su ataque pasa a ser de tipo Sonoro (sintético registrado en el catálogo).
      expect(mon.moves.some((mv) => getMove(mv.moveId).type === 'sonoro')).toBe(true)
    }
  })

  it('las eficacias del Sonoro se aplican con los tipos efectivos de la instancia', () => {
    const mon = createInstance(295, 20, new RNG(1)) // Exploud: normal de fábrica
    expect(typeEffectiveness('fighting', monTypes(mon))).toBe(2) // lucha vs normal
    applySonoroGene(mon)
    expect(typeEffectiveness('fighting', monTypes(mon))).toBe(1) // ya no es normal
    expect(typeEffectiveness('normal', monTypes(mon))).toBe(2) // solo Normal le pega fuerte
    expect(typeEffectiveness('steel', monTypes(mon))).toBe(1) // el resto, daño normal
    const sonoroMove = mon.moves.find((mv) => getMove(mv.moveId).type === 'sonoro')!
    expect(typeEffectiveness(getMove(sonoroMove.moveId).type, getSpecies(54).types)).toBe(2) // vs Psyduck (agua)
  })

  it('en el cap. 1 (fuera de la isla) NO hay Sonoro; del cap. 2 en adelante sí aparece', () => {
    const m1 = generateStoryMap(1, 25, new RNG(5), 'normal').map
    for (const n of Object.values(m1.nodes)) {
      const c = n.content
      const mons = c.kind === 'wild' ? [c.enemy] : c.kind === 'trainer' ? c.team : c.kind === 'catch' ? c.offers : []
      for (const mon of mons) expect(mon.typesOverride).toBeUndefined()
    }
    // Cap. 3 (laboratorios, lleno de prototipos): alguna instancia lleva el gen.
    let found = false
    for (let seed = 1; seed <= 5 && !found; seed++) {
      const m3 = generateStoryMap(3, 25, new RNG(seed), 'normal').map
      for (const n of Object.values(m3.nodes)) {
        const c = n.content
        const mons = c.kind === 'wild' ? [c.enemy] : c.kind === 'trainer' ? c.team : c.kind === 'catch' ? c.offers : []
        if (mons.some((mon) => mon.typesOverride?.includes('sonoro'))) { found = true; break }
      }
    }
    expect(found).toBe(true)
  })

  it('el Capitán lleva 3 Pokémon de agua y uno es Lapras (sano, sin gen Sonoro)', () => {
    const { map } = generateStoryMap(1, 25, new RNG(7), 'normal')
    const boss = map.nodes[map.layers[map.layers.length - 1][0]]
    if (boss.content.kind !== 'trainer') throw new Error('jefe sin equipo')
    const team = boss.content.team
    expect(team).toHaveLength(3)
    for (const m of team) expect(getSpecies(m.speciesId).types).toContain('water')
    const lapras = team.find((m) => m.speciesId === 131)!
    expect(lapras).toBeDefined()
    expect(lapras.typesOverride).toBeUndefined()
  })

  it('recompensas: el cap. 1 regala el Lapras del Capitán y el cap. 3 lo muta a Sonoro', () => {
    const team = [createInstance(25, 14, new RNG(2))]
    const after1 = applyStoryChapterRewards(1, team, 99)
    expect(after1).toHaveLength(2)
    const lapras = after1.find((m) => m.speciesId === 131)!
    expect(lapras).toBeDefined()
    expect(monTypes(lapras)).toEqual(['water', 'ice']) // aún sano

    const after3 = applyStoryChapterRewards(3, after1, 99)
    const mutated = after3.find((m) => m.speciesId === 131)!
    expect(monTypes(mutated)).toEqual(['water', 'sonoro'])
    expect(mutated.moves.some((mv) => getMove(mv.moveId).type === 'sonoro')).toBe(true)
  })

  it('con el equipo lleno, el Lapras del cap. 1 sustituye al miembro de menor nivel', () => {
    const rng = new RNG(3)
    const team = [16, 19, 21, 41, 60, 66].map((id, i) => createInstance(id, 10 + i, rng))
    const after = applyStoryChapterRewards(1, team, 7)
    expect(after).toHaveLength(6)
    expect(after.some((m) => m.speciesId === 131)).toBe(true)
    expect(after.some((m) => m.speciesId === 16)).toBe(false) // el de nivel 10 salió
  })
})

describe('Gen Sonoro desbloqueado en runs normales', () => {
  it('con sonoro:true los Pokémon del dossier llevan el gen también fuera de la historia', () => {
    // Jigglypuff (39) está en el dossier (línea de Wigglytuff).
    const run = createRun({ gen: 1, pools: [1], random: false, starterId: 39, difficulty: 'normal', sonoro: true, seed: 21 })
    expect(run.sonoro).toBe(true)
    expect(run.party[0].typesOverride).toEqual(['sonoro', 'fairy'])
    // Sin el flag, nada.
    const off = createRun({ gen: 1, pools: [1], random: false, starterId: 39, difficulty: 'normal', seed: 21 })
    expect(off.party[0].typesOverride).toBeUndefined()
  })
})

describe('Modo Historia — intransferibles (compañero y Lapras del Capitán)', () => {
  it('el compañero inicial de una run de historia nace intransferible (locked)', () => {
    const run = createRun({ gen: 1, pools: [1], random: false, starterId: 25, difficulty: 'normal', story: 1, seed: 3 })
    expect(run.party[0].locked).toBe(true)
    // En una run normal, NO.
    const normal = createRun({ gen: 1, pools: [1], random: false, starterId: 25, difficulty: 'normal', seed: 3 })
    expect(normal.party[0].locked).toBeUndefined()
  })

  it('el Lapras regalado es intransferible y nunca expulsa a otro intransferible', () => {
    const rng = new RNG(4)
    const team = [25, 19, 21, 41, 60, 66].map((id, i) => createInstance(id, 10 + i, rng))
    team[0].locked = true // tu Pikachu (nivel 10, el más bajo)
    const after = applyStoryChapterRewards(1, team, 7)
    const lapras = after.find((m) => m.speciesId === 131)!
    expect(lapras.locked).toBe(true)
    expect(after.some((m) => m.speciesId === 25)).toBe(true) // Pikachu sigue
    expect(after.some((m) => m.speciesId === 19)).toBe(false) // salió el siguiente más bajo
  })

  it('un intransferible no se puede intercambiar ni liberar para capturar', () => {
    const run = createRun({ gen: 1, pools: [1], random: false, starterId: 25, difficulty: 'normal', story: 1, seed: 9 })
    run.money = 99999
    const starter = run.party[0]
    // Intercambio bloqueado.
    const tradeNode = run.map.nodes[Object.keys(run.map.nodes)[0]]
    tradeNode.content = { kind: 'trade', cost: 100 }
    expect(resolveTrade(run, tradeNode, starter.uid)).toBeNull()
    // Liberar para hacer hueco en una captura: bloqueado.
    run.party = [starter, ...[19, 21, 41, 60, 66].map((id) => createInstance(id, 8, new RNG(2)))]
    const offer = createInstance(54, 8, new RNG(5))
    const catchNode = run.map.nodes[Object.keys(run.map.nodes)[1]]
    catchNode.content = { kind: 'catch', offers: [offer] }
    const res = catchPokemon(run, catchNode, true, offer.uid, starter.uid)
    expect(res.caught).toBe(false)
    expect(run.party.some((m) => m.uid === starter.uid)).toBe(true)
  })
})
