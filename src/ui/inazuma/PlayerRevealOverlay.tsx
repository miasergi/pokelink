// REVELADO DE JUGADOR: la carta completa del que acaba de llegar (intercambio,
// y lo que haga falta en el futuro). Un nombre en un toast no le hace justicia
// a un fichaje a ciegas: aquí sale su carta con atributos y técnicas.
import { createPortal } from 'react-dom'
import { Button } from '@/ui/components/kit'
import { useInazuma } from '@/state/inazumaStore'
import { PlayerCard } from '@/ui/inazuma/PlayerCard'

export default function PlayerRevealOverlay() {
  const { save, revealPlayer, clearRevealPlayer } = useInazuma()
  if (!revealPlayer || !save) return null
  const player = save.roster.find((p) => p.uid === revealPlayer.uid)
  if (!player) return null

  return createPortal(
    <div className="fixed inset-0 z-[93] grid place-items-center p-5" onClick={clearRevealPlayer}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full max-w-xs animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="text-center text-[13px] font-extrabold text-teal-200 mb-2">{revealPlayer.title}</div>
        <PlayerCard player={player} />
        <Button variant="primary" full className="mt-3" onClick={clearRevealPlayer}>¡Bienvenido!</Button>
      </div>
    </div>,
    document.body,
  )
}
