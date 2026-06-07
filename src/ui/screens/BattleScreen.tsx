import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { useSettings, type BattleSpeed } from '@/state/settingsStore'
import { getSpecies, getMove } from '@/data'
import { effectivenessLabel, effectivenessColor } from '@/data/typechart'
import type { BattleEvent, Side } from '@/engine/battle/types'
import type { PokemonInstance, PokemonType } from '@/types'
import Sprite from '@/ui/components/Sprite'
import HpBar from '@/ui/components/HpBar'
import { Button, Card, money } from '@/ui/components/kit'
import { getItem, tryGetItem } from '@/data/items'
import TypeBadge from '@/ui/components/TypeBadge'
import PowerDots from '@/ui/components/PowerDots'
import MemeOverlay from '@/ui/components/MemeOverlay'
import { STATUS_LABEL } from '@/engine/battle/status'
import { TYPE_ES, TYPE_HEX } from '@/ui/theme/types'
import TypeIcon from '@/ui/components/TypeIcon'
import { play, type Sfx } from '@/utils/sfx'
import { type Weather, WEATHER_ICON, WEATHER_ES } from '@/engine/battle/abilities'

interface AtkView { type: PokemonType; power: number }
interface SideView {
  uid: string
  speciesId: number
  name: string
  level: number
  shiny: boolean
  currentHp: number
  maxHp: number
  status: PokemonInstance['status']
  fainted: boolean
  heldItemId?: string | null
  moves: AtkView[]
  physical: boolean
}
interface MonView {
  speciesId: number
  level: number
  shiny: boolean
  maxHp: number
  currentHp: number
  status: PokemonInstance['status']
  heldItemId?: string | null
  moves: AtkView[]
  physical: boolean
}
interface TeamSlot {
  uid: string
  speciesId: number
  shiny: boolean
}
interface Fx {
  side: Side // objetivo del efecto
  kind: 'damage' | 'heal'
  amount: number
  crit?: boolean
  eff?: number
  moveType?: PokemonType
  self?: boolean
}
interface Frame {
  player: SideView
  enemy: SideView
  message: string
  anim: Partial<Record<Side, 'hit' | 'heal' | 'faint'>>
  remaining: Record<Side, number>
  acting?: { side: Side; moveType: PokemonType; moveName: string }
  fx?: Fx
  flash?: { color: string }
  sound?: Sfx
  weather: Weather
  fainted: { player: string[]; enemy: string[] }
}

const DURATION: Partial<Record<BattleEvent['kind'], number>> = {
  start: 500, sendOut: 520, move: 560, damage: 780, heal: 620, faint: 820,
  status: 660, statChange: 580, statusDamage: 640, cantMove: 640, miss: 560,
  noEffect: 640, wokeUp: 560, thawed: 560, message: 740, end: 200, mega: 1100,
  ability: 820, weather: 820,
}

export default function BattleScreen() {
  const { run, pendingBattle, finishBattle, battleSummary, closeBattle } = useGame()
  const settings = useSettings()
  const [memeClosed, setMemeClosed] = useState(false)

  const uidMap = useMemo(() => {
    const map = new Map<string, MonView>()
    if (!run || !pendingBattle) return map
    const add = (mons: PokemonInstance[]) => {
      for (const m of mons) map.set(m.uid, { speciesId: m.speciesId, level: m.level, shiny: m.shiny, maxHp: m.stats.hp, currentHp: m.currentHp, status: m.status, heldItemId: m.heldItemId, physical: m.stats.atk >= m.stats.spa, moves: m.moves.map((mv) => { const md = getMove(mv.moveId); return { type: md.type, power: md.power } }) })
    }
    add(run.party)
    const content = run.map.nodes[pendingBattle.nodeId].content
    if (content.kind === 'wild') add([content.enemy])
    else if (content.kind === 'trainer') add(content.team)
    return map
  }, [run, pendingBattle])

  const frames = useMemo(
    () => (pendingBattle ? buildFrames(pendingBattle.result.events, uidMap) : []),
    [pendingBattle, uidMap],
  )

  // Orden de los equipos para las bandejas (ambos lados).
  const teams = useMemo(() => {
    const empty = { player: [] as TeamSlot[], enemy: [] as TeamSlot[] }
    if (!run || !pendingBattle) return empty
    const player = run.party.map((m) => ({ uid: m.uid, speciesId: m.speciesId, shiny: m.shiny }))
    let enemy: TeamSlot[] = []
    const content = run.map.nodes[pendingBattle.nodeId].content
    if (content.kind === 'wild') enemy = [{ uid: content.enemy.uid, speciesId: content.enemy.speciesId, shiny: content.enemy.shiny }]
    else if (content.kind === 'trainer') enemy = content.team.map((m) => ({ uid: m.uid, speciesId: m.speciesId, shiny: m.shiny }))
    return { player, enemy }
  }, [run, pendingBattle])

  // Pokémon ya debilitados ANTES del combate (no participan): la bandeja debe
  // mostrarlos apagados desde el inicio, no solo los que caen en el combate.
  const preFainted = useMemo(() => {
    const dead = (slots: TeamSlot[]) => slots.filter((m) => (uidMap.get(m.uid)?.currentHp ?? 1) <= 0).map((m) => m.uid)
    return { player: dead(teams.player), enemy: dead(teams.enemy) }
  }, [teams, uidMap])

  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  // Log de combate: mensajes únicos consecutivos.
  const log = useMemo(() => {
    const out: string[] = []
    let last = ''
    for (const f of frames) { if (f.message && f.message !== last) { out.push(f.message); last = f.message } }
    return out
  }, [frames])

  useEffect(() => {
    setIdx(0)
    setDone(false)
  }, [pendingBattle])

  // Sonido/vibración del frame actual
  useEffect(() => {
    const s = frames[idx]?.sound
    if (s) play(s)
  }, [idx, frames])

  // Al terminar la animación, resuelve el combate (recompensas inline / fin de run).
  useEffect(() => {
    if (done && !battleSummary) finishBattle()
  }, [done, battleSummary, finishBattle])

  useEffect(() => {
    if (idx >= frames.length - 1) {
      setDone(true)
      return
    }
    const ev = pendingBattle!.result.events[idx]
    const base = DURATION[ev.kind] ?? 500
    timer.current = setTimeout(() => setIdx((i) => Math.min(i + 1, frames.length - 1)), base / settings.battleSpeed)
    return () => clearTimeout(timer.current)
  }, [idx, frames, settings.battleSpeed, pendingBattle])

  if (!run || !pendingBattle || !frames.length) return null
  const frame = frames[Math.min(idx, frames.length - 1)]
  const battleNode = run.map.nodes[pendingBattle.nodeId]
  const isBoss = ['gym', 'elite', 'champion', 'rival'].includes(battleNode.type)
  const trainer = battleNode.content.kind === 'trainer' ? battleNode.content.trainer : null

  const skip = () => {
    clearTimeout(timer.current)
    setIdx(frames.length - 1)
    setDone(true)
  }

  const lungeEnemy = frame.acting?.side === 'enemy' ? 'fx-lunge-enemy' : ''
  const lungePlayer = frame.acting?.side === 'player' ? 'fx-lunge-player' : ''

  const battleBg = isBoss
    ? 'from-rose-950/70 via-slate-950 to-fuchsia-950/60'
    : trainer
      ? 'from-sky-900/55 via-slate-900 to-indigo-950/60'
      : 'from-emerald-800/55 via-slate-900 to-green-950/70'

  return (
    <div className="flex flex-col flex-1 min-h-0 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-b ${battleBg}`} />
      {/* suelo/escena */}
      <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: isBoss ? 'radial-gradient(ellipse at 50% 120%, rgba(244,63,94,0.18), transparent 60%)' : trainer ? 'radial-gradient(ellipse at 50% 120%, rgba(56,189,248,0.15), transparent 60%)' : 'radial-gradient(ellipse at 50% 120%, rgba(34,197,94,0.18), transparent 60%)' }} />
      {isBoss && <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(217,70,239,0.12), transparent 55%)' }} />}

      {/* destello de pantalla en crítico / súper eficaz */}
      {frame.flash && (
        <div key={`flash-${idx}`} className="absolute inset-0 z-10 pointer-events-none fx-flash" style={{ background: frame.flash.color }} />
      )}

      <div className="relative flex-1 flex flex-col px-3 pt-2 safe-top">
        {/* Indicador de clima */}
        {frame.weather !== 'none' && (
          <div className="z-10 self-center flex items-center gap-1 bg-slate-900/70 border border-slate-700 rounded-full px-2 py-0.5 animate-pop-in mb-1">
            <span className="text-sm">{WEATHER_ICON[frame.weather]}</span>
            <span className="text-[10px] font-bold">{WEATHER_ES[frame.weather]}</span>
          </div>
        )}

        {/* Arena compacta y centrada: cada barra pegada a su Pokémon */}
        <div className="flex-1 grid place-items-center">
          <div className="relative w-full max-w-md" style={{ height: 'min(46vh, 340px)' }}>
            {/* Enemigo (arriba): barra a la izquierda, sprite a la derecha */}
            <div className="absolute top-0 left-0 right-0 flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <InfoCard view={frame.enemy} remaining={frame.remaining.enemy} align="left" />
                <Tray team={teams.enemy} fainted={[...frame.fainted.enemy, ...preFainted.enemy]} activeUid={frame.enemy.uid} align="left" />
                {trainer?.name && <span className="text-[10px] text-slate-400 pl-1">vs {trainer.name}</span>}
              </div>
              <div className="relative mr-10 sm:mr-20">
                <SpriteFx side="enemy" fx={frame.fx} idx={idx} />
                <Platform />
                <div className={lungeEnemy}>
                  <Sprite
                    speciesId={frame.enemy.speciesId}
                    shiny={frame.enemy.shiny}
                    className={`relative w-28 h-28 object-contain drop-shadow-2xl transition-all ${
                      frame.enemy.fainted ? 'animate-faint' : ''
                    } ${frame.anim.enemy === 'hit' ? 'animate-shake brightness-150' : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Banner del movimiento (centro de la arena) */}
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              {frame.acting && (
                <div
                  key={`mv-${idx}`}
                  className="fx-banner flex items-center gap-2 px-4 py-1.5 rounded-full shadow-lg border"
                  style={{ background: `${TYPE_HEX[frame.acting.moveType]}ee`, borderColor: '#fff3' }}
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/90 px-1.5 py-0.5 rounded-full bg-black/25">
                    <TypeIcon type={frame.acting.moveType} />{TYPE_ES[frame.acting.moveType]}
                  </span>
                  <span className="font-extrabold text-sm text-white">{frame.acting.moveName}</span>
                </div>
              )}
            </div>

            {/* Jugador (abajo): sprite a la izquierda, barra a la derecha */}
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2">
              <div className="relative ml-10 sm:ml-20">
                <SpriteFx side="player" fx={frame.fx} idx={idx} />
                <Platform />
                <div className={lungePlayer}>
                  <Sprite
                    speciesId={frame.player.speciesId}
                    shiny={frame.player.shiny}
                    className={`relative w-32 h-32 object-contain drop-shadow-2xl transition-all ${
                      frame.player.fainted ? 'animate-faint' : ''
                    } ${frame.anim.player === 'hit' ? 'animate-shake brightness-150' : ''}`}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Tray team={teams.player} fainted={[...frame.fainted.player, ...preFainted.player]} activeUid={frame.player.uid} align="right" />
                <InfoCard view={frame.player} remaining={frame.remaining.player} align="right" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caja de diálogo (narración fija y legible) + controles */}
      <div className="relative p-3 safe-bottom border-t border-slate-800 bg-slate-900/90 backdrop-blur space-y-2">
        {battleSummary ? (
          <BattleRewards summary={battleSummary} onContinue={closeBattle} />
        ) : done ? (
          <Button full variant="success" disabled className="opacity-80">
            ¡Victoria! Calculando recompensas…
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 flex-1">
              {([1, 2, 4, 8] as BattleSpeed[]).map((s) => (
                <button
                  key={s}
                  onClick={() => settings.setBattleSpeed(s)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
                    settings.battleSpeed === s ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={skip}>
              Saltar a resultado ⏭
            </Button>
          </div>
        )}
        {isBoss && !done && (
          <div className="text-center text-[11px] text-amber-300/80 mt-1.5">Combate de jefe</div>
        )}
      </div>

      {/* Botón de log de combate */}
      <button onClick={() => setShowLog(true)} className="absolute top-2 right-2 z-30 w-9 h-9 grid place-items-center rounded-full bg-slate-900/80 border border-slate-700 text-lg active:scale-90" title="Ver registro del combate">📜</button>

      {/* Registro del combate */}
      {showLog && (
        <div className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setShowLog(false)}>
          <div className="w-full max-w-md max-h-[80%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-extrabold">📜 Registro del combate</div>
              <button className="text-slate-400 text-2xl px-1" onClick={() => setShowLog(false)}>✕</button>
            </div>
            <ol className="flex flex-col gap-1 text-sm text-slate-200">
              {log.map((m, i) => <li key={i} className="rounded-lg bg-slate-800/60 px-2.5 py-1.5">{m}</li>)}
            </ol>
          </div>
        </div>
      )}

      {/* Meme al derrotar a un jefe */}
      {battleSummary?.bossDefeated && !memeClosed && (
        <MemeOverlay mood="win" speciesId={frame.player.speciesId} shiny={frame.player.shiny} onClose={() => setMemeClosed(true)} />
      )}
    </div>
  )
}

/** Panel de recompensas mostrado al terminar el combate (en la misma pantalla). */
function BattleRewards({ summary, onContinue }: { summary: import('@/engine/run/runEngine').BattleOutcomeSummary; onContinue: () => void }) {
  return (
    <div className="animate-pop-in space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {summary.moneyGained > 0 && (
          <span className="text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-lg px-2 py-1">💰 +{money(summary.moneyGained)}</span>
        )}
        {summary.levelGains.map((lg, i) => (
          <span key={i} className="text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-lg px-2 py-1">📈 {lg.name} +{lg.levels} Nv</span>
        ))}
        {summary.itemGained && (
          <span className="text-xs font-bold bg-sky-500/15 border border-sky-500/30 text-sky-300 rounded-lg px-2 py-1">🎁 {getItem(summary.itemGained).name}</span>
        )}
        {summary.caughtLegendary && (
          <span className="text-xs font-bold bg-violet-500/15 border border-violet-500/30 text-violet-300 rounded-lg px-2 py-1">⭐ {summary.caughtLegendary}</span>
        )}
        {summary.lost.length > 0 && (
          <span className="text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-lg px-2 py-1">☠ {summary.lost.join(', ')}</span>
        )}
      </div>
      {summary.evolutions.length > 0 && (
        <Card className="p-2 flex items-center gap-2 justify-center">
          {summary.evolutions.map((evo) => (
            <div key={evo.uid} className="flex items-center gap-1 text-xs">
              <Sprite speciesId={evo.fromId} variant="front" className="w-8 h-8 object-contain opacity-70" />
              <span>→</span>
              <Sprite speciesId={evo.toId} variant="front" className="w-9 h-9 object-contain" />
              <span className="text-emerald-300 font-bold">¡Evolucionó!</span>
            </div>
          ))}
        </Card>
      )}
      <Button full variant="primary" onClick={onContinue}>Continuar ›</Button>
    </div>
  )
}

/** Capa de efectos (número flotante + impacto) sobre un sprite. */
function SpriteFx({ side, fx, idx }: { side: Side; fx?: Fx; idx: number }) {
  if (!fx || fx.side !== side) return null
  const isHeal = fx.kind === 'heal'
  const color = isHeal ? '#34d399' : fx.crit ? '#fb923c' : fx.self ? '#fca5a5' : '#f87171'
  const burst = fx.moveType ? TYPE_HEX[fx.moveType] : '#f87171'
  return (
    <div className="absolute inset-0 z-20 pointer-events-none grid place-items-center">
      {!isHeal && (
        <div key={`b-${idx}`} className="fx-burst rounded-full" style={{ width: 90, height: 90, background: `radial-gradient(circle, ${burst}cc, ${burst}00 70%)` }} />
      )}
      <div
        key={`n-${idx}`}
        className="fx-dmg absolute font-extrabold tabular-nums"
        style={{ color, fontSize: fx.crit ? 30 : 24, textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}
      >
        {isHeal ? `+${fx.amount}` : `-${fx.amount}`}
      </div>
      {fx.crit && (
        <div key={`c-${idx}`} className="fx-dmg absolute -mt-12 px-2 py-0.5 rounded-full bg-amber-400 text-black text-xs font-black shadow-lg" style={{ textShadow: 'none' }}>
          ⚡ ¡CRÍTICO!
        </div>
      )}
      {!isHeal && !fx.self && fx.eff != null && fx.eff !== 1 && (
        <div
          key={`e-${idx}`}
          className="fx-eff absolute font-black text-[15px] whitespace-nowrap"
          style={{
            marginTop: fx.crit ? 58 : 42,
            color: effectivenessColor(fx.eff),
            WebkitTextStroke: '3px #fff',
            paintOrder: 'stroke',
            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.7))',
          }}
        >
          {effectivenessLabel(fx.eff)}
        </div>
      )}
    </div>
  )
}

function InfoCard({ view, remaining, align }: { view: SideView; remaining: number; align: 'left' | 'right' }) {
  const sp = getSpecies(view.speciesId)
  const held = view.heldItemId ? tryGetItem(view.heldItemId) : null
  return (
    <div className={`bg-slate-900/85 border border-slate-700 rounded-xl px-3 py-2 min-w-[10.5rem] shadow-lg ${align === 'right' ? 'text-right' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-base truncate">{view.name}{view.shiny && <span title="Shiny" className="text-amber-300"> ✨</span>}</span>
        <span className="text-xs text-slate-300 font-bold">Nv.{view.level}</span>
      </div>
      <div className={`flex items-center gap-1 my-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
        {held && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded px-1 py-0.5">
            {held.sprite && <img src={held.sprite} alt="" className="w-3.5 h-3.5" style={{ imageRendering: 'pixelated' }} />}
            <span className="truncate max-w-[4.5rem]">{held.name}</span>
          </span>
        )}
      </div>
      <HpBar current={view.currentHp} max={view.maxHp} status={view.status} showNumbers />
      <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <span className="text-[9px] font-bold px-1 rounded bg-slate-700 text-slate-200">{view.physical ? 'Físico' : 'Especial'}</span>
        {view.moves.map((mv, i) => (
          <PowerDots key={i} type={mv.type} power={mv.power} size={6} />
        ))}
      </div>
      <span className="sr-only">{remaining}</span>
    </div>
  )
}

/** Bandeja con el equipo en orden (atenuado si está debilitado, resaltado el activo). */
function Tray({ team, fainted, activeUid, align }: { team: TeamSlot[]; fainted: string[]; activeUid: string; align: 'left' | 'right' }) {
  if (team.length <= 1) return null
  return (
    <div className={`flex gap-0.5 ${align === 'right' ? 'justify-end' : ''}`}>
      {team.map((m) => {
        const dead = fainted.includes(m.uid)
        return (
          <div
            key={m.uid}
            className={`rounded-full bg-slate-900/70 border ${m.uid === activeUid ? 'border-amber-300' : 'border-slate-700'}`}
            style={{ padding: 1 }}
          >
            <Sprite speciesId={m.speciesId} variant="front" className={`w-6 h-6 object-contain ${dead ? 'grayscale opacity-30' : ''}`} />
          </div>
        )
      })}
    </div>
  )
}

// --- Construcción de frames a partir de eventos ---
function buildFrames(
  events: BattleEvent[],
  uidMap: Map<string, MonView>,
): Frame[] {
  const mk = (uid: string): SideView => {
    const d = uidMap.get(uid)!
    return {
      uid, speciesId: d.speciesId, name: getSpecies(d.speciesId).displayName,
      level: d.level, shiny: d.shiny, currentHp: d.currentHp, maxHp: d.maxHp,
      status: d.status, fainted: d.currentHp <= 0, heldItemId: d.heldItemId, moves: d.moves, physical: d.physical,
    }
  }

  const teamCount: Record<Side, Set<string>> = { player: new Set(), enemy: new Set() }
  for (const e of events) {
    if ('side' in e && 'uid' in e) teamCount[e.side].add(e.uid)
  }
  const fainted: Record<Side, Set<string>> = { player: new Set(), enemy: new Set() }

  let player: SideView | null = null
  let enemy: SideView | null = null
  let message = '¡El combate ha comenzado!'
  let weather: Weather = 'none'
  const frames: Frame[] = []

  // estado de movimiento en curso
  let lastAttacker: Side | null = null
  const lastMoveType: Record<Side, PokemonType> = { player: 'normal', enemy: 'normal' }

  const remaining = (side: Side) => teamCount[side].size - fainted[side].size
  const setSide = (side: Side, v: SideView) => { if (side === 'player') player = v; else enemy = v }
  const getSide = (side: Side) => (side === 'player' ? player : enemy)

  const push = (extra: Partial<Frame> = {}) => {
    if (!player || !enemy) return
    frames.push({
      player: { ...player }, enemy: { ...enemy }, message,
      anim: extra.anim ?? {},
      remaining: { player: Math.max(1, remaining('player')), enemy: Math.max(0, remaining('enemy')) },
      acting: extra.acting, fx: extra.fx, flash: extra.flash, sound: extra.sound, weather,
      fainted: { player: [...fainted.player], enemy: [...fainted.enemy] },
    })
  }

  for (const e of events) {
    switch (e.kind) {
      case 'start':
        player = mk(e.playerLead); enemy = mk(e.enemyLead)
        message = `¡Un ${enemy.name} salvaje se acerca!`
        push()
        break
      case 'sendOut': {
        const v = mk(e.uid); setSide(e.side, v)
        message = e.side === 'player' ? `¡Adelante, ${v.name}!` : `El rival envía a ${v.name}.`
        push()
        break
      }
      case 'move': {
        const s = getSide(e.side)!
        message = `${s.name} usó ${e.moveName}.`
        lastAttacker = e.side
        lastMoveType[e.side] = e.moveType as PokemonType
        push({ acting: { side: e.side, moveType: e.moveType as PokemonType, moveName: e.moveName } })
        break
      }
      case 'damage': {
        const s = getSide(e.side)!
        s.currentHp = e.hpAfter; s.maxHp = e.maxHp
        const isSelf = lastAttacker === e.side // retroceso / vidasfera
        const moveType = lastMoveType[isSelf ? e.side : (e.side === 'player' ? 'enemy' : 'player')]
        let extra = ''
        if (e.crit) extra = '¡Golpe crítico!'
        else if (e.effectiveness !== 1) extra = effectivenessLabel(e.effectiveness)
        if (extra) message = extra
        const flash = e.crit
          ? { color: 'rgba(251,146,60,0.6)' }
          : e.effectiveness >= 2
            ? { color: 'rgba(248,250,252,0.55)' }
            : undefined
        push({
          anim: { [e.side]: 'hit' },
          fx: { side: e.side, kind: 'damage', amount: e.amount, crit: e.crit, eff: e.effectiveness, moveType, self: isSelf },
          flash,
          sound: isSelf ? undefined : e.crit ? 'crit' : 'hit',
        })
        break
      }
      case 'heal': {
        const s = getSide(e.side)!
        const amount = Math.max(0, e.hpAfter - s.currentHp)
        s.currentHp = e.hpAfter
        push({ anim: { [e.side]: 'heal' }, fx: { side: e.side, kind: 'heal', amount }, sound: 'heal' })
        break
      }
      case 'miss': { const s = getSide(e.side)!; message = `¡${s.name} falló el ataque!`; push(); break }
      case 'noEffect': { const s = getSide(e.side)!; message = `No afecta a ${s.name}...`; push(); break }
      case 'status': {
        const s = getSide(e.side)!; s.status = e.status
        message = `¡${s.name} sufre ${STATUS_LABEL[e.status]}!`; push({ sound: 'status' }); break
      }
      case 'statChange': {
        const s = getSide(e.side)!; const up = e.delta > 0
        message = `${s.name} ${up ? 'aumentó' : 'redujo'} su ${statName(e.stat)}.`; push(); break
      }
      case 'statusDamage': {
        const s = getSide(e.side)!; s.currentHp = e.hpAfter
        message = `¡${s.name} es azotado por la tormenta de arena!`
        push({ anim: { [e.side]: 'hit' }, fx: { side: e.side, kind: 'damage', amount: e.amount, self: true } })
        break
      }
      case 'cantMove': {
        const s = getSide(e.side)!
        const r = e.reason === 'par' ? 'está paralizado y no puede moverse' : e.reason === 'slp' ? 'está dormido' : 'está congelado'
        message = `¡${s.name} ${r}!`; push(); break
      }
      case 'wokeUp': { const s = getSide(e.side)!; s.status = 'none'; message = `¡${s.name} se despertó!`; push(); break }
      case 'thawed': { const s = getSide(e.side)!; s.status = 'none'; message = `¡${s.name} se descongeló!`; push(); break }
      case 'faint': {
        const s = getSide(e.side)!; s.currentHp = 0; s.fainted = true; fainted[e.side].add(e.uid)
        message = `¡${s.name} se debilitó!`; push({ anim: { [e.side]: 'faint' }, sound: 'faint' }); break
      }
      case 'mega': {
        const s = getSide(e.side)!
        s.speciesId = e.toSpeciesId
        s.name = e.name
        message = `¡${e.name} ha megaevolucionado!`
        push({ flash: { color: 'rgba(217,70,239,0.5)' }, anim: { [e.side]: 'heal' }, sound: 'mega' })
        break
      }
      case 'transform': {
        const s = getSide(e.side)!
        s.speciesId = e.intoSpeciesId
        s.name = e.intoName
        message = `¡Ditto se transformó en ${e.intoName}!`
        push({ flash: { color: 'rgba(168,85,247,0.5)' }, anim: { [e.side]: 'heal' }, sound: 'mega' })
        break
      }
      case 'ability':
        message = e.text
        push({ sound: 'status' })
        break
      case 'weather':
        weather = e.weather
        message = e.weather === 'none' ? 'El clima se calmó.' : `¡${WEATHER_ES[e.weather]}!`
        push()
        break
      case 'message':
        message = e.text
        push({ sound: e.text.includes('subió') ? 'levelup' : undefined })
        break
      case 'end':
        message = e.winner === 'player' ? '¡Has ganado el combate!' : 'Tu equipo ha sido derrotado...'
        push({ sound: e.winner === 'player' ? 'victory' : 'defeat' }); break
    }
  }
  return frames
}

/** Sombra elíptica bajo el Pokémon (sensación de "plataforma" de combate). */
function Platform() {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bottom-1 rounded-[50%] pointer-events-none"
      style={{ width: 86, height: 18, background: 'radial-gradient(ellipse, rgba(0,0,0,0.45), rgba(0,0,0,0) 70%)' }}
    />
  )
}

function statName(stat: string) {
  const map: Record<string, string> = {
    atk: 'Ataque', def: 'Defensa', spa: 'At. Esp.', spd: 'Def. Esp.', spe: 'Velocidad',
    accuracy: 'Precisión', evasion: 'Evasión', hp: 'PS',
  }
  return map[stat] ?? stat
}
