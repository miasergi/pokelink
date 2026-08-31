// ALINEACIÓN de solo lectura, con el MISMO aspecto que la del vestuario: filas
// de ataque a portería sobre el césped, fichas con retrato, nivel, elemento y
// borde de rareza. La usan la previa del partido (tu once Y el del rival) para que
// todas las alineaciones del modo se lean igual — y cada ficha es CLICABLE
// para abrir los datos del jugador.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ImgFallback } from '@/ui/components/kit'
import { ELEMENT_ICON, InjuryCross, ItemIcon, rarityChipStyle } from '@/ui/inazuma/Glyphs'
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
  /** Objeto equipado: su imagen asoma en la esquina de la ficha. */
  itemId?: string
  /** LESIONADO: su cruz roja encima de la ficha, sin tener que tocarlo. */
  injured?: boolean
}

const ROWS: { pos: Position; label: string }[] = [
  { pos: 'DEL', label: 'Ataque' },
  { pos: 'MED', label: 'Centro' },
  { pos: 'DEF', label: 'Defensa' },
  { pos: 'POR', label: 'Portería' },
]

export default function LineupBoard({ chips, onTap, onSwap }: {
  chips: BoardChip[]
  onTap?: (chip: BoardChip) => void
  /**
   * Si está, las fichas se pueden ARRASTRAR una sobre otra para
   * intercambiarlas (lo usa el descanso). Un toque sin arrastre sigue
   * disparando `onTap`.
   */
  onSwap?: (aKey: string, bKey: string) => void
}) {
  // ARRASTRE VISIBLE: un fantasma del retrato sigue al dedo y la ficha de
  // destino se ilumina. Antes el intercambio funcionaba pero no SE VEÍA nada
  // moverse («en el descanso no se ve el drag and drop»).
  const [drag, setDrag] = useState<{ chip: BoardChip; x: number; y: number; hoverKey: string | null; moved: boolean } | null>(null)
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
                {line.map((c) => (
                  <Chip
                    key={c.key}
                    chip={c}
                    onTap={onTap}
                    onSwap={onSwap}
                    dragTarget={drag?.moved === true && drag.hoverKey === c.key && drag.chip.key !== c.key}
                    dragSource={drag?.moved === true && drag.chip.key === c.key}
                    onDrag={setDrag}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* EL FANTASMA del arrastre: el retrato pegado al dedo, por encima de
          todo. Sin él, arrastrar era un acto de fe. */}
      {drag?.moved && createPortal(
        <div
          className="fixed z-[96] pointer-events-none -translate-x-1/2 -translate-y-[70%]"
          style={{ left: drag.x, top: drag.y }}
        >
          <div
            className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-300 shadow-lg shadow-black/60 bg-slate-900"
            style={{ boxShadow: '0 0 16px rgba(251,191,36,.5)' }}
          >
            <ImgFallback
              src={portraitUrl(drag.chip.baseId)}
              className="w-full h-full object-cover object-top"
              alt={drag.chip.name}
              fallback={<span className="grid place-items-center w-full h-full text-[11px] font-extrabold text-slate-300">{drag.chip.name[0]}</span>}
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

function Chip({ chip, onTap, onSwap, dragTarget, dragSource, onDrag }: {
  chip: BoardChip
  onTap?: (c: BoardChip) => void
  onSwap?: (aKey: string, bKey: string) => void
  /** El dedo está ENCIMA con otra ficha en la mano: se ilumina como destino. */
  dragTarget?: boolean
  /** Es la ficha que se está arrastrando: se atenúa en su sitio. */
  dragSource?: boolean
  onDrag?: (d: { chip: BoardChip; x: number; y: number; hoverKey: string | null; moved: boolean } | null) => void
}) {
  const info = ELEMENT_INFO[chip.element]
  const outOfPosition = chip.position != null && chip.position !== chip.role
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  return (
    <button
      data-uid={chip.key}
      onClick={onTap && !onSwap ? () => onTap(chip) : undefined}
      // ARRASTRE (solo con onSwap): soltar sobre otra ficha intercambia; un
      // toque en el sitio abre las acciones (`onTap`). `touch-none` para que
      // el gesto no pelee con el scroll de la hoja.
      onPointerDown={onSwap ? (e) => {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        setStart({ x: e.clientX, y: e.clientY })
        onDrag?.({ chip, x: e.clientX, y: e.clientY, hoverKey: null, moved: false })
      } : undefined}
      onPointerMove={onSwap ? (e) => {
        if (!start) return
        // Umbral de 8 px: por debajo sigue siendo un toque, no un arrastre.
        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const key = el?.closest?.('[data-uid]')?.getAttribute('data-uid') ?? null
        onDrag?.({ chip, x: e.clientX, y: e.clientY, hoverKey: key, moved })
      } : undefined}
      onPointerUp={onSwap ? (e) => {
        setStart(null)
        onDrag?.(null)
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const key = el?.closest?.('[data-uid]')?.getAttribute('data-uid')
        if (key && key !== chip.key) onSwap(chip.key, key)
        else onTap?.(chip)
      } : undefined}
      onPointerCancel={onSwap ? () => { setStart(null); onDrag?.(null) } : undefined}
      className={`relative w-[52px] shrink-0 flex flex-col items-center rounded-lg ${
        onSwap ? 'touch-none' : ''
      } ${dragSource ? 'opacity-40' : ''} ${
        dragTarget ? 'ring-2 ring-amber-300 bg-amber-400/15' : ''
      } ${onTap || onSwap ? 'active:scale-95 transition' : 'cursor-default'}`}
    >
      <div className="relative">
        <div
          // Rareza 4: SIN borde (el anillo ES el borde) y RELATIVE, para que
          // el anillo (absolute) se ancle a ESTA caja y no a un ancestro más
          // alto — sin ello salía alargado y descuadrado.
          className={`relative w-11 h-11 rounded-xl overflow-hidden grid place-items-center ${chip.rarity === 4 ? '' : 'border-2'}`}
          style={chip.rarity === 4
            ? { background: '#0f172a' }
            : chip.rarity != null
              ? rarityChipStyle(chip.rarity, `${info.color}22`)
              : { borderColor: `${info.color}88`, background: `${info.color}22` }}
        >
          <ImgFallback
            src={portraitUrl(chip.baseId)}
            className="w-full h-full object-cover object-top"
            alt={chip.name}
            fallback={<span className="text-[11px] font-extrabold" style={{ color: info.color }}>{chip.name[0]}</span>}
          />
          {/* Rareza 4: el anillo multicolor ANIMADO (girando de tono). */}
          {chip.rarity === 4 && <span className="mc-ring rounded-xl" />}
        </div>
        {/* La media, fuera: nivel + rareza bastan. */}
        {outOfPosition && (
          <span className="absolute -top-1.5 -left-1.5 rounded px-1 text-[8px] font-black leading-tight bg-rose-500 text-white border border-black/40">
            {chip.position}
          </span>
        )}
        {/* LESIONADO: su cruz SIEMPRE a la vista, sin tener que tocarlo. */}
        {chip.injured && <InjuryCross className="absolute -top-1.5 -right-1.5 w-4 h-4" />}
        {/* El objeto que lleva, asomando: se ve quién va equipado sin entrar. */}
        {chip.itemId && (
          <span className="absolute -bottom-1 -left-1 grid place-items-center w-4 h-4 rounded bg-slate-900/90 border border-slate-600">
            <ItemIcon itemId={chip.itemId} className="w-3 h-3" />
          </span>
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
