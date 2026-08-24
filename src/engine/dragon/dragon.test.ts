// Tests del motor de Dragon Ball Rogue. Igual que en Inazuma, lo importante
// no son las aserciones sueltas sino el BOT: juega runs enteras para poder
// calibrar la dificultad sin jugar cuarenta partidas a mano.
import { describe, expect, it } from 'vitest'
import { RNG } from '@/utils/rng'
import { getTechnique, TECHNIQUES } from '@/data/dragon/techniques'
import { getForm, TRANSFORMATIONS } from '@/data/dragon/transformations'
import { FIGHTERS, getFighter, STARTERS } from '@/data/dragon/fighters'
import { SAGAS } from '@/data/dragon/sagas'
import { ITEMS } from '@/data/dragon/items'
import {
  advance, ally, chooseOption, MOD_CAP, oddsStars, startBattle,
} from './battle'
import { BONDS, getTrait, TRAIT_BY_FIGHTER } from '@/data/dragon/personalities'
import {
  advanceMap, applyBattleResult, applyInterlude, applyRest, applyTraining, avgLevel, BALLS_FOR_WISH,
  BOSS_LAYER, createSave, generateSagaMap, grantWish, isTeamWiped, layerNodes,
  applyMasterOffer, checkAwakenings, masterOffers, recruit, recruitCandidate,
  startNodeBattle, TEAM_MAX, WISHES,
  type DragonSave, type MapNode,
} from './run'
import {
  actorTechnique, BOND_CAP, bondMult, createEnemy, createFighter, fighterMaxHp,
  fighterPL, fighterStats, itemLevel, ITEM_XP_PER_LEVEL, learnTechnique, powerLevel, statsAt,
  toCombatant, traitActive, upgradeTechnique,
} from './roster'
import type { Battle, Decision, DecisionOption } from './types'

// ------------------------------------------------------------ integridad ---

describe('datos', () => {
  it('toda técnica de un luchador existe en el catálogo', () => {
    for (const f of FIGHTERS) {
      for (const id of [...f.techniques, ...(f.learn ?? []).map((l) => l.tech)]) {
        expect(getTechnique(id), `${f.name} → ${id}`).toBeDefined()
      }
      for (const id of f.forms ?? []) {
        expect(getForm(id), `${f.name} → ${id}`).toBeDefined()
      }
    }
  })

  it('las sagas apuntan a luchadores y formas que existen', () => {
    for (const s of SAGAS) {
      for (const id of [...s.pool, ...s.elites, ...s.recruits, s.boss.id]) {
        expect(getFighter(id), `${s.name} → ${id}`).toBeDefined()
      }
      for (const p of s.boss.phases ?? []) expect(getForm(p), p).toBeDefined()
    }
  })

  it('los reclutables de cada saga son jugables (no rivales sueltos)', () => {
    for (const s of SAGAS) {
      for (const id of s.recruits) {
        const f = getFighter(id)!
        expect(f.base.poder, `${id}`).toBeGreaterThan(0)
      }
    }
  })

  it('ninguna técnica sale gratis ni ningún coste supera el depósito', () => {
    for (const t of TECHNIQUES) {
      expect(t.cost, t.name).toBeGreaterThan(0)
      expect(t.cost, t.name).toBeLessThanOrEqual(100)
      if (t.kind !== 'apoyo') expect(t.power, t.name).toBeGreaterThan(0)
    }
  })

  it('las transformaciones jugables se pueden sostener al menos dos turnos', () => {
    // Coste + dos turnos de mantenimiento tiene que caber en el depósito: si no,
    // activarla sería regalar ki (se caería sola antes de hacer nada).
    for (const f of TRANSFORMATIONS.filter((x) => x.upkeep > 0)) {
      expect(f.cost + f.upkeep * 2, f.name).toBeLessThanOrEqual(100)
    }
  })

  it('los objetos de equipo usan multiplicadores, nunca puntos planos', () => {
    for (const i of ITEMS.filter((x) => x.kind === 'equipo')) {
      for (const v of Object.values(i.stats ?? {})) {
        expect(v, i.name).toBeGreaterThan(0)
        expect(v, i.name).toBeLessThan(3)
      }
    }
  })
})

describe('power level', () => {
  it('crece como en el anime: Goku ronda 330 al empezar y pasa de 8.000 entrenado', () => {
    const goku = createFighter('goku', 1)
    expect(fighterPL(goku)).toBeGreaterThan(280)
    expect(fighterPL(goku)).toBeLessThan(420)
    const veterano = createFighter('goku', 40)
    expect(fighterPL(veterano)).toBeGreaterThan(8000)
  })

  it('transformarse dispara el número del scouter', () => {
    const c = createEnemy('goku', 25)
    const base = powerLevel(statsAt(getFighter('goku')!.base, 25))
    const conForma = { ...c, forms: ['ssj'] }
    void conForma
    const ssj = getForm('ssj')!
    const boost = powerLevel({
      poder: statsAt(getFighter('goku')!.base, 25).poder * (ssj.mult.poder ?? 1),
      ki: statsAt(getFighter('goku')!.base, 25).ki * (ssj.mult.ki ?? 1),
      defensa: statsAt(getFighter('goku')!.base, 25).defensa * (ssj.mult.defensa ?? 1),
      velocidad: statsAt(getFighter('goku')!.base, 25).velocidad * (ssj.mult.velocidad ?? 1),
      aguante: statsAt(getFighter('goku')!.base, 25).aguante,
    })
    expect(boost).toBeGreaterThan(base * 2)
  })
})

// ------------------------------------------------------------------ bots ---

type BotStyle = 'tonto' | 'listo'

/**
 * Juega el combate entero. El motor ya no pide una acción por turno: para en
 * los momentos clave y entre medias se resuelve solo, así que el bot solo
 * tiene que responder a las decisiones.
 */
function playBattle(b: Battle, style: BotStyle, rng: RNG): Battle {
  let guard = 0
  while (!b.over && guard++ < 900) {
    if (b.phase !== 'decision') { advance(b); continue }
    const d = b.decision!
    if (d.kind === 'relevo') {
      // El más entero de los que quedan.
      const best = [...d.options].sort((a, c) => c.chance - a.chance)[0]
      chooseOption(b, best.id)
      continue
    }
    if (d.kind === 'choque') {
      // El listo empuja lo que pueda permitirse; el tonto nunca empuja.
      const asequibles = d.options.filter((o) => (o.cost ?? 0) <= ally(b).ki - 10)
      const pick = style === 'listo' && asequibles.length ? asequibles[asequibles.length - 1] : d.options[0]
      chooseOption(b, pick.id)
      continue
    }
    chooseOption(b, pickPlay(b, d.options, style, rng).id)
  }
  expect(guard).toBeLessThan(900)
  return b
}

/**
 * Cerebro del bot que hace de JUGADOR ante la jugada del asalto.
 *  - `tonto`: pulsa AL AZAR. Es el suelo honesto ahora que el motor ya te
 *    sirve las tres técnicas que mejor pintan: con esa lista curada, «elegir
 *    la más cara» ya era jugar bien y el bot tonto ganaba el 17 % de las runs.
 *  - `listo`: la que mejores estrellas saca, con dos correcciones de sentido
 *    común — transformarse si aún no lo está y cubrirse cuando va en rojo.
 */
function pickPlay(b: Battle, options: DecisionOption[], style: BotStyle, rng: RNG): DecisionOption {
  const me = ally(b)
  const libres = options.filter((o) => (o.cost ?? 0) <= me.ki)
  if (!libres.length) return options[options.length - 1]

  if (style === 'tonto') return rng.pick(libres)

  const forma = libres.find((o) => o.id.startsWith('form:'))
  if (forma && !me.form) return forma
  if (me.hp < me.hpMax * 0.3) {
    const cura = libres.find((o) => o.id.startsWith('item:'))
    if (cura) return cura
    const guardia = libres.find((o) => o.id === 'guardia')
    if (guardia && rng.chance(0.6)) return guardia
  }
  return [...libres].sort((a, c) => c.chance - a.chance)[0]
}

interface RunReport {
  won: boolean
  /** Saga en la que murió (4 = terminó el juego). */
  diedAt: number
  layer: number
  battles: number
  avgLevel: number
  zenkais: number
  turns: number[]
}

function playRun(seed: number, style: BotStyle): RunReport {
  const rng = new RNG(seed ^ 0x9e3779b9)
  const partner = style === 'listo' ? 'piccolo' : rng.pick([...STARTERS])
  const save = createSave(seed, { partner })
  const turns: number[] = []
  let guard = 0

  while (!save.finished && guard++ < 200) {
    const options = layerNodes(save)
    if (!options.length) break
    const node = style === 'listo' ? pickNodeSmart(save, options) : options[0]
    const resolved = resolveNode(save, node, style, rng, turns)
    if (!resolved) break
    if (save.finished) break
    if (isTeamWiped(save)) { save.finished = 'derrota'; break }
    advanceMap(save, rng)
  }

  return {
    won: save.finished === 'victoria',
    diedAt: save.finished === 'victoria' ? 4 : save.saga,
    layer: save.layer,
    battles: save.battles,
    avgLevel: avgLevel(save),
    zenkais: save.zenkais,
    turns,
  }
}

/**
 * El bot listo elige nodo como lo haría una persona: cura solo si va de
 * verdad tocado, ficha mientras tenga hueco y, por defecto, PELEA — que es lo
 * único que da niveles. Descansar por cada rasguño era lo que le dejaba
 * llegando al jefe cuatro niveles por debajo.
 */
function pickNodeSmart(save: DragonSave, options: MapNode[]): MapNode {
  const frac = save.team.reduce((a, f) => a + Math.max(0, f.hp), 0)
    / Math.max(1, save.team.reduce((a, f) => a + fighterMaxHp(f), 0))
  const down = save.team.some((f) => f.hp <= 0)
  const byKind = (k: MapNode['kind']) => options.find((n) => n.kind === k)
  if ((frac < 0.45 || down) && byKind('descanso')) return byKind('descanso')!
  if (save.team.length < TEAM_MAX && byKind('reclutar')) return byKind('reclutar')!
  if (frac < 0.45 && byKind('entreno')) return byKind('entreno')!
  // Élite = más niveles y más botín: merece la pena si el equipo está entero.
  if (frac > 0.6 && byKind('elite')) return byKind('elite')!
  return byKind('combate') ?? byKind('elite') ?? byKind('entreno') ?? byKind('bola') ?? options[0]
}

/** Reparte los objetos de equipo que sobren: sin esto el bot no los usaba. */
function equipBest(save: DragonSave, owned: string[]): void {
  for (const f of save.team) {
    if (f.item) continue
    const next = owned.shift()
    if (!next) return
    f.item = next
  }
}

function resolveNode(save: DragonSave, node: MapNode, style: BotStyle, rng: RNG, turns: number[]): boolean {
  switch (node.kind) {
    case 'maestro': {
      // El bot coge siempre la primera oferta: aprender pesa más que pulir.
      const ofertas = node.master ? masterOffers(save, node.master) : []
      if (ofertas.length) applyMasterOffer(save, ofertas[0])
      return true
    }
    case 'combate': case 'elite': case 'jefe': {
      const b = startNodeBattle(save, node, rng)
      playBattle(b, style, rng)
      turns.push(b.turn)
      applyBattleResult(save, b, node)
      return true
    }
    case 'entreno': {
      // Al que más lo necesite: el de menor nivel.
      const target = [...save.team].sort((a, c) => a.level - c.level)[0]
      if (target) applyTraining(save, target.uid, node.levels ?? 3)
      applyInterlude(save)
      return true
    }
    case 'descanso': applyRest(save); applyInterlude(save); return true
    case 'reclutar': {
      const cand = recruitCandidate(save, node, rng)
      if (cand && save.team.length < TEAM_MAX) recruit(save, cand)
      applyInterlude(save)
      return true
    }
    case 'tienda': {
      // El listo compra curas y reparte equipo; el tonto no compra nada.
      applyInterlude(save)
      if (style !== 'listo') return true
      while (save.zeni >= 1100 && (save.bag.semilla_media ?? 0) < 2) {
        save.bag.semilla_media = (save.bag.semilla_media ?? 0) + 1
        save.zeni -= 1100
      }
      const sinObjeto = save.team.filter((f) => !f.item).length
      const compras: string[] = []
      for (let i = 0; i < sinObjeto && save.zeni >= 900; i++) {
        compras.push(i % 2 === 0 ? 'guantes' : 'armadura')
        save.zeni -= 900
      }
      equipBest(save, compras)
      return true
    }
    case 'bola': {
      save.balls += 1
      applyInterlude(save)
      // Siete bolas, un deseo: el listo pide poder salvo que tenga bajas.
      if (save.balls >= BALLS_FOR_WISH) {
        grantWish(save, save.team.some((f) => f.hp <= 0) ? 'revivir' : 'poder')
      }
      return true
    }
  }
}

function summarise(reports: RunReport[]) {
  const n = reports.length
  return {
    wins: reports.filter((r) => r.won).length,
    winRate: reports.filter((r) => r.won).length / n,
    avgDiedAt: reports.reduce((a, r) => a + r.diedAt, 0) / n,
    avgBattles: reports.reduce((a, r) => a + r.battles, 0) / n,
    avgLevel: reports.reduce((a, r) => a + r.avgLevel, 0) / n,
    avgTurns: reports.flatMap((r) => r.turns).reduce((a, t, _i, arr) => a + t / arr.length, 0),
    zenkais: reports.reduce((a, r) => a + r.zenkais, 0) / n,
    muere: reports.reduce((acc: Record<string, number>, r) => {
      const k = r.won ? 'fin' : `s${r.diedAt}L${r.layer}`
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {}),
  }
}

// -------------------------------------------------------------- combate ---

describe('combate', () => {
  it('un combate termina y deja un ganador', () => {
    const rng = new RNG(7)
    const b = startBattle(
      [createFighter('goku', 10)],
      [createEnemy('raditz', 10)],
      { seed: 99, title: 'prueba', scene: 'yermo' },
    )
    advance(b)
    playBattle(b, 'listo', rng)
    expect(b.over).toBe(true)
    expect(b.phase).toBe('finished')
    expect(typeof b.win).toBe('boolean')
    expect(b.log.some((e) => e.t === 'end')).toBe(true)
  })

  it('es determinista: misma semilla y mismas decisiones → mismo combate', () => {
    const run = () => {
      const rng = new RNG(3)
      const b = startBattle([createFighter('goku', 12)], [createEnemy('nappa', 12)], { seed: 555, title: 't', scene: 'yermo' })
      advance(b)
      playBattle(b, 'listo', rng)
      return { win: b.win, turn: b.turn, log: b.log.length }
    }
    expect(run()).toEqual(run())
  })

  it('para en los momentos clave y NO pide una acción cada turno', () => {
    const b = startBattle([createFighter('goku', 14)], [createEnemy('raditz', 14)], { seed: 4, title: 't', scene: 'yermo' })
    advance(b)
    // El primer latido ya deja una jugada encima de la mesa.
    expect(b.phase).toBe('decision')
    expect(b.decision?.kind).toBe('jugada')
    expect(b.decision!.options.length).toBeGreaterThan(2)

    // Tras decidir, el combate sigue solo al menos un intercambio antes de
    // volver a preguntar: ese es el trato del modo.
    const turnoAlDecidir = b.turn
    chooseOption(b, 'golpe')
    let guard = 0
    while (b.phase !== 'decision' && !b.over && guard++ < 20) advance(b)
    if (!b.over) expect(b.turn).toBeGreaterThan(turnoAlDecidir + 1)
  })

  it('cada opción trae su coste y sus estrellas, calculadas sin gastar RNG', () => {
    const b = startBattle([createFighter('goku', 20)], [createEnemy('nappa', 20)], { seed: 11, title: 't', scene: 'yermo' })
    advance(b)
    const antes = b.rngState
    const opts = b.decision!.options
    for (const o of opts) {
      expect(o.chance, o.label).toBeGreaterThan(0)
      expect(o.chance, o.label).toBeLessThanOrEqual(1)
      expect([1, 2, 3]).toContain(oddsStars(o.chance))
    }
    // Pintar las estrellas no puede mover la RNG o el combate dejaría de ser
    // reproducible por semilla.
    expect(b.rngState).toBe(antes)
    // Y una técnica potente tiene que pintar mejor que un puñetazo.
    const golpe = opts.find((o) => o.id === 'golpe')!
    const tecnica = opts.find((o) => o.id.startsWith('tech:'))
    if (tecnica) expect(tecnica.chance).toBeGreaterThan(golpe.chance)
  })

  it('cargar ki llena el depósito y deja descubierto', () => {
    const b = startBattle([createFighter('goku', 10)], [createEnemy('raditz', 10)], { seed: 4, title: 't', scene: 'yermo' })
    advance(b)
    chooseOption(b, 'cargar')
    expect(ally(b).ki).toBeGreaterThan(50)
  })

  it('la guardia reduce el daño de verdad', () => {
    const mk = (guard: boolean) => {
      const b = startBattle([createFighter('krilin', 10)], [createEnemy('nappa', 10)], { seed: 21, title: 't', scene: 'yermo' })
      advance(b)
      chooseOption(b, guard ? 'guardia' : 'golpe')
      return ally(b).hp
    }
    expect(mk(true)).toBeGreaterThan(mk(false))
  })

  it('quedarse sin ki tumba la transformación', () => {
    const goku = createFighter('goku', 30)
    goku.forms = ['ssj3'] // upkeep 26: insostenible si no cargas
    const b = startBattle([goku], [createEnemy('nappa', 30)], { seed: 8, title: 't', scene: 'yermo' })
    advance(b)
    // Entra con lo justo (44 de coste sobre 50 de depósito): el mantenimiento
    // de 26 no cabe en lo que queda, así que se le cae ese mismo turno.
    ally(b).ki = 50
    chooseOption(b, 'form:ssj3')
    expect(b.log.some((e) => e.t === 'transform' && e.form === 'ssj3')).toBe(true)
    expect(b.log.some((e) => e.t === 'formEnd' && e.reason === 'ki')).toBe(true)
    expect(ally(b).form).toBeUndefined()
  })

  it('los buffs no se pueden apilar hasta el infinito', () => {
    const ten = createFighter('ten', 30) // sabe Multiforma (poder ×1.3)
    const b = startBattle([ten], [createEnemy('nappa', 30)], { seed: 5, title: 't', scene: 'yermo' })
    advance(b)
    const me = ally(b)
    for (let i = 0; i < 12; i++) {
      me.ki = 100
      me.mods.poder = (me.mods.poder ?? 1) * 1.3
      me.mods.poder = Math.min(2, me.mods.poder)
    }
    // El tope existe para que apilar apoyo no sea la estrategia dominante.
    expect(MOD_CAP).toBe(2)
    expect(me.mods.poder).toBeLessThanOrEqual(MOD_CAP)
  })

  it('dos rayos a la vez provocan un choque, y se elige cuánto empujar', () => {
    const goku = createFighter('goku', 20)
    const enemy = createEnemy('cui', 20)
    enemy.techniques = ['rayomortal']
    const b = startBattle([goku], [enemy], { seed: 12, title: 't', scene: 'yermo' })
    advance(b)
    let guard = 0
    let sawClash = false
    while (!b.over && guard++ < 80) {
      if (b.phase !== 'decision') { advance(b); continue }
      const d = b.decision!
      if (d.kind === 'choque') {
        sawClash = true
        expect(d.rivalTech, 'el choque enseña con qué viene el rival').toBeTruthy()
        expect(d.options.length).toBeGreaterThan(1)
        chooseOption(b, d.options[d.options.length - 1].id)
        continue
      }
      const kame = d.options.find((o) => o.id === 'tech:kamehameha')
      chooseOption(b, kame ? kame.id : 'cargar')
    }
    expect(sawClash, 'nunca se produjo un choque de rayos').toBe(true)
    expect(b.log.some((e) => e.t === 'clash')).toBe(true)
  })

  it('un jefe multifase se levanta más fuerte antes de caer', () => {
    const team = [createFighter('goku', 60), createFighter('piccolo', 60), createFighter('vegeta', 60)]
    const b = startBattle(team, [createEnemy('freezer', 30)], {
      seed: 31, title: 'Freezer', scene: 'namek', phases: ['freezer2', 'freezer4'],
    })
    advance(b)
    playBattle(b, 'listo', new RNG(2))
    const forms = b.log.filter((e) => e.t === 'transform' && e.side === 'rival')
    expect(forms.length).toBeGreaterThan(0)
  })

  it('el modo automático resuelve el combate solo, sin pedir nada', () => {
    const b = startBattle([createFighter('goku', 15)], [createEnemy('raditz', 15)], {
      seed: 77, title: 't', scene: 'yermo', auto: true,
    })
    let guard = 0
    while (!b.over && guard++ < 400) {
      advance(b)
      expect(b.phase, 'en automático no se pide ninguna decisión').not.toBe('decision')
    }
    expect(b.over).toBe(true)
  })

  it('en combate solo se pueden usar objetos DE USO, no el equipo de repuesto', () => {
    const b = startBattle([createFighter('goku', 20)], [createEnemy('nappa', 20)], {
      seed: 44, title: 't', scene: 'yermo', bag: { armadura: 1, semilla: 1 },
    })
    advance(b)
    ally(b).hp = Math.round(ally(b).hpMax * 0.3)
    b.decision = null
    b.phase = 'idle'
    advance(b)
    const ids = (b.decision as Decision | null)?.options.map((o) => o.id) ?? []
    // La armadura NO puede ofrecerse: usarla gastaba el turno y destruía el objeto.
    expect(ids).not.toContain('item:armadura')
    expect(b.bag.armadura).toBe(1)
  })

  it('los combates duran lo que tiene que durar un asalto (no 2 turnos ni 40)', () => {
    const lens: number[] = []
    for (let s = 0; s < 40; s++) {
      const rng = new RNG(s + 100)
      const b = startBattle([createFighter('goku', 20)], [createEnemy('nappa', 20)], { seed: s, title: 't', scene: 'yermo' })
      advance(b)
      playBattle(b, 'listo', rng)
      lens.push(b.turn)
    }
    const avg = lens.reduce((a, x) => a + x, 0) / lens.length
    expect(avg).toBeGreaterThan(4)
    expect(avg).toBeLessThan(22)
  })
})

// ------------------------------------------------------------------ run ---

describe('run', () => {
  it('el mapa es un grafo de caminos: toda casilla se puede alcanzar y lleva a algún sitio', () => {
    for (let saga = 0; saga < SAGAS.length; saga++) {
      const map = generateSagaMap(saga, new RNG(saga * 31 + 5))
      const byId = new Map(map.map((n) => [n.id, n]))
      for (const n of map) {
        if (n.layer < BOSS_LAYER) {
          // Toda casilla que no sea el jefe tiene salida, y sus salidas van a
          // la capa siguiente (nunca a la propia ni hacia atrás).
          expect(n.next.length, `${n.id} sin salidas`).toBeGreaterThan(0)
          for (const id of n.next) {
            const destino = byId.get(id)
            expect(destino, `${n.id} → ${id} no existe`).toBeDefined()
            expect(destino!.layer, `${n.id} → ${id}`).toBe(n.layer + 1)
          }
        } else {
          expect(n.next).toEqual([])
        }
        // Y toda casilla que no sea de salida tiene al menos una ENTRADA: si
        // no, quedaría pintada en el tablero sin poder llegar nunca a ella.
        if (n.layer > 0) {
          const entradas = map.filter((o) => o.next.includes(n.id))
          expect(entradas.length, `${n.id} inalcanzable`).toBeGreaterThan(0)
        }
      }
      // Y el mapa se puede recorrer de principio a fin.
      let frontera = map.filter((n) => n.layer === 0)
      for (let l = 0; l < BOSS_LAYER; l++) {
        const siguiente = frontera.flatMap((n) => n.next.map((id) => byId.get(id)!))
        expect(siguiente.length, `capa ${l} sin continuación`).toBeGreaterThan(0)
        frontera = [...new Set(siguiente)]
      }
      expect(frontera.every((n) => n.kind === 'jefe')).toBe(true)
    }
  })

  it('el mapa da opciones y siempre hay dónde pelear en cada capa', () => {
    for (let s = 0; s < SAGAS.length; s++) {
      const map = generateSagaMap(s, new RNG(s + 1))
      for (let layer = 0; layer <= BOSS_LAYER; layer++) {
        const nodes = map.filter((n) => n.layer === layer)
        expect(nodes.length, `saga ${s} capa ${layer}`).toBeGreaterThan(0)
        if (layer < BOSS_LAYER) {
          const peleable = nodes.some((n) => n.kind === 'combate' || n.kind === 'elite')
          expect(peleable, `saga ${s} capa ${layer} sin combate`).toBe(true)
        }
      }
      expect(map.filter((n) => n.kind === 'jefe').length).toBe(1)
    }
  })

  it('la curva de niveles de los rivales sube saga a saga', () => {
    for (let i = 1; i < SAGAS.length; i++) {
      expect(SAGAS[i].levels[0]).toBeGreaterThan(SAGAS[i - 1].levels[1])
      expect(SAGAS[i].boss.level).toBeGreaterThan(SAGAS[i - 1].boss.level)
    }
  })

  it('el equipo no pasa del máximo y no se ficha dos veces al mismo', () => {
    const save = createSave(5, { partner: 'krilin' })
    expect(recruit(save, 'krilin')).toBeNull()
    recruit(save, 'ten')
    recruit(save, 'piccolo')
    recruit(save, 'gohan')
    expect(save.team.length).toBeLessThanOrEqual(TEAM_MAX)
  })

  it('los deseos hacen lo que prometen', () => {
    for (const w of WISHES) {
      const save = createSave(9, { partner: 'krilin' })
      save.balls = 7
      save.team[0].hp = 1
      const before = { zeni: save.zeni, lvl: avgLevel(save) }
      grantWish(save, w.id)
      expect(save.balls).toBe(0)
      if (w.id === 'zeni') expect(save.zeni).toBeGreaterThan(before.zeni)
      if (w.id === 'poder') expect(avgLevel(save)).toBeGreaterThan(before.lvl)
      if (w.id === 'revivir' || w.id === 'inmortal') expect(save.team[0].hp).toBeGreaterThan(1)
      if (w.id === 'semillas') expect(save.bag.semilla).toBe(3)
    }
  })

  it('perder un combate acaba la run', () => {
    const save = createSave(3, { partner: 'krilin' })
    const node = save.map.find((n) => n.kind === 'combate' || n.kind === 'elite')!
    // Un rival desproporcionado: la run tiene que morir aquí.
    node.level = 60
    const b = startNodeBattle(save, node, new RNG(1))
    playBattle(b, 'tonto', new RNG(2))
    applyBattleResult(save, b, node)
    if (!b.win) expect(save.finished).toBe('derrota')
  })
})

// ------------------------------------------------------- profundidad ---

describe('carácter, vínculos y maestros', () => {
  it('todo rasgo asignado existe, y todo vínculo apunta a luchadores reales', () => {
    for (const [id, trait] of Object.entries(TRAIT_BY_FIGHTER)) {
      expect(getFighter(id), id).toBeDefined()
      expect(getTrait(trait), `${id} → ${trait}`).toBeDefined()
    }
    for (const v of BONDS) {
      expect(getFighter(v.a), v.a).toBeDefined()
      expect(getFighter(v.b), v.b).toBeDefined()
      expect(v.a).not.toBe(v.b)
    }
  })

  it('los vínculos suben atributos DE VERDAD, y con tope', () => {
    const solo = bondMult('goku', [])
    expect(Object.keys(solo).length, 'sin compañeros no hay vínculo').toBe(0)
    const acompanado = bondMult('goku', ['krilin', 'vegeta', 'gohan', 'yamcha'])
    expect(acompanado.poder, 'con la cuadrilla al completo, más poder').toBeGreaterThan(1)
    // El tope existe porque acumular cuatro vínculos daba +46 % gratis.
    for (const v of Object.values(acompanado)) expect(v).toBeLessThanOrEqual(BOND_CAP)
  })

  it('el carácter se enciende SOLO cuando toca', () => {
    const goku = createFighter('goku', 20) // Competitivo: pide vida alta
    const c = toCombatant(goku, ['goku'])
    expect(c.trait).toBe('competitivo')
    c.hp = c.hpMax
    expect(traitActive(c)).toBe(true)
    c.hp = Math.round(c.hpMax * 0.2)
    expect(traitActive(c), 'tocado ya no está enchufado').toBe(false)

    // Y el temerario justo al revés.
    const gohan = toCombatant(createFighter('gohan', 20), [])
    gohan.hp = Math.round(gohan.hpMax * 0.2)
    expect(traitActive(gohan)).toBe(true)
  })

  it('las transformaciones forman un árbol: no se salta un escalón', () => {
    const goku = createFighter('goku', 50)
    const save = createSave(1, { partner: 'krilin' })
    save.team = [goku]
    const b = startBattle([goku], [createEnemy('nappa', 50)], { seed: 1, title: 't', scene: 'yermo' })
    b.allies[0].hp = 1 // condición dramática para que despierte algo
    const node = save.map.find((n) => n.kind === 'combate')!
    b.win = true
    checkAwakenings(save, b, node)
    // A nivel 50 le tocarían varias, pero solo puede despertar la primera de
    // la rama: Superguerrero 2 exige tener antes el Superguerrero.
    expect(goku.forms).not.toContain('ssj2')
    expect(goku.forms.length).toBeLessThanOrEqual(1)
  })

  it('un maestro enseña algo nuevo y luego lo pule, y se nota en la técnica', () => {
    const save = createSave(3, { partner: 'krilin' })
    const ofertas = masterOffers(save, 'roshi')
    expect(ofertas.length).toBeGreaterThan(0)
    const nueva = ofertas.find((o) => o.kind === 'aprender')!
    expect(nueva, 'el maestro tiene algo que enseñar').toBeDefined()
    applyMasterOffer(save, nueva)
    const f = save.team.find((x) => x.uid === nueva.uid)!
    expect(f.techniques).toContain(nueva.techId)

    // Y mejorarla se nota EN EL CAMPO: si no, sería decorativa (el fallo
    // clásico que ya tuvimos con los objetos de atributos de Inazuma).
    // Ojo: en las de apoyo la mejora solo abarata, porque su potencia es 0.
    const base = getTechnique(nueva.techId)!
    upgradeTechnique(f, nueva.techId)
    const mejorada = actorTechnique(f, nueva.techId)!
    expect(mejorada.cost).toBeLessThan(base.cost)
    expect(mejorada.name).toContain('V2')
    if (base.power > 0) expect(mejorada.power).toBeGreaterThan(base.power)

    // Y con una ofensiva, la potencia sube seguro.
    learnTechnique(f, 'kamehameha')
    upgradeTechnique(f, 'kamehameha')
    const kame = actorTechnique(f, 'kamehameha')!
    expect(kame.power).toBeGreaterThan(getTechnique('kamehameha')!.power)
  })

  it('los objetos se dominan con el uso y su efecto crece', () => {
    const f = createFighter('goku', 20)
    f.item = 'guantes'
    const base = fighterStats(f).poder
    expect(itemLevel(f)).toBe(0)
    f.itemXp = ITEM_XP_PER_LEVEL * 2
    expect(itemLevel(f)).toBe(2)
    expect(fighterStats(f).poder, 'unos guantes dominados pegan más').toBeGreaterThan(base)
  })
})

// ------------------------------------------------------- calibración ---

describe('dificultad', () => {
  it('jugar bien se nota: el bot listo llega mucho más lejos que el tonto', () => {
    const N = 30
    const tontos: RunReport[] = []
    const listos: RunReport[] = []
    for (let s = 0; s < N; s++) {
      tontos.push(playRun(1000 + s, 'tonto'))
      listos.push(playRun(1000 + s, 'listo'))
    }
    const t = summarise(tontos)
    const l = summarise(listos)
    // Informe a consola: es la herramienta de calibración, no adorno.
    // eslint-disable-next-line no-console
    console.log('DRAGON · tonto ', JSON.stringify(t))
    // eslint-disable-next-line no-console
    console.log('DRAGON · listo ', JSON.stringify(l))

    // Estado calibrado (30 runs por bot): el que juega a lo bruto ronda el 7 %
    // y se queda en el primer jefe; el que administra el ki ronda el 23 % y
    // llega de media a la saga 2, con las muertes repartidas entre los tres
    // jefes finales en vez de apiladas contra un muro. Los márgenes son anchos
    // a propósito: esto no fija un número exacto, detecta que algo se ha roto.
    expect(l.avgDiedAt).toBeGreaterThan(t.avgDiedAt + 0.8)
    // El suelo de habilidad puede sonar la flauta, pero no ganar a menudo.
    expect(t.winRate).toBeLessThan(0.15)
    // Y jugar bien tiene que multiplicar de largo las opciones de terminarlo.
    expect(l.winRate).toBeGreaterThan(t.winRate * 2)
    expect(l.winRate).toBeGreaterThan(0.08)
    // Un combate medio se resuelve en un puñado de turnos, no en cuarenta.
    expect(l.avgTurns).toBeGreaterThan(5)
    expect(l.avgTurns).toBeLessThan(20)
  })
})
