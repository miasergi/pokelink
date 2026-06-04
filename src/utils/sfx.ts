import { useSettings } from '@/state/settingsStore'

// Efectos de sonido sintetizados con WebAudio (sin archivos) + vibración.

let ctx: AudioContext | null = null
function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', gain = 0.05, delay = 0) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function sweep(f1: number, f2: number, dur: number, type: OscillatorType = 'sawtooth', gain = 0.05) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f1, t0)
  osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* ignore */
    }
  }
}

export type Sfx =
  | 'hit' | 'crit' | 'faint' | 'heal' | 'status' | 'levelup'
  | 'victory' | 'defeat' | 'select' | 'mega' | 'catch'

export function play(kind: Sfx) {
  if (!useSettings.getState().sound) return
  switch (kind) {
    case 'hit':
      tone(160, 0.09, 'square', 0.045)
      vibrate(12)
      break
    case 'crit':
      tone(320, 0.07, 'square', 0.06)
      tone(480, 0.1, 'square', 0.05, 0.05)
      vibrate([0, 12, 25, 18])
      break
    case 'faint':
      sweep(300, 70, 0.4, 'sawtooth', 0.05)
      vibrate(35)
      break
    case 'heal':
      tone(520, 0.1, 'sine', 0.05)
      tone(700, 0.12, 'sine', 0.045, 0.08)
      break
    case 'status':
      tone(200, 0.12, 'triangle', 0.04)
      break
    case 'levelup':
      tone(523, 0.09, 'square', 0.05)
      tone(659, 0.09, 'square', 0.05, 0.09)
      tone(784, 0.12, 'square', 0.05, 0.18)
      break
    case 'victory':
      tone(523, 0.12, 'square', 0.05)
      tone(659, 0.12, 'square', 0.05, 0.12)
      tone(784, 0.12, 'square', 0.05, 0.24)
      tone(1047, 0.22, 'square', 0.05, 0.36)
      vibrate([0, 40, 40, 60])
      break
    case 'defeat':
      tone(392, 0.18, 'sawtooth', 0.05)
      tone(294, 0.18, 'sawtooth', 0.05, 0.18)
      tone(196, 0.3, 'sawtooth', 0.05, 0.36)
      vibrate(60)
      break
    case 'mega':
      sweep(200, 900, 0.5, 'sawtooth', 0.05)
      vibrate([0, 20, 20, 40])
      break
    case 'catch':
      tone(440, 0.08, 'square', 0.05)
      tone(660, 0.1, 'square', 0.05, 0.1)
      vibrate(20)
      break
    case 'select':
      tone(660, 0.04, 'square', 0.03)
      break
  }
}
