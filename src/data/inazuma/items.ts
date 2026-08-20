// Objetos del modo. Cuatro familias:
//   equipo      → se equipa a un jugador y le sube un atributo mientras lo lleve
//   consumible  → se gasta desde la mochila (PT, aguante, niveles)
//   manual      → mejora o evoluciona una supertécnica
//   comida      → los platos del Restaurante Rai Rai
//
// El sabor es de la serie: cintas y muñequeras del Raimon, brebajes del
// entrenador, y sobre todo el RAMEN del Rai Rai, que en la serie es donde el
// equipo recupera fuerzas. Es el «centro Pokémon» del modo.
import type { InazumaItem } from '@/engine/inazuma/types'

export const ITEMS: InazumaItem[] = [
  // ---------------------------------------------------- EQUIPO ESTÁNDAR ----
  // Cuatro EMBLEMAS de elemento (+12 % a todo, SOLO a los de su elemento),
  // cuatro piezas de demarcación (+20 % al atributo clave, SOLO en su
  // posición natural), el bidón de PT, la cinta de aguante y el brazalete.
  { id: 'emblema-fuego', name: 'Emblema de Fuego', kind: 'equipo', desc: '+12 % a TODO, solo para jugadores de Fuego.', price: 1200, element: 'fuego', all: 12 },
  { id: 'emblema-aire', name: 'Emblema de Aire', kind: 'equipo', desc: '+12 % a TODO, solo para jugadores de Aire.', price: 1200, element: 'aire', all: 12 },
  { id: 'emblema-bosque', name: 'Emblema de Bosque', kind: 'equipo', desc: '+12 % a TODO, solo para jugadores de Bosque.', price: 1200, element: 'bosque', all: 12 },
  { id: 'emblema-montana', name: 'Emblema de Montaña', kind: 'equipo', desc: '+12 % a TODO, solo para jugadores de Montaña.', price: 1200, element: 'montana', all: 12 },
  { id: 'botas-rematador', name: 'Botas del Rematador', kind: 'equipo', desc: '+20 % de Tiro. Solo delanteros.', price: 1000, position: 'DEL', stat: 'tiro', amount: 20 },
  { id: 'muneq-estratega', name: 'Muñequera del Estratega', kind: 'equipo', desc: '+20 % de Control. Solo centrocampistas.', price: 1000, position: 'MED', stat: 'control', amount: 20 },
  { id: 'espinilleras-muro', name: 'Espinilleras del Muro', kind: 'equipo', desc: '+20 % de Defensa. Solo defensas.', price: 1000, position: 'DEF', stat: 'defensa', amount: 20 },
  { id: 'guantes-guardameta', name: 'Guantes del Guardameta', kind: 'equipo', desc: '+20 % de Defensa (paradas). Solo porteros.', price: 1000, position: 'POR', stat: 'defensa', amount: 20 },
  { id: 'bidon-inagotable', name: 'Bidón inagotable', kind: 'equipo', desc: '+20 % al DEPÓSITO de PT.', price: 1400, ptPct: 20 },
  { id: 'cinta-aguante', name: 'Cinta de Resistencia', kind: 'equipo', desc: '+25 % de Aguante (y con él, más PT).', price: 1400, stat: 'aguante', amount: 25 },
  // ÚNICO: se entrega al empezar la partida (a tu capitán) y no se vende ni
  // aparece en el botín. Los rivales llevan el suyo en su jugador insignia.
  { id: 'brazalete-capitan', name: 'Brazalete de Capitán', kind: 'equipo', desc: '+25 % a TODAS las estadísticas. Solo hay uno: el que lo lleva ES el capitán.', price: 9999, all: 25 },

  // --- RARO: el comodín de gala (solo botín de casillas).
  { id: 'amuleto-relampago', name: 'Amuleto del Relámpago', kind: 'raro', desc: '+18 % a TODOS los atributos, para cualquiera.', price: 7500, all: 18 },

  // ------------------------------------------------ CONSUMIBLES ESTÁNDAR ---
  // Pociones en PORCENTAJE (como pediste): mitad o todo, uno o el equipo.
  // Tres niveles por familia, como en Pokémon: Poción (25 %), Superpoción
  // (50 %) y Máxima (todo).
  { id: 'pocion-pt', name: 'Poción de PT', kind: 'consumible', desc: 'Recupera el 25 % del depósito de PT a un jugador.', price: 300, consumable: true },
  { id: 'superpocion-pt', name: 'Superpoción de PT', kind: 'consumible', desc: 'Recupera el 50 % del depósito de PT a un jugador.', price: 500, consumable: true },
  { id: 'pocion-pt-max', name: 'Poción Máxima de PT', kind: 'consumible', desc: 'PT al MÁXIMO a un jugador.', price: 900, consumable: true },
  { id: 'pocion-aguante', name: 'Poción de Aguante', kind: 'consumible', desc: 'Recupera el 25 % del aguante a un jugador.', price: 300, consumable: true },
  { id: 'superpocion-aguante', name: 'Superpoción de Aguante', kind: 'consumible', desc: 'Recupera el 50 % del aguante a un jugador.', price: 500, consumable: true },
  { id: 'pocion-aguante-max', name: 'Poción Máxima de Aguante', kind: 'consumible', desc: 'Aguante al MÁXIMO a un jugador.', price: 900, consumable: true },
  { id: 'elixir-equipo', name: 'Elixir de equipo', kind: 'consumible', desc: 'Recupera un 33 % de PT y de aguante a TODA la plantilla.', price: 1500, consumable: true },
  { id: 'plan-entrenamiento', name: 'Plan de entrenamiento', kind: 'consumible', desc: 'Sube 2 niveles a un jugador.', price: 1800, consumable: true },
  { id: 'plan-intensivo', name: 'Plan intensivo', kind: 'consumible', desc: 'Sube 4 niveles a un jugador.', price: 3400, consumable: true },
  { id: 'medalla-rareza', name: 'Medalla de talento', kind: 'consumible', desc: 'Sube UNA rareza a un jugador (Normal → Avanzado → Ídolo → Legendario). Cuesta tantas medallas como su rareza actual (1, 2 o 3).', price: 2600, consumable: true },
  { id: 'fichaje-estrella', name: 'Fichaje personalizado', kind: 'consumible', desc: 'Busca y ficha al jugador EXACTO que quieras del catálogo (llega en Normal, al nivel de tu plantilla).', price: 1000, consumable: true },

  // -------------------------------------------------------------- MANUAL ----
  { id: 'mejora', name: 'Mejora', kind: 'manual', desc: '+25 % de potencia y −15 % de coste de PT a una supertécnica (dos veces máx.).', price: 1600, consumable: true },
  { id: 'manual-avanzado', name: 'Manual avanzado', kind: 'manual', desc: 'Despierta la siguiente técnica de la cadena del jugador, como una casilla de firma.', price: 3000, consumable: true },

  // ------------------------------------------------------------- LEGADO -----
  // Retirados del catálogo activo (ni tienda ni botín), pero las partidas
  // que ya los llevan los conservan funcionando.
  { id: 'botas-rayo', name: 'Botas Rayo', kind: 'equipo', desc: '+20 % Velocidad.', price: 900, stat: 'velocidad', amount: 20, legacy: true },
  { id: 'espinilleras', name: 'Espinilleras de acero', kind: 'equipo', desc: '+20 % Defensa.', price: 900, stat: 'defensa', amount: 20, legacy: true },
  { id: 'guantes-titan', name: 'Guantes de Titán', kind: 'equipo', desc: '+22 % Físico.', price: 1100, stat: 'fisico', amount: 22, legacy: true },
  { id: 'banda-tiro', name: 'Banda del Goleador', kind: 'equipo', desc: '+22 % Tiro.', price: 1300, stat: 'tiro', amount: 22, legacy: true },
  { id: 'muneq-control', name: 'Muñequera del Cerebro', kind: 'equipo', desc: '+22 % Control.', price: 1300, stat: 'control', amount: 22, legacy: true },
  { id: 'guantes-portero', name: 'Guantes del Guardameta (viejos)', kind: 'equipo', desc: '+28 % Defensa.', price: 1800, stat: 'defensa', amount: 28, legacy: true },
  { id: 'botas-doradas', name: 'Botas Doradas', kind: 'equipo', desc: '+30 % Tiro.', price: 2600, stat: 'tiro', amount: 30, legacy: true },
  { id: 'cinta-cabeza', name: 'Cinta del Capitán', kind: 'equipo', desc: '+26 % Control.', price: 2200, stat: 'control', amount: 26, legacy: true },
  { id: 'botas-inazuma', name: 'Botas Inazuma', kind: 'raro', desc: '+40 % Velocidad.', price: 5200, stat: 'velocidad', amount: 40, legacy: true },
  { id: 'guante-dios', name: 'Guante del Guardián', kind: 'raro', desc: '+45 % Defensa.', price: 5600, stat: 'defensa', amount: 45, legacy: true },
  { id: 'bota-oro-macizo', name: 'Bota de Oro Maciza', kind: 'raro', desc: '+45 % Tiro.', price: 5800, stat: 'tiro', amount: 45, legacy: true },
  { id: 'cinta-legendaria', name: 'Cinta Legendaria', kind: 'raro', desc: '+40 % Control.', price: 5400, stat: 'control', amount: 40, legacy: true },
  { id: 'bebida-isotonica', name: 'Bebida isotónica', kind: 'consumible', desc: 'Recupera 40 PT a un jugador.', price: 350, consumable: true, legacy: true },
  { id: 'bebida-doble', name: 'Isotónica doble', kind: 'consumible', desc: 'Recupera TODOS los PT a un jugador.', price: 800, consumable: true, legacy: true },
  { id: 'masaje', name: 'Sesión de fisio', kind: 'consumible', desc: 'Devuelve 50 de Aguante a un jugador.', price: 600, consumable: true, legacy: true },
  { id: 'concentrado', name: 'Concentrado del entrenador', kind: 'consumible', desc: 'Recupera PT y Aguante a TODO el once.', price: 2200, consumable: true, legacy: true },
  { id: 'ramen-rai-rai', name: 'Ramen del Rai Rai', kind: 'comida', desc: '+60 de Aguante a un jugador.', price: 500, consumable: true, legacy: true },
  { id: 'ramen-especial', name: 'Ramen especial del jefe', kind: 'comida', desc: 'Aguante y PT al máximo a un jugador.', price: 1100, consumable: true, legacy: true },
  { id: 'gyoza', name: 'Ración de gyozas', kind: 'comida', desc: '+30 de Aguante a TODA la plantilla.', price: 1400, consumable: true, legacy: true },
  { id: 'banquete', name: 'Banquete del Rai Rai', kind: 'comida', desc: 'Toda la plantilla a tope de Aguante y PT.', price: 2600, consumable: true, legacy: true },
]

export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]))

export function getItem(id: string): InazumaItem | undefined {
  return ITEM_BY_ID.get(id)
}

/**
 * Lo que vende cada sitio, según lo avanzado que vayas (0-7). El Rai Rai solo
 * sirve comida.
 *
 * El catálogo se ABRE por tramos: en la primera ronda no tiene sentido ver las
 * Botas Doradas de 2600 ₽ ni el Amuleto de 7500 en el escaparate, porque no hay
 * forma de pagarlos y solo sirven para que la tienda parezca un museo. Cada
 * instituto que tumbas desbloquea material mejor, así que volver a la tienda
 * más adelante tiene sentido.
 */
export function stockFor(kind: 'tienda' | 'rairai', progress = 7): InazumaItem[] {
  // El Rai Rai se retiró (la recuperación vive en la Rueda de entrenamiento):
  // su comida se vende ahora en la TIENDA. El modo 'rairai' queda por los
  // saves viejos que aún tengan la casilla en el mapa.
  const pool = kind === 'rairai'
    ? ITEMS.filter((i) => i.kind === 'comida')
    : ITEMS.filter((i) => !i.legacy)
  // Techo de precio: arranca en 900 ₽ y sube ~800 por eliminatoria superada.
  // Los raros nunca se venden: esos solo salen en las casillas de objeto.
  const ceiling = 900 + progress * 850
  // El Brazalete de Capitán es ÚNICO (se entrega al empezar): jamás se vende.
  const stock = pool.filter((i) => i.kind !== 'raro' && i.price <= ceiling && i.id !== 'brazalete-capitan')
  // El FICHAJE ESTRELLA se expone desde mitad de torneo aunque su precio
  // supere el techo (para eso se ahorra): con el techo a secas solo aparecía
  // en la última tienda y nadie llegó a verlo en una run entera.
  if (kind === 'tienda' && progress >= 3 && !stock.some((i) => i.id === 'fichaje-estrella')) {
    const star = ITEM_BY_ID.get('fichaje-estrella')
    if (star) stock.push(star)
  }
  return stock
}

/** Objetos que pueden salir en una casilla de objeto, según lo avanzado que vayas. */
export function lootPool(progress: number): InazumaItem[] {
  // El Fichaje estrella cuenta como RARO a efectos de botín: encontrárselo en
  // la primera ronda regalaría el mejor jugador del catálogo de salida.
  const rare = ITEMS.filter((i) => !i.legacy && (i.kind === 'raro' || i.id === 'fichaje-estrella'))
  const normal = ITEMS.filter((i) => !i.legacy && (i.kind === 'equipo' || i.kind === 'consumible' || i.kind === 'manual') && i.id !== 'fichaje-estrella' && i.id !== 'brazalete-capitan')
  // Los raros solo aparecen de la mitad del cuadro en adelante.
  return progress >= 3 ? [...normal, ...rare] : normal
}
