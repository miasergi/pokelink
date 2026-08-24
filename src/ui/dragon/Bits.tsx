// Piezas comunes del modo Dragon Ball: cartas de luchador, barras y el
// scouter. Los retratos los baja `npm run fetch-dragon`, pero SIEMPRE hay
// caída a una carta con las iniciales sobre el color del personaje — igual que
// en Inazuma, el modo se juega entero aunque no se haya descargado nada.
import { useState } from 'react'
import { getSaga } from '@/data/dragon/sagas'
import { getForm } from '@/data/dragon/transformations'
import { combatantPL, effStats, fighterMaxHp, fighterPL, formatPL } from '@/engine/dragon/roster'
import type { Combatant, Fighter } from '@/engine/dragon/types'

/** Degradado de fondo por escenario. Cada saga tiene el suyo. */
export const SCENES: Record<string, string> = {
  yermo: 'radial-gradient(90% 60% at 70% 8%, #fb923c22, transparent 60%), linear-gradient(#1c1917, #0b1220)',
  namek: 'radial-gradient(90% 60% at 30% 8%, #22d3ee2b, transparent 60%), linear-gradient(#052e2b, #0b1220)',
  ciudad: 'radial-gradient(90% 60% at 60% 8%, #38bdf824, transparent 60%), linear-gradient(#0f172a, #0b1220)',
  templo: 'radial-gradient(90% 60% at 40% 8%, #f472b625, transparent 60%), linear-gradient(#2e1065, #0b1220)',
}

export function sceneBg(scene: string): string {
  return SCENES[scene] ?? SCENES.yermo
}

/**
 * Retrato del luchador. Los baja `npm run fetch-dragon` a public/dragon/
 * fighters/<baseId>.png. Si falta uno, `Avatar` cae a la carta de iniciales y
 * no se rompe nada — por eso el modo se puede jugar entero sin descargar nada.
 */
export function portraitUrl(baseId: string): string {
  return `${import.meta.env.BASE_URL}dragon/fighters/${baseId}.png`
}

/** Inicial(es) del nombre, para la carta sin retrato. */
export function initials(name: string): string {
  const parts = name.replace(/[()]/g, '').split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, color, size = 44, form, baseId }: {
  name: string
  color: string
  size?: number
  form?: string
  /** Con esto se pinta el retrato; sin él, las iniciales. */
  baseId?: string
}) {
  const [roto, setRoto] = useState(false)
  const conRetrato = !!baseId && !roto
  return (
    <div
      className="relative grid place-items-center rounded-xl font-black shrink-0 overflow-hidden"
      style={{
        width: size, height: size,
        background: `linear-gradient(150deg, ${color}, ${color}66)`,
        color: '#0b1220',
        fontSize: size * 0.36,
        // El aura de la transformación se ve DESDE FUERA de la carta: es la
        // señal de que algo ha cambiado, y tiene que leerse de un vistazo.
        boxShadow: form ? `0 0 0 2px #fde047, 0 0 18px 2px ${color}` : `0 0 0 1px #ffffff1a`,
      }}
    >
      {conRetrato ? (
        <img
          src={portraitUrl(baseId)}
          alt={name}
          loading="lazy"
          onError={() => setRoto(true)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        initials(name)
      )}
    </div>
  )
}

/** Ficha diminuta para el banquillo rival de una emboscada. */
export function MiniFighter({ c }: { c: Combatant }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900/70 pl-1 pr-1.5 py-0.5">
      <Avatar name={c.name} color={c.color} size={18} baseId={c.baseId} />
      <span className="text-[9px] text-slate-400 tabular-nums">{Math.round(c.hp)}</span>
    </span>
  )
}

export function Bar({ value, max, color, height = 8, label }: {
  value: number
  max: number
  color: string
  height?: number
  label?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
          <span>{label}</span>
          <span className="tabular-nums">{Math.max(0, Math.round(value))}/{Math.round(max)}</span>
        </div>
      )}
      <div className="w-full rounded-full bg-slate-800 overflow-hidden" style={{ height }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

/** Color de la barra de PS: verde → ámbar → rojo. Se lee sin leer números. */
export function hpColor(frac: number): string {
  if (frac > 0.5) return 'linear-gradient(90deg,#22c55e,#4ade80)'
  if (frac > 0.22) return 'linear-gradient(90deg,#f59e0b,#fbbf24)'
  return 'linear-gradient(90deg,#dc2626,#f87171)'
}

export const KI_COLOR = 'linear-gradient(90deg,#0ea5e9,#7dd3fc)'

/**
 * El scouter. El número es cosmético (ver `powerLevel`) pero es la lectura
 * emocional del juego: cuando pasa de 9.000 el aparato echa humo.
 */
export function Scouter({ pl, compact }: { pl: number; compact?: boolean }) {
  const revienta = pl > 9000
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono tabular-nums ${compact ? 'text-[10px] px-1' : 'text-xs px-1.5 py-0.5'}`}
      style={{
        background: revienta ? '#7f1d1d' : '#0f172a',
        color: revienta ? '#fca5a5' : '#7dd3fc',
        boxShadow: `inset 0 0 0 1px ${revienta ? '#dc2626' : '#1e40af'}`,
      }}
      title={revienta ? '¡El scouter no da para más!' : 'Nivel de combate'}
    >
      {formatPL(pl)}
    </span>
  )
}

/** Ficha de un luchador del equipo, fuera del combate. */
export function FighterRow({ f, saga, onClick, selected, right }: {
  f: Fighter
  saga: number
  onClick?: () => void
  selected?: boolean
  right?: React.ReactNode
}) {
  const max = fighterMaxHp(f)
  const ko = f.hp <= 0
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center gap-2.5 rounded-xl p-2 text-left transition-colors ${
        selected ? 'bg-slate-700/70' : 'bg-slate-800/60'
      } ${onClick ? 'active:bg-slate-700' : ''} ${ko ? 'opacity-45' : ''}`}
      style={{ boxShadow: selected ? `inset 0 0 0 1.5px ${f.color}` : undefined }}
    >
      <Avatar name={f.name} color={f.color} size={40} baseId={f.baseId} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-sm truncate">{f.name}</span>
          <span className="text-[10px] text-slate-400 shrink-0">Nv.{f.level}</span>
          {f.zenkai > 1 && (
            <span className="text-[9px] text-orange-300 shrink-0" title="Zenkai acumulado">
              ×{f.zenkai.toFixed(2)}
            </span>
          )}
        </div>
        <div className="mt-1">
          <Bar value={f.hp} max={max} color={hpColor(f.hp / max)} height={6} />
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Scouter pl={fighterPL(f, getSaga(saga).plScale)} compact />
          {ko && <span className="text-[10px] text-red-400">Fuera de combate</span>}
          {!!f.forms.length && (
            <span className="text-[9px] text-amber-300 truncate">
              {f.forms.map((id) => getForm(id)?.name).filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </div>
      {right}
    </button>
  )
}

/** Panel de un combatiente durante el combate. */
export function CombatantPanel({ c, saga, enemy }: { c: Combatant; saga: number; enemy?: boolean }) {
  const form = c.form ? getForm(c.form) : undefined
  const s = effStats(c)
  return (
    <div className={`flex items-center gap-2.5 ${enemy ? 'flex-row-reverse text-right' : ''}`}>
      <Avatar name={c.name} color={c.color} size={52} form={c.form} baseId={c.baseId} />
      <div className="flex-1 min-w-0">
        <div className={`flex items-center gap-1.5 min-w-0 ${enemy ? 'justify-end' : ''}`}>
          <span className="font-bold text-sm truncate">{c.name}</span>
          <span className="text-[10px] text-slate-400 shrink-0">Nv.{c.level}</span>
        </div>
        {form && (
          <div className="text-[11px] font-semibold text-amber-300 truncate">{form.name}</div>
        )}
        <div className="mt-1 space-y-1">
          <Bar value={c.hp} max={c.hpMax} color={hpColor(c.hp / c.hpMax)} height={7} />
          <Bar value={c.ki} max={c.kiMax} color={KI_COLOR} height={5} />
        </div>
        <div className={`flex items-center gap-1.5 mt-1 ${enemy ? 'justify-end' : ''}`}>
          <Scouter pl={combatantPL(c, getSaga(saga).plScale)} compact />
          <span className="text-[10px] text-slate-500 tabular-nums">
            {Math.max(0, Math.round(c.hp))} PS · {Math.round(c.ki)} ki
          </span>
          {c.guarding && <span className="text-[10px] text-sky-300">En guardia</span>}
          {c.exposed && <span className="text-[10px] text-red-300">Descubierto</span>}
          {c.stunned && <span className="text-[10px] text-yellow-300">Aturdido</span>}
        </div>
        <div className="sr-only">{s.poder}</div>
      </div>
    </div>
  )
}

/** Cabecera común: título a la izquierda y lo que haga falta a la derecha. */
export function Header({ title, sub, onBack, right }: {
  title: string
  sub?: string
  onBack?: () => void
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 shrink-0">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 grid place-items-center rounded-lg bg-slate-800 active:bg-slate-700 text-slate-300"
          aria-label="Volver"
        >
          ‹
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{title}</div>
        {sub && <div className="text-[11px] text-slate-400 truncate">{sub}</div>}
      </div>
      {right}
    </div>
  )
}
