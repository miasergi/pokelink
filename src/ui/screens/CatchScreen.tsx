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

const POKEBALL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'

export default function CatchScreen() {
  const { run, screen, doCatch } = useGame()
  const [chosen, setChosen] = useState<string | null>(null)
  const [replacing, setReplacing] = useState(false)
  const [capturing, setCapturing] = useState(false)
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
    setCapturing(true)
    setTimeout(() => doCatch(nodeId, true, chosen, replaceUid), 1700)
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="¡Pokémon salvajes!" />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-3 no-scrollbar">
        {capturing && sel ? (
          <div className="relative rounded-3xl p-4 w-full max-w-sm text-center mt-6" style={{ background: typeGradient(getSpecies(sel.speciesId).types) }}>
            <Sprite speciesId={sel.speciesId} shiny={sel.shiny} className="w-40 h-40 object-contain mx-auto opacity-0 transition-opacity duration-500 delay-200" />
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <img src={POKEBALL} alt="" className="fx-pokeball w-16 h-16" style={{ imageRendering: 'pixelated' }} />
              <span className="absolute fx-capture-pop text-4xl" style={{ animationDelay: '1.5s' }}>✨</span>
            </div>
            <div className="text-sm font-bold text-white mt-2 animate-pulse">¡Lanzando Poké Ball…!</div>
          </div>
        ) : !replacing ? (
          <>
            <p className="text-sm text-slate-300 text-center">Elige <b>uno</b> para capturar:</p>
            <div className="w-full max-w-sm grid grid-cols-1 gap-2">
              {offers.map((o) => {
                const sp = getSpecies(o.speciesId)
                const isNew = !registered(o.speciesId)
                return (
                  <button
                    key={o.uid}
                    onClick={() => setChosen(o.uid)}
                    className={`relative flex items-center gap-3 rounded-2xl border p-2.5 text-left transition active:scale-[0.99] ${chosen === o.uid ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-700'}`}
                    style={{ background: typeGradient(sp.types) }}
                  >
                    <div className="relative shrink-0">
                      <Sprite speciesId={o.speciesId} shiny={o.shiny} className="w-16 h-16 object-contain drop-shadow-lg" />
                      {o.shiny && <span className="absolute -top-1 -right-1 text-sm" style={{ filter: 'drop-shadow(0 0 2px #000)' }}>✨</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold truncate">{sp.displayName}</div>
                      <div className="text-xs opacity-90">Nivel {o.level}</div>
                      <div className="flex gap-1 mt-1">{sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
                    </div>
                    <span className={`absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${isNew ? 'bg-amber-400 text-black' : 'bg-slate-900/80 text-emerald-300'}`}>
                      {isNew ? '✦ NUEVO' : '✓ Pokédex'}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="w-full max-w-sm flex flex-col gap-2 mt-1">
              {!partyFull ? (
                <Button full variant="success" disabled={!chosen} onClick={() => doCapture()}>
                  🔴 {chosen ? `¡Capturar ${getSpecies(sel!.speciesId).displayName}!` : 'Elige un Pokémon'}
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
                Dejarlos ir
              </Button>
            </div>
          </>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-2 mt-2">
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
