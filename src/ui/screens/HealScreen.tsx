import { useGame } from '@/state/gameStore'
import { Button, ImgFallback } from '@/ui/components/kit'

const NURSE = 'https://play.pokemonshowdown.com/sprites/trainers/nurse.png'

export default function HealScreen() {
  const { run, screen, doHeal } = useGame()
  const nodeId = screen.params?.nodeId as string

  if (!run) return null
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 gap-6 text-center">
      <ImgFallback
        src={NURSE}
        alt="Enfermera Joy"
        className="w-28 h-28 object-contain animate-float drop-shadow-lg"
        style={{ imageRendering: 'pixelated' }}
        fallback={<div className="text-6xl animate-float">➕</div>}
      />
      <h2 className="text-2xl font-extrabold text-pink-300">Centro Pokémon</h2>
      <p className="text-slate-300 text-sm max-w-xs">
        Enfermera Joy cuida de tu equipo. ¡Todos tus Pokémon recuperarán PS y estado!
      </p>
      <Button full variant="success" className="max-w-sm" onClick={() => doHeal(nodeId)}>
        Descansar y curar equipo ›
      </Button>
    </div>
  )
}
