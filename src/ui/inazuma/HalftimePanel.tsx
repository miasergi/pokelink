// EL DESCANSO: 15 minutos de vestuario de verdad. Se puede dar un consumible a
// quien lo necesite (las curas de PT/aguante) y hacer hasta 3 CAMBIOS con el
// banquillo. El partido no se reanuda hasta pulsar el botón.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { getItem } from '@/data/inazuma/items'
import { getPlayerBase } from '@/data/inazuma/players'
import { Meter, PlayerRow, staminaColor } from '@/ui/inazuma/PlayerCard'
import LineupBoard from '@/ui/inazuma/LineupBoard'
import { ItemIcon } from '@/ui/inazuma/Glyphs'
import type { Actor } from '@/engine/inazuma/types'

/** Consumibles con sentido en un descanso: curas de PT y aguante. */
const HALFTIME_ITEMS = new Set(['bebida-isotonica', 'bebida-doble', 'masaje', 'ramen-rai-rai', 'ramen-especial'])

export default function HalftimePanel() {
  const { match, save, halftimeBreak, resumeSecondHalf, halftimeUseItem, halftimeSubstitute } = useInazuma()
  const [target, setTarget] = useState<Actor | null>(null)
  const [action, setAction] = useState<'item' | 'sub' | null>(null)
  if (!halftimeBreak || !match || !save) return null

  const side = match.home.isPlayer ? match.home : match.away
  const onPitch = [side.keeper, ...side.defs, ...side.mids, ...side.fwds]
  const onPitchUids = new Set(onPitch.map((a) => a.uid))
  const bench = save.roster.filter((p) => !onPitchUids.has(p.uid))
  // Agrupados con contador, igual que en la mochila: cada uso gasta UNO.
  const items: { id: string; count: number }[] = []
  for (const id of save.bag) {
    if (!HALFTIME_ITEMS.has(id)) continue
    const g = items.find((x) => x.id === id)
    if (g) g.count += 1
    else items.push({ id, count: 1 })
  }

  return createPortal(
    <div className="fixed inset-0 z-[88]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md max-h-[92svh] overflow-y-auto rounded-t-3xl border-t border-x border-slate-700 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-sheet-up">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="timer" className="w-5 h-5 text-amber-300" />
          <h2 className="font-extrabold">Descanso</h2>
          <span className="ml-auto text-[11px] font-bold text-slate-400">
            Cambios: <b className="text-amber-300">{match.subsLeft}</b>
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mb-3">
          Toca a un jugador sobre el campo para darle un consumible o hacer un cambio.
        </p>

        {/* El once SOBRE EL CAMPO, como en la previa y el vestuario: en lista
            no se veía quién ocupaba qué hueco a la hora de decidir cambios. */}
        <LineupBoard
          chips={onPitch.map((a) => ({
            key: a.uid,
            name: a.name,
            baseId: a.baseId,
            element: a.element,
            role: a.position,
            position: getPlayerBase(a.baseId).position,
            stamina: a.stamina,
            pt: a.pt,
            ptMax: a.ptMax,
          }))}
          onTap={(c) => {
            const a = onPitch.find((x) => x.uid === c.key)
            if (a) { setTarget(a); setAction(null) }
          }}
        />

        {/* Acciones sobre el elegido */}
        {target && (
          <div className="mt-3 rounded-2xl border border-amber-500/40 bg-slate-800/60 p-3">
            <div className="text-[12px] font-extrabold mb-1">{target.name}</div>
            {/* Sus depósitos, para decidir QUÉ darle (o si mejor cambiarlo). */}
            <div className="mb-2 flex flex-col gap-0.5">
              <Meter value={target.pt} max={target.ptMax} color="#38bdf8" label="PT" />
              <Meter value={target.stamina} max={100} color={staminaColor(target.stamina)} label="AGU" />
            </div>
            {!action && (
              <div className="flex gap-2">
                <Button variant="secondary" full onClick={() => setAction('item')} disabled={!items.length}>
                  {items.length ? 'Dar consumible' : 'Sin consumibles'}
                </Button>
                <Button variant="secondary" full onClick={() => setAction('sub')} disabled={match.subsLeft <= 0 || !bench.length}>
                  {match.subsLeft > 0 ? 'Cambiar' : 'Sin cambios'}
                </Button>
              </div>
            )}
            {action === 'item' && (
              <div className="flex flex-col gap-1.5">
                {items.map(({ id, count }) => (
                  <button
                    key={id}
                    onClick={() => { halftimeUseItem(id, target.uid); setTarget(null); setAction(null) }}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-left active:scale-[0.99] transition"
                  >
                    <ItemIcon itemId={id} className="w-6 h-6" />
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold">
                        {getItem(id)?.name}
                        {count > 1 && <span className="ml-1.5 text-[11px] font-extrabold text-amber-300">×{count}</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{getItem(id)?.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {action === 'sub' && (
              <div className="flex flex-col gap-1.5">
                {bench.map((p) => (
                  <PlayerRow
                    key={p.uid}
                    player={p}
                    onClick={() => { halftimeSubstitute(target.uid, p.uid); setTarget(null); setAction(null) }}
                  />
                ))}
              </div>
            )}
            {action && (
              <button className="mt-2 text-[11px] text-slate-500 underline" onClick={() => setAction(null)}>atrás</button>
            )}
          </div>
        )}

        <Button variant="primary" full className="mt-3" onClick={resumeSecondHalf}>
          <span className="inline-flex items-center justify-center gap-1.5">
            <Icon name="play" className="w-4 h-4" /> Segunda parte
          </span>
        </Button>
      </div>
    </div>,
    document.body,
  )
}

/** Nombre del jugador de banquillo, por si hiciera falta fuera. */
export function benchName(baseId: string): string {
  return getPlayerBase(baseId).name
}
