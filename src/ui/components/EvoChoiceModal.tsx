import { getSpecies } from '@/data'
import Sprite from './Sprite'
import TypeBadge from './TypeBadge'
import { Button } from './kit'
import { typeGradient } from '@/ui/theme/types'

/** Elegir entre varias evoluciones/megaevoluciones (Charizard X/Y, Eevee...). */
export default function EvoChoiceModal({
  options, onPick, onCancel,
}: {
  options: number[]
  onPick: (id: number) => void
  onCancel: () => void
}) {
  return (
    <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm grid place-items-center p-5" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-center font-extrabold text-lg mb-1">Elige la evolución</h3>
        <p className="text-center text-xs text-slate-400 mb-3">Hay varias formas posibles. ¿Cuál prefieres?</p>
        <div className="grid grid-cols-2 gap-2.5">
          {options.map((id) => {
            const sp = getSpecies(id)
            return (
              <button
                key={id}
                onClick={() => onPick(id)}
                className="rounded-2xl p-2 border-2 border-slate-700 hover:border-red-400 active:scale-95 transition flex flex-col items-center gap-1"
                style={{ background: typeGradient(sp.types) }}
              >
                <Sprite speciesId={id} className="w-20 h-20 object-contain drop-shadow" />
                <div className="text-sm font-bold text-center leading-tight">{sp.displayName}</div>
                <div className="flex gap-0.5">{sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
              </button>
            )
          })}
        </div>
        <Button full variant="secondary" className="mt-3" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}
