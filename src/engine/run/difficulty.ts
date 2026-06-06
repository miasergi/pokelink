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

/** Nivel enemigo EFECTIVO de una casilla (aplica el ×1.4 de Difícil/Nuzlocke,
 *  igual que el motor de combate). */
export function effectiveEnemyLevel(node: MapNode, difficulty: string): number {
  const tough = difficulty === 'hard' || difficulty === 'nuzlocke'
  return tough ? Math.min(100, Math.round(node.enemyLevel * 1.4)) : node.enemyLevel
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
