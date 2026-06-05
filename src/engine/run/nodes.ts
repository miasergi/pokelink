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
const BATTLE_ITEMS = ['rare-candy', 'attack-boost', 'defense-boost', 'hp-boost', 'speed-boost', 'super-candy']

/** 3 objetos a elegir como recompensa. */
export function itemChoices(rng: RNG, depthFrac: number): string[] {
  const pool: string[] = []
  // 1) SIEMPRE una mejora permanente (refuerzo de stat o caramelo).
  pool.push(rng.pick(['attack-boost', 'defense-boost', 'hp-boost', 'speed-boost', 'rare-candy']))
  // 2) Soporte (curación/revivir).
  pool.push(rng.pick([...HEAL_ITEMS, 'revive-charm']))
  // 3) Objeto equipable / piedra (Megapiedra a partir de media run).
  const lastPool = depthFrac > 0.45 && rng.chance(0.25)
    ? ['mega-stone']
    : depthFrac > 0.3
      ? ['evo-stone', ...HELD_ITEMS]
      : [...HELD_ITEMS, 'attack-boost']
  pool.push(rng.pick(lastPool))
  const set = [...new Set(pool)]
  while (set.length < 3) {
    const extra = rng.pick([...BATTLE_ITEMS, ...HELD_ITEMS, ...HEAL_ITEMS])
    if (!set.includes(extra)) set.push(extra)
  }
  return set.slice(0, 3)
}

/** Stock de tienda. */
export function shopStock(rng: RNG, depthFrac: number): string[] {
  const base = ['potion', 'revive', 'rare-candy', 'attack-boost', 'defense-boost']
  const advanced = depthFrac > 0.4 ? ['max-potion', 'max-revive', 'revive-charm', 'hp-boost', 'super-candy'] : []
  const held = rng.sample(HELD_ITEMS, 2)
  const evo = depthFrac > 0.4 ? ['evo-stone'] : []
  const mega = depthFrac > 0.5 ? ['mega-stone'] : []
  return [...base, ...advanced, ...held, ...evo, ...mega]
}

// --- Eventos aleatorios (data-driven) ---
export type EventEffect =
  | { kind: 'money'; amount: number } // + o - dinero
  | { kind: 'heal' } // cura todo el equipo
  | { kind: 'damage'; frac: number } // daña a todo el equipo (frac de PS máx)
  | { kind: 'item'; itemId: string; qty: number }
  | { kind: 'randomItem' } // objeto raro aleatorio
  | { kind: 'addMon' } // añade un Pokémon de nivel medio
  | { kind: 'levelUp'; amount: number } // sube nivel a todo el equipo
  | { kind: 'loseMoneyFrac'; frac: number } // pierdes % del dinero
  | { kind: 'gamble'; cost: number; win: number; chance: number }
  | { kind: 'risky'; chance: number; good: EventEffect; bad: EventEffect }
  | { kind: 'none' }

export interface RunEventOption {
  label: string
  description: string
  effect: EventEffect
}
export interface RunEventDef {
  id: string
  title: string
  description: string
  /** 'good' | 'bad' | 'neutral' — solo para sabor/UI. */
  tone?: 'good' | 'bad' | 'neutral'
  options: RunEventOption[]
}

export const EVENTS: Record<string, RunEventDef> = {
  // --- Buenos ---
  hiker_heal: { id: 'hiker_heal', title: 'Excursionista amable', tone: 'good',
    description: 'Un excursionista se ofrece a cuidar de tu equipo en su cabaña.',
    options: [
      { label: 'Aceptar', description: 'Cura por completo a tu equipo.', effect: { kind: 'heal' } },
      { label: 'Seguir camino', description: 'Recibe 500 ₽ por las prisas.', effect: { kind: 'money', amount: 500 } },
    ] },
  mystery_egg: { id: 'mystery_egg', title: 'Huevo misterioso', tone: 'good',
    description: 'Encuentras un huevo abandonado. Podría eclosionar... o no.',
    options: [
      { label: 'Incubarlo', description: 'Añade un Pokémon aleatorio a tu equipo/caja.', effect: { kind: 'addMon' } },
      { label: 'Ignorarlo', description: 'No pasa nada.', effect: { kind: 'none' } },
    ] },
  rare_candy_cache: { id: 'rare_candy_cache', title: 'Alijo escondido', tone: 'good',
    description: 'Detrás de unas rocas encuentras provisiones.',
    options: [
      { label: 'Coger Caramelos', description: 'Recibe 2 Caramelos Raros.', effect: { kind: 'item', itemId: 'rare-candy', qty: 2 } },
      { label: 'Coger dinero', description: 'Recibe 1200 ₽.', effect: { kind: 'money', amount: 1200 } },
    ] },
  berry_bush: { id: 'berry_bush', title: 'Arbusto de bayas', tone: 'good',
    description: 'Un arbusto cargado de bayas frescas.',
    options: [
      { label: 'Comerlas', description: 'Cura todo tu equipo.', effect: { kind: 'heal' } },
      { label: 'Guardarlas', description: 'Consigue unos Restos.', effect: { kind: 'item', itemId: 'leftovers', qty: 1 } },
    ] },
  lost_trainer: { id: 'lost_trainer', title: 'Entrenador perdido', tone: 'good',
    description: 'Un entrenador despistado te agradece que le indiques el camino.',
    options: [
      { label: 'Ayudarle', description: 'Te recompensa con 800 ₽.', effect: { kind: 'money', amount: 800 } },
      { label: 'Ignorar', description: 'No pasa nada.', effect: { kind: 'none' } },
    ] },
  lucky_coin: { id: 'lucky_coin', title: 'Moneda de la suerte', tone: 'good',
    description: 'Una moneda dorada brilla en el suelo.',
    options: [
      { label: 'Recogerla', description: '+1500 ₽.', effect: { kind: 'money', amount: 1500 } },
    ] },
  combat_master: { id: 'combat_master', title: 'Maestro de combate', tone: 'good',
    description: 'Un veterano se ofrece a entrenar a un Pokémon... o a todos un poco.',
    options: [
      { label: 'Reforzar ataque', description: 'Consigue un Refuerzo de Ataque.', effect: { kind: 'item', itemId: 'attack-boost', qty: 1 } },
      { label: 'Entrenamiento exprés', description: '+1 nivel a todo el equipo.', effect: { kind: 'levelUp', amount: 1 } },
    ] },
  abandoned_pack: { id: 'abandoned_pack', title: 'Mochila abandonada', tone: 'good',
    description: 'Una mochila olvidada junto al sendero.',
    options: [
      { label: 'Registrarla', description: 'Consigue un objeto raro.', effect: { kind: 'randomItem' } },
      { label: 'Dejarla', description: 'No es tuya...', effect: { kind: 'none' } },
    ] },

  // --- Azar / pozo ---
  wishing_well: { id: 'wishing_well', title: 'Pozo de los deseos', tone: 'neutral',
    description: 'Un pozo brillante. Quizá recompense tu generosidad.',
    options: [
      { label: 'Tirar 300 ₽', description: '50%: duplicas. 50%: lo pierdes.', effect: { kind: 'gamble', cost: 300, win: 600, chance: 0.5 } },
      { label: 'Seguir', description: 'No pasa nada.', effect: { kind: 'none' } },
    ] },
  treasure_chest: { id: 'treasure_chest', title: 'Cofre misterioso', tone: 'neutral',
    description: 'Un cofre antiguo. ¿Tesoro o trampa?',
    options: [
      { label: 'Abrirlo', description: '70%: objeto raro. 30%: trampa (daño).', effect: { kind: 'risky', chance: 0.7, good: { kind: 'randomItem' }, bad: { kind: 'damage', frac: 0.3 } } },
      { label: 'No tocarlo', description: 'Mejor no arriesgarse.', effect: { kind: 'none' } },
    ] },
  slot_machine: { id: 'slot_machine', title: 'Máquina tragaperras', tone: 'neutral',
    description: 'Una vieja máquina del casino.',
    options: [
      { label: 'Jugar 500 ₽', description: '40%: ganas 1500 ₽.', effect: { kind: 'gamble', cost: 500, win: 2000, chance: 0.4 } },
      { label: 'Pasar', description: 'No juegas.', effect: { kind: 'none' } },
    ] },

  // --- Malos ---
  risky_cave: { id: 'risky_cave', title: 'Cueva peligrosa', tone: 'bad',
    description: 'Una cueva oscura emana energía. Hay tesoro... y peligro.',
    options: [
      { label: 'Entrar', description: 'Tu equipo recibe daño, pero ganas un objeto raro.', effect: { kind: 'risky', chance: 1, good: { kind: 'randomItem' }, bad: { kind: 'damage', frac: 0.25 } } },
      { label: 'Evitarla', description: 'Te marchas sin más.', effect: { kind: 'none' } },
    ] },
  ambush: { id: 'ambush', title: '¡Emboscada!', tone: 'bad',
    description: 'Una bandada de Pokémon salvajes os sorprende.',
    options: [
      { label: 'Defenderse', description: 'Recibes algo de daño.', effect: { kind: 'damage', frac: 0.2 } },
      { label: 'Huir soltando dinero', description: 'Escapas, pero pierdes algo de dinero.', effect: { kind: 'loseMoneyFrac', frac: 0.15 } },
    ] },
  toxic_swamp: { id: 'toxic_swamp', title: 'Pantano tóxico', tone: 'bad',
    description: 'El camino corto cruza un pantano que daña a los Pokémon.',
    options: [
      { label: 'Cruzar rápido', description: 'Daño leve a todo el equipo.', effect: { kind: 'damage', frac: 0.15 } },
      { label: 'Rodear', description: 'Tardas más, pero a salvo.', effect: { kind: 'none' } },
    ] },
  thief: { id: 'thief', title: '¡Un ladrón!', tone: 'bad',
    description: 'Un ladrón intenta robarte la cartera.',
    options: [
      { label: 'Perseguirlo', description: '50%: recuperas y ganas extra. 50%: nada.', effect: { kind: 'gamble', cost: 0, win: 700, chance: 0.5 } },
      { label: 'Dejarlo ir', description: 'Pierdes parte de tu dinero.', effect: { kind: 'loseMoneyFrac', frac: 0.2 } },
    ] },
  cursed_idol: { id: 'cursed_idol', title: 'Ídolo maldito', tone: 'bad',
    description: 'Un ídolo dorado tienta tu codicia.',
    options: [
      { label: 'Cogerlo', description: '+2000 ₽, pero tu equipo sufre daño.', effect: { kind: 'risky', chance: 1, good: { kind: 'money', amount: 2000 }, bad: { kind: 'damage', frac: 0.3 } } },
      { label: 'Dejarlo', description: 'No te fías.', effect: { kind: 'none' } },
    ] },
  rockslide: { id: 'rockslide', title: 'Desprendimiento', tone: 'bad',
    description: '¡Caen rocas por la ladera!',
    options: [
      { label: 'Cubrirse', description: 'Daño moderado, pero podría ser peor.', effect: { kind: 'damage', frac: 0.2 } },
    ] },
}

export const EVENT_IDS = Object.keys(EVENTS)

export function getItemSafe(id: string) {
  return ITEMS.find((i) => i.id === id)
}
