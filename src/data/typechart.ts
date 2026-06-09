import type { PokemonType } from '@/types'

// Multiplicador de efectividad: chart[atacante][defensor]
// 0 = inmune, 0.5 = poco eficaz, 1 = normal, 2 = súper eficaz
const T = 2
const H = 0.5
const Z = 0
const N = 1

// Orden fijo de tipos
export const TYPES: PokemonType[] = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
]

// prettier-ignore
const MATRIX: Record<PokemonType, Record<PokemonType, number>> = {
  //            nor fir wat ele gra ice fig poi gro fly psy bug roc gho dra dar ste fai
  normal:   { normal:N, fire:N, water:N, electric:N, grass:N, ice:N, fighting:N, poison:N, ground:N, flying:N, psychic:N, bug:N, rock:H, ghost:Z, dragon:N, dark:N, steel:H, fairy:N },
  fire:     { normal:N, fire:H, water:H, electric:N, grass:T, ice:T, fighting:N, poison:N, ground:N, flying:N, psychic:N, bug:T, rock:H, ghost:N, dragon:H, dark:N, steel:T, fairy:N },
  water:    { normal:N, fire:T, water:H, electric:N, grass:H, ice:N, fighting:N, poison:N, ground:T, flying:N, psychic:N, bug:N, rock:T, ghost:N, dragon:H, dark:N, steel:N, fairy:N },
  electric: { normal:N, fire:N, water:T, electric:H, grass:H, ice:N, fighting:N, poison:N, ground:Z, flying:T, psychic:N, bug:N, rock:N, ghost:N, dragon:H, dark:N, steel:N, fairy:N },
  grass:    { normal:N, fire:H, water:T, electric:N, grass:H, ice:N, fighting:N, poison:H, ground:T, flying:H, psychic:N, bug:H, rock:T, ghost:N, dragon:H, dark:N, steel:H, fairy:N },
  ice:      { normal:N, fire:H, water:H, electric:N, grass:T, ice:H, fighting:N, poison:N, ground:T, flying:T, psychic:N, bug:N, rock:N, ghost:N, dragon:T, dark:N, steel:H, fairy:N },
  fighting: { normal:T, fire:N, water:N, electric:N, grass:N, ice:T, fighting:N, poison:H, ground:N, flying:H, psychic:H, bug:H, rock:T, ghost:Z, dragon:N, dark:T, steel:T, fairy:H },
  poison:   { normal:N, fire:N, water:N, electric:N, grass:T, ice:N, fighting:N, poison:H, ground:H, flying:N, psychic:N, bug:N, rock:H, ghost:H, dragon:N, dark:N, steel:Z, fairy:T },
  ground:   { normal:N, fire:T, water:N, electric:T, grass:H, ice:N, fighting:N, poison:T, ground:N, flying:Z, psychic:N, bug:H, rock:T, ghost:N, dragon:N, dark:N, steel:T, fairy:N },
  flying:   { normal:N, fire:N, water:N, electric:H, grass:T, ice:N, fighting:T, poison:N, ground:N, flying:N, psychic:N, bug:T, rock:H, ghost:N, dragon:N, dark:N, steel:H, fairy:N },
  psychic:  { normal:N, fire:N, water:N, electric:N, grass:N, ice:N, fighting:T, poison:T, ground:N, flying:N, psychic:H, bug:N, rock:N, ghost:N, dragon:N, dark:Z, steel:H, fairy:N },
  bug:      { normal:N, fire:H, water:N, electric:N, grass:T, ice:N, fighting:H, poison:H, ground:N, flying:H, psychic:T, bug:N, rock:N, ghost:H, dragon:N, dark:T, steel:H, fairy:H },
  rock:     { normal:N, fire:T, water:N, electric:N, grass:N, ice:T, fighting:H, poison:N, ground:H, flying:T, psychic:N, bug:T, rock:N, ghost:N, dragon:N, dark:N, steel:H, fairy:N },
  ghost:    { normal:Z, fire:N, water:N, electric:N, grass:N, ice:N, fighting:N, poison:N, ground:N, flying:N, psychic:T, bug:N, rock:N, ghost:T, dragon:N, dark:H, steel:N, fairy:N },
  dragon:   { normal:N, fire:N, water:N, electric:N, grass:N, ice:N, fighting:N, poison:N, ground:N, flying:N, psychic:N, bug:N, rock:N, ghost:N, dragon:T, dark:N, steel:H, fairy:Z },
  dark:     { normal:N, fire:N, water:N, electric:N, grass:N, ice:N, fighting:H, poison:N, ground:N, flying:N, psychic:T, bug:N, rock:N, ghost:T, dragon:N, dark:H, steel:N, fairy:H },
  steel:    { normal:N, fire:H, water:H, electric:H, grass:N, ice:T, fighting:N, poison:N, ground:N, flying:N, psychic:N, bug:N, rock:T, ghost:N, dragon:N, dark:N, steel:H, fairy:T },
  fairy:    { normal:N, fire:H, water:N, electric:N, grass:N, ice:N, fighting:T, poison:H, ground:N, flying:N, psychic:N, bug:N, rock:N, ghost:N, dragon:T, dark:T, steel:H, fairy:N },
}

// --- Tipo SONORO (artificial, Modo Historia). No entra en la unión global de
//     tipos; se trata como caso especial. ---
export type ExtType = PokemonType | 'sonoro'

// Ataque Sonoro VS tipo defensor (lo no listado = 1×).
const SONORO_ATK: Partial<Record<ExtType, number>> = { psychic: T, ice: T, water: T, flying: H, fairy: H, steel: H, ground: Z }
// Tipo atacante VS defensor Sonoro (lo no listado = 1×).
const SONORO_DEF: Partial<Record<ExtType, number>> = { normal: T, steel: T, rock: T, flying: H, fairy: H }

/** Multiplicador de un solo tipo atacante contra un solo tipo defensor. */
function pairMult(atk: ExtType, def: ExtType): number {
  if (atk === 'sonoro') return def === 'sonoro' ? N : (SONORO_ATK[def] ?? N)
  if (def === 'sonoro') return SONORO_DEF[atk] ?? N
  return MATRIX[atk][def]
}

/** Efectividad de un movimiento de `atkType` contra un objetivo con `defTypes`. */
export function typeEffectiveness(
  atkType: ExtType,
  defTypes: ExtType[],
): number {
  let mult = 1
  for (const d of defTypes) mult *= pairMult(atkType, d)
  return mult
}

/** Texto para la UI según multiplicador combinado (6 niveles). */
export function effectivenessLabel(mult: number): string {
  if (mult === 0) return 'No afecta'
  if (mult >= 4) return '¡Megaeficaz!'
  if (mult >= 2) return '¡Supereficaz!'
  if (mult <= 0.25) return 'Muy poco eficaz'
  if (mult < 1) return 'Poco eficaz'
  return 'Eficaz'
}

/** Color asociado a cada nivel de eficacia (para la UI). */
export function effectivenessColor(mult: number): string {
  if (mult === 0) return '#64748b'
  if (mult >= 4) return '#a855f7'
  if (mult >= 2) return '#22c55e'
  if (mult <= 0.25) return '#b91c1c'
  if (mult < 1) return '#f97316'
  return '#94a3b8'
}
