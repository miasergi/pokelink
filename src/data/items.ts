import type { ItemData } from '@/types'

// Catálogo de objetos. Sprites desde el repo de PokeAPI (items).
const ITEM_SPRITE = (slug: string) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`

export const ITEMS: ItemData[] = [
  // --- Curación ---
  { id: 'potion', name: 'Poción', category: 'heal', description: 'Cura 20 PS a un Pokémon.', price: 200, sprite: ITEM_SPRITE('potion') },
  { id: 'super-potion', name: 'Superpoción', category: 'heal', description: 'Cura 60 PS.', price: 700, sprite: ITEM_SPRITE('super-potion') },
  { id: 'hyper-potion', name: 'Hiperpoción', category: 'heal', description: 'Cura 120 PS.', price: 1200, sprite: ITEM_SPRITE('hyper-potion') },
  { id: 'max-potion', name: 'Máx. Poción', category: 'heal', description: 'Restaura todos los PS.', price: 2500, sprite: ITEM_SPRITE('max-potion') },
  { id: 'full-heal', name: 'Cura Total', category: 'heal', description: 'Cura cualquier estado.', price: 600, sprite: ITEM_SPRITE('full-heal') },

  // --- Revivir ---
  { id: 'revive', name: 'Revivir', category: 'revive', description: 'Revive con la mitad de PS.', price: 1500, sprite: ITEM_SPRITE('revive') },
  { id: 'max-revive', name: 'Máx. Revivir', category: 'revive', description: 'Revive con todos los PS.', price: 4000, sprite: ITEM_SPRITE('max-revive') },

  // --- Held items (objetos equipados, efecto pasivo en combate) ---
  { id: 'leftovers', name: 'Restos', category: 'held', description: 'Recupera 1/16 de PS cada turno.', price: 2000, sprite: ITEM_SPRITE('leftovers') },
  { id: 'choice-band', name: 'Cinta Elección', category: 'held', description: 'Ataque x1.5 (físico).', price: 3000, sprite: ITEM_SPRITE('choice-band') },
  { id: 'choice-specs', name: 'Gafas Elección', category: 'held', description: 'At. Esp. x1.5.', price: 3000, sprite: ITEM_SPRITE('choice-specs') },
  { id: 'life-orb', name: 'Vidasfera', category: 'held', description: 'Daño x1.3 a cambio de PS.', price: 3000, sprite: ITEM_SPRITE('life-orb') },
  { id: 'focus-sash', name: 'Banda Focal', category: 'held', description: 'Sobrevive a 1 PS a un golpe letal (una vez).', price: 2500, sprite: ITEM_SPRITE('focus-sash') },
  { id: 'assault-vest', name: 'Chaleco Asalto', category: 'held', description: 'Def. Esp. x1.5.', price: 3000, sprite: ITEM_SPRITE('assault-vest') },
  { id: 'rocky-helmet', name: 'Casco Dentado', category: 'held', description: 'Daña al atacante de contacto.', price: 2000, sprite: ITEM_SPRITE('rocky-helmet') },

  // --- Piedras de evolución ---
  { id: 'fire-stone', name: 'Piedra Fuego', category: 'evolution', description: 'Hace evolucionar a ciertos Pokémon.', price: 3000, sprite: ITEM_SPRITE('fire-stone') },
  { id: 'water-stone', name: 'Piedra Agua', category: 'evolution', description: 'Hace evolucionar a ciertos Pokémon.', price: 3000, sprite: ITEM_SPRITE('water-stone') },
  { id: 'thunder-stone', name: 'Piedra Trueno', category: 'evolution', description: 'Hace evolucionar a ciertos Pokémon.', price: 3000, sprite: ITEM_SPRITE('thunder-stone') },
  { id: 'leaf-stone', name: 'Piedra Hoja', category: 'evolution', description: 'Hace evolucionar a ciertos Pokémon.', price: 3000, sprite: ITEM_SPRITE('leaf-stone') },
  { id: 'moon-stone', name: 'Piedra Lunar', category: 'evolution', description: 'Hace evolucionar a ciertos Pokémon.', price: 3000, sprite: ITEM_SPRITE('moon-stone') },
  { id: 'sun-stone', name: 'Piedra Solar', category: 'evolution', description: 'Hace evolucionar a ciertos Pokémon.', price: 3000, sprite: ITEM_SPRITE('sun-stone') },
  { id: 'shiny-stone', name: 'Piedra Día', category: 'evolution', description: 'Hace evolucionar a ciertos Pokémon.', price: 3000, sprite: ITEM_SPRITE('shiny-stone') },
  { id: 'dusk-stone', name: 'Piedra Noche', category: 'evolution', description: 'Hace evolucionar a ciertos Pokémon.', price: 3000, sprite: ITEM_SPRITE('dusk-stone') },
  { id: 'dawn-stone', name: 'Piedra Alba', category: 'evolution', description: 'Hace evolucionar a ciertos Pokémon.', price: 3000, sprite: ITEM_SPRITE('dawn-stone') },
  { id: 'ice-stone', name: 'Piedra Hielo', category: 'evolution', description: 'Hace evolucionar a ciertos Pokémon.', price: 3000, sprite: ITEM_SPRITE('ice-stone') },
  { id: 'mega-stone', name: 'Mega Piedra', category: 'held', description: 'Equípala a un Pokémon compatible: megaevoluciona al entrar en combate.', price: 8000, sprite: ITEM_SPRITE('mega-ring') },

  // --- Poké Balls ---
  { id: 'poke-ball', name: 'Poké Ball', category: 'ball', description: 'Captura Pokémon (x1).', price: 200, sprite: ITEM_SPRITE('poke-ball') },
  { id: 'great-ball', name: 'Super Ball', category: 'ball', description: 'Captura Pokémon (x1.5).', price: 600, sprite: ITEM_SPRITE('great-ball') },
  { id: 'ultra-ball', name: 'Ultra Ball', category: 'ball', description: 'Captura Pokémon (x2).', price: 1200, sprite: ITEM_SPRITE('ultra-ball') },

  // --- Battle (consumibles de boost para la run) ---
  { id: 'rare-candy', name: 'Caramelo Raro', category: 'battle', description: 'Sube 1 nivel a un Pokémon.', price: 2000, sprite: ITEM_SPRITE('rare-candy') },
  { id: 'pp-up', name: 'Más PP', category: 'battle', description: 'Restaura los PP de un Pokémon.', price: 500, sprite: ITEM_SPRITE('pp-up') },
]

const itemById = new Map<string, ItemData>()
for (const it of ITEMS) itemById.set(it.id, it)

export function getItem(id: string): ItemData {
  const it = itemById.get(id)
  if (!it) throw new Error(`Objeto desconocido: ${id}`)
  return it
}

export function tryGetItem(id: string): ItemData | undefined {
  return itemById.get(id)
}

export const BALL_MULTIPLIER: Record<string, number> = {
  'poke-ball': 1,
  'great-ball': 1.5,
  'ultra-ball': 2,
}
