// Mapa de ciudad ciclable + radar de encuentros de la Cyber PokéBall.
import { useEffect, useMemo, useState } from 'react'
import { useCyber } from '@/state/cyberStore'
import { getLocations } from '@/engine/cyber/cyberEngine'
import { radarRings, radarAngle, RADAR_MAX_STEPS } from '@/engine/cyber/radar'
import { getSpecies } from '@/data'
import { useShake } from '@/ui/hooks/useShake'
import { play } from '@/utils/sfx'
import { useShellControls } from './CyberShell'
import { LcdTitle, LcdText, LcdButton, LcdSprite } from './lcd'

const LOC_ICON: Record<string, string> = {
  center: '⌂', route: '↟', gym: '◫', rival: '!', league: '♛',
}

export function MapView() {
  const { save, setLocation, travel, mapMessage, clearMapMessage, goTo } = useCyber()
  const locations = useMemo(() => (save ? getLocations(save) : []), [save])
  const idx = Math.min(save?.locationIndex ?? 0, Math.max(0, locations.length - 1))
  const loc = locations[idx]

  useShellControls({
    onLeft: () => setLocation((idx + locations.length - 1) % locations.length),
    onRight: () => setLocation((idx + 1) % locations.length),
    onCenter: travel,
    centerLabel: 'IR',
  }, [idx, locations.length, travel, setLocation])

  useEffect(() => {
    if (!mapMessage) return
    const t = setTimeout(clearMapMessage, 2200)
    return () => clearTimeout(t)
  }, [mapMessage, clearMapMessage])

  if (!save || !loc) return null
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between">
        <LcdText dim>MEDALLAS {save.progress.badges}/8</LcdText>
        <LcdText dim>{save.money} ₽</LcdText>
      </div>

      {/* Carrusel de ubicaciones */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <LcdTitle>MAPA</LcdTitle>
        <div className="flex items-center gap-3">
          <span className="text-emerald-500">◄</span>
          <div className="w-36 h-20 rounded border border-emerald-700 bg-emerald-900/30 grid place-items-center">
            <div className="text-2xl text-emerald-200">{LOC_ICON[loc.kind] ?? '?'}</div>
            <div className="text-[9px] text-emerald-100 -mt-1">{loc.label}</div>
          </div>
          <span className="text-emerald-500">►</span>
        </div>
        <div className="flex gap-1">
          {locations.map((l, i) => (
            <span key={`${l.kind}${l.index}`} className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-emerald-300' : 'bg-emerald-800'}`} />
          ))}
        </div>
        {mapMessage
          ? <LcdText center className="text-yellow-200">{mapMessage}</LcdText>
          : <LcdText dim center>{hintFor(loc.kind)}</LcdText>}
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-3 gap-1.5">
        <LcdButton onClick={() => goTo('dex')} className="text-center">DEX</LcdButton>
        <LcdButton onClick={() => goTo('bag')} className="text-center">EQUIPO</LcdButton>
        <LcdButton onClick={travel} active className="text-center">IR ►</LcdButton>
      </div>
    </div>
  )
}

function hintFor(kind: string): string {
  switch (kind) {
    case 'center': return 'CURA Y GESTIONA TU EQUIPO'
    case 'route': return 'BUSCA POKÉMON Y ENTRENADORES'
    case 'gym': return '¡DESAFÍA AL LÍDER!'
    case 'rival': return 'TU RIVAL TE ESPERA…'
    case 'league': return 'EL ALTO MANDO AGUARDA'
    default: return ''
  }
}

// ---- Radar ----
export function RadarView() {
  const { radar, radarTarget, radarTurn, radarStep, radarEngage, radarLeave, save } = useCyber()
  const shake = useShake()
  const [engaging, setEngaging] = useState(false)
  const rings = radar ? radarRings(radar) : 0
  const ready = rings === 2

  // Al llegar a 2 anillos: activar sensor y esperar sacudida (o taps).
  useEffect(() => {
    if (ready && !engaging) {
      setEngaging(true)
      shake.reset()
      shake.start()
    }
    if (!ready && engaging) {
      setEngaging(false)
      shake.stop()
    }
  }, [ready, engaging, shake])

  useEffect(() => {
    if (engaging && shake.score >= 1) {
      shake.stop()
      play('catch')
      radarEngage()
    }
  }, [engaging, shake.score, shake, radarEngage])

  // Ping según cercanía
  useEffect(() => {
    if (!radar) return
    play('select')
  }, [radar])

  useShellControls({
    onLeft: () => radarTurn('left'),
    onRight: () => radarTurn('right'),
    onCenter: ready
      ? () => { shake.tap(); if (!shake.needsPermission || shake.permission === 'granted') shake.start() }
      : radarStep,
    centerLabel: ready ? '¡AGITA!' : 'PASO',
  }, [ready, radarTurn, radarStep, shake.tap])

  if (!radar || !radarTarget || !save) return null
  const angle = radarAngle(radar)
  const dist = Math.min(1, (Math.abs(radar.dx) + Math.abs(radar.dy)) / 6)
  const blipX = 50 + Math.sin(angle) * 38 * dist
  const blipY = 50 - Math.cos(angle) * 38 * dist
  const stepsLeft = RADAR_MAX_STEPS - radar.steps

  return (
    <div className="flex-1 flex flex-col items-center">
      <LcdTitle>RADAR</LcdTitle>
      <LcdText dim center>{ready ? '¡AL LADO! ¡AGITA LA BOLA!' : rings === 1 ? 'Está cerca…' : 'Señal débil…'}</LcdText>

      <div className="relative flex-1 w-full max-w-[11rem] my-2" style={{ aspectRatio: '1' }}>
        {/* Rejilla del radar */}
        <div className="absolute inset-0 rounded-full border border-emerald-700/70" />
        <div className="absolute inset-[18%] rounded-full border border-emerald-800/60" />
        <div className="absolute inset-[36%] rounded-full border border-emerald-800/50" />
        <div className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-emerald-300 rounded-full" />
        {/* Flecha de orientación (siempre arriba: el marco es relativo) */}
        <div className="absolute left-1/2 top-[6%] -translate-x-1/2 text-emerald-400 text-[10px]">▲</div>
        {/* Blip del Pokémon */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${blipX}%`, top: `${blipY}%` }}>
          <span className={`block w-2 h-2 rounded-full ${ready ? 'bg-yellow-300 animate-ping' : 'bg-emerald-200 animate-pulse'}`} />
          {rings >= 1 && <span className="absolute -inset-1.5 rounded-full border border-emerald-300/80" />}
          {rings === 2 && <span className="absolute -inset-3 rounded-full border border-yellow-300/80 animate-pulse" />}
        </div>
      </div>

      {ready ? (
        <div className="w-full flex flex-col items-center gap-1">
          {/* Barra de sacudida */}
          <div className="w-3/4 h-2 rounded-sm bg-emerald-950 border border-emerald-800 overflow-hidden">
            <div className="h-full bg-yellow-300 transition-all" style={{ width: `${shake.score * 100}%` }} />
          </div>
          {shake.needsPermission && shake.permission !== 'granted' ? (
            <LcdButton active onClick={() => void shake.requestPermission().then((ok) => { if (ok) shake.start() })}>
              ACTIVAR SENSOR DE MOVIMIENTO
            </LcdButton>
          ) : (
            <LcdText dim center>{shake.supported ? 'AGITA EL MÓVIL (O PULSA ● RÁPIDO)' : 'PULSA ● MUY RÁPIDO'}</LcdText>
          )}
        </div>
      ) : (
        <LcdText dim center>◄ ► GIRA · ● AVANZA · {stepsLeft} PASOS</LcdText>
      )}

      <div className="w-full flex justify-between items-center mt-1">
        <LcdSprite speciesId={radarTarget.species} size="sm" className="opacity-40" />
        <LcdText dim>¿{getSpecies(radarTarget.species).displayName.toUpperCase().replace(/./g, '·')}?</LcdText>
        <LcdButton onClick={radarLeave}>HUIR</LcdButton>
      </div>
    </div>
  )
}
