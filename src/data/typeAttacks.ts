import type { MoveData, PokemonType } from '@/types'
import { TYPES } from './typechart'

export interface TypeAttackTier { name: string; power: number; level: number }

// Ataques ESTÁNDAR por tipo: 3 niveles de potencia (40 / 80 / 120) que el
// Pokémon mejora al subir de nivel. Sin físico/especial, sin fallo ni efectos.
export const TYPE_ATTACKS: Record<PokemonType, [TypeAttackTier, TypeAttackTier, TypeAttackTier]> = {
  normal: [{ name: 'Placaje', power: 40, level: 1 }, { name: 'Golpe Cuerpo', power: 80, level: 20 }, { name: 'Gigaimpacto', power: 120, level: 45 }],
  fire: [{ name: 'Ascuas', power: 40, level: 1 }, { name: 'Lanzallamas', power: 80, level: 20 }, { name: 'Sofoco', power: 120, level: 45 }],
  water: [{ name: 'Pistola Agua', power: 40, level: 1 }, { name: 'Surf', power: 80, level: 20 }, { name: 'Hidrobomba', power: 120, level: 45 }],
  electric: [{ name: 'Impactrueno', power: 40, level: 1 }, { name: 'Rayo', power: 80, level: 20 }, { name: 'Trueno', power: 120, level: 45 }],
  grass: [{ name: 'Hoja Afilada', power: 40, level: 1 }, { name: 'Energibola', power: 80, level: 20 }, { name: 'Rayo Solar', power: 120, level: 45 }],
  ice: [{ name: 'Canto Helado', power: 40, level: 1 }, { name: 'Rayo Hielo', power: 80, level: 20 }, { name: 'Ventisca', power: 120, level: 45 }],
  fighting: [{ name: 'Golpe Karate', power: 40, level: 1 }, { name: 'Tajo Cruzado', power: 80, level: 20 }, { name: 'A Bocajarro', power: 120, level: 45 }],
  poison: [{ name: 'Ácido', power: 40, level: 1 }, { name: 'Bomba Lodo', power: 80, level: 20 }, { name: 'Lanzamugre', power: 120, level: 45 }],
  ground: [{ name: 'Bofetón Lodo', power: 40, level: 1 }, { name: 'Excavar', power: 80, level: 20 }, { name: 'Terremoto', power: 120, level: 45 }],
  flying: [{ name: 'Tornado', power: 40, level: 1 }, { name: 'Aire Afilado', power: 80, level: 20 }, { name: 'Pájaro Osado', power: 120, level: 45 }],
  psychic: [{ name: 'Confusión', power: 40, level: 1 }, { name: 'Psíquico', power: 80, level: 20 }, { name: 'Premonición', power: 120, level: 45 }],
  bug: [{ name: 'Picadura', power: 40, level: 1 }, { name: 'Bomba Germen', power: 80, level: 20 }, { name: 'Megacuerno', power: 120, level: 45 }],
  rock: [{ name: 'Lanzarrocas', power: 40, level: 1 }, { name: 'Avalancha', power: 80, level: 20 }, { name: 'Roca Afilada', power: 120, level: 45 }],
  ghost: [{ name: 'Lengüetazo', power: 40, level: 1 }, { name: 'Bola Sombra', power: 80, level: 20 }, { name: 'Golpe Fantasma', power: 120, level: 45 }],
  dragon: [{ name: 'Furia Dragón', power: 40, level: 1 }, { name: 'Garra Dragón', power: 80, level: 20 }, { name: 'Enfado', power: 120, level: 45 }],
  dark: [{ name: 'Mordisco', power: 40, level: 1 }, { name: 'Pulso Umbrío', power: 80, level: 20 }, { name: 'Triturar', power: 120, level: 45 }],
  steel: [{ name: 'Garra Metal', power: 40, level: 1 }, { name: 'Cabeza de Hierro', power: 80, level: 20 }, { name: 'Foco Resplandor', power: 120, level: 45 }],
  fairy: [{ name: 'Viento Feérico', power: 40, level: 1 }, { name: 'Voz Cautivadora', power: 80, level: 20 }, { name: 'Fuerza Lunar', power: 120, level: 45 }],
}

const BASE_ID = 900000

/** ID sintético del ataque de un tipo en un nivel de potencia (0/1/2). */
export function typeAttackId(type: PokemonType, tier: number): number {
  return BASE_ID + TYPES.indexOf(type) * 10 + Math.max(0, Math.min(2, tier))
}

/** Nivel de potencia (0=40, 1=80, 2=120) según el nivel del Pokémon. */
export function tierForLevel(level: number): number {
  return level >= 45 ? 2 : level >= 20 ? 1 : 0
}

/** Construye los MoveData sintéticos para registrarlos en el catálogo. */
export function buildTypeMoves(): MoveData[] {
  const out: MoveData[] = []
  TYPES.forEach((type) => {
    TYPE_ATTACKS[type].forEach((tier, idx) => {
      out.push({
        id: typeAttackId(type, idx),
        name: `${type}-atk-${idx}`,
        displayName: tier.name,
        type,
        category: 'physical',
        power: tier.power,
        accuracy: 100,
        pp: 24,
        priority: 0,
      })
    })
  })
  return out
}
