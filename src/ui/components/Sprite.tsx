import { useEffect, useState } from 'react'
import { getSpecies, toBaseSpeciesId } from '@/data'

interface SpriteProps {
  speciesId: number
  variant?: 'artwork' | 'front'
  shiny?: boolean
  className?: string
  alt?: string
}

const FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="40" fill="%23334155"/></svg>'

const shinyArt = (u: string) => u.replace('/official-artwork/', '/official-artwork/shiny/')
const shinyFront = (u: string) => u.replace('/pokemon/', '/pokemon/shiny/')

/** Cadena de URLs candidatas para una especie: variante preferida → otra
 *  variante → especie BASE (megas/formas sin sprite propio en PokeAPI caen aquí
 *  en vez de mostrar un círculo gris). */
function candidates(speciesId: number, variant: 'artwork' | 'front', shiny?: boolean): string[] {
  const out: string[] = []
  const add = (u?: string) => { if (u && !out.includes(u)) out.push(u) }
  const sp = getSpecies(speciesId)
  if (shiny) add(variant === 'artwork' ? shinyArt(sp.spriteArtwork) : shinyFront(sp.spriteFront))
  add(variant === 'artwork' ? sp.spriteArtwork : sp.spriteFront)
  add(variant === 'artwork' ? sp.spriteFront : sp.spriteArtwork)
  // Respaldo a la especie base (Mega Magearna, formas raras… sin sprite propio).
  const baseId = toBaseSpeciesId(speciesId)
  if (baseId !== speciesId) {
    const base = getSpecies(baseId)
    if (shiny) add(variant === 'artwork' ? shinyArt(base.spriteArtwork) : shinyFront(base.spriteFront))
    add(variant === 'artwork' ? base.spriteArtwork : base.spriteFront)
    add(base.spriteArtwork)
    add(base.spriteFront)
  }
  return out
}

/** Sprite/artwork de un Pokémon con fallback en cadena si falla la carga. */
export default function Sprite({ speciesId, variant = 'artwork', shiny, className, alt }: SpriteProps) {
  const urls = candidates(speciesId, variant, shiny)
  const [idx, setIdx] = useState(0)
  // Reinicia la cadena al cambiar de Pokémon (p. ej. megaevolución en combate).
  useEffect(() => { setIdx(0) }, [speciesId, variant, shiny])
  const species = getSpecies(speciesId)
  return (
    <img
      src={urls[idx] ?? FALLBACK}
      alt={alt ?? species.displayName}
      loading="lazy"
      onError={() => setIdx((i) => (i + 1 <= urls.length ? i + 1 : i))}
      className={className}
      draggable={false}
    />
  )
}
