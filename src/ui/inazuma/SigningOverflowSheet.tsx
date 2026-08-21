// PLANTILLA LLENA (16) y llega un fichaje: hay que DECIDIR. O vendes a uno
// del equipo para hacerle hueco, o vendes directamente al que estaba a punto
// de entrar — en ambos casos, dinero + medallas según la rareza del vendido.
// Antes esto era un callejón sin salida («no hay manera de vender»).
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { PlayerRow, portraitUrl, ElementChip } from '@/ui/inazuma/PlayerCard'
import { CoinPrice, ItemIcon, rarityBorder } from '@/ui/inazuma/Glyphs'
import { MAX_RARITY, RARITY_LABEL, rarityOf, transferValue } from '@/engine/inazuma/roster'
import { getPlayerBase } from '@/data/inazuma/players'

export default function SigningOverflowSheet() {
  const { save, pendingSigning, resolveSigningSell, resolveSigningSwap } = useInazuma()
  const [pick, setPick] = useState<string | null>(null)
  if (!save || !pendingSigning) return null

  const base = getPlayerBase(pendingSigning.baseId)
  const tier = Math.max(1, Math.min(MAX_RARITY, pendingSigning.rarity))
  const inFee = transferValue(base, pendingSigning.level)
  const chosen = pick ? save.roster.find((p) => p.uid === pick) : null

  return createPortal(
    <div className="fixed inset-0 z-[92] bg-black/85 backdrop-blur-sm grid place-items-center p-4">
      <div className="relative w-full max-w-sm max-h-[92svh] rounded-3xl border border-amber-500/50 bg-slate-900 p-4 flex flex-col">
        <div className="text-center mb-2">
          <div className="text-[10px] uppercase tracking-widest text-amber-300 font-extrabold">Vestuario lleno · 16/16</div>
          <div className="font-extrabold text-sm mt-0.5">{pendingSigning.title}</div>
        </div>

        {/* El que LLEGA. */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-700 bg-slate-800/60 p-2.5">
          <span className="w-12 h-12 shrink-0 rounded-xl overflow-hidden border border-slate-600 grid place-items-center bg-slate-900">
            <ImgFallback
              src={portraitUrl(base.id)}
              className="w-full h-full object-cover object-top"
              alt={base.name}
              fallback={<span className="text-sm font-extrabold">{base.name.slice(0, 2).toUpperCase()}</span>}
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-[13px] truncate">{base.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: rarityBorder(tier) }}>
                {RARITY_LABEL[tier]}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">{base.position} · Nv.{pendingSigning.level}</span>
              <ElementChip element={base.element} />
            </div>
          </div>
        </div>

        {/* Opción A: venderlo a ÉL. */}
        <Button variant="secondary" full className="mt-2" onClick={resolveSigningSell}>
          <span className="inline-flex items-center justify-center gap-1.5 text-[13px]">
            Venderlo sin fichar · <CoinPrice amount={inFee} coin="w-3 h-3" /> + {tier}×
            <ItemIcon itemId="medalla-rareza" className="w-4 h-4" />
          </span>
        </Button>

        {/* Opción B: vender a uno TUYO para hacerle hueco. */}
        <div className="mt-2 text-[11px] uppercase tracking-widest text-slate-500">…o vende a uno para hacerle hueco</div>
        <div className="mt-1 flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-1.5">
          {save.roster.map((p) => {
            const b = getPlayerBase(p.baseId)
            const fee = transferValue(b, p.level)
            const medals = Math.max(1, Math.min(MAX_RARITY, rarityOf(p)))
            return (
              <PlayerRow
                key={p.uid}
                player={p}
                className={pick === p.uid ? 'ring-2 ring-amber-400' : ''}
                onClick={() => setPick(pick === p.uid ? null : p.uid)}
                right={
                  <span className="text-[9px] text-right leading-tight text-amber-300 font-bold inline-flex flex-col items-end">
                    <span><CoinPrice amount={fee} coin="w-3 h-3" /></span>
                    <span className="inline-flex items-center gap-0.5">+{medals}×<ItemIcon itemId="medalla-rareza" className="w-3.5 h-3.5" /></span>
                  </span>
                }
              />
            )
          })}
        </div>

        {chosen && (
          <Button variant="danger" full className="mt-2" onClick={() => { resolveSigningSwap(chosen.uid); setPick(null) }}>
            <span className="inline-flex items-center justify-center gap-1.5 text-[13px]">
              Vender a {getPlayerBase(chosen.baseId).name} y fichar a {base.name}
              <Icon name="arrowRight" className="w-4 h-4" />
            </span>
          </Button>
        )}
      </div>
    </div>,
    document.body,
  )
}
