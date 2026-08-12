// Iconografía del modo. Aquí NO hay emojis: cada concepto tiene su SVG (o su
// imagen real, en el caso de las supertécnicas).
//
// El motivo no es estético: los emojis los dibuja el sistema operativo, así que
// el mismo icono se ve distinto en cada móvil, no se puede teñir del color del
// elemento y en Windows varios salen en blanco y negro.
import { useState } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { getItem } from '@/data/inazuma/items'
import type { Element, InazumaItem, NodeKind, Technique } from '@/engine/inazuma/types'

const BASE = import.meta.env.BASE_URL

/** Icono de cada elemento. Son los cuatro del Fūrinkazan. */
export const ELEMENT_ICON: Record<Element, string> = {
  fuego: 'fire',
  bosque: 'leaf',
  aire: 'wind',
  montana: 'mountain',
}

export function ElementIcon({ element, className = 'w-4 h-4' }: { element: Element; className?: string }) {
  const info = ELEMENT_INFO[element]
  return <Icon name={ELEMENT_ICON[element]} className={className} style={{ color: info.color }} title={info.label} />
}

/** Chip de elemento con nombre. */
export function ElementTag({ element, className = '' }: { element: Element; className?: string }) {
  const info = ELEMENT_INFO[element]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold border ${className}`}
      style={{ color: info.color, borderColor: `${info.color}66`, background: `${info.color}1a` }}
    >
      <Icon name={ELEMENT_ICON[element]} className="w-3 h-3" />
      {info.label}
    </span>
  )
}

/** Estrellas de rareza, en SVG y no con el carácter ★. */
export function Stars({ n, className = 'w-3 h-3' }: { n: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-px align-middle text-amber-300">
      {Array.from({ length: Math.max(0, n) }, (_, i) => (
        <Icon key={i} name="star" className={className} />
      ))}
    </span>
  )
}

/**
 * IMAGEN de un concepto del modo (PNG de Twemoji, bajadas por
 * `scripts/fetch-inazuma-icons.mjs`). Se usan imágenes y no SVG monocromo en
 * las casillas, los balones, los objetos y las situaciones: mismo dibujo en
 * todos los dispositivos y con color.
 */
export function Pic({ name, className = 'w-6 h-6', alt = '' }: {
  name: string
  className?: string
  alt?: string
}) {
  return (
    <img
      src={`${BASE}inazuma/icons/${name}.png`}
      alt={alt}
      draggable={false}
      className={`${className} select-none object-contain`}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
    />
  )
}

/** Imagen de cada tipo de casilla del mapa. */
export const NODE_ICON: Record<NodeKind, string> = {
  pachanga: 'node-pachanga',
  objeto: 'node-objeto',
  tecnica: 'node-tecnica',
  firma: 'node-firma2',
  ojeador: 'node-ojeador',
  evento: 'node-evento',
  rairai: 'node-rairai',
  tienda: 'node-tienda',
  jefe: 'node-jefe',
  final: 'node-final',
}

/**
 * Icono de un objeto. Se elige por lo que HACE, no por su nombre: así un objeto
 * nuevo entra con su icono correcto sin tocar nada.
 */
export function itemIconName(item: InazumaItem | undefined): string {
  if (!item) return 'bag'
  if (item.kind === 'comida') return item.id.includes('ramen') ? 'ramen' : 'drink'
  if (item.kind === 'manual') return 'book'
  if (item.kind === 'consumible') return item.id.startsWith('plan') ? 'dumbbell' : 'drink'
  // Equipo y raros: por el atributo que suben.
  switch (item.stat) {
    case 'velocidad': return 'boot'
    case 'tiro': return 'boot'
    case 'defensa': return 'glove'
    case 'fisico': return 'dumbbell'
    case 'control': return 'jersey'
    default: return 'jersey'
  }
}

/**
 * Imagen del objeto. Cada id tiene su PNG (`item-<id>.png`); si faltase, se cae
 * al SVG por familia para que nunca quede un hueco.
 */
export function ItemIcon({ itemId, className = 'w-5 h-5' }: { itemId: string; className?: string }) {
  const item = getItem(itemId)
  const [broken, setBroken] = useState(false)
  if (broken) {
    return <Icon name={itemIconName(item)} className={className} title={item?.name} />
  }
  return (
    <img
      src={`${BASE}inazuma/icons/item-${itemId}.png`}
      alt={item?.name ?? ''}
      title={item?.name}
      draggable={false}
      className={`${className} select-none object-contain`}
      onError={() => setBroken(true)}
    />
  )
}

/** Ruta de la imagen REAL de una supertécnica (la de la ficha de la wiki). */
export function techniqueImage(id: string): string {
  return `${BASE}inazuma/techniques/${id}.png`
}

/**
 * Estampa de supertécnica: su imagen real y, si falla, el icono del elemento.
 * Se usa en la mochila, la tienda, la ficha del jugador y la animación.
 */
export function TechniqueBadge({
  tech, size = 44, className = '',
}: {
  tech: Technique
  size?: number
  className?: string
}) {
  const info = ELEMENT_INFO[tech.element]
  return (
    <span
      className={`shrink-0 grid place-items-center overflow-hidden rounded-lg border ${className}`}
      style={{ width: size, height: size, borderColor: `${info.color}66`, background: `${info.color}1a` }}
    >
      <ImgFallback
        src={techniqueImage(tech.id)}
        alt={tech.name}
        className="w-full h-full object-cover"
        fallback={<Icon name={ELEMENT_ICON[tech.element]} className="w-1/2 h-1/2" style={{ color: info.color }} />}
      />
    </span>
  )
}
