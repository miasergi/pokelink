import type { StatusCondition } from '@/types'
import { STATUS_SHORT, STATUS_COLOR } from '@/engine/battle/status'

interface HpBarProps {
  current: number
  max: number
  status?: StatusCondition
  showNumbers?: boolean
  height?: number
}

export default function HpBar({ current, max, status = 'none', showNumbers, height = 8 }: HpBarProps) {
  const frac = Math.max(0, Math.min(1, current / max))
  const color = frac > 0.5 ? '#34d399' : frac > 0.2 ? '#fbbf24' : '#f87171'
  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5">
        <div
          className="flex-1 rounded-full bg-slate-700/80 overflow-hidden"
          style={{ height }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${frac * 100}%`, backgroundColor: color }}
          />
        </div>
        {status !== 'none' && (
          <span
            className="text-[9px] font-bold px-1 rounded text-white leading-tight"
            style={{ backgroundColor: STATUS_COLOR[status] }}
          >
            {STATUS_SHORT[status]}
          </span>
        )}
      </div>
      {showNumbers && (
        <div className="text-[10px] text-slate-300 text-right mt-0.5 tabular-nums">
          {Math.max(0, Math.ceil(current))}/{max}
        </div>
      )}
    </div>
  )
}
