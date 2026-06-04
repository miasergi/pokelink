import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { useSettings, type BattleSpeed } from '@/state/settingsStore'
import { getSpecies } from '@/data'
import type { BattleEvent, Side } from '@/engine/battle/types'
import type { PokemonInstance, PokemonType } from '@/types'
import Sprite from '@/ui/components/Sprite'
import HpBar from '@/ui/components/HpBar'
import { Button, ImgFallback } from '@/ui/components/kit'
import { STATUS_LABEL } from '@/engine/battle/status'
import { TYPE_ES, TYPE_HEX } from '@/ui/theme/types'
import { play, type Sfx } from '@/utils/sfx'

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
}

const DURATION: Partial<Record<BattleEvent['kind'], number>> = {
  start: 500, sendOut: 500, move: 560, damage: 600, heal: 540, faint: 780,
  status: 660, statChange: 580, statusDamage: 640, cantMove: 640, miss: 560,
  noEffect: 640, wokeUp: 560, thawed: 560, message: 740, end: 200, mega: 1100,
}

export default function BattleScreen() {
  const { run, pendingBattle, finishBattle } = useGame()
  const settings = useSettings()

  const uidMap = useMemo(() => {
    const map = new Map<string, { speciesId: number; level: number; shiny: boolean; maxHp: number; currentHp: number; status: PokemonInstance['status'] }>()
    if (!run || !pendingBattle) return map
    const add = (mons: PokemonInstance[]) => {
      for (const m of mons) map.set(m.uid, { speciesId: m.speciesId, level: m.level, shiny: m.shiny, maxHp: m.stats.hp, currentHp: m.currentHp, status: m.status })
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

  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setIdx(0)
    setDone(false)
  }, [pendingBattle])

  // Sonido/vibración del frame actual
  useEffect(() => {
    const s = frames[idx]?.sound
    if (s) play(s)
  }, [idx, frames])

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

  const won = pendingBattle.result.winner === 'player'
  const lungeEnemy = frame.acting?.side === 'enemy' ? 'fx-lunge-enemy' : ''
  const lungePlayer = frame.acting?.side === 'player' ? 'fx-lunge-player' : ''

  return (
    <div className="flex flex-col flex-1 min-h-0 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-900/40 via-slate-900 to-emerald-950/40" />

      {/* destello de pantalla en crítico / súper eficaz */}
      {frame.flash && (
        <div key={`flash-${idx}`} className="absolute inset-0 z-10 pointer-events-none fx-flash" style={{ background: frame.flash.color }} />
      )}

      <div className="relative flex-1 flex flex-col px-4 pt-4 safe-top gap-1">
        {/* Retrato del entrenador rival (combates de entrenador) */}
        {trainer && trainer.sprite && (
          <div className="absolute top-2 right-3 z-10 flex flex-col items-center animate-pop-in">
            <ImgFallback
              src={trainer.sprite}
              alt={trainer.name}
              className="w-14 h-14 object-contain drop-shadow-lg"
              style={{ imageRendering: 'pixelated' }}
              fallback={<span />}
            />
            <span className="text-[10px] font-bold text-slate-200 -mt-1 bg-slate-900/70 px-1.5 rounded-full">{trainer.name}</span>
          </div>
        )}
        {/* Enemigo */}
        <div className="flex items-start justify-between gap-2">
          <div className="mt-1">
            <InfoCard view={frame.enemy} remaining={frame.remaining.enemy} align="left" />
          </div>
          <div className="relative mr-1">
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

        {/* Banner de movimiento + mensaje central */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-2">
          {frame.acting && (
            <div
              key={`mv-${idx}`}
              className="fx-banner flex items-center gap-2 px-4 py-1.5 rounded-full shadow-lg border"
              style={{ background: `${TYPE_HEX[frame.acting.moveType]}22`, borderColor: TYPE_HEX[frame.acting.moveType] }}
            >
              <span
                className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
                style={{ background: TYPE_HEX[frame.acting.moveType] }}
              >
                {TYPE_ES[frame.acting.moveType]}
              </span>
              <span className="font-extrabold text-sm">{frame.acting.moveName}</span>
            </div>
          )}
          <div className="bg-slate-900/85 border border-slate-700 rounded-2xl px-4 py-2.5 text-center min-h-[3rem] flex items-center justify-center w-full shadow-xl">
            <span className="text-sm font-semibold">{frame.message}</span>
          </div>
        </div>

        {/* Jugador */}
        <div className="flex items-end justify-between gap-2 mb-1">
          <div className="relative ml-1">
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
          <div className="mb-1">
            <InfoCard view={frame.player} remaining={frame.remaining.player} align="right" />
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="relative p-3 safe-bottom border-t border-slate-800 bg-slate-900/80 backdrop-blur">
        {done ? (
          <Button full variant={won ? 'success' : 'danger'} onClick={finishBattle} className="animate-pop-in">
            {won ? '¡Victoria! Continuar ›' : 'Derrota...'}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 flex-1">
              {([1, 2, 4] as BattleSpeed[]).map((s) => (
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
              Saltar ⏭
            </Button>
          </div>
        )}
        {isBoss && !done && (
          <div className="text-center text-[11px] text-amber-300/80 mt-1.5">Combate de jefe</div>
        )}
      </div>
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
        <div key={`c-${idx}`} className="fx-dmg absolute -mt-10 text-[11px] font-black text-amber-300" style={{ textShadow: '0 1px 4px #000' }}>
          ¡CRÍTICO!
        </div>
      )}
    </div>
  )
}

function InfoCard({ view, remaining, align }: { view: SideView; remaining: number; align: 'left' | 'right' }) {
  return (
    <div className={`bg-slate-900/80 border border-slate-700 rounded-xl px-2.5 py-1.5 min-w-[8.5rem] shadow-lg ${align === 'right' ? 'text-right' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-sm truncate">{view.name}</span>
        <span className="text-[11px] text-slate-400">Nv.{view.level}</span>
      </div>
      <HpBar current={view.currentHp} max={view.maxHp} status={view.status} showNumbers />
      <div className="flex gap-0.5 mt-0.5 justify-end">
        {Array.from({ length: remaining }).map((_, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
        ))}
      </div>
    </div>
  )
}

// --- Construcción de frames a partir de eventos ---
function buildFrames(
  events: BattleEvent[],
  uidMap: Map<string, { speciesId: number; level: number; shiny: boolean; maxHp: number; currentHp: number; status: PokemonInstance['status'] }>,
): Frame[] {
  const mk = (uid: string): SideView => {
    const d = uidMap.get(uid)!
    return {
      uid, speciesId: d.speciesId, name: getSpecies(d.speciesId).displayName,
      level: d.level, shiny: d.shiny, currentHp: d.currentHp, maxHp: d.maxHp,
      status: d.status, fainted: d.currentHp <= 0,
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
      acting: extra.acting, fx: extra.fx, flash: extra.flash, sound: extra.sound,
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
        else if (e.effectiveness >= 2) extra = '¡Súper eficaz!'
        else if (e.effectiveness > 0 && e.effectiveness < 1) extra = 'Poco eficaz...'
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
        message = `${s.name} sufre daño de ${STATUS_LABEL[e.status]}.`
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
