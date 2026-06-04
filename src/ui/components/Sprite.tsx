import { useState } from 'react'
import { getSpecies } from '@/data'

interface SpriteProps {
  speciesId: number
  variant?: 'artwork' | 'front'
  shiny?: boolean
  className?: string
  alt?: string
}

const FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="40" fill="%23334155"/></svg>'

/** Sprite/artwork de un Pokémon con fallback si falla la carga. */
export default function Sprite({ speciesId, variant = 'artwork', shiny, className, alt }: SpriteProps) {
  const [errored, setErrored] = useState(false)
  const species = getSpecies(speciesId)
  let src = variant === 'artwork' ? species.spriteArtwork : species.spriteFront
  if (shiny && variant === 'front') {
    src = src.replace('/pokemon/', '/pokemon/shiny/')
  }
  return (
    <img
      src={errored ? FALLBACK : src}
      alt={alt ?? species.displayName}
      loading="lazy"
      onError={() => setErrored(true)}
      className={className}
      draggable={false}
    />
  )
}
