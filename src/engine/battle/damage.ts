import type { MoveData, PokemonInstance, SpeciesData } from '@/types'
import { typeEffectiveness } from '@/data/typechart'
import { RNG } from '@/utils/rng'

/** Multiplicador por cambio de stat (atk/def/spa/spd/spe). */
export function statStageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage))
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s)
}

/** Multiplicador de precisión/evasión. */
export function accuracyStageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage))
  return s >= 0 ? (3 + s) / 3 : 3 / (3 - s)
}

export interface DamageContext {
  attacker: PokemonInstance
  attackerSpecies: SpeciesData
  defender: PokemonInstance
  defenderSpecies: SpeciesData
  move: MoveData
  atkStage: number // cambio de stat del atacante (atk o spa)
  defStage: number // cambio de stat del defensor (def o spd)
  rng: RNG
  /** Multiplicador extra por habilidades/clima. */
  extraMult?: number
  /** Adaptable: STAB x2 en vez de x1.5. */
  adaptability?: boolean
  /** Agallas/otros: ignora la reducción de ataque por quemadura. */
  ignoreBurn?: boolean
}

export interface DamageResult {
  damage: number
  effectiveness: number
  crit: boolean
}

/** Fórmula de daño estándar de Pokémon (Gen 4+ simplificada). */
export function computeDamage(ctx: DamageContext): DamageResult {
  const { attacker, attackerSpecies, defender, defenderSpecies, move, rng } = ctx

  const effectiveness = typeEffectiveness(move.type, defenderSpecies.types)
  if (effectiveness === 0 || move.power <= 0) {
    return { damage: 0, effectiveness, crit: false }
  }

  const isPhysical = move.category === 'physical'
  const rawAtk = isPhysical ? attacker.stats.atk : attacker.stats.spa
  const rawDef = isPhysical ? defender.stats.def : defender.stats.spd

  let atk = rawAtk * statStageMultiplier(ctx.atkStage)
  const def = rawDef * statStageMultiplier(ctx.defStage)

  // Quemadura reduce el ataque físico a la mitad (salvo Agallas, etc.)
  if (isPhysical && attacker.status === 'brn' && !ctx.ignoreBurn) atk *= 0.5

  // Crítico
  const highCrit = move.effect?.flags?.includes('highCrit')
  const critChance = highCrit ? 1 / 8 : 1 / 24
  const crit = rng.chance(critChance)
  const critMult = crit ? 1.5 : 1

  // STAB (Adaptable -> x2)
  const stab = attackerSpecies.types.includes(move.type) ? (ctx.adaptability ? 2 : 1.5) : 1

  // Daño base
  const base =
    Math.floor(
      Math.floor(
        (Math.floor((2 * attacker.level) / 5 + 2) * move.power * (atk / def)) / 50,
      ) + 2,
    )

  const randFactor = rng.float(0.85, 1.0)
  const extra = ctx.extraMult ?? 1
  let damage = base * stab * effectiveness * critMult * randFactor * extra

  // Vidasfera / objetos de daño se aplican fuera (en el engine) si hace falta
  damage = Math.max(1, Math.floor(damage))
  return { damage, effectiveness, crit }
}
