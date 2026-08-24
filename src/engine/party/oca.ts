// OCALIMOCHO — el Juego de la Oca versión previa. Motor PURO (sin UI):
// tablero clásico de 63 casillas con las especiales de toda la vida, cada una
// con su regla bebedora, y la resolución de una tirada como función pura para
// poder testearlo con vitest igual que el resto de motores del proyecto.

export type OcaKind =
  | 'normal' | 'oca' | 'puente' | 'posada' | 'dados' | 'pozo'
  | 'laberinto' | 'carcel' | 'muerte' | 'meta'

export interface OcaSquare {
  idx: number // 1..63
  kind: OcaKind
  title: string
  rule: string
  emoji: string
}

/** Casillas de oca clásicas. La última (59) salta directa a la meta. */
export const OCA_SQUARES = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59]

/** Reglas bebedoras para las casillas normales, rotando (índice % pool). */
const NORMAL_RULES: Array<{ title: string; rule: string; emoji: string }> = [
  { title: 'Casilla tranquila', rule: 'Respira. Aquí no bebe nadie… de momento.', emoji: '😮‍💨' },
  { title: 'Un traguito', rule: 'Bebes 1. Por estar ahí.', emoji: '🥤' },
  { title: 'Generosidad', rule: 'Reparte 2 tragos entre quien quieras.', emoji: '🎁' },
  { title: 'Vecinos', rule: 'Beben 1 los jugadores a tu izquierda y a tu derecha.', emoji: '🏘️' },
  { title: 'Marca blanca', rule: 'Di una marca de bebida en 5 segundos o bebe 2.', emoji: '🏷️' },
  { title: 'Brindis', rule: 'Todos brindan contigo: 1 trago general.', emoji: '🥂' },
  { title: 'Espejo', rule: 'Elige a alguien: bebéis 1 los dos mirándoos fijamente.', emoji: '🪞' },
  { title: 'Aduana', rule: 'Quien vaya último en el tablero bebe 2 para animarse.', emoji: '🛃' },
  { title: 'Peaje', rule: 'Bebes 1 por cada oca que hayas pisado esta partida (máx. 3).', emoji: '💸' },
  { title: 'Silencio', rule: 'Hasta tu próximo turno no puedes hablar. Cada palabra, 1 trago.', emoji: '🤫' },
  { title: 'DJ', rule: 'Elige la próxima canción de la previa o bebe 2.', emoji: '🎧' },
  { title: 'Líder', rule: 'Quien vaya primero en el tablero bebe 2. Ser líder cansa.', emoji: '👑' },
]

function buildBoard(): OcaSquare[] {
  const board: OcaSquare[] = []
  for (let i = 1; i <= 63; i++) {
    if (OCA_SQUARES.includes(i)) {
      board.push({ idx: i, kind: 'oca', emoji: '🦆', title: '¡Oca!', rule: 'De oca a oca y bebe porque te toca: bebe 1, salta a la siguiente oca y VUELVE a tirar.' })
    } else if (i === 6 || i === 12) {
      board.push({ idx: i, kind: 'puente', emoji: '🌉', title: 'El Puente', rule: 'De puente a puente: cruza a la otra orilla, bebe 1 y vuelve a tirar.' })
    } else if (i === 19) {
      board.push({ idx: i, kind: 'posada', emoji: '🍺', title: 'La Posada', rule: 'Te quedas de cañas: pierdes 1 turno, pero bebes 2 a gusto.' })
    } else if (i === 26 || i === 53) {
      board.push({ idx: i, kind: 'dados', emoji: '🎲', title: 'Los Dados', rule: 'De dado a dado: salta al otro dado, reparte 2 y vuelve a tirar.' })
    } else if (i === 31) {
      board.push({ idx: i, kind: 'pozo', emoji: '🕳️', title: 'El Pozo', rule: 'Te caes al pozo: pierdes 2 turnos y bebes 2. Alguien puede rescatarte pagando 1 trago (y entonces solo pierdes 1).' })
    } else if (i === 42) {
      board.push({ idx: i, kind: 'laberinto', emoji: '🌀', title: 'El Laberinto', rule: 'Te pierdes: retrocede a la casilla 30 y bebe 2 para orientarte.' })
    } else if (i === 52) {
      board.push({ idx: i, kind: 'carcel', emoji: '⛓️', title: 'La Cárcel', rule: 'Trena: pierdes 2 turnos. Cada vez que otro jugador tire, bebes 1 (máx. 2).' })
    } else if (i === 58) {
      board.push({ idx: i, kind: 'muerte', emoji: '💀', title: 'La Muerte', rule: 'Fatal: vuelves a la casilla 1 y bebes 3. La previa es cruel.' })
    } else if (i === 63) {
      board.push({ idx: i, kind: 'meta', emoji: '🏆', title: '¡Meta!', rule: '¡Has ganado! El resto del grupo bebe 3 en tu honor.' })
    } else {
      const r = NORMAL_RULES[i % NORMAL_RULES.length]
      board.push({ idx: i, kind: 'normal', ...r })
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
  /** La casilla final (para pintar la carta con su regla). */
  square: OcaSquare
  /** true = el jugador repite tirada (oca, puente, dados). */
  extraRoll: boolean
  /** Turnos que pierde (posada 1, pozo/cárcel 2). */
  skipTurns: number
  /** true = ha llegado exacto a la meta. */
  won: boolean
  /** true = pasó de 63 y rebotó hacia atrás. */
  bounced: boolean
}

/**
 * Resuelve una tirada desde `pos` (1..62) con un dado `die` (1..6).
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
  let sq = squareAt(dest)

  // Saltos especiales (uno como máximo: el destino de un salto nunca es otro salto).
  if (sq.kind === 'oca') {
    const next = OCA_SQUARES.find((o) => o > dest)
    dest = next ?? 63
    path.push(dest)
    extraRoll = true
  } else if (sq.kind === 'puente') {
    dest = dest === 6 ? 12 : 6
    path.push(dest)
    extraRoll = true
  } else if (sq.kind === 'dados') {
    dest = dest === 26 ? 53 : 26
    path.push(dest)
    extraRoll = true
  } else if (sq.kind === 'laberinto') {
    dest = 30
    path.push(dest)
  } else if (sq.kind === 'muerte') {
    dest = 1
    path.push(dest)
  } else if (sq.kind === 'posada') {
    skipTurns = 1
  } else if (sq.kind === 'pozo' || sq.kind === 'carcel') {
    skipTurns = 2
  }

  // La carta que se muestra es la de la casilla donde CAÍSTE (la especial),
  // no la del destino del salto — ahí está la regla con gracia.
  const won = dest === 63 && sq.kind !== 'muerte'
  return { path, final: dest, square: sq, extraRoll, skipTurns, won, bounced }
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
