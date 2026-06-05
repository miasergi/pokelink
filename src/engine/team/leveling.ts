import type { BaseStats, PokemonInstance, SpeciesData } from '@/types'
import { getSpecies } from '@/data'

// Modelo de experiencia "medium-fast": exp = nivel^3.
export function expForLevel(level: number): number {
  return level * level * level
}

export function levelFromExp(exp: number): number {
  const lv = Math.floor(Math.cbrt(exp))
  return Math.max(1, Math.min(100, lv))
}

/** Stats a nivel dado (sin EVs, naturaleza neutra). */
export function computeStats(
  base: BaseStats,
  ivs: BaseStats,
  level: number,
): BaseStats {
  const calc = (b: number, iv: number) =>
    Math.floor(((2 * b + iv) * level) / 100) + 5
  const hp = Math.floor(((2 * base.hp + ivs.hp) * level) / 100) + level + 10
  return {
    hp,
    atk: calc(base.atk, ivs.atk),
    def: calc(base.def, ivs.def),
    spa: calc(base.spa, ivs.spa),
    spd: calc(base.spd, ivs.spd),
    spe: calc(base.spe, ivs.spe),
  }
}

/** Recalcula stats manteniendo la fracción de PS actual. */
export function recalcStats(mon: PokemonInstance, species: SpeciesData): void {
  const frac = mon.stats.hp > 0 ? mon.currentHp / mon.stats.hp : 1
  mon.stats = computeStats(species.baseStats, mon.ivs, mon.level)
  mon.currentHp = Math.max(1, Math.round(mon.stats.hp * frac))
}

/** Sube 1 nivel a un Pokémon (Caramelo Raro), recalculando stats. */
export function gainLevel(mon: PokemonInstance): boolean {
  if (mon.level >= 100) return false
  mon.level += 1
  mon.exp = expForLevel(mon.level)
  recalcStats(mon, getSpecies(mon.speciesId))
  return true
}

/** EXP que otorga derrotar a un enemigo (generosa: las runs roguelike son cortas). */
export function expGain(loserSpecies: SpeciesData, loserLevel: number): number {
  return Math.max(1, Math.floor((loserSpecies.baseExp * loserLevel) / 3) + loserLevel * 4)
}
