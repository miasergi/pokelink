// CASILLA DE INTERCAMBIO: el cazatalentos ambulante. Cambias a un jugador
// tuyo por otro AL AZAR con +3 niveles — el trato del modo Pokémon: casi
// siempre ganas nivel, pero no eliges qué llega.
import { useState } from 'react'
import { useInazuma } from '@/state/inazumaStore'
import { Button } from '@/ui/components/kit'
import { getPlayerBase } from '@/data/inazuma/players'
import { PlayerRow } from '@/ui/inazuma/PlayerCard'
import { Pic } from '@/ui/inazuma/Glyphs'

export default function TradeView() {
  const { save, resolveTrade, goTo } = useInazuma()
  const [picked, setPicked] = useState<string | null>(null)
  if (!save) return null

  const candidates = save.roster.filter((p) => !p.captain)
  const sel = picked ? save.roster.find((p) => p.uid === picked) : null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 flex items-center gap-2">
        <Pic name="node-trade" className="w-5 h-5" />
        <div className="font-extrabold text-sm">Cazatalentos ambulante</div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-2">
        <p className="text-[12px] text-slate-400">
          «Dame a uno de los tuyos y te traigo a otro con <b className="text-slate-200">3 niveles más</b>.
          ¿Quién? Eso no se pregunta.» El capitán no entra en el trato.
        </p>

        {candidates.map((p) => (
          <PlayerRow
            key={p.uid}
            player={p}
            className={picked === p.uid ? 'ring-2 ring-teal-300/70' : ''}
            onClick={() => setPicked(p.uid)}
          />
        ))}
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom flex flex-col gap-2">
        {sel && (
          <div className="rounded-xl border border-teal-500/50 bg-teal-500/10 px-3 py-2 text-[12px] text-teal-100">
            {getPlayerBase(sel.baseId).name} (nv. {sel.level}) se marcha y llega{' '}
            <b>alguien al azar a nivel {sel.level + 3}</b>. No hay vuelta atrás.
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" full onClick={() => goTo('map')}>No, gracias</Button>
          <Button variant="primary" full disabled={!picked} onClick={() => picked && resolveTrade(picked)}>
            Hacer el cambio
          </Button>
        </div>
      </div>
    </div>
  )
}
