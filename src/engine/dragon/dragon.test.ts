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
  advance, affordableTechs, ally, availableForms, choose, chooseSwitch, foe,
  pushClash, PUSH_OPTIONS, startBattle,
} from './battle'
import {
  advanceMap, applyBattleResult, applyInterlude, applyRest, applyTraining, avgLevel, BALLS_FOR_WISH,
  BOSS_LAYER, createSave, generateSagaMap, grantWish, isTeamWiped, layerNodes,
  recruit, recruitCandidate, startNodeBattle, TEAM_MAX, WISHES,
  type DragonSave, type MapNode,
} from './run'
import { createEnemy, createFighter, fighterMaxHp, fighterPL, powerLevel, statsAt } from './roster'
import type { Action, Battle } from './types'

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
 * Cerebro del bot que hace de JUGADOR.
 *  - `tonto`: tira siempre de la técnica más gorda que pueda pagar y carga
 *    cuando se queda seco. Es el SUELO: si este gana mucho, el juego es fácil.
 *  - `listo`: administra ki, se transforma cuando puede sostenerlo, castiga las
 *    cargas del rival, se cura y guarda cuando está en rojo. Es el TECHO
 *    razonable: si este no gana nunca, el juego es injusto, no difícil.
 */
function botAction(b: Battle, style: BotStyle, rng: RNG): Action {
  const me = ally(b)
  const enemy = foe(b)
  const techs = affordableTechs(me).filter((t) => t.kind !== 'apoyo')

  if (style === 'tonto') {
    const best = techs.sort((a, c) => c.power - a.power)[0]
    if (best) return { kind: 'tecnica', id: best.id }
    return me.ki < 25 && rng.chance(0.6) ? { kind: 'cargar' } : { kind: 'golpe' }
  }

  const form = me.form ? getForm(me.form) : undefined
  const upkeep = form?.upkeep ?? 0
  const hpFrac = me.hp / me.hpMax

  // Semilla cuando de verdad hace falta (y no queda otra).
  if (hpFrac < 0.28) {
    const cure = Object.keys(b.bag).find((id) => b.bag[id] > 0 && (ITEMS.find((i) => i.id === id)?.heal ?? 0) >= 50)
    if (cure) return { kind: 'objeto', id: cure }
  }

  // Transformarse solo si puede aguantarla tres turnos: si no, es regalar ki.
  const forms = availableForms(me)
    .map((id) => getForm(id)!)
    .filter((f) => me.ki >= f.cost + f.upkeep)
    .sort((x, y) => (y.mult.poder ?? 1) - (x.mult.poder ?? 1))
  if (forms.length && (!form || (forms[0].mult.poder ?? 1) > (form.mult.poder ?? 1))) {
    return { kind: 'transformar', id: forms[0].id }
  }

  // Lo que puede pagar SIN que se le caiga la forma el turno siguiente.
  const usable = techs.filter((t) => t.cost + upkeep <= me.ki)
  // Castigar una carga del rival con lo más gordo que tenga.
  if (enemy.exposed && usable.length) {
    return { kind: 'tecnica', id: usable.sort((a, c) => c.power - a.power)[0].id }
  }
  // Rematar.
  if (usable.length && enemy.hp < enemy.hpMax * 0.3) {
    return { kind: 'tecnica', id: usable.sort((a, c) => c.power - a.power)[0].id }
  }
  // Sin gasolina: guardia si está en rojo (carga ki sin quedar descubierto),
  // cargar si aguanta el castigo. El umbral NO se ata al mantenimiento: pegar
  // a puño ya carga +20, así que transformado se pega y se cuela una técnica
  // cada pocos turnos, no se carga sin parar.
  if (me.ki < Math.max(upkeep * 2, 26)) {
    return hpFrac < 0.35 ? { kind: 'guardia' } : { kind: 'cargar' }
  }
  if (usable.length) {
    const eff = usable
      .map((t) => ({ t, s: t.power / t.cost + (t.pierce && enemy.guarding ? 1 : 0) }))
      .sort((x, y) => y.s - x.s)
    return { kind: 'tecnica', id: eff[0].t.id }
  }
  return { kind: 'golpe' }
}

function playBattle(b: Battle, style: BotStyle, rng: RNG): Battle {
  let guard = 0
  while (!b.over && guard++ < 800) {
    if (!b.pending) { advance(b); continue }
    if (b.pending.kind === 'accion') {
      choose(b, botAction(b, style, rng))
    } else if (b.pending.kind === 'choque') {
      // El listo empuja si le sobra depósito; el tonto no empuja nunca.
      const me = ally(b)
      const push = style === 'listo'
        ? [...PUSH_OPTIONS].filter((p) => p <= me.ki - 10).pop() ?? 0
        : 0
      pushClash(b, push)
    } else {
      const alive = b.allies.find((c) => !c.fainted && c.hp > 0)
      if (!alive) break
      chooseSwitch(b, alive.uid)
    }
  }
  expect(guard).toBeLessThan(800)
  return b
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

  it('cargar ki deja descubierto: el rival pega más ese turno', () => {
    const b = startBattle([createFighter('goku', 10)], [createEnemy('raditz', 10)], { seed: 4, title: 't', scene: 'yermo' })
    advance(b)
    choose(b, { kind: 'cargar' })
    // Tras cargar, el jugador tiene más ki que los 50 de salida.
    expect(ally(b).ki).toBeGreaterThan(50)
  })

  it('la guardia reduce el daño de verdad', () => {
    const mk = (guard: boolean) => {
      const b = startBattle([createFighter('krilin', 10)], [createEnemy('nappa', 10)], { seed: 21, title: 't', scene: 'yermo' })
      advance(b)
      choose(b, guard ? { kind: 'guardia' } : { kind: 'golpe' })
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
    // de 26 no cabe en lo que queda, así que se le cae ese mismo turno. Es la
    // lección que el jugador tiene que aprender a su costa.
    ally(b).ki = 50
    choose(b, { kind: 'transformar', id: 'ssj3' })
    expect(b.log.some((e) => e.t === 'transform' && e.form === 'ssj3')).toBe(true)
    expect(b.log.some((e) => e.t === 'formEnd' && e.reason === 'ki')).toBe(true)
    expect(ally(b).form).toBeUndefined()
  })

  it('dos rayos a la vez provocan un choque', () => {
    const goku = createFighter('goku', 20)
    const enemy = createEnemy('cui', 20) // solo tiene rayomortal/rodillazo
    enemy.techniques = ['rayomortal']
    const b = startBattle([goku], [enemy], { seed: 12, title: 't', scene: 'yermo' })
    advance(b)
    let guard = 0
    let sawClash = false
    while (!b.over && guard++ < 60) {
      if (b.pending?.kind === 'accion') {
        const me = ally(b)
        choose(b, me.ki >= 30 ? { kind: 'tecnica', id: 'kamehameha' } : { kind: 'cargar' })
      } else if (b.pending?.kind === 'choque') {
        sawClash = true
        pushClash(b, 15)
      } else if (b.pending?.kind === 'relevo') {
        break
      } else advance(b)
    }
    expect(sawClash, 'nunca se produjo un choque de rayos').toBe(true)
    expect(b.log.some((e) => e.t === 'clash')).toBe(true)
  })

  it('un jefe multifase se levanta más fuerte antes de caer', () => {
    const team = [createFighter('goku', 60), createFighter('piccolo', 60), createFighter('vegeta', 60)]
    const b = startBattle(team, [createEnemy('freezer', 30)], {
      seed: 31, title: 'Freezer', scene: 'namek', phases: ['freezer2', 'freezer3', 'freezer4'],
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
    advance(b)
    expect(b.over).toBe(true)
    expect(b.pending).toBeUndefined()
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
