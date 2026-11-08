// Piezas pequeñas compartidas por las vistas de Corsarios.
import type { ReactNode } from 'react'
import { CLASE_INFO, RAREZA_INFO } from '@/data/corsarios/piratas'
import type { Clase, Rareza } from '@/engine/corsarios/types'

export function Doblon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <circle cx="10" cy="10" r="8.5" fill="#f59e0b" stroke="#92400e" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="5.2" fill="none" stroke="#fde68a" strokeWidth="1.2" />
      <path d="M8 7.5 L12 12.5 M12 7.5 L8 12.5" stroke="#92400e" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function Perla({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <defs>
        <radialGradient id="perla-g" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f5d0fe" />
          <stop offset="100%" stopColor="#a78bfa" />
        </radialGradient>
      </defs>
      <circle cx="10" cy="10" r="8" fill="url(#perla-g)" stroke="#7c3aed" strokeWidth="1" />
    </svg>
  )
}

export function Estrellas({ n, max = 3, className = 'w-3.5 h-3.5' }: { n: number; max?: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} de ${max} estrellas`}>
      {Array.from({ length: max }, (_, k) => (
        <svg key={k} viewBox="0 0 20 20" className={className} aria-hidden>
          <path d="M10 1.5 L12.6 7 L18.5 7.6 L14 11.6 L15.3 17.6 L10 14.5 L4.7 17.6 L6 11.6 L1.5 7.6 L7.4 7 Z"
            fill={k < n ? '#fbbf24' : '#334155'} stroke={k < n ? '#b45309' : '#1e293b'} strokeWidth="1" />
        </svg>
      ))}
    </span>
  )
}

export function ClaseChip({ clase, corto }: { clase: Clase; corto?: boolean }) {
  const c = CLASE_INFO[clase]
  return (
    <span className="inline-flex items-center rounded-full px-1.5 py-[1px] text-[9.5px] font-black uppercase tracking-wide"
      style={{ background: `${c.color}26`, color: c.color }}>
      {corto ? c.nombre.slice(0, 3) : c.nombre}
    </span>
  )
}

export function RarezaChip({ rareza }: { rareza: Rareza }) {
  const r = RAREZA_INFO[rareza]
  return (
    <span className="inline-flex items-center rounded px-1.5 py-[1px] text-[9.5px] font-black uppercase tracking-wide text-slate-950"
      style={{ background: r.color }}>
      {r.nombre}
    </span>
  )
}

export function Boton({ children, onClick, disabled, tono = 'oro', className = '' }: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  tono?: 'oro' | 'perla' | 'gris' | 'rojo'
  className?: string
}) {
  const fondos = {
    oro: 'linear-gradient(180deg,#fbbf24,#d97706)',
    perla: 'linear-gradient(180deg,#e9d5ff,#a78bfa)',
    gris: 'linear-gradient(180deg,#334155,#1e293b)',
    rojo: 'linear-gradient(180deg,#f87171,#b91c1c)',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-2 text-[12.5px] font-black uppercase tracking-wide transition active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${tono === 'gris' ? 'text-slate-100' : 'text-slate-950'} ${className}`}
      style={{ background: fondos[tono], boxShadow: '0 4px 14px -6px #000a, inset 0 1px 0 #ffffff55' }}
    >
      {children}
    </button>
  )
}

export { fmt } from './fmt'

/** Triángulo de oficios en una línea (lo enseñamos en varias pantallas). */
export function Triangulo() {
  return (
    <div className="flex items-center justify-center gap-1 text-[10.5px] font-bold text-slate-400 flex-wrap">
      <ClaseChip clase="espada" /> vence a <ClaseChip clase="puno" /> vence a <ClaseChip clase="tirador" /> vence a <ClaseChip clase="espada" />
    </div>
  )
}
