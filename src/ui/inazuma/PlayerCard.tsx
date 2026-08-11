// Carta de jugador, estilo cromo deportivo.
//
// El retrato es OPCIONAL: si `public/inazuma/players/<id>.png` existe se pinta,
// y si no (o si falla la descarga) se cae a un bloque con las iniciales sobre el
// color del elemento. La carta se ve completa y coherente en ambos casos, así
// que el juego nunca depende de que el arte esté ahí.
//
// Los retratos los baja `npm run fetch-inazuma` de la wiki de Fandom. Van en
// PNG y no en webp a propósito: sin `sharp` instalado no hay forma de
// convertirlos, y un PNG con extensión .webp NO se decodifica (GitHub Pages
// sirve el Content-Type por extensión).
import { ImgFallback } from '@/ui/components/kit'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { effectiveStats, overall, ptMax } from '@/engine/inazuma/roster'
import { getPlayerBase } from '@/data/inazuma/players'
import { getTechnique } from '@/data/inazuma/techniques'
import { getItem } from '@/data/inazuma/items'
import type { Element, PlayerInstance, Position, Stats } from '@/engine/inazuma/types'

const BASE = import.meta.env.BASE_URL

export function portraitUrl(baseId: string): string {
  return `${BASE}inazuma/players/${baseId}.png`
}

const POSITION_COLOR: Record<Position, string> = {
  POR: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  DEF: 'bg-sky-500/20 text-sky-200 border-sky-500/40',
  MED: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  DEL: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
}

/** Iniciales para el retrato de reserva. */
function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export function ElementChip({ element, className = '' }: { element: Element; className?: string }) {
  const info = ELEMENT_INFO[element]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold border ${className}`}
      style={{ color: info.color, borderColor: `${info.color}66`, background: `${info.color}1a` }}
    >
      {info.glyph} {info.label}
    </span>
  )
}

/** Barra fina de recurso (PT, aguante). */
export function Meter({ value, max, color, label }: { value: number; max: number; color: string; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[9px] uppercase tracking-wide text-slate-500 w-7 shrink-0">{label}</span>}
      <div className="flex-1 h-1.5 rounded-full bg-slate-700/70 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[9px] tabular-nums text-slate-400 w-9 text-right shrink-0">{Math.round(value)}</span>
    </div>
  )
}

/** Color del aguante: verde → ámbar → rojo, con el mismo corte que el motor. */
export function staminaColor(stamina: number): string {
  if (stamina >= 60) return '#22c55e'
  if (stamina >= 40) return '#eab308'
  if (stamina >= 20) return '#f97316'
  return '#ef4444'
}

export function PlayerCard({
  player, onClick, selected, compact, footer,
}: {
  player: PlayerInstance
  onClick?: () => void
  selected?: boolean
  compact?: boolean
  footer?: React.ReactNode
}) {
  const base = getPlayerBase(player.baseId)
  const info = ELEMENT_INFO[base.element]
  const stats = effectiveStats(player)
  const max = ptMax(player)

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border overflow-hidden transition ${onClick ? 'active:scale-[0.98] cursor-pointer' : ''} ${
        selected ? 'border-white/70 ring-2 ring-white/30' : 'border-slate-700/70'
      }`}
      style={{ background: `linear-gradient(160deg, ${info.color}22, rgba(15,23,42,0.9) 55%)` }}
    >
      {/* Franja superior: demarcación, elemento y valoración */}
      <div className="flex items-center gap-1.5 px-2 pt-2">
        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold ${POSITION_COLOR[base.position]}`}>
          {base.position}
        </span>
        <ElementChip element={base.element} />
        <span className="ml-auto text-lg font-extrabold tabular-nums leading-none" style={{ color: info.color }}>
          {overall(player)}
        </span>
      </div>

      <div className="flex items-center gap-2.5 px-2 py-2">
        <div
          className="w-14 h-14 shrink-0 rounded-xl overflow-hidden grid place-items-center border"
          style={{ borderColor: `${info.color}55`, background: `${info.color}22` }}
        >
          <ImgFallback
            src={portraitUrl(base.id)}
            className="w-full h-full object-cover"
            alt={base.name}
            fallback={
              <span className="text-lg font-extrabold" style={{ color: info.color }}>{initials(base.name)}</span>
            }
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-sm leading-tight truncate">{base.name}</div>
          <div className="text-[10px] text-slate-400 mb-1">
            Nv. {player.level}
            {player.captain && <span className="ml-1 text-amber-300">· capitán</span>}
          </div>
          <Meter value={player.pt} max={max} color="#38bdf8" label="PT" />
          <div className="mt-0.5">
            <Meter value={player.stamina} max={100} color={staminaColor(player.stamina)} label="AGU" />
          </div>
        </div>
      </div>

      {!compact && (
        <div className="px-2 pb-2 flex flex-col gap-1.5">
          <StatGrid stats={stats} />
          <div className="flex flex-wrap gap-1">
            {player.techniques.map((id) => {
              const t = getTechnique(id)
              if (!t) return null
              const ti = ELEMENT_INFO[t.element]
              return (
                <span
                  key={id}
                  className="rounded-md px-1.5 py-0.5 text-[9px] font-bold border"
                  style={{ color: ti.color, borderColor: `${ti.color}55`, background: `${ti.color}14` }}
                >
                  {t.name} <span className="opacity-60">{t.cost} PT</span>
                </span>
              )
            })}
          </div>
          {player.item && (
            <div className="text-[10px] text-amber-200/90 truncate">🎽 {getItem(player.item)?.name}</div>
          )}
        </div>
      )}
      {footer}
    </div>
  )
}

const STAT_LABEL: Record<keyof Stats, string> = {
  tiro: 'TIR', control: 'CTR', fisico: 'FIS', defensa: 'DEF', velocidad: 'VEL', aguante: 'AGU',
}

export function StatGrid({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {(Object.keys(STAT_LABEL) as (keyof Stats)[]).map((k) => (
        <div key={k} className="rounded-md bg-slate-800/70 py-0.5 text-center">
          <div className="text-[8px] text-slate-500 leading-none">{STAT_LABEL[k]}</div>
          <div className="text-[11px] font-bold tabular-nums leading-tight">{stats[k]}</div>
        </div>
      ))}
    </div>
  )
}

/**
 * Ficha reducida para el once y las listas largas.
 *
 * OJO con `right`: esta fila ES un `<button>`, así que NO se le puede pasar
 * otro botón dentro (HTML inválido; React avisa con validateDOMNesting y el
 * clic interior deja de ser fiable). Si necesitas una acción al lado, pon el
 * botón como HERMANO de la fila, no dentro. Ver `SquadView`.
 */
export function PlayerRow({
  player, onClick, right, dimmed, className = '',
}: {
  player: PlayerInstance
  onClick?: () => void
  right?: React.ReactNode
  dimmed?: boolean
  className?: string
}) {
  const base = getPlayerBase(player.baseId)
  const info = ELEMENT_INFO[base.element]
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/50 px-2 py-1.5 text-left transition ${
        onClick ? 'active:scale-[0.98]' : ''
      } ${dimmed ? 'opacity-45' : ''} ${className}`}
    >
      <div
        className="w-9 h-9 shrink-0 rounded-lg overflow-hidden grid place-items-center border"
        style={{ borderColor: `${info.color}55`, background: `${info.color}22` }}
      >
        <ImgFallback
          src={portraitUrl(base.id)}
          className="w-full h-full object-cover"
          alt={base.name}
          fallback={<span className="text-[11px] font-extrabold" style={{ color: info.color }}>{initials(base.name)}</span>}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`rounded px-1 text-[9px] font-extrabold border ${POSITION_COLOR[base.position]}`}>{base.position}</span>
          <span className="font-bold text-[13px] truncate">{base.name}</span>
          <span className="text-[10px] text-slate-500 shrink-0">Nv.{player.level}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[10px]" style={{ color: info.color }}>{info.glyph}</span>
          <div className="flex-1"><Meter value={player.stamina} max={100} color={staminaColor(player.stamina)} /></div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        {right ?? <span className="text-sm font-extrabold tabular-nums" style={{ color: info.color }}>{overall(player)}</span>}
      </div>
    </button>
  )
}
