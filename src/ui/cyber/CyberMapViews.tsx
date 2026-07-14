// Mapa del pueblo/región y EXPLORACIÓN EN PRIMERA PERSONA de la Cyber PokéBall.
//
// Fiel al juguete: mapa con el Centro Pokémon y áreas que se van abriendo; al
// entrar en un área, vista en primera persona donde GIRAS (arrastrando el dedo)
// y AVANZAS, con el radar señalando la dirección del Pokémon y los anillos
// midiendo la distancia. Con 2 anillos: agitas la bola y empieza el combate.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCyber } from '@/state/cyberStore'
import { getLocations } from '@/engine/cyber/cyberEngine'
import {
  rings, bearing, distance, canEngage, stepsLeft, proximityHint,
} from '@/engine/cyber/explore'
import { getSpecies } from '@/data'
import { GENERATIONS } from '@/data/generations'
import type { CyberTerrain } from '@/engine/cyber/types'
import { useShake } from '@/ui/hooks/useShake'
import { play } from '@/utils/sfx'
import { LcdTitle, LcdText, LcdButton, LcdSprite } from './lcd'

// ---------------- MAPA ----------------

const LOC_STYLE: Record<string, { icon: string; cls: string }> = {
  center: { icon: '⌂', cls: 'border-red-400 text-red-200 bg-red-500/10' },
  route: { icon: '❖', cls: 'border-emerald-600 text-emerald-200 bg-emerald-900/30' },
  gym: { icon: '◫', cls: 'border-yellow-400 text-yellow-200 bg-yellow-500/10' },
  rival: { icon: '!', cls: 'border-orange-400 text-orange-200 bg-orange-500/10' },
  league: { icon: '♛', cls: 'border-fuchsia-400 text-fuchsia-200 bg-fuchsia-500/10' },
  secret: { icon: '★', cls: 'border-cyan-300 text-cyan-100 bg-cyan-400/10 animate-pulse' },
}

export function MapView() {
  const { save, travelTo, mapMessage, clearMapMessage, goTo } = useCyber()
  const locations = useMemo(() => (save ? getLocations(save) : []), [save])

  useEffect(() => {
    if (!mapMessage) return
    const t = setTimeout(clearMapMessage, 2400)
    return () => clearTimeout(t)
  }, [mapMessage, clearMapMessage])

  if (!save) return null
  const region = GENERATIONS.find((g) => g.gen === save.gen)?.region ?? ''

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <LcdText dim>{region.toUpperCase()} · {save.progress.badges}/8 ✦</LcdText>
        <LcdText dim>{save.money} ₽</LcdText>
      </div>

      <LcdTitle>MAPA</LcdTitle>
      {mapMessage
        ? <LcdText center className="text-yellow-200 shrink-0">{mapMessage}</LcdText>
        : <LcdText dim center className="shrink-0">Toca un destino</LcdText>}

      {/* Rejilla táctil de destinos */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar mt-1">
        <div className="grid grid-cols-2 gap-1.5">
          {locations.map((loc, i) => {
            const st = LOC_STYLE[loc.kind] ?? LOC_STYLE.route
            return (
              <button
                key={`${loc.kind}-${loc.index}`}
                onClick={() => { play('select'); travelTo(i) }}
                className={`rounded-lg border-2 px-1.5 py-2 flex flex-col items-center gap-0.5 active:scale-95 transition ${st.cls}`}
              >
                <span className="text-lg leading-none">{st.icon}</span>
                <span className="text-[8px] leading-tight text-center">{loc.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-1.5 shrink-0">
        <LcdButton onClick={() => goTo('dex')} className="text-center">DEX</LcdButton>
        <LcdButton onClick={() => goTo('bag')} className="text-center">EQUIPO</LcdButton>
        <LcdButton onClick={() => goTo('center')} className="text-center">CENTRO</LcdButton>
      </div>
    </div>
  )
}

// ---------------- EXPLORACIÓN EN 1ª PERSONA ----------------

/** Paleta de la escena según el terreno. */
const TERRAIN: Record<CyberTerrain, { sky: string; ground: string; props: string; label: string }> = {
  grass: { sky: '#134e3a', ground: '#052e1a', props: '🌿', label: 'HIERBA ALTA' },
  cave: { sky: '#1c1917', ground: '#0c0a09', props: '🪨', label: 'CUEVA' },
  water: { sky: '#0c4a6e', ground: '#082f49', props: '🌊', label: 'AGUAS' },
  secret: { sky: '#3b0764', ground: '#1e1b4b', props: '✦', label: 'ZONA SECRETA' },
}

export function ExploreView() {
  const {
    explore, exploreTarget, exploreTerrain,
    exploreTurnBy, exploreStep, exploreEngage, exploreLeave,
  } = useCyber()
  const shake = useShake()
  const [engaging, setEngaging] = useState(false)
  const dragRef = useRef<number | null>(null)

  const ready = explore ? canEngage(explore) : false

  // Al llegar: la bola se abre y hay que agitar.
  useEffect(() => {
    if (ready && !engaging) {
      setEngaging(true)
      shake.reset()
      shake.start()
      play('catch')
    }
    if (!ready && engaging) {
      setEngaging(false)
      shake.stop()
    }
  }, [ready, engaging, shake])

  useEffect(() => {
    if (engaging && shake.score >= 1) {
      shake.stop()
      exploreEngage()
    }
  }, [engaging, shake.score, shake, exploreEngage])

  if (!explore || !exploreTarget) return null

  const t = TERRAIN[exploreTerrain] ?? TERRAIN.grass
  const ring = rings(explore)
  const brg = bearing(explore)
  const dist = distance(explore)
  const centered = Math.abs(brg) < 25

  // Arrastrar horizontalmente = girar (y también con los botones).
  const onDown = (x: number) => { dragRef.current = x }
  const onMove = (x: number) => {
    if (dragRef.current == null) return
    const dx = x - dragRef.current
    if (Math.abs(dx) < 6) return
    exploreTurnBy(dx * 0.55)
    dragRef.current = x
  }
  const onUp = () => { dragRef.current = null }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Radar / brújula */}
      <div className="shrink-0 flex items-center gap-2">
        <div className="relative w-16 h-16 shrink-0">
          <div className="absolute inset-0 rounded-full border border-emerald-700" />
          <div className="absolute inset-[22%] rounded-full border border-emerald-800/70" />
          {/* Tu proa siempre arriba */}
          <div className="absolute left-1/2 top-0.5 -translate-x-1/2 text-[8px] text-emerald-400">▲</div>
          <div className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300" />
          {/* Blip del Pokémon en su marcación relativa */}
          <div
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${brg}deg) translateY(-${Math.min(26, 8 + dist * 3)}px)` }}
          >
            <span className={`block w-2 h-2 -ml-1 rounded-full ${ring === 2 ? 'bg-yellow-300 animate-ping' : 'bg-emerald-200 animate-pulse'}`} />
            {ring >= 1 && <span className="absolute -inset-1.5 rounded-full border border-emerald-300/80" />}
            {ring === 2 && <span className="absolute -inset-3 rounded-full border border-yellow-300/90" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <LcdText className={ring === 2 ? 'text-yellow-200' : ''}>{proximityHint(explore)}</LcdText>
          <LcdText dim>{t.label} · {stepsLeft(explore)} pasos</LcdText>
          {ring < 2 && (
            <LcdText dim className={centered ? 'text-emerald-200' : ''}>
              {centered ? '▲ ¡Vas de cara! Avanza' : brg < 0 ? '◄ Gira a la izquierda' : 'Gira a la derecha ►'}
            </LcdText>
          )}
        </div>
      </div>

      {/* Escena en 1ª persona: gira al arrastrar */}
      <div
        className="relative flex-1 min-h-0 my-1.5 rounded-lg overflow-hidden border border-emerald-900 touch-none"
        onPointerDown={(e) => onDown(e.clientX)}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        style={{ background: `linear-gradient(180deg, ${t.sky} 0%, ${t.sky} 55%, ${t.ground} 55%, ${t.ground} 100%)` }}
      >
        {/* Horizonte con parallax: se desplaza al girar → SE VE que giras */}
        <div
          className="absolute inset-0 flex items-center"
          style={{ transform: `translateX(${(-explore.heading % 360) * 2.2}px)` }}
        >
          <div className="flex gap-10 text-2xl opacity-70 select-none" style={{ marginTop: '-8%' }}>
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} style={{ opacity: 0.35 + ((i * 7) % 5) * 0.13 }}>{t.props}</span>
            ))}
          </div>
        </div>
        {/* Líneas de suelo en fuga */}
        <div className="absolute inset-x-0 bottom-0 h-[45%] pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 10px, rgba(16,185,129,0.10) 10px 11px)' }} />
        {/* Brújula inferior */}
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <LcdText dim>◄ ARRASTRA PARA GIRAR ►</LcdText>
        </div>

        {/* Al llegar: la bola se abre */}
        {ring === 2 && (
          <div className="absolute inset-0 grid place-items-center bg-black/50">
            <div className="text-center flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full border-4 border-yellow-300 relative overflow-hidden animate-bounce">
                <div className="absolute inset-x-0 top-0 h-1/2 bg-red-500" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white" />
              </div>
              <LcdText center className="text-yellow-200 animate-pulse">¡AGITA LA BOLA!</LcdText>
              <div className="w-32 h-2 rounded-sm bg-emerald-950 border border-emerald-800 overflow-hidden">
                <div className="h-full bg-yellow-300 transition-all" style={{ width: `${shake.score * 100}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controles táctiles */}
      {ring === 2 ? (
        <div className="shrink-0 flex flex-col gap-1.5">
          {shake.needsPermission && shake.permission !== 'granted' ? (
            <LcdButton active onClick={() => void shake.requestPermission().then((ok) => ok && shake.start())} className="text-center">
              ACTIVAR SENSOR DE MOVIMIENTO
            </LcdButton>
          ) : (
            <button
              onClick={shake.tap}
              className="w-full py-3 rounded-lg border-2 border-yellow-300 bg-yellow-300/20 text-yellow-100 text-[11px] font-lcd active:scale-95 transition"
            >
              {shake.supported ? '¡AGITA EL MÓVIL O TOCA RÁPIDO!' : '¡TOCA MUY RÁPIDO!'}
            </button>
          )}
          <LcdButton onClick={exploreLeave} className="text-center">HUIR</LcdButton>
        </div>
      ) : (
        <div className="shrink-0 grid grid-cols-4 gap-1.5">
          <LcdButton onClick={() => exploreTurnBy(-25)} className="text-center text-base">◄</LcdButton>
          <button
            onClick={() => { play('select'); exploreStep() }}
            className={`col-span-2 py-2.5 rounded-lg border-2 text-[10px] font-lcd active:scale-95 transition ${
              centered ? 'border-emerald-300 bg-emerald-400/25 text-emerald-100' : 'border-emerald-700 bg-emerald-900/30 text-emerald-300'
            }`}
          >
            ▲ AVANZAR
          </button>
          <LcdButton onClick={() => exploreTurnBy(25)} className="text-center text-base">►</LcdButton>
        </div>
      )}

      <div className="shrink-0 flex items-center justify-between mt-1">
        <div className="flex items-center gap-1 opacity-40">
          <LcdSprite speciesId={exploreTarget.species} size="sm" />
          <LcdText dim>{'?'.repeat(Math.min(6, getSpecies(exploreTarget.species).displayName.length))}</LcdText>
        </div>
        <LcdButton onClick={exploreLeave}>◄ VOLVER</LcdButton>
      </div>
    </div>
  )
}
