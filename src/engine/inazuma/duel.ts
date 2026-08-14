// Motor de DUELO: la unidad atómica del partido. Dos jugadores, una técnica
// cada uno, una tirada. Es puro: mismos argumentos + misma RNG → mismo
// resultado (los partidos son reproducibles a partir de la semilla).
//
// Un gol exige ganar TRES duelos encadenados en la misma posesión
// (construcción → penetración → definición), así que ninguna tirada suelta
// decide el partido y una plantilla con una sola estrella no basta.
import type { RNG } from '@/utils/rng'
import { getTechnique } from '@/data/inazuma/techniques'
import { elementMultiplier } from './elements'
import type { Actor, ChainStep, Element, Stats, Technique } from './types'
import { fatigueMultiplier, TECH_LEVEL_BONUS, techniqueCostFor } from './roster'

/**
 * Resuelve una técnica EN MANOS DE UN ACTOR CONCRETO, con sus mejoras del
 * objeto «Mejora» ya aplicadas a la potencia.
 *
 * Todo el motor debe pasar por aquí en vez de por `getTechnique` a secas: si no,
 * la Mejora se vería en la ficha del jugador pero no cambiaría nada en el campo
 * — exactamente el fallo que ya tuvimos con los objetos de atributos, que eran
 * decorativos y valían cero medido con el bot.
 */
export function actorTechnique(actor: Actor, id: string): Technique | undefined {
  const t = getTechnique(id)
  if (!t) return undefined
  const lv = actor.techLevels?.[id] ?? 0
  if (!lv) return t
  // Más potencia Y más barata (ver `TECH_LEVEL_COST_CUT`): la resolución del
  // duelo, el `affordable` y el gasto de PT beben todos de aquí, así que la
  // Mejora se nota de verdad en el campo.
  return {
    ...t,
    power: Math.round(t.power * (1 + lv * TECH_LEVEL_BONUS)),
    cost: techniqueCostFor(actor, t),
  }
}

/** Un lado del duelo, ya resuelto a números (sirve para ti y para el rival). */
export interface Duelist {
  name: string
  element: Element
  stats: Stats
  /** 0-100. Los rivales no acumulan fatiga entre partidos: siempre 100. */
  stamina: number
  technique?: Technique
  /** Supervibración activa: la técnica pega más y no cuesta PT. */
  burst?: boolean
  /** Multiplicador extra del Espíritu Guerrero (1 = sin espíritu). */
  boost?: number
}

export interface DuelResult {
  success: boolean
  chance: number
  effectiveness: number
  attackerPower: number
  defenderPower: number
}

/** Multiplicador de la Supervibración sobre la potencia del duelo. */
export const BURST_MULT = 1.4

/**
 * Sesgo del atacante por eslabón. Sube en la construcción (sacar el balón de
 * atrás es fácil) y baja en la definición (el portero es el último muro).
 * Calibrado para ~1.4 goles por equipo y partido con plantillas parejas.
 */
const STEP_BIAS: Record<ChainStep, number> = {
  construccion: 1.4,
  penetracion: 1.2,
  definicion: 1.05,
}

/** Bonus acumulado por cada duelo ya ganado en esta misma posesión. */
export const MOMENTUM_STEP = 0.08

/** Atributo compuesto que aporta cada rol en cada eslabón. */
function attackStat(step: ChainStep, s: Stats): number {
  switch (step) {
    case 'construccion': return s.control * 0.7 + s.velocidad * 0.3
    case 'penetracion': return s.control * 0.6 + s.fisico * 0.4
    case 'definicion': return s.tiro
  }
}

function defendStat(step: ChainStep, s: Stats): number {
  switch (step) {
    case 'construccion': return s.defensa * 0.6 + s.velocidad * 0.4
    case 'penetracion': return s.defensa * 0.7 + s.fisico * 0.3
    case 'definicion': return s.defensa
  }
}

/**
 * Cuánto pesa la técnica en el duelo. Con el 1:1 de antes, una técnica de 40
 * de potencia solo movía el duelo ~8 puntos frente a ir a cuerpo — pagar PT
 * apenas se notaba y el playtest lo cantó. Con 1.5, la misma técnica mueve
 * ~13-15 puntos y la definitiva de 100 convierte un 50 % en un ~72 %.
 */
const TECH_IMPACT = 1.5

function power(base: number, d: Duelist): number {
  const tech = d.technique ? 1 + (d.technique.power / 100) * TECH_IMPACT : 1
  return base * tech * fatigueMultiplier(d.stamina) * (d.burst ? BURST_MULT : 1) * (d.boost ?? 1)
}

/**
 * Probabilidad de que el atacante gane el duelo. Separada de `resolveDuel`
 * para que la UI pueda enseñar las estrellas de cada opción ANTES de tirar
 * (sin gastar RNG, que rompería el determinismo del partido).
 */
export function duelChance(step: ChainStep, atk: Duelist, def: Duelist, momentum = 0): { chance: number; effectiveness: number; attackerPower: number; defenderPower: number } {
  // El elemento se compara SIEMPRE entre las técnicas si las hay; si alguien va
  // "a cuerpo" se usa su elemento personal.
  const atkEl = atk.technique?.element ?? atk.element
  const defEl = def.technique?.element ?? def.element
  const effectiveness = elementMultiplier(atkEl, defEl)

  const attackerPower = power(attackStat(step, atk.stats), atk) * effectiveness * (1 + momentum)
  const defenderPower = power(defendStat(step, def.stats), def)

  const raw = (attackerPower * STEP_BIAS[step]) / (attackerPower * STEP_BIAS[step] + defenderPower)
  // Techo y suelo: ni el mejor delantero del torneo marca siempre, ni el peor
  // suplente pierde todos los duelos. Sin esto, la final contra Zeus sería
  // matemáticamente imposible en cuanto te sacaran 15 niveles.
  const chance = Math.max(0.08, Math.min(0.92, raw))
  return { chance, effectiveness, attackerPower, defenderPower }
}

export function resolveDuel(step: ChainStep, atk: Duelist, def: Duelist, rng: RNG, momentum = 0): DuelResult {
  const info = duelChance(step, atk, def, momentum)
  return { ...info, success: rng.next() < info.chance }
}

/** Estrellas 1-3 que se pintan en cada opción de una jugada clave. */
export function oddsStars(chance: number): 1 | 2 | 3 {
  if (chance >= 0.62) return 3
  if (chance >= 0.42) return 2
  return 1
}

/**
 * Técnica que elige la IA: la más potente que pueda pagar, con preferencia por
 * la que tenga ventaja elemental contra el rival. Guarda PT en los eslabones
 * baratos (no gasta la definitiva en la construcción).
 */
export function pickAiTechnique(
  options: Technique[],
  pt: number,
  rivalElement: Element,
  step: ChainStep,
): Technique | undefined {
  // En construcción/penetración solo se permite hasta la mitad del depósito,
  // para que al rival le quede gasolina para el disparo.
  const budget = step === 'definicion' ? pt : pt * 0.5
  const usable = options.filter((t) => t.cost <= budget)
  if (!usable.length) return undefined
  let best = usable[0]
  let bestScore = -Infinity
  for (const t of usable) {
    const score = t.power * elementMultiplier(t.element, rivalElement)
    if (score > bestScore) { bestScore = score; best = t }
  }
  return best
}
