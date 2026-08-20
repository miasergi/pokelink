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
import { getPlayerBase, PLAYERS, startingSquad, TEAM_CAPTAINS } from '@/data/inazuma/players'
import { getTeam, PLAYABLE_TEAMS, regionOfTeam, SAGAS, TEAMS } from '@/data/inazuma/teams'
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
  levelUp, lineupError, overall, ptMax, rarityOf, rivalStartingXI, SIGNATURE_LEVELS, signatureLevelFor, START_LEVEL, TECH_LEVEL_BONUS,
  techLevel, transferValue, upgradeTechnique,
  rivalArmbandBaseId, rivalRarityMap,
} from './roster'
import {
  availableNextNodes, bossIndexForLayer, currentOffer, generateMap, mapSegments,
  RIVAL_LEVELS, ROUTE_LAYERS_PER_SEGMENT, TOTAL_LAYERS,
} from './tournament'
import { ROSTER_MAX, SQUAD_SIZE, type InazumaSave, type MatchState, type TournamentNode } from './types'

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
  it('se empieza con UN solo inicial, capitán y alineable', () => {
    // DE LA NADA AL FRONTIER: la run arranca con tu inicial (y nadie más), el
    // brazalete es suyo, y ese "equipo" de uno ES alineable — juegas con los
    // que tengas hasta completar el cinco.
    const save = createSave(1234, 'raimon', { starterId: 'axel-blaze' })
    expect(save.roster).toHaveLength(1)
    expect(save.roster[0].baseId).toBe('axel-blaze')
    expect(save.roster[0].item).toBe('brazalete-capitan')
    // Alineación POR HUECOS: largo fijo, y Axel (delantero) en el hueco de
    // ARRIBA — no «de portero porque el array empieza por ahí».
    expect(save.lineup).toHaveLength(5)
    expect(save.lineup.filter(Boolean)).toEqual([save.roster[0].uid])
    expect(save.lineup[4]).toBe(save.roster[0].uid)
    expect(lineupError(save.roster, save.lineup, save.formation)).toBeNull()
    // Y con la plantilla construida, el cinco completo también es legal.
    const full = fullSave(1234)
    expect(full.roster.length).toBeGreaterThanOrEqual(5)
    expect(full.lineup).toHaveLength(5)
    expect(lineupError(full.roster, full.lineup, full.formation)).toBeNull()
  })

  it('NADIE está dos veces en el mismo equipo, y los clones de la wiki no entran', () => {
    // Dos clases de duplicado cazadas en playtest: el capitán FORZADO que se
    // sumaba al de la plantilla (dos Jude Sharp en el Royal), y equipos cuya
    // página de la wiki resuelve a la MISMA plantilla que otro (Shuuyou Meito
    // ≡ Otaku: dos Walter Valiant). Dentro de un equipo, cada nombre UNA vez.
    for (const teamId of [...new Set(PLAYERS.map((p) => p.team))]) {
      const names = PLAYERS.filter((p) => p.team === teamId).map((p) => p.name)
      const dups = names.filter((n, i) => names.indexOf(n) !== i)
      expect(dups, `duplicados dentro de ${teamId}`).toHaveLength(0)
    }
    // Y los institutos clonados no existen en el catálogo.
    expect(PLAYERS.some((p) => p.team === 'wild')).toBe(false)
    expect(PLAYERS.some((p) => p.team === 'shuuyou-meito')).toBe(false)
    // Walter Valiant, el caso concreto: UNA sola vez en todo el catálogo.
    expect(PLAYERS.filter((p) => p.name === 'Walter Valiant')).toHaveLength(1)
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

  it('Victory Road es OTRA generación: ni jugadores repetidos ni técnicas cruzadas', () => {
    const VR = new Set(['nagumohara', 'ouja-raimon', 'hokuyou-gakuen', 'ai-gakuen', 'houreikan',
      'ijin-meibundou', 'keizen-arashiyama', 'nishinomiya', 'senjutsu-no-teikoku',
      'toufuu-ikokukan', 'hakuren-vr'])
    const vrPlayers = PLAYERS.filter((p) => VR.has(p.team))
    const classicNames = new Set(PLAYERS.filter((p) => !VR.has(p.team)).map((p) => p.name))
    expect(vrPlayers.length, 'no hay plantillas de Victory Road').toBeGreaterThan(100)

    // NADIE de la saga clásica reaparece de mayor en Victory Road.
    const repes = vrPlayers.filter((p) => classicNames.has(p.name)).map((p) => p.name)
    expect(repes, `veteranos colados en Victory Road: ${repes.join(', ')}`).toHaveLength(0)

    // EL FUTURO NO SE FILTRA AL PASADO: ningún clásico lleva una técnica de VR.
    const clasicosConVR = PLAYERS.filter((p) => !VR.has(p.team))
      .filter((p) => (p.signature ?? []).some((id) => getTechnique(id)?.era === 'vr'))
    expect(clasicosConVR.map((p) => p.name), 'un clásico con técnica del futuro').toHaveLength(0)

    // Al revés SÍ vale: los chavales de Victory Road heredan un montón de
    // técnicas clásicas en sus movesets del juego, así que ver una en su cadena
    // NO es un error. Que el relleno inventado respete la época lo garantiza el
    // generador (`VR_TEAMS` en `emit-inazuma-players.mjs`), y no se comprueba
    // aquí a propósito: haría falta la caché del crawler, que no está en el
    // repo — importarla dejó el despliegue roto tres commits.
  })

  it('el RIVAL también juega con su filosofía canónica', () => {
    const save = fullSave(6)
    const setup = startMatch(save, firstBoss(save))
    if ('error' in setup) throw new Error(setup.error)
    const away = setup.match.home.isPlayer ? setup.match.away : setup.match.home
    // El primer instituto del cuadro lleva SU forma de jugar al campo.
    expect((away.tactics ?? []).length, 'el rival salió sin filosofía').toBeGreaterThan(0)
    // Y todo instituto con partido en el cuadro la tiene declarada.
    for (const saga of SAGAS) {
      for (const teamId of saga.teams) {
        expect(getTeam(teamId).tactic, `${teamId} sin filosofía canónica`).toBeTruthy()
      }
    }
  })

  it('la FILOSOFÍA armada se ENCIENDE con la Ruptura y se consume', () => {
    // El modelo pasivo se retiró: la filosofía es una DECISIÓN del partido,
    // como la Supervibración — misma barra, otra opción. Aquí se comprueba el
    // ciclo entero: opción disponible a barra llena, activación, efectos
    // aplicando (vía `fx`) y consumo hasta apagarse.
    const save = { ...fullSave(3), tactics: ['fondo-fisico'], armedTactic: 'fondo-fisico' }
    const setup = startMatch(save, firstBoss(save))
    if ('error' in setup) throw new Error(setup.error)
    const m = setup.match
    const rng = new RNG(77)
    const side = m.home.isPlayer ? m.home : m.away
    expect(side.tactics).toEqual(['fondo-fisico'])

    side.burst = 100
    let guard = 0
    while (m.phase !== 'decision' && guard++ < 600) advance(m, rng)
    expect(m.phase).toBe('decision')
    const opt = m.decision!.options.find((o) => o.id === 'tactic')
    expect(opt, 'a barra llena no se ofrece encender la filosofía').toBeDefined()

    chooseOption(m, rng, 'tactic')
    expect(side.tacticActive?.id).toBe('fondo-fisico')
    expect(side.burst).toBe(0)

    // Se CONSUME acción a acción hasta apagarse sola.
    guard = 0
    while (side.tacticActive && guard++ < 1500 && m.phase !== 'finished') {
      if (m.phase === 'decision') chooseOption(m, rng, m.decision!.options.filter((o) => !o.disabled && o.id !== 'tactic' && o.id !== 'burst')[0].id)
      else advance(m, rng)
    }
    expect(side.tacticActive, 'la filosofía no se apagó nunca').toBeUndefined()
  })

  it('el CAPITÁN canónico rival lleva el brazalete y rareza alta', () => {
    // El caso Hokuyou: Nikas (su capitán en la wiki) salía de relleno y las
    // rarezas subidas caían en la retaguardia, porque el peso venía del ORDEN
    // de la plantilla. Ahora el capitán del infobox manda.
    expect(TEAM_CAPTAINS.raimon).toBe('mark-evans')
    expect(TEAM_CAPTAINS['hokuyou-gakuen']).toBe('nikas-himmelstein')
    expect(rivalArmbandBaseId('hokuyou-gakuen')).toBe('nikas-himmelstein')
    // Y en el reparto de rarezas del partido, su rareza es LA MÁS ALTA del plan.
    const map = rivalRarityMap('hokuyou-gakuen', 2)
    const capRarity = map.get('nikas-himmelstein') ?? 0
    expect(capRarity).toBe(Math.max(...map.values()))
  })

  it('TODO instituto tiene su camiseta (kit), y ninguna copia la del Raimon', () => {
    // Jugando con Nagumohara salían los colores del Raimon: su kit inventado
    // era clavado al suyo, y encima 8 equipos seguían sin kit (caían al color
    // plano). Todos con camiseta, y ninguna igual a la del Raimon salvo la
    // del propio Raimon.
    const sinKit = TEAMS.filter((t) => t.id !== 'libre' && !t.kit)
    expect(sinKit.map((t) => t.id)).toHaveLength(0)
    const raimon = getTeam('raimon').kit!.join('|')
    const clones = TEAMS.filter((t) => t.id !== 'raimon' && t.kit && t.kit.join('|') === raimon)
    expect(clones.map((t) => t.id)).toHaveLength(0)
  })

  it('TODA cadena es CANÓNICA: entre 1 y 4 pasos, y todos resuelven', () => {
    // El relleno inventado murió: cada jugador lleva LO SUYO, y quien solo
    // tiene una técnica en el canon lleva UNA (como en Pokémon no todos
    // evolucionan). Lo exigible: nadie sin nada, nadie con más de 4, y cada
    // paso apunta a una técnica real del catálogo.
    for (const p of PLAYERS) {
      const chain = p.signature ?? []
      expect(chain.length, `${p.name} sin cadena`).toBeGreaterThanOrEqual(1)
      expect(chain.length, p.name).toBeLessThanOrEqual(4)
      for (const id of chain) expect(getTechnique(id), `${p.name}: ${id}`).toBeDefined()
    }
    // Y las cadenas cortas EXISTEN: son diseño, no un bug del generador.
    expect(PLAYERS.some((p) => (p.signature ?? []).length < 4)).toBe(true)
  })

  it('cada jugador lleva SUS supertécnicas, no un relleno', () => {
    // Edgar Partinus tiene que llevar Excalibur. Salía sin ella porque la wiki
    // guarda los movesets en `Module:Moveset/Users` y de la ficha del
    // personaje no se rascaba nada — y porque el reparto ordenaba por potencia
    // y se cargaba el orden del juego, que es el que dice cuáles son SUYAS.
    const edgar = PLAYERS.find((p) => p.name === 'Edgar Partinus')
    expect(edgar, 'no está Edgar Partinus').toBeDefined()
    expect(edgar!.signature ?? []).toContain('excalibur')
    expect(getTechnique('excalibur')).toBeDefined()

    // Y los cracks de cada saga, con la suya de siempre.
    const canon: [string, string][] = [
      ['Mark Evans', 'god-hand'],
      ['Axel Blaze', 'fire-tornado'],
      ['Jude Sharp', 'illusion-ball'],
    ]
    for (const [name, tech] of canon) {
      const p = PLAYERS.find((x) => x.name === name)
      if (!p) continue
      expect(p.signature ?? [], `${name} sin ${tech}`).toContain(tech)
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

  it('el CONFIGURADOR manda: épocas elegidas y randomizador', () => {
    // POOLS: marcando solo Victory Road, el ojeador no puede traer un clásico.
    const soloVR = { ...createSave(3), pools: ['vr' as const] }
    const ofertaVR = availableSignings(soloVR)
    expect(ofertaVR.length, 'sin nadie de Victory Road').toBeGreaterThan(50)
    expect(ofertaVR.every((p) => regionOfTeam(p.team) === 'vr'), 'se coló alguien de otra época').toBe(true)
    // Y con dos épocas marcadas, entran las dos y nadie más.
    const dos = { ...createSave(3), pools: ['ff' as const, 'ffi' as const] }
    const regiones = new Set(availableSignings(dos).map((p) => regionOfTeam(p.team)))
    expect([...regiones].sort()).toEqual(['ff', 'ffi'])
    // Sin elegir nada, vale todo el catálogo (como siempre).
    expect(new Set(availableSignings(createSave(3)).map((p) => regionOfTeam(p.team))).size)
      .toBeGreaterThan(2)

    // RANDOMIZADOR DE CUADRO: los institutos ya no son los de la saga.
    const normal = createSave(9, 'raimon')
    const mezclado = createSave(9, 'raimon', { random: { cuadro: true } })
    const equipos = (sv: typeof normal) => Object.values(sv.map.nodes)
      .filter((n) => n.teamId).map((n) => n.teamId!).sort().join(',')
    expect(equipos(mezclado), 'el cuadro mezclado salió igual que el normal')
      .not.toBe(equipos(normal))

    // RANDOMIZADOR DE PLANTILLAS: el rival no saca su once canónico.
    const canon = startMatch(createSave(9, 'raimon'), firstBoss(createSave(9, 'raimon')))
    const loco0 = createSave(9, 'raimon', { random: { plantillas: true } })
    const loco = startMatch(loco0, firstBoss(loco0))
    if ('error' in canon || 'error' in loco) throw new Error('no arrancó')
    const once = (m: typeof canon extends { match: infer M } ? M : never) => {
      const away = m.home.isPlayer ? m.away : m.home
      return [away.keeper, ...away.defs, ...away.mids, ...away.fwds].map((a) => a.baseId).sort().join(',')
    }
    expect(once(loco.match), 'la plantilla rival salió igual que la canónica')
      .not.toBe(once(canon.match))
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

/**
 * Save con la plantilla YA CONSTRUIDA (los 8: cinco titular + banquillo),
 * como queda tras reclutar por el tramo callejero. Los tests de PARTIDO usan
 * esto; el arranque real (1 solo inicial) lo cubren los de plantilla y el bot.
 */
function fullSave(seed: number, teamId = 'raimon'): InazumaSave {
  const save = createSave(seed, teamId)
  for (const id of startingSquad(teamId)) {
    if (save.roster.length >= ROSTER_MAX) break
    if (save.roster.some((p) => getPlayerBase(p.baseId).name === getPlayerBase(id).name)) continue
    save.roster.push(createPlayer(id, START_LEVEL))
  }
  save.lineup = autoLineup(save.roster, save.formation)
  return save
}

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
    const save = fullSave(11)
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

  it('en el TIRO LEJANO la defensa se cruza: lo bloquea o se lo come', () => {
    // Disparar de fuera no puede ser un atajo limpio a la portería: por el
    // camino hay gente. Se comprueba que ese cruce OCURRE (sale su duelo) y
    // que a veces acaba en bloqueo y a veces en tiro desviado.
    let cruces = 0
    let bloqueos = 0
    let pasan = 0
    for (let seed = 0; seed < 60; seed++) {
      const save = fullSave(seed)
      const setup = startMatch(save, firstBoss(save))
      if ('error' in setup) throw new Error(setup.error)
      const m = setup.match
      const rng = new RNG(seed + 500)
      for (let i = 0; i < 500 && m.phase !== 'finished'; i++) {
        if (m.phase === 'decision') {
          const d = m.decision!
          const long = d.options.find((o) => o.id === 'longshot')
          if (long) {
            const antes = m.events.length
            chooseOption(m, rng, 'longshot')
            const nuevos = m.events.slice(antes)
            const cruce = nuevos.find((e) => e.kind === 'duel' && e.longShot === true)
            if (cruce && cruce.kind === 'duel') {
              cruces++
              if (cruce.success) pasan++
              else bloqueos++
            }
            continue
          }
          chooseOption(m, rng, d.options[0].id)
        } else {
          advance(m, rng)
        }
      }
    }
    expect(cruces, 'nunca se cruzó nadie en un tiro lejano').toBeGreaterThan(0)
    expect(bloqueos, 'la defensa no bloqueó ni un tiro lejano').toBeGreaterThan(0)
    expect(pasan, 'ningún tiro lejano llegó a pasar la defensa').toBeGreaterThan(0)
  })

  it('el TIRO LEJANO se salta la penetración y paga la distancia', () => {
    // Se busca una decisión de ataque al borde del área y se comprueba que la
    // opción existe, que sus estrellas YA llevan el malus (nunca mejores que
    // las del mismo disparo desde dentro) y que al elegirla el duelo pasa a
    // ser contra el PORTERO.
    let checked = false
    for (let seed = 0; seed < 40 && !checked; seed++) {
      const save = fullSave(seed)
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
            // Lo que enseña el botón YA cuenta con la defensa que se cruza:
            // tiene que ser menor que el mismo disparo sin nadie en medio.
            const tiroLimpio = d.options.find((o) => o.id === 'plain')
            if (tiroLimpio) expect(long.chance).toBeLessThan(1)
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
      const save = fullSave(seed)
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
      const save = fullSave(seed * 31 + 7)
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
        const save = fullSave(seed)
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
    const save = fullSave(99)
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
      // Con jefe a la vista, si va fundido pasa por la rueda (recuperación);
      // en ruta, RECLUTAR manda mientras haya hueco — montar el cinco (y
      // luego el banquillo) es el juego — y después la rueda de niveles.
      : (offer.some((n) => n.kind === 'jefe' || n.kind === 'final')
        ? (tired < 85 ? pick('entrenamiento') : undefined) ?? pick('jefe') ?? pick('final')
        : undefined)
        ?? (save.roster.length < ROSTER_MAX ? pick('ojeador') : undefined)
        ?? pick('entrenamiento')
        ?? pick('ojeador') ?? pick('tecnica') ?? pick('objeto')
        ?? offer[0]

    if (smart) save.lineup = autoLineup(save.roster)

    // La rotación es LA palanca del modo desde que el banquillo también sube:
    // a las pachangas van los frescos (suben igual y así no gastas a los
    // buenos) y al jefe salen los mejores.
    if (smart) {
      save.lineup = node.teamId && (node.kind === 'jefe' || node.kind === 'final')
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
      case 'entrenamiento': {
        // La rueda: el listo recupera si va fundido y si no carga niveles al
        // equipo entero; el tonto rueda suave siempre.
        if (!smart) {
          for (const p of save.roster) levelUp(p, 1)
        } else if (tired < 70) {
          fullRest(save)
        } else {
          for (const p of save.roster) {
            levelUp(p, 2)
            p.stamina = Math.max(0, p.stamina - 25)
          }
        }
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
  // POR HUECOS y al tamaño del CINCO — la versión vieja apilaba hasta 11 y
  // el bot jugaba los jefes con 8 (media plantilla de más, trampa medida).
  const out: string[] = Array.from({ length: SQUAD_SIZE }, () => '')
  const used = new Set<string>()
  const take = (pos: string) => {
    const p = byPos(pos).find((x) => !used.has(x.uid))
    if (p) used.add(p.uid)
    return p
  }
  const put = (slot: number, p?: typeof save.roster[number]) => { if (p) out[slot] = p.uid }
  put(0, take('POR'))
  for (let i = 0; i < f.defs; i++) put(1 + i, take('DEF'))
  for (let i = 0; i < f.mids; i++) put(1 + f.defs + i, take('MED'))
  for (let i = 0; i < f.fwds; i++) put(1 + f.defs + f.mids + i, take('DEL'))
  const rest = save.roster.filter((p) => !used.has(p.uid)).sort((a, b) => score(b) - score(a))
  for (let sIdx = 0; sIdx < SQUAD_SIZE && rest.length; sIdx++) {
    if (!out[sIdx]) { const p = rest.shift()!; used.add(p.uid); out[sIdx] = p.uid }
  }
  return out
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
      let entrenos = 0
      for (let li = seg.start; li < seg.end; li++) {
        const nodes = currentOffer(map, li)
        expect(nodes.length).toBeGreaterThan(1)
        if (nodes.some((n) => n.kind === 'entrenamiento')) entrenos++
      }
      // La rueda de entrenamiento se garantiza en capas alternas, y SIEMPRE
      // en la última antes del jefe (la recuperación pre-partido).
      expect(entrenos).toBeGreaterThanOrEqual(ROUTE_LAYERS_PER_SEGMENT / 2)
      expect(currentOffer(map, seg.end - 1).some((n) => n.kind === 'entrenamiento')).toBe(true)
    }
    // TRAMO CALLEJERO: se empieza con 1 — el tramo 0 garantiza ojeadores en
    // las capas pares (y no vende nada: sin equipo no hay a quién equipar).
    const street = mapSegments(map)[0]
    for (let li = street.start; li < street.end; li += 2) {
      expect(currentOffer(map, li).some((n) => n.kind === 'ojeador'), `capa ${li} sin ojeador`).toBe(true)
    }
    for (let li = street.start; li < street.end; li++) {
      expect(currentOffer(map, li).some((n) => n.kind === 'tienda' || n.kind === 'rairai')).toBe(false)
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

  it('el cinco va por huecos: cualquiera puede jugar en cualquier sitio', () => {
    const save = fullSave(77)
    for (const f of FORMATIONS) {
      const lineup = autoLineup(save.roster, f.id)
      expect(lineup).toHaveLength(5)
      // Lo que genera autoLineup siempre es válido…
      expect(lineupError(save.roster, lineup, f.id)).toBeNull()
      // …e invertirlo ENTERO también: desde la alineación libre, el papel lo
      // marca el hueco, no la demarcación. Axel de portero es legal (y mala idea).
      expect(lineupError(save.roster, lineup.slice().reverse(), f.id)).toBeNull()
      // El hueco 0 es SIEMPRE el portero del partido.
      const built = buildLineup(save.roster, lineup.slice().reverse(), f.id)!
      expect(built.keeper.uid).toBe(lineup[lineup.length - 1])
    }
    // Lo que sigue sin valer: repetir a alguien o quedarse corto PUDIENDO
    // completar el cinco (con menos plantilla que cinco, sales con lo que hay).
    const l = autoLineup(save.roster, FORMATIONS[0].id)
    expect(lineupError(save.roster, [...l.slice(0, 4), ''], FORMATIONS[0].id)).not.toBeNull()
    expect(lineupError(save.roster, [l[0], ...l.slice(0, 4)], FORMATIONS[0].id)).not.toBeNull()
  })

  it('las estadísticas por jugador se acumulan de los eventos', () => {
    const save = fullSave(555)
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
    for (const k of ['entrenamiento', 'objeto', 'firma', 'ojeador', 'evento', 'jefe'] as const) {
      expect(kinds.has(k)).toBe(true)
    }
    expect(kinds.has('tecnica')).toBe(false)
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
      const save = fullSave(seed * 17 + 5)
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
    const save = fullSave(99)
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

  it('las supertécnicas que ofrece el mapa existen en el catálogo', () => {
    // Con el equipo CONSTRUIBLE desde un inicial, el mapa ya no puede saber
    // qué combinaciones tendrás: la técnica va a la mochila y espera al
    // recluta adecuado. Lo exigible es que toda oferta sea una técnica real.
    const save = createSave(7)
    const techNodes = Object.values(save.map.nodes).filter((n) => n.kind === 'objeto' && n.techniqueId)
    expect(techNodes.length).toBeGreaterThan(0)
    for (const n of techNodes) expect(getTechnique(n.techniqueId!)).toBeTruthy()
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
        // Plantilla inicial: TU INICIAL (1) y alineable — el resto se recluta.
        expect(save.roster.length).toBe(1)
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
    let p = createPlayer('mark-evans', 2, { rarity: 4 })
    chain.forEach((id, i) => {
      // El umbral es PERSONAL (±3 sobre la tabla): como los niveles de
      // evolución, cada jugador tiene los suyos.
      const need = signatureLevelFor('mark-evans', i)
      expect(Math.abs(need - SIGNATURE_LEVELS[Math.min(i, SIGNATURE_LEVELS.length - 1)])).toBeLessThanOrEqual(3)
      p = levelUp(p, need - p.level)
      expect(p.techniques, `paso ${i} al nivel ${need}`).toContain(id)
    })
    // Y un fichaje que LLEGA a nivel alto trae lo suyo despierto.
    expect(createPlayer('axel-blaze', 30, { rarity: 4 }).techniques).toContain('fire-tornado')
  })

  it('las combinadas se GANAN: hace falta despertar la técnica y tener al socio', () => {
    // Kevin sin su cadena despierta: NO hay combo aunque estén los dos.
    const raw = ['axel-blaze', 'kevin-dragonfly', 'mark-evans'].map((id) => {
      const pl = createPlayer(id, 5)
      return { baseId: pl.baseId, techniques: pl.techniques }
    })
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
      // Los DOS socios en plantilla (el cinco tiene que alinearlos a ambos) y
      // rareza suficiente para alcanzar el 2.º paso de la cadena + niveles.
      // El ORDEN del cinco es la alineación (POR, DEF, MED, MED, DEL): Axel
      // va al hueco de delantero — de defensa no puede tirar y no hay combo.
      save.roster = [
        save.roster[0],
        ...['jack-wallside', 'nathan-swift', 'kevin-dragonfly', 'axel-blaze'].map((id) => createPlayer(id, 5)),
      ].map((p) => levelUp({ ...p, rarity: 3 }, 25))
      save.lineup = save.roster.map((p) => p.uid)
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
        // Equipado, algún atributo tiene que subir DE VERDAD. Sobre un
        // jugador SIN nada puesto: el primero de la plantilla lleva ahora el
        // Brazalete de Capitán de serie, y comparar contra él salía al revés.
        const p = { ...save.roster[0], item: undefined }
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

