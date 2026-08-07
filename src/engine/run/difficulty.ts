import type { MapNode } from './types'

/** Casillas que implican enfrentarse a un enemigo (tienen nivel relevante). */
const COMBAT_TYPES = new Set(['battle', 'trainer', 'legendary', 'gym', 'elite', 'champion', 'rival'])

export interface NodeDifficulty {
  tier: 0 | 1 | 2 | 3 // 0 = equilibrado (sin aviso); 1-3 = aviso creciente
  label: string
  color: string
  delta: number // niveles del enemigo por encima de tu equipo
}

const TIERS: { label: string; color: string }[] = [
  { label: 'Equilibrado', color: '#64748b' },
  { label: 'Fuerte', color: '#fbbf24' }, // ámbar
  { label: 'Muy fuerte', color: '#fb923c' }, // naranja
  { label: 'Letal', color: '#f87171' }, // rojo
]

export function isCombatNode(node: MapNode): boolean {
  return COMBAT_TYPES.has(node.type)
}

/**
 * Niveles EXTRA que llevan los enemigos según la dificultad: sube con el nivel
 * pero con TECHO (`max`), nunca un multiplicador puro (v6.46).
 *
 * Historia del parámetro:
 *  - ×1.4 (hasta v6.45) era un multiplicador y se desalineaba de la curva del
 *    jugador, que sube por bonus fijos de casilla (+2/+3/+4) y por tanto sigue
 *    la curva base. El enemigo, multiplicado, se separaba más y más: gym1 8→11
 *    (+3), pero gym4 32→45 (+13) y gym8 67→94 (+27), con TODO el Alto Mando
 *    saturado a 100. Diagnóstico: 0,2 gimnasios de media por run en Difícil
 *    frente a 2,9 en Normal. No era más difícil, era imposible.
 *  - Una suma fija (+3) arregla la deriva pero rompe la apertura: tu inicial es
 *    nv.5 y el primer salvaje pasaba a nv.8, así que las runs morían en la
 *    primera ruta antes de tener equipo (seguía dando 0,2 gimnasios).
 *  - La rampa con techo cubre las dos cosas: casi nada al empezar (+1), el
 *    hueco completo a media run y CONSTANTE a partir de ahí.
 */
const LEVEL_BONUS: Record<string, { rate: number; max: number }> = {
  normal: { rate: 0, max: 0 },
  hard: { rate: 0.12, max: 3 },
  // Nuzlocke usa la MISMA curva que Difícil: su dureza propia es la muerte
  // permanente y el número de vidas, no unos enemigos más altos.
  nuzlocke: { rate: 0.12, max: 3 },
}

/**
 * Extra ADICIONAL que llevan SOLO los jefes que marcan el tope (gimnasio, Alto
 * Mando, Campeón) en Difícil/Nuzlocke (v6.52).
 *
 * Por qué existe: el tope del equipo (`levelCap`) se calcula desde el nivel del
 * próximo jefe, así que subir la curva de jefes subía TAMBIÉN tu tope y el
 * cambio se anulaba solo — en Difícil llegabas siempre EMPATADO con el as del
 * líder (margen 0) y los jefes se sentían blandos (feedback del tester, ago
 * 2026). Este extra es el único que NO se traslada al tope: es exactamente el
 * hueco que el líder te saca. Rampa (poco al principio, todo a partir de media
 * run) para no romper la apertura, que es donde las runs de Difícil morían.
 *
 * Rivales y guardianes legendarios quedan FUERA a propósito: no entran en el
 * cálculo del tope, así que subirlos sí crearía casillas imposibles.
 */
const BOSS_BONUS: Record<string, { rate: number; max: number }> = {
  normal: { rate: 0, max: 0 },
  hard: { rate: 0.08, max: 5 },
  nuzlocke: { rate: 0.08, max: 5 },
}

/** Jefes que definen el tope de nivel (ver `levelCap`) y llevan `BOSS_BONUS`. */
const CAP_BOSS_TYPES = new Set(['gym', 'elite', 'champion'])

const ramp = (t: { rate: number; max: number } | undefined, level: number): number =>
  !t || !t.rate ? 0 : Math.min(t.max, Math.round(level * t.rate))

/** Niveles extra del enemigo para un nivel base dado (ver `LEVEL_BONUS`).
 *  `isBoss` añade el extra propio de los jefes (ver `BOSS_BONUS`). */
export function enemyLevelBonus(difficulty: string, baseLevel: number, isBoss = false): number {
  return ramp(LEVEL_BONUS[difficulty], baseLevel) + (isBoss ? bossLevelExtra(difficulty, baseLevel) : 0)
}

/** Solo el extra de jefe: los niveles que el líder te saca por encima de tu
 *  tope. `levelCap` lo resta para que subir jefes no suba tu techo. */
export function bossLevelExtra(difficulty: string, baseLevel: number): number {
  return ramp(BOSS_BONUS[difficulty], baseLevel)
}

/** Niveles extra que lleva el enemigo de ESTA casilla (jefes incluidos). */
export function nodeLevelBonus(node: MapNode, difficulty: string): number {
  return enemyLevelBonus(difficulty, node.enemyLevel, CAP_BOSS_TYPES.has(node.type))
}

/** Nivel enemigo EFECTIVO de una casilla (con el extra de Difícil/Nuzlocke,
 *  igual que el motor de combate). Es la ÚNICA fuente de verdad: la UI debe
 *  pintar esto, nunca `node.enemyLevel` en crudo. */
export function effectiveEnemyLevel(node: MapNode, difficulty: string): number {
  return Math.min(100, node.enemyLevel + nodeLevelBonus(node, difficulty))
}

/** Dificultad de una casilla comparada con el nivel medio de tu equipo. Sirve
 *  para avisar de cualquier enemigo más fuerte de lo normal (no solo los nodos
 *  "arriesgados"). */
export function nodeDifficulty(node: MapNode, partyAvgLevel: number, difficulty: string): NodeDifficulty {
  const lvl = effectiveEnemyLevel(node, difficulty)
  const delta = Math.round(lvl - partyAvgLevel)
  let tier: NodeDifficulty['tier'] = 0
  if (delta >= 3) tier = 1
  if (delta >= 8) tier = 2
  if (delta >= 14) tier = 3
  return { tier, delta, label: TIERS[tier].label, color: TIERS[tier].color }
}
