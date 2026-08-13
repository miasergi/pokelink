// Alineación sobre el campo, con arrastrar y soltar.
//
// Es la vista natural de un juego de fútbol: ves las líneas, quién ocupa cada
// puesto y a quién tienes en el banquillo. Arrastrando intercambias dos
// jugadores (titular↔titular para reordenar, titular↔suplente para rotar).
//
// Usa eventos de PUNTERO, no la API de drag & drop de HTML5: esta última no
// funciona en móvil, que es donde se juega. Se implementa a mano con
// `setPointerCapture` y detección del destino con `elementFromPoint`.
import { useRef, useState } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import { ELEMENT_ICON, rarityChipStyle } from '@/ui/inazuma/Glyphs'
import Icon from '@/ui/components/Icon'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { ptMax, rarityOf } from '@/engine/inazuma/roster'
import { getFormation } from '@/data/inazuma/formations'
import { getPlayerBase } from '@/data/inazuma/players'
import { portraitUrl, staminaColor } from '@/ui/inazuma/PlayerCard'
import type { InazumaSave, PlayerInstance, Position } from '@/engine/inazuma/types'

/** Filas del campo, de ataque a portería (arriba se ataca). */
const ROWS: { pos: Position; label: string }[] = [
  { pos: 'DEL', label: 'Ataque' },
  { pos: 'MED', label: 'Centro' },
  { pos: 'DEF', label: 'Defensa' },
  { pos: 'POR', label: 'Portería' },
]

/** Los índices de hueco del once que corresponden a cada fila. */
function slotsOfRow(f: { defs: number; mids: number; fwds: number }, pos: Position): number[] {
  if (pos === 'POR') return [0]
  if (pos === 'DEF') return Array.from({ length: f.defs }, (_, i) => 1 + i)
  if (pos === 'MED') return Array.from({ length: f.mids }, (_, i) => 1 + f.defs + i)
  return Array.from({ length: f.fwds }, (_, i) => 1 + f.defs + f.mids + i)
}

interface DragState {
  uid: string
  x: number
  y: number
}

export default function PitchView({
  save, onSwap, onPlace, onTap, selected, onSelectDone,
}: {
  save: InazumaSave
  /** Intercambia dos jugadores (uno puede ser del banquillo). */
  onSwap: (a: string, b: string) => void
  /** Coloca a un jugador en un HUECO vacío del once. */
  onPlace: (uid: string, slot: number) => void
  onTap: (uid: string) => void
  /**
   * MODO MOVER (la alternativa fiable al arrastre en móvil): con un jugador
   * seleccionado desde su ficha, el siguiente toque sobre otra ficha o un
   * hueco ejecuta el cambio. El arrastre sigue funcionando igual.
   */
  selected?: string | null
  onSelectDone?: () => void
}) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const moved = useRef(false)

  const byUid = new Map(save.roster.map((p) => [p.uid, p]))
  const starters = save.lineup.map((u) => byUid.get(u)).filter((p): p is PlayerInstance => !!p)
  const bench = save.roster.filter((p) => !save.lineup.includes(p.uid))
  const formation = getFormation(save.formation)

  const start = (uid: string) => (e: React.PointerEvent) => {
    // La captura va en la FICHA (currentTarget), no en el nodo interior que
    // pillara el dedo: capturar la <img> hacía que algunos moves se perdieran.
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    moved.current = false
    setDrag({ uid, x: e.clientX, y: e.clientY })
  }

  const move = (e: React.PointerEvent) => {
    if (!drag) return
    // Umbral generoso (12 px): con 6, el micro-temblor del dedo convertía casi
    // cualquier toque en «arrastre» y clicar para ver la ficha era una lotería.
    if (Math.abs(e.clientX - drag.x) > 12 || Math.abs(e.clientY - drag.y) > 12) moved.current = true
    if (!moved.current) return
    setDrag({ ...drag, x: e.clientX, y: e.clientY })
    // El elemento bajo el dedo marca el destino: otra ficha (intercambio) o
    // un hueco vacío (colocación). `elementFromPoint` ignora la ficha
    // arrastrada porque lleva `pointer-events: none`.
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const chip = el?.closest('[data-uid]') as HTMLElement | null
    const hole = el?.closest('[data-slot]') as HTMLElement | null
    const uid = chip?.dataset.uid
    setOver(uid && uid !== drag.uid ? uid : hole ? `slot:${hole.dataset.slot}` : null)
  }

  const end = () => {
    if (!drag) return
    if (!moved.current) {
      // Toque: en modo MOVER ejecuta el cambio; si no, abre la ficha.
      if (selected && selected !== drag.uid) { onSwap(selected, drag.uid); onSelectDone?.() }
      else onTap(drag.uid)
    } else if (over?.startsWith('slot:')) onPlace(drag.uid, Number(over.slice(5)))
    else if (over) onSwap(drag.uid, over)
    setDrag(null)
    setOver(null)
  }

  // El navegador se queda el gesto (scroll vertical con touch-pan-y): NO es un
  // drop. Antes pasaba por `end` y soltaba al jugador donde pillara.
  const cancel = () => {
    setDrag(null)
    setOver(null)
  }

  const dragged = drag ? byUid.get(drag.uid) : null

  return (
    <div className="flex flex-col gap-3" onPointerMove={move} onPointerUp={end} onPointerCancel={cancel}>
      {/* Modo MOVER activo: el siguiente toque es el destino. */}
      {selected && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-[12px] text-amber-100 flex items-center gap-2">
          <span className="min-w-0 flex-1">
            Moviendo a <b>{getPlayerBase(byUid.get(selected)?.baseId ?? '')?.name ?? 'jugador'}</b>:
            toca a otro jugador o un hueco.
          </span>
          <button className="underline text-amber-300 shrink-0" onClick={onSelectDone}>cancelar</button>
        </div>
      )}
      {/* Campo */}
      <div
        className="relative rounded-2xl border border-emerald-900/60 overflow-hidden select-none"
        style={{
          background: 'repeating-linear-gradient(180deg,#14532d22 0 26px,#16653422 26px 52px), #0b2a1a',
        }}
      >
        {/* líneas del campo */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-6 top-2 bottom-2 border-2 border-white/10 rounded-lg" />
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 w-16 h-16 -mt-8 border-2 border-white/10 rounded-full" />
          <div className="absolute inset-x-6 top-1/2 h-0 border-t-2 border-white/10" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-28 h-10 border-2 border-white/10 rounded-sm" />
        </div>

        <div className="relative p-3 flex flex-col gap-2.5">
          {/* Cada fila son HUECOS del once, no demarcaciones: quien ocupa un
              hueco de arriba juega arriba, sea quien sea. Poner a Axel de
              defensa es legal — y el aviso rojo recuerda que es mala idea. */}
          {ROWS.map(({ pos, label }) => {
            const slots = slotsOfRow(formation, pos)
            return (
              <div key={pos}>
                <div className="text-[8px] uppercase tracking-widest text-emerald-200/40 text-center mb-1">
                  {label}
                </div>
                <div className="flex justify-center gap-2 flex-wrap min-h-[52px]">
                  {slots.map((slot) => {
                    const p = starters[slot]
                    if (!p) {
                      return (
                        <span
                          key={`hole-${slot}`}
                          data-slot={slot}
                          onClick={selected ? () => { onPlace(selected, slot); onSelectDone?.() } : undefined}
                          className={`grid place-items-center w-11 h-11 rounded-xl border-2 border-dashed text-lg transition ${
                            over === `slot:${slot}` || selected ? 'border-amber-300 text-amber-300' : 'border-white/15 text-white/25'
                          } ${over === `slot:${slot}` ? 'scale-110' : ''}`}
                        >
                          +
                        </span>
                      )
                    }
                    return (
                      <PitchChip
                        key={p.uid}
                        player={p}
                        role={pos}
                        onPointerDown={start(p.uid)}
                        highlight={over === p.uid}
                        ghost={drag?.uid === p.uid}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Banquillo */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1.5">
          Banquillo · {bench.length}
        </div>
        {bench.length === 0 ? (
          <div className="text-[11px] text-slate-600">Sin suplentes. Ficha en el ojeador.</div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {bench.map((p) => (
              <PitchChip
                key={p.uid}
                player={p}
                bench
                onPointerDown={start(p.uid)}
                highlight={over === p.uid}
                ghost={drag?.uid === p.uid}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-600">
        Un toque abre la ficha (y desde ella, «Mover»). Arrastrar sobre otro jugador también intercambia.
      </p>

      {/* Ficha que sigue al dedo */}
      {drag && dragged && (
        <div
          className="fixed z-[80] pointer-events-none opacity-90"
          style={{ left: drag.x - 22, top: drag.y - 22 }}
        >
          <PitchChip player={dragged} floating />
        </div>
      )}
    </div>
  )
}

function PitchChip({
  player, role, onPointerDown, highlight, ghost, bench, floating,
}: {
  player: PlayerInstance
  /** Papel del hueco que ocupa; si no es su demarcación natural, se avisa. */
  role?: Position
  onPointerDown?: (e: React.PointerEvent) => void
  highlight?: boolean
  ghost?: boolean
  bench?: boolean
  floating?: boolean
}) {
  const base = getPlayerBase(player.baseId)
  const info = ELEMENT_INFO[base.element]
  const outOfPosition = role != null && role !== base.position
  return (
    <div
      data-uid={floating ? undefined : player.uid}
      onPointerDown={onPointerDown}
      // `touch-pan-y` y no `touch-none`: con none, tocar una ficha bloqueaba el
      // scroll vertical de TODA la vista en móvil (las fichas cubren el campo).
      // Con pan-y el gesto vertical hace scroll y el horizontal inicia el
      // arrastre; para llevarla a otra fila basta empezar en horizontal.
      className={`relative w-11 shrink-0 touch-pan-y ${ghost ? 'opacity-30' : ''}`}
      style={{ cursor: 'grab' }}
    >
      <div
        className={`w-11 h-11 rounded-xl overflow-hidden border-2 grid place-items-center transition ${
          highlight ? 'scale-110 ring-2 ring-amber-300' : ''
        }`}
        style={{
          // El borde cuenta la RAREZA (multicolor = degradado de verdad).
          ...rarityChipStyle(rarityOf(player), `${info.color}22`),
          ...(highlight ? { border: '2px solid #fcd34d' } : {}),
          ...(floating ? { boxShadow: '0 8px 20px rgba(0,0,0,.5)' } : {}),
        }}
      >
        <ImgFallback
          src={portraitUrl(base.id)}
          className="w-full h-full object-cover object-top"
          alt={base.name}
          fallback={<span className="text-[11px] font-extrabold" style={{ color: info.color }}>{base.name[0]}</span>}
        />
        {rarityOf(player) === 4 && <span className="mc-ring rounded-xl" />}
      </div>
      {/* PT (azul) y aguante: los dos depósitos también en el vestuario. */}
      <div className="h-1 rounded-full bg-slate-800 overflow-hidden mt-0.5">
        <div className="h-full bg-sky-400" style={{ width: `${Math.min(100, (player.pt / Math.max(1, ptMax(player))) * 100)}%` }} />
      </div>
      <div className="h-1 rounded-full bg-slate-800 overflow-hidden mt-0.5">
        <div className="h-full" style={{ width: `${player.stamina}%`, background: staminaColor(player.stamina) }} />
      </div>
      <div className={`text-[8px] leading-tight truncate text-center ${bench ? 'text-slate-500' : 'text-slate-300'}`}>
        {base.name.split(' ')[0]}
      </div>
      {/* Demarcación + elemento + nivel + rareza, en miniatura. */}
      <div className="flex items-center justify-center gap-0.5 text-[7px] leading-none text-slate-500">
        <span className="font-extrabold text-slate-300">{base.position}</span>
        <Icon name={ELEMENT_ICON[base.element]} className="w-2 h-2" style={{ color: info.color }} />
        Nv.{player.level}
      </div>
      {/* Fuera de su sitio: su demarcación natural en rojo. Sus atributos y
          sus técnicas son de OTRO puesto, y conviene verlo de un vistazo. */}
      {outOfPosition && (
        <span className="absolute -top-1.5 -left-1.5 rounded px-1 text-[8px] font-black leading-tight bg-rose-500 text-white border border-black/40">
          {base.position}
        </span>
      )}
    </div>
  )
}
