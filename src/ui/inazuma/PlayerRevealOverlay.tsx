// REVELADO DE JUGADOR: la carta completa del que acaba de llegar (intercambio,
// regalo post-jefe, fichaje estrella…). Un nombre en un toast no le hace
// justicia a un fichaje a ciegas: aquí sale su carta con atributos y técnicas
// — y un COMPARAR con los tuyos, para saber al momento si te mejora el once.
import { useState } from 'react'
import { CoinText } from '@/ui/inazuma/Glyphs'
import { createPortal } from 'react-dom'
import { Button } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { PlayerCard } from '@/ui/inazuma/PlayerCard'
import CompareSheet, { type CompareBlock } from '@/ui/inazuma/CompareSheet'
import { effectiveStats, rarityOf } from '@/engine/inazuma/roster'
import { getPlayerBase } from '@/data/inazuma/players'

export default function PlayerRevealOverlay() {
  const { save, revealPlayer, clearRevealPlayer } = useInazuma()
  const [compare, setCompare] = useState<CompareBlock | null>(null)
  if (!revealPlayer || !save) return null
  const player = save.roster.find((p) => p.uid === revealPlayer.uid)
  if (!player) return null
  const base = getPlayerBase(player.baseId)

  return createPortal(
    <div className="fixed inset-0 z-[93] grid place-items-center p-5" onClick={clearRevealPlayer}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full max-w-xs animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="text-center text-[13px] font-extrabold text-teal-200 mb-2"><CoinText text={revealPlayer.title} coin="w-3 h-3" /></div>
        <PlayerCard player={player} />
        <div className="mt-3 flex gap-2">
          <Button
            variant="secondary"
            full
            onClick={() => setCompare({
              name: base.name,
              baseId: base.id,
              position: base.position,
              element: base.element,
              level: player.level,
              rarity: rarityOf(player),
              stats: effectiveStats(player),
            })}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Icon name="scales" className="w-4 h-4" /> Comparar
            </span>
          </Button>
          <Button variant="primary" full onClick={clearRevealPlayer}>¡Bienvenido!</Button>
        </div>
      </div>
      {compare && <CompareSheet a={compare} onClose={() => setCompare(null)} />}
    </div>,
    document.body,
  )
}
