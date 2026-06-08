import type { MapNode } from '@/engine/run/types'

// Imágenes pixel-art propias (generadas en public/tiles), respetan el base URL.
const TILES = import.meta.env.BASE_URL + 'tiles/'
const POKECENTER = TILES + 'pokecenter.png'
const POKEMART = TILES + 'pokemart.png'
const TALLGRASS = TILES + 'tallgrass.png'
const TRADE = TILES + 'trade.png'
const EVENT = TILES + 'event.png'
const ITEM = TILES + 'item.png'

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'
export const pokemonSprite = (id: number) => `${SPRITES}/pokemon/${id}.png`
export const badgeSprite = (n: number) => `${SPRITES}/badges/${n}.png`
// Poké Ball propia (local), usada en capturas y como fallback de retrato.
export const POKEBALL = import.meta.env.BASE_URL + 'items/pokeball.png'

/** Sprite del Pokémon estrella de un nodo de entrenador (fallback de retrato). */
export function aceSprite(node: MapNode): string {
  const c = node.content
  if (c.kind === 'trainer' && c.team.length) {
    const ace = c.team.reduce((a, b) => (b.level >= a.level ? b : a))
    return pokemonSprite(ace.speciesId)
  }
  return POKEBALL
}

export interface NodeImage {
  url: string
  /** sprite pixelado (Pokémon/objeto/medalla) -> render nítido escalado. */
  pixel: boolean
}

/** Imagen real que representa una casilla, estilo pokelike. */
export function nodeImage(node: MapNode): NodeImage {
  const c = node.content
  switch (node.type) {
    case 'battle':
      // Salvaje: solo se ve hierba alta; el Pokémon se revela al entrar.
      return { url: TALLGRASS, pixel: false }
    case 'legendary':
      return { url: c.kind === 'wild' ? pokemonSprite(c.enemy.speciesId) : POKEBALL, pixel: true }
    case 'trainer':
    case 'rival':
    case 'elite':
    case 'champion':
    case 'gym': {
      // Retrato del entrenador/líder/rival
      const sprite = c.kind === 'trainer' ? c.trainer.sprite : undefined
      if (sprite) return { url: sprite, pixel: true }
      const ace = c.kind === 'trainer' && c.team.length ? c.team[c.team.length - 1].speciesId : null
      return { url: ace ? pokemonSprite(ace) : POKEBALL, pixel: true }
    }
    case 'catch':
      return { url: POKEBALL, pixel: true }
    case 'item':
      // Casilla de objeto: Chapa Dorada (imagen propia).
      return { url: ITEM, pixel: false }
    case 'shop':
      return { url: POKEMART, pixel: true }
    case 'trade':
      return { url: TRADE, pixel: false }
    case 'heal':
      return { url: POKECENTER, pixel: true }
    case 'event':
      return { url: EVENT, pixel: false }
    default:
      return { url: POKEBALL, pixel: true }
  }
}
