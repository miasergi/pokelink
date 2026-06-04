import { useEffect } from 'react'
import { useGame } from '@/state/gameStore'
import { Button } from '@/ui/components/kit'

export default function HealScreen() {
  const { run, screen, doHeal } = useGame()
  const nodeId = screen.params?.nodeId as string

  // Cura automáticamente al entrar (efecto visual)
  useEffect(() => {
    const t = setTimeout(() => {}, 0)
    return () => clearTimeout(t)
  }, [])

  if (!run) return null
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 gap-6 text-center">
      <div className="text-6xl animate-float">➕</div>
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
