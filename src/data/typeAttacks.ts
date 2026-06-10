import type { ExtType, MoveData, PokemonType } from '@/types'
import { TYPES } from './typechart'

export interface TypeAttackTier { name: string; power: number; level: number }

// Ataques ESTÁNDAR por tipo: 3 niveles de potencia (40 / 80 / 120) que el
// Pokémon mejora al subir de nivel. Sin físico/especial, sin fallo ni efectos.
// Incluye el tipo artificial «Sonoro» (Modo Historia).
export const TYPE_ATTACKS: Record<ExtType, [TypeAttackTier, TypeAttackTier, TypeAttackTier]> = {
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
  sonoro: [{ name: 'Chirrido', power: 40, level: 1 }, { name: 'Vozarrón', power: 80, level: 20 }, { name: 'Estruendo', power: 120, level: 45 }],
}

// Orden de tipos para los IDs sintéticos: los 18 oficiales + Sonoro al final
// (índice 18). NO reordenar: los IDs viven en partidas guardadas.
const ATTACK_TYPES: ExtType[] = [...TYPES, 'sonoro']

const BASE_ID = 900000

/** Nivel 4 (Movimiento Z): el máximo, potencia 160. Solo con el objeto Movimiento Z.
 *  Nivel 100 = nunca se aprende por subir de nivel. */
export const Z_MOVE = { name: 'Movimiento Z', power: 160, level: 100 } as const

/** Nombre OFICIAL del Movimiento Z de cada tipo (en vez del genérico "Movimiento Z").
 *  El de Sonoro es inventado: no existe en los juegos. */
export const Z_MOVE_NAMES: Record<ExtType, string> = {
  normal: 'Carrera Arrolladora', fire: 'Hecatombe Pírica', water: 'Hidrovórtice Abisal',
  electric: 'Gigavoltio Destructor', grass: 'Megatón Floral', ice: 'Crioaliento Despiadado',
  fighting: 'Patada Certera Final', poison: 'Lanzamiento Ácido', ground: 'Barrena Telúrica',
  flying: 'Vuelo Arrollador', psychic: 'Disruptor Psíquico', bug: 'Megavorágine',
  rock: 'Apocalipsis Pétreo', ghost: 'Visitante de Ultratumba', dragon: 'Devastación Definitiva',
  dark: 'Agujero Negro Aniquilador', steel: 'Colosal Martillo Acerado', fairy: 'Novaluz Fulminante',
  sonoro: 'Frecuencia Madre',
}

/** Cristal Z de cada tipo (sprite REAL del objeto, repo de PokeAPI). */
const Z_CRYSTAL_SLUG: Record<PokemonType, string> = {
  normal: 'normalium-z', fire: 'firium-z', water: 'waterium-z', electric: 'electrium-z',
  grass: 'grassium-z', ice: 'icium-z', fighting: 'fightinium-z', poison: 'poisonium-z',
  ground: 'groundium-z', flying: 'flyinium-z', psychic: 'psychium-z', bug: 'buginium-z',
  rock: 'rockium-z', ghost: 'ghostium-z', dragon: 'dragonium-z', dark: 'darkinium-z',
  steel: 'steelium-z', fairy: 'fairium-z',
}
export function zCrystalSprite(type: ExtType): string {
  // Sonoro no tiene cristal oficial: usa el icono propio del objeto Movimiento Z.
  if (type === 'sonoro') return `${import.meta.env.BASE_URL}items/z-move.png`
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${Z_CRYSTAL_SLUG[type]}--held.png`
}

/** Datos del ataque de un tipo en un nivel de potencia (0/1/2/3). El 3 es el Z. */
export function typeAttackTier(type: ExtType, tier: number): TypeAttackTier {
  if (tier >= 3) return { name: Z_MOVE_NAMES[type], power: Z_MOVE.power, level: Z_MOVE.level }
  return TYPE_ATTACKS[type][Math.max(0, Math.min(2, tier))]
}

/** ID sintético del ataque de un tipo en un nivel de potencia (0/1/2/3). */
export function typeAttackId(type: ExtType, tier: number): number {
  return BASE_ID + ATTACK_TYPES.indexOf(type) * 10 + Math.max(0, Math.min(3, tier))
}

/** ¿Este movimiento (por su potencia) es un Movimiento Z (nivel 4)? */
export function isZMove(power: number): boolean {
  return power >= Z_MOVE.power
}

/** Nivel de potencia (0=40, 1=80, 2=120) según el nivel del Pokémon. El Z (3) NO
 *  se obtiene por nivel: solo con el objeto Movimiento Z. */
export function tierForLevel(level: number): number {
  return level >= 45 ? 2 : level >= 20 ? 1 : 0
}

/** Nivel de potencia de un Pokémon que CAPTURAS: potencia 1 (tier 0) hasta nv.35,
 *  potencia 2 (tier 1) desde nv.36. Nunca te dan potencia 3 (tier 2) al capturar. */
export function captureTier(level: number): number {
  return level >= 36 ? 1 : 0
}

/** Construye los MoveData sintéticos para registrarlos en el catálogo (4 niveles). */
export function buildTypeMoves(): MoveData[] {
  const out: MoveData[] = []
  ATTACK_TYPES.forEach((type) => {
    for (let idx = 0; idx < 4; idx++) {
      const tier = typeAttackTier(type, idx)
      out.push({
        id: typeAttackId(type, idx),
        name: `${type}-atk-${idx}`,
        displayName: tier.name,
        type,
        category: 'physical',
        power: tier.power,
        accuracy: 100,
        pp: idx === 3 ? 12 : 24,
        priority: 0,
      })
    }
  })
  return out
}
