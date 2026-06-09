import { SONORO_GRADIENT } from '@/data/story/sonoro'

/** Icono del tipo Sonoro: onda sonora (ecualizador). */
export function SonoroWave({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} fill="currentColor" stroke="none" aria-hidden>
      <rect x="2.7" y="10" width="2.6" height="4" rx="1.3" />
      <rect x="6.7" y="7" width="2.6" height="10" rx="1.3" />
      <rect x="10.7" y="3.5" width="2.6" height="17" rx="1.3" />
      <rect x="14.7" y="7" width="2.6" height="10" rx="1.3" />
      <rect x="18.7" y="10" width="2.6" height="4" rx="1.3" />
    </svg>
  )
}

/** Insignia del tipo Sonoro (degradado de varios colores). */
export default function SonoroBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-0.5 gap-1'
  return (
    <span className={`inline-flex items-center rounded-full font-bold text-white shadow-sm ${cls}`} style={{ backgroundImage: SONORO_GRADIENT }}>
      <SonoroWave className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      Sonoro
    </span>
  )
}
