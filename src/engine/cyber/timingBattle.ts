// Combate por timing de la Cyber PokéBall: un carrusel de símbolos gira y el
// jugador lo para. Parar en una cara triste = turno perdido; parar en un
// movimiento lo ejecuta, con bonus de daño según la precisión del stop.
// Motor PURO (sin React): la UI del carrusel vive en CyberBattleView.
import type { MoveData, PokemonInstance, StatusCondition } from '@/types'
import { getMove, getSpecies } from '@/data'
import { computeDamage } from '@/engine/battle/damage'
import { chooseMove } from '@/engine/battle/ai'
import { expGain, levelFromExp, recalcStats } from '@/engine/team/leveling'
import { RNG } from '@/utils/rng'
import { CYBER_STATUS_SAD, type CarouselSlot, type TurnEvents } from './types'

/** Precisión del stop del carrusel (la UI la calcula por distancia al centro). */
export type StopPrecision = 'perfect' | 'good' | 'poor'

export const PRECISION_MULT: Record<StopPrecision, number> = {
  perfect: 1.2,
  good: 1.0,
  poor: 0.85,
}

export const PRECISION_LABEL: Record<StopPrecision, string> = {
  perfect: '¡PERFECTO!',
  good: '¡BIEN!',
  poor: 'FLOJO…',
}

/** Milisegundos por slot del carrusel: se acelera con las medallas. */
export function carouselStepMs(badges: number): number {
  return Math.max(120, 220 - badges * 10)
}

/** Carrusel de 8 slots: movimientos del Pokémon + caras tristes. Los estados
 *  alterados añaden más caras (parálisis) o casi todas (sueño/congelación),
 *  igual que el juguete sustituía opciones por caras tristes. */
export function buildCarousel(mon: PokemonInstance, extraSad = 0): CarouselSlot[] {
  const moves = mon.moves.filter((m) => m.pp > 0)
  const statusSad = mon.status !== 'none' ? CYBER_STATUS_SAD[mon.status as Exclude<StatusCondition, 'none'>] : 0
  const sadCount = Math.min(7, 2 + statusSad + extraSad)
  const slots: CarouselSlot[] = []
  const total = 8
  const moveSlots = Math.max(1, total - sadCount)
  for (let i = 0; i < moveSlots; i++) {
    const mv = moves[i % Math.max(1, moves.length)]
    slots.push(mv ? { kind: 'move', moveId: mv.moveId } : { kind: 'sad' })
  }
  for (let i = slots.length; i < total; i++) slots.push({ kind: 'sad' })
  // Intercala: triste/movimiento alternados de forma estable (sin RNG: el
  // patrón visible no debe consumir la semilla del save).
  const out: CarouselSlot[] = []
  const sads = slots.filter((s) => s.kind === 'sad')
  const mvs = slots.filter((s) => s.kind === 'move')
  for (let i = 0; i < total; i++) {
    const pickMove = mvs.length && (i % 2 === 0 || !sads.length)
    out.push(pickMove ? mvs.shift()! : sads.shift()!)
  }
  return out
}

/** Estados que ciertos tipos pueden infligir al golpear (guiño a los juegos;
 *  los ataques sintéticos por tipo no traen efectos propios). */
const TYPE_AILMENT: Partial<Record<string, { status: StatusCondition; chance: number }>> = {
  fire: { status: 'brn', chance: 0.1 },
  electric: { status: 'par', chance: 0.1 },
  ice: { status: 'frz', chance: 0.05 },
  poison: { status: 'psn', chance: 0.15 },
}

function maybeAilment(move: MoveData, defender: PokemonInstance, rng: RNG, messages: string[]): void {
  if (defender.status !== 'none' || defender.currentHp <= 0) return
  const explicit = move.effect?.ailment && move.effect.ailment !== 'none'
    ? { status: move.effect.ailment, chance: move.effect.chance ?? 0.2 }
    : TYPE_AILMENT[move.type]
  if (!explicit) return
  if (rng.chance(explicit.chance)) {
    defender.status = explicit.status
    messages.push(statusMessage(defender, explicit.status))
  }
}

function statusMessage(mon: PokemonInstance, status: StatusCondition): string {
  const name = displayName(mon)
  switch (status) {
    case 'brn': return `¡${name} se quemó!`
    case 'par': return `¡${name} está paralizado!`
    case 'psn': case 'tox': return `¡${name} se envenenó!`
    case 'slp': return `¡${name} se durmió!`
    case 'frz': return `¡${name} se congeló!`
    default: return ''
  }
}

export function displayName(mon: PokemonInstance): string {
  return (mon.nickname ?? getSpecies(mon.speciesId).displayName).toUpperCase()
}

/** Daño de un ataque en el modo Cyber (sin stages ni objetos: minijuego). */
function dealDamage(
  attacker: PokemonInstance, defender: PokemonInstance, move: MoveData, mult: number, rng: RNG,
): { damage: number; effectiveness: number; crit: boolean } {
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
  defender.currentHp = Math.max(0, defender.currentHp - r.damage)
  return r
}

/** Turno del JUGADOR: para el carrusel en `slot`. Muta los PS de ambos. */
export function resolveStop(
  playerMon: PokemonInstance,
  enemy: PokemonInstance,
  slot: CarouselSlot,
  precision: StopPrecision,
  boostMult: number, // 1 + bonus del minijuego de machaque (0.3) si procede
  rng: RNG,
): TurnEvents {
  const messages: string[] = []
  if (slot.kind === 'sad') {
    messages.push('¡FALLO!', `${displayName(playerMon)} pierde el turno…`)
    return { messages }
  }
  const move = getMove(slot.moveId)
  const mv = playerMon.moves.find((m) => m.moveId === slot.moveId)
  if (mv && mv.pp > 0) mv.pp -= 1
  messages.push(`${displayName(playerMon)} usa ${move.displayName.toUpperCase()}`)
  // Precisión del movimiento (0 = nunca falla)
  if (move.accuracy > 0 && !rng.chance(move.accuracy / 100)) {
    messages.push('¡El ataque falló!')
    return { messages }
  }
  const mult = PRECISION_MULT[precision] * boostMult
  const r = dealDamage(playerMon, enemy, move, mult, rng)
  if (r.effectiveness === 0) messages.push('No afecta…')
  else {
    if (r.crit) messages.push('¡Golpe crítico!')
    if (r.effectiveness > 1) messages.push('¡Es supereficaz!')
    else if (r.effectiveness < 1) messages.push('No es muy eficaz…')
    maybeAilment(move, enemy, rng, messages)
  }
  const enemyFainted = enemy.currentHp <= 0
  if (enemyFainted) messages.push(`¡${displayName(enemy)} se debilitó!`)
  return { messages, playerDamage: r.damage, enemyFainted, effectiveness: r.effectiveness, crit: r.crit }
}

/** Turno del ENEMIGO (IA del autobattler). Devuelve eventos y muta PS. */
export function enemyAct(enemy: PokemonInstance, playerMon: PokemonInstance, rng: RNG): TurnEvents {
  const messages: string[] = []
  // Dormido/congelado: puede despertar (40%) o perder el turno.
  if (enemy.status === 'slp' || enemy.status === 'frz') {
    if (rng.chance(0.4)) {
      messages.push(`¡${displayName(enemy)} se recuperó!`)
      enemy.status = 'none'
    } else {
      messages.push(enemy.status === 'slp' ? `${displayName(enemy)} está dormido…` : `${displayName(enemy)} está congelado…`)
      return { messages }
    }
  }
  // Parálisis: 25% de perder el turno.
  if (enemy.status === 'par' && rng.chance(0.25)) {
    messages.push(`¡${displayName(enemy)} está paralizado y no se mueve!`)
    return { messages }
  }
  const idx = chooseMove(enemy, getSpecies(enemy.speciesId), playerMon, getSpecies(playerMon.speciesId), rng)
  if (idx < 0) {
    messages.push(`${displayName(enemy)} no puede atacar…`)
    return { messages }
  }
  const mv = enemy.moves[idx]
  mv.pp = Math.max(0, mv.pp - 1)
  const move = getMove(mv.moveId)
  messages.push(`${displayName(enemy)} usa ${move.displayName.toUpperCase()}`)
  if (move.accuracy > 0 && !rng.chance(move.accuracy / 100)) {
    messages.push('¡Falló!')
    return { messages }
  }
  const r = dealDamage(enemy, playerMon, move, 1, rng)
  if (r.effectiveness === 0) messages.push('No te afecta…')
  else {
    if (r.crit) messages.push('¡Golpe crítico!')
    if (r.effectiveness > 1) messages.push('¡Es supereficaz!')
    maybeAilment(move, playerMon, rng, messages)
  }
  const playerFainted = playerMon.currentHp <= 0
  if (playerFainted) messages.push(`¡${displayName(playerMon)} se debilitó!`)
  return { messages, enemyDamage: r.damage, playerFainted, effectiveness: r.effectiveness, crit: r.crit }
}

/** Recuperación de dormido/congelado del JUGADOR al cerrar el turno (40%,
 *  simétrica a la que enemyAct aplica al enemigo — sin esto el estado duraba
 *  para siempre). */
export function maybeRecoverStatus(mon: PokemonInstance, rng: RNG): string[] {
  if (mon.currentHp <= 0) return []
  if ((mon.status === 'slp' || mon.status === 'frz') && rng.chance(0.4)) {
    mon.status = 'none'
    return [`¡${displayName(mon)} se recuperó!`]
  }
  return []
}

/** Daño residual de quemadura/veneno al final del turno (ambos lados). */
export function endOfTurn(mon: PokemonInstance): string[] {
  if (mon.currentHp <= 0) return []
  if (mon.status === 'brn' || mon.status === 'psn' || mon.status === 'tox') {
    const dmg = Math.max(1, Math.floor(mon.stats.hp / 12))
    mon.currentHp = Math.max(0, mon.currentHp - dmg)
    const what = mon.status === 'brn' ? 'la quemadura' : 'el veneno'
    const out = [`${displayName(mon)} sufre por ${what}…`]
    if (mon.currentHp <= 0) out.push(`¡${displayName(mon)} se debilitó!`)
    return out
  }
  return []
}

/** Intento de huida: velocidad relativa + lo bien que hayas machacado ◄ ►. */
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

/** Nº de pulsaciones objetivo del minijuego de machaque (3 s de ventana). */
export const MASH_GOAL = 14
export const MASH_WINDOW_MS = 3000
export const MASH_BOOST = 0.3

/** ¿Este stop dispara el minijuego de machaque? (el golpe más potente del set). */
export function isMashMove(mon: PokemonInstance, slot: CarouselSlot): boolean {
  if (slot.kind !== 'move') return false
  const powers = mon.moves.map((m) => getMove(m.moveId).power)
  const max = Math.max(...powers, 0)
  return max > 0 && getMove(slot.moveId).power >= max && mon.moves.length > 1
}
