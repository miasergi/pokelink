import type { MoveData, PokemonInstance, StatKey, StatusCondition } from '@/types'
import { getMove, getSpecies } from '@/data'
import { RNG } from '@/utils/rng'
import { computeDamage, accuracyStageMultiplier } from './damage'
import { chooseMove } from './ai'
import { expForLevel, expGain, levelFromExp } from '@/engine/team/leveling'
import { computeStats } from '@/engine/team/leveling'
import type { BattleConfig, BattleEvent, BattleResult, Side } from './types'

const TURN_CAP = 600

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
}

const STRUGGLE: MoveData = {
  id: -1, name: 'Forcejeo', type: 'normal', category: 'physical',
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
  events.push(sendOutEvent(player))
  events.push(sendOutEvent(enemy))

  let winner: Side | null = null
  let turn = 0

  while (winner === null && turn < TURN_CAP) {
    turn++

    // Elegir acciones (índice de movimiento) para ambos activos
    const pMove = decide(player, enemy, rng)
    const eMove = decide(enemy, player, rng)

    // Orden por prioridad y velocidad efectiva
    const order = decideOrder(player, pMove, enemy, eMove, rng)

    for (const step of order) {
      const atk = step.side
      const def = atk === player ? enemy : player
      if (active(atk).currentHp <= 0) continue
      // Re-elige para el Pokémon activo actual (puede haber cambiado tras un debilitamiento)
      const moveIdx = decide(atk, def, rng)
      performMove(atk, def, moveIdx, rng, events)

      // ¿Alguien se debilitó?
      const ended = resolveFaints(player, enemy, rng, events, expByUid, levelUps)
      if (ended) {
        winner = ended
        break
      }
    }
    if (winner) break

    // Daño/curación de final de turno (estado y objetos)
    for (const s of [player, enemy]) {
      if (active(s).currentHp <= 0) continue
      endOfTurnResidual(s, events)
    }
    const ended = resolveFaints(player, enemy, rng, events, expByUid, levelUps)
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
  }
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

function effectiveSpeed(s: SideState): number {
  const mon = active(s)
  let spe = mon.stats.spe * stageMul(s.stages.spe)
  if (mon.status === 'par') spe *= 0.5
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
  rng: RNG,
): Step[] {
  const pPri = movePriority(player, pMove)
  const ePri = movePriority(enemy, eMove)
  const pStep: Step = { side: player, moveIdx: pMove }
  const eStep: Step = { side: enemy, moveIdx: eMove }
  if (pPri !== ePri) return pPri > ePri ? [pStep, eStep] : [eStep, pStep]
  const pSpe = effectiveSpeed(player)
  const eSpe = effectiveSpeed(enemy)
  if (pSpe !== eSpe) return pSpe > eSpe ? [pStep, eStep] : [eStep, pStep]
  return rng.chance(0.5) ? [pStep, eStep] : [eStep, pStep]
}

// ---------------------------------------------------------------------------
function performMove(
  atk: SideState, def: SideState, moveIdx: number,
  rng: RNG, events: BattleEvent[],
): void {
  const attacker = active(atk)
  const species = getSpecies(attacker.speciesId)

  // Comprobaciones de estado previas al movimiento
  if (attacker.status === 'frz') {
    if (rng.chance(0.2)) {
      attacker.status = 'none'
      events.push({ kind: 'thawed', side: atk.side, uid: attacker.uid })
    } else {
      events.push({ kind: 'cantMove', side: atk.side, uid: attacker.uid, reason: 'frz' })
      return
    }
  }
  if (attacker.status === 'slp') {
    if (atk.sleepTurns <= 0) {
      attacker.status = 'none'
      events.push({ kind: 'wokeUp', side: atk.side, uid: attacker.uid })
    } else {
      atk.sleepTurns--
      events.push({ kind: 'cantMove', side: atk.side, uid: attacker.uid, reason: 'slp' })
      return
    }
  }
  if (attacker.status === 'par' && rng.chance(0.25)) {
    events.push({ kind: 'cantMove', side: atk.side, uid: attacker.uid, reason: 'par' })
    return
  }

  let move: MoveData
  if (moveIdx < 0) {
    move = STRUGGLE
  } else {
    const slot = attacker.moves[moveIdx]
    slot.pp = Math.max(0, slot.pp - 1)
    move = getMove(slot.moveId)
  }

  events.push({ kind: 'move', side: atk.side, uid: attacker.uid, moveName: move.name, moveType: move.type })

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

  // --- Movimiento de daño ---
  const hits = move.effect?.multiHit ? rng.int(move.effect.multiHit[0], move.effect.multiHit[1]) : 1
  let total = 0
  let effectiveness = 1
  let crit = false
  for (let h = 0; h < hits; h++) {
    if (defender.currentHp <= 0) break
    const isPhys = move.category === 'physical'
    const res = computeDamage({
      attacker, attackerSpecies: species,
      defender, defenderSpecies: defSpecies,
      move,
      atkStage: isPhys ? atk.stages.atk : atk.stages.spa,
      defStage: isPhys ? def.stages.def : def.stages.spd,
      rng,
    })
    effectiveness = res.effectiveness
    if (res.effectiveness === 0) {
      events.push({ kind: 'noEffect', side: def.side, uid: defender.uid })
      return
    }
    let dmg = res.damage
    if (attacker.heldItemId === 'life-orb') dmg = Math.floor(dmg * 1.3)
    crit = crit || res.crit

    // Banda focal: sobrevive con 1 PS a un golpe letal desde PS máximos
    if (
      defender.heldItemId === 'focus-sash' &&
      !def.sashUsed.has(defender.uid) &&
      defender.currentHp === defender.stats.hp &&
      dmg >= defender.currentHp
    ) {
      dmg = defender.currentHp - 1
      def.sashUsed.add(defender.uid)
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

function applyMoveEffects(
  move: MoveData, atk: SideState, def: SideState,
  _dmg: number, rng: RNG, events: BattleEvent[], secondaryOnly = false,
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

  if (eff.ailment) {
    const target = active(def)
    if (target.currentHp > 0 && target.status === 'none' && !isImmuneToStatus(target, eff.ailment)) {
      target.status = eff.ailment
      if (eff.ailment === 'slp') def.sleepTurns = rng.int(1, 3)
      if (eff.ailment === 'tox') def.toxN = 1
      events.push({ kind: 'status', side: def.side, uid: target.uid, status: eff.ailment })
    }
  }
}

function isImmuneToStatus(mon: PokemonInstance, status: StatusCondition): boolean {
  const types = getSpecies(mon.speciesId).types
  if (status === 'brn' && types.includes('fire')) return true
  if (status === 'frz' && types.includes('ice')) return true
  if ((status === 'psn' || status === 'tox') && (types.includes('poison') || types.includes('steel'))) return true
  return false
}

function endOfTurnResidual(s: SideState, events: BattleEvent[]): void {
  const mon = active(s)
  const max = mon.stats.hp
  if (mon.status === 'brn' || mon.status === 'psn') {
    const dmg = mon.status === 'brn' ? Math.max(1, Math.floor(max / 16)) : Math.max(1, Math.floor(max / 8))
    mon.currentHp = Math.max(0, mon.currentHp - dmg)
    events.push({ kind: 'statusDamage', side: s.side, uid: mon.uid, status: mon.status, amount: dmg, hpAfter: mon.currentHp, maxHp: max })
  } else if (mon.status === 'tox') {
    const dmg = Math.max(1, Math.floor((max / 16) * s.toxN))
    s.toxN++
    mon.currentHp = Math.max(0, mon.currentHp - dmg)
    events.push({ kind: 'statusDamage', side: s.side, uid: mon.uid, status: 'tox', amount: dmg, hpAfter: mon.currentHp, maxHp: max })
  }
  // Restos
  if (mon.currentHp > 0 && mon.currentHp < max && mon.heldItemId === 'leftovers') {
    const heal = Math.max(1, Math.floor(max / 16))
    mon.currentHp = Math.min(max, mon.currentHp + heal)
    events.push({ kind: 'heal', side: s.side, uid: mon.uid, amount: heal, hpAfter: mon.currentHp, maxHp: max })
  }
}

/** Procesa debilitados y reemplazos. Devuelve el ganador si el combate acaba. */
function resolveFaints(
  player: SideState, enemy: SideState,
  rng: RNG, events: BattleEvent[],
  expByUid: Record<string, number>, levelUps: Record<string, number>,
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
  }
  void rng
  return null
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
