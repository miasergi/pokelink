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
  /** Se juega, pero fuera de concurso: ni directo, ni retos, ni puntos. */
  sinPuntos?: boolean
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
    desc: 'Torneo 2vs2 con proxies y mazos preparados aposta por Luis P. y Cla.',
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
    desc: 'Run de dos horas contando la preparación y la creación de personajes. Óscar enseña a completos noobs; Román juega desde el PC de María.',
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
    logistica: 'Luis P. se va a casa. Cla juega desde el PC de María o desde la suya.',
  },
  {
    id: 'lol',
    dia: 'sab',
    inicio: '15:30',
    fin: '17:00',
    marca: 'lol',
    titulo: 'League of Legends',
    color: '#c084fc',
    desc: 'Rankeds de LIX. Quizá una en clásico para calentar.',
    participantes: ['Óscar', 'Agus', 'Greñas', 'Cla', 'Luis P.'],
  },
  {
    id: 'valorant',
    dia: 'sab',
    inicio: '17:00',
    fin: '18:00',
    marca: 'valorant',
    titulo: 'Valorant',
    color: '#facc15',
    desc: 'Partidas de 5. Faltan dos por decidir quién se apunta.',
    participantes: ['Óscar', 'Agus', 'Greñas'],
    logistica: 'Todos los participantes menos Román, desde su casa.',
  },
  {
    id: 'minecraft',
    dia: 'sab',
    inicio: '18:00',
    fin: '20:00',
    marca: 'minecraft',
    titulo: 'Minecraft',
    color: '#34d399',
    desc: 'Partida conjunta: todos a por el dragón antes de que se acabe el tiempo. Es el bloque colchón, así que se estira o se recorta según cómo vaya el día.',
    participantes: ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla', 'Agus', 'Greñas'],
    logistica: 'Se vuelve a casa de Óscar.',
  },
  {
    id: 'fortnite',
    dia: 'sab',
    inicio: '20:00',
    fin: '21:00',
    marca: 'fortnite',
    titulo: 'Fortnite',
    color: '#22d3ee',
    desc: 'Squad de cuatro a por la Victory Royale, ya todos en casa de Óscar.',
    participantes: ['Óscar', 'Greñas', 'Luis M.', 'Agus'],
    logistica: 'Luis M. juega desde el PC de María. Al acabar se le entrega el disfraz. Si el día viene con retraso, se recorta esto: a las 21:00 se cierra igual.',
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
    desc: 'Libre: decide Óscar. Tiene juegos de mesa (el Isaac, el Slay the Spire) y el de One Piece nuevo.',
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
    desc: 'Fuera de concurso: la despedida acaba el sábado. Esto se juega quien pueda y quiera, sin directo y sin puntos.',
    participantes: ['Óscar', 'Sergi', 'Luis P.', 'Luis M.', 'Román', 'Cla'],
    sinPuntos: true,
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
  /**
   * Logro OCULTO (idea de Cla): no se enseña hasta que lo hace la primera vez.
   * Ahí se le revela qué era y por qué le ha restado, y a partir de entonces le
   * toca evitar repetirlo. Hasta ese momento solo se ve la pista.
   */
  oculto?: boolean
  pista?: string
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
  // --- Todo el fin de semana. OCULTOS: no se enseñan hasta que caen. ---
  { id: 'glo-1', bloque: 'global', texto: 'Cada vez que va al baño', dificultad: 'facil', puntos: -5, castigo: true, oculto: true, pista: 'Algo que haces varias veces al día te está costando caro.', detalle: 'Una marca por viaje. Sí, cuenta el del bar.' },
  { id: 'glo-2', bloque: 'global', texto: 'Cada vez que le pillen hablando con María', dificultad: 'facil', puntos: -20, castigo: true, oculto: true, pista: 'Hay una persona con la que hablar te sale muy caro.' },

  // --- Inauguración ---
  { id: 'ina-1', bloque: 'inauguracion', texto: 'Leer el manifiesto de la despedida a cámara', dificultad: 'facil', puntos: 5, detalle: 'De pie y sin reírse. Si se ríe, se repite.' },
  { id: 'ina-2', bloque: 'inauguracion', texto: 'Poner "ÓscarSeCasa" como título del directo', dificultad: 'facil', puntos: 5 },
  { id: 'ina-3', bloque: 'inauguracion', texto: 'Presentar bien a los ocho de la cuadrilla sin guion', dificultad: 'medio', puntos: 10, detalle: 'Un fallo de nombre y no cuenta.' },

  // --- One Piece TCG ---
  { id: 'op-0', bloque: 'onepiece', texto: 'Presentar el juego: explicar a cámara por qué le importa', dificultad: 'facil', puntos: 5 },
  { id: 'op-1', bloque: 'onepiece', texto: 'Jugar un Trafalgar Law', dificultad: 'facil', puntos: 5 },
  { id: 'op-2', bloque: 'onepiece', texto: 'Superando a los creadores: ganar una partida contra Cla y Luis P.', dificultad: 'medio', puntos: 15 },
  { id: 'op-3', bloque: 'onepiece', texto: '¡Déjame jugar!: inutilizar los characters rivales dos turnos seguidos', dificultad: 'medio', puntos: 10 },
  { id: 'op-4', bloque: 'onepiece', texto: 'Detergente: impactar un double attack banish con el líder', dificultad: 'medio', puntos: 10 },
  { id: 'op-6', bloque: 'onepiece', texto: 'Soy un chico EXCELENTE: jugar tres costes 9 o más en una misma partida', dificultad: 'medio', puntos: 15 },
  { id: 'op-7', bloque: 'onepiece', texto: 'Inclusivo: trashear cartas al rival de tres colores distintos', dificultad: 'dificil', puntos: 25 },

  // --- Elsword ---
  { id: 'els-0', bloque: 'elsword', texto: 'Presentar el juego: explicar el lore en menos de 60 s', dificultad: 'facil', puntos: 5, detalle: 'Con cronómetro. Vale que nadie lo entienda.' },
  { id: 'els-1', bloque: 'elsword', texto: 'Convencer a todos de llevar cada uno un personaje distinto', dificultad: 'facil', puntos: 5 },
  { id: 'els-2', bloque: 'elsword', texto: 'Llegar al pueblo de Altera', dificultad: 'facil', puntos: 15 },
  { id: 'els-3', bloque: 'elsword', texto: 'Subir su personaje a nivel 50 antes de que los demás se cansen', dificultad: 'medio', puntos: 20 },
  { id: 'els-4', bloque: 'elsword', texto: 'Que ningún noob muera en ningún momento', dificultad: 'facil', puntos: 15 },
  { id: 'els-5', bloque: 'elsword', texto: 'Carreador excesivo: olvidarse de enseñar y ponerse a avanzar él solo', dificultad: 'medio', puntos: -20, castigo: true },

  // --- Comida ---
  { id: 'com-1', bloque: 'comida', texto: 'Brindis en japonés antes de empezar', dificultad: 'facil', puntos: 5 },
  { id: 'com-2', bloque: 'comida', texto: 'Comer en el suelo', dificultad: 'facil', puntos: 10 },
  { id: 'com-3', bloque: 'comida', texto: 'Comerse el plato sin usar las manos', dificultad: 'dificil', puntos: 25, detalle: 'Ni para los cubiertos, ni para la comida, ni para el plato. Con el de comer en el suelo: como un perro.' },

  // --- LoL ---
  { id: 'lol-0', bloque: 'lol', texto: 'Presentar el juego: lore, anécdota o lo que salga', dificultad: 'facil', puntos: 5 },
  { id: 'lol-1', bloque: 'lol', texto: 'LJX: ganar una ranked cada uno en su posición y con sus campeones míticos', dificultad: 'medio', puntos: 15 },
  { id: 'lol-2', bloque: 'lol', texto: 'Ganar una partida todos polivalentes y con campeón aleatorio', dificultad: 'medio', puntos: 20 },
  { id: 'lol-3', bloque: 'lol', texto: "Jugar de Cho'Gath sin comprar botas", dificultad: 'facil', puntos: 10 },
  { id: 'lol-4', bloque: 'lol', texto: 'Conseguir que Agustín no se tiltee', dificultad: 'medio', puntos: 15 },
  { id: 'lol-5', bloque: 'lol', texto: 'Acabar una partida con 10 o más kills', dificultad: 'medio', puntos: 15 },
  { id: 'lol-6', bloque: 'lol', texto: 'Acabar una partida sin morir ni una vez', dificultad: 'medio', puntos: 20 },
  { id: 'lol-7', bloque: 'lol', texto: 'Pentakill', dificultad: 'brutal', puntos: 30, detalle: 'El clip se guarda o no ha pasado.' },
  { id: 'lol-8', bloque: 'lol', texto: 'Morir antes del minuto 3', dificultad: 'facil', puntos: -20, castigo: true },

  // --- Valorant ---
  { id: 'val-0', bloque: 'valorant', texto: 'Presentar el juego: lore, anécdota o lo que salga', dificultad: 'facil', puntos: 5 },
  { id: 'val-1', bloque: 'valorant', texto: 'Jugar una partida con agente aleatorio', dificultad: 'facil', puntos: 10 },
  { id: 'val-2', bloque: 'valorant', texto: 'Buen comienzo: ganar un duelo a pistola', dificultad: 'medio', puntos: 15 },
  { id: 'val-3', bloque: 'valorant', texto: 'Matar a tres en una ronda con la Bulldog', dificultad: 'medio', puntos: 15 },
  { id: 'val-4', bloque: 'valorant', texto: 'Matar a alguien con el cuchillo', dificultad: 'dificil', puntos: 20 },
  { id: 'val-5', bloque: 'valorant', texto: 'Ganar una partida', dificultad: 'facil', puntos: 10 },
  { id: 'val-6', bloque: 'valorant', texto: 'Conseguir matar a un compañero', dificultad: 'brutal', puntos: 20, detalle: 'En Valorant no se puede por error: tiene que buscarlo. Por eso SUMA.' },
  { id: 'val-7', bloque: 'valorant', texto: 'Conseguir un ace', dificultad: 'brutal', puntos: 30 },

  // --- Minecraft: partida conjunta a por el dragón ---
  { id: 'mc-1', bloque: 'minecraft', texto: 'El brillo del monitor está para algo: por cada antorcha que ponga', dificultad: 'facil', puntos: -5, castigo: true, detalle: 'Se marca una vez por antorcha. Sin piedad.' },
  { id: 'mc-2', bloque: 'minecraft', texto: 'Carrera por el diamante: ser el primero en encontrar diamantes', dificultad: 'medio', puntos: 15 },
  { id: 'mc-3', bloque: 'minecraft', texto: 'Montarse en un cerdo', dificultad: 'facil', puntos: 10 },
  { id: 'mc-4', bloque: 'minecraft', texto: 'Como grupo: encontrar una dungeon', dificultad: 'medio', puntos: 10, detalle: 'No cuenta el spawner de arañas de una mineshaft.' },
  { id: 'mc-5', bloque: 'minecraft', texto: 'Craftear y desgastar del todo una azada de diamante', dificultad: 'brutal', puntos: 20 },
  { id: 'mc-6', bloque: 'minecraft', texto: 'Morir en la lava con el inventario lleno', dificultad: 'facil', puntos: -10, castigo: true },
  { id: 'mc-7', bloque: 'minecraft', texto: 'Como grupo: encontrar una fortaleza del Nether', dificultad: 'medio', puntos: 15 },
  { id: 'mc-8', bloque: 'minecraft', texto: 'Activar el portal al End', dificultad: 'dificil', puntos: 15 },
  { id: 'mc-9', bloque: 'minecraft', texto: 'Speedrunners: matar al dragón dentro del tiempo', dificultad: 'dificil', puntos: 15 },
  { id: 'mc-10', bloque: 'minecraft', texto: 'Óscar va sobrado: hacer un vuelo con elytra', dificultad: 'brutal', puntos: 25 },

  // --- Fortnite ---
  { id: 'for-0', bloque: 'fortnite', texto: 'Presentar el juego: lore, anécdota o lo que salga', dificultad: 'facil', puntos: 5 },
  { id: 'for-1', bloque: 'fortnite', texto: 'Extraer 5 espíritus en una partida', dificultad: 'facil', puntos: 10 },
  { id: 'for-2', bloque: 'fortnite', texto: 'Sacar un espíritu raro y extraerlo a nivel máximo', dificultad: 'dificil', puntos: 20 },
  { id: 'for-3', bloque: 'fortnite', texto: 'No usar ninguna curación en una partida de más de 10 minutos', dificultad: 'medio', puntos: 15 },
  { id: 'for-4', bloque: 'fortnite', texto: 'Bailar encima de un rival eliminado', dificultad: 'facil', puntos: 10 },
  { id: 'for-5', bloque: 'fortnite', texto: 'Quedar entre los 5 últimos con la squad', dificultad: 'medio', puntos: 15 },
  { id: 'for-6', bloque: 'fortnite', texto: 'Una eliminación con el pico', dificultad: 'dificil', puntos: 20 },
  { id: 'for-7', bloque: 'fortnite', texto: 'Victory Royale', dificultad: 'brutal', puntos: 25 },

  // --- Cena disfrazado (aquí está la sal de la despedida) ---
  { id: 'cen-1', bloque: 'cena', texto: 'Dale un beso a un marroquí', dificultad: 'brutal', puntos: 35 },
  { id: 'cen-2', bloque: 'cena', texto: 'Pedir el kebab sin salirse del personaje', dificultad: 'medio', puntos: 10 },
  { id: 'cen-3', bloque: 'cena', texto: 'Hacer la transformación de Sailor Moon en plena calle', dificultad: 'medio', puntos: 10 },
  { id: 'cen-4', bloque: 'cena', texto: 'Que un desconocido se haga una foto con él o salude al directo', dificultad: 'medio', puntos: 15 },
  { id: 'cen-5', bloque: 'cena', texto: 'Conseguir que un desconocido le siga en Twitch y salte la alerta', dificultad: 'medio', puntos: 20 },
  { id: 'cen-6', bloque: 'cena', texto: 'Discurso lunar en alto antes de cenar', dificultad: 'medio', puntos: 10 },

  // --- La noche ---
  { id: 'noc-1', bloque: 'noche', texto: 'Llenarse la boca de papas y cantar el opening de One Piece de memoria', dificultad: 'facil', puntos: 10 },
  { id: 'noc-2', bloque: 'noche', texto: 'Bailar con música de Chayanne de fondo', dificultad: 'facil', puntos: 10 },
  { id: 'noc-3', bloque: 'noche', texto: 'Enseñar un huevo sin que salga en el directo', dificultad: 'facil', puntos: 10 },
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
  /**
   * Premio con fecha de caducidad: hay que abrirlo ANTES de que empiece este
   * bloque. Si llega la hora sin abrirlo, se destapa igual pero con castigo.
   */
  limite?: string
  penalizacion?: string
  /** De los gordos: un regalo de verdad, no una tontería. */
  jugoso?: boolean
  /** El premio del que tiene que creerse que es de verdad. */
  legendario?: boolean
  /** Solo para los organizadores: el montaje que hay detrás. */
  nota?: string
}

/**
 * Los premios, tal y como los dejó Luis en su Word. Tres cosas a tener claras:
 *
 *  - El ORDEN de la lista es el orden de los umbrales, de menor a mayor.
 *  - Los umbrales de los tres primeros los fijó él (10, 25, 50) para que caigan
 *    en momentos concretos: el primero en mitad de la inauguración, el segundo
 *    jugando al One Piece y el tercero al empezar Elsword como muy tarde. El
 *    resto son una curva propuesta sobre esos anclajes; se tocan sin miedo.
 *  - Los que llevan `limite` son los que TIENE que conseguir antes de una hora.
 *    Si no llega, la caja se abre sola con la penalización dentro.
 */
export const RECOMPENSAS: Recompensa[] = [
  {
    id: 'r01', umbral: 2, marca: 'comodin', jugoso: true,
    titulo: 'Vale de 5 € en Cardmarket',
    detalle: 'Cinco euros de cartón, a gastar en lo que quieras.',
    pista: 'Sirve para comprar cartón. Del que te gusta.',
  },
  {
    id: 'r02', umbral: 25, marca: 'micro',
    titulo: 'Que cante otro',
    detalle: 'Vale para obligar a quien tú digas a cantar en el directo el opening que tú elijas.',
    pista: 'Alguien va a hacer el ridículo. Y no eres tú.',
  },
  {
    id: 'r03', umbral: 50, marca: 'comida', jugoso: true,
    limite: 'comida',
    titulo: 'Chefs expertos',
    detalle: 'Cla y Luis P. te cocinan los macarrones con salchichas.',
    pista: 'Hoy alguien se pone el delantal. Corre, que la comida no espera.',
    penalizacion: 'No llegaste a tiempo: los macarrones te los cocinas tú.',
  },
  {
    id: 'r04', umbral: 70, marca: 'vaso',
    titulo: 'Combustible',
    detalle: 'Una Monster para cuando el cuerpo la pida.',
    pista: 'Frío, verde y con demasiada cafeína.',
  },
  {
    id: 'r05', umbral: 80, marca: 'wc',
    titulo: 'Meada gratis',
    detalle: 'Un viaje al baño sin que te reste puntos. Uno, y no acumula.',
    pista: 'Un viaje sale gratis. Solo uno.',
  },
  {
    id: 'r06', umbral: 100, marca: 'onepiece',
    titulo: '¡SOMOS MUGIWARA!',
    detalle: 'Se pone la canción a todo lo que dé el equipo. Ahora mismo.',
    pista: 'Se va a oír en todo el edificio.',
  },
  {
    id: 'r07', umbral: 125, marca: 'caramelo',
    titulo: 'Picoteo',
    detalle: 'Se abren las papas y las bebidas. A partir de aquí se pica durante todo el día.',
    pista: 'Cruje, y se comparte.',
  },
  {
    id: 'r08', umbral: 150, marca: 'mando', jugoso: true,
    titulo: 'Vale de 5 € en Steam',
    detalle: 'Cinco euros para gastar sin salir de casa.',
    pista: 'Para gastarlo sin levantarte de la silla.',
  },
  {
    id: 'r09', umbral: 175, marca: 'pesa',
    titulo: 'Diez flexiones ajenas',
    detalle: 'Vale para obligar a un amigo a hacer 10 flexiones en el directo.',
    pista: 'Alguien va a sudar. Tú no.',
  },
  {
    id: 'r10', umbral: 200, marca: 'luna', legendario: true,
    limite: 'cena',
    titulo: 'Skin legendaria',
    detalle: 'Desbloqueas el disfraz de Sailor Moon.',
    pista: 'La recompensa más rara del día. Te va a cambiar el aspecto.',
    penalizacion: 'No la desbloqueaste: te toca algo todavía más ridículo. Y cantando.',
    nota: 'Es EL premio. Montadlo como si fuera un drop de verdad para que se lo crea. Tiene que caer antes de las 21:00.',
  },
  {
    id: 'r11', umbral: 250, marca: 'dado',
    titulo: 'Derecho a retar',
    detalle: 'Vale para retar a quien quieras entre las 21:00 y las 23:00. Lo que se te ocurra.',
    pista: 'Entre las nueve y las once mandas tú una vez.',
  },
  {
    id: 'r12', umbral: 275, marca: 'balon', jugoso: true,
    limite: 'basquet',
    titulo: 'La pelota es tuya',
    detalle: 'Te llevas la pelota de básquet. Tuya para siempre.',
    pista: 'Naranja, bota, y mañana la vas a necesitar.',
    penalizacion: 'No llegaste: vas andando hasta la pista botándola todo el camino.',
  },
  {
    id: 'r14', umbral: 300, marca: 'antifaz', jugoso: true,
    titulo: 'Striptease',
    detalle: 'Striptease. No hay más que explicar.',
    pista: 'Va a entrar alguien por esa puerta.',
    nota: 'El montaje: antifaz y esposas, música, y hacemos como que entra alguien en casa. Él solo debe ver el desbloqueo.',
  },
  {
    id: 'r15', umbral: 350, marca: 'comodin', jugoso: true,
    titulo: 'Otros 5 € en Cardmarket',
    detalle: 'Más cartón.',
    pista: 'Otra vez lo del principio.',
  },
  {
    id: 'r16', umbral: 355, marca: 'mando', jugoso: true,
    titulo: 'Otros 5 € en Steam',
    detalle: 'Más biblioteca.',
    pista: 'Y otra vez lo otro.',
  },
  {
    id: 'r17', umbral: 360, marca: 'comodin', jugoso: true,
    titulo: 'Y otros 5 € en Cardmarket',
    detalle: 'Sí, más cartón todavía.',
    pista: 'A estas alturas ya sabes de qué va.',
  },
  {
    id: 'r18', umbral: 369, marca: 'mando', jugoso: true,
    titulo: 'Y otros 5 € en Steam',
    detalle: 'Si has llegado aquí, te lo has ganado.',
    pista: 'Nadie esperaba que llegases tan lejos.',
  },
  {
    // Lo puso Román por su cuenta y es el único regalo de verdad de la lista:
    // se abre con la ceremonia completa, como el drop que es.
    id: 'r19', umbral: 500, marca: 'regalo', jugoso: true, legendario: true,
    titulo: 'Un juego de Steam. Sorpresa.',
    detalle: 'Regalo de Román: un juego entero, elegido por él, sin decirte cuál hasta que lo tengas.',
    pista: 'Alguien ha puesto algo gordo aquí arriba. Nadie cuenta con que llegues.',
    nota: 'Lo pone Román. Que lo diga él en el directo cuando caiga.',
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
