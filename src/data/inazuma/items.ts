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

  // --------------------------------------------------------- CONSUMIBLES ----
  { id: 'bebida-isotonica', name: 'Bebida isotónica', kind: 'consumible', desc: 'Recupera 40 PT a un jugador.', price: 350, consumable: true },
  { id: 'bebida-doble', name: 'Isotónica doble', kind: 'consumible', desc: 'Recupera TODOS los PT a un jugador.', price: 800, consumable: true },
  { id: 'masaje', name: 'Sesión de fisio', kind: 'consumible', desc: 'Devuelve 50 de Aguante a un jugador.', price: 600, consumable: true },
  { id: 'concentrado', name: 'Concentrado del entrenador', kind: 'consumible', desc: 'Recupera PT y Aguante a TODO el once.', price: 2200, consumable: true },
  { id: 'plan-entrenamiento', name: 'Plan de entrenamiento', kind: 'consumible', desc: 'Sube 2 niveles a un jugador.', price: 1800, consumable: true },
  { id: 'plan-intensivo', name: 'Plan intensivo', kind: 'consumible', desc: 'Sube 4 niveles a un jugador.', price: 3400, consumable: true },

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
  { id: 'manual-avanzado', name: 'Manual avanzado', kind: 'manual', desc: 'Evoluciona una supertécnica a su versión definitiva (nº1 → nº2).', price: 3000, consumable: true },
]

export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]))

export function getItem(id: string): InazumaItem | undefined {
  return ITEM_BY_ID.get(id)
}

/** Lo que vende cada sitio. El Rai Rai solo sirve comida. */
export function stockFor(kind: 'tienda' | 'rairai'): InazumaItem[] {
  return kind === 'rairai'
    ? ITEMS.filter((i) => i.kind === 'comida')
    : ITEMS.filter((i) => i.kind !== 'comida')
}
