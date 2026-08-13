/**
 * Iconos del juego SIN emojis: imágenes propias (sin fondo) para los conceptos
 * Pokémon (Pokédex, trofeo, logros, Poké Ball) y SVG monocromos (currentColor)
 * para el resto. Uso: <Icon name="trophy" className="w-5 h-5" />
 */
import type { CSSProperties } from 'react'

const BASE = import.meta.env.BASE_URL

// --- Iconos por IMAGEN (PNG sin fondo) ---
const IMAGES: Record<string, string> = {
  pokedex: BASE + 'icons/pokedex.png',
  trophy: BASE + 'icons/trophy.png',
  achievement: BASE + 'icons/achievement.png',
  pokeball: BASE + 'items/pokeball.png',
  dadoballs: BASE + 'icons/dadoballs.png',
  liga: BASE + 'icons/liga.png',
  records: BASE + 'icons/records.png',
  daily: BASE + 'icons/daily.png',
}

// --- Iconos por SVG (trazo currentColor, viewBox 0 0 24 24) ---
type SvgIcon = { path: JSX.Element; fill?: boolean }
const S = (path: JSX.Element, fill = false): SvgIcon => ({ path, fill })

const SVGS: Record<string, SvgIcon> = {
  sparkle: S(<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />, true),
  star: S(<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />, true),
  bolt: S(<path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8Z" />, true),
  lock: S(<><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>),
  unlock: S(<><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 7.5-2" /></>),
  timer: S(<><circle cx="12" cy="13" r="8" /><path d="M12 13V8.5M9 2h6" /></>),
  bag: S(<><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>),
  refresh: S(<><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4" /><path d="M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4" /></>),
  check: S(<path d="M5 13l4 4L19 7" />),
  x: S(<path d="M6 6l12 12M18 6L6 18" />),
  scroll: S(<><path d="M7 4h10v13a3 3 0 0 1-3 3H7a3 3 0 0 0 3-3V4Z" /><path d="M7 20a3 3 0 0 1-3-3v-1h6" /><path d="M10 8h5M10 11h5" /></>),
  dice: S(<><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" /><circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none" /></>),
  skull: S(<><path d="M5 11a7 7 0 0 1 14 0c0 2.4-1.2 3.7-2 4.4V18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2.6C6.2 14.7 5 13.4 5 11Z" /><circle cx="9.5" cy="11" r="1.3" fill="currentColor" stroke="none" /><circle cx="14.5" cy="11" r="1.3" fill="currentColor" stroke="none" /></>),
  gem: S(<path d="M6 3h12l3 6-9 12L3 9l3-6Z M3 9h18M9 3l-3 6 6 12 6-12-3-6" />),
  gift: S(<><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M3 9h18v3H3z" /><path d="M12 9v11M9 9a2.5 2.5 0 1 1 3-3 2.5 2.5 0 1 1 3 3" /></>),
  cloud: S(<path d="M7 18a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 9.5a3.5 3.5 0 0 1 .5 6.96L7 18Z" />),
  scales: S(<path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 5a3 3 0 0 0 5 0L5 8Zm14 0l-2.5 5a3 3 0 0 0 5 0L19 8ZM12 4a1 1 0 1 0 0 0M7 8l5-2 5 2" />),
  sword: S(<path d="M14.5 3H21v6.5l-9 9-1.8-1.8M14.5 3l-11 11 4 4 11-11M3 18l-1 3 3-1M7.5 14.5l2 2" />),
  league: S(<path d="M5 18h14l1-9-5 4-3-7-3 7-5-4 1 9Z M5 18h14" />),
  party: S(<><path d="M4 20l5-12 7 7-12 5Z" /><path d="M14 4c1 1 1 2 0 3m3-1c1.5 1.5 1.5 3 0 4.5M15 13h.01M19 7h.01M20 12h.01" /></>),
  map: S(<path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Zm0 0v14m6-12v14" />),
  home: S(<path d="M4 11l8-6 8 6M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />),
  coin: S(<><circle cx="12" cy="12" r="8" /><path d="M14.5 9.3A3 3 0 0 0 9.5 11c0 2.5 5 1.5 5 4a3 3 0 0 1-5 1.7M12 7v1.5M12 15.5V17" /></>),
  chartUp: S(<path d="M4 19h16M6 16l4-5 3 3 5-7" />),
  plus: S(<path d="M12 5v14M5 12h14" />),
  people: S(<><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5.8M21 20a6 6 0 0 0-5-5.9" /></>),
  share: S(<><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></>),
  warning: S(<><path d="M12 3l9.5 17H2.5L12 3Z" /><path d="M12 9.5v5M12 17.5h.01" /></>),
  // Un ENGRANAJE con dientes de verdad: la versión anterior (círculo + ocho
  // rayos sueltos) se leía como un sol, y en ajustes despistaba.
  gear: S(<><circle cx="12" cy="12" r="3" /><path d="M10.7 3h2.6l.5 2.1a7 7 0 0 1 1.8 1l2-.8 1.3 2.2-1.5 1.6a7 7 0 0 1 0 2l1.5 1.6-1.3 2.2-2-.7a7 7 0 0 1-1.8 1l-.5 2.1h-2.6l-.5-2.1a7 7 0 0 1-1.8-1l-2 .7-1.3-2.2 1.5-1.6a7 7 0 0 1 0-2L4.4 7.5l1.3-2.2 2 .8a7 7 0 0 1 1.8-1L10.7 3Z" /></>),
  wrench: S(<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />),
  album: S(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 3v18" /><rect x="11" y="7" width="6" height="7" rx="1" /><path d="M11 17.5h6" /></>),
  clipboard: S(<><rect x="6" y="4" width="12" height="17" rx="2" /><rect x="9" y="2.5" width="6" height="3.5" rx="1" /><path d="M9 11h6M9 15h6" /></>),
  dna: S(<path d="M7 3c0 5 10 6 10 11s-10 5-10 10M17 3c0 5-10 6-10 11s10 5 10 10M8 6h8M8 18h8M9.5 9.5h5M9.5 14.5h5" />),
  target: S(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>),
  fire: S(<path d="M12 3c1 3-1 4-1 6a2 2 0 1 0 4 0c0-1 0-2-.5-3 2 1.5 3.5 4 3.5 7a6 6 0 0 1-12 0c0-2 1-3.5 2-4.5.2 1.3 1 2 1 2 0-2 2-3 3-7.5Z" />),
  heal: S(<><circle cx="12" cy="12" r="8.5" /><path d="M12 8v8M8 12h8" /></>),
  arrowRight: S(<path d="M5 12h14M13 6l6 6-6 6" />),
  fastForward: S(<path d="M5 6l7 6-7 6V6Zm8 0l7 6-7 6V6Z" />),
  play: S(<path d="M7 5l12 7-12 7V5Z" />, true),
  next: S(<path d="M6 6l8 6-8 6V6Zm10 0v12" />),
  lifebuoy: S(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /><path d="M6 6l3.6 3.6M14.4 14.4 18 18M18 6l-3.6 3.6M9.6 14.4 6 18" /></>),
  pointer: S(<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11l1-4a1.4 1.4 0 0 1 2.7.6l-.2 4.4 1.2-2a1.3 1.3 0 0 1 2.3 1.2c-.6 3-1.4 5-2.4 6.2A5 5 0 0 1 12 21a6 6 0 0 1-5.2-3l-2-3.6a1.4 1.4 0 0 1 2.3-1.5L9 11Z" />),
  calendar: S(<><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></>),
  dailycal: S(<><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9.5h16M8 3v4M16 3v4" /><path d="M12 12l.85 1.72 1.9.28-1.37 1.34.32 1.9L12 16.55l-1.7.69.32-1.9L9.25 14l1.9-.28L12 12Z" fill="currentColor" stroke="none" /></>),
  potion: S(<><path d="M10 3h4M11 3v3.5L7 14a5 5 0 0 0 10 0l-4-7.5V3" /><path d="M7.7 12.5h8.6" /></>),
  book: S(<path d="M5 4h9a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H5V4Zm0 0v14" />),
  music: S(<path d="M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />),
  vibrate: S(<><rect x="9" y="5" width="6" height="14" rx="1.5" /><path d="M5 8v8M3 10v4M19 8v8M21 10v4" /></>),
  weather: S(<><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5" /></>),
  trade: S(<path d="M5 8h11l-3-3M19 16H8l3 3" />),

  // --- Inazuma Rogue. Todo el modo va con estos: no queda un solo emoji.
  ball: S(<><circle cx="12" cy="12" r="8.5" /><path d="M12 6.5l3.2 2.3-1.2 3.8h-4l-1.2-3.8L12 6.5Z" /><path d="M12 3.5v3M4.6 9.2l2.9 2M19.4 9.2l-2.9 2M7.6 19.4l1.4-3.4M16.4 19.4L15 16" /></>),
  whistle: S(<><path d="M13 8h6a2 2 0 0 1 2 2v3a5 5 0 1 1-8-4V8Z" /><circle cx="8" cy="14" r="2" /><path d="M13 5h-2" /></>),
  boot: S(<><path d="M4 7h5l1 5 8 2a2 2 0 0 1 2 2v3H4V7Z" /><path d="M4 15h16" /></>),
  glove: S(<><path d="M7 20V10a2 2 0 0 1 4 0V6.5a1.75 1.75 0 0 1 3.5 0V10a2 2 0 0 1 4 0v5a5 5 0 0 1-5 5H7Z" /></>),
  jersey: S(<><path d="M9 4L4 6.5 6 11h2v9h8v-9h2l2-4.5L15 4a3 3 0 0 1-6 0Z" /></>),
  ramen: S(<><path d="M3.5 11h17a8.5 8.5 0 0 1-17 0Z" /><path d="M6 20h12" /><path d="M9 7.5c0-1.5 1.5-1.5 1.5-3M13 7.5c0-1.5 1.5-1.5 1.5-3" /></>),
  drink: S(<><path d="M6 4h12l-1.5 16.5h-9L6 4Z" /><path d="M6.6 10h10.8" /></>),
  cart: S(<><circle cx="9.5" cy="19" r="1.6" /><circle cx="17" cy="19" r="1.6" /><path d="M3 4h2.2l2.4 10.5h10l2-7.5H6.4" /></>),
  magnifier: S(<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>),
  question: S(<><circle cx="12" cy="12" r="9" /><path d="M9.4 9.2a2.7 2.7 0 1 1 3.6 2.5c-.7.3-1 .9-1 1.6v.4M12 17.2h.01" /></>),
  shield: S(<path d="M12 3l7.5 3v5.5c0 4.4-3.1 8.2-7.5 9.5-4.4-1.3-7.5-5.1-7.5-9.5V6L12 3Z" />),
  bench: S(<><path d="M3 10h18M4 10v8M20 10v8M7 13.5h10" /></>),
  spirit: S(<><path d="M5.5 20V11a6.5 6.5 0 0 1 13 0v9l-2.2-1.8L14.1 20l-2.1-1.8L9.9 20l-2.2-1.8L5.5 20Z" /><circle cx="9.5" cy="11" r="1.1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="11" r="1.1" fill="currentColor" stroke="none" /></>),
  leaf: S(<path d="M5 19C4 12 8 5 19 4c1 9-3 14-9 14.5-2 .2-3.5.2-5 .5Zm4-2c1.5-4 4-6.5 7-8" />),
  wind: S(<path d="M3 9h11a3 3 0 1 0-3-3M3 14h14a3 3 0 1 1-3 3M3 19h7" />),
  mountain: S(<path d="M2 19l6.5-11 4 6 2.5-3.5L22 19H2Z" />),
  medal: S(<><circle cx="12" cy="15" r="5" /><path d="M8.5 10.5L6 3h12l-2.5 7.5" /><path d="M12 13l.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8L9.4 15l1.8-.3L12 13Z" fill="currentColor" stroke="none" /></>),
  sad: S(<><circle cx="12" cy="12" r="9" /><path d="M8.5 15.5a5 5 0 0 1 7 0M9 9.5h.01M15 9.5h.01" /></>),
  tired: S(<><circle cx="12" cy="12" r="9" /><path d="M8 15.5h8M7.5 9.5l2.5 1.5M16.5 9.5L14 11" /></>),
  clock: S(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 2" /></>),
  crest: S(<><path d="M12 3l7 2.5v6c0 4-2.9 7.6-7 8.8-4.1-1.2-7-4.8-7-8.8v-6L12 3Z" /><path d="M12 8.5v6M9 11.5h6" /></>),
  sunrise: S(<><path d="M4 18h16M7.5 18a4.5 4.5 0 0 1 9 0" /><path d="M12 4v3M5.6 7.6l1.6 1.6M18.4 7.6l-1.6 1.6M2.5 13H5M19 13h2.5" /></>),
  notebook: S(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v18M12 8h4M12 12h4" /></>),
  suit: S(<><circle cx="12" cy="6" r="3" /><path d="M6 21v-4a6 6 0 0 1 12 0v4" /><path d="M9.5 9l2.5 4 2.5-4" /></>),
  goalpost: S(<><path d="M3 20V7h18v13" /><path d="M3 7h18M7 7v13M11 7v13M15 7v13M19 7v13M3 11h18M3 15h18" /></>),
  bandage: S(<><rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-20 12 12)" /><path d="M10 10.5l4 3M13 9.5l1 1M10.5 13l1 1" /></>),
  box: S(<><path d="M3 8l9-4 9 4v8l-9 4-9-4V8Z" /><path d="M3 8l9 4 9-4M12 12v8" /></>),
  storm: S(<><path d="M7 15a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 6.5a3.5 3.5 0 0 1 .8 6.9" /><path d="M13 12l-3 5h3l-1 4 4-6h-3l1-3Z" /></>),
  elder: S(<><circle cx="12" cy="6.5" r="3" /><path d="M7 21v-5a5 5 0 0 1 10 0v5M17 13l3 8" /></>),
  autograph: S(<path d="M3 17c4 0 4-8 7-8s2 6 5 6 3-4 6-4M4 21h16" />),
  dumbbell: S(<><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" /></>),
  vending: S(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 6h4v5H8zM8 14h8M15 6h1" /></>),
  target2: S(<><circle cx="12" cy="12" r="8" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /></>),
  // Acciones del duelo: tiro (balón con estela), regate (zigzag con balón).
  shoot: S(<><circle cx="16.5" cy="12" r="4.5" /><path d="M2.5 8.5h7M4.5 12h7.5M2.5 15.5h7" /></>),
  dribble: S(<><path d="M4 19l5-5-3.5-3.5L11 5" /><circle cx="15.5" cy="16.5" r="3.5" /><path d="M13 7.5h.01" /></>),
}

interface Props { name: string; className?: string; size?: number; style?: CSSProperties; title?: string }

export default function Icon({ name, className = 'w-5 h-5', size, style, title }: Props) {
  const dim = size ? { width: size, height: size } : undefined
  const img = IMAGES[name]
  if (img) {
    return <img src={img} alt={title ?? ''} title={title} className={`object-contain shrink-0 ${className}`} style={{ ...dim, ...style }} draggable={false} />
  }
  const ic = SVGS[name]
  if (!ic) return null
  return (
    <svg viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} style={{ ...dim, ...style }} aria-hidden
      fill={ic.fill ? 'currentColor' : 'none'} stroke={ic.fill ? 'none' : 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {title && <title>{title}</title>}
      {ic.path}
    </svg>
  )
}
