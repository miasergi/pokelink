import type { BaseStats, ExtType, PokemonInstance, SpeciesData } from '@/types'
import { getSpecies, getMove } from '@/data'
import { typeAttackId, tierForLevel, captureTier } from '@/data/typeAttacks'

/** Tipos EFECTIVOS de una instancia: su override (gen Sonoro del Modo Historia)
 *  o, si no lo hay, los de la especie. */
export function monTypes(mon: PokemonInstance): ExtType[] {
  return mon.typesOverride?.length ? mon.typesOverride : getSpecies(mon.speciesId).types
}

/** Nivel de potencia efectivo (0/1/2/3). FIJO: el que tenía al crearse/capturarse,
 *  más "Mejora" (hasta 2) y "Movimiento Z" (3). NO sube por subir de nivel.
 *  (Respaldo para partidas antiguas sin el dato: el del nivel.) */
export function effectiveTier(mon: PokemonInstance): number {
  return Math.min(3, mon.moveTier ?? tierForLevel(mon.level))
}

/** Ajusta el tier de potencia de un Pokémon recién OBTENIDO por captura: 1 hasta
 *  nv.35, 2 desde nv.36, nunca 3. (Luego sube con Mejora/Movimiento Z.) */
export function applyCaptureTier(mon: PokemonInstance): void {
  mon.moveTier = captureTier(mon.level)
  refreshMoves(mon)
}

/** Reasigna el moveset estándar (ataque por tipo) al nivel de potencia actual.
 *  Usa los tipos EFECTIVOS (override Sonoro incluido). */
export function refreshMoves(mon: PokemonInstance): void {
  const tier = effectiveTier(mon)
  const types = [...new Set(monTypes(mon))].slice(0, 2)
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
