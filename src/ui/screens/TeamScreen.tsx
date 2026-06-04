import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar, money } from '@/ui/components/kit'
import { getSpecies, getMove, hasMega } from '@/data'
import { getItem } from '@/data/items'
import EvolutionModal from '@/ui/components/EvolutionModal'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import HpBar from '@/ui/components/HpBar'
import { TYPE_ES, STAT_ES, typeGradient } from '@/ui/theme/types'
import { typeEffectiveness } from '@/data/typechart'

export default function TeamScreen() {
  const { run, back, useItem, useEvolutionItem, evoFx, clearEvoFx, setLead } = useGame()
  const [sel, setSel] = useState<string | null>(null)
  if (!run) return null

  const selMon = run.party.find((p) => p.uid === sel) ?? null
  const usableItems = Object.entries(run.inventory).filter(([id]) => {
    const c = getItem(id).category
    return c === 'heal' || c === 'revive' || c === 'battle' || c === 'evolution'
  })
  const hasMegaStone = (run.inventory['mega-stone'] || 0) > 0

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Tu equipo"
        left={<Button variant="ghost" onClick={back}>‹</Button>}
        right={<span className="text-amber-300 font-bold text-sm pr-1">{money(run.money)}</span>}
      />
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 no-scrollbar">
        {run.party.map((mon, i) => {
          const sp = getSpecies(mon.speciesId)
          const open = sel === mon.uid
          return (
            <Card key={mon.uid} className="overflow-hidden" style={{ borderColor: open ? '#f87171' : undefined }}>
              <div className="p-2.5 flex items-center gap-3" onClick={() => setSel(open ? null : mon.uid)}>
                <div className="relative shrink-0 rounded-xl p-0.5" style={{ background: typeGradient(sp.types) }}>
                  <Sprite speciesId={mon.speciesId} shiny={mon.shiny} className={`w-14 h-14 object-contain ${mon.currentHp <= 0 ? 'grayscale opacity-50' : ''}`} />
                  {i === 0 && <span className="absolute -top-1 -left-1 text-[9px] bg-red-500 px-1 rounded-full font-bold">LÍDER</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold truncate">{sp.displayName}</span>
                    <span className="text-xs text-slate-400">Nv.{mon.level}</span>
                  </div>
                  <div className="flex gap-1 mt-0.5">{sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
                  <div className="mt-1"><HpBar current={mon.currentHp} max={mon.stats.hp} status={mon.status} showNumbers /></div>
                </div>
              </div>

              {open && (
                <div className="px-3 pb-3 border-t border-slate-700/50 pt-2.5 animate-pop-in">
                  {/* stats */}
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[11px] mb-2">
                    {(['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const).map((k) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-400">{STAT_ES[k]}</span>
                        <span className="font-bold tabular-nums">{mon.stats[k]}</span>
                      </div>
                    ))}
                  </div>
                  {/* movimientos */}
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {mon.moves.map((mv) => {
                      const m = getMove(mv.moveId)
                      return (
                        <div key={mv.moveId} className="rounded-lg bg-slate-900/60 px-2 py-1.5 flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold truncate">{capitalize(m.name)}</span>
                          <TypeBadge type={m.type} size="sm" />
                        </div>
                      )
                    })}
                  </div>
                  {hasMega(mon.speciesId) && (
                    <Button
                      variant={hasMegaStone ? 'primary' : 'secondary'}
                      full
                      disabled={!hasMegaStone}
                      className="!py-2 mb-1"
                      onClick={() => useEvolutionItem('mega-stone', mon.uid)}
                    >
                      {hasMegaStone ? '💠 ¡Megaevolucionar!' : '💠 Necesitas una Mega Piedra'}
                    </Button>
                  )}
                  {i !== 0 && mon.currentHp > 0 && (
                    <Button variant="secondary" full className="!py-2 mb-1" onClick={() => setLead(mon.uid)}>
                      ⭐ Poner como líder
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )
        })}

        {/* Mochila */}
        <div className="mt-2">
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
                    if (item.category === 'evolution') useEvolutionItem(id, selMon.uid)
                    else useItem(id, selMon.uid)
                  }}
                  disabled={!selMon}
                  className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-2 text-left disabled:opacity-40 active:scale-[0.98] transition"
                >
                  {item.sprite && <img src={item.sprite} alt="" className="w-7 h-7 shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-400">×{qty}</div>
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 px-1">
            {selMon ? `Usar objeto en ${getSpecies(selMon.speciesId).displayName}` : 'Selecciona un Pokémon para usar objetos.'}
          </p>
        </div>
      </div>

      {evoFx && (
        <EvolutionModal fromId={evoFx.fromId} toId={evoFx.toId} onClose={clearEvoFx} />
      )}
    </div>
  )
}

function capitalize(s: string) {
  return s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
void TYPE_ES
void typeEffectiveness
