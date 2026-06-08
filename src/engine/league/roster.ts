import type { PokemonInstance, PokemonType } from '@/types'
import { ALL_SPECIES, getSpecies, getMegaForms, ALL_MEGAS } from '@/data'
import { createInstance } from '@/engine/team/instance'
import { refreshMoves, computeStats } from '@/engine/team/leveling'
import { expForLevel } from '@/engine/team/leveling'
import { RNG } from '@/utils/rng'
import { getRegion } from '@/data/trainers/regions'
import { ANIME_TRAINERS } from '@/data/trainers/anime'

const bst = (id: number) => { const b = getSpecies(id).baseStats; return b.hp + b.atk + b.def + b.spa + b.spd + b.spe }
const MEGA_BASES = [...new Set(ALL_MEGAS.map((m) => m.baseId).filter((b): b is number => b != null))]

// Objetos equipables fuertes para los rivales (variados, sin pociones/curativos).
const HELD_POOL = [
  'choice-band', 'life-orb', 'assault-vest', 'leftovers', 'focus-sash', 'expert-belt',
  'quick-scarf', 'razor-claw', 'kings-rock', 'rocky-helmet', 'double-glove', 'iron-ball', 'amulet-coin',
]

export interface LeagueTrainerDef {
  id: string
  name: string
  sprite: string
  team: number[]
  specialtyType?: PokemonType
}

/** Pool de entrenadores de la Liga: líderes + Alto Mando + campeones (9 gens) + anime. */
export function leagueTrainerPool(): LeagueTrainerDef[] {
  const out: LeagueTrainerDef[] = []
  for (let gen = 1; gen <= 9; gen++) {
    const r = getRegion(gen)
    for (const g of r.gymLeaders) out.push({ id: g.id, name: g.name, sprite: g.sprite ?? '', team: g.team.map((t) => t.speciesId), specialtyType: g.specialtyType })
    for (const e of r.eliteFour) out.push({ id: e.id, name: e.name, sprite: e.sprite ?? '', team: e.team.map((t) => t.speciesId), specialtyType: e.specialtyType })
    const champ = r.buildChampion(6) // rivalFinalId solo afecta al ace de algún campeón
    out.push({ id: champ.id, name: champ.name, sprite: champ.sprite ?? '', team: champ.team.map((t) => t.speciesId), specialtyType: champ.specialtyType })
  }
  for (const a of ANIME_TRAINERS) out.push({ id: a.id, name: a.name, sprite: a.sprite, team: a.team })
  return out
}

/** Sube un Pokémon del jugador a nivel 100 conservando especie/IVs/objeto/tier. */
export function scaleToLv100(mon: PokemonInstance): PokemonInstance {
  const clone = structuredClone(mon)
  clone.level = 100
  clone.exp = expForLevel(100)
  clone.stats = computeStats(getSpecies(clone.speciesId).baseStats, clone.ivs, 100, clone.bonus)
  clone.currentHp = clone.stats.hp
  clone.status = 'none'
  refreshMoves(clone) // respeta su moveTier (potencia invertida)
  return clone
}

/**
 * Construye el equipo de un rival de la Liga: 6 Pokémon a nivel 100, con objetos
 * equipados, 1 megaevolución (Megapiedra a un mega-capaz) y 1 Movimiento Z.
 */
export function buildLeagueTeam(def: LeagueTrainerDef, rng: RNG): PokemonInstance[] {
  const ids = [...new Set(def.team)].slice(0, 6)
  // Rellena hasta 6 con Pokémon fuertes de la temática del entrenador.
  if (ids.length < 6) {
    const types: PokemonType[] = def.specialtyType ? [def.specialtyType] : [...new Set(def.team.flatMap((id) => getSpecies(id).types))]
    const themed = ALL_SPECIES.filter((s) => !ids.includes(s.id) && !s.mythical && s.types.some((t) => types.includes(t))).sort((a, b) => bst(b.id) - bst(a.id))
    for (const s of themed) { if (ids.length >= 6) break; ids.push(s.id) }
    if (ids.length < 6) {
      const strong = [...ALL_SPECIES].filter((s) => !s.mythical).sort((a, b) => bst(b.id) - bst(a.id))
      for (const s of strong) { if (ids.length >= 6) break; if (!ids.includes(s.id)) ids.push(s.id) }
    }
  }
  const team = ids.map((id) => createInstance(id, 100, rng))
  // Objetos variados (uno por Pokémon).
  const items = rng.sample(HELD_POOL, team.length)
  team.forEach((m, i) => { m.heldItemId = items[i] ?? 'life-orb' })
  // 1 megaevolución: Megapiedra a un mega-capaz (o convierte uno si ninguno lo es).
  let mi = team.findIndex((m) => getMegaForms(m.speciesId).length > 0)
  if (mi < 0) {
    const baseId = rng.pick(MEGA_BASES)
    team[team.length - 1] = createInstance(baseId, 100, rng)
    mi = team.length - 1
  }
  team[mi].heldItemId = 'mega-stone'
  // 1 Movimiento Z (en otro Pokémon distinto al de la mega).
  let zi = team.findIndex((_, i) => i !== mi)
  if (zi < 0) zi = 0
  team[zi].moveTier = 3
  refreshMoves(team[zi])
  return team
}
