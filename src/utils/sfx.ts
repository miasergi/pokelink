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

/** Ráfaga de RUIDO filtrado: chut de balón, ovación de la grada. */
function noiseBurst(dur: number, freq: number, gain = 0.05, delay = 0) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + delay
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = 0.8
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter).connect(g).connect(c.destination)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
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
  | 'victory' | 'defeat' | 'select' | 'mega' | 'catch' | 'noEffect'
  // --- fútbol (modo Inazuma) ---
  | 'whistle' | 'kick' | 'gol' | 'parada' | 'supertecnica'
  // --- interfaz (sintetizados propios, con nervio eléctrico Inazuma) ---
  | 'tap' | 'confirm' | 'back' | 'buy' | 'error' | 'energia'

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
    case 'noEffect':
      // golpe sordo y apagado: el ataque "rebota" sin efecto
      tone(110, 0.15, 'sine', 0.035)
      vibrate(8)
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
      // Blip de botón: doble armónico corto — cristalino, no un pitido seco.
      tone(880, 0.035, 'triangle', 0.03)
      tone(1320, 0.05, 'sine', 0.02, 0.03)
      break
    // ------------------------------------------------------- interfaz ---
    case 'tap':
      // Toque suave: chips, pestañas, cosas pequeñas.
      tone(520, 0.03, 'triangle', 0.025)
      break
    case 'confirm':
      // Acción principal: zap eléctrico ascendente + acorde rápido. El
      // «¡rayo!» de la casa, en pequeño.
      sweep(400, 1500, 0.12, 'sawtooth', 0.026)
      tone(784, 0.07, 'square', 0.035)
      tone(1175, 0.1, 'square', 0.03, 0.06)
      break
    case 'back':
      // Volver: blip descendente, sin drama.
      sweep(700, 320, 0.09, 'triangle', 0.03)
      break
    case 'buy':
      // Compra/fichaje: clac de caja + campanita doble.
      noiseBurst(0.05, 3000, 0.03)
      tone(988, 0.08, 'square', 0.04, 0.04)
      tone(1319, 0.14, 'square', 0.04, 0.12)
      vibrate(15)
      break
    case 'error':
      // No se puede: zumbido grave doble.
      tone(140, 0.12, 'sawtooth', 0.045)
      tone(120, 0.12, 'sawtooth', 0.04, 0.1)
      vibrate(30)
      break
    case 'energia':
      // Filosofía armada / energía que se enciende: carga eléctrica larga
      // con chisporroteo al final.
      sweep(150, 1800, 0.3, 'sawtooth', 0.035)
      noiseBurst(0.15, 2500, 0.03, 0.22)
      vibrate([0, 15, 20, 25])
      break
    // ------------------------------------------------- fútbol (Inazuma) ---
    case 'whistle':
      // Pitido de árbitro: trino agudo doble.
      tone(2350, 0.13, 'square', 0.028)
      tone(2350, 0.3, 'square', 0.028, 0.17)
      break
    case 'kick':
      // Chut: golpe sordo de ruido grave.
      noiseBurst(0.09, 240, 0.09)
      vibrate(10)
      break
    case 'gol':
      // ¡Gol!: fanfarria ascendente + rugido de grada.
      tone(523, 0.1, 'square', 0.05)
      tone(659, 0.1, 'square', 0.05, 0.1)
      tone(784, 0.1, 'square', 0.05, 0.2)
      tone(1047, 0.3, 'square', 0.055, 0.3)
      noiseBurst(0.9, 900, 0.035, 0.25)
      vibrate([0, 50, 40, 80])
      break
    case 'parada':
      // Manotazo del portero: golpe seco y grave que corta.
      noiseBurst(0.12, 500, 0.07)
      tone(180, 0.14, 'sine', 0.05, 0.02)
      vibrate(18)
      break
    case 'supertecnica':
      // La técnica carga y estalla.
      sweep(180, 1200, 0.35, 'sawtooth', 0.04)
      noiseBurst(0.2, 1500, 0.03, 0.3)
      vibrate([0, 15, 15, 30])
      break
  }
}
