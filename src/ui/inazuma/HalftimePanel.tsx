// EL DESCANSO: 15 minutos de vestuario de verdad. Se puede dar un consumible a
// quien lo necesite (las curas de PT/aguante) y hacer hasta 3 CAMBIOS con el
// banquillo. El partido no se reanuda hasta pulsar el botón.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { getItem } from '@/data/inazuma/items'
import { getPlayerBase } from '@/data/inazuma/players'
import { Meter, PlayerRow, portraitUrl, staminaColor } from '@/ui/inazuma/PlayerCard'
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
  const items = save.bag.filter((id) => HALFTIME_ITEMS.has(id))

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
          Toca a un jugador para darle un consumible o hacer un cambio.
        </p>

        <div className="flex flex-col gap-1.5">
          {onPitch.map((a) => (
            <button
              key={a.uid}
              onClick={() => { setTarget(a); setAction(null) }}
              className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition active:scale-[0.99] ${
                target?.uid === a.uid ? 'border-amber-500/70 bg-amber-500/10' : 'border-slate-700/60 bg-slate-800/50'
              }`}
            >
              <span className="w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-slate-600 grid place-items-center bg-slate-800">
                <ImgFallback
                  src={portraitUrl(a.baseId)}
                  className="w-full h-full object-cover object-top"
                  alt={a.name}
                  fallback={<span className="text-[11px] font-extrabold">{a.name.slice(0, 2).toUpperCase()}</span>}
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold truncate">{a.name} <span className="text-slate-500">· {a.position}</span></div>
                <Meter value={a.pt} max={a.ptMax} color="#38bdf8" label="PT" />
                <div className="mt-0.5">
                  <Meter value={a.stamina} max={100} color={staminaColor(a.stamina)} label="AGU" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Acciones sobre el elegido */}
        {target && (
          <div className="mt-3 rounded-2xl border border-amber-500/40 bg-slate-800/60 p-3">
            <div className="text-[12px] font-extrabold mb-2">{target.name}</div>
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
                {items.map((id, i) => (
                  <button
                    key={`${id}-${i}`}
                    onClick={() => { halftimeUseItem(id, target.uid); setTarget(null); setAction(null) }}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-left active:scale-[0.99] transition"
                  >
                    <ItemIcon itemId={id} className="w-6 h-6" />
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold">{getItem(id)?.name}</div>
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
