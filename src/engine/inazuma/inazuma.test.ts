// Tests del motor de Inazuma Rogue. Además de las comprobaciones de siempre,
// hay un BOT que juega torneos enteros: sirve para calibrar la dificultad sin
// tener que jugar 40 partidas a mano (mismo enfoque que `sim.test.ts` en el
// roguelike Pokémon).
import { describe, expect, it } from 'vitest'
import { RNG } from '@/utils/rng'
import { ITEMS, ITEM_BY_ID } from '@/data/inazuma/items'
import { elementMultiplier, ELEMENT_ADVANTAGE, ELEMENT_WEAKNESS } from './elements'
import { advance, chooseOption, playerScore } from './match'
import { actorTechnique } from './duel'
import { getTechnique } from '@/data/inazuma/techniques'
import { FORMATIONS } from '@/data/inazuma/formations'
import { getPlayerBase } from '@/data/inazuma/players'
import { TEAMS } from '@/data/inazuma/teams'
import {
  advanceLayer, applyMatchResult, applyPachangaResult, autoTraining, canLearn, createSave,
  fullRest, isEliminated, isMapComplete, recordMatchStats, startMatch, startPachanga,
} from './game'
import { nextRound, shoot } from './pachanga'
import { buildDraft } from './rewards'
import {
  autoLineup, canUpgradeTechnique, createPlayer, effectiveStats, lineupError, lineupShape, overall, ptMax,
  TECH_LEVEL_BONUS, techLevel, upgradeTechnique,
} from './roster'
import {
  availableNextNodes, bossIndexForLayer, currentOffer, generateMap, mapSegments,
  ROUTE_LAYERS_PER_SEGMENT, TOTAL_LAYERS,
} from './tournament'
import { ROSTER_MAX, type InazumaSave, type MatchState, type TournamentNode } from './types'

describe('elementos', () => {
  it('forma un ciclo cerrado sin elemento dominante', () => {
    expect(elementMultiplier('fuego', 'bosque')).toBe(ELEMENT_ADVANTAGE)
    expect(elementMultiplier('bosque', 'aire')).toBe(ELEMENT_ADVANTAGE)
    expect(elementMultiplier('aire', 'montana')).toBe(ELEMENT_ADVANTAGE)
    expect(elementMultiplier('montana', 'fuego')).toBe(ELEMENT_ADVANTAGE)
    expect(elementMultiplier('bosque', 'fuego')).toBe(ELEMENT_WEAKNESS)
    expect(elementMultiplier('fuego', 'aire')).toBe(1)
  })
})

describe('plantilla', () => {
  it('el once inicial de CADA instituto es legal', () => {
    // Las plantillas son las reales de la serie y cada una trae su reparto, así
    // que la formación de salida se elige según lo que el equipo tenga: el
    // Raimon con seis defensas y tres medios no puede jugar un 4-4-2.
    for (const teamId of TEAMS.map((t) => t.id)) {
      const save = createSave(1234, teamId)
      expect(save.roster, teamId).toHaveLength(11)
      expect(lineupError(save.roster, save.lineup, save.formation), teamId).toBeNull()
    }
  })

  it('subir de nivel ENSANCHA la brecha entre una estrella y un suplente', () => {
    // Se comparan atributos crudos, no `overall`: la valoración tiene tope 99 y
    // pondera por demarcación, así que no sirve para medir brechas.
    const gap = (lv: number) =>
      effectiveStats(createPlayer('axel-blaze', lv)).tiro - effectiveStats(createPlayer('william-glass', lv)).tiro
    expect(overall(createPlayer('axel-blaze', 40))).toBeGreaterThan(overall(createPlayer('axel-blaze', 1)))
    expect(gap(40)).toBeGreaterThan(gap(1))
  })

  it('el objeto equipado se refleja en los atributos, en porcentaje', () => {
    const p = createPlayer('axel-blaze', 10)
    const before = effectiveStats(p).tiro
    const after = effectiveStats({ ...p, item: 'banda-tiro' }).tiro
    expect(after).toBe(Math.round(before * 1.22))
    // …y por eso vale lo mismo al empezar el torneo que en la final.
    const lv40 = createPlayer('axel-blaze', 40)
    expect(effectiveStats({ ...lv40, item: 'banda-tiro' }).tiro)
      .toBe(Math.round(effectiveStats(lv40).tiro * 1.22))
  })

  it('los PT máximos crecen con el aguante', () => {
    expect(ptMax(createPlayer('mark-evans', 10))).toBeGreaterThan(ptMax(createPlayer('william-glass', 10)))
  })
})

// ---------------------------------------------------------------------------
// Bot: juega un partido entero eligiendo siempre la mejor opción disponible
// ---------------------------------------------------------------------------

function playMatch(save: InazumaSave, node: TournamentNode): MatchState {
  const setup = startMatch(save, node)
  if ('error' in setup) throw new Error(setup.error)
  const { match, rng } = setup
  let guard = 0
  while (match.phase !== 'finished' && guard++ < 5000) {
    if (match.phase === 'decision') {
      const best = (match.decision?.options ?? [])
        .filter((o) => !o.disabled)
        .slice()
        .sort((a, b) => b.odds - a.odds || a.cost - b.cost)[0]
      // Siempre hay al menos la opción «sin técnica», que nunca está bloqueada.
      expect(best).toBeDefined()
      chooseOption(match, rng, best.id)
    } else {
      advance(match, rng)
    }
  }
  expect(guard).toBeLessThan(5000)
  return match
}

describe('partido', () => {
  it('termina siempre, con 90 minutos y un resultado coherente', () => {
    for (let seed = 0; seed < 25; seed++) {
      const save = createSave(seed)
      const m = playMatch(save, firstBoss(save))
      expect(m.phase).toBe('finished')
      expect(m.minute).toBe(90)
      const [mine, theirs] = playerScore(m)
      expect(m.result).toBe(mine > theirs ? 'win' : mine === theirs ? 'draw' : 'loss')
      expect(m.events[m.events.length - 1]?.kind).toBe('fulltime')
      expect(m.events.some((e) => e.kind === 'halftime')).toBe(true)
    }
  })

  it('el marcador se mantiene en rangos de fútbol', () => {
    let goals = 0
    const N = 40
    for (let seed = 0; seed < N; seed++) {
      const save = createSave(seed * 31 + 7)
      const m = playMatch(save, firstBoss(save))
      const [a, b] = playerScore(m)
      expect(a).toBeLessThanOrEqual(8)
      expect(b).toBeLessThanOrEqual(8)
      goals += a + b
    }
    const avg = goals / N
    // Un partido debe parecer un partido: ni 0-0 sistemático ni 9-7.
    expect(avg).toBeGreaterThan(1)
    expect(avg).toBeLessThan(7)
  })

  it('equipar al once cambia de verdad lo que pasa en el campo', () => {
    // Regresión de un fallo real: los objetos daban puntos PLANOS y su peso se
    // diluía a medida que subían los atributos, hasta valer literalmente cero
    // en el torneo (medido con el bot). Ahora son porcentuales; este test fija
    // que el equipamiento se NOTA en el marcador.
    let changed = 0
    const N = 30
    for (let seed = 0; seed < N; seed++) {
      const play = (gear: boolean) => {
        const save = createSave(seed)
        save.layer = 6
        if (gear) {
          save.roster = save.roster.map((p) => (save.lineup.includes(p.uid) ? { ...p, item: 'espinilleras' } : p))
        }
        return playerScore(playMatch(save, firstBoss(save))).join('-')
      }
      if (play(false) !== play(true)) changed++
    }
    expect(changed).toBeGreaterThan(0)
  })

  it('las decisiones no se cobran PT que el jugador no tiene', () => {
    const save = createSave(99)
    const setup = startMatch(save, firstBoss(save))
    if ('error' in setup) throw new Error(setup.error)
    const { match, rng } = setup
    let guard = 0
    while (match.phase !== 'finished' && guard++ < 5000) {
      if (match.phase === 'decision') {
        for (const o of match.decision!.options) {
          if (!o.disabled && o.id.startsWith('tech:')) {
            const actor = [match.home, match.away]
              .flatMap((s) => [s.keeper, ...s.defs, ...s.mids, ...s.fwds])
              .find((a) => a.uid === match.decision!.actorUid)!
            expect(o.cost).toBeLessThanOrEqual(actor.pt)
          }
        }
        chooseOption(match, rng, 'plain')
      } else advance(match, rng)
    }
    const mine = match.home.isPlayer ? match.home : match.away
    for (const a of [mine.keeper, ...mine.defs, ...mine.mids, ...mine.fwds]) {
      expect(a.pt).toBeGreaterThanOrEqual(0)
    }
  })
})

// ---------------------------------------------------------------------------
// Bot de torneo completo
// ---------------------------------------------------------------------------

interface RunReport {
  won: boolean
  roundsCleared: number
  matchesWon: number
  /** Índice de la eliminatoria en la que cayó (8 = ganó el torneo). */
  diedAt: number
  avgLevel: number
  avgStamina: number
}

/**
 * Juega un torneo entero.
 *  - `dumb`: coge siempre el primer nodo y ficha a quien le pongan delante. Es
 *    el SUELO de habilidad: si este gana mucho, el modo es demasiado fácil.
 *  - `smart`: juega como jugaría una persona — descansa si va fundido, entrena
 *    si no, ficha lo mejor, realinea el once y EQUIPA a los titulares con lo
 *    que compra y le regalan. Es el TECHO razonable: si este no gana nunca, el
 *    modo es injusto, no difícil.
 */
function playTournament(seed: number, style: 'dumb' | 'smart'): RunReport {
  const useItems = style === 'smart'
  const smart = style !== 'dumb'
  const save = createSave(seed)
  const rng = new RNG(seed ^ 0x5f3759df)
  let matchesWon = 0
  const report = (won: boolean): RunReport => ({
    won,
    roundsCleared: save.layer,
    matchesWon,
    diedAt: bossIndexForLayer(save.layer),
    avgLevel: save.roster.reduce((a, p) => a + p.level, 0) / Math.max(1, save.roster.length),
    // Solo el once: el banquillo está siempre a 100 y taparía el desgaste.
    avgStamina: save.roster.filter((p) => save.lineup.includes(p.uid))
      .reduce((a, p) => a + p.stamina, 0) / Math.max(1, save.lineup.length),
  })

  while (!isMapComplete(save)) {
    // El bot juega con las MISMAS reglas que el jugador: solo puede ir a las
    // casillas conectadas con la actual. Si eligiera de toda la capa tendría
    // más libertad que una persona y la medición de dificultad no valdría.
    const offer = availableNextNodes(save.map, save.currentNodeId)
    if (!offer.length) break
    const tired = save.roster
      .filter((p) => save.lineup.includes(p.uid))
      .reduce((a, p) => a + p.stamina, 0) / Math.max(1, save.lineup.length)

    // El listo pondera nivel contra frescura, que es LA decisión del mapa:
    // la pachanga es la única fuente de nivel en ruta, pero cansa, y al jefe
    // hay que llegar entero. Encadenarlas a ciegas rinde PEOR que ir al azar
    // (medido: el bot que siempre elegía pachanga caía antes que el tonto).
    const pick = (k: TournamentNode['kind']) => offer.find((n) => n.kind === k)
    const node = !smart
      ? offer[0]
      // Desde que el banquillo también sube (un nivel menos), la pachanga
      // renta SIEMPRE, no solo cuando vas corto: antes se jugaba solo si ibas
      // por debajo del jefe y el bot se quedaba corto de nivel.
      : (tired < 55 ? pick('rairai') : undefined)
        ?? pick('pachanga')
        ?? pick('ojeador') ?? pick('tecnica') ?? pick('objeto') ?? pick('rairai')
        ?? offer[0]

    if (smart) save.lineup = autoLineup(save.roster)

    // La rotación es LA palanca del modo desde que el banquillo también sube:
    // a las pachangas van los frescos (suben igual y así no gastas a los
    // buenos) y al jefe salen los mejores.
    if (smart) {
      save.lineup = node.kind === 'pachanga'
        ? freshLineup(save)
        : autoLineup(save.roster, save.formation)
    }

    switch (node.kind) {
      case 'jefe':
      case 'final': {
        const m = playMatch(save, node)
        const result = m.result ?? 'draw'
        applyMatchResult(save, m, node)
        if (result === 'win') matchesWon++
        if (isEliminated(node, result)) return report(false)
        // Carta post-jefe: el listo ficha si puede, si no entrena.
        const draft = buildDraft(save, rng)
        const sign = draft.find((o) => o.kind === 'fichaje')
        if (sign?.kind === 'fichaje' && save.roster.length < ROSTER_MAX) {
          save.roster.push(createPlayer(sign.playerId, sign.level))
          if (smart) save.lineup = autoLineup(save.roster)
        } else {
          autoTraining(save, 4, 1)
        }
        if (useItems) { shop(save); equipStarters(save) }
        break
      }
      case 'pachanga': {
        const s = playPachanga(save, node)
        if (s) applyPachangaResult(save, s, node)
        break
      }
      case 'rairai':
        fullRest(save)
        break
      case 'objeto':
        if (node.itemId) save.bag.push(node.itemId)
        if (useItems) equipStarters(save)
        break
      case 'tecnica':
        // Se la queda el titular con menos técnicas de esa clase.
        if (node.techniqueId) learnTechnique(save, node.techniqueId)
        break
      case 'ojeador': {
        const o = buildDraft(save, rng).find((x) => x.kind === 'fichaje')
        if (o?.kind === 'fichaje' && save.roster.length < ROSTER_MAX) {
          save.roster.push(createPlayer(o.playerId, o.level))
          save.lineup = autoLineup(save.roster)
        }
        break
      }
      case 'tienda':
        if (useItems) { shop(save); equipStarters(save) }
        break
      default:
        break
    }

    advanceLayer(save, node)
  }
  return report(true)
}

/**
 * Once para una pachanga: el mismo reparto por líneas que `autoLineup` pero
 * ordenando por AGUANTE en vez de por calidad. Los suplentes se llevan los
 * niveles igual (uno menos), así que jugarlas con los frescos deja a las
 * estrellas enteras para el instituto.
 */
function freshLineup(save: InazumaSave): string[] {
  const f = FORMATIONS.find((x) => x.id === save.formation) ?? FORMATIONS[0]
  const byPos = (pos: string) => save.roster
    .filter((p) => getPlayerBase(p.baseId).position === pos)
    .sort((a, b) => b.stamina - a.stamina)
  const picked = [
    ...byPos('POR').slice(0, 1),
    ...byPos('DEF').slice(0, f.defs),
    ...byPos('MED').slice(0, f.mids),
    ...byPos('DEL').slice(0, f.fwds),
  ]
  if (picked.length < 11) {
    const rest = save.roster.filter((p) => !picked.includes(p)).sort((a, b) => b.stamina - a.stamina)
    picked.push(...rest.slice(0, 11 - picked.length))
  }
  return picked.slice(0, 11).map((p) => p.uid)
}

/** Juega una pachanga entera eligiendo siempre la mejor opción disponible. */
function playPachanga(save: InazumaSave, node: TournamentNode) {
  const setup = startPachanga(save, node)
  if ('error' in setup) return null
  const { pachanga, rng } = setup
  nextRound(pachanga, rng)
  let guard = 0
  while (pachanga.phase !== 'finished' && guard++ < 50) {
    if (pachanga.phase === 'decision') {
      const best = pachanga.options.filter((o) => !o.disabled)
        .slice().sort((a, b) => b.odds - a.odds || a.cost - b.cost)[0]
      shoot(pachanga, rng, best.id)
      nextRound(pachanga, rng)
    } else {
      nextRound(pachanga, rng)
    }
  }
  expect(guard).toBeLessThan(50)
  return pachanga
}

/** Enseña la técnica al titular de la demarcación que corresponda. */
function learnTechnique(save: InazumaSave, techId: string): void {
  const target = save.roster.find((p) => save.lineup.includes(p.uid) && canLearn(p, techId))
  if (!target) return
  save.roster = save.roster.map((p) => (p.uid === target.uid
    ? { ...p, techniques: [...p.techniques.slice(-3), techId] }
    : p))
}

/** El primer jefe del mapa: sirve de rival fijo en los tests de partido. */
function firstBoss(save: InazumaSave): TournamentNode {
  const seg = mapSegments(save.map)[bossIndexForLayer(save.layer)]
  return seg.boss!
}

/**
 * Compra equipamiento mientras quede presupuesto, de BARATO a caro: cada
 * jugador solo puede llevar un objeto, así que once titulares equipados con lo
 * asequible rinden más que un crack con el brazalete de 4200 ₽.
 */
function shop(save: InazumaSave): void {
  const gear = ITEMS.filter((i) => i.kind === 'equipo').sort((a, b) => a.price - b.price)
  let guard = 0
  while (guard++ < 20) {
    const buy = gear.find((i) => i.price <= save.coins)
    if (!buy) break
    save.coins -= buy.price
    save.bag.push(buy.id)
  }
}

/** Reparte lo que haya en la mochila entre los titulares que van sin objeto. */
function equipStarters(save: InazumaSave): void {
  for (const uid of save.lineup) {
    const p = save.roster.find((x) => x.uid === uid)
    if (!p || p.item) continue
    const idx = save.bag.findIndex((id) => ITEM_BY_ID.get(id)?.kind === 'equipo')
    if (idx < 0) return
    const [itemId] = save.bag.splice(idx, 1)
    save.roster = save.roster.map((x) => (x.uid === uid ? { ...x, item: itemId } : x))
  }
}

function summarise(label: string, reports: RunReport[]): { wins: number; avgDied: number } {
  const n = reports.length
  const wins = reports.filter((r) => r.won).length
  const avgDied = reports.reduce((a, r) => a + r.diedAt, 0) / n
  const byRound = Array.from({ length: 9 }, (_, i) => reports.filter((r) => r.diedAt === i).length)
  // eslint-disable-next-line no-console
  console.log(
    `[inazuma] ${label}: ${wins}/${n} títulos · cae en la elim. ${avgDied.toFixed(1)}/8 · `
    + `nivel medio ${(reports.reduce((a, r) => a + r.avgLevel, 0) / n).toFixed(0)} · `
    + `aguante ${(reports.reduce((a, r) => a + r.avgStamina, 0) / n).toFixed(0)} · `
    + `caídas por ronda [${byRound.join(',')}]`,
  )
  return { wins, avgDied }
}

describe('torneo', () => {
  it('el mapa tiene 8 tramos, cada uno con sus casillas y su jefe', () => {
    const map = generateMap(new RNG(7))
    expect(map.totalLayers).toBe(TOTAL_LAYERS)
    const segs = mapSegments(map)
    expect(segs).toHaveLength(8)
    expect(segs[7].boss?.kind).toBe('final')

    for (const seg of segs) {
      // El jefe cierra el tramo y va solo en su capa.
      expect(map.layers[seg.end]).toHaveLength(1)
      expect(seg.end - seg.start).toBe(ROUTE_LAYERS_PER_SEGMENT)
      for (let li = seg.start; li < seg.end; li++) {
        const nodes = currentOffer(map, li)
        expect(nodes.length).toBeGreaterThan(1)
        // Toda capa de ruta ofrece al menos una pachanga: sin ella se podría
        // cruzar un tramo entero sin subir de nivel.
        expect(nodes.some((n) => n.kind === 'pachanga')).toBe(true)
      }
    }
  })

  it('las casillas están conectadas y todas son alcanzables', () => {
    const map = generateMap(new RNG(11))
    // Desde la salida se entra por cualquiera de la primera capa.
    expect(availableNextNodes(map, null).map((n) => n.id).sort())
      .toEqual([...map.layers[0]].sort())

    for (let li = 0; li < map.layers.length - 1; li++) {
      const nextIds = new Set(map.layers[li + 1])
      const reached = new Set<string>()
      for (const id of map.layers[li]) {
        const n = map.nodes[id]
        expect(n.next.length).toBeGreaterThan(0)
        for (const nx of n.next) {
          // Solo se enlaza con la capa siguiente, nunca se salta ni se retrocede.
          expect(nextIds.has(nx)).toBe(true)
          reached.add(nx)
        }
      }
      // Y ninguna casilla queda huérfana: si no, se pintaría inalcanzable.
      expect(reached.size).toBe(nextIds.size)
    }
  })

  it('la formación manda: el once automático cuadra y el ilegal se detecta', () => {
    const save = createSave(77)
    for (const f of FORMATIONS) {
      const lineup = autoLineup(save.roster, f.id)
      const shape = lineupShape(save.roster, lineup)
      expect(lineup).toHaveLength(11)
      expect(shape.POR).toBe(1)
      // El Raimon inicial no tiene gente para todas las formaciones (solo 2
      // delanteros), así que se comprueba lo que sí debe cumplirse siempre:
      // que `lineupError` acepte lo que genera `autoLineup` cuando cuadra.
      const err = lineupError(save.roster, lineup, f.id)
      if (shape.DEF === f.defs && shape.MED === f.mids && shape.DEL === f.fwds) {
        expect(err).toBeNull()
      } else {
        expect(err).not.toBeNull()
      }
    }
    // Un once con dos porteros nunca vale.
    const keepers = save.roster.filter((p) => getPlayerBase(p.baseId).position === 'POR')
    if (keepers.length > 1) {
      expect(lineupError(save.roster, [keepers[0].uid, keepers[1].uid], '4-4-2')).not.toBeNull()
    }
  })

  it('las estadísticas por jugador se acumulan de los eventos', () => {
    const save = createSave(555)
    const m = playMatch(save, firstBoss(save))
    const mine = m.home.isPlayer ? m.home : m.away
    const uids = new Set([mine.keeper, ...mine.defs, ...mine.mids, ...mine.fwds].map((a) => a.uid))
    recordMatchStats(save, m.events, uids)

    const totals = Object.values(save.playerStats)
    expect(totals.length).toBeGreaterThan(0)
    // Los goles registrados cuadran con el marcador.
    const goals = totals.reduce((a, s) => a + s.goals, 0)
    expect(goals).toBe(playerScore(m)[0])
    // Y solo se apunta lo de los TUYOS: nada de contar duelos del rival.
    expect(Object.keys(save.playerStats).every((uid) => uids.has(uid))).toBe(true)
  })

  it('la Mejora sube la potencia de la técnica y se nota en el campo', () => {
    const p = createPlayer('axel-blaze', 20)
    const tech = p.techniques[0]
    expect(techLevel(p, tech)).toBe(0)
    expect(canUpgradeTechnique(p, tech)).toBe(true)

    let up = upgradeTechnique(p, tech)
    expect(techLevel(up, tech)).toBe(1)
    up = upgradeTechnique(up, tech)
    expect(techLevel(up, tech)).toBe(2)
    // Tope: no se puede mejorar indefinidamente.
    expect(canUpgradeTechnique(up, tech)).toBe(false)

    // Y la potencia efectiva llega al motor a través del actor.
    const base = getTechnique(tech)!
    const actor = { techLevels: up.techLevels } as Parameters<typeof actorTechnique>[0]
    expect(actorTechnique(actor, tech)!.power)
      .toBe(Math.round(base.power * (1 + 2 * TECH_LEVEL_BONUS)))
  })

  it('las casillas de objeto y técnica traen su contenido ya sorteado', () => {
    const map = generateMap(new RNG(3))
    const all = Object.values(map.nodes)
    expect(all.filter((n) => n.kind === 'objeto').every((n) => !!n.itemId)).toBe(true)
    expect(all.filter((n) => n.kind === 'tecnica').every((n) => !!n.techniqueId)).toBe(true)
    // Y hay de todo: el mapa no puede salir monotemático.
    const kinds = new Set(all.map((n) => n.kind))
    for (const k of ['pachanga', 'objeto', 'tecnica', 'ojeador', 'jefe'] as const) {
      expect(kinds.has(k)).toBe(true)
    }
  })

  it('la pachanga se decide rápido, cansa y solo da nivel si se gana', () => {
    for (let seed = 0; seed < 20; seed++) {
      const save = createSave(seed)
      const node = currentOffer(save.map, 0).find((n) => n.kind === 'pachanga')!
      const before = save.roster.map((p) => ({ lv: p.level, st: p.stamina }))
      const s = playPachanga(save, node)!
      expect(s.phase).toBe('finished')
      expect(s.rounds.length).toBeLessThanOrEqual(13)
      // Nunca acaba en tablas: hay muerte súbita.
      expect(s.goals[0]).not.toBe(s.goals[1])

      applyPachangaResult(save, s, node)
      // Cansa siempre: alguien tiene que haber perdido aguante.
      expect(save.roster.some((p, i) => p.stamina < before[i].st)).toBe(true)
      // Y solo se sube de nivel al ganar.
      const levelled = save.roster.some((p, i) => p.level > before[i].lv)
      expect(levelled).toBe(s.result === 'win')
    }
  })

  /**
   * Instantánea de dificultad. Los umbrales son deliberadamente amplios: están
   * para avisar de que un cambio ha DESPLAZADO la curva, no para clavar un
   * número. Los valores medidos al cerrar el modo (60 torneos por bot):
   *
   *   bot básico        ~2 % de títulos, cae sobre la eliminatoria 3.3 de 8
   *   bot con criterio  ~5 % de títulos, cae sobre la eliminatoria 3.5 de 8
   *
   * Un jugador humano tiene palancas que el bot no usa (elegir el once por
   * emparejamiento elemental, administrar PT, gastar consumibles, arriesgar en
   * los nodos «a por todas»), así que el techo real está por encima.
   */
  it('es difícil en piloto automático y jugar bien se nota', () => {
    const N = 60
    const dumb = summarise('bot básico ', Array.from({ length: N }, (_, i) => playTournament(i * 977 + 13, 'dumb')))
    const smart = summarise('bot con criterio', Array.from({ length: N }, (_, i) => playTournament(i * 977 + 13, 'smart')))

    // El Football Frontier NO se gana en piloto automático…
    expect(dumb.wins).toBeLessThan(N * 0.25)
    // …pero es ganable: si esto llega a 0, el torneo se ha vuelto imposible.
    expect(smart.wins).toBeGreaterThan(0)
    // Se llega a mitad del cuadro de largo…
    expect(smart.avgDied).toBeGreaterThan(2.5)
    // …y jugar con criterio tiene que NOTARSE. Se mide en TÍTULOS, no en la
    // ronda media de caída: rotar y administrar hace que llegues al final más
    // veces, pero también que arriesgues más por el camino, así que la ronda
    // media se mueve poco. Lo que sube claramente es cuántos torneos ganas.
    expect(smart.wins).toBeGreaterThan(dumb.wins)
  })
})
