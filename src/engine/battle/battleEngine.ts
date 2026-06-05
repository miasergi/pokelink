import type { MoveData, PokemonInstance, PokemonType, StatKey } from '@/types'
import { getMove, getSpecies, getMegaForms } from '@/data'
import { RNG } from '@/utils/rng'
import { computeDamage, accuracyStageMultiplier } from './damage'
import { chooseMove } from './ai'
import { expForLevel, expGain, levelFromExp } from '@/engine/team/leveling'
import { computeStats } from '@/engine/team/leveling'
import { typeEffectiveness } from '@/data/typechart'
import {
  type Weather, WEATHER_ABILITY, ABSORB, PINCH, abilityName,
  weatherSpeedMult, weatherDamageMult,
} from './abilities'
import type { BattleConfig, BattleEvent, BattleResult, Side } from './types'

const TURN_CAP = 600

interface BattleCtx {
  weather: Weather
}

type StageKey = StatKey | 'accuracy' | 'evasion'
type Stages = Record<StageKey, number>

function zeroStages(): Stages {
  return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 }
}

interface SideState {
  side: Side
  team: PokemonInstance[]
  activeIdx: number
  stages: Stages
  sleepTurns: number
  toxN: number
  sashUsed: Set<string>
  switches: number
}

const STRUGGLE: MoveData = {
  id: -1, name: 'struggle', displayName: 'Forcejeo', type: 'normal', category: 'physical',
  power: 50, accuracy: 100, pp: 1, priority: 0, effect: { recoil: 0.25 },
}

export function runBattle(config: BattleConfig): BattleResult {
  const rng = new RNG(config.seed)
  const events: BattleEvent[] = []
  const expByUid: Record<string, number> = {}
  const levelUps: Record<string, number> = {}

  const player = makeSide('player', clone(config.playerTeam))
  const enemy = makeSide('enemy', clone(config.enemyTeam))

  // Si un lado no tiene Pokémon vivos, el combate termina al instante.
  const playerAlive = player.team.some((m) => m.currentHp > 0)
  const enemyAlive = enemy.team.some((m) => m.currentHp > 0)
  if (!playerAlive || !enemyAlive) {
    const winner: Side = !playerAlive ? 'enemy' : 'player'
    events.push({ kind: 'end', winner })
    return { events, winner, playerTeam: player.team, expByUid, levelUps }
  }

  events.push({
    kind: 'start',
    playerLead: active(player).uid,
    enemyLead: active(enemy).uid,
  })
  const ctx: BattleCtx = { weather: 'none' }

  events.push(sendOutEvent(player))
  events.push(sendOutEvent(enemy))
  maybeMega(player, events)
  maybeMega(enemy, events)
  // Habilidades de entrada (Intimidación, climas...) por orden de velocidad
  for (const s of effectiveSpeed(player, ctx) >= effectiveSpeed(enemy, ctx) ? [player, enemy] : [enemy, player]) {
    applySwitchIn(s, s === player ? enemy : player, events, ctx)
  }

  let winner: Side | null = null
  let turn = 0

  while (winner === null && turn < TURN_CAP) {
    turn++

    // Cambio automático a un Pokémon con ventaja de tipo (consume el turno).
    const pSw = decideSwitch(player, enemy)
    const eSw = decideSwitch(enemy, player)
    if (pSw >= 0) doSwitch(player, pSw, enemy, events, ctx)
    if (eSw >= 0) doSwitch(enemy, eSw, player, events, ctx)

    // Acciones de quien NO cambió, en orden de prioridad/velocidad.
    const pMove = pSw < 0 ? decide(player, enemy, rng) : -1
    const eMove = eSw < 0 ? decide(enemy, player, rng) : -1
    let order: Step[]
    if (pSw < 0 && eSw < 0) order = decideOrder(player, pMove, enemy, eMove, rng, ctx)
    else if (pSw < 0) order = [{ side: player, moveIdx: pMove }]
    else if (eSw < 0) order = [{ side: enemy, moveIdx: eMove }]
    else order = []

    for (const step of order) {
      const atk = step.side
      const def = atk === player ? enemy : player
      if (active(atk).currentHp <= 0) continue
      // Re-elige para el Pokémon activo actual (puede haber cambiado tras un debilitamiento)
      const moveIdx = decide(atk, def, rng)
      performMove(atk, def, moveIdx, rng, events, ctx)

      // ¿Alguien se debilitó?
      const ended = resolveFaints(player, enemy, rng, events, expByUid, levelUps, ctx)
      if (ended) {
        winner = ended
        break
      }
    }
    if (winner) break

    // Daño/curación de final de turno (estado, clima y objetos)
    for (const s of [player, enemy]) {
      if (active(s).currentHp <= 0) continue
      endOfTurnResidual(s, events, ctx)
    }
    const ended = resolveFaints(player, enemy, rng, events, expByUid, levelUps, ctx)
    if (ended) winner = ended
  }

  if (winner === null) {
    // Empate por límite de turnos -> gana quien tenga más % de PS total
    winner = teamHpFrac(player) >= teamHpFrac(enemy) ? 'player' : 'enemy'
  }

  events.push({ kind: 'end', winner })

  return {
    events,
    winner,
    playerTeam: player.team,
    expByUid,
    levelUps,
  }
}

// ---------------------------------------------------------------------------
function makeSide(side: Side, team: PokemonInstance[]): SideState {
  const idx = team.findIndex((m) => m.currentHp > 0)
  return {
    side,
    team,
    activeIdx: idx < 0 ? 0 : idx,
    stages: zeroStages(),
    sleepTurns: 0,
    toxN: 1,
    sashUsed: new Set(),
    switches: 0,
  }
}

/** Mejor efectividad de tipo de los ataques de `mon` contra `oppTypes`. */
function bestEffVs(mon: PokemonInstance, oppTypes: PokemonType[]): number {
  let best = 0
  for (const mv of mon.moves) {
    const m = getMove(mv.moveId)
    if (m.power <= 0) continue
    best = Math.max(best, typeEffectiveness(m.type, oppTypes))
  }
  return best
}

/** Decide si conviene cambiar a un suplente con mejor emparejamiento de tipo. */
function decideSwitch(s: SideState, opp: SideState): number {
  if (s.switches >= s.team.length) return -1
  const cur = active(s)
  const oppTypes = getSpecies(active(opp).speciesId).types
  const curEff = bestEffVs(cur, oppTypes)
  if (curEff >= 1) return -1 // el activo ya hace daño normal o más
  let bestIdx = -1
  let bestVal = curEff
  for (let i = 0; i < s.team.length; i++) {
    if (i === s.activeIdx) continue
    const m = s.team[i]
    if (m.currentHp <= 0) continue
    const e = bestEffVs(m, oppTypes)
    if (e > bestVal + 1e-6) { bestVal = e; bestIdx = i }
  }
  if (bestIdx < 0) return -1
  // Cambia solo si: no podemos dañar (inmunidad) y el suplente sí, o el
  // suplente es súper eficaz. Evita cambios innecesarios que pierden tempo.
  const escapeImmunity = curEff === 0 && bestVal >= 1
  const upgradeToSuper = bestVal >= 2
  return escapeImmunity || upgradeToSuper ? bestIdx : -1
}

function doSwitch(s: SideState, idx: number, opp: SideState, events: BattleEvent[], ctx: BattleCtx): void {
  s.activeIdx = idx
  s.stages = zeroStages()
  s.sleepTurns = 0
  s.toxN = 1
  s.switches++
  events.push(sendOutEvent(s))
  maybeMega(s, events)
  applySwitchIn(s, opp, events, ctx)
}

function active(s: SideState): PokemonInstance {
  return s.team[s.activeIdx]
}

function sendOutEvent(s: SideState): BattleEvent {
  const mon = active(s)
  return { kind: 'sendOut', side: s.side, uid: mon.uid, name: getSpecies(mon.speciesId).displayName }
}

function decide(atk: SideState, def: SideState, rng: RNG): number {
  return chooseMove(
    active(atk),
    getSpecies(active(atk).speciesId),
    active(def),
    getSpecies(active(def).speciesId),
    rng,
  )
}

interface Step { side: SideState; moveIdx: number }

function effectiveSpeed(s: SideState, ctx: BattleCtx): number {
  const mon = active(s)
  let spe = mon.stats.spe * stageMul(s.stages.spe)
  if (mon.status === 'par') spe *= 0.5
  spe *= weatherSpeedMult(mon.ability, ctx.weather)
  return spe
}

function stageMul(stage: number): number {
  const x = Math.max(-6, Math.min(6, stage))
  return x >= 0 ? (2 + x) / 2 : 2 / (2 - x)
}

function movePriority(s: SideState, moveIdx: number): number {
  if (moveIdx < 0) return 0
  return getMove(active(s).moves[moveIdx].moveId).priority
}

function decideOrder(
  player: SideState, pMove: number,
  enemy: SideState, eMove: number,
  rng: RNG, ctx: BattleCtx,
): Step[] {
  const pPri = movePriority(player, pMove)
  const ePri = movePriority(enemy, eMove)
  const pStep: Step = { side: player, moveIdx: pMove }
  const eStep: Step = { side: enemy, moveIdx: eMove }
  if (pPri !== ePri) return pPri > ePri ? [pStep, eStep] : [eStep, pStep]
  const pSpe = effectiveSpeed(player, ctx)
  const eSpe = effectiveSpeed(enemy, ctx)
  if (pSpe !== eSpe) return pSpe > eSpe ? [pStep, eStep] : [eStep, pStep]
  return rng.chance(0.5) ? [pStep, eStep] : [eStep, pStep]
}

// ---------------------------------------------------------------------------
function performMove(
  atk: SideState, def: SideState, moveIdx: number,
  rng: RNG, events: BattleEvent[], ctx: BattleCtx,
): void {
  const attacker = active(atk)
  const species = getSpecies(attacker.speciesId)

  let move: MoveData
  if (moveIdx < 0) {
    move = STRUGGLE
  } else {
    const slot = attacker.moves[moveIdx]
    slot.pp = Math.max(0, slot.pp - 1)
    move = getMove(slot.moveId)
  }

  events.push({ kind: 'move', side: atk.side, uid: attacker.uid, moveName: move.displayName, moveType: move.type })

  // Precisión
  if (move.accuracy > 0) {
    const acc =
      (move.accuracy / 100) *
      (accuracyStageMultiplier(atk.stages.accuracy) / accuracyStageMultiplier(def.stages.evasion))
    if (!rng.chance(Math.min(1, acc))) {
      events.push({ kind: 'miss', side: atk.side, uid: attacker.uid })
      return
    }
  }

  const defender = active(def)
  const defSpecies = getSpecies(defender.speciesId)

  if (move.category === 'status') {
    applyMoveEffects(move, atk, def, 0, rng, events)
    return
  }

  // --- Inmunidades por habilidad (Levitación, Absorbe Agua, Superguarda...) ---
  const baseEff = typeEffectiveness(move.type, defSpecies.types)
  const absorb = ABSORB[defender.ability]
  if (absorb && absorb.type === move.type) {
    events.push({ kind: 'ability', side: def.side, uid: defender.uid, ability: defender.ability, text: `¡${defSpecies.displayName} absorbe el ataque (${abilityName(defender.ability)})!` })
    if (absorb.heal) {
      const heal = Math.max(1, Math.floor(defender.stats.hp * absorb.heal))
      defender.currentHp = Math.min(defender.stats.hp, defender.currentHp + heal)
      events.push({ kind: 'heal', side: def.side, uid: defender.uid, amount: heal, hpAfter: defender.currentHp, maxHp: defender.stats.hp })
    }
    if (absorb.boost) {
      const before = def.stages[absorb.boost.stat]
      const after = Math.max(-6, Math.min(6, before + absorb.boost.stages))
      if (after !== before) { def.stages[absorb.boost.stat] = after; events.push({ kind: 'statChange', side: def.side, uid: defender.uid, stat: absorb.boost.stat, delta: absorb.boost.stages }) }
    }
    return
  }
  if (defender.ability === 'flash-fire' && move.type === 'fire') {
    events.push({ kind: 'ability', side: def.side, uid: defender.uid, ability: 'flash-fire', text: `¡A ${defSpecies.displayName} no le afecta el fuego!` })
    return
  }
  if (defender.ability === 'wonder-guard' && baseEff <= 1 && move.power > 0) {
    events.push({ kind: 'ability', side: def.side, uid: defender.uid, ability: 'wonder-guard', text: `¡Superguarda protege a ${defSpecies.displayName}!` })
    return
  }

  // --- Movimiento de daño ---
  const hits = move.effect?.multiHit ? rng.int(move.effect.multiHit[0], move.effect.multiHit[1]) : 1
  let total = 0
  let effectiveness = 1
  let crit = false
  const adaptability = attacker.ability === 'adaptability'
  const ignoreBurn = attacker.ability === 'guts'
  for (let h = 0; h < hits; h++) {
    if (defender.currentHp <= 0) break
    const isPhys = move.category === 'physical'
    const extraMult = offenseMult(attacker, move, ctx) * defenseMult(defender, move, baseEff)
    const res = computeDamage({
      attacker, attackerSpecies: species,
      defender, defenderSpecies: defSpecies,
      move,
      atkStage: isPhys ? atk.stages.atk : atk.stages.spa,
      defStage: isPhys ? def.stages.def : def.stages.spd,
      rng, extraMult, adaptability, ignoreBurn,
    })
    effectiveness = res.effectiveness
    if (res.effectiveness === 0) {
      events.push({ kind: 'noEffect', side: def.side, uid: defender.uid })
      return
    }
    let dmg = res.damage
    if (attacker.heldItemId === 'life-orb') dmg = Math.floor(dmg * 1.3)
    crit = crit || res.crit

    // Banda focal / Robustez: sobrevive con 1 PS a un golpe letal desde PS máximos
    const sturdy = defender.ability === 'sturdy'
    if (
      (defender.heldItemId === 'focus-sash' || sturdy) &&
      !def.sashUsed.has(defender.uid) &&
      defender.currentHp === defender.stats.hp &&
      dmg >= defender.currentHp
    ) {
      dmg = defender.currentHp - 1
      def.sashUsed.add(defender.uid)
      if (sturdy) events.push({ kind: 'ability', side: def.side, uid: defender.uid, ability: 'sturdy', text: `¡${defSpecies.displayName} aguantó con Robustez!` })
    }

    defender.currentHp = Math.max(0, defender.currentHp - dmg)
    total += dmg
    events.push({
      kind: 'damage', side: def.side, uid: defender.uid,
      amount: dmg, hpAfter: defender.currentHp, maxHp: defender.stats.hp,
      effectiveness: res.effectiveness, crit: res.crit,
    })
    if (defender.heldItemId === 'rocky-helmet' && move.power > 0) {
      const recoil = Math.max(1, Math.floor(attacker.stats.hp / 6))
      attacker.currentHp = Math.max(0, attacker.currentHp - recoil)
      events.push({
        kind: 'damage', side: atk.side, uid: attacker.uid,
        amount: recoil, hpAfter: attacker.currentHp, maxHp: attacker.stats.hp,
        effectiveness: 1, crit: false,
      })
    }
  }

  if (hits > 1) events.push({ kind: 'message', text: `¡Golpeó ${hits} veces!` })

  // Drenaje / curación
  if (move.effect?.drain && total > 0) {
    const heal = Math.max(1, Math.floor(total * move.effect.drain))
    attacker.currentHp = Math.min(attacker.stats.hp, attacker.currentHp + heal)
    events.push({ kind: 'heal', side: atk.side, uid: attacker.uid, amount: heal, hpAfter: attacker.currentHp, maxHp: attacker.stats.hp })
  }

  // Retroceso (recoil) + Vidasfera
  let recoil = 0
  if (move.effect?.recoil && total > 0) recoil += Math.floor(total * move.effect.recoil)
  if (attacker.heldItemId === 'life-orb' && total > 0) recoil += Math.floor(attacker.stats.hp / 10)
  if (recoil > 0) {
    attacker.currentHp = Math.max(0, attacker.currentHp - recoil)
    events.push({
      kind: 'damage', side: atk.side, uid: attacker.uid,
      amount: recoil, hpAfter: attacker.currentHp, maxHp: attacker.stats.hp,
      effectiveness: 1, crit: false,
    })
  }

  // Efectos secundarios (estado / cambios de stat)
  if (move.effect && (move.effect.ailment || move.effect.statChanges)) {
    const chance = move.effect.chance ?? 1
    if (defender.currentHp > 0 && rng.chance(chance)) {
      applyMoveEffects(move, atk, def, total, rng, events, true)
    }
  }
  void effectiveness
}

/** Multiplicador de daño ofensivo por habilidades + clima. */
function offenseMult(mon: PokemonInstance, move: MoveData, ctx: BattleCtx): number {
  let m = 1
  const pinch = PINCH[mon.ability]
  if (pinch && move.type === pinch && mon.currentHp * 3 <= mon.stats.hp) m *= 1.5
  if ((mon.ability === 'huge-power' || mon.ability === 'pure-power') && move.category === 'physical') m *= 2
  if (mon.ability === 'guts' && mon.status !== 'none' && move.category === 'physical') m *= 1.5
  if (mon.ability === 'hustle' && move.category === 'physical') m *= 1.5
  if (mon.ability === 'technician' && move.power > 0 && move.power <= 60) m *= 1.5
  if (mon.ability === 'tough-claws') m *= 1.3
  if (mon.ability === 'solar-power' && ctx.weather === 'sun' && move.category === 'special') m *= 1.5
  m *= weatherDamageMult(ctx.weather, move.type)
  return m
}

/** Multiplicador defensivo por habilidades. */
function defenseMult(mon: PokemonInstance, move: MoveData, baseEff: number): number {
  let m = 1
  if (mon.ability === 'thick-fat' && (move.type === 'fire' || move.type === 'ice')) m *= 0.5
  if (mon.ability === 'multiscale' && mon.currentHp === mon.stats.hp) m *= 0.5
  if ((mon.ability === 'filter' || mon.ability === 'solid-rock' || mon.ability === 'prism-armor') && baseEff > 1) m *= 0.75
  return m
}

/** Habilidades al entrar en combate: climas e Intimidación. */
function applySwitchIn(s: SideState, opp: SideState, events: BattleEvent[], ctx: BattleCtx): void {
  const mon = active(s)
  if (mon.currentHp <= 0) return
  const ab = mon.ability
  const w = WEATHER_ABILITY[ab]
  if (w && ctx.weather !== w) {
    ctx.weather = w
    events.push({ kind: 'ability', side: s.side, uid: mon.uid, ability: ab, text: `¡${getSpecies(mon.speciesId).displayName} usó ${abilityName(ab)}!` })
    events.push({ kind: 'weather', weather: w })
  }
  if (ab === 'intimidate') {
    const t = active(opp)
    if (t.currentHp > 0 && opp.stages.atk > -6) {
      opp.stages.atk = Math.max(-6, opp.stages.atk - 1)
      events.push({ kind: 'ability', side: s.side, uid: mon.uid, ability: 'intimidate', text: `¡${getSpecies(mon.speciesId).displayName} intimida al rival!` })
      events.push({ kind: 'statChange', side: opp.side, uid: t.uid, stat: 'atk', delta: -1 })
    }
  }
}

function applyMoveEffects(
  move: MoveData, atk: SideState, def: SideState,
  _dmg: number, _rng: RNG, events: BattleEvent[], secondaryOnly = false,
): void {
  const eff = move.effect
  if (!eff) return

  // Curación directa (recover)
  if (!secondaryOnly && eff.heal) {
    const mon = active(atk)
    const heal = Math.max(1, Math.floor(mon.stats.hp * eff.heal))
    mon.currentHp = Math.min(mon.stats.hp, mon.currentHp + heal)
    events.push({ kind: 'heal', side: atk.side, uid: mon.uid, amount: heal, hpAfter: mon.currentHp, maxHp: mon.stats.hp })
  }

  if (eff.statChanges) {
    for (const sc of eff.statChanges) {
      const targetSide = sc.target === 'self' ? atk : def
      const mon = active(targetSide)
      if (mon.currentHp <= 0) continue
      const key = sc.stat as StageKey
      const before = targetSide.stages[key]
      const after = Math.max(-6, Math.min(6, before + sc.stages))
      if (after !== before) {
        targetSide.stages[key] = after
        events.push({ kind: 'statChange', side: targetSide.side, uid: mon.uid, stat: sc.stat, delta: sc.stages })
      }
    }
  }

  // Los estados (quemadura, sueño, etc.) están deshabilitados en este juego:
  // solo se aplican cambios de stat (Intimidación, etc.).
  void eff.ailment
}

const SAND_IMMUNE = new Set(['magic-guard', 'sand-force', 'sand-rush', 'sand-veil', 'overcoat'])

function endOfTurnResidual(s: SideState, events: BattleEvent[], ctx: BattleCtx): void {
  const mon = active(s)
  const max = mon.stats.hp
  const magicGuard = mon.ability === 'magic-guard'

  // Clima: daño de tormenta de arena / curación por Cura Lluvia y Gélido
  const types = getSpecies(mon.speciesId).types
  if (mon.currentHp > 0 && ctx.weather === 'sand' && !magicGuard && !SAND_IMMUNE.has(mon.ability) &&
      !types.includes('rock') && !types.includes('ground') && !types.includes('steel')) {
    const dmg = Math.max(1, Math.floor(max / 16))
    mon.currentHp = Math.max(0, mon.currentHp - dmg)
    events.push({ kind: 'statusDamage', side: s.side, uid: mon.uid, status: 'psn', amount: dmg, hpAfter: mon.currentHp, maxHp: max })
  }
  if (mon.currentHp > 0 && mon.currentHp < max &&
      ((ctx.weather === 'rain' && mon.ability === 'rain-dish') || (ctx.weather === 'snow' && mon.ability === 'ice-body'))) {
    const heal = Math.max(1, Math.floor(max / 16))
    mon.currentHp = Math.min(max, mon.currentHp + heal)
    events.push({ kind: 'heal', side: s.side, uid: mon.uid, amount: heal, hpAfter: mon.currentHp, maxHp: max })
  }

  // Restos
  if (mon.currentHp > 0 && mon.currentHp < max && mon.heldItemId === 'leftovers') {
    const heal = Math.max(1, Math.floor(max / 16))
    mon.currentHp = Math.min(max, mon.currentHp + heal)
    events.push({ kind: 'heal', side: s.side, uid: mon.uid, amount: heal, hpAfter: mon.currentHp, maxHp: max })
  }

  // Impulso (Speed Boost)
  if (mon.currentHp > 0 && mon.ability === 'speed-boost' && s.stages.spe < 6) {
    s.stages.spe = Math.min(6, s.stages.spe + 1)
    events.push({ kind: 'statChange', side: s.side, uid: mon.uid, stat: 'spe', delta: 1 })
  }
}

/** Procesa debilitados y reemplazos. Devuelve el ganador si el combate acaba. */
function resolveFaints(
  player: SideState, enemy: SideState,
  rng: RNG, events: BattleEvent[],
  expByUid: Record<string, number>, levelUps: Record<string, number>,
  ctx: BattleCtx,
): Side | null {
  for (const s of [player, enemy]) {
    const mon = active(s)
    if (mon.currentHp > 0) continue
    events.push({ kind: 'faint', side: s.side, uid: mon.uid, name: getSpecies(mon.speciesId).displayName })

    // EXP si cae un enemigo
    if (s.side === 'enemy') {
      awardExp(player, mon, expByUid, levelUps, events)
    }

    const nextIdx = s.team.findIndex((m) => m.currentHp > 0)
    if (nextIdx < 0) {
      return s.side === 'player' ? 'enemy' : 'player'
    }
    s.activeIdx = nextIdx
    s.stages = zeroStages()
    s.sleepTurns = 0
    s.toxN = 1
    events.push(sendOutEvent(s))
    maybeMega(s, events)
    applySwitchIn(s, s === player ? enemy : player, events, ctx)
  }
  void rng
  return null
}

/** Megaevolución al entrar en combate si lleva equipada una Mega Piedra. */
function maybeMega(s: SideState, events: BattleEvent[]): void {
  const mon = active(s)
  if (mon.heldItemId !== 'mega-stone') return
  const forms = getMegaForms(mon.speciesId)
  if (!forms.length) return
  const mega = forms[0]
  const frac = mon.stats.hp > 0 ? mon.currentHp / mon.stats.hp : 1
  mon.speciesId = mega.id
  mon.stats = computeStats(mega.baseStats, mon.ivs, mon.level, mon.bonus)
  mon.currentHp = Math.max(1, Math.round(mon.stats.hp * frac))
  if (mega.abilities.length) mon.ability = mega.abilities[0]
  events.push({ kind: 'mega', side: s.side, uid: mon.uid, toSpeciesId: mega.id, name: mega.displayName })
}

function awardExp(
  player: SideState, fainted: PokemonInstance,
  expByUid: Record<string, number>, levelUps: Record<string, number>,
  events: BattleEvent[],
): void {
  const species = getSpecies(fainted.speciesId)
  const gain = expGain(species, fainted.level)
  // Reparto completo a todo el equipo vivo (mantiene al equipo a nivel).
  for (let i = 0; i < player.team.length; i++) {
    const mon = player.team[i]
    if (mon.currentHp <= 0) continue
    const share = i === player.activeIdx ? gain : Math.floor(gain * 0.8)
    if (share <= 0) continue
    expByUid[mon.uid] = (expByUid[mon.uid] || 0) + share
    applyExp(mon, share, levelUps, events)
  }
}

function applyExp(
  mon: PokemonInstance, amount: number,
  levelUps: Record<string, number>, events: BattleEvent[],
): void {
  mon.exp += amount
  let leveled = 0
  while (mon.level < 100 && mon.exp >= expForLevel(mon.level + 1)) {
    const before = mon.stats.hp
    mon.level++
    const sp = getSpecies(mon.speciesId)
    mon.stats = computeStats(sp.baseStats, mon.ivs, mon.level)
    mon.currentHp = Math.min(mon.stats.hp, mon.currentHp + (mon.stats.hp - before))
    leveled++
  }
  if (leveled > 0) {
    levelUps[mon.uid] = (levelUps[mon.uid] || 0) + leveled
    events.push({ kind: 'message', text: `¡${getSpecies(mon.speciesId).displayName} subió a Nv. ${mon.level}!` })
  }
  // Sincroniza nivel/exp por si acaso
  mon.level = Math.max(mon.level, levelFromExp(mon.exp))
}

function teamHpFrac(s: SideState): number {
  let cur = 0
  let max = 0
  for (const m of s.team) {
    cur += Math.max(0, m.currentHp)
    max += m.stats.hp
  }
  return max > 0 ? cur / max : 0
}

function clone(team: PokemonInstance[]): PokemonInstance[] {
  return team.map((m) => ({
    ...m,
    ivs: { ...m.ivs },
    stats: { ...m.stats },
    moves: m.moves.map((mv) => ({ ...mv })),
  }))
}
