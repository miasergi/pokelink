// Combate de la Cyber PokéBall: TRAGAPERRAS DE DOS RODILLOS + animaciones.
//
// Fiel al juguete: dos tiras enfrentadas (izquierda = tú, derecha = el rival),
// se paran DE UNO EN UNO y la mitad de quien elige PARPADEA. La cara triste es
// un fallo. Ves la tira entera, así que sabes qué viene.
//
// La animación usa el modelo de fotogramas del combate principal:
// eventos → buildCyberFrames() → cursor temporizado (respeta `battleSpeed`).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCyber } from '@/state/cyberStore'
import { useSettings } from '@/state/settingsStore'
import { getMove, getSpecies } from '@/data'
import { buildCyberFrames, CYBER_DURATION, type CyberFrame } from '@/engine/cyber/cyberFrames'
import {
  reelStepMs, REEL_SIZE, MASH_GOAL, MASH_WINDOW_MS, PRECISION_LABEL,
  type StopPrecision,
} from '@/engine/cyber/reelBattle'
import { catchChance } from '@/engine/cyber/capture'
import type { ReelSlot, Side } from '@/engine/cyber/types'
import { TYPE_HEX } from '@/ui/theme/types'
import { effectivenessLabel } from '@/data/typechart'
import { useShake } from '@/ui/hooks/useShake'
import { play } from '@/utils/sfx'
import { LcdText, LcdButton, LcdSprite } from './lcd'

type Overlay = null | 'ball' | 'flee'

export function BattleView() {
  const {
    battle, save, stopReel, finishMash, battleAnimDone,
    requestSwitch, switchTo, cancelSwitch, tryFlee, throwBall, acknowledgeEnd,
  } = useCyber()
  const battleSpeed = useSettings((s) => s.battleSpeed)

  const playerMon = save && battle ? save.party[battle.playerIndex] : null
  const phase = battle?.phase

  // ---- Fotogramas del turno (animación) ----
  const frames: CyberFrame[] = useMemo(() => {
    if (!battle || !battle.events.length || !playerMon) return []
    // El motor ya aplicó el daño a las instancias; para animar necesitamos los
    // PS INICIALES del turno = actuales + todo lo que se restó en los eventos.
    let pHp = playerMon.currentHp
    let eHp = battle.enemy.currentHp
    for (const ev of battle.events) {
      if (ev.kind === 'damage' || ev.kind === 'statusDamage') {
        if (ev.side === 'player') pHp += ev.amount
        else eHp += ev.amount
      }
    }
    return buildCyberFrames(battle.events, {
      hp: { player: Math.min(pHp, playerMon.stats.hp), enemy: Math.min(eHp, battle.enemy.stats.hp) },
      status: { player: playerMon.status, enemy: battle.enemy.status },
    })
  }, [battle?.events, battle?.enemy, playerMon])

  const [idx, setIdx] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const animating = phase === 'intro' || phase === 'anim' || phase === 'end'

  useEffect(() => { setIdx(0) }, [battle?.events])

  // Sonido del fotograma actual.
  useEffect(() => {
    const s = frames[idx]?.sound
    if (s) play(s)
  }, [idx, frames])

  // Avance del cursor de fotogramas (respeta la velocidad de combate).
  useEffect(() => {
    if (!animating || !frames.length) return
    if (idx >= frames.length - 1) {
      // Terminó la animación: al carrusel de nuevo (salvo fin/relevo).
      if (phase === 'intro' || phase === 'anim') {
        timer.current = setTimeout(battleAnimDone, 350 / battleSpeed)
        return () => clearTimeout(timer.current)
      }
      return
    }
    const ev = battle!.events[idx]
    const ms = (CYBER_DURATION[ev.kind] ?? 500) / battleSpeed
    timer.current = setTimeout(() => setIdx((i) => Math.min(i + 1, frames.length - 1)), ms)
    return () => clearTimeout(timer.current)
  }, [idx, frames, animating, phase, battleSpeed, battle, battleAnimDone])

  // ---- Rodillos ----
  const stepMs = reelStepMs(save?.progress.badges ?? 0)
  const [spin, setSpin] = useState(0)          // símbolo activo del rodillo del jugador
  const [enemySpin, setEnemySpin] = useState(0)
  const [locked, setLocked] = useState<number | null>(null) // dónde paró el rival
  const [lastPrecision, setLastPrecision] = useState<StopPrecision | null>(null)
  const spinRef = useRef(0)
  const slotStart = useRef(0)

  const reeling = phase === 'reels'
  const myTurnFirst = battle?.first === 'player'
  // Se paran DE UNO EN UNO: si el rival es más rápido, para él primero y TÚ ves
  // en qué símbolo cayó antes de decidir (¡tensión!).
  const [enemyStopped, setEnemyStopped] = useState(false)

  useEffect(() => {
    if (!reeling) { setEnemyStopped(false); setLocked(null); return }
    setEnemyStopped(false)
    setLocked(null)
    if (myTurnFirst) return
    // El rival elige primero: su rodillo gira un momento y se planta.
    const t = setTimeout(() => {
      setEnemyStopped(true)
      play('select')
    }, 900 / battleSpeed)
    return () => clearTimeout(t)
  }, [reeling, myTurnFirst, battleSpeed, battle?.turn])

  // Giro del rodillo del jugador.
  useEffect(() => {
    if (!reeling) return
    slotStart.current = performance.now()
    const iv = setInterval(() => {
      slotStart.current = performance.now()
      spinRef.current = (spinRef.current + 1) % REEL_SIZE
      setSpin(spinRef.current)
    }, stepMs)
    return () => clearInterval(iv)
  }, [reeling, stepMs])

  // Giro del rodillo del rival (hasta que se planta).
  useEffect(() => {
    if (!reeling || enemyStopped) return
    const iv = setInterval(() => setEnemySpin((i) => (i + 1) % REEL_SIZE), stepMs + 30)
    return () => clearInterval(iv)
  }, [reeling, enemyStopped, stepMs])

  const doStop = useCallback(() => {
    if (!battle || battle.phase !== 'reels') return
    const offset = (performance.now() - slotStart.current) / stepMs
    const centered = Math.abs(offset - 0.5)
    const precision: StopPrecision = centered < 0.17 ? 'perfect' : centered < 0.35 ? 'good' : 'poor'
    setLastPrecision(precision)
    setLocked(spinRef.current)
    play('select')
    stopReel(spinRef.current, precision)
  }, [battle, stepMs, stopReel])

  // ---- Machaque ◄ ► ----
  const [mashCount, setMashCount] = useState(0)
  const [mashLeft, setMashLeft] = useState(MASH_WINDOW_MS)
  const mashRef = useRef(0)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const mashMode: 'boost' | 'flee' | null = phase === 'mash' ? 'boost' : overlay === 'flee' ? 'flee' : null

  useEffect(() => {
    if (!mashMode) return
    mashRef.current = 0
    setMashCount(0)
    setMashLeft(MASH_WINDOW_MS)
    const started = Date.now()
    const iv = setInterval(() => {
      const left = MASH_WINDOW_MS - (Date.now() - started)
      setMashLeft(Math.max(0, left))
      if (left <= 0) {
        clearInterval(iv)
        if (mashMode === 'boost') finishMash(mashRef.current, MASH_GOAL)
        else { setOverlay(null); tryFlee(Math.min(1, mashRef.current / MASH_GOAL)) }
      }
    }, 100)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mashMode])

  const mashHit = useCallback(() => {
    play('hit')
    mashRef.current += 1
    setMashCount(mashRef.current)
  }, [])

  // ---- Captura ----
  const shake = useShake(2000)
  const [shaking, setShaking] = useState(false)
  useEffect(() => {
    if (!shaking) return
    shake.reset()
    shake.start()
    const t = setTimeout(() => {
      shake.stop()
      setShaking(false)
      setOverlay(null)
      throwBall(shake.getScore())
    }, 2200)
    return () => { clearTimeout(t); shake.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shaking])

  const startShake = () => {
    if (shake.needsPermission && shake.permission !== 'granted') {
      void shake.requestPermission().finally(() => setShaking(true))
    } else setShaking(true)
  }

  if (!battle || !save || !playerMon) return null

  const frame = frames[Math.min(idx, Math.max(0, frames.length - 1))]
  const enemySp = getSpecies(battle.enemy.speciesId)
  const playerSp = getSpecies(playerMon.speciesId)
  const balls = save.items['ball'] ?? 0
  const logDone = !frames.length || idx >= frames.length - 1
  const ended = phase === 'end' && logDone

  // PS mostrados: los del fotograma si estamos animando; si no, los reales.
  const hp = (side: Side) =>
    animating && frame ? frame.hp[side] : side === 'player' ? playerMon.currentHp : battle.enemy.currentHp
  const maxHp = (side: Side) => (side === 'player' ? playerMon.stats.hp : battle.enemy.stats.hp)

  const acting = animating ? frame?.acting : undefined
  const lungeP = acting?.side === 'player' ? 'fx-lunge-player' : ''
  const lungeE = acting?.side === 'enemy' ? 'fx-lunge-enemy' : ''
  const animP = animating ? frame?.anim.player : undefined
  const animE = animating ? frame?.anim.enemy : undefined

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Destello a pantalla completa (crítico / supereficaz) */}
      {animating && frame?.flash && (
        <div
          key={`flash-${idx}`}
          className="absolute inset-0 z-20 pointer-events-none fx-flash rounded-xl"
          style={{ background: frame.flash }}
        />
      )}

      {/* ---------- ARENA ---------- */}
      <div className="relative shrink-0" style={{ height: '38%' }}>
        {/* Rival (arriba derecha) */}
        <div className="absolute top-0 right-0 w-[46%] flex flex-col items-center">
          <div className={`relative ${lungeE} ${animE === 'hit' ? 'animate-shake brightness-150' : ''} ${animE === 'faint' ? 'animate-faint' : ''}`}>
            <LcdSprite speciesId={battle.enemy.speciesId} shiny={battle.enemy.shiny} size="lg" />
            <Fx frame={animating ? frame : undefined} side="enemy" idx={idx} />
          </div>
        </div>
        <div className="absolute top-1 left-0 w-[50%]">
          <MonBar
            name={(battle.trainer ? '' : battle.secretIndex != null ? '★ ' : '') + enemySp.displayName.toUpperCase()}
            level={battle.enemy.level}
            hp={hp('enemy')} max={maxHp('enemy')}
            status={animating && frame ? frame.status.enemy : battle.enemy.status}
          />
          {battle.trainer && <LcdText dim className="mt-0.5">{battle.trainer.name}</LcdText>}
        </div>

        {/* Tú (abajo izquierda) */}
        <div className="absolute bottom-0 left-0 w-[46%] flex flex-col items-center">
          <div className={`relative ${lungeP} ${animP === 'hit' ? 'animate-shake brightness-150' : ''} ${animP === 'faint' ? 'animate-faint' : ''}`}>
            <LcdSprite speciesId={playerMon.speciesId} shiny={playerMon.shiny} size="lg" flip />
            <Fx frame={animating ? frame : undefined} side="player" idx={idx} />
          </div>
        </div>
        <div className="absolute bottom-1 right-0 w-[50%]">
          <MonBar
            name={playerSp.displayName.toUpperCase()}
            level={playerMon.level}
            hp={hp('player')} max={maxHp('player')}
            status={animating && frame ? frame.status.player : playerMon.status}
          />
        </div>

        {/* Poké Ball de captura */}
        {animating && frame?.ball && (
          <div key={`ball-${idx}`} className="absolute inset-0 grid place-items-center pointer-events-none z-10">
            <div className={frame.ball === 'throw' ? 'fx-pokeball' : 'fx-capture-pop'}>
              <div className="w-10 h-10 rounded-full border-4 border-slate-900 relative overflow-hidden shadow-lg">
                <div className="absolute inset-x-0 top-0 h-1/2 bg-red-500" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white" />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-slate-900" />
              </div>
            </div>
          </div>
        )}

        {/* Banner del movimiento en curso */}
        {acting && (
          <div key={`mv-${idx}`} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 fx-banner z-10">
            <span
              className="px-2 py-0.5 rounded text-[9px] font-lcd text-white whitespace-nowrap"
              style={{ background: TYPE_HEX[acting.moveType as keyof typeof TYPE_HEX] ?? '#64748b' }}
            >
              {acting.moveName.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* ---------- MENSAJE ---------- */}
      <div className="shrink-0 min-h-[2.2rem] flex items-center justify-center px-1">
        {animating && frame?.message && <LcdText center>{frame.message}</LcdText>}
        {reeling && lastPrecision && <LcdText center className="text-yellow-200">{PRECISION_LABEL[lastPrecision]}</LcdText>}
      </div>

      {/* ---------- ZONA INFERIOR ---------- */}
      <div className="flex-1 min-h-0 flex flex-col justify-end">
        {ended && (
          <LcdButton active onClick={acknowledgeEnd} className="text-center">► CONTINUAR</LcdButton>
        )}

        {reeling && !overlay && (
          <div className="flex flex-col gap-1.5">
            {/* LOS DOS RODILLOS */}
            <div className="flex gap-2 justify-center items-stretch">
              <Reel
                title="TÚ"
                slots={battle.reels.player}
                active={spin}
                locked={locked}
                highlight={!enemyStopped && !myTurnFirst ? false : true}
                blinking={myTurnFirst || enemyStopped}
                mine
              />
              <Reel
                title="RIVAL"
                slots={battle.reels.enemy}
                active={enemySpin}
                locked={enemyStopped ? enemySpin : null}
                highlight
                blinking={!myTurnFirst && !enemyStopped}
              />
            </div>

            <LcdText dim center>
              {!myTurnFirst && !enemyStopped ? 'El rival está eligiendo…' : '¡TOCA PARA PARAR TU RODILLO!'}
            </LcdText>

            {/* Zona táctil grande de PARADA */}
            <button
              onClick={doStop}
              disabled={!myTurnFirst && !enemyStopped}
              className="w-full py-2.5 rounded-lg border-2 border-yellow-300 bg-yellow-300/20 text-yellow-100 text-[11px] font-lcd active:scale-[0.98] transition disabled:opacity-30"
            >
              ■ PARAR
            </button>

            <div className="grid grid-cols-3 gap-1.5">
              <LcdButton disabled={battle.kind !== 'wild' || balls <= 0} onClick={() => setOverlay('ball')} className="text-center">
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

        {overlay === 'ball' && !shaking && (
          <div className="flex flex-col items-center gap-2 py-1">
            <LcdText center>CIERRA LA TAPA Y AGITA…</LcdText>
            <LcdText dim center>PROB. {(catchChance(battle.enemy, enemySp, 0.7) * 100).toFixed(0)}%</LcdText>
            <LcdButton active onClick={startShake} className="text-center w-full">● ¡AGITAR LA BOLA!</LcdButton>
            <LcdButton onClick={() => setOverlay(null)} className="text-center w-full">CANCELAR</LcdButton>
          </div>
        )}

        {shaking && (
          <button onClick={shake.tap} className="flex flex-col items-center gap-2 py-2 w-full">
            <LcdText center className="animate-pulse text-yellow-200">¡AGITA! ¡AGITA! ¡AGITA!</LcdText>
            <div className="w-3/4 h-2.5 rounded-sm bg-emerald-950 border border-emerald-800 overflow-hidden">
              <div className="h-full bg-yellow-300 transition-all" style={{ width: `${shake.score * 100}%` }} />
            </div>
            <LcdText dim center>{shake.supported ? 'AGITA EL MÓVIL (O TOCA RÁPIDO)' : 'TOCA MUY RÁPIDO'}</LcdText>
          </button>
        )}
      </div>
    </div>
  )
}

/** Un rodillo: la tira ENTERA visible (sabes qué viene) con el símbolo activo
 *  resaltado. El marco parpadea cuando es su turno de elegir (fiel). */
function Reel({ title, slots, active, locked, blinking, mine }: {
  title: string
  slots: ReelSlot[]
  active: number
  locked: number | null
  highlight: boolean
  blinking: boolean
  mine?: boolean
}) {
  const shown = locked ?? active
  // Ventana de 5 símbolos centrada en el activo (la tira "gira").
  const window = [-2, -1, 0, 1, 2].map((d) => (shown + d + slots.length) % slots.length)
  return (
    <div className={`flex-1 rounded-lg border-2 px-1 py-1 ${mine ? 'border-emerald-400' : 'border-slate-500'} ${blinking ? 'fx-reel-active' : ''}`}>
      <div className={`text-[7px] text-center mb-0.5 ${mine ? 'text-emerald-300' : 'text-slate-400'}`}>{title}</div>
      <div className="flex flex-col items-center gap-0.5">
        {window.map((i, pos) => {
          const s = slots[i]
          const isCenter = pos === 2
          return (
            <div
              key={`${i}-${pos}`}
              className={`w-full text-center text-[8px] leading-tight rounded px-0.5 py-0.5 transition-all ${
                isCenter
                  ? `bg-yellow-300/25 text-yellow-100 border border-yellow-300 ${locked != null ? 'fx-reel-lock' : ''}`
                  : 'text-emerald-600/70 opacity-50 scale-90'
              }`}
            >
              {s.kind === 'sad' ? '☹ FALLO' : shortMove(s.moveId)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function shortMove(moveId: number): string {
  const m = getMove(moveId)
  const n = m.displayName.toUpperCase()
  return n.length > 9 ? `${n.slice(0, 8)}.` : n
}

/** Barra de PS + nombre + estado. */
function MonBar({ name, level, hp, max, status }: {
  name: string; level: number; hp: number; max: number; status: string
}) {
  const pct = Math.max(0, Math.min(1, hp / Math.max(1, max)))
  const color = pct > 0.5 ? 'bg-emerald-400' : pct > 0.2 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div>
      <div className="text-[8px] text-emerald-200 flex justify-between gap-1">
        <span className="truncate">{name}</span>
        <span className="shrink-0">Nv.{level}</span>
      </div>
      <div className="h-2 rounded-sm bg-emerald-950 border border-emerald-800 overflow-hidden">
        {/* transition = la barra BAJA animada al cambiar de fotograma */}
        <div className={`h-full ${color} transition-all duration-500 ease-out`} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="text-[7px] text-emerald-500 text-right">
        {Math.max(0, Math.round(hp))}/{max}{status !== 'none' ? ` · ${status.toUpperCase()}` : ''}
      </div>
    </div>
  )
}

/** Capa de efectos sobre un sprite: número de daño flotante, impacto y eficacia. */
function Fx({ frame, side, idx }: { frame?: CyberFrame; side: Side; idx: number }) {
  const fx = frame?.fx
  if (!fx || fx.side !== side) return null
  const color = fx.moveType ? TYPE_HEX[fx.moveType as keyof typeof TYPE_HEX] ?? '#94a3b8' : '#94a3b8'
  return (
    <div className="absolute inset-0 pointer-events-none grid place-items-center">
      {/* Impacto */}
      {fx.kind === 'damage' && (
        <div
          key={`b${idx}`}
          className="absolute w-14 h-14 rounded-full fx-burst"
          style={{ background: `radial-gradient(circle, ${color}cc 0%, transparent 70%)` }}
        />
      )}
      {/* Número flotante */}
      {fx.amount > 0 && (
        <div
          key={`d${idx}`}
          className={`absolute text-[11px] font-lcd fx-dmg ${fx.kind === 'heal' ? 'text-emerald-300' : 'text-white'}`}
          style={{ textShadow: '0 1px 2px #000' }}
        >
          {fx.kind === 'heal' ? '+' : '-'}{fx.amount}
        </div>
      )}
      {/* Crítico / eficacia */}
      {fx.crit && (
        <div key={`c${idx}`} className="absolute -top-1 text-[8px] font-lcd text-yellow-200 fx-eff">¡CRÍTICO!</div>
      )}
      {!fx.crit && fx.eff != null && fx.eff !== 1 && (
        <div key={`e${idx}`} className="absolute -top-1 text-[7px] font-lcd text-yellow-200 fx-eff">
          {effectivenessLabel(fx.eff)}
        </div>
      )}
      {fx.kind === 'noEffect' && (
        <div key={`n${idx}`} className="absolute text-[8px] font-lcd text-slate-300 fx-eff">NO AFECTA</div>
      )}
    </div>
  )
}

function MashPanel({ count, left, onHit, label }: {
  count: number; left: number; onHit: () => void; label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      <LcdText center className="text-yellow-200">{label}</LcdText>
      <div className="flex items-center gap-2 w-full">
        <button onClick={onHit} className="flex-1 py-3 text-xl text-emerald-100 border-2 border-emerald-400 rounded-lg active:scale-90 transition">◄</button>
        <div className="text-[14px] text-emerald-100 w-10 text-center">{count}</div>
        <button onClick={onHit} className="flex-1 py-3 text-xl text-emerald-100 border-2 border-emerald-400 rounded-lg active:scale-90 transition">►</button>
      </div>
      <div className="w-3/4 h-2 rounded-sm bg-emerald-950 border border-emerald-800 overflow-hidden">
        <div className="h-full bg-yellow-300" style={{ width: `${Math.min(100, (count / MASH_GOAL) * 100)}%` }} />
      </div>
      <LcdText dim center>{(left / 1000).toFixed(1)}s</LcdText>
    </div>
  )
}
