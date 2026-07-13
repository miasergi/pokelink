// Captura estilo Cyber PokéBall: en combate salvaje «cierras la tapa» y agitas.
// La probabilidad depende del ratio de captura de la especie, PS restantes,
// nivel, estado alterado y lo bien que hayas agitado (shakeScore 0..1).
import type { PokemonInstance, SpeciesData } from '@/types'
import { RNG } from '@/utils/rng'

export function catchChance(enemy: PokemonInstance, species: SpeciesData, shakeScore: number): number {
  const base = species.catchRate / 255
  const hpPct = Math.max(0, Math.min(1, enemy.currentHp / Math.max(1, enemy.stats.hp)))
  const hpFactor = 1 - 0.65 * hpPct
  const lvlFactor = Math.max(0.35, 1 - enemy.level / 80)
  const statusBonus = enemy.status !== 'none' ? 1.3 : 1
  const shake = 0.6 + 0.4 * Math.max(0, Math.min(1, shakeScore))
  const p = (0.15 + 0.85 * base) * hpFactor * lvlFactor * statusBonus * shake
  return Math.max(0.02, Math.min(0.95, p))
}

export interface CaptureResult {
  caught: boolean
  /** Si no lo capturas, puede escaparse y terminar el combate. */
  escaped: boolean
}

export function resolveCapture(
  enemy: PokemonInstance, species: SpeciesData, shakeScore: number, rng: RNG,
): CaptureResult {
  if (rng.chance(catchChance(enemy, species, shakeScore))) return { caught: true, escaped: false }
  return { caught: false, escaped: rng.chance(0.35) }
}
