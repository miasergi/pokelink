// CASILLA DE SUPERTÉCNICA ESPECIAL, rediseñada para leerse de un vistazo:
// UNA lista con toda la plantilla, la CADENA de cada jugador dibujada en su
// fila (lo aprendido en color, lo siguiente latiendo, lo lejano apagado) y la
// acción a la derecha. Un toque en la fila ofrece las DOS cosas:
//   · despertar el SIGUIENTE paso de su cadena, o
//   · MEJORAR una técnica que ya tenga (V2, V3…).
// DECIDES TÚ: antes la casilla imponía despertar mientras quedara cadena y
// solo dejaba mejorar al completarla, así que no había forma de reforzar la
// técnica que de verdad usas hasta el final del torneo.
import { useState } from 'react'
import { useInazuma } from '@/state/inazumaStore'
import { Button, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { signatureNext } from '@/engine/inazuma/game'
import {
  canUpgradeTechnique, MAX_RARITY, RARITY_LABEL, rarityOf, reachableChain, realTechniquePower, techLevel, techniqueCostFor,
} from '@/engine/inazuma/roster'
import { getTechnique } from '@/data/inazuma/techniques'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { getPlayerBase } from '@/data/inazuma/players'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { ELEMENT_ICON, Pic, rarityBorder, rarityChipStyle, TechIcons, TechniqueBadge } from '@/ui/inazuma/Glyphs'
import type { PlayerInstance } from '@/engine/inazuma/types'

export default function FirmaView() {
  const { save, resolveFirma, resolveFirmaUpgrade, skipNode, goTo } = useInazuma()
  // Dos pasos: QUÉ hacer con ese jugador y, si es mejorar, CUÁL de sus técnicas.
  const [pick, setPick] = useState<
    { uid: string; name: string; next?: { id: string; name: string }; ups: string[] } | null
  >(null)
  const [choose, setChoose] = useState<{ uid: string; name: string; ups: string[] } | null>(null)
  if (!save) return null

  // Qué le toca a cada uno: despertar, mejorar o nada.
  // Las dos vías son INDEPENDIENTES: se puede tener cadena por despertar y
  // además técnicas mejorables, y la casilla ofrece ambas.
  const rows = save.roster.map((p) => {
    const next = signatureNext(p)
    const ups = p.techniques.filter((t) => canUpgradeTechnique(p, t))
    return { p, next, ups }
  })
  const actionable = rows.filter((r) => r.next || r.ups.length)
  const nothing = actionable.length === 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 flex items-center gap-2">
        <Pic name="node-firma" className="w-5 h-5" />
        <div className="min-w-0">
          <div className="font-extrabold text-sm">Supertécnica Especial</div>
          <div className="text-[10px] text-slate-500">
            Un toque y eliges: que despierte su siguiente técnica o que mejore una que ya tenga.
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-2">
        {rows.map(({ p, next, ups }) => (
          <FirmaRow
            key={p.uid}
            player={p}
            next={next ?? undefined}
            upgradeIds={ups}
            onPick={() => {
              const name = getPlayerBase(p.baseId).name
              // Con las dos vías abiertas se pregunta; con una sola no se
              // marea con un menú de una opción.
              if (next && ups.length) { setPick({ uid: p.uid, name, next, ups }); return }
              if (next) { resolveFirma(p.uid); return }
              // Se ELIGE cuál SIEMPRE (aunque solo haya una candidata): que
              // se vea qué vas a mejorar antes de gastar la casilla.
              if (ups.length) setChoose({ uid: p.uid, name, ups })
            }}
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

      {/* PRIMER PASO: ¿despertar o mejorar? Solo aparece cuando ese jugador
          puede hacer las dos cosas. */}
      {pick && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setPick(null)}>
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPick(null)}
              className="absolute top-2 right-2 z-10 grid place-items-center w-7 h-7 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 active:scale-95"
            >
              <Icon name="x" className="w-4 h-4" />
            </button>
            <div className="font-extrabold text-center">¿Qué entrena {pick.name}?</div>
            <p className="text-[11px] text-slate-400 text-center mb-3">La casilla se gasta con lo que elijas.</p>
            <div className="flex flex-col gap-2">
              {pick.next && (
                <button
                  onClick={() => { resolveFirma(pick.uid); setPick(null) }}
                  className="flex items-center gap-2.5 rounded-2xl border border-fuchsia-500/50 bg-fuchsia-500/10 px-3 py-2.5 text-left active:scale-[0.98] transition"
                >
                  {getTechnique(pick.next.id) && <TechniqueBadge tech={getTechnique(pick.next.id)!} size={40} silent />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] uppercase tracking-widest text-fuchsia-300 font-extrabold">Despertar</span>
                    <span className="block text-[13px] font-bold text-fuchsia-100 truncate">{pick.next.name}</span>
                    <span className="block text-[10px] text-slate-400">Una supertécnica NUEVA de su cadena</span>
                  </span>
                  <Icon name="arrowRight" className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              )}
              <button
                onClick={() => { setChoose({ uid: pick.uid, name: pick.name, ups: pick.ups }); setPick(null) }}
                className="flex items-center gap-2.5 rounded-2xl border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-left active:scale-[0.98] transition"
              >
                <span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl border border-amber-400/50 bg-slate-900">
                  <Icon name="bolt" className="w-5 h-5 text-amber-300" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] uppercase tracking-widest text-amber-300 font-extrabold">Mejorar</span>
                  <span className="block text-[13px] font-bold text-amber-100">
                    Una de las {pick.ups.length} que ya tiene
                  </span>
                  <span className="block text-[10px] text-slate-400">+25 % de potencia y −15 % de coste</span>
                </span>
                <Icon name="arrowRight" className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEGUNDO PASO: ¿qué técnica mejora? */}
      {choose && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setChoose(null)}>
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4 max-h-[80svh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setChoose(null)}
              className="absolute top-2 right-2 z-10 grid place-items-center w-7 h-7 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 active:scale-95"
            >
              <Icon name="x" className="w-4 h-4" />
            </button>
            <div className="font-extrabold text-center">¿Qué técnica mejora {choose.name}?</div>
            <p className="text-[11px] text-slate-400 text-center mb-2">+25 % de potencia y −15 % de coste a la elegida</p>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-1.5">
              {choose.ups.map((id) => {
                const t = getTechnique(id)
                const p = save.roster.find((x) => x.uid === choose.uid)
                if (!t || !p) return null
                return (
                  <button
                    key={id}
                    onClick={() => { resolveFirmaUpgrade(choose.uid, id); setChoose(null) }}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-left active:scale-[0.98] transition"
                  >
                    <TechniqueBadge tech={t} size={36} holder={p} silent />
                    <span className="min-w-0 flex-1">
                      <span className="text-[13px] font-bold flex items-center gap-1">
                        <TechIcons tech={t} className="w-3 h-3" />
                        {t.name}
                      </span>
                      {/* CÓMO QUEDARÍA: potencia real y coste, antes → después.
                          Se decide sobre números, no a ciegas. */}
                      {(() => {
                        const up = { ...p, techLevels: { ...(p.techLevels ?? {}), [id]: techLevel(p, id) + 1 } }
                        return (
                          <span className="block text-[10px] text-slate-400">
                            V{techLevel(p, id) + 1} → V{techLevel(p, id) + 2}
                            {' · '}
                            <span className="inline-flex items-center gap-0.5 text-emerald-300 font-bold">
                              <Icon name="swords" className="w-2.5 h-2.5" /> {realTechniquePower(p, t)} → {realTechniquePower(up, t)}
                            </span>
                            {' · '}
                            {techniqueCostFor(p, t)} → {techniqueCostFor(up, t)} PT
                          </span>
                        )
                      })()}
                    </span>
                    <Icon name="arrowRight" className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Fila de un jugador: retrato con su marco de rareza, su CADENA en badges (lo
 * aprendido encendido, lo siguiente latiendo, lo capado por rareza apagado con
 * el color del tramo que lo abre) y la acción grande a la derecha.
 */
function FirmaRow({ player, next, upgradeIds, onPick }: {
  player: PlayerInstance
  next?: { id: string; name: string }
  /** Técnicas suyas que admiten Mejora (pueden convivir con `next`). */
  upgradeIds: string[]
  onPick: () => void
}) {
  const base = getPlayerBase(player.baseId)
  const chain = base.signature ?? []
  const reachable = new Set(reachableChain(player))
  const tier = rarityOf(player)
  const upTech = upgradeIds.length ? getTechnique(upgradeIds[0]) : undefined
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
            {/* Elemento y nivel A LA VISTA: se decide con datos, no de memoria. */}
            <Icon
              name={ELEMENT_ICON[base.element]}
              className="w-3 h-3 shrink-0"
              style={{ color: ELEMENT_INFO[base.element].color }}
            />
            <span className="text-[10px] text-slate-400 shrink-0">Nv.{player.level}</span>
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
                  <TechniqueBadge tech={t} size={26} holder={player} />
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
          {upTech && (
            <div className={next ? 'mt-1 pt-1 border-t border-white/10' : ''}>
              <div className="text-[9px] uppercase tracking-widest text-amber-300 font-extrabold">
                {next ? 'o mejora' : 'Mejora'}
              </div>
              <div className="text-[11px] font-bold text-amber-100 leading-tight truncate">
                <TechIcons tech={upTech} className="w-2.5 h-2.5 mr-0.5" />
                {upgradeIds.length > 1
                  ? `${upgradeIds.length} técnicas`
                  : `${upTech.name} → V${techLevel(player, upgradeIds[0]) + 2}`}
              </div>
            </div>
          )}
          {!actionable && (
            <div className="text-[10px] text-slate-500">Al máximo</div>
          )}
        </div>
      </div>
    </button>
  )
}
