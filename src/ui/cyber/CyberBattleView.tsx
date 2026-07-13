// Combate por timing de la Cyber PokéBall.
// - Carrusel de símbolos que gira: ● lo para (cara triste = turno perdido).
// - Golpe fuerte → minijuego de machacar ◄ ►.
// - CAPTURA: «cierra la tapa» y agita el dispositivo.
// - Tras el primer turno: CAMBIO y HUIR, como el juguete.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCyber } from '@/state/cyberStore'
import { getMove, getSpecies } from '@/data'
import { carouselStepMs, MASH_GOAL, MASH_WINDOW_MS, PRECISION_LABEL, type StopPrecision } from '@/engine/cyber/timingBattle'
import { catchChance } from '@/engine/cyber/capture'
import { useShake } from '@/ui/hooks/useShake'
import { play } from '@/utils/sfx'
import { useShellControls } from './CyberShell'
import { LcdText, LcdButton, LcdHpBar, LcdSprite } from './lcd'

type Overlay = null | 'capture-lid' | 'capture-shake' | 'flee'

const LOG_LINE_MS = 850

export function BattleView() {
  const {
    battle, save, stopCarousel, finishMash, battleAnimDone,
    requestSwitch, switchTo, cancelSwitch, tryFlee, attemptCapture, acknowledgeEnd,
  } = useCyber()

  const [activeIdx, setActiveIdx] = useState(0)
  const [shownLines, setShownLines] = useState(0)
  const [lastPrecision, setLastPrecision] = useState<StopPrecision | null>(null)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [mashCount, setMashCount] = useState(0)
  const [mashLeft, setMashLeft] = useState(MASH_WINDOW_MS)
  // Refs para leer valores FRESCOS desde callbacks/intervalos estables
  // (el estado de React quedaría congelado en la clausura del render).
  const activeIdxRef = useRef(0)
  const slotStartRef = useRef(0)
  const mashCountRef = useRef(0)
  const shake = useShake(2000)

  const playerMon = save && battle ? save.party[battle.playerIndex] : null
  const phase = battle?.phase

  // ---- reproducción del log ----
  useEffect(() => {
    if (!battle) return
    if (phase !== 'intro' && phase !== 'anim' && phase !== 'end') return
    setShownLines(0)
    const iv = setInterval(() => {
      setShownLines((n) => {
        if (n + 1 >= battle.log.length) clearInterval(iv)
        return n + 1
      })
    }, LOG_LINE_MS)
    return () => clearInterval(iv)
  }, [battle?.log, phase, battle])

  const logDone = !battle || shownLines >= battle.log.length

  // Al terminar el log de intro/anim, pasar al carrusel.
  useEffect(() => {
    if (!battle || !logDone) return
    if (phase === 'intro' || phase === 'anim') {
      const t = setTimeout(() => { setLastPrecision(null); battleAnimDone() }, 500)
      return () => clearTimeout(t)
    }
  }, [logDone, phase, battle, battleAnimDone])

  // ---- carrusel ----
  const stepMs = carouselStepMs(save?.progress.badges ?? 0)
  useEffect(() => {
    if (phase !== 'carousel' || overlay) return
    slotStartRef.current = performance.now()
    const iv = setInterval(() => {
      slotStartRef.current = performance.now()
      activeIdxRef.current = (activeIdxRef.current + 1) % Math.max(1, battle?.carousel.length ?? 8)
      setActiveIdx(activeIdxRef.current)
      play('select')
    }, stepMs)
    return () => clearInterval(iv)
  }, [phase, stepMs, battle?.carousel.length, overlay])

  // Estable entre ticks: lee el slot activo del ref, no del estado.
  const doStop = useCallback(() => {
    const offset = (performance.now() - slotStartRef.current) / stepMs // 0..1 dentro del slot
    const centered = Math.abs(offset - 0.5)
    const precision: StopPrecision = centered < 0.17 ? 'perfect' : centered < 0.35 ? 'good' : 'poor'
    setLastPrecision(precision)
    stopCarousel(activeIdxRef.current, precision)
  }, [stepMs, stopCarousel])

  // ---- minijuegos de machaque (potenciar / huir) ----
  // Un ÚNICO efecto conduce la cuenta atrás Y resuelve al agotarse, leyendo el
  // contador del ref. (Separarlo en dos efectos disparaba la resolución al
  // instante con el mashLeft=0 residual del render anterior.)
  const mashMode: 'boost' | 'flee' | null = phase === 'mash' ? 'boost' : overlay === 'flee' ? 'flee' : null
  useEffect(() => {
    if (!mashMode) return
    mashCountRef.current = 0
    setMashCount(0)
    setMashLeft(MASH_WINDOW_MS)
    const started = Date.now()
    const iv = setInterval(() => {
      const left = MASH_WINDOW_MS - (Date.now() - started)
      setMashLeft(Math.max(0, left))
      if (left <= 0) {
        clearInterval(iv)
        if (mashMode === 'boost') {
          finishMash(mashCountRef.current, MASH_GOAL)
        } else {
          setOverlay(null)
          tryFlee(Math.min(1, mashCountRef.current / MASH_GOAL))
        }
      }
    }, 100)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mashMode])

  const mashHit = useCallback(() => {
    play('hit')
    mashCountRef.current += 1
    setMashCount(mashCountRef.current)
  }, [])

  // ---- captura ----
  useEffect(() => {
    if (overlay !== 'capture-shake') return
    shake.reset()
    shake.start()
    const t = setTimeout(() => {
      shake.stop()
      setOverlay(null)
      attemptCapture(shake.getScore()) // lectura fresca: `score` estaría congelado
    }, 2400)
    return () => { clearTimeout(t); shake.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay])

  // ---- controles físicos según sub-fase ----
  const startCaptureShake = useCallback(() => {
    if (shake.needsPermission && shake.permission !== 'granted') {
      void shake.requestPermission().finally(() => setOverlay('capture-shake'))
    } else setOverlay('capture-shake')
  }, [shake])

  const controls = (() => {
    if (overlay === 'capture-lid') return { onCenter: startCaptureShake, centerLabel: 'AGITAR' }
    if (overlay === 'capture-shake') return { onCenter: shake.tap, centerLabel: '¡AGITA!' }
    if (mashMode) return { onLeft: mashHit, onRight: mashHit, centerLabel: '◄ ► ¡MACHACA!' }
    if (phase === 'carousel') return { onCenter: doStop, centerLabel: '¡PARA!' }
    if (phase === 'end') return logDone ? { onCenter: acknowledgeEnd, centerLabel: 'OK' } : {}
    if (phase === 'intro' || phase === 'anim') return { onCenter: () => setShownLines(battle?.log.length ?? 0), centerLabel: '»' }
    return {}
  })()

  useShellControls(controls, [phase, overlay, mashMode, doStop, mashHit, startCaptureShake, shake.tap, logDone, acknowledgeEnd, battle?.log.length])

  if (!battle || !save || !playerMon) return null

  const enemySp = getSpecies(battle.enemy.speciesId)
  const activeSlot = battle.carousel[activeIdx]
  const balls = save.items['ball'] ?? 0

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Enemigo */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <LcdHpBar mon={battle.enemy} label={(battle.trainer ? `${battle.trainer.name} · ` : '') + enemySp.displayName.toUpperCase()} />
        </div>
        <LcdSprite speciesId={battle.enemy.speciesId} shiny={battle.enemy.shiny} size="md" className={battle.enemy.currentHp <= 0 ? 'opacity-30' : ''} />
      </div>

      {/* Jugador */}
      <div className="flex items-end justify-between gap-2 mt-1">
        <LcdSprite speciesId={playerMon.speciesId} shiny={playerMon.shiny} size="md" flip className={playerMon.currentHp <= 0 ? 'opacity-30' : ''} />
        <div className="flex-1">
          <LcdHpBar mon={playerMon} label={getSpecies(playerMon.speciesId).displayName.toUpperCase()} />
        </div>
      </div>

      {/* Zona central: log / carrusel / mash / switch */}
      <div className="flex-1 min-h-0 flex flex-col justify-end mt-1">
        {(phase === 'intro' || phase === 'anim' || phase === 'end') && (
          <div className="flex flex-col gap-0.5">
            {battle.log.slice(0, shownLines).slice(-4).map((l, i) => (
              <LcdText key={`${i}-${l}`}>{l}</LcdText>
            ))}
            {phase === 'end' && logDone && (
              <LcdButton active onClick={acknowledgeEnd} className="mt-1 text-center">► OK</LcdButton>
            )}
          </div>
        )}

        {phase === 'carousel' && !overlay && (
          <div className="flex flex-col gap-1.5">
            {lastPrecision && <LcdText center className="text-yellow-200">{PRECISION_LABEL[lastPrecision]}</LcdText>}
            {/* Símbolo activo grande */}
            <div className="text-center">
              {activeSlot?.kind === 'move' ? (
                <>
                  <div className="text-[12px] text-emerald-100">{getMove(activeSlot.moveId).displayName.toUpperCase()}</div>
                  <LcdText dim center>POT {getMove(activeSlot.moveId).power} · {String(getMove(activeSlot.moveId).type).toUpperCase()}</LcdText>
                </>
              ) : (
                <div className="text-[16px] text-red-300">☹</div>
              )}
            </div>
            {/* Tira de símbolos */}
            <div className="flex justify-center gap-1">
              {battle.carousel.map((s, i) => (
                <span
                  key={i}
                  className={`w-6 h-6 grid place-items-center rounded border text-[10px] ${
                    i === activeIdx
                      ? 'border-yellow-300 bg-yellow-300/20 text-yellow-200 scale-110'
                      : 'border-emerald-800 text-emerald-500'
                  } transition-transform`}
                >
                  {s.kind === 'move' ? '●' : '☹'}
                </span>
              ))}
            </div>
            <LcdText dim center>¡PULSA ● PARA ATACAR!</LcdText>
            {/* Acciones */}
            <div className="grid grid-cols-3 gap-1.5">
              <LcdButton
                disabled={battle.kind !== 'wild' || balls <= 0}
                onClick={() => setOverlay('capture-lid')}
                className="text-center"
              >
                BALL ×{balls}
              </LcdButton>
              <LcdButton disabled={battle.turn < 2 || save.party.filter((m) => m.currentHp > 0).length < 2} onClick={requestSwitch} className="text-center">
                CAMBIO
              </LcdButton>
              <LcdButton disabled={battle.kind !== 'wild' || battle.turn < 2} onClick={() => setOverlay('flee')} className="text-center">
                HUIR
              </LcdButton>
            </div>
          </div>
        )}

        {mashMode && (
          <MashPanel
            count={mashCount}
            left={mashLeft}
            onHit={mashHit}
            label={mashMode === 'boost' ? '¡MACHACA ◄ ► PARA POTENCIAR!' : '¡MACHACA ◄ ► PARA HUIR!'}
          />
        )}

        {phase === 'switch' && (
          <div className="flex flex-col gap-1">
            <LcdText center>¿A QUIÉN ENVÍAS?</LcdText>
            {save.party.map((m, i) => (
              <LcdButton
                key={m.uid}
                disabled={m.currentHp <= 0 || i === battle.playerIndex}
                onClick={() => switchTo(i, playerMon.currentHp > 0)}
                className="flex items-center gap-2"
              >
                <span className="inline-flex items-center gap-2">
                  <LcdSprite speciesId={m.speciesId} shiny={m.shiny} size="sm" />
                  {getSpecies(m.speciesId).displayName.toUpperCase()} · {m.currentHp}/{m.stats.hp}
                </span>
              </LcdButton>
            ))}
            {playerMon.currentHp > 0 && <LcdButton onClick={cancelSwitch} className="text-center">VOLVER</LcdButton>}
          </div>
        )}

        {overlay === 'capture-lid' && (
          <div className="flex flex-col items-center gap-2 py-2">
            <LcdText center>CIERRA LA TAPA…</LcdText>
            <div className="w-16 h-16 rounded-full border-4 border-emerald-300 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-red-500/70 animate-pulse" />
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-200" />
            </div>
            <LcdText dim center>PROB. {(catchChance(battle.enemy, enemySp, 0.7) * 100).toFixed(0)}%</LcdText>
            <LcdButton active onClick={startCaptureShake} className="text-center">● ¡AGITAR!</LcdButton>
            <LcdButton onClick={() => setOverlay(null)} className="text-center">CANCELAR</LcdButton>
          </div>
        )}

        {overlay === 'capture-shake' && (
          <div className="flex flex-col items-center gap-2 py-2">
            <LcdText center className="animate-pulse text-yellow-200">¡AGITA! ¡AGITA! ¡AGITA!</LcdText>
            <div className="w-3/4 h-2.5 rounded-sm bg-emerald-950 border border-emerald-800 overflow-hidden">
              <div className="h-full bg-yellow-300 transition-all" style={{ width: `${shake.score * 100}%` }} />
            </div>
            <LcdText dim center>{shake.supported ? 'AGITA EL MÓVIL (O PULSA ● RÁPIDO)' : 'PULSA ● MUY RÁPIDO'}</LcdText>
          </div>
        )}
      </div>
    </div>
  )
}

function MashPanel({ count, left, onHit, label }: { count: number; left: number; onHit: () => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      <LcdText center className="text-yellow-200">{label}</LcdText>
      <div className="flex items-center gap-3">
        <button onClick={onHit} className="text-2xl text-emerald-200 active:scale-90 transition">◄</button>
        <div className="text-[14px] text-emerald-100 w-10 text-center">{count}</div>
        <button onClick={onHit} className="text-2xl text-emerald-200 active:scale-90 transition">►</button>
      </div>
      <div className="w-3/4 h-2 rounded-sm bg-emerald-950 border border-emerald-800 overflow-hidden">
        <div className="h-full bg-yellow-300" style={{ width: `${Math.min(100, (count / MASH_GOAL) * 100)}%` }} />
      </div>
      <LcdText dim center>{(left / 1000).toFixed(1)}s</LcdText>
    </div>
  )
}
