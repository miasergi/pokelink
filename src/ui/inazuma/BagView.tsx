// MOCHILA: todo lo que llevas encima y aún no has aplicado a nadie.
//
// Dos apartados, porque son dos cosas distintas:
//  - OBJETOS: equipables (se los pones a un jugador y se los queda) y de un
//    solo uso (bebidas, planes de entrenamiento, Mejora, Manual avanzado).
//  - SUPERTÉCNICAS: las que te encuentras por el mapa. Se guardan aquí hasta
//    que decides a quién enseñárselas — antes había que elegir destinatario en
//    el acto, que es justo cuando menos información tienes.
import { useState } from 'react'
import { Button, Card } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { PlayerRow } from '@/ui/inazuma/PlayerCard'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { ELEMENT_ICON, ItemIcon, rarityBorder, TechniqueBadge } from '@/ui/inazuma/Glyphs'
import { signatureNext } from '@/engine/inazuma/game'
import { canUpgradeTechnique, MAX_RARITY, RARITY_LABEL, rarityOf, techLevel } from '@/engine/inazuma/roster'
import { getItem } from '@/data/inazuma/items'
import { getTechnique, KIND_LABEL } from '@/data/inazuma/techniques'
import { getPlayerBase, PLAYERS, TEAM_NAMES } from '@/data/inazuma/players'
import { TEAM_BY_ID } from '@/data/inazuma/teams'
import type { PlayerInstance } from '@/engine/inazuma/types'

/** Nombre visible del equipo de origen (institutos, extras o agente libre). */
const TEAM_LABEL = (teamId: string): string =>
  TEAM_BY_ID.get(teamId)?.name ?? TEAM_NAMES[teamId] ?? (teamId === 'libre' ? 'Agente libre' : teamId)

type Pending =
  | { kind: 'item'; id: string }
  /** Mejora con varias técnicas mejorables: segundo paso, elegir CUÁL. */
  | { kind: 'mejora-tech'; uid: string }
  /** Fichaje estrella: buscador sobre el catálogo entero. */
  | { kind: 'estrella' }
  | null

export default function BagView() {
  const { save, goTo, equip, useConsumable, convertLegacyTechniques, useFichajeEstrella } = useInazuma()
  const [pending, setPending] = useState<Pending>(null)
  // Buscador del Fichaje estrella.
  const [query, setQuery] = useState('')
  if (!save) return null

  const empty = !save.bag.length && !save.techniqueBag.length

  // Duplicados AGRUPADOS con contador: tres bebidas eran tres tarjetas
  // idénticas y al usar una parecía que las otras «se gastaban solas» (no se
  // veía cuántas quedaban ni cuál se iba). Cada uso gasta exactamente UNA.
  const grouped = (ids: string[]): { id: string; count: number }[] => {
    const out: { id: string; count: number }[] = []
    for (const id of ids) {
      const g = out.find((x) => x.id === id)
      if (g) g.count += 1
      else out.push({ id, count: 1 })
    }
    return out
  }

  /** ¿A quién tiene sentido dárselo? Filtra para no dejar elegir en balde. */
  const eligible = (p: PlayerInstance): string | null => {
    if (!pending || pending.kind !== 'item') return null
    if (pending.id === 'mejora') {
      return p.techniques.some((t) => canUpgradeTechnique(p, t)) ? null : 'Sin técnicas que mejorar'
    }
    if (pending.id === 'manual-avanzado') {
      return signatureNext(p) ? null : 'Cadena completa'
    }
    if (pending.id === 'medalla-rareza') {
      if (rarityOf(p) >= MAX_RARITY) return 'Ya es Legendario'
      const need = rarityOf(p)
      const have = save.bag.filter((x) => x === 'medalla-rareza').length
      return have >= need ? null : `Pide ${need} medallas (llevas ${have})`
    }
    return null
  }

  const apply = (uid: string) => {
    if (!pending || pending.kind !== 'item') return
    const kind = getItem(pending.id)?.kind
    if (kind === 'equipo' || kind === 'raro') { equip(uid, pending.id); setPending(null); return }
    if (pending.id === 'mejora') {
      // Con más de una técnica mejorable, la elección es del jugador: antes
      // caía en silencio a la primera aprendida.
      const p = save.roster.find((x) => x.uid === uid)
      const ups = p ? p.techniques.filter((t) => canUpgradeTechnique(p, t)) : []
      if (ups.length > 1) { setPending({ kind: 'mejora-tech', uid }); return }
    }
    useConsumable(pending.id, uid)
    setPending(null)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 flex items-center gap-2">
        <Icon name="bag" className="w-5 h-5 text-amber-300" />
        <div className="font-extrabold text-sm">Mochila</div>
        <span className="ml-auto text-sm font-bold text-amber-300 tabular-nums">
          {save.coins.toLocaleString('es-ES')} ₽
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-3">
        {empty && (
          <div className="text-center text-slate-500 text-sm py-10">
            La mochila está vacía.<br />
            <span className="text-[11px] text-slate-600">
              Las casillas de objeto del mapa la van llenando.
            </span>
          </div>
        )}

        {/* Las técnicas sueltas están SUPRIMIDAS (solo se aprende por cadena):
            si una partida vieja aún guarda alguna, se cambian por Manuales. */}
        {save.techniqueBag.length > 0 && (
          <button
            onClick={convertLegacyTechniques}
            className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-left text-[12px] text-amber-200 active:scale-[0.99] transition"
          >
            <b>{save.techniqueBag.length} supertécnica{save.techniqueBag.length > 1 ? 's' : ''} suelta{save.techniqueBag.length > 1 ? 's' : ''} de una versión anterior.</b>
            <span className="block text-[11px] text-slate-300">
              Las técnicas ya solo se aprenden por CADENA: toca para cambiarlas por Manuales avanzados.
            </span>
          </button>
        )}

        {save.bag.length > 0 && (
          <>
            <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">
              Objetos · {save.bag.length}
            </div>
            {grouped(save.bag).map(({ id, count }) => {
              const item = getItem(id)
              if (!item) return null
              return (
                <Card
                  key={id}
                  className="p-3"
                  onClick={() => setPending(id === 'fichaje-estrella' ? { kind: 'estrella' } : { kind: 'item', id })}
                >
                  <div className="flex items-center gap-2.5">
                    <ItemIcon itemId={id} className="w-6 h-6 shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm">
                        {item.name}
                        {count > 1 && <span className="ml-1.5 text-[11px] font-extrabold text-amber-300">×{count}</span>}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </div>
                    <span className="text-[10px] text-emerald-300 shrink-0">
                      {item.kind === 'equipo' || item.kind === 'raro' ? 'Equipar ›' : 'Usar ›'}
                    </span>
                  </div>
                </Card>
              )
            })}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom flex gap-2">
        <Button variant="secondary" onClick={() => goTo('squad')}>Vestuario</Button>
        <Button variant="primary" full onClick={() => goTo('map')}>Volver al mapa</Button>
      </div>

      {/* A quién se lo doy */}
      {pending && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setPending(null)}>
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4 max-h-[82svh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPending(null)}
              className="absolute top-2 right-2 z-10 grid place-items-center w-7 h-7 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 active:scale-95"
            >
              <Icon name="x" className="w-4 h-4" />
            </button>
            {pending.kind === 'estrella' ? (() => {
              // FICHAJE ESTRELLA: buscador sobre el catálogo entero (los que
              // ya tienes no salen).
              const owned = new Set(save.roster.map((p) => p.baseId))
              const q = query.trim().toLowerCase()
              const pool = PLAYERS.filter((b) => !owned.has(b.id))
              const hits = (q ? pool.filter((b) => b.name.toLowerCase().includes(q)) : pool).slice(0, 30)
              return (
                <>
                  <div className="font-extrabold text-center">Fichaje estrella</div>
                  <p className="text-[11px] text-slate-400 text-center mb-2">
                    Busca al jugador EXACTO que quieres: llega en Normal, al nivel de tu plantilla.
                  </p>
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nombre del jugador…"
                    className="mb-2 w-full rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-[13px] outline-none focus:border-amber-500/60"
                  />
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-1.5">
                    {hits.map((b) => {
                      const info = ELEMENT_INFO[b.element]
                      return (
                        <button
                          key={b.id}
                          onClick={() => { useFichajeEstrella(b.id); setPending(null); setQuery('') }}
                          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-left active:scale-[0.98] transition"
                        >
                          <span className="w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-slate-600 grid place-items-center bg-slate-900">
                            <img
                              src={`${import.meta.env.BASE_URL}inazuma/players/${b.id}.png`}
                              className="w-full h-full object-cover object-top"
                              alt={b.name}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-bold truncate">{b.name}</span>
                            <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                              {b.position}
                              <Icon name={ELEMENT_ICON[b.element]} className="w-3 h-3" style={{ color: info.color }} />
                              {TEAM_LABEL(b.team)}
                            </span>
                          </span>
                          <Icon name="arrowRight" className="w-4 h-4 text-slate-500 shrink-0" />
                        </button>
                      )
                    })}
                    {!hits.length && (
                      <div className="text-center text-[11px] text-slate-500 py-6">Nadie se llama así (o ya es tuyo).</div>
                    )}
                  </div>
                </>
              )
            })() : pending.kind === 'mejora-tech' ? (() => {
              // PASO 2 de la Mejora: elegir QUÉ técnica sube de nivel.
              const p = save.roster.find((x) => x.uid === pending.uid)
              if (!p) return null
              const ups = p.techniques.filter((t) => canUpgradeTechnique(p, t))
              return (
                <>
                  <div className="font-extrabold text-center">¿Qué técnica mejora {playerName(p)}?</div>
                  <p className="text-[11px] text-slate-400 text-center mb-2">+25 % de potencia a la elegida</p>
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-1.5">
                    {ups.map((id) => {
                      const t = getTechnique(id)
                      if (!t) return null
                      const info = ELEMENT_INFO[t.element]
                      return (
                        <button
                          key={id}
                          onClick={() => { useConsumable('mejora', p.uid, id); setPending(null) }}
                          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-left active:scale-[0.98] transition"
                        >
                          <TechniqueBadge tech={t} size={36} holder={p} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-bold" style={{ color: info.color }}>{t.name}</span>
                            <span className="block text-[10px] text-slate-400">
                              {KIND_LABEL[t.kind]} · V{techLevel(p, id) + 1} → V{techLevel(p, id) + 2}
                            </span>
                          </span>
                          <Icon name="arrowRight" className="w-4 h-4 text-slate-500 shrink-0" />
                        </button>
                      )
                    })}
                  </div>
                </>
              )
            })() : (
              <>
                <div className="font-extrabold text-center">{getItem(pending.id)?.name}</div>
                <p className="text-[11px] text-slate-400 text-center mb-2">Elige a quién se lo das</p>
                {/* La REGLA de la medalla, delante: sin esto, «pide 3
                    medallas» parecía un capricho («no entiendo esto»). */}
                {pending.kind === 'item' && pending.id === 'medalla-rareza' && (
                  <div className="mb-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-center">
                    <div className="text-[12px] font-bold text-amber-200 flex items-center justify-center gap-1.5">
                      <ItemIcon itemId="medalla-rareza" className="w-4 h-4" />
                      Llevas {save.bag.filter((x) => x === 'medalla-rareza').length} medallas
                    </div>
                    <div className="text-[10px] text-slate-300 leading-snug">
                      Subir cuesta según la rareza actual:{' '}
                      <b style={{ color: rarityBorder(1) }}>Normal</b> 1 ·{' '}
                      <b style={{ color: rarityBorder(2) }}>Avanzado</b> 2 ·{' '}
                      <b style={{ color: rarityBorder(3) }}>Ídolo</b> 3
                    </div>
                  </div>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-1.5">
                  {save.roster.map((p) => {
                    const why = eligible(p)
                    // Su equipamiento ACTUAL, a la vista: al repartir objetos
                    // hay que saber quién lleva ya algo (y qué le pisarías).
                    const worn = p.item ? getItem(p.item) : undefined
                    const isGear = pending.kind === 'item' && ['equipo', 'raro'].includes(getItem(pending.id)?.kind ?? '')
                    return (
                      <div key={p.uid} className="flex items-center gap-2">
                        <PlayerRow
                          player={p}
                          className="flex-1 min-w-0"
                          dimmed={!!why}
                          onClick={why ? undefined : () => apply(p.uid)}
                          right={
                            <span className="flex flex-col items-end gap-0.5">
                              {isGear && (
                                worn
                                  ? <span className="flex items-center gap-1 text-[9px] text-amber-300"><ItemIcon itemId={p.item!} className="w-4 h-4" />lleva</span>
                                  : <span className="text-[9px] text-slate-600">sin objeto</span>
                              )}
                              {!isGear && worn && <ItemIcon itemId={p.item!} className="w-4 h-4 opacity-80" />}
                              {pending.kind === 'item' && pending.id === 'medalla-rareza'
                                ? <MedalHint player={p} have={save.bag.filter((x) => x === 'medalla-rareza').length} />
                                : why
                                  ? <span className="text-[9px] text-slate-500 text-right leading-tight">{why}</span>
                                  : pending.kind === 'item' && pending.id === 'mejora'
                                    ? <UpgradeHint player={p} />
                                    : null}
                            </span>
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Qué hace la Medalla EN ESTE jugador: su rareza actual → la siguiente, y el
 * coste con lo que te falta si no llega. Antes solo salía «pide 3 medallas»
 * sin decir de dónde salía el número.
 */
export function MedalHint({ player, have }: { player: PlayerInstance; have: number }) {
  const tier = rarityOf(player)
  if (tier >= MAX_RARITY) {
    return <span className="text-[9px] text-slate-500 text-right leading-tight">Ya es {RARITY_LABEL[MAX_RARITY]}</span>
  }
  const cost = tier
  const short = cost - have
  return (
    <span className="text-[9px] text-right leading-tight flex flex-col items-end gap-0.5">
      <span>
        <b style={{ color: rarityBorder(tier) }}>{RARITY_LABEL[tier]}</b>
        <span className="text-slate-500"> → </span>
        <b style={{ color: rarityBorder(tier + 1) }}>{RARITY_LABEL[tier + 1]}</b>
      </span>
      <span className={`inline-flex items-center gap-0.5 font-bold ${short > 0 ? 'text-rose-300' : 'text-amber-300'}`}>
        {cost}× <ItemIcon itemId="medalla-rareza" className="w-3.5 h-3.5" />
        {short > 0 && <span className="text-rose-300"> · te faltan {short}</span>}
      </span>
    </span>
  )
}

/** Qué técnica recibiría la Mejora, para que no sea una caja negra. */
function UpgradeHint({ player }: { player: PlayerInstance }) {
  const target = player.techniques.find((t) => canUpgradeTechnique(player, t))
  if (!target) return null
  const t = getTechnique(target)
  if (!t) return null
  return (
    <span className="text-[9px] text-amber-300 text-right leading-tight">
      {t.name}
      <br />
      <span className="text-slate-500">nivel {techLevel(player, target)} → {techLevel(player, target) + 1}</span>
    </span>
  )
}

/** Nombre del jugador, por si hace falta fuera. */
export function playerName(p: PlayerInstance): string {
  return getPlayerBase(p.baseId).name
}
