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
import { ItemIcon, TechniqueBadge } from '@/ui/inazuma/Glyphs'
import { learnBlocker, signatureNext } from '@/engine/inazuma/game'
import { canUpgradeTechnique, techLevel } from '@/engine/inazuma/roster'
import { getItem } from '@/data/inazuma/items'
import { getTechnique, KIND_LABEL } from '@/data/inazuma/techniques'
import { getPlayerBase } from '@/data/inazuma/players'
import type { PlayerInstance } from '@/engine/inazuma/types'

type Pending =
  | { kind: 'item'; id: string }
  | { kind: 'tech'; id: string }
  | null

export default function BagView() {
  const { save, goTo, equip, useConsumable, teachTechnique } = useInazuma()
  const [pending, setPending] = useState<Pending>(null)
  if (!save) return null

  const empty = !save.bag.length && !save.techniqueBag.length

  /** ¿A quién tiene sentido dárselo? Filtra para no dejar elegir en balde. */
  const eligible = (p: PlayerInstance): string | null => {
    if (!pending) return null
    if (pending.kind === 'tech') {
      // El motivo REAL (demarcación o elemento), no un mensaje genérico: si a
      // un delantero de fuego no le cabe una técnica de bosque, hay que decirlo.
      return learnBlocker(p, pending.id)
    }
    if (pending.id === 'mejora') {
      return p.techniques.some((t) => canUpgradeTechnique(p, t)) ? null : 'Sin técnicas que mejorar'
    }
    if (pending.id === 'manual-avanzado') {
      return signatureNext(p) ? null : 'Cadena completa'
    }
    return null
  }

  const apply = (uid: string) => {
    if (!pending) return
    const kind = getItem(pending.id)?.kind
    if (pending.kind === 'tech') teachTechnique(pending.id, uid)
    else if (kind === 'equipo' || kind === 'raro') equip(uid, pending.id)
    else useConsumable(pending.id, uid)
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

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-3">
        {empty && (
          <div className="text-center text-slate-500 text-sm py-10">
            La mochila está vacía.<br />
            <span className="text-[11px] text-slate-600">
              Las casillas de objeto y de supertécnica del mapa la van llenando.
            </span>
          </div>
        )}

        {save.techniqueBag.length > 0 && (
          <>
            <div className="text-[11px] uppercase tracking-widest text-slate-500">
              Supertécnicas · {save.techniqueBag.length}
            </div>
            {save.techniqueBag.map((id, i) => {
              const t = getTechnique(id)
              if (!t) return null
              const info = ELEMENT_INFO[t.element]
              return (
                <Card key={`${id}-${i}`} className="p-3" onClick={() => setPending({ kind: 'tech', id })}>
                  <div className="flex items-center gap-2.5">
                    <TechniqueBadge tech={t} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm" style={{ color: info.color }}>{t.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {KIND_LABEL[t.kind]} · potencia {t.power} · {t.cost} PT
                      </div>
                      {t.desc && <div className="text-[10px] text-slate-500 italic mt-0.5">{t.desc}</div>}
                    </div>
                    <span className="text-[10px] text-emerald-300 shrink-0">Enseñar ›</span>
                  </div>
                </Card>
              )
            })}
          </>
        )}

        {save.bag.length > 0 && (
          <>
            <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">
              Objetos · {save.bag.length}
            </div>
            {save.bag.map((id, i) => {
              const item = getItem(id)
              if (!item) return null
              return (
                <Card key={`${id}-${i}`} className="p-3" onClick={() => setPending({ kind: 'item', id })}>
                  <div className="flex items-center gap-2.5">
                    <ItemIcon itemId={id} className="w-6 h-6 shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm">{item.name}</div>
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
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4 max-h-[85%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="font-extrabold text-center">
              {pending.kind === 'tech' ? getTechnique(pending.id)?.name : getItem(pending.id)?.name}
            </div>
            <p className="text-[11px] text-slate-400 text-center mb-2">
              {pending.kind === 'tech'
                ? 'Solo puede aprenderla quien comparta demarcación y elemento con la técnica'
                : 'Elige a quién se lo das'}
            </p>
            <div className="overflow-y-auto no-scrollbar flex flex-col gap-1.5">
              {save.roster.map((p) => {
                const why = eligible(p)
                return (
                  <div key={p.uid} className="flex items-center gap-2">
                    <PlayerRow
                      player={p}
                      className="flex-1 min-w-0"
                      dimmed={!!why}
                      onClick={why ? undefined : () => apply(p.uid)}
                      right={
                        why
                          ? <span className="text-[9px] text-slate-500 text-right leading-tight">{why}</span>
                          : pending.id === 'mejora'
                            ? <UpgradeHint player={p} />
                            : undefined
                      }
                    />
                  </div>
                )
              })}
            </div>
            <Button variant="ghost" full className="mt-2" onClick={() => setPending(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
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
