// EFECTO DE OBJETO EN PANTALLA: cuando algo se usa, SE VE lo que hace.
//
// Curas (PT/aguante): las barras se rellenan animadas de su valor viejo al
// nuevo, con el «+N» flotando. Equipamiento: los atributos potenciados, de
// cuánto a cuánto y en verde. Entrenamientos: el salto de nivel. El Rai Rai
// usa esto mismo al entrar, que curaba en silencio y nadie se enteraba.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { ItemIcon, Pic, rarityBorder, rarityChipStyle } from '@/ui/inazuma/Glyphs'
import { RARITY_LABEL } from '@/engine/inazuma/roster'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'

const SHOW_MS = 2300

export default function ItemFxOverlay() {
  const { itemFx, clearItemFx } = useInazuma()
  const [filled, setFilled] = useState(false)

  useEffect(() => {
    if (!itemFx) return
    setFilled(false)
    // Un latido para que las barras arranquen en el valor viejo y ANIMEN.
    const t0 = setTimeout(() => setFilled(true), 80)
    const t1 = setTimeout(clearItemFx, SHOW_MS)
    return () => { clearTimeout(t0); clearTimeout(t1) }
  }, [itemFx, clearItemFx])

  if (!itemFx) return null

  return createPortal(
    <div className="fixed inset-0 z-[92] grid place-items-center p-6" onClick={clearItemFx}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in" />
      <div className="relative w-full max-w-xs rounded-3xl border border-slate-700 bg-slate-900 p-4 animate-pop-in">
        <div className="flex items-center gap-3">
          {itemFx.itemId === 'rairai'
            ? <Pic name="node-rairai" className="w-10 h-10" />
            : itemFx.itemId
              ? <ItemIcon itemId={itemFx.itemId} className="w-10 h-10" />
              : <Icon name="sparkle" className="w-10 h-10 text-amber-300" />}
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-sm truncate">{itemFx.title}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              {itemFx.targetBaseId && (
                <span className="w-5 h-5 rounded-full overflow-hidden border border-slate-600 shrink-0">
                  <ImgFallback
                    src={portraitUrl(itemFx.targetBaseId)}
                    className="w-full h-full object-cover object-top"
                    fallback={<span />}
                  />
                </span>
              )}
              <span className="truncate">{itemFx.targetName}</span>
            </div>
          </div>
        </div>

        {/* SUBIDA DE RAREZA: el retrato en grande con el marco cambiando del
            color viejo al nuevo (y su degradado si llega a multicolor). */}
        {itemFx.rarity && itemFx.targetBaseId && (
          <div className="mt-3 flex flex-col items-center gap-1.5">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden grid place-items-center transition-all duration-700"
              style={rarityChipStyle(filled ? itemFx.rarity.to : itemFx.rarity.from, '#0f172a')}
            >
              <ImgFallback
                src={portraitUrl(itemFx.targetBaseId)}
                className="w-full h-full object-cover object-top"
                fallback={<span className="text-2xl font-extrabold text-slate-500">?</span>}
              />
            </div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest">
              <span style={{ color: rarityBorder(itemFx.rarity.from) }}>{RARITY_LABEL[itemFx.rarity.from]}</span>
              <span className="text-slate-500">→</span>
              <span
                className={filled ? 'animate-pop-in' : 'opacity-40'}
                style={{ color: rarityBorder(itemFx.rarity.to) }}
              >
                {RARITY_LABEL[itemFx.rarity.to]}
              </span>
            </div>
          </div>
        )}

        {/* Barras que se CURAN en directo. */}
        {itemFx.bars.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {itemFx.bars.map((b) => {
              const fromPct = Math.min(100, (b.from / b.max) * 100)
              const toPct = Math.min(100, (b.to / b.max) * 100)
              const delta = Math.round(b.to - b.from)
              return (
                <div key={b.label} className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500 w-8 shrink-0">{b.label}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-700/70 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${filled ? toPct : fromPct}%`,
                        background: b.color,
                        transition: 'width .9s cubic-bezier(.2,.8,.3,1)',
                      }}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-extrabold tabular-nums w-12 text-right shrink-0 ${
                      delta >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    } ${filled ? 'animate-pop-in' : 'opacity-0'}`}
                  >
                    {delta >= 0 ? '+' : ''}{delta}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Atributos potenciados por el equipamiento: de cuánto a cuánto. */}
        {itemFx.stats && itemFx.stats.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {itemFx.stats.map((st, i) => (
              <div
                key={st.label}
                className={`flex items-center justify-between rounded-lg bg-slate-800/70 px-2 py-1.5 ${
                  filled ? 'animate-pop-in' : 'opacity-0'
                }`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span className="text-[10px] font-bold text-slate-400">{st.label}</span>
                <span className="text-[12px] font-extrabold tabular-nums">
                  <span className="text-slate-500">{st.from}</span>
                  <Icon name="arrowRight" className="w-3 h-3 inline-block mx-1 align-[-2px] text-emerald-400" />
                  <span className="text-emerald-300">{st.to}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Salto de nivel de los planes de entrenamiento. */}
        {itemFx.level && (
          <div className={`mt-3 text-center ${filled ? 'animate-pop-in' : 'opacity-0'}`}>
            <span className="text-lg font-extrabold tabular-nums">
              <span className="text-slate-500">Nv. {itemFx.level.from}</span>
              <Icon name="arrowRight" className="w-4 h-4 inline-block mx-1.5 align-[-2px] text-amber-400" />
              <span className="text-amber-300">Nv. {itemFx.level.to}</span>
            </span>
          </div>
        )}

        <div className="mt-3 text-center text-[10px] text-slate-600">toca para cerrar</div>
      </div>
    </div>,
    document.body,
  )
}
