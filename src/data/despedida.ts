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
  /** Símbolo del cartel. Los dibujos viven en `ui/despedida/Marcas`. */
  marca: string
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
    marca: 'directo',
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
    marca: 'onepiece',
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
    marca: 'elsword',
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
    marca: 'comida',
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
    marca: 'valorant',
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
    marca: 'fortnite',
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
    marca: 'lol',
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
    marca: 'minecraft',
    titulo: 'Minecraft',
    color: '#34d399',
    desc: 'PENDIENTE decidir el formato: mundo normal a por logros, contrarreloj o partida conjunta a matar al dragón.',
    participantes: ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla', 'Agus', 'Greñas'],
    logistica: 'Al acabar: se le entrega el disfraz a Óscar.',
  },
  {
    id: 'cena',
    dia: 'sab',
    inicio: '21:00',
    fin: '23:00',
    marca: 'luna',
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
    marca: 'dado',
    titulo: 'La noche',
    color: '#a78bfa',
    desc: 'PENDIENTE decidir: juegos de mesa, una run rápida de Pokémon tipo soullocke o un juego de terror con castigos.',
    participantes: ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla'],
  },
  {
    id: 'basquet',
    dia: 'dom',
    inicio: '11:00',
    fin: '13:00',
    marca: 'balon',
    titulo: 'Partido de baloncesto',
    color: '#38bdf8',
    desc: 'Pista por confirmar. Y hay que conseguir una pelota.',
    participantes: ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla'],
  },
]

/** Nivel de un reto. Los puntos salen de aquí, no a ojo. */
export type Dificultad = 'facil' | 'medio' | 'dificil' | 'brutal'

/**
 * La tabla de conversión. Está sola y a la vista A PROPÓSITO: para renivelar
 * toda la despedida basta con tocar estos cuatro números, en vez de repasar
 * sesenta retos uno por uno.
 */
export const PUNTOS_POR_DIFICULTAD: Record<Dificultad, number> = {
  facil: 5,
  medio: 10,
  dificil: 20,
  brutal: 35,
}

export interface Reto {
  id: string
  /** Bloque al que pertenece (id de BLOQUES, o 'global'). */
  bloque: string
  texto: string
  dificultad: Dificultad
  /** Puntos a mano. Solo para los castigos y para lo que no encaje en la tabla. */
  puntos?: number
  /** Condición de validación, para que no se discuta en caliente. */
  detalle?: string
  /** Los castigos restan: son las cagadas con premio inverso. */
  castigo?: boolean
}

/** Lo que vale un reto: su dificultad, salvo que lleve puntos propios. */
export function puntosDe(r: Reto): number {
  return r.puntos ?? PUNTOS_POR_DIFICULTAD[r.dificultad]
}

/**
 * Los retos que NO son de ningún bloque: valen a cualquier hora de los dos
 * días. Vive fuera de BLOQUES porque no ocupa hueco en el horario y rompería
 * el orden del cartel.
 */
export const BLOQUE_GLOBAL = {
  id: 'global',
  titulo: 'Todo el fin de semana',
  marca: 'reloj',
  color: '#A1A1AA',
  desc: 'Valen a cualquier hora, del sábado a las diez al domingo por la tarde.',
} as const

export const RETOS: Reto[] = [
  // --- Todo el fin de semana ---
  { id: 'glo-1', bloque: 'global', texto: 'Cada vez que va al baño', dificultad: 'facil', puntos: -5, castigo: true, detalle: 'Una marca por viaje. Sí, cuenta el del bar.' },
  { id: 'glo-2', bloque: 'global', texto: 'Cada vez que le pillen hablando con María', dificultad: 'facil', puntos: -20, castigo: true },

  // --- Inauguración ---
  { id: 'ina-1', bloque: 'inauguracion', texto: 'Leer el manifiesto de la despedida a cámara', dificultad: 'facil', detalle: 'De pie y sin reírse. Si se ríe, se repite.' },
  { id: 'ina-2', bloque: 'inauguracion', texto: 'Poner "ÓscarSeCasa" como título del directo', dificultad: 'facil' },
  { id: 'ina-3', bloque: 'inauguracion', texto: 'Presentar bien a los ocho de la cuadrilla sin guion', dificultad: 'medio', detalle: 'Un fallo de nombre y no cuenta.' },

  // --- One Piece TCG ---
  { id: 'op-0', bloque: 'onepiece', texto: 'Explicar qué es el OPTCG y qué significa para él', dificultad: 'facil' },
  { id: 'op-1', bloque: 'onepiece', texto: 'Ganar una partida', dificultad: 'medio' },
  { id: 'op-2', bloque: 'onepiece', texto: 'Ganar con 3 o más de vida restante', dificultad: 'dificil' },
  { id: 'op-4', bloque: 'onepiece', texto: 'Cerrar la partida con el ataque del líder', dificultad: 'medio' },
  { id: 'op-5', bloque: 'onepiece', texto: 'Perder contra Luis P.', dificultad: 'facil', puntos: -5, castigo: true },

  // --- Elsword ---
  { id: 'els-4', bloque: 'elsword', texto: 'Explicar el lore de Elsword en menos de 60 s', dificultad: 'facil', detalle: 'Con cronómetro. Vale que nadie lo entienda.' },
  { id: 'els-1', bloque: 'elsword', texto: 'Subir un personaje nuevo a nivel 20', dificultad: 'medio', detalle: 'PENDIENTE: nadie sabe si esto es un paseo o imposible. Que lo ajuste quien controle.' },
  { id: 'els-2', bloque: 'elsword', texto: 'Que los tres noobs aguanten el bloque entero sin morir', dificultad: 'dificil', detalle: 'Luis M., Sergi y Román. Una sola mazmorra era demasiado fácil.' },
  { id: 'els-3', bloque: 'elsword', texto: 'Completar tres mazmorras con rango S', dificultad: 'medio' },

  // --- Comida ---
  { id: 'com-1', bloque: 'comida', texto: 'Brindis en japonés antes de empezar', dificultad: 'facil' },
  { id: 'com-2', bloque: 'comida', texto: 'Comerse el primer plato sin usar las manos', dificultad: 'dificil' },
  { id: 'com-3', bloque: 'comida', texto: 'Comerse el segundo plato sin cubiertos', dificultad: 'medio', detalle: 'Uno excluye al otro: decidid cuál va en cada plato.' },

  // --- Valorant ---
  { id: 'val-0', bloque: 'valorant', texto: 'Explicar el lore de Valorant o soltar una anécdota', dificultad: 'facil' },
  { id: 'val-6', bloque: 'valorant', texto: 'Jugar una partida con agente aleatorio', dificultad: 'facil' },
  { id: 'val-1', bloque: 'valorant', texto: 'Conseguir un ace', dificultad: 'dificil' },
  { id: 'val-2', bloque: 'valorant', texto: 'Ganar un duelo a pistola en la primera ronda', dificultad: 'medio' },
  { id: 'val-3', bloque: 'valorant', texto: 'Matar a alguien solo con el cuchillo', dificultad: 'dificil' },
  { id: 'val-4', bloque: 'valorant', texto: 'Ganar la partida', dificultad: 'medio' },
  { id: 'val-7', bloque: 'valorant', texto: 'Conseguir matar a un compañero', dificultad: 'dificil', detalle: 'En Valorant no se puede por error: tiene que buscarlo. Por eso SUMA.' },

  // --- Fortnite ---
  { id: 'for-0', bloque: 'fortnite', texto: 'Presentarse explicando el lore o una anécdota', dificultad: 'facil' },
  { id: 'for-4', bloque: 'fortnite', texto: 'Bailar encima de un rival eliminado', dificultad: 'facil' },
  { id: 'for-3', bloque: 'fortnite', texto: 'Quedar entre los 5 últimos con la squad', dificultad: 'medio' },
  { id: 'for-2', bloque: 'fortnite', texto: 'Una eliminación con el pico', dificultad: 'dificil' },
  { id: 'for-1', bloque: 'fortnite', texto: 'Victory Royale', dificultad: 'dificil' },

  // --- LoL ---
  { id: 'lol-0', bloque: 'lol', texto: 'Presentarse explicando el lore o una anécdota', dificultad: 'facil' },
  { id: 'lol-1', bloque: 'lol', texto: 'Ganar una ranked', dificultad: 'medio' },
  { id: 'lol-2', bloque: 'lol', texto: 'Pentakill', dificultad: 'brutal', detalle: 'El clip se guarda o no ha pasado.' },
  { id: 'lol-3', bloque: 'lol', texto: 'Jugar una partida con campeón aleatorio', dificultad: 'facil' },
  { id: 'lol-7', bloque: 'lol', texto: 'AllRandom: ganar una ranked todos polivalentes y con campeón aleatorio', dificultad: 'brutal' },
  { id: 'lol-8', bloque: 'lol', texto: 'Por los viejos tiempos: ganar con las posiciones y campeones míticos de cada uno', dificultad: 'medio' },
  { id: 'lol-9', bloque: 'lol', texto: 'Por los viejos tiempos: perder esa misma partida', dificultad: 'facil', puntos: -10, castigo: true },
  { id: 'lol-10', bloque: 'lol', texto: "Jugar de Cho'Gath sin comprar botas", dificultad: 'facil' },
  { id: 'lol-11', bloque: 'lol', texto: 'Conseguir que Agustín no se tiltee', dificultad: 'dificil' },
  { id: 'lol-4', bloque: 'lol', texto: 'Acabar una partida con 10 o más kills', dificultad: 'medio' },
  { id: 'lol-5', bloque: 'lol', texto: 'Acabar una partida sin morir ni una vez', dificultad: 'dificil' },
  { id: 'lol-6', bloque: 'lol', texto: 'Morir antes del minuto 3', dificultad: 'facil', puntos: -10, castigo: true },

  // --- Minecraft ---
  { id: 'mc-1', bloque: 'minecraft', texto: 'Sobrevivir la primera noche sin morir', dificultad: 'facil' },
  { id: 'mc-6', bloque: 'minecraft', texto: 'Montarse en un cerdo', dificultad: 'medio' },
  { id: 'mc-7', bloque: 'minecraft', texto: 'Encontrar una mazmorra', dificultad: 'medio' },
  { id: 'mc-2', bloque: 'minecraft', texto: 'Acabar con una casa más chula que la de Luis P.', dificultad: 'medio', detalle: 'Se vota a mano alzada: 4 de 6 y cuenta.' },
  { id: 'mc-3', bloque: 'minecraft', texto: 'Bajar al Nether y volver vivo', dificultad: 'dificil' },
  { id: 'mc-5', bloque: 'minecraft', texto: 'Morir en la lava con el inventario lleno', dificultad: 'facil', puntos: -10, castigo: true },

  // --- Cena disfrazado (aquí está la sal de la despedida) ---
  { id: 'cen-1', bloque: 'cena', texto: 'Salir de casa disfrazado y sin taparse', dificultad: 'medio' },
  { id: 'cen-2', bloque: 'cena', texto: 'Pedir el kebab sin salirse del personaje', dificultad: 'medio' },
  { id: 'cen-3', bloque: 'cena', texto: 'Hacer la transformación de Sailor Moon en plena calle', dificultad: 'facil' },
  { id: 'cen-4', bloque: 'cena', texto: 'Que un desconocido se haga una foto con él o salude al directo', dificultad: 'medio' },
  { id: 'cen-7', bloque: 'cena', texto: 'Conseguir que un desconocido le siga en Twitch y salte la alerta', dificultad: 'dificil' },
  { id: 'cen-5', bloque: 'cena', texto: 'Discurso lunar en alto antes de cenar', dificultad: 'facil' },
  { id: 'cen-6', bloque: 'cena', texto: 'Convencer a un camarero de que es su despedida', dificultad: 'facil' },

  // --- La noche ---
  { id: 'noc-1', bloque: 'noche', texto: 'Ganar la partida al juego de mesa', dificultad: 'medio' },
  { id: 'noc-2', bloque: 'noche', texto: 'Aguantar despierto hasta el final de la peli', dificultad: 'facil' },
  { id: 'noc-3', bloque: 'noche', texto: 'Ser el último en irse a dormir', dificultad: 'medio' },

  // --- Domingo: baloncesto ---
  { id: 'bas-1', bloque: 'basquet', texto: 'Meter un triple', dificultad: 'medio' },
  { id: 'bas-2', bloque: 'basquet', texto: 'Ganar el partido con su equipo', dificultad: 'medio' },
  { id: 'bas-3', bloque: 'basquet', texto: 'Encestar con los ojos cerrados', dificultad: 'medio' },
  { id: 'bas-4', bloque: 'basquet', texto: 'Meter desde medio campo', dificultad: 'dificil' },
]

export interface Recompensa {
  id: string
  /** Puntos necesarios para abrirla. */
  umbral: number
  /** Símbolo del cartel. Los dibujos viven en `ui/despedida/Marcas`. */
  marca: string
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
    marca: 'vaso',
    titulo: 'Combustible',
    detalle: 'Se abren las Monster y los refrescos. Hasta aquí, agua del grifo.',
    pista: 'Está frío y lleva demasiada cafeína.',
  },
  {
    id: 'r2',
    umbral: 70,
    marca: 'caramelo',
    titulo: 'Merienda desbloqueada',
    detalle: 'Salen las chuches y la bollería escondidas en la cocina.',
    pista: 'Lleva azúcar y estaba escondido en tu propia casa.',
  },
  {
    id: 'r3',
    umbral: 120,
    marca: 'comodin',
    titulo: 'Comodín anti-putada',
    detalle: 'Vale por librarse de UN reto de la cena. Se gasta una sola vez y no se guarda para el domingo.',
    pista: 'Te va a salvar de algo que pasará vestido de marinerita.',
  },
  {
    id: 'r4',
    umbral: 170,
    marca: 'kebab',
    titulo: 'Derecho a elegir la cena',
    detalle: 'Elige él el sitio y lo que se pide. Sin derecho a veto.',
    pista: 'Decides tú algo que normalmente decidimos nosotros.',
  },
  {
    id: 'r5',
    umbral: 220,
    marca: 'cascos',
    titulo: 'Amo de la música',
    detalle: 'Manda en la lista de reproducción de toda la noche.',
    pista: 'Se oye, y todos vamos a tener que aguantarlo.',
  },
  {
    id: 'r6',
    umbral: 280,
    marca: 'cafe',
    titulo: 'Desayuno de campeones',
    detalle: 'Domingo con desayuno de verdad comprado por la cuadrilla, no galletas rancias.',
    pista: 'Mañana por la mañana lo vas a agradecer mucho.',
  },
  {
    id: 'r7',
    umbral: 340,
    marca: 'regalo',
    titulo: 'El regalo',
    detalle: 'PENDIENTE: decidid entre todos qué va aquí y editadlo antes del sábado.',
    pista: 'Lo último de todo. Y no se come.',
  },
]

/** Suma de todo lo ganable (los castigos no cuentan para el techo). */
export const PUNTOS_MAXIMOS = RETOS.reduce((n, r) => n + Math.max(0, puntosDe(r)), 0)

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
