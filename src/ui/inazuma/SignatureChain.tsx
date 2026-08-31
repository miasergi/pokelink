// LA CADENA DE SUPERTÉCNICAS, en un solo formato para todo el modo: la ficha
// del jugador, la carta de fichaje del ojeador y cualquier sitio que quiera
// enseñar «qué despierta y cuándo». Antes había DOS formas distintas de
// pintarla (lista rica en la ficha, chips apretados en el fichaje) y ninguna
// era especialmente bonita.
//
// Diseño: escalera vertical con conector, un paso por técnica. Cada paso:
// insignia con su imagen, nombre + potencia/coste, y su ESTADO — aprendida
// (verde), lista para despertar, o el candado con el nivel y la rareza que lo
// abren. Tocar un paso abre la ficha de la técnica (sin burbujear: dentro de
// cartas clicables no dispara nada más).
import Icon from '@/ui/components/Icon'
import { getTechnique } from '@/data/inazuma/techniques'
import { getPlayerBase } from '@/data/inazuma/players'
import {
  MAX_RARITY, RARITY_LABEL, rarityOf, realTechniquePower, signatureLevelFor,
  techniqueCostFor, techniquePower,
} from '@/engine/inazuma/roster'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { rarityBorder, rarityChipStyle, TechIcons, TechniqueBadge, useTechSheet } from '@/ui/inazuma/Glyphs'
import type { PlayerInstance } from '@/engine/inazuma/types'

export default function SignatureChain({ baseId, player, level, rarity }: {
  baseId: string
  /** Con instancia: potencias EFECTIVAS (mejoras) y su estado real. */
  player?: PlayerInstance
  /** Sin instancia (carta de fichaje): nivel y rareza CON LOS QUE LLEGARÍA. */
  level?: number
  rarity?: number
}) {
  const chain = getPlayerBase(baseId).signature ?? []
  if (!chain.length) {
    return <div className="text-[11px] text-slate-600">Sin cadena de supertécnicas.</div>
  }
  const lvl = player?.level ?? level ?? 1
  const rar = player ? rarityOf(player) : (rarity ?? 1)
  const knows = (id: string) => player?.techniques.includes(id) ?? false

  return (
    <div className="flex flex-col">
      {chain.map((id, i) => {
        const t = getTechnique(id)
        if (!t) return null
        const info = ELEMENT_INFO[t.element]
        const need = signatureLevelFor(baseId, i)
        const needRarity = Math.min(MAX_RARITY, i + 1)
        const learned = knows(id)
        const faltaNivel = lvl < need
        const faltaRareza = rar < needRarity
        const ready = !learned && !faltaNivel && !faltaRareza
        return (
          <div key={id} className="flex items-stretch gap-2">
            {/* La ESCALERA: número del paso y el hilo que baja al siguiente. */}
            <div className="flex flex-col items-center w-5 shrink-0">
              <span
                className={`grid place-items-center w-5 h-5 rounded-full text-[9px] font-black shrink-0 mt-1.5 ${
                  learned ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/60'
                    : ready ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {i + 1}
              </span>
              {i < chain.length - 1 && <span className="flex-1 w-px bg-slate-700/70 my-0.5" />}
            </div>
            <div
              onClick={(e) => { e.stopPropagation(); useTechSheet.getState().open(t, player) }}
              className={`flex-1 min-w-0 mb-1.5 flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer active:scale-[0.99] transition ${learned ? '' : 'opacity-75'}`}
              style={rarityChipStyle(needRarity, learned ? `${info.color}12` : 'rgba(30,41,59,0.45)')}
            >
              <TechniqueBadge tech={t} size={30} holder={player} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <TechIcons tech={t} className="w-3.5 h-3.5" />
                  <span className="font-bold text-[12px]" style={{ color: learned ? info.color : undefined }}>
                    {t.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {player ? techniquePower(player, t) : t.power} pot. · {player ? techniqueCostFor(player, t) : t.cost} PT
                  </span>
                  {player && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-emerald-300/90">
                      <Icon name="swords" className="w-2.5 h-2.5" /> {realTechniquePower(player, t)}
                    </span>
                  )}
                </div>
                {/* El estado del paso, en UNA línea. */}
                <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                  {learned ? (
                    <span className="text-emerald-300 font-bold">✓ aprendida</span>
                  ) : ready ? (
                    <span className="text-amber-300 font-bold">lista para despertar</span>
                  ) : (
                    <>
                      <span className={faltaNivel ? 'text-rose-300/90' : 'text-emerald-300/80'}>nivel {need}</span>
                      <span className="text-slate-600">·</span>
                      <Icon name="lock" className="w-3 h-3" style={{ color: rarityBorder(needRarity) }} />
                      <span
                        className="font-extrabold uppercase tracking-widest"
                        style={{ color: faltaRareza ? rarityBorder(needRarity) : undefined }}
                      >
                        {RARITY_LABEL[needRarity]}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
