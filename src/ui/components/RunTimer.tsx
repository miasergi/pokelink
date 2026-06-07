import { useEffect, useState } from 'react'
import { runElapsedMs } from '@/engine/run/playtime'

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

/** Cronómetro de la run (solo tiempo de juego activo). Si `frozen`, congela el
 *  tiempo al montar (fin de run). */
export default function RunTimer({ run, frozen, className }: { run: { elapsedMs?: number; startedAt: number }; frozen?: boolean; className?: string }) {
  const [ms, setMs] = useState(() => runElapsedMs(run))
  useEffect(() => {
    if (frozen) return
    const t = setInterval(() => setMs(runElapsedMs(run)), 1000)
    return () => clearInterval(t)
  }, [frozen, run])
  return <span className={`tabular-nums ${className ?? ''}`}>⏱ {formatDuration(ms)}</span>
}
