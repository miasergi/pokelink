import { useSettings } from '@/state/settingsStore'

// Música de fondo MUY ligera, sintetizada con WebAudio (sin archivos).
// Dos ambientes: 'map' (tranquilo) y 'battle' (con más ritmo).

let ctx: AudioContext | null = null
let master: GainNode | null = null
let timer: number | null = null
let current: Track | null = null
let step = 0

export type Track = 'map' | 'battle' | 'boss'

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.05
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// Frecuencias de notas (Hz) por nombre simplificado.
const N: Record<string, number> = {
  C3: 130.8, D3: 146.8, E3: 164.8, G3: 196.0, A3: 220.0,
  C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392.0, A4: 440.0, B4: 493.9, C5: 523.3,
}

// Secuencias (arpegios) por ambiente. Cada paso = una nota (o silencio null).
const SEQ: Record<Track, { bass: (string | null)[]; lead: (string | null)[]; bpm: number; wave: OscillatorType }> = {
  map: {
    bass: ['C3', null, 'G3', null, 'A3', null, 'E3', null],
    lead: ['C4', 'E4', 'G4', 'E4', 'A4', 'G4', 'E4', 'C4'],
    bpm: 96, wave: 'triangle',
  },
  battle: {
    bass: ['E3', 'E3', 'G3', 'G3', 'A3', 'A3', 'D3', 'D3'],
    lead: ['E4', 'B4', 'E4', 'G4', 'A4', 'E4', 'D4', 'G4'],
    bpm: 132, wave: 'square',
  },
  boss: {
    bass: ['C3', 'C3', 'D3', 'D3', 'E3', 'E3', 'G3', 'A3'],
    lead: ['C5', 'B4', 'G4', 'E4', 'F4', 'A4', 'G4', 'E4'],
    bpm: 148, wave: 'sawtooth',
  },
}

function note(freq: number, t0: number, dur: number, wave: OscillatorType, gain: number) {
  const c = ctx!
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(master!)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function tick() {
  if (!ctx || !current) return
  const seq = SEQ[current]
  const beat = 60 / seq.bpm / 2 // semicorcheas
  const t0 = ctx.currentTime + 0.04
  const b = seq.bass[step % seq.bass.length]
  const l = seq.lead[step % seq.lead.length]
  if (b) note(N[b], t0, beat * 1.8, 'sine', 0.5)
  if (l) note(N[l], t0, beat * 0.9, seq.wave, 0.32)
  step++
  timer = window.setTimeout(tick, beat * 1000)
}

/** Inicia (o cambia) la música de fondo. Respeta el ajuste de música. */
export function startMusic(track: Track) {
  if (!useSettings.getState().music) return
  if (current === track && timer !== null) return
  stopMusic()
  if (!ac()) return
  current = track
  step = 0
  tick()
}

export function stopMusic() {
  if (timer !== null) { clearTimeout(timer); timer = null }
  current = null
}

/** Aplica el ajuste de música (llamar al cambiar el toggle). */
export function syncMusicSetting(track: Track | null) {
  if (!useSettings.getState().music) stopMusic()
  else if (track) startMusic(track)
}
