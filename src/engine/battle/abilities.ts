import type { ExtType, PokemonType } from '@/types'

export type Weather = 'none' | 'sun' | 'rain' | 'sand' | 'snow'

export const WEATHER_ES: Record<Weather, string> = {
  none: '', sun: 'Sol intenso', rain: 'Lluvia', sand: 'Tormenta de arena', snow: 'Nieve',
}
export const WEATHER_ICON: Record<Weather, string> = {
  none: '', sun: '☀️', rain: '🌧️', sand: '🌪️', snow: '❄️',
}

/** Nombres en español de las habilidades implementadas (resto: slug formateado). */
export const ABILITY_ES: Record<string, string> = {
  blaze: 'Mar Llamas', torrent: 'Torrente', overgrow: 'Espesura', swarm: 'Enjambre',
  intimidate: 'Intimidación', levitate: 'Levitación', sturdy: 'Robustez',
  'flash-fire': 'Absorbe Fuego', 'water-absorb': 'Absorbe Agua', 'dry-skin': 'Piel Seca',
  'volt-absorb': 'Absorbe Elec.', 'lightning-rod': 'Pararrayos', 'storm-drain': 'Colector',
  'sap-sipper': 'Herbívoro', 'motor-drive': 'Electromotor', 'thick-fat': 'Sebo',
  multiscale: 'Coraza Multi', 'huge-power': 'Potencia', 'pure-power': 'Energía Pura',
  guts: 'Agallas', hustle: 'Entusiasmo', technician: 'Experto', 'tough-claws': 'Garra Dura',
  adaptability: 'Adaptable', 'speed-boost': 'Impulso', 'magic-guard': 'Muro Mágico',
  drought: 'Sequía', drizzle: 'Llovizna', 'sand-stream': 'Chorro Arena', 'snow-warning': 'Nevada',
  'wonder-guard': 'Superguarda', chlorophyll: 'Clorofila', 'swift-swim': 'Nado Rápido',
  'sand-rush': 'Ímpetu Arena', 'slush-rush': 'Quitanieves', 'solar-power': 'Poder Solar',
  'rain-dish': 'Cura Lluvia', 'ice-body': 'Gélido', filter: 'Filtro', 'solid-rock': 'Roca Sólida',
  'prism-armor': 'Coraza Prisma', 'marvel-scale': 'Escama Especial', 'sand-veil': 'Velo Arena',
  'orichalcum-pulse': 'Pulso Oricalco', 'protosynthesis': 'Protosíntesis',
}

export function abilityName(slug: string): string {
  if (ABILITY_ES[slug]) return ABILITY_ES[slug]
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** Habilidad -> clima que invoca al entrar en combate. */
export const WEATHER_ABILITY: Record<string, Weather> = {
  drought: 'sun', 'orichalcum-pulse': 'sun', drizzle: 'rain',
  'sand-stream': 'sand', 'snow-warning': 'snow',
}

/** Inmunidades por habilidad: tipo absorbido + curación/boost opcional. */
export interface AbsorbInfo {
  type: PokemonType
  heal?: number // fracción de PS máx
  boost?: { stat: 'atk' | 'spa' | 'spe'; stages: number }
}
export const ABSORB: Record<string, AbsorbInfo> = {
  levitate: { type: 'ground' },
  'flash-fire': { type: 'fire' },
  'water-absorb': { type: 'water', heal: 0.25 },
  'dry-skin': { type: 'water', heal: 0.25 },
  'volt-absorb': { type: 'electric', heal: 0.25 },
  'lightning-rod': { type: 'electric', boost: { stat: 'spa', stages: 1 } },
  'storm-drain': { type: 'water', boost: { stat: 'spa', stages: 1 } },
  'motor-drive': { type: 'electric', boost: { stat: 'spe', stages: 1 } },
  'sap-sipper': { type: 'grass', boost: { stat: 'atk', stages: 1 } },
}

/** Pinch (HP < 1/3) -> potencia x1.5 al tipo correspondiente. */
export const PINCH: Record<string, PokemonType> = {
  blaze: 'fire', torrent: 'water', overgrow: 'grass', swarm: 'bug',
}

/** Multiplicador de velocidad por clima. */
export function weatherSpeedMult(ability: string, weather: Weather): number {
  if (weather === 'sun' && ability === 'chlorophyll') return 2
  if (weather === 'rain' && ability === 'swift-swim') return 2
  if (weather === 'sand' && ability === 'sand-rush') return 2
  if (weather === 'snow' && ability === 'slush-rush') return 2
  return 1
}

/** Clima -> multiplicador de daño por tipo de movimiento. */
export function weatherDamageMult(weather: Weather, moveType: ExtType): number {
  if (weather === 'sun') return moveType === 'fire' ? 1.5 : moveType === 'water' ? 0.5 : 1
  if (weather === 'rain') return moveType === 'water' ? 1.5 : moveType === 'fire' ? 0.5 : 1
  return 1
}
