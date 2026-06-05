import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import PokemonCard from '@/ui/components/PokemonCard'
import { typeGradient } from '@/ui/theme/types'
import { MAX_PARTY } from '@/engine/run/party'

export default function CatchScreen() {
  const { run, screen, doCatch } = useGame()
  const [replacing, setReplacing] = useState(false)
  const nodeId = screen.params?.nodeId as string
  if (!run) return null
  const node = run.map.nodes[nodeId]
  if (node.content.kind !== 'catch') return null
  const mon = node.content.offer
  const sp = getSpecies(mon.speciesId)
  const partyFull = run.party.length >= MAX_PARTY

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="¡Pokémon salvaje!" />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4 no-scrollbar">
        <div className="rounded-3xl p-4 w-full max-w-sm text-center" style={{ background: typeGradient(sp.types) }}>
          <Sprite speciesId={mon.speciesId} shiny={mon.shiny} className="w-40 h-40 object-contain mx-auto drop-shadow-2xl animate-float" />
          <div className="text-2xl font-extrabold">{sp.displayName} {mon.shiny && '✨'}</div>
          <div className="text-sm opacity-90">Nivel {mon.level}</div>
          <div className="flex gap-1 justify-center mt-2">
            {sp.types.map((t) => <TypeBadge key={t} type={t} />)}
          </div>
        </div>

        {!replacing ? (
          <div className="w-full max-w-sm flex flex-col gap-2.5">
            {!partyFull ? (
              <Button full variant="success" onClick={() => doCatch(nodeId, true)}>
                🔴 ¡Capturar y unir al equipo!
              </Button>
            ) : (
              <>
                <p className="text-center text-sm text-slate-400">Tu equipo está completo (6). Para capturarlo tienes que <b>liberar</b> a uno de tu equipo.</p>
                <Button full variant="success" onClick={() => setReplacing(true)}>
                  Liberar uno y capturar
                </Button>
              </>
            )}
            <Button full variant="ghost" onClick={() => doCatch(nodeId, false)}>
              Dejarlo ir
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-2">
            <p className="text-center text-sm text-rose-300">⚠️ ¿A quién <b>liberas</b> para hacer sitio? (desaparece para siempre)</p>
            {run.party.map((p) => (
              <PokemonCard key={p.uid} mon={p} onClick={() => doCatch(nodeId, true, p.uid)} />
            ))}
            <Button full variant="ghost" onClick={() => setReplacing(false)}>Cancelar</Button>
          </div>
        )}
      </div>
    </div>
  )
}
