// SITUACIÓN: la casilla de evento. Una escena, dos o tres opciones, y a veces
// una tirada de suerte. Es la fuente de variedad del recorrido.
import { useInazuma } from '@/state/inazumaStore'
import Icon from '@/ui/components/Icon'
import { getEvent } from '@/data/inazuma/events'

export default function EventView() {
  const { matchNode, save, resolveEvent } = useInazuma()
  const ev = matchNode?.eventId ? getEvent(matchNode.eventId) : null
  if (!ev || !save) return null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 flex items-center gap-2">
        <Icon name="question" className="w-5 h-5 text-purple-300" />
        <div className="font-extrabold text-sm">Situación</div>
        <span className="ml-auto text-sm font-bold text-amber-300 tabular-nums">
          {save.coins.toLocaleString('es-ES')} ₽
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 flex flex-col items-center justify-center text-center gap-3">
        <Icon name={ev.icon} className="w-16 h-16 text-purple-300" />
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
              <div className="font-bold text-[13px]">{o.label}</div>
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
