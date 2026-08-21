// SITUACIÓN: la casilla de evento. Una escena, dos o tres opciones, y a veces
// una tirada de suerte. Es la fuente de variedad del recorrido.
import { useInazuma } from '@/state/inazumaStore'
import { CoinPrice, CoinText, Pic } from '@/ui/inazuma/Glyphs'
import { getEvent } from '@/data/inazuma/events'

export default function EventView() {
  const { matchNode, save, resolveEvent } = useInazuma()
  const ev = matchNode?.eventId ? getEvent(matchNode.eventId) : null
  if (!ev || !save) return null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 flex items-center gap-2">
        <Pic name="node-evento" className="w-5 h-5" />
        <div className="font-extrabold text-sm">Situación</div>
        <span className="ml-auto text-sm font-bold text-amber-300 tabular-nums">
          <CoinPrice amount={save.coins} />
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col items-center justify-center text-center gap-3">
        {/* La loseta con la IMAGEN de la escena, calcada a la del modo Pokémon:
            un cuadro grande con degradado radial y el dibujo en el centro. */}
        <div
          className="w-28 h-28 rounded-3xl grid place-items-center shadow-lg"
          style={{
            background: 'radial-gradient(circle at 50% 35%, #c084fc33, rgba(15,23,42,0.6))',
            border: '1px solid #c084fc33',
          }}
        >
          <Pic name={`event-${ev.id}`} className="w-16 h-16" />
        </div>
        <h2 className="text-xl font-extrabold text-purple-200">{ev.title}</h2>
        <p className="text-sm text-slate-300 leading-relaxed max-w-[20rem]">{ev.text}</p>
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-3 safe-bottom flex flex-col gap-2">
        {ev.options.map((o, i) => {
          const tooPoor = !!o.cost && save.coins < o.cost
          return (
            <button
              key={i}
              onClick={() => !tooPoor && resolveEvent(i)}
              disabled={tooPoor}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-left transition active:scale-[0.98] disabled:opacity-40"
            >
              <div className="font-bold text-[13px]"><CoinText text={o.label} coin="w-3 h-3" /></div>
              <div className="text-[10px] text-slate-400">
                {tooPoor
                  ? 'No te llega el presupuesto'
                  : o.chance != null
                    // Se enseña el riesgo: una opción con tirada tiene que
                    // avisar, o deja de ser una decisión y es una trampa.
                    ? `Puede salir mal · ${Math.round(o.chance * 100)} % de éxito`
                    : 'Seguro'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
