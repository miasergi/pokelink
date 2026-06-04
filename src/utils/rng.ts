// RNG con semilla (mulberry32) para runs reproducibles y combates deterministas.

export class RNG {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** Float en [0,1). */
  next(): number {
    this.state |= 0
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Entero en [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /** float en [min, max). */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  /** true con probabilidad p (0..1). */
  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }

  /** n elementos únicos al azar (Fisher–Yates parcial). */
  sample<T>(arr: readonly T[], n: number): T[] {
    const copy = arr.slice()
    const out: T[] = []
    for (let i = 0; i < n && copy.length; i++) {
      const idx = Math.floor(this.next() * copy.length)
      out.push(copy[idx])
      copy.splice(idx, 1)
    }
    return out
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  /** Snapshot del estado interno (para serializar). */
  getState(): number {
    return this.state
  }

  setState(s: number): void {
    this.state = s >>> 0
  }
}

/** Semilla a partir de string (para nombres de run legibles). */
export function seedFromString(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return (h ^ (h >>> 16)) >>> 0
}
