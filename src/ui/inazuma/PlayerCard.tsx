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
import { useRef } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import { ComboMark, InjuryCross, rarityBorder, rarityCardStyle } from '@/ui/inazuma/Glyphs'
import { comboOf } from '@/data/inazuma/combos'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import Icon from '@/ui/components/Icon'
import { ELEMENT_ICON, ItemIcon, TechIcons, useTechSheet } from '@/ui/inazuma/Glyphs'
import { effectiveStats, ptMax, RARITY_LABEL, rarityOf, techniqueCostFor, techniquePower } from '@/engine/inazuma/roster'
import { getPlayerBase } from '@/data/inazuma/players'
import { getTechnique } from '@/data/inazuma/techniques'
import { getItem } from '@/data/inazuma/items'
import { useCromo } from '@/ui/inazuma/CromoCard'
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
      <Icon name={ELEMENT_ICON[element]} className="w-3 h-3" />
      {info.label}
    </span>
  )
}

/** Barra fina de recurso (PT, aguante). */
export function Meter({ value, max, color, label, detail }: {
  value: number; max: number; color: string; label?: string
  /** Apéndice junto al número: el TOPE del depósito o la stat de aguante —
      «la estadística al lado de su barrita», que pedía el playtest. */
  detail?: string
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[9px] uppercase tracking-wide text-slate-500 w-7 shrink-0">{label}</span>}
      <div className="flex-1 h-1.5 rounded-full bg-slate-700/70 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[9px] tabular-nums text-slate-400 text-right shrink-0">
        {Math.round(value)}
        {detail && <span className="text-slate-500">{detail}</span>}
      </span>
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
  const tier = rarityOf(player)
  // BLINDAJE anti toque-fantasma: la carta suele montarse dentro de un modal
  // recién abierto, y el segundo tap de un doble toque caía sobre un chip de
  // técnica — «al tocar un jugador se abre su primera supertécnica».
  const mountedAt = useRef(Date.now())

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 rounded-2xl overflow-hidden transition ${onClick ? 'active:scale-[0.98] cursor-pointer' : ''} ${
        selected ? 'ring-2 ring-white/40' : ''
      }`}
      // La CARTA ENTERA se tiñe con la RAREZA (gris → morado → oro →
      // multicolor degradado). El elemento pasa a icono junto al nombre.
      style={rarityCardStyle(tier)}
    >
      {/* Franja superior: rareza en texto y demarcación. (La MEDIA tipo FIFA
          se probó y se retiró a petición: con stats por encima de 100 el
          número saturaba enseguida y no contaba nada útil.) */}
      <div className="flex items-center gap-1.5 px-2 pt-2">
        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold ${POSITION_COLOR[base.position]}`}>
          {base.position}
        </span>
        <span
          className="text-[9px] font-extrabold uppercase tracking-widest"
          style={{ color: rarityBorder(tier) }}
        >
          {RARITY_LABEL[tier]}
        </span>
        {/* Las ESTRELLAS del cromo, también en la ficha: el peso del jugador
            en la serie (informativo — lo que juega son sus stats). Solo aquí
            y no en las filas de lista, que ya van cargadas. */}
        <span className="ml-auto flex gap-[1px]" title={`Peso en la serie: ${base.fame}/5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon key={i} name="star" className="w-3 h-3" style={{ color: i < base.fame ? '#fbbf24' : '#334155' }} />
          ))}
        </span>
      </div>

      <div className="flex items-center gap-2.5 px-2 py-2">
        {/* Tocar el RETRATO abre su CROMO (con el guard anti toque-fantasma
            de siempre: la carta suele nacer dentro de un modal recién abierto). */}
        <div
          className="w-14 h-14 shrink-0 rounded-xl overflow-hidden grid place-items-center border cursor-pointer active:scale-95 transition"
          style={{ borderColor: `${info.color}55`, background: `${info.color}22` }}
          onClick={(e) => {
            e.stopPropagation()
            if (Date.now() - mountedAt.current > 350) useCromo.getState().open(base.id, player)
          }}
        >
          <ImgFallback
            src={portraitUrl(base.id)}
            className="w-full h-full object-cover object-top"
            alt={base.name}
            fallback={
              <span className="text-lg font-extrabold" style={{ color: info.color }}>{initials(base.name)}</span>
            }
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-sm leading-tight truncate flex items-center gap-1">
            {player.injured && <InjuryCross className="w-4 h-4" />}
            <span className="truncate">{base.name}</span>
            {/* Elemento y demarcación SIEMPRE junto al nombre. */}
            <Icon name={ELEMENT_ICON[base.element]} className="w-3.5 h-3.5 shrink-0" style={{ color: info.color }} />
            <span className="text-[9px] text-slate-400 font-bold shrink-0">{base.position}</span>
          </div>
          <div className="text-[10px] text-slate-400 mb-1">
            Nv. {player.level}
            {player.item === 'brazalete-capitan' && <span className="ml-1 text-amber-300">· capitán</span>}
          </div>
          <Meter value={player.pt} max={max} color="#38bdf8" label="PT" detail={`/${max}`} />
          <div className="mt-0.5">
            <Meter value={player.stamina} max={100} color={staminaColor(player.stamina)} label="AGU" detail={` · stat ${stats.aguante}`} />
          </div>
        </div>
      </div>

      {!compact && (
        <div className="px-2 pb-2 flex flex-col gap-1.5">
          {/* La stat que sube el objeto equipado, en VERDE: que se vea qué
              está haciendo el objeto sin tener que leer su descripción. */}
          <StatGrid stats={stats} boosted={player.item ? getItem(player.item)?.stat : undefined} />
          <div className="flex flex-wrap gap-1">
            {player.techniques.map((id) => {
              const t = getTechnique(id)
              if (!t) return null
              const ti = ELEMENT_INFO[t.element]
              return (
                <span
                  key={id}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (Date.now() - mountedAt.current > 350) useTechSheet.getState().open(t, player)
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold border cursor-pointer active:scale-95 transition"
                  style={{ color: ti.color, borderColor: `${ti.color}55`, background: `${ti.color}14` }}
                >
                  <TechIcons tech={t} className="w-2.5 h-2.5" />
                  {comboOf(t.id) && <ComboMark className="w-2.5 h-2.5 text-amber-300" />}
                  {t.name} <span className="opacity-60">{techniquePower(player, t)} pot. · {techniqueCostFor(player, t)} PT</span>
                </span>
              )
            })}
          </div>
          {player.item && (
            <div className="text-[10px] text-amber-200/90 truncate flex items-center gap-1">
              <ItemIcon itemId={player.item} className="w-3.5 h-3.5" />
              {getItem(player.item)?.name}
            </div>
          )}
        </div>
      )}
      {footer}
    </div>
  )
}

const STAT_LABEL: Record<keyof Stats, string> = {
  tiro: 'TIR', control: 'CTR', fisico: 'FIS', defensa: 'DEF', velocidad: 'VEL', aguante: 'AGU', portero: 'POR',
}

export function StatGrid({ stats, boosted }: {
  stats: Stats
  /** Atributo subido por el objeto equipado: se pinta en VERDE. */
  boosted?: keyof Stats
}) {
  // SIN el aguante: su sitio es junto a su barrita (ver `Meter detail`), no
  // entre los atributos de duelo.
  return (
    <div className="grid grid-cols-6 gap-1">
      {(Object.keys(STAT_LABEL) as (keyof Stats)[]).filter((k) => k !== 'aguante').map((k) => (
        <div key={k} className={`rounded-md py-0.5 text-center ${k === boosted ? 'bg-emerald-500/15 border border-emerald-500/50' : 'bg-slate-800/70'}`}>
          <div className={`text-[8px] leading-none ${k === boosted ? 'text-emerald-300' : 'text-slate-500'}`}>{STAT_LABEL[k]}</div>
          <div className={`text-[11px] font-bold tabular-nums leading-tight ${k === boosted ? 'text-emerald-300' : ''}`}>{stats[k]}</div>
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
  const tier = rarityOf(player)
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition ${
        onClick ? 'active:scale-[0.98]' : ''
      } ${dimmed ? 'opacity-45' : ''} ${className}`}
      style={rarityCardStyle(tier)}
    >
      <div
        className="w-9 h-9 shrink-0 rounded-lg overflow-hidden grid place-items-center border"
        style={{ borderColor: `${info.color}55`, background: `${info.color}22` }}
      >
        <ImgFallback
          src={portraitUrl(base.id)}
          className="w-full h-full object-cover object-top"
          alt={base.name}
          fallback={<span className="text-[11px] font-extrabold" style={{ color: info.color }}>{initials(base.name)}</span>}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`rounded px-1 text-[9px] font-extrabold border ${POSITION_COLOR[base.position]}`}>{base.position}</span>
          {player.injured && <InjuryCross className="w-3.5 h-3.5" />}
          <span className="font-bold text-[13px] truncate">{base.name}</span>
          <Icon name={ELEMENT_ICON[base.element]} className="w-3 h-3 shrink-0" style={{ color: info.color }} />
          <span className="text-[10px] text-slate-500 shrink-0">Nv.{player.level}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {/* PT y aguante, SIEMPRE los que le quedan y CON etiqueta: la fila
              es la ficha de todas las listas y sin rótulos los números se
              confundían con otra cosa. */}
          <div className="flex-1 flex flex-col gap-0.5">
            <Meter value={player.pt} max={ptMax(player)} color="#38bdf8" label="PT" detail={`/${ptMax(player)}`} />
            <Meter value={player.stamina} max={100} color={staminaColor(player.stamina)} label="AGU" detail={` · stat ${effectiveStats(player).aguante}`} />
          </div>
        </div>
      </div>
      {right != null && <div className="shrink-0 text-right">{right}</div>}
    </button>
  )
}
