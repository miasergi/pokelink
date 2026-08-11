// Tests del motor de Inazuma Rogue. Además de las comprobaciones de siempre,
// hay un BOT que juega torneos enteros: sirve para calibrar la dificultad sin
// tener que jugar 40 partidas a mano (mismo enfoque que `sim.test.ts` en el
// roguelike Pokémon).
import { describe, expect, it } from 'vitest'
import { RNG } from '@/utils/rng'
import { ITEMS, ITEM_BY_ID } from '@/data/inazuma/items'
import { elementMultiplier, ELEMENT_ADVANTAGE, ELEMENT_WEAKNESS } from './elements'
import { advance, chooseOption, playerScore } from './match'
import {
  applyMatchResult, autoTraining, createSave, fullRest, isEliminated, startMatch,
} from './game'
import { buildDraft } from './rewards'
import { autoLineup, createPlayer, effectiveStats, lineupError, overall, ptMax } from './roster'
import { buildOffer, isMatchRound, matchIndex, TOTAL_ROUNDS } from './tournament'
import { ROSTER_MAX, type InazumaSave, type MatchState } from './types'

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
  it('el once automático es legal', () => {
    const save = createSave(1234)
    expect(save.roster).toHaveLength(11)
    expect(lineupError(save.roster, save.lineup)).toBeNull()
  })

  it('subir de nivel ENSANCHA la brecha entre una estrella y un suplente', () => {
    // Se comparan atributos crudos, no `overall`: la valoración tiene tope 99 y
    // pondera por demarcación, así que no sirve para medir brechas.
    const gap = (lv: number) =>
      effectiveStats(createPlayer('axel-blaze', lv)).tiro - effectiveStats(createPlayer('erik-eagle', lv)).tiro
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
    expect(ptMax(createPlayer('mark-evans', 10))).toBeGreaterThan(ptMax(createPlayer('erik-eagle', 10)))
  })
})

// ---------------------------------------------------------------------------
// Bot: juega un partido entero eligiendo siempre la mejor opción disponible
// ---------------------------------------------------------------------------

function playMatch(save: InazumaSave, node: ReturnType<typeof buildOffer>[number]): MatchState {
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
      const node = buildOffer(0, new RNG(seed))[0]
      const m = playMatch(save, node)
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
      const m = playMatch(save, buildOffer(0, new RNG(seed))[0])
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
        save.round = 6
        if (gear) {
          save.roster = save.roster.map((p) => (save.lineup.includes(p.uid) ? { ...p, item: 'espinilleras' } : p))
        }
        return playerScore(playMatch(save, buildOffer(6, new RNG(seed))[0])).join('-')
      }
      if (play(false) !== play(true)) changed++
    }
    expect(changed).toBeGreaterThan(0)
  })

  it('las decisiones no se cobran PT que el jugador no tiene', () => {
    const save = createSave(99)
    const setup = startMatch(save, buildOffer(0, new RNG(99))[0])
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
    roundsCleared: save.round,
    matchesWon,
    diedAt: matchIndex(save.round),
    avgLevel: save.roster.reduce((a, p) => a + p.level, 0) / Math.max(1, save.roster.length),
    // Solo el once: el banquillo está siempre a 100 y taparía el desgaste.
    avgStamina: save.roster.filter((p) => save.lineup.includes(p.uid))
      .reduce((a, p) => a + p.stamina, 0) / Math.max(1, save.lineup.length),
  })

  while (save.round < TOTAL_ROUNDS) {
    const tired = save.roster
      .filter((p) => save.lineup.includes(p.uid))
      .reduce((a, p) => a + p.stamina, 0) / Math.max(1, save.lineup.length)
    // El listo prefiere descansar si el once va fundido; si no, entrenar.
    const node = !smart
      ? save.offer[0]
      : (tired < 55 ? save.offer.find((n) => n.kind === 'descanso') : undefined)
        ?? save.offer.find((n) => n.kind === 'entrenamiento')
        ?? save.offer.find((n) => n.kind === 'ojeador')
        ?? save.offer[0]
    if (!node) break

    if (node.kind === 'partido' || node.kind === 'final' || node.kind === 'amistoso') {
      if (smart) save.lineup = autoLineup(save.roster)
      const m = playMatch(save, node)
      const result = m.result ?? 'draw'
      applyMatchResult(save, m, node)
      if (result === 'win') matchesWon++
      if (isEliminated(node, result)) return report(false)
      // Carta post-partido: el listo ficha si mejora, si no entrena.
      const draft = buildDraft(save, rng)
      const sign = draft.find((o) => o.kind === 'fichaje')
      if (sign?.kind === 'fichaje' && save.roster.length < ROSTER_MAX) {
        save.roster.push(createPlayer(sign.playerId, sign.level))
        if (smart) save.lineup = autoLineup(save.roster)
      } else {
        autoTraining(save, 4, 1)
      }
      if (useItems) { shop(save); equipStarters(save) }
    } else if (node.kind === 'tienda' && useItems) {
      shop(save)
      equipStarters(save)
    } else if (node.kind === 'descanso') {
      fullRest(save)
    } else if (node.kind === 'entrenamiento') {
      autoTraining(save, 3, 2)
    } else if (node.kind === 'ojeador') {
      const offer = buildDraft(save, rng)
      const sign = offer.find((o) => o.kind === 'fichaje')
      if (sign?.kind === 'fichaje' && save.roster.length < ROSTER_MAX) {
        save.roster.push(createPlayer(sign.playerId, sign.level))
        save.lineup = autoLineup(save.roster)
      }
    }

    save.round += 1
    save.offer = buildOffer(save.round, rng)
  }
  return report(true)
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
  it('el cuadro alterna partido e interludio y tiene 15 rondas', () => {
    expect(TOTAL_ROUNDS).toBe(15)
    expect(isMatchRound(0)).toBe(true)
    expect(isMatchRound(1)).toBe(false)
    expect(isMatchRound(14)).toBe(true)
    expect(buildOffer(0, new RNG(1))).toHaveLength(2) // oficial + a por todas
    expect(buildOffer(14, new RNG(1))).toHaveLength(1) // la final no se elige
    expect(buildOffer(1, new RNG(1))).toHaveLength(3)
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
    // …y jugar con criterio tiene que NOTARSE.
    expect(smart.avgDied).toBeGreaterThan(dumb.avgDied)
  })
})
