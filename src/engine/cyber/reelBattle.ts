// Combate de la Cyber PokéBall: TRAGAPERRAS DE DOS RODILLOS (fiel al juguete).
//
// Fuente (Bulbapedia): «a menu with two rapidly changing symbols, with the left
// being the player's move and the right being the opposing Pokémon's move».
// Los rodillos se paran DE UNO EN UNO («selected one at a time») y la mitad de
// la pantalla de quien está eligiendo parpadea; el ORDEN cambia según el rival
// (aquí: lo decide la Velocidad). La CARA TRISTE = fallo, y los estados
// alterados SUSTITUYEN símbolos por caras tristes.
//
// Motor PURO: emite CyberEvent[] que la UI convierte en fotogramas animados
// (cyberFrames.ts), igual que hace el combate principal del juego.
import type { MoveData, PokemonInstance, StatusCondition } from '@/types'
import { getMove, getSpecies } from '@/data'
import { computeDamage } from '@/engine/battle/damage'
import { chooseMove } from '@/engine/battle/ai'
import { expGain, levelFromExp, recalcStats } from '@/engine/team/leveling'
import { RNG } from '@/utils/rng'
import { CYBER_STATUS_SAD, type CyberEvent, type ReelSlot, type Side } from './types'

/** Precisión del stop (la UI la calcula por la distancia al centro del símbolo). */
export type StopPrecision = 'perfect' | 'good' | 'poor'

export const PRECISION_MULT: Record<StopPrecision, number> = {
  perfect: 1.25,
  good: 1.0,
  poor: 0.85,
}

export const PRECISION_LABEL: Record<StopPrecision, string> = {
  perfect: '¡PERFECTO!',
  good: '¡BIEN!',
  poor: 'FLOJO…',
}

/** Nº de símbolos de la tira. Se ve entera desplazándose: sabes qué viene. */
export const REEL_SIZE = 12

/** Milisegundos por símbolo: el rodillo se acelera con las medallas. */
export function reelStepMs(badges: number): number {
  return Math.max(110, 200 - badges * 9)
}

export function displayName(mon: PokemonInstance): string {
  return (mon.nickname ?? getSpecies(mon.speciesId).displayName).toUpperCase()
}

/**
 * Tira de símbolos de un Pokémon: sus movimientos + caras tristes.
 * Los estados alterados METEN MÁS CARAS TRISTES (fiel al juguete: no hay
 * porcentajes ocultos, el estado «contamina» la ruleta y lo VES).
 */
export function buildReel(mon: PokemonInstance, extraSad = 0): ReelSlot[] {
  const moves = mon.moves.filter((m) => m.pp > 0)
  const statusSad = mon.status !== 'none'
    ? CYBER_STATUS_SAD[mon.status as Exclude<StatusCondition, 'none'>]
    : 0
  // Base: 3 caras tristes de 12. Sueño/congelación dejan la tira casi inservible.
  const sadCount = Math.min(REEL_SIZE - 1, 3 + statusSad * 2 + extraSad)
  const moveCount = REEL_SIZE - sadCount

  const out: ReelSlot[] = []
  for (let i = 0; i < moveCount; i++) {
    const mv = moves[i % Math.max(1, moves.length)]
    out.push(mv ? { kind: 'move', moveId: mv.moveId } : { kind: 'sad' })
  }
  for (let i = 0; i < sadCount; i++) out.push({ kind: 'sad' })

  // Reparte las caras tristes por la tira (patrón FIJO, sin consumir RNG: lo
  // que se ve no debe alterar la semilla de la partida).
  const spread: ReelSlot[] = []
  const movesOnly = out.filter((s) => s.kind === 'move')
  const sadsOnly = out.filter((s) => s.kind === 'sad')
  const ratio = sadsOnly.length / REEL_SIZE
  let sadDebt = 0
  for (let i = 0; i < REEL_SIZE; i++) {
    sadDebt += ratio
    if (sadDebt >= 1 && sadsOnly.length) {
      sadDebt -= 1
      spread.push(sadsOnly.pop()!)
    } else if (movesOnly.length) {
      spread.push(movesOnly.pop()!)
    } else {
      spread.push(sadsOnly.pop() ?? { kind: 'sad' })
    }
  }
  return spread
}

/** ¿Quién para su rodillo (y ataca) primero? El más rápido. Fiel: «this order
 *  changes when facing different Pokémon». Empate → azar de la semilla. */
export function firstToPick(player: PokemonInstance, enemy: PokemonInstance, rng: RNG): Side {
  if (player.stats.spe !== enemy.stats.spe) return player.stats.spe > enemy.stats.spe ? 'player' : 'enemy'
  return rng.chance(0.5) ? 'player' : 'enemy'
}

/** Dónde para el rodillo del RIVAL. La IA elige su mejor movimiento y el rodillo
 *  cae en un símbolo de ese movimiento (o en una cara triste si su estado le
 *  ha contaminado la tira). */
export function enemyReelStop(
  enemy: PokemonInstance, player: PokemonInstance, reel: ReelSlot[], rng: RNG,
): number {
  const sadIdxs = reel.map((s, i) => (s.kind === 'sad' ? i : -1)).filter((i) => i >= 0)
  const moveIdxs = reel.map((s, i) => (s.kind === 'move' ? i : -1)).filter((i) => i >= 0)
  // Probabilidad de caer en cara triste = proporción de caras tristes en SU tira
  // (así el estado alterado le penaliza igual que a ti, y es visible).
  if (!moveIdxs.length || rng.chance(sadIdxs.length / reel.length)) {
    return sadIdxs.length ? rng.pick(sadIdxs) : 0
  }
  const best = chooseMove(enemy, getSpecies(enemy.speciesId), player, getSpecies(player.speciesId), rng)
  const wantedId = best >= 0 ? enemy.moves[best]?.moveId : undefined
  const wanted = moveIdxs.filter((i) => {
    const s = reel[i]
    return s.kind === 'move' && s.moveId === wantedId
  })
  return wanted.length ? rng.pick(wanted) : rng.pick(moveIdxs)
}

// ---- Resolución de un ataque ----

/** Estados que ciertos tipos pueden infligir al golpear (los ataques sintéticos
 *  por tipo no traen efectos propios). */
const TYPE_AILMENT: Partial<Record<string, { status: StatusCondition; chance: number }>> = {
  fire: { status: 'brn', chance: 0.1 },
  electric: { status: 'par', chance: 0.1 },
  ice: { status: 'frz', chance: 0.05 },
  poison: { status: 'psn', chance: 0.15 },
}

const other = (s: Side): Side => (s === 'player' ? 'enemy' : 'player')

/**
 * Ejecuta el ataque de un lado. Muta los PS y añade eventos a `out`.
 * `mult` = bonus de precisión del stop × bonus del machaque.
 */
export function performAttack(
  side: Side,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  slot: ReelSlot,
  mult: number,
  rng: RNG,
  out: CyberEvent[],
): void {
  // Cara triste: el ataque falla. Es LA mecánica del juguete.
  if (slot.kind === 'sad') {
    out.push({ kind: 'sad', side, text: `${displayName(attacker)} falla el tiro…` })
    return
  }
  const move = getMove(slot.moveId)
  const mv = attacker.moves.find((m) => m.moveId === slot.moveId)
  if (mv && mv.pp > 0) mv.pp -= 1

  out.push({ kind: 'move', side, moveName: move.displayName, moveType: move.type })

  if (move.accuracy > 0 && !rng.chance(move.accuracy / 100)) {
    out.push({ kind: 'miss', side: other(side), text: '¡El ataque falló!' })
    return
  }

  const r = computeDamage({
    attacker,
    attackerSpecies: getSpecies(attacker.speciesId),
    defender,
    defenderSpecies: getSpecies(defender.speciesId),
    move,
    atkStage: 0,
    defStage: 0,
    rng,
    extraMult: mult,
  })

  if (r.effectiveness === 0) {
    out.push({ kind: 'noEffect', side: other(side), text: 'No afecta…' })
    return
  }

  defender.currentHp = Math.max(0, defender.currentHp - r.damage)
  out.push({
    kind: 'damage',
    side: other(side),
    amount: r.damage,
    crit: r.crit,
    effectiveness: r.effectiveness,
    moveType: move.type,
    hp: defender.currentHp,
  })

  maybeAilment(move, defender, other(side), rng, out)

  if (defender.currentHp <= 0) {
    out.push({ kind: 'faint', side: other(side), text: `¡${displayName(defender)} se debilitó!` })
  }
}

function maybeAilment(
  move: MoveData, defender: PokemonInstance, side: Side, rng: RNG, out: CyberEvent[],
): void {
  if (defender.status !== 'none' || defender.currentHp <= 0) return
  const spec = move.effect?.ailment && move.effect.ailment !== 'none'
    ? { status: move.effect.ailment, chance: move.effect.chance ?? 0.2 }
    : TYPE_AILMENT[move.type]
  if (!spec || !rng.chance(spec.chance)) return
  defender.status = spec.status
  out.push({ kind: 'status', side, status: spec.status, text: statusMessage(defender, spec.status) })
}

function statusMessage(mon: PokemonInstance, status: StatusCondition): string {
  const n = displayName(mon)
  switch (status) {
    case 'brn': return `¡${n} se quemó!`
    case 'par': return `¡${n} está paralizado!`
    case 'psn': case 'tox': return `¡${n} se envenenó!`
    case 'slp': return `¡${n} se durmió!`
    case 'frz': return `¡${n} se congeló!`
    default: return ''
  }
}

/** Daño residual de quemadura/veneno al cerrar el turno. */
export function endOfTurn(mon: PokemonInstance, side: Side, out: CyberEvent[]): void {
  if (mon.currentHp <= 0) return
  if (mon.status !== 'brn' && mon.status !== 'psn' && mon.status !== 'tox') return
  const dmg = Math.max(1, Math.floor(mon.stats.hp / 12))
  mon.currentHp = Math.max(0, mon.currentHp - dmg)
  const what = mon.status === 'brn' ? 'la quemadura' : 'el veneno'
  out.push({
    kind: 'statusDamage', side, amount: dmg, hp: mon.currentHp,
    text: `${displayName(mon)} sufre por ${what}…`,
  })
  if (mon.currentHp <= 0) {
    out.push({ kind: 'faint', side, text: `¡${displayName(mon)} se debilitó!` })
  }
}

/** Recuperación de dormido/congelado (40%): simétrica para ambos lados. */
export function maybeRecoverStatus(mon: PokemonInstance, side: Side, rng: RNG, out: CyberEvent[]): void {
  if (mon.currentHp <= 0) return
  if ((mon.status === 'slp' || mon.status === 'frz') && rng.chance(0.4)) {
    mon.status = 'none'
    out.push({ kind: 'recover', side, text: `¡${displayName(mon)} se recuperó!` })
  }
}

/** Huida: velocidad relativa + lo bien que hayas machacado ◄ ►. */
export function attemptFlee(
  playerMon: PokemonInstance, enemy: PokemonInstance, mashScore: number, rng: RNG,
): boolean {
  const speedRatio = playerMon.stats.spe / Math.max(1, enemy.stats.spe)
  const p = Math.max(0.15, Math.min(0.95, 0.35 * speedRatio + 0.45 * Math.max(0, Math.min(1, mashScore))))
  return rng.chance(p)
}

/** EXP al derrotar a un enemigo. Devuelve los niveles ganados (muta el mon). */
export function awardExp(winner: PokemonInstance, loser: PokemonInstance): number {
  if (winner.currentHp <= 0) return 0
  const before = winner.level
  winner.exp += expGain(getSpecies(loser.speciesId), loser.level)
  const target = Math.max(before, levelFromExp(winner.exp))
  if (target !== before) {
    winner.level = Math.min(100, target)
    recalcStats(winner, getSpecies(winner.speciesId))
  }
  return winner.level - before
}

// ---- Minijuego de machaque (fiel: «press left or right several times») ----
export const MASH_GOAL = 14
export const MASH_WINDOW_MS = 3000
export const MASH_BOOST = 0.35

/** ¿Este símbolo dispara el machaque? (el golpe más potente del set). */
export function isMashMove(mon: PokemonInstance, slot: ReelSlot): boolean {
  if (slot.kind !== 'move') return false
  const powers = mon.moves.map((m) => getMove(m.moveId).power)
  const max = Math.max(...powers, 0)
  return max > 0 && getMove(slot.moveId).power >= max && mon.moves.length > 1
}
