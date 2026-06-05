import type { ItemData, PokemonType } from '@/types'

// Catálogo de objetos. Sprites desde el repo de PokeAPI (items).
const ITEM_SPRITE = (slug: string) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`
// Sprites propios servidos desde public/.
const LOCAL_ITEM = (file: string) => `${import.meta.env.BASE_URL}items/${file}`

// Objetos de tipo: +50% al daño de los ataques de ese tipo.
const TYPE_BOOST_DEFS: { type: PokemonType; name: string; sprite: string }[] = [
  { type: 'normal', name: 'Pañuelo Seda', sprite: 'silk-scarf' },
  { type: 'fire', name: 'Carbón', sprite: 'charcoal' },
  { type: 'water', name: 'Aguamística', sprite: 'mystic-water' },
  { type: 'electric', name: 'Imán', sprite: 'magnet' },
  { type: 'grass', name: 'Semilla Milagro', sprite: 'miracle-seed' },
  { type: 'ice', name: 'Hielo Eterno', sprite: 'never-melt-ice' },
  { type: 'fighting', name: 'Cinturón Negro', sprite: 'black-belt' },
  { type: 'poison', name: 'Púa Veneno', sprite: 'poison-barb' },
  { type: 'ground', name: 'Arena Fina', sprite: 'soft-sand' },
  { type: 'flying', name: 'Pico Afilado', sprite: 'sharp-beak' },
  { type: 'psychic', name: 'Cuchara Torcida', sprite: 'twisted-spoon' },
  { type: 'bug', name: 'Polvo Plata', sprite: 'silver-powder' },
  { type: 'rock', name: 'Pedrusco', sprite: 'hard-stone' },
  { type: 'ghost', name: 'Hechizo', sprite: 'spell-tag' },
  { type: 'dragon', name: 'Colmillo Dragón', sprite: 'dragon-fang' },
  { type: 'dark', name: 'Gafas de Sol', sprite: 'black-glasses' },
  { type: 'steel', name: 'Revestimiento Metálico', sprite: 'metal-coat' },
  { type: 'fairy', name: 'Polvo Hada', sprite: 'pixie-plate' },
]
const TYPE_ES: Record<PokemonType, string> = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta',
  ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador',
  psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón',
  dark: 'Siniestro', steel: 'Acero', fairy: 'Hada',
}
/** id de objeto de tipo -> tipo que potencia (para el motor de combate). */
export const TYPE_BOOST_BY_ID: Record<string, PokemonType> = {}
const TYPE_BOOST_ITEMS: ItemData[] = TYPE_BOOST_DEFS.map((d) => {
  const id = `boost-${d.type}`
  TYPE_BOOST_BY_ID[id] = d.type
  return { id, name: d.name, category: 'held' as const, description: `Sube un 50% el daño de los ataques de tipo ${TYPE_ES[d.type]}.`, price: 2500, sprite: ITEM_SPRITE(d.sprite) }
})

// Catálogo ÁGIL pensado para roguelike: pocas categorías, decisiones rápidas.
export const ITEMS: ItemData[] = [
  // --- Pociones (escalonadas) ---
  { id: 'potion', name: 'Poción', category: 'heal', description: 'Cura el 25% de los PS de un Pokémon.', price: 400, sprite: ITEM_SPRITE('potion') },
  { id: 'super-potion', name: 'Superpoción', category: 'heal', description: 'Cura el 50% de los PS de un Pokémon.', price: 800, sprite: ITEM_SPRITE('super-potion') },
  { id: 'hyper-potion', name: 'Hiperpoción', category: 'heal', description: 'Cura el 75% de los PS de un Pokémon.', price: 1400, sprite: ITEM_SPRITE('hyper-potion') },
  { id: 'max-potion', name: 'Poción Máxima', category: 'heal', description: 'Restaura el 100% de los PS de un Pokémon.', price: 2200, sprite: ITEM_SPRITE('max-potion') },

  // --- Revivir ---
  { id: 'revive', name: 'Revivir', category: 'revive', description: 'Revive con el 50% de los PS.', price: 1500, sprite: ITEM_SPRITE('revive') },
  { id: 'max-revive', name: 'Revivir Máx', category: 'revive', description: 'Revive con todos los PS.', price: 4000, sprite: ITEM_SPRITE('max-revive') },

  // --- Mejora (consumibles de subida) ---
  { id: 'rare-candy', name: 'Caramelo Raro', category: 'battle', description: 'Sube 3 niveles a un Pokémon (sube todas sus stats).', price: 2000, sprite: ITEM_SPRITE('rare-candy') },
  { id: 'super-candy', name: 'Supercaramelo', category: 'battle', description: 'Sube 5 niveles de golpe a un Pokémon.', price: 7000, sprite: ITEM_SPRITE('lucky-egg') },
  { id: 'upgrade', name: 'Mejora', category: 'battle', description: 'Sube el NIVEL de potencia del ataque de un Pokémon (40 → 80 → 120).', price: 4000, sprite: ITEM_SPRITE('ability-capsule') },
  { id: 'revive-charm', name: 'Salvavidas', category: 'special', description: 'Si pierdes un combate, revives a 1 Pokémon y continúas la partida. Se usa solo.', price: 5000, sprite: ITEM_SPRITE('sacred-ash') },

  // --- Objetos equipables genéricos ---
  { id: 'choice-band', name: 'Cinta Elección', category: 'held', description: 'Sus ataques pegan un 30% más fuerte (cualquier tipo).', price: 3500, sprite: ITEM_SPRITE('choice-band') },
  { id: 'assault-vest', name: 'Chaleco Asalto', category: 'held', description: 'Sube un 50% AMBAS defensas (recibe menos daño).', price: 3500, sprite: ITEM_SPRITE('assault-vest') },
  { id: 'leftovers', name: 'Restos', category: 'held', description: 'Recupera un 10% de los PS cada turno.', price: 3000, sprite: ITEM_SPRITE('leftovers') },
  { id: 'shell-bell', name: 'Campana Concha', category: 'held', description: 'Te cura un 15% del daño que infliges con cada ataque.', price: 3000, sprite: ITEM_SPRITE('shell-bell') },
  { id: 'life-orb', name: 'Vidasfera', category: 'held', description: 'Daño x1.3 a cambio de algo de PS.', price: 3000, sprite: ITEM_SPRITE('life-orb') },
  { id: 'focus-sash', name: 'Banda Focal', category: 'held', description: 'Sobrevive con 1 PS a un golpe letal (una vez).', price: 2500, sprite: ITEM_SPRITE('focus-sash') },
  { id: 'rocky-helmet', name: 'Casco Dentado', category: 'held', description: 'Daña al atacante al recibir un golpe.', price: 2000, sprite: ITEM_SPRITE('rocky-helmet') },

  // --- Objetos de tipo: +50% al daño de ataques de ESE tipo (equipables) ---
  ...TYPE_BOOST_ITEMS,

  // --- Evolución (universales) ---
  { id: 'evo-stone', name: 'Piedra Evolutiva', category: 'evolution', description: 'Evoluciona al instante a cualquier Pokémon que pueda evolucionar.', price: 3000, sprite: ITEM_SPRITE('shiny-stone') },
  { id: 'mega-stone', name: 'Megapiedra', category: 'evolution', description: 'Megaevoluciona al instante (y de forma permanente) a cualquier Pokémon compatible.', price: 6000, sprite: LOCAL_ITEM('mega-stone.png') },
]

const itemById = new Map<string, ItemData>()
for (const it of ITEMS) itemById.set(it.id, it)

export function getItem(id: string): ItemData {
  const it = itemById.get(id)
  if (it) return it
  // Objeto retirado/desconocido (p.ej. save antiguo): placeholder seguro.
  return { id, name: id, category: 'battle', description: 'Objeto retirado.', price: 0, sprite: ITEM_SPRITE('poke-ball') }
}

export function tryGetItem(id: string): ItemData | undefined {
  return itemById.get(id)
}
