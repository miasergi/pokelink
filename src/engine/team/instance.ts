import type { BaseStats, MoveInstance, PokemonInstance, SpeciesData } from '@/types'
import { getMove, getSpecies, tryGetMove } from '@/data'
import { RNG } from '@/utils/rng'
import { computeStats, expForLevel } from './leveling'

let uidCounter = 0
function nextUid(): string {
  uidCounter += 1
  return `p${uidCounter}_${Date.now().toString(36)}`
}

function randomIvs(rng: RNG): BaseStats {
  const r = () => rng.int(0, 31)
  return { hp: r(), atk: r(), def: r(), spa: r(), spd: r(), spe: r() }
}

/**
 * Elige hasta 4 movimientos del learnset disponibles a `level`.
 * Prioriza variedad de tipo y potencia; garantiza al menos un movimiento de daño.
 */
export function selectMoveset(species: SpeciesData, level: number): MoveInstance[] {
  const available = species.learnset
    .filter((e) => e.level <= level)
    .map((e) => e.moveId)
  // De-dup conservando el último aprendido (suele ser el mejor)
  const unique = [...new Set(available)]

  const scored = unique
    .map((id) => tryGetMove(id))
    .filter((m): m is NonNullable<typeof m> => !!m)
    .map((m) => {
      // Puntuación: potencia + bonus STAB + leve bonus a status útiles
      let score = m.power
      if (m.category !== 'status' && species.types.includes(m.type)) score += 25
      if (m.category === 'status') score += 15
      return { m, score }
    })
    .sort((a, b) => b.score - a.score)

  const chosen: typeof scored = []
  const seenTypes = new Set<string>()
  // 1ª pasada: maximiza variedad de tipo entre los movimientos de daño
  for (const s of scored) {
    if (chosen.length >= 4) break
    if (s.m.category === 'status') continue
    if (seenTypes.has(s.m.type) && chosen.length >= 2) continue
    chosen.push(s)
    seenTypes.add(s.m.type)
  }
  // 2ª pasada: rellena con lo mejor que quede
  for (const s of scored) {
    if (chosen.length >= 4) break
    if (chosen.includes(s)) continue
    chosen.push(s)
  }

  let picks = chosen.slice(0, 4)
  // Garantiza al menos un movimiento de daño
  if (!picks.some((p) => p.m.category !== 'status')) {
    picks = [{ m: getMove(33), score: 0 }, ...picks].slice(0, 4) // Placaje
  }
  if (picks.length === 0) picks = [{ m: getMove(33), score: 0 }] // fallback Placaje

  return picks.map(({ m }) => ({ moveId: m.id, pp: m.pp, maxPp: m.pp }))
}

export interface CreateOptions {
  moveIds?: number[]
  heldItemId?: string | null
  shinyChance?: number
}

/** Crea una instancia jugable de una especie a un nivel. */
export function createInstance(
  speciesId: number,
  level: number,
  rng: RNG,
  opts: CreateOptions = {},
): PokemonInstance {
  const species = getSpecies(speciesId)
  const ivs = randomIvs(rng)
  const stats = computeStats(species.baseStats, ivs, level)
  const moves: MoveInstance[] = opts.moveIds
    ? opts.moveIds.map((id) => {
        const m = getMove(id)
        return { moveId: id, pp: m.pp, maxPp: m.pp }
      })
    : selectMoveset(species, level)

  return {
    uid: nextUid(),
    speciesId,
    level,
    exp: expForLevel(level),
    ivs,
    stats,
    currentHp: stats.hp,
    status: 'none',
    moves,
    heldItemId: opts.heldItemId ?? null,
    shiny: rng.chance(opts.shinyChance ?? 1 / 512),
  }
}

export function isFainted(mon: PokemonInstance): boolean {
  return mon.currentHp <= 0
}

export function fullHeal(mon: PokemonInstance): void {
  mon.currentHp = mon.stats.hp
  mon.status = 'none'
  for (const mv of mon.moves) mv.pp = mv.maxPp
}
