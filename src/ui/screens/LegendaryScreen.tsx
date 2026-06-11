import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import PokemonCard from '@/ui/components/PokemonCard'
import { typeGradient } from '@/ui/theme/types'

export default function LegendaryScreen() {
  const { run, legendaryOffer, offerKind, addLegendary, skipLegendary } = useGame()
  const [replacing, setReplacing] = useState(false)
  if (!run || !legendaryOffer) return null
  const mon = legendaryOffer
  const sp = getSpecies(mon.speciesId)
  const full = run.party.length >= 6
  const isRescue = offerKind === 'rescue'
  const noun = isRescue ? 'el Pokémon' : 'el legendario'

  return (
    <div className="flex flex-col flex-1">
      <TopBar title={isRescue ? '🔓 ¡Pokémon liberado!' : '✨ ¡Legendario vencido!'} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4 no-scrollbar">
        <div className="rounded-3xl p-4 w-full max-w-sm text-center" style={{ background: typeGradient(sp.types) }}>
          <Sprite speciesId={mon.speciesId} shiny={mon.shiny} className="w-44 h-44 object-contain mx-auto drop-shadow-2xl animate-float" />
          <div className="text-2xl font-extrabold">{sp.displayName} {mon.shiny && '✨'}</div>
          <div className="text-sm opacity-90">Nivel {mon.level}</div>
          <div className="flex gap-1 justify-center mt-2">{sp.types.map((t) => <TypeBadge key={t} type={t} />)}</div>
        </div>

        {!replacing ? (
          <div className="w-full max-w-sm flex flex-col gap-2.5">
            {!full ? (
              <Button full variant="success" onClick={() => addLegendary()}>⭐ ¡Añadir al equipo!</Button>
            ) : (
              <>
                <p className="text-center text-sm text-slate-400">Tu equipo está completo (6). Para quedártelo tienes que <b>liberar</b> a uno.</p>
                <Button full variant="success" onClick={() => setReplacing(true)}>Liberar uno y añadir</Button>
              </>
            )}
            <Button full variant="ghost" onClick={skipLegendary}>{isRescue ? 'Enviar a la caja' : 'Dejarlo marchar'}</Button>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-2">
            <p className="text-center text-sm text-rose-300">⚠️ ¿A quién <b>liberas</b> para quedarte {noun}? (desaparece para siempre; su objeto vuelve a la mochila)</p>
            {run.party.filter((p) => !p.locked).map((p) => (
              <PokemonCard key={p.uid} mon={p} onClick={() => addLegendary(p.uid)} />
            ))}
            {run.party.some((p) => p.locked) && (
              <p className="text-center text-[11px] text-slate-500">🔒 Tu compañero y el Lapras del Capitán son intransferibles.</p>
            )}
            <Button full variant="ghost" onClick={() => setReplacing(false)}>Cancelar</Button>
          </div>
        )}
      </div>
    </div>
  )
}
