// ALINEACIÓN de solo lectura, con el MISMO aspecto que la del vestuario: filas
// de ataque a portería sobre el césped, fichas con retrato, media, nivel y
// estrellas. La usan la previa del partido (tu once Y el del rival) para que
// todas las alineaciones del modo se lean igual — y cada ficha es CLICABLE
// para abrir los datos del jugador.
import { ImgFallback } from '@/ui/components/kit'
import { ELEMENT_ICON, rarityChipStyle } from '@/ui/inazuma/Glyphs'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import Icon from '@/ui/components/Icon'
import { portraitUrl, staminaColor } from '@/ui/inazuma/PlayerCard'
import type { Element, Position } from '@/engine/inazuma/types'

/** Una ficha del tablero, ya resuelta a datos pintables. */
export interface BoardChip {
  key: string
  name: string
  baseId: string
  element: Element
  /** Papel del hueco (fila en la que se pinta). */
  role: Position
  level?: number
  rarity?: number
  overall?: number
  stamina?: number
  /** PT restantes (con `ptMax`): la barra azul bajo la ficha. */
  pt?: number
  ptMax?: number
  /** Demarcación natural, para el aviso rojo si no coincide con `role`. */
  position?: Position
  hasSpirit?: boolean
}

const ROWS: { pos: Position; label: string }[] = [
  { pos: 'DEL', label: 'Ataque' },
  { pos: 'MED', label: 'Centro' },
  { pos: 'DEF', label: 'Defensa' },
  { pos: 'POR', label: 'Portería' },
]

export default function LineupBoard({ chips, onTap }: {
  chips: BoardChip[]
  onTap?: (chip: BoardChip) => void
}) {
  return (
    <div
      // shrink-0: con `overflow-hidden` este div pierde su tamaño mínimo como
      // hijo flex, y en la previa del jefe (DOS tableros en la columna con
      // scroll) los tableros se APLASTABAN para caber en vez de desbordar —
      // se veían recortados y el scroll nunca llegaba a activarse.
      className="relative shrink-0 rounded-2xl border border-emerald-900/60 overflow-hidden"
      style={{ background: 'repeating-linear-gradient(180deg,#14532d22 0 26px,#16653422 26px 52px), #0b2a1a' }}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-5 top-2 bottom-2 border-2 border-white/10 rounded-lg" />
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 w-14 h-14 -mt-7 border-2 border-white/10 rounded-full" />
        <div className="absolute inset-x-5 top-1/2 h-0 border-t-2 border-white/10" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-24 h-8 border-2 border-white/10 rounded-sm" />
      </div>

      <div className="relative p-2.5 flex flex-col gap-2">
        {ROWS.map(({ pos, label }) => {
          const line = chips.filter((c) => c.role === pos)
          if (!line.length) return null
          return (
            <div key={pos}>
              <div className="text-[8px] uppercase tracking-widest text-emerald-200/40 text-center mb-1">{label}</div>
              <div className="flex justify-center gap-2 flex-wrap">
                {line.map((c) => <Chip key={c.key} chip={c} onTap={onTap} />)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Chip({ chip, onTap }: { chip: BoardChip; onTap?: (c: BoardChip) => void }) {
  const info = ELEMENT_INFO[chip.element]
  const outOfPosition = chip.position != null && chip.position !== chip.role
  return (
    <button
      onClick={onTap ? () => onTap(chip) : undefined}
      className={`relative w-[52px] shrink-0 flex flex-col items-center ${onTap ? 'active:scale-95 transition' : 'cursor-default'}`}
    >
      <div className="relative">
        <div
          className="w-11 h-11 rounded-xl overflow-hidden border-2 grid place-items-center"
          style={chip.rarity != null
            ? rarityChipStyle(chip.rarity, `${info.color}22`)
            : { borderColor: `${info.color}88`, background: `${info.color}22` }}
        >
          <ImgFallback
            src={portraitUrl(chip.baseId)}
            className="w-full h-full object-cover object-top"
            alt={chip.name}
            fallback={<span className="text-[11px] font-extrabold" style={{ color: info.color }}>{chip.name[0]}</span>}
          />
        </div>
        {/* La media, fuera: nivel + rareza bastan. */}
        {outOfPosition && (
          <span className="absolute -top-1.5 -left-1.5 rounded px-1 text-[8px] font-black leading-tight bg-rose-500 text-white border border-black/40">
            {chip.position}
          </span>
        )}
        {chip.hasSpirit && (
          <Icon name="spirit" className="absolute -bottom-1 -right-1 w-3.5 h-3.5 text-amber-300" title="Espíritu Guerrero" />
        )}
      </div>
      {/* PT (azul) y aguante (verde→rojo): los dos depósitos, siempre. */}
      {chip.pt != null && chip.ptMax != null && chip.ptMax > 0 && (
        <div className="w-11 h-1 rounded-full bg-slate-800 overflow-hidden mt-0.5">
          <div className="h-full bg-sky-400" style={{ width: `${Math.min(100, (chip.pt / chip.ptMax) * 100)}%` }} />
        </div>
      )}
      {chip.stamina != null && (
        <div className="w-11 h-1 rounded-full bg-slate-800 overflow-hidden mt-0.5">
          <div className="h-full" style={{ width: `${chip.stamina}%`, background: staminaColor(chip.stamina) }} />
        </div>
      )}
      <div className="text-[8px] leading-tight truncate w-full text-center text-slate-200 mt-0.5">
        {chip.name.split(' ')[0]}
      </div>
      {/* Demarcación REAL + elemento: el color del borde no bastaba para
          saber qué es cada uno de un vistazo. */}
      <div className="flex items-center justify-center gap-0.5 text-[7px] leading-none text-slate-400">
        {chip.position && <span className="font-extrabold text-slate-300">{chip.position}</span>}
        <Icon name={ELEMENT_ICON[chip.element]} className="w-2 h-2" style={{ color: info.color }} />
        {chip.level != null && <>Nv.{chip.level}</>}
      </div>
    </button>
  )
}
