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
  // ------------------------------------------------------------- EQUIPO -----
  // `amount` va en PORCENTAJE del atributo (ver `InazumaItem`).
  { id: 'botas-rayo', name: 'Botas Rayo', kind: 'equipo', desc: '+20 % Velocidad. Ligeras hasta dar miedo.', price: 900, stat: 'velocidad', amount: 20 },
  { id: 'espinilleras', name: 'Espinilleras de acero', kind: 'equipo', desc: '+20 % Defensa. Pesan, pero no pasa nadie.', price: 900, stat: 'defensa', amount: 20 },
  { id: 'guantes-titan', name: 'Guantes de Titán', kind: 'equipo', desc: '+22 % Físico. Para los que van al choque.', price: 1100, stat: 'fisico', amount: 22 },
  { id: 'banda-tiro', name: 'Banda del Goleador', kind: 'equipo', desc: '+22 % Tiro. Solo la lleva quien remata.', price: 1300, stat: 'tiro', amount: 22 },
  { id: 'muneq-control', name: 'Muñequera del Cerebro', kind: 'equipo', desc: '+22 % Control. El balón te obedece.', price: 1300, stat: 'control', amount: 22 },
  { id: 'cinta-aguante', name: 'Cinta de Resistencia', kind: 'equipo', desc: '+25 % Aguante: bastantes más PT por partido.', price: 1500, stat: 'aguante', amount: 25 },
  { id: 'guantes-portero', name: 'Guantes del Guardameta', kind: 'equipo', desc: '+28 % Defensa. Cosidos para un portero.', price: 1800, stat: 'defensa', amount: 28 },
  { id: 'botas-doradas', name: 'Botas Doradas', kind: 'equipo', desc: '+30 % Tiro. Las lleva el pichichi, y se nota.', price: 2600, stat: 'tiro', amount: 30 },
  { id: 'cinta-cabeza', name: 'Cinta del Capitán', kind: 'equipo', desc: '+26 % Control. La cinta naranja de toda la vida.', price: 2200, stat: 'control', amount: 26 },
  { id: 'brazalete-capitan', name: 'Brazalete de Capitán', kind: 'equipo', desc: '+10 % a TODO. Solo hay uno en el torneo.', price: 4200, stat: 'tiro', amount: 10 },

  // --- RAROS: caros, potentes y de aparición escasa en las casillas de objeto.
  { id: 'botas-inazuma', name: 'Botas Inazuma', kind: 'raro', desc: '+40 % Velocidad. Dicen que dejan surco en la hierba.', price: 5200, stat: 'velocidad', amount: 40 },
  { id: 'guante-dios', name: 'Guante del Guardián', kind: 'raro', desc: '+45 % Defensa. Para un portero que quiera ser un muro.', price: 5600, stat: 'defensa', amount: 45 },
  { id: 'bota-oro-macizo', name: 'Bota de Oro Maciza', kind: 'raro', desc: '+45 % Tiro. Pesa una barbaridad y no le importa a nadie.', price: 5800, stat: 'tiro', amount: 45 },
  { id: 'cinta-legendaria', name: 'Cinta Legendaria', kind: 'raro', desc: '+40 % Control. La llevaba alguien importante.', price: 5400, stat: 'control', amount: 40 },
  { id: 'amuleto-relampago', name: 'Amuleto del Relámpago', kind: 'raro', desc: '+18 % a TODOS los atributos.', price: 7500, stat: 'tiro', amount: 18 },

  // --------------------------------------------------------- CONSUMIBLES ----
  { id: 'bebida-isotonica', name: 'Bebida isotónica', kind: 'consumible', desc: 'Recupera 40 PT a un jugador.', price: 350, consumable: true },
  { id: 'bebida-doble', name: 'Isotónica doble', kind: 'consumible', desc: 'Recupera TODOS los PT a un jugador.', price: 800, consumable: true },
  { id: 'masaje', name: 'Sesión de fisio', kind: 'consumible', desc: 'Devuelve 50 de Aguante a un jugador.', price: 600, consumable: true },
  { id: 'concentrado', name: 'Concentrado del entrenador', kind: 'consumible', desc: 'Recupera PT y Aguante a TODO el once.', price: 2200, consumable: true },
  { id: 'plan-entrenamiento', name: 'Plan de entrenamiento', kind: 'consumible', desc: 'Sube 2 niveles a un jugador.', price: 1800, consumable: true },
  { id: 'plan-intensivo', name: 'Plan intensivo', kind: 'consumible', desc: 'Sube 4 niveles a un jugador.', price: 3400, consumable: true },
  { id: 'medalla-rareza', name: 'Medalla de talento', kind: 'consumible', desc: 'Sube UNA rareza a un jugador (gris → morado → oro → multicolor). Mejora sus atributos, alarga su cadena y al máximo despierta su Espíritu.', price: 2600, consumable: true },

  // ------------------------------------------------------------- COMIDA -----
  // Los platos del Rai Rai. Se compran allí y se usan cuando quieras: es la
  // diferencia con parar a comer, que te cura en el sitio.
  { id: 'ramen-rai-rai', name: 'Ramen del Rai Rai', kind: 'comida', desc: 'El plato de la casa: +60 de Aguante a un jugador.', price: 500, consumable: true },
  { id: 'ramen-especial', name: 'Ramen especial del jefe', kind: 'comida', desc: 'Aguante y PT al máximo a un jugador.', price: 1100, consumable: true },
  { id: 'gyoza', name: 'Ración de gyozas', kind: 'comida', desc: '+30 de Aguante a TODA la plantilla.', price: 1400, consumable: true },
  { id: 'banquete', name: 'Banquete del Rai Rai', kind: 'comida', desc: 'Toda la plantilla a tope de Aguante y PT.', price: 2600, consumable: true },

  // -------------------------------------------------------------- MANUAL ----
  // Dos formas distintas de mejorar una supertécnica, igual que en el modo
  // Pokémon conviven la Mejora (sube el tier de potencia del ataque) y las
  // evoluciones (cambian el movimiento por otro).
  { id: 'mejora', name: 'Mejora', kind: 'manual', desc: '+25 % de potencia a una supertécnica. Se puede aplicar dos veces a la misma.', price: 1600, consumable: true },
  // Con el catálogo real ya no hay «versión nº2» de cada técnica: lo que hay es
  // la CADENA característica de cada jugador. El manual la avanza un paso, como
  // una casilla de firma de bolsillo.
  { id: 'manual-avanzado', name: 'Manual avanzado', kind: 'manual', desc: 'Despierta la siguiente técnica de la cadena del jugador, como una casilla de firma.', price: 3000, consumable: true },
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
  const pool = kind === 'rairai'
    ? ITEMS.filter((i) => i.kind === 'comida')
    : ITEMS.filter((i) => i.kind !== 'comida')
  // Techo de precio: arranca en 900 ₽ y sube ~800 por eliminatoria superada.
  // Los raros nunca se venden: esos solo salen en las casillas de objeto.
  const ceiling = 900 + progress * 850
  return pool.filter((i) => i.kind !== 'raro' && i.price <= ceiling)
}

/** Objetos que pueden salir en una casilla de objeto, según lo avanzado que vayas. */
export function lootPool(progress: number): InazumaItem[] {
  const rare = ITEMS.filter((i) => i.kind === 'raro')
  const normal = ITEMS.filter((i) => i.kind === 'equipo' || i.kind === 'consumible' || i.kind === 'manual')
  // Los raros solo aparecen de la mitad del cuadro en adelante.
  return progress >= 3 ? [...normal, ...rare] : normal
}
