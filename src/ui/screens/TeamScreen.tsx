import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar, money } from '@/ui/components/kit'
import { getSpecies, getMove, hasMega } from '@/data'
import { getItem } from '@/data/items'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import PartyList from '@/ui/components/PartyList'
import EvolutionModal from '@/ui/components/EvolutionModal'
import EvoChoiceModal from '@/ui/components/EvoChoiceModal'
import { STAT_ES, typeGradient } from '@/ui/theme/types'
import { abilityName } from '@/engine/battle/abilities'
import { effectiveEvoLevel, levelEvolutionTargets } from '@/engine/team/evolution'
import { TYPE_ATTACKS } from '@/data/typeAttacks'

export default function TeamScreen() {
  const { run, back, useItem, useEvolutionItem, equipItem, unequipHeld, evoFx, clearEvoFx, setPartyOrder, evolveByLevel, evoChoice, chooseEvolution, cancelEvoChoice } = useGame()
  const [sel, setSel] = useState<string | null>(null)
  const [selItem, setSelItem] = useState<string | null>(null)
  if (!run) return null

  // Aplica un objeto a un Pokémon (despacha por categoría).
  const applyItem = (id: string, uid: string) => {
    const cat = getItem(id).category
    if (cat === 'held') equipItem(id, uid)
    else if (cat === 'evolution') useEvolutionItem(id, uid)
    else useItem(id, uid)
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

  return (
    <div className="flex flex-col flex-1 relative">
      <TopBar
        title="Tu equipo"
        left={<Button variant="ghost" onClick={back}>‹</Button>}
        right={<span className="text-amber-300 font-bold text-sm pr-1">{money(run.money)}</span>}
      />
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 no-scrollbar">
        <PartyList
          party={run.party}
          selectedUid={sel}
          onSelect={(uid) => {
            // Modo objeto-primero: si hay un objeto elegido, aplícalo al tocar el Pokémon.
            if (selItem) { applyItem(selItem, uid); setSelItem(null) }
            else setSel(uid === sel ? null : uid)
          }}
          onReorder={setPartyOrder}
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
        </div>
      </div>

      {/* Modal de detalle / objetos del Pokémon seleccionado */}
      {selMon && selSpecies && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setSel(null)}>
          <div className="w-full max-w-md max-h-[92%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end -mb-2 -mt-1"><button aria-label="Cerrar" className="text-slate-400 text-2xl leading-none px-2 active:scale-90" onClick={() => setSel(null)}>✕</button></div>
            <Card className="p-3" style={{ borderColor: '#f8717155' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl p-0.5" style={{ background: typeGradient(selSpecies.types) }}>
                <Sprite speciesId={selMon.speciesId} shiny={selMon.shiny} className="w-14 h-14 object-contain" />
              </div>
              <div className="flex-1">
                <div className="font-extrabold">{selSpecies.displayName}</div>
                <div className="flex gap-1 mt-0.5">{selSpecies.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
                {selMon.ability && selMon.ability !== 'none' && (
                  <div className="text-[11px] text-sky-300 mt-0.5">✦ {abilityName(selMon.ability)}</div>
                )}
              </div>
              <span className="text-xs text-slate-400">Nv.{selMon.level}</span>
            </div>

            <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[11px] mb-2">
              {(['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const).map((k) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-400">{STAT_ES[k]}</span>
                  <span className="font-bold tabular-nums">{selMon.stats[k]}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-1.5 mb-2">
              {selMon.moves.map((mv) => {
                const m = getMove(mv.moveId)
                return (
                  <div key={mv.moveId} className="rounded-lg bg-slate-900/60 px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <TypeBadge type={m.type} size="sm" />
                      <span className="text-xs font-semibold truncate">{m.displayName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      Ataque{m.power ? ` · ${m.power}` : ''}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Progreso: evolución / megaevolución / próximas mejoras */}
            <div className="rounded-lg bg-slate-900/60 px-2.5 py-2 mb-2 space-y-1 text-[11px]">
              {selSpecies.evolutions.length > 0 ? (
                selSpecies.evolutions.map((evo) => {
                  const req = effectiveEvoLevel(evo.trigger)
                  const target = getSpecies(evo.toId)
                  const left = req - selMon.level
                  return (
                    <div key={evo.toId} className="flex items-center gap-1.5">
                      <span>🧬</span>
                      <span>
                        Evoluciona a <b>{target.displayName}</b>{' '}
                        {left > 0
                          ? <span className="text-slate-400">al Nv.{req} · faltan {left}</span>
                          : <span className="text-emerald-300">¡listo! (sube de nivel)</span>}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="text-slate-500 flex items-center gap-1.5"><span>🧬</span> Sin evolución (forma final)</div>
              )}
              {hasMega(selMon.speciesId) && (
                <div className="flex items-center gap-1.5"><span>💠</span><span>Puede <b className="text-fuchsia-300">megaevolucionar</b> con Megapiedra (permanente).</span></div>
              )}
              {(() => {
                const types = [...new Set(selSpecies.types)].slice(0, 2)
                const ups: string[] = []
                for (const t of types) {
                  for (const tier of TYPE_ATTACKS[t]) {
                    if (tier.level > selMon.level) ups.push(`${tier.name} (Pot. ${tier.power}) a Nv.${tier.level}`)
                  }
                }
                if (!ups.length) return null
                return (
                  <div className="flex items-start gap-1.5">
                    <span>⚔️</span>
                    <span className="text-slate-300">Mejora de ataque: {ups.join(' · ')}</span>
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

            {levelEvolutionTargets(selMon).length > 0 && (
              <Button variant="success" full className="!py-2 mb-1" onClick={() => evolveByLevel(selMon.uid)}>
                🧬 Evolucionar{levelEvolutionTargets(selMon).length > 1 ? ' (elegir)' : ''}
              </Button>
            )}
            {canEvolve && hasEvoStone && (
              <Button variant="success" full className="!py-2 mb-1" onClick={() => useEvolutionItem('evo-stone', selMon.uid)}>
                🪨 Evolucionar (Piedra Evolutiva){getSpecies(selMon.speciesId).evolutions.length > 1 ? ' · elegir' : ''}
              </Button>
            )}
            {hasMega(selMon.speciesId) && hasMegaStone && (
              <Button variant="primary" full className="!py-2" onClick={() => useEvolutionItem('mega-stone', selMon.uid)}>
                💠 Megaevolucionar
              </Button>
            )}
            </Card>

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
                    return (
                      <button
                        key={id}
                        onClick={() => applyItem(id, selMon.uid)}
                        className="flex items-start gap-2 rounded-xl border px-2.5 py-2 text-left active:scale-[0.97] transition bg-slate-800 border-slate-700"
                      >
                        {item.sprite && <img src={item.sprite} alt="" className="w-7 h-7 shrink-0" style={{ imageRendering: 'pixelated' }} />}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">{item.name} <span className="text-slate-500">×{qty}</span></div>
                          <div className="text-[10px] text-slate-400 line-clamp-2">{item.description}</div>
                          <div className="text-[9px] text-sky-300 font-bold mt-0.5">{group.verb} ›</div>
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

      {evoFx && <EvolutionModal fromId={evoFx.fromId} toId={evoFx.toId} onClose={clearEvoFx} />}
      {evoChoice && <EvoChoiceModal options={evoChoice.options} onPick={chooseEvolution} onCancel={cancelEvoChoice} />}
    </div>
  )
}
