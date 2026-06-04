import { useEffect, useState } from 'react'
import { getSpecies } from '@/data'
import Sprite from './Sprite'
import { Button } from './kit'
import { typeGradient } from '@/ui/theme/types'

/** Animación de evolución: el Pokémon original se desvanece y aparece el nuevo. */
export default function EvolutionModal({
  fromId, toId, onClose,
}: {
  fromId: number
  toId: number
  onClose: () => void
}) {
  const [phase, setPhase] = useState<'pre' | 'flash' | 'done'>('pre')
  const to = getSpecies(toId)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('flash'), 700)
    const t2 = setTimeout(() => setPhase('done'), 1700)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative w-48 h-48 grid place-items-center">
          {phase !== 'done' && (
            <Sprite
              speciesId={fromId}
              className={`absolute w-40 h-40 object-contain transition-all duration-700 ${
                phase === 'flash' ? 'opacity-0 scale-110 brightness-200' : 'opacity-100'
              }`}
            />
          )}
          {phase !== 'pre' && (
            <div
              className="absolute rounded-2xl p-1 animate-pop-in"
              style={{ background: typeGradient(to.types), opacity: phase === 'done' ? 1 : 0.3 }}
            >
              <Sprite speciesId={toId} className="w-40 h-40 object-contain drop-shadow-2xl" />
            </div>
          )}
          {phase === 'flash' && (
            <div className="absolute inset-0 bg-white rounded-full blur-2xl animate-pop-in" />
          )}
        </div>

        {phase === 'done' ? (
          <div className="animate-pop-in flex flex-col items-center gap-3">
            <div className="text-emerald-300 font-extrabold text-lg">¡Evolución!</div>
            <div className="text-2xl font-extrabold">{to.displayName}</div>
            <Button variant="success" onClick={onClose}>
              ¡Genial! ›
            </Button>
          </div>
        ) : (
          <div className="text-slate-300 text-sm animate-pulse">¿Qué...?</div>
        )}
      </div>
    </div>
  )
}
