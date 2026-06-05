import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar, money } from '@/ui/components/kit'
import { getSpecies, getMove, hasMega } from '@/data'
import { getItem } from '@/data/items'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import PartyList from '@/ui/components/PartyList'
import EvolutionModal from '@/ui/components/EvolutionModal'
import { STAT_ES, typeGradient } from '@/ui/theme/types'
import { abilityName } from '@/engine/battle/abilities'

const CAT_ES: Record<string, string> = { physical: 'Físico', special: 'Especial', status: 'Estado' }

export default function TeamScreen() {
  const { run, back, useItem, useEvolutionItem, equipItem, unequipHeld, evoFx, clearEvoFx, setPartyOrder } = useGame()
  const [sel, setSel] = useState<string | null>(null)
  if (!run) return null

  const selMon = run.party.find((p) => p.uid === sel) ?? null
  const selSpecies = selMon ? getSpecies(selMon.speciesId) : null
  const usableItems = Object.entries(run.inventory).filter(([id]) => {
    const c = getItem(id).category
    return c === 'heal' || c === 'revive' || c === 'battle' || c === 'evolution' || c === 'held'
  })
  const hasMegaStone = (run.inventory['mega-stone'] || 0) > 0

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Tu equipo"
        left={<Button variant="ghost" onClick={back}>‹</Button>}
        right={<span className="text-amber-300 font-bold text-sm pr-1">{money(run.money)}</span>}
      />
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 no-scrollbar">
        <PartyList
          party={run.party}
          selectedUid={sel}
          onSelect={(uid) => setSel(uid === sel ? null : uid)}
          onReorder={setPartyOrder}
        />

        {/* Detalle del Pokémon seleccionado */}
        {selMon && selSpecies && (
          <Card className="p-3 animate-pop-in" style={{ borderColor: '#f8717155' }}>
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
                      {CAT_ES[m.category]}{m.power ? ` · ${m.power}` : ''}
                    </span>
                  </div>
                )
              })}
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

            {hasMega(selMon.speciesId) && (
              selMon.heldItemId === 'mega-stone' ? (
                <div className="text-center text-xs font-bold text-fuchsia-300 py-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/30">
                  💠 Megaevolucionará al entrar en combate
                </div>
              ) : (
                <Button
                  variant={hasMegaStone ? 'primary' : 'secondary'}
                  full
                  disabled={!hasMegaStone}
                  className="!py-2"
                  onClick={() => equipItem('mega-stone', selMon.uid)}
                >
                  {hasMegaStone ? '💠 Equipar Mega Piedra' : '💠 Necesitas una Mega Piedra'}
                </Button>
              )
            )}
          </Card>
        )}

        {/* Mochila */}
        <div>
          <div className="text-sm font-bold text-slate-300 mb-1.5 px-1">🎒 Mochila</div>
          {usableItems.length === 0 && <p className="text-xs text-slate-500 px-1">No tienes objetos usables.</p>}
          <div className="grid grid-cols-2 gap-2">
            {usableItems.map(([id, qty]) => {
              const item = getItem(id)
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (!selMon) return
                    if (item.category === 'held') equipItem(id, selMon.uid)
                    else if (item.category === 'evolution') useEvolutionItem(id, selMon.uid)
                    else useItem(id, selMon.uid)
                  }}
                  disabled={!selMon}
                  className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-2 text-left disabled:opacity-40 active:scale-[0.98] transition"
                >
                  {item.sprite && <img src={item.sprite} alt="" className="w-7 h-7 shrink-0" style={{ imageRendering: 'pixelated' }} />}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-400">×{qty}</div>
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 px-1">
            {selMon ? `Usar objeto en ${selSpecies?.displayName}` : 'Selecciona un Pokémon para usar objetos.'}
          </p>
        </div>
      </div>

      {evoFx && <EvolutionModal fromId={evoFx.fromId} toId={evoFx.toId} onClose={clearEvoFx} />}
    </div>
  )
}
