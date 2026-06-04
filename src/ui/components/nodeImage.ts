import type { MapNode } from '@/engine/run/types'
import { tryGetItem } from '@/data/items'

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'
const pokemonSprite = (id: number) => `${SPRITES}/pokemon/${id}.png`
const itemSprite = (slug: string) => `${SPRITES}/items/${slug}.png`
export const badgeSprite = (n: number) => `${SPRITES}/badges/${n}.png`

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
      return { url: c.kind === 'wild' ? pokemonSprite(c.enemy.speciesId) : itemSprite('poke-ball'), pixel: true }
    case 'trainer':
    case 'rival':
    case 'elite':
    case 'champion':
    case 'gym': {
      // Retrato del entrenador/líder/rival
      const sprite = c.kind === 'trainer' ? c.trainer.sprite : undefined
      if (sprite) return { url: sprite, pixel: true }
      const ace = c.kind === 'trainer' && c.team.length ? c.team[c.team.length - 1].speciesId : null
      return { url: ace ? pokemonSprite(ace) : itemSprite('poke-ball'), pixel: true }
    }
    case 'catch':
      return { url: itemSprite('poke-ball'), pixel: true }
    case 'item': {
      const id = c.kind === 'item' ? c.choices[0] : undefined
      const sprite = id ? tryGetItem(id)?.sprite : undefined
      return { url: sprite ?? itemSprite('parcel'), pixel: true }
    }
    case 'shop':
      return { url: itemSprite('amulet-coin'), pixel: true }
    case 'heal':
      return { url: itemSprite('potion'), pixel: true }
    case 'event':
      return { url: itemSprite('parcel'), pixel: true }
    default:
      return { url: itemSprite('poke-ball'), pixel: true }
  }
}
