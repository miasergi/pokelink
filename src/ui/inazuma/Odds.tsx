// Estrellas de probabilidad de una opción, con el porcentaje real detrás si el
// ajuste está activo.
//
// Las estrellas solas son bonitas pero opacas: «★★» no dice si es un 45 % o un
// 60 %. El ajuste «Mostrar porcentajes» (Ajustes) las acompaña del número para
// quien quiera optimizar, sin obligar a nadie a leer decimales.
import { useSettings } from '@/state/settingsStore'
import type { DecisionOption } from '@/engine/inazuma/types'

export default function Odds({ option }: { option: DecisionOption }) {
  const showOdds = useSettings((s) => s.showOdds)
  const pct = Math.round(option.chance * 100)
  return (
    <span className="shrink-0 text-right leading-tight" title={`Probabilidad estimada: ${pct} %`}>
      <span className="text-xs tracking-tight block">
        {'★'.repeat(option.odds)}<span className="text-slate-700">{'★'.repeat(3 - option.odds)}</span>
      </span>
      {showOdds && <span className="text-[9px] text-slate-400 tabular-nums">{pct} %</span>}
    </span>
  )
}
