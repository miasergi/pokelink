import { useSettings } from '@/state/settingsStore'

// Música de fondo ORIGINAL sintetizada con WebAudio (sin archivos ni samples).
// Estilo lo-fi: acordes suaves + bajo cálido + percusión sutil + crackle de vinilo
// y un filtro paso-bajo para la calidez. Una pista por ambiente.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let lp: BiquadFilterNode | null = null
let crackle: AudioBufferSourceNode | null = null
let timer: number | null = null
let current: Track | null = null
let step = 0

export type Track = 'map' | 'battle' | 'boss' | 'story' | 'league'

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.06
    lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2400
    master.connect(lp).connect(ctx.destination)
    startCrackle()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Crepitar de vinilo continuo (ruido filtrado muy bajo) para el aire lo-fi. */
function startCrackle() {
  if (!ctx || !master || crackle) return
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.04 ? 1 : 0.12)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1600
  const g = ctx.createGain()
  g.gain.value = 0.05
  src.connect(hp).connect(g).connect(master)
  src.start()
  crackle = src
}

const N: Record<string, number> = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, Bb2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, Bb3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, Bb4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
}

interface TrackDef {
  bpm: number
  /** Empuja las semicorcheas impares para un groove relajado (0..1). */
  swing: number
  wave: OscillatorType
  steps: number
  cutoff: number
  bass: (string | null)[]
  chords: (string[] | null)[]
  lead: (string | null)[]
  perc: boolean
}

const SEQ: Record<Track, TrackDef> = {
  // Runs: lo-fi cálido (Cmaj7 · Am7 · Fmaj7 · G7).
  map: {
    bpm: 76, swing: 0.5, wave: 'sine', steps: 16, cutoff: 2300, perc: true,
    bass: ['C2', null, 'G2', null, 'A2', null, 'E3', null, 'F2', null, 'C3', null, 'G2', null, 'D3', null],
    chords: [['E4', 'G4', 'B4'], null, null, null, ['E4', 'A4', 'C5'], null, null, null, ['F4', 'A4', 'C5'], null, null, null, ['F4', 'G4', 'B4'], null, null, null],
    lead: [null, null, 'G4', null, null, 'E4', null, null, 'A4', null, null, 'G4', null, 'E4', null, null],
  },
  // Liga: lo-fi algo más despierto (Dm9 · G7 · Cmaj7 · Am7).
  league: {
    bpm: 82, swing: 0.5, wave: 'triangle', steps: 16, cutoff: 2600, perc: true,
    bass: ['D2', null, 'A2', null, 'G2', null, 'D3', null, 'C2', null, 'G2', null, 'A2', null, 'E3', null],
    chords: [['F4', 'A4', 'C5'], null, null, null, ['F4', 'G4', 'B4'], null, null, null, ['E4', 'G4', 'B4'], null, null, null, ['E4', 'A4', 'C5'], null, null, null],
    lead: [null, 'A4', null, null, 'B4', null, null, 'G4', null, null, 'E4', null, 'D4', null, null, null],
  },
  // Historia: ambiente lento y enrarecido (niebla / frecuencias), con acorde menor.
  story: {
    bpm: 60, swing: 0, wave: 'sine', steps: 16, cutoff: 1700, perc: false,
    bass: ['A2', null, null, null, 'F2', null, null, null, 'A2', null, null, null, 'E2', null, 'Bb2', null],
    chords: [['A3', 'C4', 'E4'], null, null, null, ['F3', 'A3', 'C4'], null, null, null, ['A3', 'C4', 'E4'], null, null, null, ['E3', 'G3', 'B3'], null, null, null],
    lead: ['A4', null, 'C5', null, null, 'B4', null, null, 'D5', null, 'C5', null, null, 'E4', null, null],
  },
  // Combate: con ritmo (no lo-fi).
  battle: {
    bpm: 132, swing: 0, wave: 'square', steps: 8, cutoff: 6500, perc: true,
    bass: ['E3', 'E3', 'G3', 'G3', 'A3', 'A3', 'D3', 'D3'],
    chords: [null, null, null, null, null, null, null, null],
    lead: ['E4', 'B4', 'E4', 'G4', 'A4', 'E4', 'D4', 'G4'],
  },
  boss: {
    bpm: 148, swing: 0, wave: 'sawtooth', steps: 8, cutoff: 7500, perc: true,
    bass: ['C3', 'C3', 'D3', 'D3', 'E3', 'E3', 'G3', 'A3'],
    chords: [null, null, null, null, null, null, null, null],
    lead: ['C5', 'B4', 'G4', 'E4', 'F4', 'A4', 'G4', 'E4'],
  },
}

function note(freq: number, t0: number, dur: number, wave: OscillatorType, gain: number, detune = 0) {
  const c = ctx!
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(freq, t0)
  if (detune) osc.detune.setValueAtTime(detune, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(master!)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function kick(t0: number) {
  const c = ctx!
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, t0)
  osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.12)
  g.gain.setValueAtTime(0.9, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
  osc.connect(g).connect(master!)
  osc.start(t0)
  osc.stop(t0 + 0.18)
}

function hat(t0: number, gain = 0.12) {
  const c = ctx!
  const len = c.sampleRate * 0.03
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 7000
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04)
  src.connect(hp).connect(g).connect(master!)
  src.start(t0)
  src.stop(t0 + 0.05)
}

function tick() {
  if (!ctx || !current) return
  const seq = SEQ[current]
  const beat = 60 / seq.bpm / 2 // semicorcheas
  const i = step % seq.steps
  const swungDelay = seq.swing && i % 2 === 1 ? beat * seq.swing * 0.34 : 0
  const t0 = ctx.currentTime + 0.05 + swungDelay
  const b = seq.bass[i]
  const ch = seq.chords[i]
  const l = seq.lead[i]
  if (b) note(N[b], t0, beat * 3.6, 'sine', 0.5)
  if (ch) for (const cn of ch) { note(N[cn], t0, beat * 6, 'triangle', 0.14); note(N[cn], t0, beat * 6, 'sine', 0.09, 6) }
  if (l) note(N[l], t0, beat * 1.6, seq.wave, 0.22)
  if (seq.perc) {
    if (i % 4 === 0) kick(t0)
    if (i % 2 === 1) hat(t0, current === 'map' || current === 'league' ? 0.07 : 0.13)
  }
  step++
  timer = window.setTimeout(tick, beat * 1000)
}

/** Inicia (o cambia) la música de fondo. Respeta el ajuste de música. */
export function startMusic(track: Track) {
  if (!useSettings.getState().music) return
  if (current === track && timer !== null) return
  stopMusic()
  if (!ac()) return
  if (lp) lp.frequency.value = SEQ[track].cutoff
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
