/** Reto diario: misma región + semilla para todo el mundo cada día. */
export interface DailyChallenge {
  date: string // YYYY-MM-DD
  gen: number
  seed: number
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 2 ** 31
}

/** Reto del día de `date` (por defecto hoy). Región y semilla deterministas. */
export function dailyChallenge(date: Date = new Date()): DailyChallenge {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const dateStr = `${y}-${m}-${d}`
  const seed = hashStr('pokerogue-daily-' + dateStr)
  const gen = (hashStr(dateStr) % 9) + 1
  return { date: dateStr, gen, seed }
}
