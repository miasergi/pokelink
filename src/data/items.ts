import type { ItemData, PokemonType } from '@/types'

// Catálogo de objetos. Sprites desde el repo de PokeAPI (items).
const ITEM_SPRITE = (slug: string) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`
// Sprites propios servidos desde public/.
const LOCAL_ITEM = (file: string) => `${import.meta.env.BASE_URL}items/${file}`

// Tablas de tipo: +50% al daño de los ataques de ese tipo. Una por tipo, para
// estandarizar (Tabla Acero, Tabla Agua, Tabla Fuego...). El sprite es la placa
// oficial de cada tipo; Normal no tiene placa, así que reutiliza el Pañuelo Seda.
const TYPE_ES: Record<PokemonType, string> = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta',
  ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador',
  psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón',
  dark: 'Siniestro', steel: 'Acero', fairy: 'Hada',
}
const PLATE_SPRITE: Record<PokemonType, string> = {
  normal: 'silk-scarf', // no existe placa de tipo Normal: se mantiene el Pañuelo Seda
  fire: 'flame-plate', water: 'splash-plate', electric: 'zap-plate', grass: 'meadow-plate',
  ice: 'icicle-plate', fighting: 'fist-plate', poison: 'toxic-plate', ground: 'earth-plate',
  flying: 'sky-plate', psychic: 'mind-plate', bug: 'insect-plate', rock: 'stone-plate',
  ghost: 'spooky-plate', dragon: 'draco-plate', dark: 'dread-plate', steel: 'iron-plate',
  fairy: 'pixie-plate',
}
const ALL_TYPES = Object.keys(TYPE_ES) as PokemonType[]
/** id de objeto de tipo -> tipo que potencia (para el motor de combate). */
export const TYPE_BOOST_BY_ID: Record<string, PokemonType> = {}
const TYPE_BOOST_ITEMS: ItemData[] = ALL_TYPES.map((type) => {
  const id = `boost-${type}`
  TYPE_BOOST_BY_ID[id] = type
  return { id, name: `Tabla ${TYPE_ES[type]}`, category: 'held' as const, description: `Sube un 50% el daño de los ataques de tipo ${TYPE_ES[type]}.`, price: 2500, sprite: ITEM_SPRITE(PLATE_SPRITE[type]) }
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
  { id: 'rare-candy', name: 'Caramelo Raro', category: 'battle', description: 'Sube 3 niveles a un Pokémon (sube todas sus stats).', price: 2500, sprite: ITEM_SPRITE('rare-candy') },
  { id: 'super-candy', name: 'Supercaramelo', category: 'battle', description: 'Sube 5 niveles de golpe a un Pokémon.', price: 4000, sprite: ITEM_SPRITE('sweet-heart') },
  { id: 'upgrade', name: 'Mejora', category: 'battle', description: 'Sube el NIVEL de potencia del ataque de un Pokémon (40 → 80 → 120).', price: 4000, sprite: ITEM_SPRITE('ability-capsule') },
  { id: 'revive-charm', name: 'Salvavidas', category: 'special', description: 'Si pierdes contra un salvaje o un entrenador normal, revives a 1 Pokémon y continúas (no funciona contra jefes ni la Liga). Se usa solo.', price: 5000, sprite: ITEM_SPRITE('sacred-ash') },

  // --- Objetos equipables genéricos ---
  { id: 'choice-band', name: 'Cinta Elección', category: 'held', description: 'Sus ataques pegan un 30% más fuerte (cualquier tipo).', price: 3500, sprite: ITEM_SPRITE('choice-band') },
  { id: 'assault-vest', name: 'Chaleco Asalto', category: 'held', description: 'Sube un 50% AMBAS defensas (recibe menos daño).', price: 3500, sprite: ITEM_SPRITE('assault-vest') },
  { id: 'leftovers', name: 'Restos', category: 'held', description: 'Recupera un 10% de los PS cada turno.', price: 3000, sprite: ITEM_SPRITE('leftovers') },
  { id: 'shell-bell', name: 'Campana Concha', category: 'held', description: 'Te cura un 15% del daño que infliges con cada ataque.', price: 3000, sprite: ITEM_SPRITE('shell-bell') },
  { id: 'life-orb', name: 'Vidasfera', category: 'held', description: 'Daño x1.3 a cambio de algo de PS.', price: 3000, sprite: ITEM_SPRITE('life-orb') },
  { id: 'focus-sash', name: 'Cinta Focus', category: 'held', description: 'Sobrevive con 1 PS a un golpe letal (una vez).', price: 2500, sprite: ITEM_SPRITE('focus-sash') },
  { id: 'rocky-helmet', name: 'Casco Dentado', category: 'held', description: 'Cada vez que te golpean, el atacante pierde un 10% de sus PS máximos.', price: 2000, sprite: ITEM_SPRITE('rocky-helmet') },
  { id: 'expert-belt', name: 'Banda Experto', category: 'held', description: 'DUPLICA el daño de tus ataques SUPEREFICACES (+100%).', price: 3000, sprite: ITEM_SPRITE('expert-belt') },
  { id: 'quick-scarf', name: 'Pañuelo Veloz', category: 'held', description: 'DUPLICA la Velocidad (+100%); actúa antes en el turno.', price: 3000, sprite: ITEM_SPRITE('choice-scarf') },
  { id: 'eviolite', name: 'Mineral Evo.', category: 'held', description: 'Sube un 50% AMBAS defensas, pero solo si el Pokémon aún PUEDE evolucionar.', price: 3000, sprite: ITEM_SPRITE('eviolite') },
  { id: 'super-mineral', name: 'Supermineral Evo.', category: 'held', description: 'DUPLICA todas las stats, pero solo si al Pokémon aún le quedan 2 evoluciones (1ª etapa).', price: 6500, sprite: ITEM_SPRITE('lustrous-orb') },
  { id: 'razor-claw', name: 'Garra Afilada', category: 'held', description: 'Duplica la probabilidad de golpe crítico.', price: 2500, sprite: ITEM_SPRITE('razor-claw') },
  { id: 'double-glove', name: 'Guante Doble', category: 'held', description: 'Golpea 2 veces: el primer golpe hace el daño normal y el segundo un 25%. Anula la Cinta Focus.', price: 3500, sprite: ITEM_SPRITE('lucky-punch') },
  { id: 'iron-ball', name: 'Lastre de Hierro', category: 'held', description: 'Baja un 25% la Velocidad, pero sube un 75% el daño.', price: 2500, sprite: ITEM_SPRITE('iron-ball') },
  { id: 'amulet-coin', name: 'Amuleto Moneda', category: 'held', description: 'Ganas un 50% más de dinero en los combates mientras lo lleve equipado.', price: 3000, sprite: ITEM_SPRITE('amulet-coin') },
  { id: 'kings-rock', name: 'Roca del Rey', category: 'held', description: 'Cada golpe tuyo tiene un 25% de amedrentar al enemigo (le hace perder su turno).', price: 3000, sprite: ITEM_SPRITE('kings-rock') },
  { id: 'lucky-egg', name: 'Huevo Suerte', category: 'held', description: 'Suma +1 nivel extra al Pokémon que lo lleve en cada combate.', price: 4000, sprite: ITEM_SPRITE('lucky-egg') },
  { id: 'quick-claw', name: 'Garra Rápida', category: 'held', description: 'El Pokémon que la lleva ataca SIEMPRE primero (ignora la Velocidad).', price: 3500, sprite: ITEM_SPRITE('quick-claw') },
  { id: 'shiny-incense', name: 'Incienso Shiny', category: 'special', description: 'La PRÓXIMA casilla de captura te ofrecerá un Pokémon SHINY. Se gasta solo.', price: 8000, sprite: ITEM_SPRITE('lax-incense') },
  { id: 'metamorph', name: 'Metamorfosis', category: 'battle', description: 'Cambia entre las formas regionales de un Pokémon (Alola, Galar, Hisui, Paldea) y su forma normal. Se gasta al usarlo.', price: 4500, sprite: ITEM_SPRITE('reveal-glass') },

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
