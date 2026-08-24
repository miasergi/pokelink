// OCALIMOCHO — el Juego de la Oca versión previa, edición «siguiente nivel»:
// tablero de 63 casillas con CATEGORÍAS al estilo de los tableros bebedores
// clásicos (ocas de 8 en 8, posada del abstemio, duelo de dados, laberinto,
// cárcel con fianza, reglas puñeteras, zona cultural, hipnosis, patinazos y
// un porrón de casillas temáticas). Motor PURO (sin UI) y testeado.

export type OcaKind =
  | 'normal' | 'oca' | 'beber' | 'duelo' | 'laberinto' | 'carcel'
  | 'posada' | 'regla' | 'cultural' | 'hipnosis' | 'patinazo'
  | 'muerte' | 'meta'

export interface OcaSquare {
  idx: number // 1..63
  kind: OcaKind
  title: string
  rule: string
  emoji: string
  /** Solo 'beber': tragos a repartir. */
  x?: number
  /** Solo 'patinazo': casilla a la que resbalas. */
  jumpTo?: number
}

/** Ocas de 8 en 8 («de ocho en ocho y bebo calimocho»). La última salta a la meta. */
export const OCA_SQUARES = [8, 16, 24, 32, 40, 48, 56]

/** Dado mínimo para escapar del laberinto. */
export const LABERINTO_ESCAPE = 5

/** Casillas temáticas (el cachondeo del tablero), con texto PROPIO. */
const THEMED: Record<number, { title: string; rule: string; emoji: string }> = {
  1: { title: 'Salida', emoji: '🏁', rule: '¡Empieza el juego! El último que llegó a la previa bebe 1 por impuntual.' },
  2: { title: 'Cegatos', emoji: '👓', rule: 'Quien lleve gafas o lentillas bebe 1. Así se ve mejor.' },
  3: { title: 'Barbudos', emoji: '🧔', rule: 'Barba o bigote: bebe 1. Bien poblada, bebe con orgullo.' },
  5: { title: 'Peinados', emoji: '💇', rule: 'Melena larga o gomina en el pelo: bebe 1.' },
  11: { title: 'Enganchados', emoji: '🔋', rule: 'Sacad los móviles: quien tenga MENOS batería bebe 2.' },
  12: { title: "Pa'los de alante", emoji: '👉', rule: 'Beben 1 todos los que van POR DELANTE de ti en el tablero.' },
  15: { title: 'Cómicos', emoji: '🎤', rule: 'Cuenta un chiste. Si nadie se ríe, bebes 2; si se ríen, repartes 2.' },
  18: { title: 'Impares', emoji: '🎂', rule: 'Nacidos en año IMPAR beben 1.' },
  21: { title: 'Pares', emoji: '🎉', rule: 'Nacidos en año PAR beben 1.' },
  27: { title: 'Mascotas', emoji: '🐶', rule: 'Quien tenga mascota brinda a su salud en voz alta y bebe 1.' },
  28: { title: 'De luto', emoji: '🖤', rule: 'Quien vista algo negro bebe 1.' },
  31: { title: "Pa'los de atrás", emoji: '👈', rule: 'Beben 1 todos los que van POR DETRÁS de ti en el tablero.' },
  34: { title: 'Guerra de bandos', emoji: '⚔️', rule: 'El grupo se parte en dos bandos: piedra-papel-tijera a una; el bando perdedor bebe 1.' },
  38: { title: 'Bailongos', emoji: '💃', rule: 'Baila 10 segundos sin música o bebe 2.' },
  43: { title: 'Tardones', emoji: '🥤', rule: 'Quien tenga el vaso MÁS lleno de la mesa bebe 2 para ponerse al día.' },
  44: { title: 'Calcetines', emoji: '🧦', rule: 'Enseñad los calcetines: el grupo vota los más feos y su dueño bebe 1.' },
  46: { title: 'Pintados', emoji: '🎨', rule: 'Tatuaje o pelo teñido: bebe 2. El arte se paga.' },
  50: { title: 'Escoceses', emoji: '🏴', rule: 'Ropa de cuadros o de rayas: bebe 2.' },
  51: { title: 'Musculitos', emoji: '💪', rule: 'Quien vaya al gimnasio bebe 1. Presumir cuesta.' },
  53: { title: 'Sedientos', emoji: '🥛', rule: 'El grupo decide quién es el que MENOS ha bebido esta noche: bebe 2.' },
  54: { title: 'Parejitas', emoji: '💑', rule: 'Quien tenga pareja bebe 1. Los solteros reparten 1: hoy se sale.' },
  58: { title: 'Envidiosos', emoji: '🍀', rule: 'Estás oliendo la meta: los demás beben 1 de pura envidia.' },
  61: { title: 'Lenguados', emoji: '👅', rule: 'Recita un trabalenguas. Si te trabas, bebes 2; si sale limpio, reparte 2.' },
  62: { title: 'A las puertas', emoji: '😰', rule: 'A NADA de dormirla… bebe 1 de nervios y reza por la tirada.' },
}

/** Tragos a repartir en cada casilla ¡A beber! (van subiendo hacia la meta). */
const BEBER_X: Record<number, number> = { 6: 2, 14: 2, 22: 3, 30: 3, 49: 4, 59: 5 }

/** Categorías de la Zona Cultural (una al azar al caer). */
export const CULTURAL_CATEGORIES = [
  'Marcas de cerveza', 'Cócteles', 'Capitales de Europa', 'Equipos de Primera División',
  'Películas de Disney', 'Series de televisión', 'Cantantes en español', 'Razas de perro',
  'Cosas que hay en una nevera', 'Marcas de coches', 'Futbolistas españoles', 'Sabores de helado',
  'Países de América', 'Grupos de música en español', 'Tapas de bar', 'Videojuegos famosos',
  'Superhéroes', 'Pokémon (¡faltaría más!)', 'Aerolíneas', 'Marcas de ropa',
  'Festivales de música', 'Aplicaciones del móvil', 'Palabras que acaben en -ón',
  'Ciudades españolas', 'Comidas que se comen con las manos', 'Cosas que se alquilan',
]

function buildBoard(): OcaSquare[] {
  const board: OcaSquare[] = []
  for (let i = 1; i <= 63; i++) {
    if (OCA_SQUARES.includes(i)) {
      board.push({ idx: i, kind: 'oca', emoji: '🦆', title: '¡Oca!', rule: 'Bebe 1 al grito de «¡De ocho en ocho y bebo calimocho!», salta a la siguiente oca… y VUELVE a tirar.' })
    } else if (i in BEBER_X) {
      board.push({ idx: i, kind: 'beber', emoji: '🍺', x: BEBER_X[i], title: `¡A beber! ×${BEBER_X[i]}`, rule: `Reparte ${BEBER_X[i]} tragos entre quien tú quieras. Con cabeza… o sin ella.` })
    } else if (i === 7 || i === 19 || i === 29 || i === 37 || i === 47) {
      board.push({ idx: i, kind: 'duelo', emoji: '🎲', title: 'Duelo de dados', rule: 'Reta a quien quieras: un dado cada uno, el que saque MENOS bebe 2 (empate: bebéis 1 los dos).' })
    } else if (i === 9 || i === 35) {
      board.push({ idx: i, kind: 'laberinto', emoji: '🌀', title: 'El Laberinto', rule: `Te pierdes: en tus turnos tira el dado y solo sales con ${LABERINTO_ESCAPE} o 6 (y avanzas eso). Cada fallo, bebe 1.` })
    } else if (i === 26 || i === 45) {
      board.push({ idx: i, kind: 'carcel', emoji: '⛓️', title: 'La Cárcel', rule: 'Trena: tira la fianza (dos dados). Bebes la mitad de la suma y repartes el resto. Además pierdes 1 turno.' })
    } else if (i === 4 || i === 20 || i === 55) {
      board.push({ idx: i, kind: 'posada', emoji: '🛡️', title: 'Posada del Abstemio', rule: 'Techo sagrado: NADIE puede mandarte beber hasta tu próximo turno. Respira.' })
    } else if (i === 10 || i === 23 || i === 41) {
      board.push({ idx: i, kind: 'regla', emoji: '📜', title: 'Regla puñetera', rule: 'Inventa una norma bebedora (prohibido decir nombres, beber con la zurda…). Vale hasta que alguien pise otra REGLA.' })
    } else if (i === 13 || i === 25 || i === 33 || i === 39 || i === 52) {
      board.push({ idx: i, kind: 'cultural', emoji: '🧠', title: 'Zona cultural', rule: 'Sale una categoría: por turnos, decid una respuesta cada uno, rapidito. El primero que falle o repita, bebe 2.' })
    } else if (i === 17 || i === 36) {
      board.push({ idx: i, kind: 'hipnosis', emoji: '😵‍💫', title: 'Hipnosis', rule: 'Hasta tu próximo turno, cada vez que mandes beber a alguien… bebes tú la mitad (redondeando a tu favor).' })
    } else if (i === 42) {
      board.push({ idx: i, kind: 'patinazo', emoji: '🫠', jumpTo: 12, title: '¡Patinazo!', rule: 'Resbalas hasta la casilla 12. Bebe 2 por el costalazo.' })
    } else if (i === 57) {
      board.push({ idx: i, kind: 'patinazo', emoji: '🫠', jumpTo: 31, title: '¡Patinazo!', rule: 'A un paso de la gloria… resbalas hasta la 31. Bebe 2 por el costalazo.' })
    } else if (i === 60) {
      board.push({ idx: i, kind: 'muerte', emoji: '💀', title: 'La Muerte', rule: 'Qué mala suerte, chavaluc@: de vuelta a la SALIDA. Bebe 3 para pasar el duelo.' })
    } else if (i === 63) {
      board.push({ idx: i, kind: 'meta', emoji: '🏆', title: '¡Vete a dormirla!', rule: '¡HAS GANADO! Reparte lo que te quede en el vaso como prefieras y el grupo bebe 3 en tu honor, campeón/a.' })
    } else {
      const t = THEMED[i]
      board.push({ idx: i, kind: 'normal', ...(t ?? { title: 'Casilla tranquila', emoji: '😮‍💨', rule: 'Respira. Aquí no bebe nadie… de momento.' }) })
    }
  }
  return board
}

/** Tablero completo, casillas 1..63 (índice 0 = casilla 1). */
export const OCA_BOARD: OcaSquare[] = buildBoard()

export function squareAt(pos: number): OcaSquare {
  return OCA_BOARD[Math.min(Math.max(pos, 1), 63) - 1]
}

export interface OcaMove {
  /** Posiciones intermedias en orden (para animar), SIN la de partida. */
  path: number[]
  /** Casilla final tras aplicar los saltos especiales. */
  final: number
  /** La casilla donde CAES (la que manda y cuya carta se enseña). */
  square: OcaSquare
  /** true = el jugador repite tirada (oca). */
  extraRoll: boolean
  /** Turnos que pierde (cárcel). */
  skipTurns: number
  /** El jugador queda atrapado (laberinto: sale con 5-6). */
  trap?: 'laberinto'
  /** true = ha llegado a la meta. */
  won: boolean
  /** true = pasó de 63 y rebotó hacia atrás. */
  bounced: boolean
}

/**
 * Resuelve una tirada desde `pos` (0..62) con un dado `die` (1..6).
 * Rebote clásico: si te pasas de 63, retrocedes lo que sobre.
 */
export function resolveMove(pos: number, die: number): OcaMove {
  const path: number[] = []
  let dest = pos + die
  let bounced = false
  if (dest > 63) {
    dest = 63 - (dest - 63)
    bounced = true
  }
  path.push(dest)

  let extraRoll = false
  let skipTurns = 0
  let trap: 'laberinto' | undefined
  const sq = squareAt(dest)

  // Saltos y estados especiales (un salto como máximo: el destino de un
  // salto nunca es otro salto que se re-dispare).
  if (sq.kind === 'oca') {
    const next = OCA_SQUARES.find((o) => o > dest)
    dest = next ?? 63
    path.push(dest)
    extraRoll = true
  } else if (sq.kind === 'patinazo') {
    dest = sq.jumpTo ?? dest
    path.push(dest)
  } else if (sq.kind === 'muerte') {
    dest = 1
    path.push(dest)
  } else if (sq.kind === 'carcel') {
    skipTurns = 1
  } else if (sq.kind === 'laberinto') {
    trap = 'laberinto'
  }

  const won = dest === 63 && sq.kind !== 'muerte'
  return { path, final: dest, square: sq, extraRoll, skipTurns, trap, won, bounced }
}

/**
 * Camino casilla a casilla de una tirada (para animar la ficha): `die` pasos
 * desde `from`, avanzando hacia la meta y REBOTANDO hacia atrás al pisar el
 * 63. La última casilla coincide siempre con `resolveMove(...).path[0]`.
 */
export function walkPath(from: number, die: number): number[] {
  const steps: number[] = []
  let p = from
  let dir = 1
  for (let i = 0; i < die; i++) {
    if (p === 63) dir = -1
    p += dir
    steps.push(p)
  }
  return steps
}

/** Colores de ficha por jugador (hasta 8). */
export const OCA_COLORS = ['#f87171', '#38bdf8', '#4ade80', '#fbbf24', '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c']
