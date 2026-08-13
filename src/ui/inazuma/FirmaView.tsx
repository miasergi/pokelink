// CASILLA DE SUPERTÉCNICA ESPECIAL, rediseñada para leerse de un vistazo:
// UNA lista con toda la plantilla, la CADENA de cada jugador dibujada en su
// fila (lo aprendido en color, lo siguiente latiendo, lo lejano apagado) y la
// acción a la derecha. Un toque en la fila ejecuta:
//   · despertar el SIGUIENTE paso de su cadena, o
//   · si la tiene completa, MEJORAR una técnica (V2, V3…).
// Antes había dos listas separadas y ni se veía qué cadena tenía cada uno.
import { useInazuma } from '@/state/inazumaStore'
import { Button, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { signatureNext } from '@/engine/inazuma/game'
import {
  canUpgradeTechnique, MAX_RARITY, RARITY_LABEL, rarityOf, reachableChain, techLevel,
} from '@/engine/inazuma/roster'
import { getTechnique } from '@/data/inazuma/techniques'
import { getPlayerBase } from '@/data/inazuma/players'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { Pic, rarityBorder, rarityChipStyle, TechIcons, TechniqueBadge } from '@/ui/inazuma/Glyphs'
import type { PlayerInstance } from '@/engine/inazuma/types'

export default function FirmaView() {
  const { save, resolveFirma, resolveFirmaUpgrade, skipNode, goTo } = useInazuma()
  if (!save) return null

  // Qué le toca a cada uno: despertar, mejorar o nada.
  const rows = save.roster.map((p) => {
    const next = signatureNext(p)
    const up = next ? undefined : p.techniques.find((t) => canUpgradeTechnique(p, t))
    return { p, next, up }
  })
  const actionable = rows.filter((r) => r.next || r.up)
  const nothing = actionable.length === 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 flex items-center gap-2">
        <Pic name="node-firma" className="w-5 h-5" />
        <div className="min-w-0">
          <div className="font-extrabold text-sm">Supertécnica Especial</div>
          <div className="text-[10px] text-slate-500">
            Un toque y ese jugador entrena: despierta su siguiente técnica (o la mejora).
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-2">
        {rows.map(({ p, next, up }) => (
          <FirmaRow
            key={p.uid}
            player={p}
            next={next ?? undefined}
            upgradeId={up}
            onPick={() => (next ? resolveFirma(p.uid) : up ? resolveFirmaUpgrade(p.uid) : undefined)}
          />
        ))}

        {nothing && (
          <div className="text-center text-slate-500 text-sm py-8">
            Toda la plantilla tiene su cadena completa y sus técnicas al máximo.
            No queda nada que entrenar aquí.
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom">
        {nothing
          ? <Button variant="primary" full onClick={skipNode}>Pasar de largo</Button>
          : <Button variant="ghost" full onClick={() => goTo('map')}>Dejarlo para otro día</Button>}
      </div>
    </div>
  )
}

/**
 * Fila de un jugador: retrato con su marco de rareza, su CADENA en badges (lo
 * aprendido encendido, lo siguiente latiendo, lo capado por rareza apagado con
 * el color del tramo que lo abre) y la acción grande a la derecha.
 */
function FirmaRow({ player, next, upgradeId, onPick }: {
  player: PlayerInstance
  next?: { id: string; name: string }
  upgradeId?: string
  onPick: () => void
}) {
  const base = getPlayerBase(player.baseId)
  const chain = base.signature ?? []
  const reachable = new Set(reachableChain(player))
  const tier = rarityOf(player)
  const upTech = upgradeId ? getTechnique(upgradeId) : undefined
  const actionable = !!next || !!upTech

  return (
    <button
      onClick={actionable ? onPick : undefined}
      disabled={!actionable}
      className={`w-full rounded-2xl p-2 text-left transition ${
        actionable ? 'active:scale-[0.99]' : 'opacity-50'
      }`}
      style={rarityChipStyle(tier, 'rgba(15,23,42,0.8)')}
    >
      <div className="flex items-center gap-2">
        <span className="w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-slate-600 grid place-items-center bg-slate-800">
          <ImgFallback
            src={portraitUrl(player.baseId)}
            className="w-full h-full object-cover object-top"
            alt={base.name}
            fallback={<span className="text-[11px] font-extrabold">{base.name.slice(0, 2).toUpperCase()}</span>}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[13px] truncate">{base.name}</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest shrink-0" style={{ color: rarityBorder(tier) }}>
              {RARITY_LABEL[tier]}
            </span>
          </div>
          {/* La cadena, paso a paso: qué tiene, qué toca, qué está lejos. */}
          <div className="mt-1 flex items-center gap-1 flex-wrap">
            {chain.map((id, i) => {
              const t = getTechnique(id)
              if (!t) return null
              const learnt = player.techniques.includes(id)
              const isNext = next?.id === id
              const locked = !reachable.has(id) && !learnt
              return (
                <span
                  key={id}
                  title={`${t.name}${locked ? ` · pide rareza ${RARITY_LABEL[Math.min(MAX_RARITY, i + 1)]}` : ''}`}
                  className={`relative inline-flex rounded-md ${isNext ? 'animate-pulse' : ''} ${
                    learnt ? '' : isNext ? '' : 'opacity-40'
                  }`}
                  style={rarityChipStyle(Math.min(MAX_RARITY, i + 1), learnt || isNext ? '#0f172a' : 'rgba(15,23,42,0.6)')}
                >
                  <TechniqueBadge tech={t} size={26} />
                  {learnt && (
                    <Icon name="check" className="absolute -top-1 -right-1 w-3 h-3 text-emerald-300 bg-slate-900 rounded-full p-px" />
                  )}
                </span>
              )
            })}
          </div>
        </div>
        {/* LA ACCIÓN, clara: qué pasa si tocas. */}
        <div className="shrink-0 text-right max-w-[104px]">
          {next && (
            <>
              <div className="text-[9px] uppercase tracking-widest text-fuchsia-300 font-extrabold">Despierta</div>
              <div className="text-[11px] font-bold text-fuchsia-100 leading-tight">
                {getTechnique(next.id) && <TechIcons tech={getTechnique(next.id)!} className="w-2.5 h-2.5 mr-0.5" />}
                {next.name}
              </div>
            </>
          )}
          {!next && upTech && (
            <>
              <div className="text-[9px] uppercase tracking-widest text-amber-300 font-extrabold">Mejora</div>
              <div className="text-[11px] font-bold text-amber-100 leading-tight">
                <TechIcons tech={upTech} className="w-2.5 h-2.5 mr-0.5" />
                {upTech.name} → V{techLevel(player, upgradeId!) + 2}
              </div>
            </>
          )}
          {!actionable && (
            <div className="text-[10px] text-slate-500">Al máximo</div>
          )}
        </div>
      </div>
    </button>
  )
}
