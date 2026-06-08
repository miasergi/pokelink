import { useEffect, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { getSpecies, toBaseSpeciesId } from '@/data'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import PokemonCard from '@/ui/components/PokemonCard'
import { typeGradient } from '@/ui/theme/types'
import { MAX_PARTY } from '@/engine/run/party'
import { loadMeta } from '@/persistence/db'
import { POKEBALL } from '@/ui/components/nodeImage'

export default function CatchScreen() {
  const { run, screen, doCatch } = useGame()
  const [chosen, setChosen] = useState<string | null>(null)
  const [replacing, setReplacing] = useState(false)
  const [caughtDex, setCaughtDex] = useState<Set<number>>(new Set())
  useEffect(() => { void loadMeta().then((m) => setCaughtDex(new Set(m.pokedexCaught))) }, [])

  const nodeId = screen.params?.nodeId as string
  if (!run) return null
  const node = run.map.nodes[nodeId]
  if (node.content.kind !== 'catch') return null
  const offers = node.content.offers
  const partyFull = run.party.length >= MAX_PARTY
  const sel = offers.find((o) => o.uid === chosen) ?? null
  const registered = (id: number) => caughtDex.has(toBaseSpeciesId(id))

  const doCapture = (replaceUid?: string) => {
    if (!chosen) return
    doCatch(nodeId, true, chosen, replaceUid)
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="¡Pokémon salvajes!" />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
        {!replacing ? (
          <>
            <p className="text-sm text-slate-300 text-center">
              Elige <b>{offers.length === 1 ? 'si capturarlo' : 'uno para capturar'}</b>:
            </p>
            {offers.map((o) => {
              const sp = getSpecies(o.speciesId)
              const isSel = chosen === o.uid
              const isNew = !registered(o.speciesId)
              const phys = sp.baseStats.atk >= sp.baseStats.spa
              return (
                <div
                  key={o.uid}
                  onClick={() => setChosen(o.uid)}
                  className={`relative rounded-2xl p-3 border-2 transition active:scale-[0.99] ${
                    isSel ? 'border-red-400 ring-2 ring-red-400/30' : 'border-slate-700/60'
                  }`}
                  style={{ background: isSel ? typeGradient(sp.types) : 'rgba(15,23,42,0.6)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <Sprite speciesId={o.speciesId} shiny={o.shiny} className="w-24 h-24 object-contain drop-shadow-lg" />
                      {o.shiny && <span className="absolute -top-1 -right-1 text-base" style={{ filter: 'drop-shadow(0 0 2px #000)' }}>✨</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-extrabold text-xl truncate">{sp.displayName}</div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">{phys ? 'Físico' : 'Especial'}</span>
                      </div>
                      <div className="text-xs opacity-90 mt-0.5">Nivel {o.level}</div>
                      <div className="flex gap-1 mt-1">
                        {sp.types.map((t) => <TypeBadge key={t} type={t} />)}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                        <Stat label="PS" v={sp.baseStats.hp} />
                        <Stat label={phys ? 'Ataque (Físico)' : 'Ataque (Especial)'} v={phys ? sp.baseStats.atk : sp.baseStats.spa} />
                        <Stat label="Defensa" v={sp.baseStats.def} />
                        <Stat label="Def. Esp." v={sp.baseStats.spd} />
                        <Stat label="Velocidad" v={sp.baseStats.spe} />
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                    {o.shiny && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-300 text-black">✨ VARIOCOLOR</span>}
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isNew ? 'bg-amber-400 text-black' : 'bg-slate-900/80 text-emerald-300'}`}>
                      {isNew ? '✦ NUEVO' : '✓ Pokédex'}
                    </span>
                  </div>
                </div>
              )
            })}

            <div className="flex flex-col gap-2 mt-1">
              {!partyFull ? (
                <Button full variant="success" disabled={!chosen} onClick={() => doCapture()}>
                  <span className="inline-flex items-center justify-center gap-2">
                    <img src={POKEBALL} alt="" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} />
                    {chosen ? `¡Capturar ${getSpecies(sel!.speciesId).displayName}!` : 'Elige un Pokémon'}
                  </span>
                </Button>
              ) : (
                <>
                  {chosen && <p className="text-center text-xs text-slate-400">Equipo completo (6): tendrás que <b>liberar</b> a uno.</p>}
                  <Button full variant="success" disabled={!chosen} onClick={() => setReplacing(true)}>
                    {chosen ? 'Liberar uno y capturar' : 'Elige un Pokémon'}
                  </Button>
                </>
              )}
              <Button full variant="ghost" onClick={() => doCatch(nodeId, false)}>
                {offers.length === 1 ? 'Dejarlo ir' : 'Dejarlos ir'}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-center text-sm text-rose-300">⚠️ ¿A quién <b>liberas</b> para hacer sitio? (desaparece para siempre)</p>
            {run.party.map((p) => (
              <PokemonCard key={p.uid} mon={p} onClick={() => doCapture(p.uid)} />
            ))}
            <Button full variant="ghost" onClick={() => setReplacing(false)}>Cancelar</Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-300/80">{label}</span>
      <span className="font-bold tabular-nums">{v}</span>
    </div>
  )
}
