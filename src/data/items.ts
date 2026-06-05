import type { ItemData } from '@/types'

// Catálogo de objetos. Sprites desde el repo de PokeAPI (items).
const ITEM_SPRITE = (slug: string) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`
// Sprites propios servidos desde public/.
const LOCAL_ITEM = (file: string) => `${import.meta.env.BASE_URL}items/${file}`

// Catálogo ÁGIL pensado para roguelike: pocas categorías, decisiones rápidas.
export const ITEMS: ItemData[] = [
  // --- Pociones ---
  { id: 'potion', name: 'Poción', category: 'heal', description: 'Cura el 50% de los PS de un Pokémon.', price: 400, sprite: ITEM_SPRITE('hyper-potion') },
  { id: 'max-potion', name: 'Poción Máxima', category: 'heal', description: 'Restaura todos los PS y cura el estado.', price: 1500, sprite: ITEM_SPRITE('max-potion') },

  // --- Revivir ---
  { id: 'revive', name: 'Revivir', category: 'revive', description: 'Revive con el 50% de los PS.', price: 1500, sprite: ITEM_SPRITE('revive') },
  { id: 'max-revive', name: 'Revivir Máx', category: 'revive', description: 'Revive con todos los PS.', price: 4000, sprite: ITEM_SPRITE('max-revive') },

  // --- Mejora ---
  { id: 'rare-candy', name: 'Caramelo Raro', category: 'battle', description: 'Sube 3 niveles a un Pokémon (sube todas sus stats).', price: 2000, sprite: ITEM_SPRITE('rare-candy') },
  { id: 'super-candy', name: 'Supercaramelo', category: 'battle', description: 'Sube 5 niveles de golpe a un Pokémon.', price: 7000, sprite: ITEM_SPRITE('exp-candy-l') },
  { id: 'attack-boost', name: 'Refuerzo de Ataque', category: 'battle', description: 'Sube de forma permanente el Ataque de un Pokémon (sus ataques pegan más fuerte).', price: 2500, sprite: ITEM_SPRITE('protein') },
  { id: 'defense-boost', name: 'Refuerzo de Defensa', category: 'battle', description: 'Sube de forma permanente la Defensa de un Pokémon (aguanta más golpes).', price: 2500, sprite: ITEM_SPRITE('iron') },
  { id: 'hp-boost', name: 'Refuerzo de PS', category: 'battle', description: 'Sube de forma permanente los PS máximos de un Pokémon.', price: 2500, sprite: ITEM_SPRITE('hp-up') },
  { id: 'speed-boost', name: 'Refuerzo de Velocidad', category: 'battle', description: 'Sube de forma permanente la Velocidad de un Pokémon (ataca antes).', price: 2000, sprite: ITEM_SPRITE('carbos') },
  { id: 'revive-charm', name: 'Salvavidas', category: 'special', description: 'Si pierdes un combate, revives a 1 Pokémon y continúas la partida. Se usa solo.', price: 5000, sprite: ITEM_SPRITE('sacred-ash') },

  // --- Objetos de batalla (equipables, efecto pasivo en combate) ---
  { id: 'leftovers', name: 'Restos', category: 'held', description: 'Recupera 1/16 de PS cada turno.', price: 2000, sprite: ITEM_SPRITE('leftovers') },
  { id: 'life-orb', name: 'Vidasfera', category: 'held', description: 'Daño x1.3 a cambio de algo de PS.', price: 3000, sprite: ITEM_SPRITE('life-orb') },
  { id: 'focus-sash', name: 'Banda Focal', category: 'held', description: 'Sobrevive con 1 PS a un golpe letal (una vez).', price: 2500, sprite: ITEM_SPRITE('focus-sash') },
  { id: 'choice-band', name: 'Cinta Elección', category: 'held', description: 'Ataque físico x1.5.', price: 3000, sprite: ITEM_SPRITE('choice-band') },
  { id: 'choice-specs', name: 'Gafas Elección', category: 'held', description: 'Ataque especial x1.5.', price: 3000, sprite: ITEM_SPRITE('choice-specs') },
  { id: 'assault-vest', name: 'Chaleco Asalto', category: 'held', description: 'Defensa especial x1.5.', price: 3000, sprite: ITEM_SPRITE('assault-vest') },
  { id: 'rocky-helmet', name: 'Casco Dentado', category: 'held', description: 'Daña al atacante de contacto.', price: 2000, sprite: ITEM_SPRITE('rocky-helmet') },

  // --- Evolución (universales) ---
  { id: 'evo-stone', name: 'Piedra Evolutiva', category: 'evolution', description: 'Evoluciona al instante a cualquier Pokémon que pueda evolucionar.', price: 3000, sprite: ITEM_SPRITE('shiny-stone') },
  { id: 'mega-stone', name: 'Megapiedra', category: 'evolution', description: 'Megaevoluciona al instante (y de forma permanente) a cualquier Pokémon compatible.', price: 6000, sprite: LOCAL_ITEM('mega-stone.png') },
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
