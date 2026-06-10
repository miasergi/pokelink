import { useState, useEffect } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar, money } from '@/ui/components/kit'
import { getSpecies, getMove, hasMega } from '@/data'
import { getItem } from '@/data/items'
import Sprite from '@/ui/components/Sprite'
import HpBar from '@/ui/components/HpBar'
import TypeBadge from '@/ui/components/TypeBadge'
import PowerDots from '@/ui/components/PowerDots'
import PartyList from '@/ui/components/PartyList'
import { typeGradient } from '@/ui/theme/types'
import { effectiveEvoLevel, evolutionBlockedByItem } from '@/engine/team/evolution'
import { TYPE_ATTACKS } from '@/data/typeAttacks'
import { effectiveTier, monTypes } from '@/engine/team/leveling'
import { attackCategory } from '@/engine/battle/damage'
import { itemHasEffect, noEffectReason, displayStats } from '@/engine/team/itemEffect'
import CompareModal from '@/ui/components/CompareModal'
import { levelCap } from '@/engine/run/runEngine'

export default function TeamScreen() {
  const { run, back, useItem, useEvolutionItem, equipItem, unequipHeld, setPartyOrder } = useGame()
  const [sel, setSel] = useState<string | null>(null)
  const [selItem, setSelItem] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [msgOk, setMsgOk] = useState(false)
  const [msgIcon, setMsgIcon] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  useEffect(() => { setCompareOpen(false) }, [sel]) // cerrar comparador al cambiar de Pokémon
  if (!run) return null
  const cap = levelCap(run)

  const flash = (text: string, ok: boolean, icon?: string) => { setMsg(text); setMsgOk(ok); setMsgIcon(icon ?? null) }
  // El mensaje se desvanece solo.
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2200)
    return () => clearTimeout(t)
  }, [msg])

  // Aplica un objeto a un Pokémon (despacha por categoría) o explica por qué no.
  /** Devuelve true si el objeto se consumió/aplicó (false si no tuvo efecto). */
  const applyItem = (id: string, uid: string): boolean => {
    const mon = run.party.find((p) => p.uid === uid)
    if (!mon) return false
    const name = getSpecies(mon.speciesId).displayName
    if (!itemHasEffect(id, mon, cap)) {
      flash(`${name}: ${noEffectReason(id, mon, cap)}`, false)
      return false
    }
    const item = getItem(id)
    if (item.category === 'held') { equipItem(id, uid); flash(`Equipaste ${item.name} a ${name}.`, true, item.sprite); return true }
    if (item.category === 'evolution') { useEvolutionItem(id, uid); return true }
    // Consumible: aplica y avisa de lo que hizo (con el icono del objeto).
    const before = { lvl: mon.level }
    useItem(id, uid)
    let did = `Usaste ${item.name} en ${name}.`
    if (id === 'rare-candy' || id === 'super-candy') did = `¡${name} subió de nivel! (era Nv.${before.lvl})`
    else if (id === 'metamorph') did = `¡${getSpecies(run.party.find((p) => p.uid === uid)!.speciesId).displayName} cambió de forma!`
    else if (id === 'upgrade') did = `¡Mejoraste la potencia del ataque de ${name}!`
    else if (id === 'super-upgrade') did = `¡${name} alcanzó la potencia máxima (120)!`
    else if (item.category === 'revive') did = `¡${name} revivió!`
    else if (item.category === 'heal') did = `${name} recuperó PS.`
    flash(did, true, item.sprite)
    return true
  }

  const selMon = run.party.find((p) => p.uid === sel) ?? null
  const selSpecies = selMon ? getSpecies(selMon.speciesId) : null
  const usableItems = Object.entries(run.inventory).filter(([id]) => {
    const c = getItem(id).category
    return c === 'heal' || c === 'revive' || c === 'battle' || c === 'evolution' || c === 'held'
  })
  const hasMegaStone = (run.inventory['mega-stone'] || 0) > 0
  const hasEvoStone = (run.inventory['evo-stone'] || 0) > 0
  const canEvolve = (selSpecies?.evolutions.length ?? 0) > 0
  // Con un objeto seleccionado, atenúa los Pokémon en los que no tendría efecto.
  const ineffectiveUids = selItem && getItem(selItem).category !== 'special'
    ? new Set(run.party.filter((p) => !itemHasEffect(selItem, p, cap)).map((p) => p.uid))
    : undefined

  return (
    <div className="flex flex-col flex-1 relative">
      {msg && (
        <div className={`absolute top-16 left-1/2 -translate-x-1/2 z-[60] max-w-[90%] text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-xl animate-pop-in text-center cursor-pointer flex items-center gap-2 ${msgOk ? 'bg-emerald-600/95' : 'bg-rose-600/95'}`} onClick={() => setMsg(null)}>
          {msgIcon ? <img src={msgIcon} alt="" className="w-6 h-6 shrink-0" style={{ imageRendering: 'pixelated' }} /> : <span>{msgOk ? '✅' : '🚫'}</span>}
          <span>{msg}</span>
        </div>
      )}
      <TopBar
        title="Tu equipo"
        left={<Button variant="ghost" onClick={back}>‹</Button>}
        right={<span className="text-amber-300 font-bold text-sm pr-1">{money(run.money)}</span>}
      />
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 no-scrollbar" onClick={(e) => { if (e.target === e.currentTarget) setSelItem(null) }}>
        <PartyList
          party={run.party}
          selectedUid={sel}
          onSelect={(uid) => {
            // Modo objeto-primero: si hay un objeto elegido, aplícalo al tocar el Pokémon.
            if (selItem) {
              const consumed = applyItem(selItem, uid)
              // Mantén el objeto seleccionado si quedan más unidades.
              const left = (run.inventory[selItem] || 0) - (consumed ? 1 : 0)
              if (left <= 0) setSelItem(null)
            } else setSel(uid === sel ? null : uid)
          }}
          onReorder={setPartyOrder}
          onUnequip={unequipHeld}
          ineffectiveUids={ineffectiveUids}
        />

        {/* Explorador de objetos (toca para leer y luego elige Pokémon) */}
        <div>
          <div className="text-sm font-bold text-slate-300 mb-1.5 px-1">🎒 Mochila</div>
          {selItem && (
            <div className="text-xs bg-sky-500/15 border border-sky-500/40 text-sky-100 rounded-xl px-3 py-2 mb-2">
              <div className="font-bold flex items-center gap-1.5">
                {getItem(selItem).sprite && <img src={getItem(selItem).sprite} alt="" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} />}
                {getItem(selItem).name}
              </div>
              <div className="text-[11px] text-sky-200/90 mt-0.5">{getItem(selItem).description}</div>
              <div className="text-[11px] font-bold mt-1">👆 Toca el Pokémon al que dárselo. <button className="underline" onClick={() => setSelItem(null)}>cancelar</button></div>
            </div>
          )}
          {usableItems.length === 0 && Object.keys(run.inventory).length === 0 && (
            <p className="text-xs text-slate-500 px-1">No tienes objetos. Consíguelos en cofres y tiendas.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {usableItems.map(([id, qty]) => {
              const item = getItem(id)
              return (
                <button
                  key={id}
                  onClick={() => setSelItem(selItem === id ? null : id)}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left active:scale-[0.97] transition ${selItem === id ? 'bg-sky-600/30 border-sky-400' : 'bg-slate-800 border-slate-700'}`}
                >
                  {item.sprite && <img src={item.sprite} alt="" className="w-7 h-7 shrink-0" style={{ imageRendering: 'pixelated' }} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{item.name} <span className="text-slate-500">×{qty}</span></div>
                    <div className="text-[10px] text-slate-400">{item.category === 'held' ? 'equipar' : 'usar'}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Pasivos (se usan solos, p. ej. Salvavidas) */}
          {Object.entries(run.inventory).filter(([id]) => getItem(id).category === 'special').map(([id, qty]) => (
            <div key={id} className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 mt-2">
              {getItem(id).sprite && <img src={getItem(id).sprite} alt="" className="w-7 h-7" style={{ imageRendering: 'pixelated' }} />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">{getItem(id).name} ×{qty} <span className="text-[9px] text-emerald-300/80">(se usa solo)</span></div>
                <div className="text-[10px] text-slate-400">{getItem(id).description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de detalle / objetos del Pokémon seleccionado */}
      {selMon && selSpecies && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setSel(null)}>
          <div className="w-full max-w-md max-h-[92%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end -mb-2 -mt-1"><button aria-label="Cerrar" className="text-slate-400 text-2xl leading-none px-2 active:scale-90" onClick={() => setSel(null)}>✕</button></div>
            <div className="px-0.5">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative rounded-xl p-0.5" style={{ background: typeGradient(selSpecies.types) }}>
                <Sprite speciesId={selMon.speciesId} shiny={selMon.shiny} className="w-14 h-14 object-contain" />
                {selMon.shiny && <span title="Shiny" className="absolute -top-1.5 -right-1.5 text-sm" style={{ filter: 'drop-shadow(0 0 2px #000)' }}>✨</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold truncate">{selSpecies.displayName}</div>
                <div className="flex gap-1 mt-0.5">{monTypes(selMon).map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-slate-400">Nv.{selMon.level}</span>
                {run.party.length > 1 && (
                  <button onClick={() => setCompareOpen(true)} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-700 text-slate-200 active:scale-95">⚖ Comparar</button>
                )}
              </div>
            </div>

            <div className="mb-2"><HpBar current={selMon.currentHp} max={selMon.stats.hp} status={selMon.status} showNumbers /></div>

            {(() => {
              // PS no se muestra aquí (ya está la barra de vida con la cantidad).
              const rows = displayStats(selMon).filter((r) => r.key !== 'hp')
              const anyMod = rows.some((r) => r.eff !== r.base)
              return (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-1">
                    {rows.map((r) => {
                      const color = r.eff > r.base ? 'text-emerald-400' : r.eff < r.base ? 'text-rose-400' : ''
                      return (
                        <div key={r.key} className="flex justify-between">
                          <span className="text-slate-400">{r.label}</span>
                          <span className={`font-bold tabular-nums ${color}`}>
                            {r.eff}{r.eff !== r.base && <span className="text-[9px] text-slate-500 font-normal"> ({r.base})</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {anyMod && <div className="text-[9px] text-slate-500 mb-2">Verde = mejorado por el objeto · rojo = empeorado · (valor base)</div>}
                </>
              )
            })()}

            <div className="grid grid-cols-1 gap-1.5 mb-2">
              {selMon.moves.map((mv) => {
                const m = getMove(mv.moveId)
                return (
                  <div key={mv.moveId} className="rounded-lg bg-slate-900/60 px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <TypeBadge type={m.type} size="sm" />
                      <span className="text-xs font-semibold truncate">{m.displayName}</span>
                      <PowerDots type={m.type} power={m.power} />
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{attackCategory(selMon) === 'physical' ? 'Físico' : 'Especial'} · {m.power}</span>
                  </div>
                )
              })}
            </div>

            {/* Progreso: evolución / megaevolución / próximas mejoras */}
            <div className="rounded-lg bg-slate-900/60 px-2.5 py-2 mb-2 space-y-1 text-[11px]">
              {selSpecies.evolutions.length > 0 ? (
                <>
                  {selSpecies.evolutions.map((evo) => {
                    const req = effectiveEvoLevel(evo.trigger)
                    const target = getSpecies(evo.toId)
                    return (
                      <div key={evo.toId} className="flex items-center gap-1.5">
                        <span>🧬</span>
                        <span>Evoluciona a <b>{target.displayName}</b> <span className="text-slate-400">al Nv.{req}</span></span>
                      </div>
                    )
                  })}
                  {evolutionBlockedByItem(selMon) && (
                    <div className="flex items-center gap-1.5 text-amber-300"><span>🔒</span><span>No evolucionará mientras lleve {getItem(selMon.heldItemId!).name}.</span></div>
                  )}
                </>
              ) : (
                <div className="text-slate-500 flex items-center gap-1.5"><span>🧬</span> Sin evolución (forma final)</div>
              )}
              {hasMega(selMon.speciesId) && (
                <div className="flex items-center gap-1.5"><span>💠</span><span>Puede <b className="text-fuchsia-300">megaevolucionar</b> con Megapiedra (permanente).</span></div>
              )}
              {(() => {
                // El nivel de potencia solo sube con el objeto "Mejora" (no por nivel).
                const curTier = effectiveTier(selMon)
                if (curTier >= 2) return null
                const types = [...new Set(monTypes(selMon))].slice(0, 2)
                const ups = types.map((t) => { const tier = TYPE_ATTACKS[t][curTier + 1]; return `${tier.name} (Pot. ${tier.power})` })
                return (
                  <div className="flex items-start gap-1.5">
                    <span>⚔️</span>
                    <span className="text-slate-300">Con una <b className="text-sky-300">Mejora</b>: {ups.join(' · ')}</span>
                  </div>
                )
              })()}
            </div>

            {/* Objeto equipado */}
            <div className="flex items-center gap-2 rounded-lg bg-slate-900/60 px-2.5 py-1.5 mb-2">
              {selMon.heldItemId ? (
                <>
                  <img src={getItem(selMon.heldItemId).sprite} alt="" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                  <span className="text-xs flex-1 truncate">{getItem(selMon.heldItemId).name}</span>
                  <button className="text-[11px] text-rose-300 font-bold" onClick={() => unequipHeld(selMon.uid)}>Quitar</button>
                </>
              ) : (
                <span className="text-xs text-slate-500">Sin objeto equipado</span>
              )}
            </div>

            {canEvolve && hasEvoStone && !evolutionBlockedByItem(selMon) && (
              <Button variant="success" full className="!py-2 mb-1" onClick={() => useEvolutionItem('evo-stone', selMon.uid)}>
                🪨 Evolucionar (Piedra Evolutiva){getSpecies(selMon.speciesId).evolutions.length > 1 ? ' · elegir' : ''}
              </Button>
            )}
            {hasMega(selMon.speciesId) && hasMegaStone && (
              <Button variant="primary" full className="!py-2" onClick={() => useEvolutionItem('mega-stone', selMon.uid)}>
                💠 Megaevolucionar
              </Button>
            )}
            </div>

            {/* Mochila — objetos aplicables a este Pokémon */}
            <div>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-sm font-bold text-slate-300">🎒 Usar / equipar objeto</span>
            <span className="text-[11px] text-slate-400">a {selSpecies.displayName}</span>
          </div>
          {usableItems.length === 0 && <p className="text-xs text-slate-500 px-1">No tienes objetos. Consíguelos en cofres y tiendas.</p>}

          {/* Pasivos (se usan solos) */}
          {Object.entries(run.inventory).filter(([id]) => getItem(id).category === 'special').map(([id, qty]) => (
            <div key={id} className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 mb-2">
              {getItem(id).sprite && <img src={getItem(id).sprite} alt="" className="w-7 h-7" style={{ imageRendering: 'pixelated' }} />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">{getItem(id).name} ×{qty}</div>
                <div className="text-[10px] text-slate-400">{getItem(id).description}</div>
              </div>
            </div>
          ))}

          {([
            { title: 'Curar · Revivir · Subir nivel', cats: ['heal', 'revive', 'battle'], verb: 'Usar' },
            { title: 'Objetos de batalla (equipar)', cats: ['held'], verb: 'Equipar' },
            { title: 'Evolución', cats: ['evolution'], verb: 'Usar' },
          ] as const).map((group) => {
            const items = usableItems.filter(([id]) => group.cats.includes(getItem(id).category as never))
            if (items.length === 0) return null
            return (
              <div key={group.title} className="mb-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 px-1">{group.title}</div>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(([id, qty]) => {
                    const item = getItem(id)
                    const eff = itemHasEffect(id, selMon, cap)
                    return (
                      <button
                        key={id}
                        onClick={() => applyItem(id, selMon.uid)}
                        className={`flex items-start gap-2 rounded-xl border px-2.5 py-2 text-left active:scale-[0.97] transition ${eff ? 'bg-slate-800 border-slate-700' : 'bg-slate-800/40 border-slate-800 opacity-50'}`}
                      >
                        {item.sprite && <img src={item.sprite} alt="" className={`w-7 h-7 shrink-0 ${eff ? '' : 'grayscale'}`} style={{ imageRendering: 'pixelated' }} />}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">{item.name} <span className="text-slate-500">×{qty}</span></div>
                          <div className="text-[10px] text-slate-400 line-clamp-2">{item.description}</div>
                          {eff
                            ? <div className="text-[9px] text-sky-300 font-bold mt-0.5">{group.verb} ›</div>
                            : <div className="text-[9px] text-rose-300 font-bold mt-0.5">⚠ Sin efecto aquí</div>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
            </div>
          </div>
        </div>
      )}

      {compareOpen && selMon && <CompareModal team={run.party} baseUid={selMon.uid} onClose={() => setCompareOpen(false)} />}
    </div>
  )
}
