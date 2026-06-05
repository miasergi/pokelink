import type { PokemonInstance, SpeciesData, TrainerData } from '@/types'
import { createInstance } from '@/engine/team/instance'
import { RNG } from '@/utils/rng'
import { ITEMS } from '@/data/items'

/** Suma de stats base (para escalar encuentros por "tier"). */
export function bst(s: SpeciesData): number {
  const b = s.baseStats
  return b.hp + b.atk + b.def + b.spa + b.spd + b.spe
}

/** Convierte el roster de un entrenador en instancias jugables. */
export function buildTrainerTeam(trainer: TrainerData, rng: RNG): PokemonInstance[] {
  return trainer.team.map((spec) =>
    createInstance(spec.speciesId, spec.level, rng, {
      moveIds: spec.moveIds,
      heldItemId: spec.heldItemId ?? null,
      shinyChance: 0,
    }),
  )
}

/**
 * Filtra el pool a especies de "tier" apropiado para el nivel,
 * para que los encuentros salvajes escalen de forma natural.
 */
export function tierPool(pool: SpeciesData[], level: number): SpeciesData[] {
  const cap = 320 + level * 6 // BST máximo permitido
  const filtered = pool.filter((s) => bst(s) <= cap)
  return filtered.length > 6 ? filtered : pool
}

export function makeWild(pool: SpeciesData[], level: number, rng: RNG): PokemonInstance {
  const tier = tierPool(pool, level)
  const species = rng.pick(tier)
  const lv = Math.max(2, level + rng.int(-2, 1))
  return createInstance(species.id, lv, rng)
}

// --- Pools de objetos por contexto (catálogo ágil) ---
const HEAL_ITEMS = ['potion', 'max-potion', 'revive', 'max-revive']
const HELD_ITEMS = ['leftovers', 'life-orb', 'focus-sash', 'choice-band', 'choice-specs', 'assault-vest', 'rocky-helmet']
const BATTLE_ITEMS = ['rare-candy']

/** 3 objetos a elegir como recompensa. */
export function itemChoices(rng: RNG, depthFrac: number): string[] {
  const pool: string[] = []
  pool.push(rng.pick(['potion', 'revive', 'rare-candy']))
  pool.push(rng.pick(depthFrac > 0.3 ? HELD_ITEMS : [...HEAL_ITEMS, ...BATTLE_ITEMS]))
  // A partir de media run pueden aparecer piedras de evolución / Megapiedra.
  const lastPool = depthFrac > 0.45 && rng.chance(0.2)
    ? ['mega-stone']
    : depthFrac > 0.3
      ? ['evo-stone', 'rare-candy', ...HELD_ITEMS]
      : [...BATTLE_ITEMS, ...HELD_ITEMS]
  pool.push(rng.pick(lastPool))
  const set = [...new Set(pool)]
  while (set.length < 3) {
    const extra = rng.pick([...HEAL_ITEMS, ...HELD_ITEMS, ...BATTLE_ITEMS])
    if (!set.includes(extra)) set.push(extra)
  }
  return set.slice(0, 3)
}

/** Stock de tienda. */
export function shopStock(rng: RNG, depthFrac: number): string[] {
  const base = ['potion', 'revive', 'rare-candy']
  const advanced = depthFrac > 0.4 ? ['max-potion', 'max-revive'] : []
  const held = rng.sample(HELD_ITEMS, 2)
  const evo = depthFrac > 0.4 ? ['evo-stone'] : []
  const mega = depthFrac > 0.5 ? ['mega-stone'] : []
  return [...base, ...advanced, ...held, ...evo, ...mega]
}

// --- Eventos aleatorios ---
export interface RunEventOption {
  label: string
  description: string
}
export interface RunEventDef {
  id: string
  title: string
  description: string
  options: RunEventOption[]
}

export const EVENTS: Record<string, RunEventDef> = {
  hiker_heal: {
    id: 'hiker_heal',
    title: 'Un excursionista amable',
    description: 'Un excursionista se ofrece a cuidar de tu equipo en su cabaña.',
    options: [
      { label: 'Aceptar', description: 'Cura por completo a tu equipo.' },
      { label: 'Seguir camino', description: 'Recibe 500 ₽ por las prisas.' },
    ],
  },
  mystery_egg: {
    id: 'mystery_egg',
    title: 'Huevo misterioso',
    description: 'Encuentras un huevo abandonado. Podría eclosionar... o no.',
    options: [
      { label: 'Incubarlo', description: 'Añade un Pokémon aleatorio a tu equipo/caja.' },
      { label: 'Ignorarlo', description: 'No pasa nada.' },
    ],
  },
  wishing_well: {
    id: 'wishing_well',
    title: 'Pozo de los deseos',
    description: 'Un pozo brillante. Quizá recompense tu generosidad.',
    options: [
      { label: 'Tirar 300 ₽', description: '50% de duplicar, 50% de perderlo.' },
      { label: 'Beber agua', description: 'Cura el estado de todo el equipo.' },
    ],
  },
  rare_candy_cache: {
    id: 'rare_candy_cache',
    title: 'Alijo escondido',
    description: 'Detrás de unas rocas encuentras provisiones.',
    options: [
      { label: 'Coger Caramelos', description: 'Recibe 2 Caramelos Raros.' },
      { label: 'Coger dinero', description: 'Recibe 1200 ₽.' },
    ],
  },
  risky_cave: {
    id: 'risky_cave',
    title: 'Cueva peligrosa',
    description: 'Una cueva oscura emana energía. Hay tesoro... y peligro.',
    options: [
      { label: 'Entrar', description: 'Tu equipo recibe daño, pero ganas un objeto raro.' },
      { label: 'Evitarla', description: 'Te marchas sin más.' },
    ],
  },
}

export const EVENT_IDS = Object.keys(EVENTS)

export function getItemSafe(id: string) {
  return ITEMS.find((i) => i.id === id)
}
