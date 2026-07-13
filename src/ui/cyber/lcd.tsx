// Kit retro del LCD de la Cyber PokéBall: textos, botones táctiles, barra de
// PS y sprite pixelado. Todo en verde-fósforo sobre el panel oscuro del shell.
import type { ReactNode } from 'react'
import Sprite from '@/ui/components/Sprite'
import { play } from '@/utils/sfx'
import { STATUS_SHORT } from '@/engine/battle/status'
import type { PokemonInstance } from '@/types'

export function LcdTitle({ children }: { children: ReactNode }) {
  return <div className="text-[11px] text-emerald-300 text-center leading-relaxed tracking-tight">{children}</div>
}

export function LcdText({ children, dim, center, className = '' }: {
  children: ReactNode; dim?: boolean; center?: boolean; className?: string
}) {
  return (
    <div className={`text-[9px] leading-relaxed ${dim ? 'text-emerald-500/70' : 'text-emerald-200'} ${center ? 'text-center' : ''} ${className}`}>
      {children}
    </div>
  )
}

/** Elemento de menú/acción tocable dentro del LCD. */
export function LcdButton({ children, onClick, active, disabled, className = '' }: {
  children: ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean; className?: string
}) {
  return (
    <button
      onClick={onClick ? () => { play('select'); onClick() } : undefined}
      disabled={disabled}
      className={`text-left text-[9px] leading-relaxed px-2 py-1.5 rounded border transition active:scale-[0.98] disabled:opacity-40 ${
        active
          ? 'border-emerald-300 bg-emerald-400/20 text-emerald-100'
          : 'border-emerald-800/60 bg-emerald-900/20 text-emerald-300'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function LcdHpBar({ mon, label }: { mon: PokemonInstance; label?: string }) {
  const pct = Math.max(0, Math.min(1, mon.currentHp / Math.max(1, mon.stats.hp)))
  const color = pct > 0.5 ? 'bg-emerald-400' : pct > 0.2 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="w-full">
      {label && <div className="text-[8px] text-emerald-300 mb-0.5 flex justify-between"><span>{label}</span><span>Nv.{mon.level}</span></div>}
      <div className="h-2 rounded-sm bg-emerald-950 border border-emerald-800 overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="text-[7px] text-emerald-500 text-right mt-0.5">{mon.currentHp}/{mon.stats.hp}{mon.status !== 'none' ? ` · ${STATUS_SHORT[mon.status]}` : ''}</div>
    </div>
  )
}

/** Sprite a color dentro del LCD (estética híbrida), con render pixelado. */
export function LcdSprite({ speciesId, shiny, size = 'md', flip, className = '' }: {
  speciesId: number; shiny?: boolean; size?: 'sm' | 'md' | 'lg'; flip?: boolean; className?: string
}) {
  const px = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-24 h-24' : 'w-16 h-16'
  return (
    <div className={`${px} ${className}`} style={{ imageRendering: 'pixelated', transform: flip ? 'scaleX(-1)' : undefined }}>
      <Sprite speciesId={speciesId} variant="front" shiny={shiny} className="w-full h-full object-contain" />
    </div>
  )
}
