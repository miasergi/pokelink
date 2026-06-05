import type { MapNode } from '@/engine/run/types'
import { tryGetItem } from '@/data/items'

const svgUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`

// Centro Pokémon (tejado rojo + cruz) y Poké Mart (tejado azul + toldo).
const POKECENTER = svgUri(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
    <rect x='4.5' y='10.5' width='15' height='9.5' rx='1' fill='#f8fafc'/>
    <path d='M3 11 L12 4 L21 11 Z' fill='#ef4444'/>
    <rect x='10' y='6' width='4' height='4' rx='0.6' fill='#fff'/>
    <path d='M11.4 6.6h1.2v1.2h1.2v1.2h-1.2v1.2h-1.2v-1.2h-1.2v-1.2h1.2z' fill='#ef4444'/>
    <rect x='10.6' y='14.5' width='2.8' height='5.5' rx='0.4' fill='#94a3b8'/>
    <rect x='6' y='13' width='2.6' height='2.6' rx='0.3' fill='#7dd3fc'/>
    <rect x='15.4' y='13' width='2.6' height='2.6' rx='0.3' fill='#7dd3fc'/>
  </svg>`,
)
const POKEMART = svgUri(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
    <rect x='4.5' y='10.5' width='15' height='9.5' rx='1' fill='#eef2f7'/>
    <path d='M3 11 L12 4 L21 11 Z' fill='#2563eb'/>
    <g fill='#3b82f6'><rect x='5' y='11' width='14' height='2.6'/></g>
    <g fill='#bfdbfe'><rect x='5' y='11' width='2.8' height='2.6'/><rect x='10.6' y='11' width='2.8' height='2.6'/><rect x='16.2' y='11' width='2.8' height='2.6'/></g>
    <circle cx='12' cy='7' r='1.3' fill='#fff'/>
    <rect x='10.6' y='14.8' width='2.8' height='5.2' rx='0.4' fill='#93c5fd'/>
    <rect x='6.2' y='15' width='2.4' height='2.4' rx='0.3' fill='#60a5fa'/>
    <rect x='15.4' y='15' width='2.4' height='2.4' rx='0.3' fill='#60a5fa'/>
  </svg>`,
)

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'
export const pokemonSprite = (id: number) => `${SPRITES}/pokemon/${id}.png`
const itemSprite = (slug: string) => `${SPRITES}/items/${slug}.png`
export const badgeSprite = (n: number) => `${SPRITES}/badges/${n}.png`

/** Sprite del Pokémon estrella de un nodo de entrenador (fallback de retrato). */
export function aceSprite(node: MapNode): string {
  const c = node.content
  if (c.kind === 'trainer' && c.team.length) {
    const ace = c.team.reduce((a, b) => (b.level >= a.level ? b : a))
    return pokemonSprite(ace.speciesId)
  }
  return itemSprite('poke-ball')
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
    case 'legendary':
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
      return { url: POKEMART, pixel: false }
    case 'heal':
      return { url: POKECENTER, pixel: false }
    case 'event':
      return { url: itemSprite('parcel'), pixel: true }
    default:
      return { url: itemSprite('poke-ball'), pixel: true }
  }
}
