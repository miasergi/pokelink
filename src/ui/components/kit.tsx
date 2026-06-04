import type { ReactNode } from 'react'
import { play } from '@/utils/sfx'

export function Button({
  children, onClick, variant = 'primary', disabled, className = '', full,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  disabled?: boolean
  className?: string
  full?: boolean
}) {
  const handle = onClick
    ? () => {
        play('select')
        onClick()
      }
    : undefined
  const base =
    'select-none rounded-xl font-bold px-4 py-3 text-sm transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100'
  const variants: Record<string, string> = {
    primary: 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-400',
    secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
    success: 'bg-emerald-500 text-white hover:bg-emerald-400',
  }
  return (
    <button
      onClick={handle}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col flex-1 min-h-0 ${className}`}>{children}</div>
  )
}

export function TopBar({
  title, left, right,
}: {
  title?: ReactNode
  left?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="safe-top sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center justify-between px-3 h-12">
        <div className="w-1/4 flex justify-start">{left}</div>
        <div className="flex-1 text-center font-extrabold tracking-wide truncate">{title}</div>
        <div className="w-1/4 flex justify-end">{right}</div>
      </div>
    </div>
  )
}

export function Card({ children, className = '', onClick, style }: {
  children: ReactNode
  className?: string
  onClick?: () => void
  style?: React.CSSProperties
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-2xl bg-slate-800/70 border border-slate-700/60 ${onClick ? 'active:scale-[0.98] transition cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function money(n: number): string {
  return `${n.toLocaleString('es-ES')} ₽`
}
