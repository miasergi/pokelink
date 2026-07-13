// Combate FANTASMA online: tu equipo contra el snapshot del equipo de otro
// jugador. Sin timing humano (sería injusto en diferido): simulación
// determinista por semilla — cualquiera puede re-simular la misma semilla y
// obtener el mismo resultado, así el ranking es verificable.
import type { PokemonInstance } from '@/types'
import { getSpecies } from '@/data'
import { chooseMove } from '@/engine/battle/ai'
import { computeDamage } from '@/engine/battle/damage'
import { getMove } from '@/data'
import { RNG } from '@/utils/rng'
import { displayName } from './timingBattle'

export interface GhostBattleResult {
  won: boolean
  log: string[]
}

function reviveClone(team: PokemonInstance[]): PokemonInstance[] {
  // Copia curada: el combate fantasma nunca toca tu equipo real.
  return structuredClone(team).map((m) => {
    m.currentHp = m.stats.hp
    m.status = 'none'
    for (const mv of m.moves) mv.pp = mv.maxPp
    return m
  })
}

function attack(att: PokemonInstance, def: PokemonInstance, rng: RNG, log: string[]): void {
  const idx = chooseMove(att, getSpecies(att.speciesId), def, getSpecies(def.speciesId), rng)
  if (idx < 0) { log.push(`${displayName(att)} no puede atacar…`); return }
  const mv = att.moves[idx]
  mv.pp = Math.max(0, mv.pp - 1)
  const move = getMove(mv.moveId)
  if (move.accuracy > 0 && !rng.chance(move.accuracy / 100)) {
    log.push(`${displayName(att)} usa ${move.displayName.toUpperCase()}… ¡y falla!`)
    return
  }
  const r = computeDamage({
    attacker: att, attackerSpecies: getSpecies(att.speciesId),
    defender: def, defenderSpecies: getSpecies(def.speciesId),
    move, atkStage: 0, defStage: 0, rng,
  })
  def.currentHp = Math.max(0, def.currentHp - r.damage)
  const eff = r.effectiveness > 1 ? ' ¡Supereficaz!' : r.effectiveness === 0 ? ' No afecta…' : ''
  log.push(`${displayName(att)} usa ${move.displayName.toUpperCase()} (-${r.damage})${eff}`)
  if (def.currentHp <= 0) log.push(`¡${displayName(def)} se debilitó!`)
}

/** Simula mi equipo (challenger) contra el fantasma. Determinista por semilla. */
export function simulateGhostBattle(
  myTeam: PokemonInstance[], ghostTeam: PokemonInstance[], seed: number,
): GhostBattleResult {
  const rng = new RNG(seed)
  const mine = reviveClone(myTeam)
  const ghost = reviveClone(ghostTeam)
  const log: string[] = []
  let mi = 0, gi = 0, guard = 0

  while (mi < mine.length && gi < ghost.length && guard++ < 400) {
    const a = mine[mi], b = ghost[gi]
    // Orden por velocidad (empate: azar de la semilla).
    const meFirst = a.stats.spe > b.stats.spe || (a.stats.spe === b.stats.spe && rng.chance(0.5))
    const [first, second] = meFirst ? [a, b] : [b, a]
    attack(first, second, rng, log)
    if (second.currentHp > 0) attack(second, first, rng, log)
    if (b.currentHp <= 0) { gi++; if (gi < ghost.length) log.push(`El rival envía a ${displayName(ghost[gi])}.`) }
    if (a.currentHp <= 0) { mi++; if (mi < mine.length) log.push(`¡Adelante, ${displayName(mine[mi])}!`) }
  }

  const won = gi >= ghost.length && mi < mine.length
  log.push(won ? '¡VICTORIA!' : 'DERROTA…')
  return { won, log }
}
