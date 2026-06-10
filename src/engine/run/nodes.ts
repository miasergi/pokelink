import type { PokemonInstance, SpeciesData, TrainerData } from '@/types'
import { createInstance } from '@/engine/team/instance'
import { RNG } from '@/utils/rng'
import { ITEMS, TYPE_BOOST_BY_ID } from '@/data/items'

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
/** Multiplicador de "potencia esperada" por dificultad: en difícil/nuzlocke
 *  aparecen Pokémon más fuertes (y evolucionados) antes. */
const DIFF_POWER: Record<string, number> = { normal: 1, hard: 1.18, nuzlocke: 1.18 }

/**
 * Pool de especies con potencia (BST) acorde al nivel y a la dificultad:
 * una "ventana" de BST que sube con el nivel. Techo bajo al principio (nada de
 * evolucionados al empezar) y suelo que sube al final (nada de débiles cerca de
 * la Liga).
 */
export function tierPool(pool: SpeciesData[], level: number, difficulty: string = 'normal'): SpeciesData[] {
  const lvl = level * (DIFF_POWER[difficulty] ?? 1)
  const maxBst = 250 + lvl * 6.5 // techo de potencia
  const minBst = lvl >= 16 ? Math.round(lvl * 7) : 0 // suelo (fuera débiles a alto nivel)
  let f = pool.filter((s) => { const b = bst(s); return b >= minBst && b <= maxBst })
  if (f.length < 6) {
    // Pocos en la ventana: elige los más cercanos al objetivo de potencia
    // (NO los más fuertes), para no sacar evolucionados fuera de tiempo.
    // OJO: respetando el techo (+20% de margen). Antes, en pools pequeños
    // (p.ej. el tipo de un entrenador: dragones/aceros de Sinnoh), "los 12 más
    // cercanos" devolvía el pool ENTERO y salían Garchomp/Empoleon a nivel 8.
    const target = maxBst * 0.85
    const capped = pool.filter((s) => bst(s) <= maxBst * 1.2)
    // Solo si NADA queda bajo el techo (pool de solo evolucionados), usa las
    // especies MÁS DÉBILES disponibles, nunca las más fuertes.
    const source = capped.length ? capped : [...pool].sort((a, b) => bst(a) - bst(b)).slice(0, 3)
    f = [...source].sort((a, b) => Math.abs(bst(a) - target) - Math.abs(bst(b) - target)).slice(0, 12)
  }
  return f.length ? f : pool
}

export function makeWild(pool: SpeciesData[], level: number, rng: RNG, difficulty: string = 'normal'): PokemonInstance {
  const tier = tierPool(pool, level, difficulty)
  const species = rng.pick(tier)
  const lv = Math.max(2, level + rng.int(-2, 1))
  return createInstance(species.id, lv, rng)
}

// --- Pools de objetos por contexto (catálogo ágil) ---
const TYPE_ITEMS = Object.keys(TYPE_BOOST_BY_ID)
const HEAL_ITEMS = ['potion', 'super-potion', 'hyper-potion', 'max-potion', 'revive', 'max-revive']
const GENERIC_HELD = ['leftovers', 'shell-bell', 'choice-band', 'assault-vest', 'life-orb', 'focus-sash', 'rocky-helmet', 'expert-belt', 'eviolite', 'super-mineral', 'razor-claw', 'double-glove', 'iron-ball', 'amulet-coin', 'kings-rock', 'lucky-egg', 'quick-claw', 'sitrus-berry', 'metronome', 'choice-specs', 'muscle-band']
const HELD_ITEMS = [...GENERIC_HELD, ...TYPE_ITEMS]
const BATTLE_ITEMS = ['rare-candy', 'super-candy', 'upgrade']

/**
 * Pool VARIADO de objetos "regalo/botín" (recompensas de jefe, nodos
 * arriesgados y eventos de objeto aleatorio). Antes era una lista corta donde
 * Restos/Campana Concha salían el 20% de las veces; ahora abarca casi todo el
 * catálogo equipable + mejoras + curación fuerte para que haya sorpresa real.
 */
export const GIFT_ITEMS = [
  // Mejoras y consumibles potentes
  'rare-candy', 'super-candy', 'upgrade', 'evo-stone',
  // Curación / rescate de calidad
  'max-potion', 'max-revive', 'hyper-potion', 'revive-charm',
  // Equipables genéricos (incluye Restos/Concha, ahora diluidos)
  ...GENERIC_HELD,
  // Objetos de tipo (gran variedad)
  ...TYPE_ITEMS,
]

/** 3 objetos a elegir como recompensa. */
export function itemChoices(rng: RNG, depthFrac: number): string[] {
  const pool: string[] = []
  // 1) SIEMPRE una mejora (caramelo, supercaramelo o Mejora de ataque).
  pool.push(rng.pick(['rare-candy', 'upgrade', 'super-candy']))
  // 2) Soporte (curación/revivir).
  pool.push(rng.pick([...HEAL_ITEMS, 'revive-charm']))
  // 3) Objeto equipable / piedra (Megapiedra solo muy avanzada la run, ~6 gimnasios).
  const lastPool = depthFrac > 0.72 && rng.chance(0.3)
    ? ['mega-stone']
    : depthFrac > 0.3
      ? ['evo-stone', ...HELD_ITEMS]
      : [...HELD_ITEMS, 'upgrade']
  pool.push(rng.pick(lastPool))
  const set = [...new Set(pool)]
  while (set.length < 3) {
    const extra = rng.pick([...BATTLE_ITEMS, ...HELD_ITEMS, ...HEAL_ITEMS])
    if (!set.includes(extra)) set.push(extra)
  }
  return set.slice(0, 3)
}

/** Stock de tienda. Pociones escalonadas según el momento de la run. */
export function shopStock(rng: RNG, depthFrac: number): string[] {
  const potions = ['potion']
  if (depthFrac > 0.2) potions.push('super-potion')
  if (depthFrac > 0.45) potions.push('hyper-potion')
  if (depthFrac > 0.65) potions.push('max-potion')
  const base = [...potions, 'revive', 'rare-candy', 'upgrade']
  const advanced = depthFrac > 0.4 ? ['max-revive', 'revive-charm', 'super-candy', 'amulet-coin'] : []
  const rare = depthFrac > 0.5 && rng.chance(0.4) ? ['shiny-incense'] : []
  const morph = depthFrac > 0.35 && rng.chance(0.5) ? ['metamorph'] : []
  const held = rng.sample(HELD_ITEMS, 3)
  const evo = depthFrac > 0.4 ? ['evo-stone'] : []
  const mega = depthFrac > 0.72 ? ['mega-stone'] : []
  return [...base, ...advanced, ...rare, ...morph, ...held, ...evo, ...mega]
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
  | { kind: 'multi'; effects: EventEffect[] } // aplica varios efectos a la vez
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
      { label: 'Mejorar ataque', description: 'Consigue una Mejora (sube el nivel de potencia del ataque).', effect: { kind: 'item', itemId: 'upgrade', qty: 1 } },
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

  // --- Más eventos buenos ---
  old_fisherman: { id: 'old_fisherman', title: 'Viejo pescador', tone: 'good',
    description: 'Un pescador comparte su captura del día y un consejo.',
    options: [
      { label: 'Aceptar la comida', description: 'Cura todo tu equipo.', effect: { kind: 'heal' } },
      { label: 'Pedir su caña', description: 'Consigue una Campana Concha.', effect: { kind: 'item', itemId: 'shell-bell', qty: 1 } },
    ] },
  move_tutor: { id: 'move_tutor', title: 'Maestro de movimientos', tone: 'good',
    description: 'Un sabio puede pulir la técnica de tu equipo.',
    options: [
      { label: 'Recibir lección', description: 'Consigue una Mejora.', effect: { kind: 'item', itemId: 'upgrade', qty: 1 } },
      { label: 'Donativo', description: 'Te lo agradece con 600 ₽.', effect: { kind: 'money', amount: 600 } },
    ] },
  daycare_couple: { id: 'daycare_couple', title: 'Guardería Pokémon', tone: 'good',
    description: 'La pareja de la guardería cuida a tu equipo unos días.',
    options: [
      { label: 'Dejarlos entrenar', description: '+1 nivel a todo el equipo.', effect: { kind: 'levelUp', amount: 1 } },
      { label: 'Solo descansar', description: 'Cura todo tu equipo.', effect: { kind: 'heal' } },
    ] },
  shiny_hunter: { id: 'shiny_hunter', title: 'Cazadora de shinies', tone: 'good',
    description: 'Una entrenadora obsesionada con los Pokémon raros te regala algo.',
    options: [
      { label: 'Aceptar incienso', description: 'Consigue un Incienso Shiny.', effect: { kind: 'item', itemId: 'shiny-incense', qty: 1 } },
      { label: 'Pedir dinero', description: 'Te da 1000 ₽.', effect: { kind: 'money', amount: 1000 } },
    ] },
  generous_nurse: { id: 'generous_nurse', title: 'Enfermera Joy', tone: 'good',
    description: 'Una enfermera de viaje monta una camilla improvisada.',
    options: [
      { label: 'Que te atienda', description: 'Cura todo tu equipo.', effect: { kind: 'heal' } },
      { label: 'Coger una poción', description: 'Consigue una Hiperpoción.', effect: { kind: 'item', itemId: 'hyper-potion', qty: 1 } },
    ] },
  rich_kid: { id: 'rich_kid', title: 'Niño rico', tone: 'good',
    description: 'Un niño presumido quiere "comprar" tu amistad.',
    options: [
      { label: 'Aceptar su dinero', description: '+1800 ₽.', effect: { kind: 'money', amount: 1800 } },
    ] },
  wandering_merchant: { id: 'wandering_merchant', title: 'Mercader ambulante', tone: 'good',
    description: 'Un mercader abre su saco lleno de curiosidades.',
    options: [
      { label: 'Rebuscar', description: 'Consigue un objeto raro.', effect: { kind: 'randomItem' } },
      { label: 'Comprar caramelos', description: 'Recibe 1 Supercaramelo.', effect: { kind: 'item', itemId: 'super-candy', qty: 1 } },
    ] },
  fossil_dig: { id: 'fossil_dig', title: 'Excavación de fósiles', tone: 'good',
    description: 'Unos científicos te dejan unirte a su excavación.',
    options: [
      { label: 'Cavar', description: 'Consigue un objeto raro.', effect: { kind: 'randomItem' } },
      { label: 'Vender el hallazgo', description: '+900 ₽.', effect: { kind: 'money', amount: 900 } },
    ] },
  hot_spring: { id: 'hot_spring', title: 'Aguas termales', tone: 'good',
    description: 'Un manantial humeante invita a un descanso.',
    options: [
      { label: 'Darse un baño', description: 'Cura todo tu equipo y consigue unos Restos.', effect: { kind: 'multi', effects: [{ kind: 'heal' }, { kind: 'item', itemId: 'leftovers', qty: 1 }] } },
    ] },
  retired_champion: { id: 'retired_champion', title: 'Campeón retirado', tone: 'good',
    description: 'Un viejo campeón te da un consejo... y una reliquia.',
    options: [
      { label: 'Escuchar', description: '+1 nivel a todo el equipo.', effect: { kind: 'levelUp', amount: 1 } },
      { label: 'Pedir su amuleto', description: 'Consigue un Amuleto Moneda.', effect: { kind: 'item', itemId: 'amulet-coin', qty: 1 } },
    ] },
  breeder_gift: { id: 'breeder_gift', title: 'Criador generoso', tone: 'good',
    description: 'Un criador tiene un Pokémon de más y busca buen hogar.',
    options: [
      { label: 'Acogerlo', description: 'Se une un Pokémon a tu equipo/caja.', effect: { kind: 'addMon' } },
      { label: 'Rechazar', description: 'No pasa nada.', effect: { kind: 'none' } },
    ] },

  // --- Más eventos de azar ---
  street_gambler: { id: 'street_gambler', title: 'Trilero callejero', tone: 'neutral',
    description: '“Encuentra la bola y duplicas tu apuesta.”',
    options: [
      { label: 'Apostar 400 ₽', description: '45%: ganas 1000 ₽.', effect: { kind: 'gamble', cost: 400, win: 1400, chance: 0.45 } },
      { label: 'Pasar', description: 'No juegas.', effect: { kind: 'none' } },
    ] },
  mysterious_vendor: { id: 'mysterious_vendor', title: 'Vendedor encapuchado', tone: 'neutral',
    description: 'Te ofrece una caja cerrada por una "voluntad".',
    options: [
      { label: 'Comprar a ciegas 600 ₽', description: '65%: objeto raro. 35%: nada.', effect: { kind: 'risky', chance: 0.65, good: { kind: 'randomItem' }, bad: { kind: 'loseMoneyFrac', frac: 0 } } },
      { label: 'Marcharse', description: 'No te fías.', effect: { kind: 'none' } },
    ] },
  ancient_shrine: { id: 'ancient_shrine', title: 'Santuario antiguo', tone: 'neutral',
    description: 'Un altar pide una ofrenda a cambio de fortuna.',
    options: [
      { label: 'Ofrendar 500 ₽', description: '55%: bendición (objeto). 45%: nada.', effect: { kind: 'risky', chance: 0.55, good: { kind: 'randomItem' }, bad: { kind: 'none' } } },
      { label: 'Rezar gratis', description: 'A veces basta con desearlo.', effect: { kind: 'gamble', cost: 0, win: 400, chance: 0.4 } },
    ] },
  card_dealer: { id: 'card_dealer', title: 'Repartidor de cartas', tone: 'neutral',
    description: 'Una partida rápida: doble o nada.',
    options: [
      { label: 'Jugar 700 ₽', description: '50%: ganas 1400 ₽.', effect: { kind: 'gamble', cost: 700, win: 2100, chance: 0.5 } },
      { label: 'No jugar', description: 'Te retiras.', effect: { kind: 'none' } },
    ] },

  // --- Más eventos malos ---
  toll_bridge: { id: 'toll_bridge', title: 'Puente de peaje', tone: 'bad',
    description: 'Un Snorlax bloquea el puente. Su dueño cobra por pasar.',
    options: [
      { label: 'Pagar peaje', description: 'Pierdes algo de dinero, pasas tranquilo.', effect: { kind: 'loseMoneyFrac', frac: 0.1 } },
      { label: 'Cruzar el río', description: 'Te mojas: daño leve al equipo.', effect: { kind: 'damage', frac: 0.15 } },
    ] },
  electric_storm: { id: 'electric_storm', title: 'Tormenta eléctrica', tone: 'bad',
    description: 'Una tormenta sorprende a tu equipo a la intemperie.',
    options: [
      { label: 'Refugiarse rápido', description: 'Daño leve a todo el equipo.', effect: { kind: 'damage', frac: 0.12 } },
      { label: 'Aguantar el chaparrón', description: '50%: nada. 50%: daño moderado.', effect: { kind: 'risky', chance: 0.5, good: { kind: 'none' }, bad: { kind: 'damage', frac: 0.3 } } },
    ] },
  pickpocket: { id: 'pickpocket', title: 'Carterista', tone: 'bad',
    description: 'Notas una mano demasiado cerca de tu bolsillo.',
    options: [
      { label: 'Reaccionar', description: '60%: lo evitas y ganas extra. 40%: nada.', effect: { kind: 'gamble', cost: 0, win: 600, chance: 0.6 } },
      { label: 'No darte cuenta', description: 'Pierdes parte de tu dinero.', effect: { kind: 'loseMoneyFrac', frac: 0.18 } },
    ] },
  sandstorm: { id: 'sandstorm', title: 'Tormenta de arena', tone: 'bad',
    description: 'El desierto castiga a quien lo cruza.',
    options: [
      { label: 'Cruzar deprisa', description: 'Daño leve al equipo.', effect: { kind: 'damage', frac: 0.15 } },
      { label: 'Rodear (pagando guía)', description: 'Pierdes algo de dinero.', effect: { kind: 'loseMoneyFrac', frac: 0.12 } },
    ] },
  haunted_house: { id: 'haunted_house', title: 'Mansión encantada', tone: 'bad',
    description: 'Ruidos extraños... y un brillo al fondo.',
    options: [
      { label: 'Investigar', description: '60%: objeto raro. 40%: susto (daño).', effect: { kind: 'risky', chance: 0.6, good: { kind: 'randomItem' }, bad: { kind: 'damage', frac: 0.25 } } },
      { label: 'Salir corriendo', description: 'Mejor no.', effect: { kind: 'none' } },
    ] },
  con_artist: { id: 'con_artist', title: 'Timador', tone: 'bad',
    description: '“Invierte y te devuelvo el triple, palabra.”',
    options: [
      { label: 'Confiar 800 ₽', description: '35%: ganas 2400 ₽. 65%: lo pierdes.', effect: { kind: 'gamble', cost: 800, win: 3200, chance: 0.35 } },
      { label: 'Ni hablar', description: 'No caes.', effect: { kind: 'none' } },
    ] },
}

export const EVENT_IDS = Object.keys(EVENTS)

/** Ilustración (emoji grande) por situación, para dar contexto visual. */
export const EVENT_ICONS: Record<string, string> = {
  hiker_heal: '🏕️', mystery_egg: '🥚', rare_candy_cache: '🍬', berry_bush: '🫐',
  lost_trainer: '🧭', lucky_coin: '🪙', combat_master: '🥋', abandoned_pack: '🎒',
  wishing_well: '🪣', treasure_chest: '🧰', slot_machine: '🎰', risky_cave: '🕳️',
  ambush: '😱', toxic_swamp: '☣️', thief: '🦝', cursed_idol: '🗿', rockslide: '🪨',
  old_fisherman: '🎣', move_tutor: '📖', daycare_couple: '🏠', shiny_hunter: '✨',
  generous_nurse: '💊', rich_kid: '💰', wandering_merchant: '🛒', fossil_dig: '⛏️',
  hot_spring: '♨️', retired_champion: '🏆', breeder_gift: '🐣', street_gambler: '🃏',
  mysterious_vendor: '🎁', ancient_shrine: '⛩️', card_dealer: '🎴', toll_bridge: '🌉',
  electric_storm: '⛈️', pickpocket: '🫳', sandstorm: '🏜️', haunted_house: '👻',
  con_artist: '🤥',
}

export function getItemSafe(id: string) {
  return ITEMS.find((i) => i.id === id)
}
