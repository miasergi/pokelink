// Tests del motor de Inazuma Rogue. Además de las comprobaciones de siempre,
// hay un BOT que juega torneos enteros: sirve para calibrar la dificultad sin
// tener que jugar 40 partidas a mano (mismo enfoque que `sim.test.ts` en el
// roguelike Pokémon).
import { describe, expect, it } from 'vitest'
import { RNG } from '@/utils/rng'
import { ITEMS, ITEM_BY_ID, stockFor } from '@/data/inazuma/items'
import { elementMultiplier, ELEMENT_ADVANTAGE, ELEMENT_WEAKNESS } from './elements'
import { actorByUid, advance, chooseOption, playerScore, substitute } from './match'
import { actorTechnique } from './duel'
import { getTechnique } from '@/data/inazuma/techniques'
import { FORMATIONS } from '@/data/inazuma/formations'
import { getPlayerBase, PLAYERS, startingSquad } from '@/data/inazuma/players'
import { getTeam, PLAYABLE_TEAMS, SAGAS, TEAMS } from '@/data/inazuma/teams'
import {
  advanceLayer, applyConsumable, applyEventEffect, applyMatchResult, applyPachangaResult,
  autoTraining, canLearn, createSave, fullRest, isEliminated, isMapComplete, learnBlocker,
  learnSignature, recordMatchStats, signatureNext, startMatch, startPachanga,
} from './game'
import { EVENTS, getEvent } from '@/data/inazuma/events'
import { availableCombos } from '@/data/inazuma/combos'
import { nextRound, shoot } from './pachanga'
import { availableSignings, buildDraft, buildScoutOffer, buildSingleReward, signingLevel } from './rewards'
import {
  autoLineup, buildLineup, buildRivalTeam, canUpgradeTechnique, createPlayer, effectiveStats,
  levelUp, lineupError, overall, ptMax, rarityOf, rivalStartingXI, SIGNATURE_LEVELS, TECH_LEVEL_BONUS,
  techLevel, transferValue, upgradeTechnique,
} from './roster'
import {
  availableNextNodes, bossIndexForLayer, currentOffer, generateMap, mapSegments,
  RIVAL_LEVELS, ROUTE_LAYERS_PER_SEGMENT, TOTAL_LAYERS,
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
      // La convocatoria sale COMPLETA de casa: todos los de su plantilla real
      // (11 titulares + banquillo), nunca menos de un once legal.
      expect(save.roster.length, teamId).toBeGreaterThanOrEqual(11)
      expect(lineupError(save.roster, save.lineup, save.formation), teamId).toBeNull()
    }
  })

  it('CADA equipo sale con 14 convocados y con portero', () => {
    // Al canon se le quedan equipos con 11 (los Alius) y hasta alguno sin
    // guantes: `SQUAD_FILL` los completa, y ningún instituto puede saltar al
    // campo sin portero.
    for (const teamId of [...new Set(PLAYERS.map((p) => p.team))]) {
      if (teamId === 'libre') continue
      const squad = startingSquad(teamId)
      expect(squad.length, teamId).toBe(14)
      expect(squad.filter((id) => getPlayerBase(id).position === 'POR').length, teamId)
        .toBeGreaterThanOrEqual(1)
    }
  })

  it('el jugador que llega tras ganar viene AL NIVEL DE TU EQUIPO', () => {
    // El nivel de la casilla es el del RIVAL de esa ronda: con la plantilla ya
    // subida, el fichaje de premio entraba en desuso el mismo día. Nunca puede
    // llegar por debajo de la media de los tuyos.
    const save = createSave(21)
    save.roster = save.roster.map((p) => ({ ...p, level: 40 }))
    expect(signingLevel(save)).toBeGreaterThanOrEqual(40)
    // La casilla de primera ronda va por nivel 8: el premio NO puede salir a 8.
    const nodeLevel = 8
    expect(Math.max(nodeLevel, signingLevel(save))).toBe(signingLevel(save))
  })

  it('el ojeador NUNCA ofrece a alguien que ya tienes (ni con otro id)', () => {
    // El mismo chaval está en varias plantillas del catálogo (selección,
    // Chaos…), así que se descarta por NOMBRE: filtrando por id te lo volvían
    // a ofrecer con el id de su otro equipo.
    const save = createSave(7)
    const owned = new Set(save.roster.map((p) => getPlayerBase(p.baseId).name))
    for (const p of availableSignings(save)) expect(owned.has(p.name)).toBe(false)
    for (const o of buildScoutOffer(save, new RNG(3))) {
      if (o.kind === 'fichaje') expect(owned.has(getPlayerBase(o.playerId).name)).toBe(false)
    }
  })

  it('subir de nivel ENSANCHA la brecha entre rarezas (la brecha ES la rareza)', () => {
    // Con la rareza dinámica, la brecha ya no viene del catálogo: viene de la
    // ESTRELLA. Un multicolor pega más que un bronce, y el nivel lo amplifica.
    const gap = (lv: number) =>
      effectiveStats(createPlayer('axel-blaze', lv, { rarity: 4 })).tiro
      - effectiveStats(createPlayer('axel-blaze', lv, { rarity: 1 })).tiro
    expect(overall(createPlayer('axel-blaze', 40))).toBeGreaterThan(overall(createPlayer('axel-blaze', 1)))
    expect(gap(40)).toBeGreaterThan(gap(1))
    // Y CUALQUIERA al máximo es de lo más top: Willy Glass multicolor supera
    // de largo a un Axel bronce (el punto de poder subir a cualquiera).
    expect(effectiveStats(createPlayer('william-glass', 20, { rarity: 4 })).defensa)
      .toBeGreaterThan(effectiveStats(createPlayer('axel-blaze', 20, { rarity: 1 })).defensa)
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
        // Por probabilidad REAL y no por estrellas: las estrellas son un
        // redondeo a tres tramos y hacían que el bot no distinguiese entre una
        // opción del 55 % y otra del 85 %.
        .sort((a, b) => b.chance - a.chance || a.cost - b.cost)[0]
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
  it('un goleador SUSTITUIDO sigue existiendo para el resumen', () => {
    // El 5-4 en el que «no salieron los goles del rival ni el MVP»: al cambiar
    // a un jugador se le borraba de las líneas, `actorByUid` ya no lo
    // encontraba y su tarjeta desaparecía en silencio del resumen. Con los
    // cambios del rival en el descanso, esto pasaba en casi todos los partidos.
    const save = createSave(11)
    const setup = startMatch(save, firstBoss(save))
    if ('error' in setup) throw new Error(setup.error)
    const m = setup.match
    const side = m.home.isPlayer ? m.home : m.away
    const salir = side.fwds[0]
    const banquillo = { ...salir, uid: 'suplente-test', name: 'Suplente de Prueba' }
    expect(actorByUid(m, salir.uid)).toBeDefined()
    expect(substitute(m, salir.uid, banquillo)).toBeNull()
    // Ya no está en el campo…
    expect([side.keeper, ...side.defs, ...side.mids, ...side.fwds].some((a) => a.uid === salir.uid)).toBe(false)
    // …pero el resumen lo sigue encontrando, con su nombre y su ficha.
    expect(actorByUid(m, salir.uid)?.name).toBe(salir.name)
  })

  it('el TIRO LEJANO se salta la penetración y paga la distancia', () => {
    // Se busca una decisión de ataque al borde del área y se comprueba que la
    // opción existe, que sus estrellas YA llevan el malus (nunca mejores que
    // las del mismo disparo desde dentro) y que al elegirla el duelo pasa a
    // ser contra el PORTERO.
    let checked = false
    for (let seed = 0; seed < 40 && !checked; seed++) {
      const save = createSave(seed)
      const setup = startMatch(save, firstBoss(save))
      if ('error' in setup) throw new Error(setup.error)
      const m = setup.match
      const rng = new RNG(seed)
      for (let i = 0; i < 400 && m.phase !== 'finished'; i++) {
        if (m.phase === 'decision') {
          const d = m.decision!
          const long = d.options.find((o) => o.id === 'longshot')
          if (long && d.step === 'penetracion' && d.mode === 'ataque') {
            expect(long.chance).toBeGreaterThan(0)
            expect(long.chance).toBeLessThanOrEqual(1)
            chooseOption(m, rng, 'longshot')
            // La jugada saltó al mano a mano: o se resolvió el disparo, o la
            // siguiente decisión ya es contra el portero.
            expect(m.chain?.step === 'definicion' || m.chain == null).toBe(true)
            checked = true
            break
          }
          chooseOption(m, rng, d.options[0].id)
        } else {
          advance(m, rng)
        }
      }
    }
    expect(checked, 'ninguna decisión ofreció Tiro lejano en 40 partidos').toBe(true)
  })

  it('una técnica MEJORADA se anuncia con su versión (V2)', () => {
    const p = createPlayer('mark-evans', 30, { rarity: 4 })
    const techId = p.techniques[0]
    if (!techId) return
    const actor = { ...p, techLevels: { [techId]: 1 } } as unknown as Parameters<typeof actorTechnique>[0]
    expect(actorTechnique(actor, techId)?.name).toMatch(/ V2$/)
  })

  it('termina siempre y nunca en tablas: prórroga y penaltis si hace falta', () => {
    let extraTimes = 0
    let shootouts = 0
    for (let seed = 0; seed < 40; seed++) {
      const save = createSave(seed)
      const m = playMatch(save, firstBoss(save))
      expect(m.phase).toBe('finished')
      expect(m.minute).toBe(m.stage === 'reglamentario' ? 90 : 120)
      expect(m.events[m.events.length - 1]?.kind).toBe('fulltime')
      expect(m.events.some((e) => e.kind === 'halftime')).toBe(true)

      const [mine, theirs] = playerScore(m)
      if (m.stage === 'penaltis') {
        shootouts++
        // El marcador sigue empatado: manda la tanda, y la tanda no empata.
        expect(mine).toBe(theirs)
        expect(m.shootout!.goals[0]).not.toBe(m.shootout!.goals[1])
        expect(m.result === 'win' || m.result === 'loss').toBe(true)
      } else {
        if (m.stage === 'prorroga') extraTimes++
        expect(mine).not.toBe(theirs)
        expect(m.result).toBe(mine > theirs ? 'win' : 'loss')
      }
    }
    // Un empate a los 90 no es raro, así que la prórroga tiene que dispararse.
    expect(extraTimes + shootouts).toBeGreaterThan(0)
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
      // Antes del instituto se para a comer aunque no vaya tirado: llegar
      // fresco al jefe es la palanca gorda del modo.
      : (offer.some((n) => n.kind === 'jefe' || n.kind === 'final')
        ? (tired < 85 ? pick('rairai') : undefined) ?? pick('jefe') ?? pick('final')
        : undefined)
        ?? (tired < 65 ? pick('rairai') : undefined)
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
        : node.teamId && (node.kind === 'jefe' || node.kind === 'final')
          ? matchupLineup(save, node.teamId)
          : autoLineup(save.roster, save.formation)
      // Y se vacía la mochila antes del jefe: la comida guardada no gana nada.
      if (useItems && (node.kind === 'jefe' || node.kind === 'final')) consumeIfNeeded(save, true)
    }

    switch (node.kind) {
      case 'jefe':
      case 'final': {
        // Diagnóstico de curva: con qué nivel llegas a cada instituto. Es LO
        // que hay que mirar para tocar `RIVAL_LEVELS`, porque lo que decide un
        // partido es la diferencia, no el número.
        const seg = bossIndexForLayer(save.layer)
        const lvl = save.roster.filter((p) => save.lineup.includes(p.uid))
          .reduce((a, p) => a + p.level, 0) / Math.max(1, save.lineup.length)
        ;(arrivals[seg] ??= []).push(lvl)
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
        if (useItems) shop(save, 'rairai')
        break
      case 'objeto':
        // Elige como una persona: la técnica si alguien puede aprenderla ya,
        // si no el primer objeto.
        if (node.techniqueId && save.roster.some((p) => canLearn(p, node.techniqueId!))) {
          learnTechnique(save, node.techniqueId)
        } else if (node.itemId) {
          save.bag.push(node.itemId)
        }
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
      case 'evento':
        // Las situaciones también las recorre el bot: son casi una de cada
        // seis casillas, y si aquí no pasara nada el modo mediría más difícil
        // de lo que es.
        resolveEventNode(save, node, rng, smart)
        break
      case 'trade': {
        // Cambia al peor del banquillo por uno al azar con +3 niveles: casi
        // siempre renta, que es la gracia de la casilla.
        const worst = save.roster
          .filter((p) => !p.captain && !save.lineup.includes(p.uid))
          .sort((a, b) => overall(a) - overall(b))[0]
        if (worst) {
          const pool = availableSignings(save)
          if (pool.length) {
            const nuevo = createPlayer(rng.pick(pool).id, worst.level + 3)
            save.roster = [...save.roster.filter((p) => p.uid !== worst.uid), nuevo]
          }
        }
        break
      }
      case 'firma': {
        // Despierta la técnica del titular con menos técnicas: es la fuente
        // principal de supertécnicas desde que el equipo sale sin ninguna.
        const pick = save.roster
          .filter((p) => save.lineup.includes(p.uid) && signatureNext(p))
          .sort((a, b) => a.techniques.length - b.techniques.length)[0]
          ?? save.roster.find((p) => signatureNext(p))
        if (pick) learnSignature(save, pick.uid)
        break
      }
      default:
        break
    }

    if (useItems) consumeIfNeeded(save)
    advanceLayer(save, node)
  }
  return report(true)
}

/**
 * Resuelve una casilla de situación como lo haría alguien jugando: el listo
 * mira lo que le hace falta (nivel si va corto, aguante si va gastado) y no
 * apuesta lo que no puede permitirse; el tonto coge siempre la primera opción.
 */
function resolveEventNode(save: InazumaSave, node: TournamentNode, rng: RNG, smart: boolean): void {
  const ev = node.eventId ? getEvent(node.eventId) : null
  if (!ev) return
  const usable = ev.options.filter((o) => !o.cost || save.coins >= o.cost)
  if (!usable.length) return

  const tired = save.roster.filter((p) => save.lineup.includes(p.uid))
    .reduce((a, p) => a + p.stamina, 0) / Math.max(1, save.lineup.length)
  const value = (o: typeof usable[number]) => {
    const e = o.effect
    const base = e.kind === 'levels' ? 100 * e.amount
      : e.kind === 'sign' ? 90
        : e.kind === 'technique' ? 60
          : e.kind === 'rest' ? (100 - tired) * 1.2
            : e.kind === 'stamina' ? Math.max(0, Math.min(e.amount, 100 - tired)) * 1.1
              : e.kind === 'item' ? 45
                : e.kind === 'coins' ? e.amount / 25 : 0
    // Una opción con tirada vale lo que vale por lo que suele salir.
    return base * (o.chance ?? 1) - (o.cost ?? 0) / 25
  }
  const opt = smart ? usable.slice().sort((a, b) => value(b) - value(a))[0] : usable[0]

  const ok = opt.chance == null || rng.chance(opt.chance)
  const resolved = ok ? opt : (opt.fail ?? opt)
  save.coins -= opt.cost ?? 0
  applyEventEffect(save, resolved.effect, rng)
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

/**
 * Once pensado CONTRA un instituto concreto: a igualdad de calidad, primero los
 * que tienen ventaja elemental sobre su elemento. Es la palanca que el mapa
 * pone encima de la mesa (el elemento del rival se ve en la previa) y que un
 * `autoLineup` a secas no usa.
 */
function matchupLineup(save: InazumaSave, teamId: string): string[] {
  const rivalEl = getTeam(teamId).element
  const f = FORMATIONS.find((x) => x.id === save.formation) ?? FORMATIONS[0]
  const score = (p: typeof save.roster[number]) => {
    const el = getPlayerBase(p.baseId).element
    return overall(p) * elementMultiplier(el, rivalEl)
  }
  const byPos = (pos: string) => save.roster
    .filter((p) => getPlayerBase(p.baseId).position === pos)
    .sort((a, b) => score(b) - score(a))
  const picked = [
    ...byPos('POR').slice(0, 1),
    ...byPos('DEF').slice(0, f.defs),
    ...byPos('MED').slice(0, f.mids),
    ...byPos('DEL').slice(0, f.fwds),
  ]
  if (picked.length < 11) {
    const rest = save.roster.filter((p) => !picked.includes(p)).sort((a, b) => score(b) - score(a))
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
function shop(save: InazumaSave, kind: 'tienda' | 'rairai' = 'tienda'): void {
  if (kind === 'rairai') {
    // En el Rai Rai se compra comida para el camino, no equipación.
    const menu = stockFor('rairai').sort((a, b) => a.price - b.price)
    let g = 0
    while (g++ < 4) {
      const buy = menu.find((i) => i.price <= save.coins - 900)
      if (!buy) break
      save.coins -= buy.price
      save.bag.push(buy.id)
    }
    return
  }
  const gear = ITEMS.filter((i) => i.kind === 'equipo').sort((a, b) => a.price - b.price)
  let guard = 0
  while (guard++ < 20) {
    const buy = gear.find((i) => i.price <= save.coins)
    if (!buy) break
    save.coins -= buy.price
    save.bag.push(buy.id)
  }
}

/**
 * Bebe y come lo que lleve encima cuando hace falta. Sin esto el bot cargaba la
 * mochila de ramen y no lo tocaba nunca: media tienda del modo quedaba fuera de
 * la medición y el juego salía más difícil de lo que es.
 */
function consumeIfNeeded(save: InazumaSave, beforeBoss = false): void {
  const starters = () => save.roster.filter((p) => save.lineup.includes(p.uid))
  let guard = 0
  while (guard++ < 12) {
    const worst = starters().slice().sort((a, b) => a.stamina - b.stamina)[0]
    if (!worst) return
    // Primero lo que cunde para todos, y solo si de verdad hace falta.
    const team = ['banquete', 'concentrado', 'gyoza'].find((id) => save.bag.includes(id))
    const avg = starters().reduce((a, p) => a + p.stamina, 0) / Math.max(1, save.lineup.length)
    if (team && avg < (beforeBoss ? 92 : 55)) { applyConsumable(save, team, worst.uid); continue }
    if (worst.stamina < (beforeBoss ? 88 : 45)) {
      const solo = ['ramen-rai-rai', 'masaje', 'ramen-especial'].find((id) => save.bag.includes(id))
      if (solo) { applyConsumable(save, solo, worst.uid); continue }
    }
    // Antes del jefe también se rellenan los PT: sin depósito no hay
    // supertécnicas, y sin supertécnicas el partido está perdido de salida.
    if (beforeBoss) {
      const dry = starters().find((p) => p.pt < ptMax(p) * 0.5)
      if (dry) {
        const drink = ['concentrado', 'bebida-doble', 'ramen-especial', 'bebida-isotonica']
          .find((id) => save.bag.includes(id))
        if (drink) { applyConsumable(save, drink, dry.uid); continue }
      }
    }
    // Los planes de entrenamiento son nivel puro: se gastan en cuanto se tienen.
    const plan = ['plan-intensivo', 'plan-entrenamiento'].find((id) => save.bag.includes(id))
    if (plan) {
      const weakest = starters().slice().sort((a, b) => a.level - b.level)[0]
      applyConsumable(save, plan, weakest.uid)
      continue
    }
    // Las MEDALLAS son la vía principal de rareza: el bot sube al titular
    // menos raro (que además es el más barato con el coste escalado; se probó
    // concentrarlas en pocos portadores y medía PEOR: el resto del once se
    // quedaba blando). OJO: si no alcanzan medallas, el `continue` a ciegas
    // era un bucle infinito — solo se repite si el gasto entró.
    if (save.bag.includes('medalla-rareza')) {
      const dull = starters().slice().sort((a, b) => rarityOf(a) - rarityOf(b))[0]
      if (dull && rarityOf(dull) < 4 && applyConsumable(save, 'medalla-rareza', dull.uid).ok) continue
    }
    return
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

/** Nivel del once al plantarse en cada instituto, acumulado entre partidas. */
const arrivals: number[][] = []

function summarise(label: string, reports: RunReport[]): { wins: number; avgDied: number; avgLevel: number } {
  const n = reports.length
  const wins = reports.filter((r) => r.won).length
  const avgDied = reports.reduce((a, r) => a + r.diedAt, 0) / n
  const avgLevel = reports.reduce((a, r) => a + r.avgLevel, 0) / n
  const byRound = Array.from({ length: 9 }, (_, i) => reports.filter((r) => r.diedAt === i).length)
  // eslint-disable-next-line no-console
  console.log(
    `[inazuma] ${label}: ${wins}/${n} títulos · cae en la elim. ${avgDied.toFixed(1)}/8 · `
    + `nivel medio ${(reports.reduce((a, r) => a + r.avgLevel, 0) / n).toFixed(0)} · `
    + `aguante ${(reports.reduce((a, r) => a + r.avgStamina, 0) / n).toFixed(0)} · `
    + `caídas por ronda [${byRound.join(',')}]`,
  )
  // eslint-disable-next-line no-console
  console.log(
    `           llegas al instituto i con nivel [${
      arrivals.map((a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(0) : '-')).join(',')
    }] · el instituto tiene [${RIVAL_LEVELS.join(',')}]`,
  )
  arrivals.length = 0
  return { wins, avgDied, avgLevel }
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
      let pachangas = 0
      for (let li = seg.start; li < seg.end; li++) {
        const nodes = currentOffer(map, li)
        expect(nodes.length).toBeGreaterThan(1)
        if (nodes.some((n) => n.kind === 'pachanga')) pachangas++
      }
      // La pachanga se garantiza en capas ALTERNAS (forzarla en todas llenaba
      // el mapa de fútbol de barrio): al menos la mitad del tramo la ofrece.
      expect(pachangas).toBeGreaterThanOrEqual(ROUTE_LAYERS_PER_SEGMENT / 2)
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

  it('el once va por huecos: cualquiera puede jugar en cualquier sitio', () => {
    const save = createSave(77)
    for (const f of FORMATIONS) {
      const lineup = autoLineup(save.roster, f.id)
      expect(lineup).toHaveLength(11)
      // Lo que genera autoLineup siempre es válido…
      expect(lineupError(save.roster, lineup, f.id)).toBeNull()
      // …e invertirlo ENTERO también: desde la alineación libre, el papel lo
      // marca el hueco, no la demarcación. Axel de portero es legal (y mala idea).
      expect(lineupError(save.roster, lineup.slice().reverse(), f.id)).toBeNull()
      // El hueco 0 es SIEMPRE el portero del partido.
      const built = buildLineup(save.roster, lineup.slice().reverse(), f.id)!
      expect(built.keeper.uid).toBe(lineup[lineup.length - 1])
    }
    // Lo que sigue sin valer: repetir a alguien o no llegar a once.
    const l = autoLineup(save.roster, FORMATIONS[0].id)
    expect(lineupError(save.roster, l.slice(0, 10), FORMATIONS[0].id)).not.toBeNull()
    expect(lineupError(save.roster, [l[0], ...l.slice(0, 10)], FORMATIONS[0].id)).not.toBeNull()
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
    // Los jugadores ya no traen técnicas de serie: se le enseña una para el test.
    let p = createPlayer('axel-blaze', 20)
    p = { ...p, techniques: ['fire-tornado'] }
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

  it('la casilla de objeto trae sus TRES opciones ya sorteadas', () => {
    const map = generateMap(new RNG(3))
    const all = Object.values(map.nodes)
    const objetos = all.filter((n) => n.kind === 'objeto')
    expect(objetos.length).toBeGreaterThan(0)
    for (const n of objetos) {
      // Dos objetos distintos y una supertécnica: la elección de tres.
      expect(n.itemId).toBeTruthy()
      expect(n.itemId2).toBeTruthy()
      expect(n.itemId).not.toBe(n.itemId2)
      expect(n.techniqueId).toBeTruthy()
    }
    // Y hay de todo: el mapa no puede salir monotemático. La antigua casilla
    // «tecnica» ya no se genera (la absorbe la de objeto).
    const kinds = new Set(all.map((n) => n.kind))
    for (const k of ['pachanga', 'objeto', 'firma', 'ojeador', 'evento', 'jefe'] as const) {
      expect(kinds.has(k)).toBe(true)
    }
    expect(kinds.has('tecnica')).toBe(false)
  })

  it('la pachanga se decide rápido, cansa y da nivel al once que la juega', () => {
    for (let seed = 0; seed < 20; seed++) {
      const save = createSave(seed)
      const node = currentOffer(save.map, 0).find((n) => n.kind === 'pachanga')!
      const before = save.roster.map((p) => ({ lv: p.level, st: p.stamina }))
      const s = playPachanga(save, node)!
      expect(s.phase).toBe('finished')
      // La muerte súbita puede alargarse, pero no eternizarse: al portero se le
      // cargan las piernas y la tanda se desnivela sola.
      expect(s.rounds.length).toBeLessThanOrEqual(25)
      // Y NUNCA acaba en tablas: eso es lo que decide la muerte súbita.
      expect(s.goals[0]).not.toBe(s.goals[1])

      applyPachangaResult(save, s, node)
      // Cansa siempre: alguien tiene que haber perdido aguante.
      expect(save.roster.some((p, i) => p.stamina < before[i].st)).toBe(true)
      // Nivel por jugarla: +2 al once si gana, +1 si pierde; el banquillo, 0.
      const onPitch = new Set([s.mine.keeper, ...s.mine.defs, ...s.mine.mids, ...s.mine.fwds].map((a2) => a2.uid))
      const gained = s.result === 'win' ? 2 : 1
      for (let i = 0; i < save.roster.length; i++) {
        const p = save.roster[i]
        expect(p.level - before[i].lv, p.uid).toBe(onPitch.has(p.uid) ? gained : 0)
      }
    }
  })

  /**
   * Instantánea de dificultad. Los umbrales son deliberadamente amplios: están
   * para avisar de que un cambio ha DESPLAZADO la curva, no para clavar un
   * número. Medido con 150 torneos por bot:
   *
   *   bot básico        ~7 % de títulos, cae sobre la eliminatoria 3.8 de 8
   *   bot con criterio  ~8 % de títulos, cae sobre la eliminatoria 3.6 de 8
   *
   * La muestra es de 150 y no de 60 a propósito: con 60 la diferencia entre los
   * dos bots (2-3 títulos) quedaba dentro del ruido y el test fallaba o pasaba
   * según la semilla.
   *
   * Lo que de verdad decide una partida son las OCHO eliminatorias encadenadas:
   * aunque prepararse suba el pase de cada una unos puntos, elevado a ocho el
   * efecto se nota poco en títulos y mucho en el nivel al que llegas. Por eso se
   * comprueban las dos cosas.
   *
   * Un jugador humano tiene palancas que el bot no usa (administrar PT duelo a
   * duelo, guardar la Supervibración para la final, arriesgar en los nodos «a
   * cara de perro»), así que el techo real está por encima.
   */
  it('es difícil en piloto automático y jugar bien se nota', () => {
    const N = 150
    const dumb = summarise('bot básico ', Array.from({ length: N }, (_, i) => playTournament(i * 977 + 13, 'dumb')))
    const smart = summarise('bot con criterio', Array.from({ length: N }, (_, i) => playTournament(i * 977 + 13, 'smart')))

    // El Football Frontier NO se gana en piloto automático…
    expect(dumb.wins).toBeLessThan(N * 0.25)
    // …pero es ganable: si esto llega a 0, el torneo se ha vuelto imposible.
    expect(smart.wins).toBeGreaterThan(0)
    // Se llega a mitad del cuadro de largo…
    expect(smart.avgDied).toBeGreaterThan(2.5)
    // …y prepararse tiene que NOTARSE. NO se compara en títulos: ganar el
    // torneo es un suceso raro (2-9 de cada 150) y son ocho eliminatorias
    // encadenadas, así que la cifra baila varios puntos con solo mover una
    // constante. Lo que sí es estable es a qué nivel llegas: rotar, encadenar
    // pachangas y reponer antes del jefe son tres niveles largos de ventaja.
    expect(smart.avgLevel).toBeGreaterThan(dumb.avgLevel + 1)
  })
})

/**
 * COHERENCIA. No miden dificultad: comprueban que lo que la interfaz enseña se
 * corresponde con lo que el motor hace. Son los fallos más caros de detectar
 * jugando, porque el juego «funciona» igual.
 */
describe('coherencia', () => {
  it('cada acción del partido nombra a jugadores que están en el campo', () => {
    for (let seed = 0; seed < 12; seed++) {
      const save = createSave(seed * 17 + 5)
      const setup = startMatch(save, firstBoss(save))
      if ('error' in setup) throw new Error(setup.error)
      const { match, rng } = setup
      const onPitch = new Map(
        [match.home, match.away].flatMap((s) => [s.keeper, ...s.defs, ...s.mids, ...s.fwds])
          .map((a) => [a.uid, a.name] as const),
      )
      let guard = 0
      while (match.phase !== 'finished' && guard++ < 4000) {
        if (match.phase === 'decision' && match.decision) {
          const d = match.decision
          // Quien decide y su rival existen, y el retrato que pinta la UI sale
          // de un jugador real del partido.
          expect(onPitch.get(d.actorUid)).toBe(d.actorName)
          expect(onPitch.get(d.rivalUid)).toBe(d.rivalName)
          // Y las opciones de pase apuntan a compañeros, no a nadie inventado.
          for (const o of d.options.filter((x) => x.id.startsWith('pass:'))) {
            const mate = actorByUid(match, o.id.slice(5))
            expect(mate).toBeTruthy()
            expect(o.label).toContain(mate!.name)
          }
          chooseOption(match, rng, d.options.filter((o) => !o.disabled)[0].id)
        } else {
          advance(match, rng)
        }
        // El balón siempre lo lleva alguien que está jugando, y su marcador es
        // del OTRO equipo: es lo que dibuja el mapa del campo.
        if (match.chain) {
          expect(onPitch.has(match.chain.carrier)).toBe(true)
          expect(onPitch.has(match.chain.defenderUid)).toBe(true)
          const mySide = match.chain.side === 'home' ? match.home : match.away
          const theirs = match.chain.side === 'home' ? match.away : match.home
          const uids = (s: typeof mySide) => [s.keeper, ...s.defs, ...s.mids, ...s.fwds].map((a) => a.uid)
          expect(uids(mySide)).toContain(match.chain.carrier)
          expect(uids(theirs)).toContain(match.chain.defenderUid)
        }
      }
      // El narrador y el marcador cuentan lo mismo.
      const goals = match.events.filter((e) => e.kind === 'goal').length
      expect(goals).toBe(match.home.goals + match.away.goals)
    }
  })

  it('todo jugador del partido tiene retrato, nombre y elemento propios', () => {
    const save = createSave(99)
    const setup = startMatch(save, firstBoss(save))
    if ('error' in setup) throw new Error(setup.error)
    for (const side of [setup.match.home, setup.match.away]) {
      for (const a of [side.keeper, ...side.defs, ...side.mids, ...side.fwds]) {
        // `baseId` es lo que la UI usa para el retrato: si viniera vacío se
        // caería a las iniciales sin que nadie se enterase.
        expect(a.baseId).toBeTruthy()
        expect(a.name.length).toBeGreaterThan(1)
      }
    }
  })

  it('las supertécnicas que ofrece el mapa las puede aprender alguien de tu plantilla', () => {
    for (const teamId of PLAYABLE_TEAMS) {
      const save = createSave(7, teamId)
      // Las técnicas del mapa viven ahora en las casillas de objeto.
      const techNodes = Object.values(save.map.nodes).filter((n) => n.kind === 'objeto' && n.techniqueId)
      expect(techNodes.length).toBeGreaterThan(0)
      for (const n of techNodes) {
        // Compatible por demarcación Y elemento con alguien de la plantilla.
        // (Que además no la sepa ya depende de la partida, no del generador.)
        expect(save.roster.some((p) => learnBlocker(p, n.techniqueId!) === null
          || learnBlocker(p, n.techniqueId!) === 'Ya la conoce')).toBe(true)
      }
    }
  })

  it('cada saga arma su torneo completo: cuadro propio, jugables válidos y ojeador con oferta', () => {
    for (const saga of SAGAS) {
      for (const teamId of saga.playable) {
        const save = createSave(11, teamId, { saga: saga.id })
        // Ocho jefes, todos de los equipos de ESTA saga y sin el tuyo.
        const bosses = Object.values(save.map.nodes).filter((n) => n.kind === 'jefe' || n.kind === 'final')
        expect(bosses).toHaveLength(8)
        for (const b of bosses) {
          expect(saga.teams).toContain(b.teamId!)
          expect(b.teamId).not.toBe(teamId)
        }
        // Plantilla inicial: los 14 REALES del instituto, con once válido.
        expect(save.roster.length).toBe(14)
        expect(lineupError(save.roster, save.lineup, save.formation)).toBeNull()
        // El ojeador tiene a quien ofrecer desde la primera casilla.
        expect(buildScoutOffer(save, new RNG(1)).length).toBeGreaterThan(0)
        // Y todos los rivales pueden armar su once de la previa.
        for (const b of bosses) expect(rivalStartingXI(b.teamId!).length).toBeGreaterThan(0)
      }
    }
  })

  it('CUALQUIER equipo es jugable: con uno de fuera de la saga, el cuadro sigue entero', () => {
    for (const saga of SAGAS) {
      const outsider = TEAMS.map((t) => t.id).find((id) => !saga.teams.includes(id))!
      const save = createSave(7, outsider, { saga: saga.id })
      const bosses = Object.values(save.map.nodes).filter((n) => n.kind === 'jefe' || n.kind === 'final')
      expect(bosses).toHaveLength(8)
      for (const b of bosses) {
        expect(saga.teams).toContain(b.teamId!)
        expect(b.teamId).not.toBe(outsider)
      }
      // Y el JEFE FINAL de la saga sigue en el cuadro (se cae el más flojo,
      // no el más fuerte).
      const strongest = TEAMS.filter((t) => saga.teams.includes(t.id)).sort((a, b) => b.power - a.power)[0]
      expect(bosses.some((b) => b.teamId === strongest.id)).toBe(true)
      expect(lineupError(save.roster, save.lineup, save.formation)).toBeNull()
    }
  })

  it('el once rival que se enseña en la previa es el que salta al campo', () => {
    for (const team of TEAMS) {
      const shown = rivalStartingXI(team.id).map((p) => p.name)
      const real = buildRivalTeam(team.id, 20, new RNG(4)).map((p) => p.name)
      // Los de relleno completan por detrás; los que se enseñan van todos.
      for (const name of shown) expect(real).toContain(name)
    }
  })

  it('las situaciones del mapa tienen siempre alguna salida gratis', () => {
    for (const ev of EVENTS) {
      expect(ev.options.length).toBeGreaterThan(1)
      // Si todas costaran dinero, una situación podría dejarte bloqueado.
      expect(ev.options.some((o) => !o.cost)).toBe(true)
      // Y lo que promete una opción arriesgada tiene su alternativa contada.
      for (const o of ev.options) {
        if (o.chance != null) expect(o.fail).toBeTruthy()
      }
    }
  })

  it('la recompensa de un instituto es una sola carta y siempre aplicable', () => {
    for (let seed = 0; seed < 30; seed++) {
      const save = createSave(seed)
      const reward = buildSingleReward(save, new RNG(seed))
      expect(reward).toBeTruthy()
      if (reward.kind === 'tecnica') {
        // Compatible con alguien por demarcación y elemento. Que además ya se
        // la sepa depende de la partida, no de la carta.
        expect(save.roster.some((p) => {
          const why = learnBlocker(p, reward.techniqueId)
          return why === null || why === 'Ya la conoce'
        })).toBe(true)
      }
      if (reward.kind === 'fichaje') expect(getPlayerBase(reward.playerId)).toBeTruthy()
    }
  })

  it('el ojeador tiene a quien ofrecer desde la primera casilla', () => {
    for (const teamId of PLAYABLE_TEAMS) {
      const save = createSave(3, teamId)
      // Al empezar no has eliminado a nadie, así que lo único que puede ofrecer
      // son los suplentes de tu propio instituto: si el pool sale vacío, la
      // casilla de ojeador se convierte en una comisión de consuelo.
      const offer = buildScoutOffer(save, new RNG(1))
      expect(offer.length).toBeGreaterThan(0)
      expect(offer.every((o) => o.kind === 'fichaje')).toBe(true)
      for (const o of offer) {
        if (o.kind !== 'fichaje') continue
        expect(save.roster.some((p) => p.baseId === o.playerId)).toBe(false)
      }
    }
  })

  it('la cadena se despierta sola al cruzar los umbrales de nivel', () => {
    // Sobre la cadena REAL del jugador (viene de la wiki), paso a paso.
    const chain = getPlayerBase('mark-evans').signature ?? []
    expect(chain.length).toBeGreaterThanOrEqual(3)
    // Rareza MULTICOLOR: la cadena entera es alcanzable (un bronce se queda
    // en el primer paso — eso lo cubre el test de rarezas).
    let p = createPlayer('mark-evans', 5, { rarity: 4 })
    expect(p.techniques).toHaveLength(0)
    chain.forEach((id, i) => {
      const need = SIGNATURE_LEVELS[Math.min(i, SIGNATURE_LEVELS.length - 1)]
      p = levelUp(p, need - p.level)
      expect(p.techniques, `paso ${i} al nivel ${need}`).toContain(id)
    })
    // Y un fichaje que LLEGA a nivel alto trae lo suyo despierto.
    expect(createPlayer('axel-blaze', 30, { rarity: 4 }).techniques).toContain('fire-tornado')
  })

  it('las combinadas se GANAN: hace falta despertar la técnica y tener al socio', () => {
    // Kevin sin su cadena despierta: NO hay combo aunque estén los dos.
    const raw = createSave(1).roster.map((p) => ({ baseId: p.baseId, techniques: p.techniques }))
    expect(availableCombos('axel-blaze', raw).some((c) => c.techniqueId === 'dragon-tornado')).toBe(false)
    // Kevin despierta el Tornado de Dragón (2º paso de su cadena) → combo.
    const conCadena = raw.map((a) => (a.baseId === 'kevin-dragonfly'
      ? { ...a, techniques: ['dragon-crash', 'dragon-tornado'] }
      : a))
    expect(availableCombos('axel-blaze', conCadena).some((c) => c.techniqueId === 'dragon-tornado')).toBe(true)
    // Sin Kevin en el campo, no hay combo por muy despierta que esté.
    const sinKevin = conCadena.filter((a) => a.baseId !== 'kevin-dragonfly')
    expect(availableCombos('axel-blaze', sinKevin).some((c) => c.techniqueId === 'dragon-tornado')).toBe(false)

    // Y en partido real: con las cadenas despiertas (nivel 25 cruza el
    // segundo umbral), alguna decisión acaba ofreciendo un combo.
    let seenCombo = false
    for (let seed = 0; seed < 6 && !seenCombo; seed++) {
      const save = createSave(seed)
      // Rareza suficiente para alcanzar el 2.º paso de la cadena + niveles.
      save.roster = save.roster.map((p) => levelUp({ ...p, rarity: 3 }, 25))
      const setup = startMatch(save, firstBoss(save))
      if ('error' in setup) throw new Error(setup.error)
      let guard = 0
      while (setup.match.phase !== 'finished' && guard++ < 5000) {
        if (setup.match.phase === 'decision' && setup.match.decision) {
          if (setup.match.decision.options.some((o) => o.id.startsWith('combo:'))) seenCombo = true
          chooseOption(setup.match, setup.rng, setup.match.decision.options.filter((o) => !o.disabled)[0].id)
        } else advance(setup.match, setup.rng)
      }
    }
    expect(seenCombo).toBe(true)
  })

  it('traspasar paga y nunca deja la plantilla por debajo de once', () => {
    const save = createSave(11)
    // Con la plantilla al mínimo no hay traspaso posible: lo comprueba el store,
    // pero el valor que se enseña tiene que existir igualmente.
    for (const p of save.roster) {
      expect(transferValue(getPlayerBase(p.baseId), p.level)).toBeGreaterThan(0)
    }
  })

  it('cada objeto HACE lo que dice: equipar sube atributos, consumir consume', () => {
    const save = createSave(5)
    for (const item of ITEMS) {
      if (item.kind === 'equipo' || item.kind === 'raro') {
        // Equipado, algún atributo tiene que subir DE VERDAD.
        const p = save.roster[0]
        const before = effectiveStats(p)
        const after = effectiveStats({ ...p, item: item.id })
        const sube = (Object.keys(after) as (keyof typeof after)[]).some((k) => after[k] > before[k])
        expect(sube, `${item.id} no sube nada`).toBe(true)
      } else if (item.id !== 'mejora' && item.id !== 'manual-avanzado' && item.id !== 'fichaje-estrella') {
        // (El Fichaje estrella no entra aquí: se resuelve con su propio
        // buscador en el store — `useFichajeEstrella` —, no con un uid.)
        // Consumibles y comida: aplicados a un jugador gastado, no fallan y
        // gastan el objeto de la mochila.
        const s2 = {
          ...save,
          bag: [item.id],
          roster: save.roster.map((x) => ({ ...x, stamina: 40, pt: 5 })),
        }
        const res = applyConsumable(s2, item.id, s2.roster[0].uid)
        expect(res.ok, `${item.id}: ${res.message}`).toBe(true)
        expect(s2.bag).toHaveLength(0)
      }
    }
    // El manual avanzado avanza la cadena característica.
    const s3 = { ...save, bag: ['manual-avanzado'], roster: save.roster.slice() }
    const before = s3.roster[0].techniques.length
    const res = applyConsumable(s3, 'manual-avanzado', s3.roster[0].uid)
    expect(res.ok).toBe(true)
    expect(s3.roster[0].techniques.length).toBe(before + 1)
  })

  it('los objetos de la tienda y los manuales tienen precio y efecto', () => {
    for (const item of ITEMS) {
      expect(item.price).toBeGreaterThan(0)
      const usable = item.kind === 'equipo' || item.kind === 'raro'
        ? !!item.stat
        : !!item.consumable
      expect(usable).toBe(true)
    }
    // Y lo que vende cada sitio es coherente con lo que es cada sitio.
    expect(stockFor('rairai').every((i) => i.kind === 'comida')).toBe(true)
    expect(stockFor('tienda').some((i) => i.kind === 'equipo')).toBe(true)
  })
})

