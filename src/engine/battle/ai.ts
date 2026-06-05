import type { PokemonInstance, SpeciesData } from '@/types'
import { getMove } from '@/data'
import { typeEffectiveness } from '@/data/typechart'
import { ABSORB } from './abilities'
import { RNG } from '@/utils/rng'

/** ¿La habilidad del defensor anula por completo este tipo de movimiento? */
function abilityImmune(defenderAbility: string, moveType: string, eff: number): boolean {
  if (ABSORB[defenderAbility]?.type === moveType) return true
  if (defenderAbility === 'levitate' && moveType === 'ground') return true
  if (defenderAbility === 'flash-fire' && moveType === 'fire') return true
  if (defenderAbility === 'wonder-guard' && eff <= 1) return true
  return false
}

/**
 * Heurística de selección de movimiento para el autobattler.
 * Devuelve el índice del movimiento elegido, o -1 si no hay PP (Forcejeo).
 */
export function chooseMove(
  attacker: PokemonInstance,
  attackerSpecies: SpeciesData,
  defender: PokemonInstance,
  defenderSpecies: SpeciesData,
  rng: RNG,
): number {
  let bestIdx = -1
  let bestScore = -Infinity
  let hasPp = false

  for (let i = 0; i < attacker.moves.length; i++) {
    const mv = attacker.moves[i]
    if (mv.pp <= 0) continue
    hasPp = true
    const move = getMove(mv.moveId)

    let score: number
    if (move.category === 'status') {
      // Movimientos de estado: útiles pronto, no si ya vamos ganando claramente
      const hpFrac = attacker.currentHp / attacker.stats.hp
      let base = 35
      if (move.effect?.statChanges?.some((s) => s.target === 'self')) {
        base = hpFrac > 0.6 ? 55 : 20 // boost mejor con vida alta
      }
      if (move.effect?.ailment && defender.status === 'none') base = 60
      if (move.effect?.heal && hpFrac < 0.5) base = 90
      score = base * rng.float(0.85, 1.15)
    } else {
      const eff = typeEffectiveness(move.type, defenderSpecies.types)
      const stab = attackerSpecies.types.includes(move.type) ? 1.5 : 1
      const statRatio =
        move.category === 'physical'
          ? attacker.stats.atk / Math.max(1, defender.stats.def)
          : attacker.stats.spa / Math.max(1, defender.stats.spd)
      score = move.power * eff * stab * (0.5 + statRatio * 0.5)
      if (eff === 0) score = -10
      if (abilityImmune(defender.ability, move.type, eff)) score = -20
      score *= rng.float(0.92, 1.08)
    }

    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }

  return hasPp ? bestIdx : -1
}
