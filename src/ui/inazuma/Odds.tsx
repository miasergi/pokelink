// Probabilidad de una opción de duelo.
//
// Por defecto NO se enseña nada: rankear cada jugada le quitaba el misterio a
// los duelos y ensuciaba el panel. Quien quiera optimizar activa «Mostrar
// porcentajes» en ajustes y ve el número real.
import { useSettings } from '@/state/settingsStore'
import type { DecisionOption } from '@/engine/inazuma/types'

export default function Odds({ option }: { option: DecisionOption }) {
  const showOdds = useSettings((s) => s.showOdds)
  // Los PASES llegan siempre: un porcentaje al lado confundía.
  if (!showOdds || option.id.startsWith('pass:')) return null
  const pct = Math.round(option.chance * 100)
  return (
    <span
      className={`shrink-0 text-right text-[11px] font-bold tabular-nums ${
        pct >= 60 ? 'text-emerald-300' : pct >= 40 ? 'text-amber-300' : 'text-rose-300'
      }`}
      title={`Probabilidad estimada: ${pct} %`}
    >
      {pct} %
    </span>
  )
}
