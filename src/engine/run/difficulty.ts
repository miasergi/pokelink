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
 * Nivel enemigo de una casilla. Es la ÚNICA fuente de verdad para la UI y el
 * motor: pinta y pelea SIEMPRE esto.
 *
 * Ya no hay "extra por dificultad" (v6.52): la dificultad vive en la CURVA DE
 * JEFES de `mapGen` (Normal empieza en nv.11 y sube +8 por gimnasio;
 * Difícil/Nuzlocke, nv.14 y +9), y las casillas de ruta se interpolan entre esos
 * anclas, así que en Difícil TODO el mapa va más alto por construcción. Sumar
 * además unos niveles encima solo servía para que el número de la curva y el
 * que veías en pantalla no coincidieran: el primer gimnasio de Difícil está
 * puesto a 14 y se leía "Nv.16".
 *
 * Historia (por qué el extra existió): fue el sustituto del viejo ×1.4, que al
 * ser multiplicador se desalineaba de la curva del jugador (gym1 8→11 pero gym8
 * 67→94, con el Alto Mando saturado a 100: 0,2 gimnasios de media por run en
 * Difícil frente a 2,9 en Normal). Con curvas propias por dificultad el
 * problema desaparece de raíz.
 *
 * Se mantiene el parámetro `difficulty` a propósito: es el punto donde volvería
 * a colgarse cualquier ajuste de nivel por modo, y evita tocar 10 llamadas.
 */
export function effectiveEnemyLevel(node: MapNode, difficulty?: string): number {
  void difficulty
  return Math.min(100, node.enemyLevel)
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
