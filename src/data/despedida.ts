// DESPEDIDA DE ÓSCAR — 12 y 13 de septiembre de 2026.
//
// Este archivo es el GUION del fin de semana: horario, retos y recompensas.
// Está pensado para tocarse a mano hasta el último día (los tiempos de una
// despedida se mueven solos), así que todo el contenido vive aquí y ninguna
// pantalla inventa datos por su cuenta.
//
// Reglas del sistema de puntos:
//  - Cada reto vale unos puntos FIJOS, decididos antes. Improvisar el valor de
//    un reto en caliente es la forma más rápida de que el marcador se muera.
//  - Los puntos desbloquean recompensas por umbrales. Óscar ve el umbral y la
//    pista, pero NO qué hay dentro hasta que llega.

export type Dia = 'sab' | 'dom'

/** Fechas reales del fin de semana (para saber qué bloque toca ahora). */
export const FECHAS: Record<Dia, string> = {
  sab: '2026-09-12',
  dom: '2026-09-13',
}

export const NOMBRE_HOMENAJEADO = 'Óscar'

/** La cuadrilla. El primero es el protagonista: no cuenta como público. */
export const PANDILLA = ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla', 'Agus', 'Greñas'] as const

export interface Bloque {
  id: string
  dia: Dia
  /** 'HH:MM' en horario local. */
  inicio: string
  fin: string
  emoji: string
  titulo: string
  /** Color de acento del bloque (mismo criterio que el Excel de Luis). */
  color: string
  /** De qué va el bloque, en una línea. */
  desc: string
  /** Quién juega. Los demás miran el directo y dan por culo por Discord. */
  participantes: string[]
  /** Movimientos de gente / logística que pasa AL ACABAR el bloque. */
  logistica?: string
}

export const BLOQUES: Bloque[] = [
  {
    id: 'inauguracion',
    dia: 'sab',
    inicio: '10:00',
    fin: '11:00',
    emoji: '🎬',
    titulo: 'Inauguración',
    color: '#38bdf8',
    desc: 'Montar el streaming, presentar el calendario y explicarle a Óscar en qué se ha metido.',
    participantes: ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla'],
    logistica: 'Aprovechad para dejar instalado todo en los dos PCs.',
  },
  {
    id: 'onepiece',
    dia: 'sab',
    inicio: '11:00',
    fin: '12:30',
    emoji: '☠️',
    titulo: 'One Piece TCG',
    color: '#f87171',
    desc: 'Torneo 2vs2 con proxies, cambiando parejas según dé tiempo.',
    participantes: ['Óscar', 'Cla', 'Román', 'Luis P.'],
    logistica: 'Sergi y Luis M. se desplazan a casa de Óscar.',
  },
  {
    id: 'elsword',
    dia: 'sab',
    inicio: '12:30',
    fin: '14:30',
    emoji: '⚔️',
    titulo: 'Elsword',
    color: '#4ade80',
    desc: 'Óscar enseña Elsword a completos noobs. Román juega desde el PC de María.',
    participantes: ['Óscar', 'Luis M.', 'Sergi', 'Román'],
    logistica: 'Luis P. y Cla preparan la comida.',
  },
  {
    id: 'comida',
    dia: 'sab',
    inicio: '14:30',
    fin: '15:30',
    emoji: '🍽️',
    titulo: 'Comida',
    color: '#fb923c',
    desc: 'One Piece de fondo y a reponer fuerzas.',
    participantes: ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla'],
  },
  {
    id: 'valorant',
    dia: 'sab',
    inicio: '15:30',
    fin: '16:30',
    emoji: '🎯',
    titulo: 'Valorant',
    color: '#facc15',
    desc: 'Partidas de 5. Se conectan los de fuera.',
    participantes: ['Óscar', 'Agus', 'Greñas'],
  },
  {
    id: 'fortnite',
    dia: 'sab',
    inicio: '16:30',
    fin: '17:30',
    emoji: '🪂',
    titulo: 'Fortnite',
    color: '#22d3ee',
    desc: 'Squad a por la Victory Royale.',
    participantes: ['Óscar', 'Greñas', 'Luis M.'],
  },
  {
    id: 'lol',
    dia: 'sab',
    inicio: '17:30',
    fin: '19:00',
    emoji: '🧙',
    titulo: 'League of Legends',
    color: '#c084fc',
    desc: 'Rankeds de LIX. Quizá una en clásico para calentar.',
    participantes: ['Óscar', 'Agus', 'Greñas', 'Cla', 'Luis P.'],
    logistica: 'Luis P. se va a casa. Cla juega desde el PC de María o desde su casa.',
  },
  {
    id: 'minecraft',
    dia: 'sab',
    inicio: '19:00',
    fin: '21:00',
    emoji: '⛏️',
    titulo: 'Minecraft',
    color: '#34d399',
    desc: 'Servidor para todos con minijuegos y retos. Si se va de hora, se recorta.',
    participantes: ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla', 'Agus', 'Greñas'],
    logistica: 'Al acabar: se le entrega el disfraz a Óscar.',
  },
  {
    id: 'cena',
    dia: 'sab',
    inicio: '21:00',
    fin: '23:00',
    emoji: '🌙',
    titulo: 'Cena disfrazado',
    color: '#f472b6',
    desc: 'Al puerto, a cenar un kebab con Óscar de Sailor Moon. Aquí caen los retos gordos.',
    participantes: ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla'],
    logistica: 'Vuelta a casa de Óscar.',
  },
  {
    id: 'noche',
    dia: 'sab',
    inicio: '23:00',
    fin: '02:00',
    emoji: '🃏',
    titulo: 'La noche',
    color: '#a78bfa',
    desc: 'Juego de mesa, peli o One Piece hasta que caiga el último.',
    participantes: ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla'],
  },
  {
    id: 'basquet',
    dia: 'dom',
    inicio: '11:00',
    fin: '13:00',
    emoji: '🏀',
    titulo: 'Partido de baloncesto',
    color: '#38bdf8',
    desc: 'Pista por confirmar. Y hay que conseguir una pelota.',
    participantes: ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla'],
  },
]

export interface Reto {
  id: string
  /** Bloque al que pertenece (id de BLOQUES). */
  bloque: string
  texto: string
  puntos: number
  /** Condición de validación, para que no se discuta en caliente. */
  detalle?: string
  /** Los negativos restan: son las cagadas con premio inverso. */
  castigo?: boolean
}

export const RETOS: Reto[] = [
  // --- Inauguración ---
  { id: 'ina-1', bloque: 'inauguracion', texto: 'Leer el manifiesto de la despedida a cámara', puntos: 5, detalle: 'De pie y sin reírse. Si se ríe, se repite.' },
  { id: 'ina-2', bloque: 'inauguracion', texto: 'Poner "ÓscarSeCasa" como título del directo', puntos: 5 },
  { id: 'ina-3', bloque: 'inauguracion', texto: 'Presentar a los ocho de la cuadrilla sin guion', puntos: 10, detalle: 'Un fallo de nombre y no cuenta.' },

  // --- One Piece TCG ---
  { id: 'op-1', bloque: 'onepiece', texto: 'Ganar una partida', puntos: 10 },
  { id: 'op-2', bloque: 'onepiece', texto: 'Ganar con 3 o más de vida restante', puntos: 15 },
  { id: 'op-3', bloque: 'onepiece', texto: 'Ganar con un mazo elegido por otro', puntos: 15, detalle: 'Elige el mazo quien no juegue esa ronda.' },
  { id: 'op-4', bloque: 'onepiece', texto: 'Cerrar la partida con el ataque del líder', puntos: 10 },
  { id: 'op-5', bloque: 'onepiece', texto: 'Perder contra Luis P.', puntos: -5, castigo: true },

  // --- Elsword ---
  { id: 'els-1', bloque: 'elsword', texto: 'Subir un personaje nuevo a nivel 20', puntos: 15 },
  { id: 'els-2', bloque: 'elsword', texto: 'Que los tres noobs acaben una mazmorra sin morir', puntos: 20, detalle: 'Luis M., Sergi y Román vivos al final.' },
  { id: 'els-3', bloque: 'elsword', texto: 'Completar una mazmorra con rango S', puntos: 15 },
  { id: 'els-4', bloque: 'elsword', texto: 'Explicar el lore de Elsword en menos de 60 s', puntos: 10, detalle: 'Con cronómetro. Vale que nadie lo entienda.' },
  { id: 'els-5', bloque: 'elsword', texto: 'Morir en la primera mazmorra siendo el experto', puntos: -10, castigo: true },

  // --- Comida ---
  { id: 'com-1', bloque: 'comida', texto: 'Brindis en japonés antes de empezar', puntos: 5 },
  { id: 'com-2', bloque: 'comida', texto: 'Comerse el primer plato sin usar las manos', puntos: 10 },

  // --- Valorant ---
  { id: 'val-1', bloque: 'valorant', texto: 'Conseguir un ace', puntos: 25 },
  { id: 'val-2', bloque: 'valorant', texto: 'Ganar un duelo a pistola en la primera ronda', puntos: 10 },
  { id: 'val-3', bloque: 'valorant', texto: 'Matar a alguien solo con el cuchillo', puntos: 15 },
  { id: 'val-4', bloque: 'valorant', texto: 'Ganar la partida', puntos: 20 },
  { id: 'val-5', bloque: 'valorant', texto: 'Matar a un compañero por error', puntos: -5, castigo: true },

  // --- Fortnite ---
  { id: 'for-1', bloque: 'fortnite', texto: 'Victory Royale', puntos: 25 },
  { id: 'for-2', bloque: 'fortnite', texto: 'Una eliminación con el pico', puntos: 15 },
  { id: 'for-3', bloque: 'fortnite', texto: 'Quedar entre los 5 últimos con la squad', puntos: 10 },
  { id: 'for-4', bloque: 'fortnite', texto: 'Bailar encima de un rival eliminado', puntos: 5 },

  // --- LoL ---
  { id: 'lol-1', bloque: 'lol', texto: 'Ganar una ranked', puntos: 20 },
  { id: 'lol-2', bloque: 'lol', texto: 'Pentakill', puntos: 30, detalle: 'El clip se guarda o no ha pasado.' },
  { id: 'lol-3', bloque: 'lol', texto: 'Jugar una partida con campeón aleatorio', puntos: 15, detalle: 'Lo sortea la cuadrilla, no lo elige él.' },
  { id: 'lol-4', bloque: 'lol', texto: 'Acabar una partida con 10 o más kills', puntos: 15 },
  { id: 'lol-5', bloque: 'lol', texto: 'Acabar una partida sin morir ni una vez', puntos: 20 },
  { id: 'lol-6', bloque: 'lol', texto: 'Morir antes del minuto 3', puntos: -10, castigo: true },

  // --- Minecraft ---
  { id: 'mc-1', bloque: 'minecraft', texto: 'Sobrevivir la primera noche sin morir', puntos: 10 },
  { id: 'mc-2', bloque: 'minecraft', texto: 'Construir una réplica reconocible de su casa', puntos: 20, detalle: 'Se vota a mano alzada: 4 de 6 y cuenta.' },
  { id: 'mc-3', bloque: 'minecraft', texto: 'Bajar al Nether y volver vivo', puntos: 20 },
  { id: 'mc-4', bloque: 'minecraft', texto: 'Ganar el minijuego que monte la cuadrilla', puntos: 15 },
  { id: 'mc-5', bloque: 'minecraft', texto: 'Morir en la lava con el inventario lleno', puntos: -10, castigo: true },

  // --- Cena disfrazado (aquí está la sal de la despedida) ---
  { id: 'cen-1', bloque: 'cena', texto: 'Salir de casa disfrazado y sin taparse', puntos: 20 },
  { id: 'cen-2', bloque: 'cena', texto: 'Pedir el kebab sin salirse del personaje', puntos: 15 },
  { id: 'cen-3', bloque: 'cena', texto: 'Hacer la transformación de Sailor Moon en plena calle', puntos: 20 },
  { id: 'cen-4', bloque: 'cena', texto: 'Que un desconocido se haga una foto con él', puntos: 15 },
  { id: 'cen-5', bloque: 'cena', texto: 'Discurso lunar en alto antes de cenar', puntos: 10 },
  { id: 'cen-6', bloque: 'cena', texto: 'Convencer a un camarero de que es su despedida', puntos: 15 },

  // --- La noche ---
  { id: 'noc-1', bloque: 'noche', texto: 'Ganar la partida al juego de mesa', puntos: 10 },
  { id: 'noc-2', bloque: 'noche', texto: 'Aguantar despierto hasta el final de la peli', puntos: 10 },
  { id: 'noc-3', bloque: 'noche', texto: 'Ser el último en irse a dormir', puntos: 15 },

  // --- Domingo: baloncesto ---
  { id: 'bas-1', bloque: 'basquet', texto: 'Meter un triple', puntos: 15 },
  { id: 'bas-2', bloque: 'basquet', texto: 'Ganar el partido con su equipo', puntos: 20 },
  { id: 'bas-3', bloque: 'basquet', texto: 'Encestar con los ojos cerrados', puntos: 10 },
  { id: 'bas-4', bloque: 'basquet', texto: 'Meter desde medio campo', puntos: 25 },
]

export interface Recompensa {
  id: string
  /** Puntos necesarios para abrirla. */
  umbral: number
  emoji: string
  /** Lo que hay dentro. SECRETO hasta que se desbloquea. */
  titulo: string
  detalle: string
  /** Lo único que Óscar ve antes de llegar al umbral. */
  pista: string
}

// De menor a mayor umbral. Los umbrales están calibrados sobre el total de
// puntos posibles: la pantalla de recompensas avisa si el último queda por
// encima del máximo (pasaría si quitáis retos sin tocar esto).
export const RECOMPENSAS: Recompensa[] = [
  {
    id: 'r1',
    umbral: 30,
    emoji: '🥤',
    titulo: 'Combustible',
    detalle: 'Se abren las Monster y los refrescos. Hasta aquí, agua del grifo.',
    pista: 'Está frío y lleva demasiada cafeína.',
  },
  {
    id: 'r2',
    umbral: 70,
    emoji: '🍫',
    titulo: 'Merienda desbloqueada',
    detalle: 'Salen las chuches y la bollería escondidas en la cocina.',
    pista: 'Lleva azúcar y estaba escondido en tu propia casa.',
  },
  {
    id: 'r3',
    umbral: 120,
    emoji: '🃏',
    titulo: 'Comodín anti-putada',
    detalle: 'Vale por librarse de UN reto de la cena. Se gasta una sola vez y no se guarda para el domingo.',
    pista: 'Te va a salvar de algo que pasará vestido de marinerita.',
  },
  {
    id: 'r4',
    umbral: 170,
    emoji: '🥙',
    titulo: 'Derecho a elegir la cena',
    detalle: 'Elige él el sitio y lo que se pide. Sin derecho a veto.',
    pista: 'Decides tú algo que normalmente decidimos nosotros.',
  },
  {
    id: 'r5',
    umbral: 220,
    emoji: '🎧',
    titulo: 'Amo de la música',
    detalle: 'Manda en la lista de reproducción de toda la noche.',
    pista: 'Se oye, y todos vamos a tener que aguantarlo.',
  },
  {
    id: 'r6',
    umbral: 280,
    emoji: '🥐',
    titulo: 'Desayuno de campeones',
    detalle: 'Domingo con desayuno de verdad comprado por la cuadrilla, no galletas rancias.',
    pista: 'Mañana por la mañana lo vas a agradecer mucho.',
  },
  {
    id: 'r7',
    umbral: 340,
    emoji: '🎁',
    titulo: 'El regalo',
    detalle: 'PENDIENTE: decidid entre todos qué va aquí y editadlo antes del sábado.',
    pista: 'Lo último de todo. Y no se come.',
  },
]

/** Suma de todo lo ganable (los castigos no cuentan para el techo). */
export const PUNTOS_MAXIMOS = RETOS.reduce((n, r) => n + Math.max(0, r.puntos), 0)

export function retosDe(bloqueId: string): Reto[] {
  return RETOS.filter((r) => r.bloque === bloqueId)
}

export function bloquePorId(id: string): Bloque | undefined {
  return BLOQUES.find((b) => b.id === id)
}

/** Instante real de inicio/fin (los bloques que cruzan medianoche suman un día). */
export function rangoDe(b: Bloque): { desde: Date; hasta: Date } {
  const desde = new Date(`${FECHAS[b.dia]}T${b.inicio}:00`)
  const hasta = new Date(`${FECHAS[b.dia]}T${b.fin}:00`)
  if (hasta <= desde) hasta.setDate(hasta.getDate() + 1)
  return { desde, hasta }
}

/** Bloque que toca AHORA según el reloj, o null si estamos fuera de horario. */
export function bloqueEnCurso(ahora: Date): Bloque | null {
  return BLOQUES.find((b) => {
    const { desde, hasta } = rangoDe(b)
    return ahora >= desde && ahora < hasta
  }) ?? null
}

/** Siguiente bloque que empieza después de `ahora`. */
export function bloqueSiguiente(ahora: Date): Bloque | null {
  return BLOQUES.find((b) => rangoDe(b).desde > ahora) ?? null
}
