import type { BaseStats, PokemonInstance, SpeciesData } from '@/types'
import { getSpecies, getMove } from '@/data'
import { typeAttackId, tierForLevel } from '@/data/typeAttacks'

/** Nivel de potencia efectivo (0/1/2): el mayor entre el del nivel y el
 *  desbloqueado por objetos "Mejora" (NO se suman: la Mejora solo adelanta). */
export function effectiveTier(mon: PokemonInstance): number {
  return Math.min(2, Math.max(tierForLevel(mon.level), mon.moveTier ?? 0))
}

/** Reasigna el moveset estándar (ataque por tipo) al nivel de potencia actual. */
export function refreshMoves(mon: PokemonInstance): void {
  const sp = getSpecies(mon.speciesId)
  const tier = effectiveTier(mon)
  const types = [...new Set(sp.types)].slice(0, 2)
  mon.moves = types.map((type) => {
    const id = typeAttackId(type, tier)
    const m = getMove(id)
    return { moveId: id, pp: m.pp, maxPp: m.pp }
  })
}

// Modelo de experiencia "medium-fast": exp = nivel^3.
export function expForLevel(level: number): number {
  return level * level * level
}

export function levelFromExp(exp: number): number {
  const lv = Math.floor(Math.cbrt(exp))
  return Math.max(1, Math.min(100, lv))
}

/** Stats a nivel dado (sin EVs, naturaleza neutra) + bonus de objetos. */
export function computeStats(
  base: BaseStats,
  ivs: BaseStats,
  level: number,
  bonus?: Partial<BaseStats>,
): BaseStats {
  const calc = (b: number, iv: number) =>
    Math.floor(((2 * b + iv) * level) / 100) + 5
  const hp = Math.floor(((2 * base.hp + ivs.hp) * level) / 100) + level + 10
  const b = bonus ?? {}
  return {
    hp: hp + (b.hp ?? 0),
    atk: calc(base.atk, ivs.atk) + (b.atk ?? 0),
    def: calc(base.def, ivs.def) + (b.def ?? 0),
    spa: calc(base.spa, ivs.spa) + (b.spa ?? 0),
    spd: calc(base.spd, ivs.spd) + (b.spd ?? 0),
    spe: calc(base.spe, ivs.spe) + (b.spe ?? 0),
  }
}

/** Recalcula stats manteniendo la fracción de PS actual. Un Pokémon debilitado
 *  (0 PS) sigue debilitado: no revive por subir de nivel/área. */
export function recalcStats(mon: PokemonInstance, species: SpeciesData): void {
  const fainted = mon.currentHp <= 0
  const frac = mon.stats.hp > 0 ? mon.currentHp / mon.stats.hp : 1
  mon.stats = computeStats(species.baseStats, mon.ivs, mon.level, mon.bonus)
  mon.currentHp = fainted ? 0 : Math.max(1, Math.round(mon.stats.hp * frac))
}

/** Sube 1 nivel a un Pokémon (Caramelo Raro), recalculando stats. */
export function gainLevel(mon: PokemonInstance): boolean {
  if (mon.level >= 100) return false
  mon.level += 1
  mon.exp = expForLevel(mon.level)
  recalcStats(mon, getSpecies(mon.speciesId))
  refreshMoves(mon)
  return true
}

/** EXP que otorga derrotar a un enemigo (generosa: las runs roguelike son cortas). */
export function expGain(loserSpecies: SpeciesData, loserLevel: number): number {
  return Math.max(1, Math.floor((loserSpecies.baseExp * loserLevel) / 3) + loserLevel * 4)
}
