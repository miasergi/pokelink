// Iconografía del modo. Aquí NO hay emojis: cada concepto tiene su SVG (o su
// imagen real, en el caso de las supertécnicas).
//
// El motivo no es estético: los emojis los dibuja el sistema operativo, así que
// el mismo icono se ve distinto en cada móvil, no se puede teñir del color del
// elemento y en Windows varios salen en blanco y negro.
import { useState } from 'react'
import { create } from 'zustand'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { RARITY_COLOR, RARITY_GRADIENT } from '@/engine/inazuma/roster'
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
/**
 * MARCO de carta por rareza: gris, morado, oro y el multicolor con borde
 * degradado (truco border-box). La CARTA ENTERA cuenta la rareza; el elemento
 * queda como icono junto al nombre.
 */
export function rarityCardStyle(tier: number): React.CSSProperties {
  if (tier >= 4) {
    return {
      border: '2px solid transparent',
      background: `linear-gradient(rgba(15,23,42,0.92), rgba(15,23,42,0.92)) padding-box, ${RARITY_GRADIENT} border-box`,
    }
  }
  const c = RARITY_COLOR[Math.max(1, Math.min(3, tier))]
  return {
    border: `2px solid ${c}66`,
    background: `linear-gradient(160deg, ${c}1f, rgba(15,23,42,0.92) 60%)`,
  }
}

/** Borde suelto por rareza (para fichas pequeñas donde no cabe el marco). */
export function rarityBorder(tier: number): string {
  return tier >= 4 ? RARITY_COLOR[4] : RARITY_COLOR[Math.max(1, Math.min(3, tier))]
}

/**
 * Estilo de FICHA pequeña por rareza: bordes lisos en gris/morado/oro y el
 * MULTICOLOR con su degradado de verdad (truco padding-box/border-box, que el
 * rosita plano no era multicolor ni era nada).
 */
export function rarityChipStyle(tier: number, innerBg: string): React.CSSProperties {
  if (tier >= 4) {
    // TRES capas: el tinte pedido, una base OPACA debajo y el degradado solo
    // en el borde. Sin la base opaca, un `innerBg` translúcido dejaba ver el
    // degradado por todo el interior y la ficha entera salía teñida
    // multicolor (el «fondo de color» y el «marco desbordado» reportados).
    return {
      border: '2px solid transparent',
      background: `linear-gradient(${innerBg}, ${innerBg}) padding-box, linear-gradient(#0f172a, #0f172a) padding-box, ${RARITY_GRADIENT} border-box`,
    }
  }
  return { border: `2px solid ${rarityBorder(tier)}`, background: innerBg }
}


/**
 * BALÓN SVG PROPIO: esfera con sombreado y panales pentagonales. Sustituye al
 * PNG de Twemoji en todo lo que se ve durante el partido — nada de emojis.
 */
export function SvgBall({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <radialGradient id="svgball-sh" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18.5" fill="url(#svgball-sh)" stroke="#334155" strokeWidth="1.6" />
      <polygon points="20,12.5 27,17.5 24.4,25.5 15.6,25.5 13,17.5" fill="#1e293b" />
      <g stroke="#1e293b" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M20 12.5 L20 4.5" />
        <path d="M27 17.5 L34.5 14.5" />
        <path d="M13 17.5 L5.5 14.5" />
        <path d="M24.4 25.5 L29 33" />
        <path d="M15.6 25.5 L11 33" />
      </g>
    </svg>
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
  trade: 'node-trade',
  evento: 'node-evento',
  rairai: 'node-rairai',
  tienda: 'node-tienda',
  // La concentración reutiliza el icono del entrenamiento de firma.
  concentracion: 'node-firma2',
  // La RUEDA DE ENTRENAMIENTO hereda el icono de la pachanga retirada.
  entrenamiento: 'node-pachanga',
  jefe: 'node-jefe',
  final: 'node-final',
}

/**
 * Icono de un objeto. Se elige por lo que HACE, no por su nombre: así un objeto
 * nuevo entra con su icono correcto sin tocar nada.
 */
export function itemIconName(item: InazumaItem | undefined): string {
  if (!item) return 'bag'
  if (item.id === 'fichaje-estrella') return 'magnifier'
  if (item.id === 'medalla-rareza') return 'medal'
  if (item.id.startsWith('pocion')) return 'potion'
  if (item.id === 'elixir-equipo') return 'potion'
  if (item.id === 'bidon-inagotable') return 'drink'
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
/** Los objetos NUEVOS reutilizan el sprite DS del equivalente clásico. */
const SPRITE_ALIAS: Record<string, string> = {
  'botas-rematador': 'botas-doradas',
  'muneq-estratega': 'muneq-control',
  'espinilleras-muro': 'espinilleras',
  'guantes-guardameta': 'guantes-portero',
  'bidon-inagotable': 'bebida-doble',
  'pocion-pt': 'bebida-isotonica',
  'superpocion-pt': 'bebida-doble',
  'pocion-pt-max': 'bebida-doble',
  'pocion-aguante': 'masaje',
  'superpocion-aguante': 'masaje',
  'pocion-aguante-max': 'ramen-especial',
  'elixir-equipo': 'concentrado',
}

export function ItemIcon({ itemId, className = 'w-5 h-5' }: { itemId: string; className?: string }) {
  const item = getItem(itemId)
  const [broken, setBroken] = useState(false)
  // Los EMBLEMAS de elemento: insignia propia (escudo del color + su icono),
  // que un sprite prestado de otra cosa despistaría.
  if (item?.element && item.id.startsWith('emblema-')) {
    const info = ELEMENT_INFO[item.element]
    return (
      <span className={`${className} relative grid place-items-center shrink-0`} title={item.name}>
        <Icon name="shield" className="w-full h-full" style={{ color: info.color }} />
        <Icon name={ELEMENT_ICON[item.element]} className="absolute w-[52%] h-[52%] text-white drop-shadow" />
      </span>
    )
  }
  if (broken) {
    return <Icon name={itemIconName(item)} className={className} title={item?.name} />
  }
  return (
    <img
      src={`${BASE}inazuma/icons/item-${SPRITE_ALIAS[itemId] ?? itemId}.png`}
      alt={item?.name ?? ''}
      title={item?.name}
      draggable={false}
      // Los iconos son sprites DS reales (16-32 px): escalados con suavizado
      // se veían borrosos; pixelados conservan el look del juego original.
      className={`${className} select-none object-contain`}
      style={{ imageRendering: 'pixelated' }}
      onError={() => setBroken(true)}
    />
  )
}

/** Icono SVG de cada CLASE de acción, para acompañar técnicas y jugadas. */
export const KIND_ICON: Record<Technique['kind'], string> = {
  tiro: 'shoot',
  regate: 'dribble',
  bloqueo: 'shield',
  parada: 'glove',
}

export function KindIcon({ kind, className = 'w-3.5 h-3.5' }: {
  kind: Technique['kind']
  className?: string
}) {
  return <Icon name={KIND_ICON[kind]} className={className} title={kind} />
}

/**
 * Prefijo ESTÁNDAR de una supertécnica, para delante de su nombre en
 * cualquier lista: su CLASE (parada/bloqueo/regate/disparo) y su ELEMENTO.
 */
export function TechIcons({ tech, className = 'w-3 h-3' }: {
  tech: Technique
  className?: string
}) {
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0 align-middle">
      <KindIcon kind={tech.kind} className={`${className} text-slate-400`} />
      <ElementIcon element={tech.element} className={className} />
    </span>
  )
}

/**
 * Escudo de un instituto, para acompañar SIEMPRE a su nombre. Si el equipo no
 * tiene escudo (los extra del pool de fichajes), no pinta nada.
 */
export function Crest({ teamId, className = 'w-4 h-4' }: { teamId?: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  if (!teamId || broken) return null
  return (
    <img
      src={`${BASE}inazuma/teams/${teamId}.png`}
      alt=""
      draggable={false}
      className={`${className} select-none object-contain shrink-0`}
      onError={() => setBroken(true)}
    />
  )
}

/** Ruta de la imagen REAL de una supertécnica (la de la ficha de la wiki). */
export function techniqueImage(id: string): string {
  return `${BASE}inazuma/techniques/${id}.png`
}

/**
 * VISOR global de supertécnica: cualquier estampa clicada abre esta hoja con
 * la imagen en grande, su clase, elemento, potencia y coste (efectivos si la
 * abre su dueño, con las Mejoras aplicadas). El host vive en InazumaScreen.
 */
export interface TechHolder { techLevels?: Record<string, number> }
interface TechSheetState {
  tech: Technique | null
  holder: TechHolder | null
  open: (tech: Technique, holder?: TechHolder | null) => void
  close: () => void
}
export const useTechSheet = create<TechSheetState>((set) => ({
  tech: null,
  holder: null,
  open: (tech, holder) => set({ tech, holder: holder ?? null }),
  close: () => set({ tech: null, holder: null }),
}))

/**
 * Estampa de supertécnica: su imagen real y, si falla, el icono del elemento.
 * Se usa en la mochila, la tienda, la ficha del jugador y la animación.
 * CLICABLE por defecto: abre el visor con todos los datos (pasa `holder` para
 * que enseñe potencia y coste efectivos de ese dueño; `silent` la apaga).
 */
export function TechniqueBadge({
  tech, size = 44, className = '', holder, silent,
}: {
  tech: Technique
  size?: number
  className?: string
  holder?: TechHolder | null
  silent?: boolean
}) {
  const info = ELEMENT_INFO[tech.element]
  return (
    <span
      onClick={silent ? undefined : (e) => {
        e.stopPropagation()
        e.preventDefault()
        useTechSheet.getState().open(tech, holder)
      }}
      className={`shrink-0 grid place-items-center overflow-hidden rounded-lg border ${silent ? '' : 'cursor-pointer active:scale-95 transition'} ${className}`}
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
