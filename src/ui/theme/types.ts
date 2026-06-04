import type { PokemonType } from '@/types'

export const TYPE_ES: Record<PokemonType, string> = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico',
  grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno',
  ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
  rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro',
  steel: 'Acero', fairy: 'Hada',
}

export const TYPE_HEX: Record<PokemonType, string> = {
  normal: '#9099a1', fire: '#ff9d55', water: '#4d90d5', electric: '#f4d23c',
  grass: '#63bc5a', ice: '#73cec0', fighting: '#ce4069', poison: '#ab6ac8',
  ground: '#d97746', flying: '#8fa8dd', psychic: '#fa7179', bug: '#90c12c',
  rock: '#c7b78b', ghost: '#5269ac', dragon: '#0b6dc3', dark: '#5a5366',
  steel: '#5a8ea1', fairy: '#ec8fe6',
}

/** Gradiente para tarjetas según tipo(s). */
export function typeGradient(types: PokemonType[]): string {
  const a = TYPE_HEX[types[0]]
  const b = TYPE_HEX[types[1] ?? types[0]]
  return `linear-gradient(135deg, ${a}, ${b})`
}

export const STAT_ES: Record<string, string> = {
  hp: 'PS', atk: 'Ataque', def: 'Defensa', spa: 'At. Esp.', spd: 'Def. Esp.', spe: 'Velocidad',
}
