import type { NodeType } from '@/engine/run/types'

interface IconProps {
  size?: number
  className?: string
}

// Todos los iconos usan currentColor para teñirse con el color del nodo.
const svg = (size: number, children: React.ReactNode, className?: string) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export function IconWildBattle({ size = 24, className }: IconProps) {
  // matojo de hierba (encuentro salvaje)
  return svg(size, (
    <>
      <path d="M12 21c0-5 0-7-3-10" fill="currentColor" fillOpacity={0.15} />
      <path d="M12 21c0-6-3-8-6-9.5C7 16 9 18 12 21Z" fill="currentColor" fillOpacity={0.25} stroke="currentColor" />
      <path d="M12 21c0-6 3-8 6-9.5C17 16 15 18 12 21Z" fill="currentColor" fillOpacity={0.25} />
      <path d="M12 21c0-7 0-9 0-12" />
    </>
  ), className)
}

export function IconTrainer({ size = 24, className }: IconProps) {
  // entrenador (gorra + cabeza/hombros)
  return svg(size, (
    <>
      <circle cx="12" cy="8" r="3.2" fill="currentColor" fillOpacity={0.2} />
      <path d="M6 10a6 6 0 0 1 12 0" />
      <path d="M5 20c1-4 4-6 7-6s6 2 7 6" fill="currentColor" fillOpacity={0.15} />
    </>
  ), className)
}

export function IconPokeball({ size = 24, className }: IconProps) {
  return svg(size, (
    <>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity={0.12} />
      <path d="M3 12h6m6 0h6" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" fillOpacity={0.3} />
    </>
  ), className)
}

export function IconItem({ size = 24, className }: IconProps) {
  // regalo / cofre
  return svg(size, (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1.5" fill="currentColor" fillOpacity={0.15} />
      <path d="M3 9h18v3H3z" fill="currentColor" fillOpacity={0.25} />
      <path d="M12 9v11M9 9a2.5 2.5 0 1 1 3-3 2.5 2.5 0 1 1 3 3" />
    </>
  ), className)
}

export function IconShop({ size = 24, className }: IconProps) {
  // bolsa de tienda (Poké Mart)
  return svg(size, (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" fill="currentColor" fillOpacity={0.15} />
      <path d="M9 8a3 3 0 0 1 6 0" />
      <path d="M9.5 13.5h5" />
    </>
  ), className)
}

export function IconEvent({ size = 24, className }: IconProps) {
  // interrogante en rombo
  return svg(size, (
    <>
      <path d="M12 3l9 9-9 9-9-9 9-9Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 10a2 2 0 1 1 3 1.7c-.8.5-1 .9-1 1.8" />
      <circle cx="12" cy="16.3" r="0.6" fill="currentColor" stroke="none" />
    </>
  ), className)
}

export function IconHeal({ size = 24, className }: IconProps) {
  // cruz de Centro Pokémon
  return svg(size, (
    <>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 7.5v9M7.5 12h9" strokeWidth={3} />
    </>
  ), className)
}

export function IconRival({ size = 24, className }: IconProps) {
  // entrenador con estrella (rival)
  return svg(size, (
    <>
      <circle cx="12" cy="8" r="3.2" fill="currentColor" fillOpacity={0.2} />
      <path d="M6 10a6 6 0 0 1 12 0" />
      <path d="M5 20c1-4 4-6 7-6s6 2 7 6" fill="currentColor" fillOpacity={0.15} />
      <path d="M12 5.2l.6 1.2 1.3.2-1 .9.2 1.3-1.1-.6-1.1.6.2-1.3-1-.9 1.3-.2.6-1.2Z" fill="currentColor" stroke="none" />
    </>
  ), className)
}

export function IconBadge({ size = 24, className }: IconProps) {
  // medalla de gimnasio (octágono con estrella)
  return svg(size, (
    <>
      <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5Z" fill="currentColor" fillOpacity={0.18} />
      <path d="M12 7.5l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3L7.7 10.6l3-.4L12 7.5Z" fill="currentColor" stroke="none" />
    </>
  ), className)
}

export function IconCrown({ size = 24, className }: IconProps) {
  // Alto Mando
  return svg(size, (
    <>
      <path d="M4 18h16l1-9-5 4-4-7-4 7-5-4 1 9Z" fill="currentColor" fillOpacity={0.2} />
      <path d="M4 18h16" strokeWidth={2.5} />
    </>
  ), className)
}

export function IconTrophy({ size = 24, className }: IconProps) {
  // Campeón
  return svg(size, (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" fill="currentColor" fillOpacity={0.2} />
      <path d="M7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3" />
      <path d="M12 13v3M9 20h6M10 20a2 2 0 0 1 4 0" />
    </>
  ), className)
}

export function IconStar({ size = 24, className }: IconProps) {
  return svg(size, (
    <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" fill="currentColor" stroke="currentColor" />
  ), className)
}

const ICONS: Record<NodeType, (p: IconProps) => JSX.Element> = {
  battle: IconWildBattle,
  trainer: IconTrainer,
  catch: IconPokeball,
  item: IconItem,
  shop: IconShop,
  event: IconEvent,
  heal: IconHeal,
  rival: IconRival,
  legendary: IconStar,
  gym: IconBadge,
  elite: IconCrown,
  champion: IconTrophy,
}

export function NodeTypeIcon({ type, size, className }: { type: NodeType; size?: number; className?: string }) {
  const Cmp = ICONS[type]
  return <Cmp size={size} className={className} />
}

export function IconCheck({ size = 24, className }: IconProps) {
  return svg(size, <path d="M5 13l4 4L19 7" strokeWidth={3} />, className)
}
