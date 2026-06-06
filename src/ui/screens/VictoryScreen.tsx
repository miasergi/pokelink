import { useEffect, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, Card } from '@/ui/components/kit'
import { getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'
import { typeGradient } from '@/ui/theme/types'
import RunTimer from '@/ui/components/RunTimer'
import { shareText, buildShareText } from '@/utils/share'

export default function VictoryScreen() {
  const { run, abandonRun } = useGame()
  const [confetti, setConfetti] = useState(true)
  const [shared, setShared] = useState<string | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setConfetti(false), 4000)
    return () => clearTimeout(t)
  }, [])
  if (!run) return null

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 gap-5 text-center safe-top safe-bottom relative overflow-hidden">
      {confetti && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-xl animate-float"
              style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 10) * 0.2}s` }}
            >
              {['🎉', '✨', '🏆', '⭐'][i % 4]}
            </span>
          ))}
        </div>
      )}
      <div className="text-7xl animate-float">🏆</div>
      <h2 className="text-3xl font-extrabold text-amber-300">¡CAMPEÓN!</h2>
      <div className="text-lg font-extrabold text-emerald-300"><RunTimer startedAt={run.startedAt} frozen /></div>
      <p className="text-slate-200 text-sm max-w-xs">
        Has derrotado al Alto Mando y al Campeón de {run.region}. ¡Eres el nuevo
        Maestro Pokémon!
      </p>

      <Card className="p-3 w-full max-w-sm">
        <div className="text-xs text-slate-400 mb-2">Tu equipo campeón</div>
        <div className="grid grid-cols-3 gap-2">
          {run.party.map((p) => {
            const sp = getSpecies(p.speciesId)
            return (
              <div key={p.uid} className="rounded-xl p-1.5" style={{ background: typeGradient(sp.types) }}>
                <Sprite speciesId={p.speciesId} shiny={p.shiny} className="w-full object-contain" />
                <div className="text-[10px] font-bold truncate">{sp.displayName}</div>
                <div className="text-[9px] opacity-80">Nv.{p.level}</div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="w-full max-w-sm flex flex-col gap-2">
        <Button full variant="secondary" onClick={async () => {
          const text = buildShareText({ region: run.region, difficulty: run.difficulty, durationMs: Math.max(0, Date.now() - run.startedAt), team: run.party.map((p) => ({ name: getSpecies(p.speciesId).displayName, level: p.level })) })
          const r = await shareText(text)
          if (r === 'copied') setShared('📋 ¡Copiado! Pégalo donde quieras')
          else if (r === 'shared') setShared('¡Compartido!')
        }}>📤 Compartir</Button>
        {shared && <div className="text-xs text-emerald-300">{shared}</div>}
        <Button full variant="primary" onClick={() => void abandonRun()}>
          Volver al menú
        </Button>
      </div>
    </div>
  )
}
