// Retransmisión del partido: marcador, narración jugada a jugada y el panel de
// decisión cuando el motor se para a preguntarte.
//
// La UI NO calcula nada: solo pinta los `MatchEvent` que emite el motor y manda
// de vuelta el id de la opción elegida. Mismo reparto de responsabilidades que
// `BattleScreen` en el roguelike Pokémon.
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import Odds from '@/ui/inazuma/Odds'
import MatchPitch from '@/ui/inazuma/MatchPitch'
import TechniqueCutIn, { cutInFrom, type CutIn } from '@/ui/inazuma/TechniqueCutIn'
import { actorByUid, playerSide, sideOf, otherSide } from '@/engine/inazuma/match'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { ImgFallback } from '@/ui/components/kit'
import type { Actor, MatchEvent, MatchState } from '@/engine/inazuma/types'

export default function MatchView() {
  const {
    match, feed, playing, speed, autoPlay,
    setPlaying, setSpeed, setAutoPlay, decide, finishMatch, pauseAtHalftime,
  } = useInazuma()
  const bottom = useRef<HTMLDivElement>(null)
  const [cut, setCut] = useState<CutIn | null>(null)
  const seen = useRef(0)

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [feed.length])

  // Corte de supertécnica: se mira SOLO lo que ha entrado nuevo en la
  // retransmisión, y se enseña la última técnica del lote. Si se mirara el
  // feed entero volvería a saltar en cada repintado.
  useEffect(() => {
    if (!match) return
    const fresh = feed.slice(seen.current)
    seen.current = feed.length
    const mine = playerSide(match)
    for (let i = fresh.length - 1; i >= 0; i--) {
      const c = cutInFrom(fresh[i], mine, feed.length)
      if (c) { setCut(c); return }
    }
  }, [feed, match])

  if (!match) return null
  const mine = sideOf(match, playerSide(match))
  const theirs = sideOf(match, otherSide(playerSide(match)))
  const finished = match.phase === 'finished'

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <TechniqueCutIn cut={cut} onDone={() => setCut(null)} />
      <Scoreboard match={match} />
      {!finished && <MatchPitch match={match} />}

      {/* Narración. `justify-end` para que se lea como una retransmisión: las
          jugadas nuevas aparecen justo encima del panel de decisión en lugar de
          dejar media pantalla en blanco al principio del partido. */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 py-2 flex flex-col justify-end gap-1.5">
        {feed.slice(-40).map((e, i) => <EventLine key={i} event={e} isMine={eventIsMine(match, e)} />)}
        <div ref={bottom} />
      </div>

      {/* Panel de decisión o controles */}
      {match.phase === 'decision' && match.decision ? (
        <DecisionPanel decision={match.decision} match={match} onPick={decide} />
      ) : finished ? (
        <div className="p-3 safe-bottom border-t border-slate-800 bg-slate-900/90">
          <div className="text-center mb-2">
            <div className="text-3xl font-extrabold tabular-nums">{mine.goals} – {theirs.goals}</div>
            <div className={`text-sm font-bold ${
              match.result === 'win' ? 'text-emerald-300' : match.result === 'draw' ? 'text-amber-300' : 'text-rose-300'
            }`}>
              {match.result === 'win' ? '¡Victoria!' : match.result === 'draw' ? 'Empate' : 'Derrota'}
            </div>
          </div>
          <Button variant="primary" full onClick={finishMatch}>Ir al vestuario</Button>
        </div>
      ) : (
        <div className="p-3 safe-bottom border-t border-slate-800 bg-slate-900/90 flex items-center gap-2">
          <Button variant={playing ? 'secondary' : 'primary'} onClick={() => setPlaying(!playing)} className="flex-1">
            <span className="inline-flex items-center justify-center gap-1.5">
              <Icon name={playing ? 'timer' : 'play'} className="w-4 h-4" />
              {playing ? 'Pausa' : 'Seguir'}
            </span>
          </Button>
          <button
            onClick={() => setSpeed(speed > 700 ? 450 : speed > 350 ? 220 : 1100)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-xs font-bold tabular-nums"
          >
            {speed > 700 ? '×1' : speed > 350 ? '×2' : '×4'}
          </button>
          {/* Guardar y salir: SOLO tras el descanso. 90 minutos del tirón en un
              móvil es mucho; como se guarda el marcador tal cual, no sirve para
              esquivar una derrota. */}
          {match.halftimeDone && (
            <button
              onClick={pauseAtHalftime}
              className="rounded-xl border border-emerald-600/60 bg-emerald-500/10 px-3 py-3 text-xs font-bold text-emerald-300"
              title="Guarda el partido y vuelve al mapa"
            >
              GUARDAR
            </button>
          )}
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            className={`rounded-xl border px-3 py-3 text-xs font-bold ${
              autoPlay ? 'border-amber-500/60 bg-amber-500/15 text-amber-200' : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
            title="Deja que el banquillo decida las jugadas clave por ti"
          >
            AUTO
          </button>
        </div>
      )}
    </div>
  )
}

/** ¿El evento es a favor del usuario? Decide el color de la línea. */
function eventIsMine(match: MatchState, e: MatchEvent): boolean {
  const mine = playerSide(match)
  return 'side' in e ? e.side === mine : false
}

function Scoreboard({ match }: { match: MatchState }) {
  const mineSide = playerSide(match)
  const mine = sideOf(match, mineSide)
  const theirs = sideOf(match, otherSide(mineSide))
  return (
    <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 pt-2 pb-2">
      <div className="flex items-center gap-2">
        <TeamBadge name={mine.name} color={mine.color} />
        <div className="text-center px-2">
          <div className="text-2xl font-extrabold tabular-nums leading-none">{mine.goals} – {theirs.goals}</div>
          <div className="text-[10px] text-slate-400 tabular-nums mt-0.5">min. {match.minute}′</div>
        </div>
        <TeamBadge name={theirs.name} color={theirs.color} right />
      </div>
      {/* La tanda tiene su propio marcador: el del partido se queda congelado. */}
      {match.stage !== 'reglamentario' && (
        <div className="mt-1 text-center text-[10px] font-bold uppercase tracking-widest text-amber-300">
          {match.stage === 'prorroga' ? 'Prórroga' : (() => {
            const sh = match.shootout
            if (!sh) return 'Penaltis'
            const [h, a] = sh.goals
            const my = mineSide === 'home' ? h : a
            const yours = mineSide === 'home' ? a : h
            return `Penaltis · ${my} – ${yours}`
          })()}
        </div>
      )}
      {/* Barras de Ruptura */}
      <div className="mt-1.5 flex items-center gap-2">
        <BurstBar value={mine.burst} turns={mine.burstTurns} color="#f59e0b" />
        <span className="text-[9px] uppercase tracking-widest text-slate-600 shrink-0">Ruptura</span>
        <BurstBar value={theirs.burst} turns={theirs.burstTurns} color="#64748b" flip />
      </div>
    </div>
  )
}

function TeamBadge({ name, color, right }: { name: string; color: string; right?: boolean }) {
  return (
    <div className={`flex-1 min-w-0 flex items-center gap-1.5 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="w-2.5 h-6 rounded-sm shrink-0" style={{ background: color }} />
      <span className="text-[11px] font-bold truncate">{name}</span>
    </div>
  )
}

function BurstBar({ value, turns, color, flip }: { value: number; turns: number; color: string; flip?: boolean }) {
  const active = turns > 0
  return (
    <div className={`flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden ${flip ? 'rotate-180' : ''}`}>
      <div
        className={`h-full rounded-full transition-all ${active ? 'animate-pulse' : ''}`}
        style={{ width: `${active ? 100 : value}%`, background: active ? '#fbbf24' : color }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Narración
// ---------------------------------------------------------------------------

function EventLine({ event, isMine }: { event: MatchEvent; isMine: boolean }) {
  switch (event.kind) {
    case 'kickoff':
      return <Banner text="¡Comienza el partido!" tone="neutral" />
    case 'halftime':
      return <Banner text={`Descanso · ${event.score[0]}-${event.score[1]}`} tone="neutral" />
    case 'stage':
      // Prórroga y penaltis se anuncian a lo grande: es el momento en el que
      // el partido cambia de reglas.
      return <Banner text={event.text} tone="burst" />
    case 'penalty':
      return (
        <div className={`rounded-xl border px-3 py-2 animate-pop-in ${
          event.scored
            ? (isMine ? 'border-emerald-500/60 bg-emerald-500/15' : 'border-rose-500/60 bg-rose-500/15')
            : 'border-slate-700 bg-slate-800/60'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-slate-400">Penalti</span>
            <span className="ml-auto text-xs font-extrabold tabular-nums text-slate-300">
              {event.shootout[0]} – {event.shootout[1]}
            </span>
          </div>
          <div className="text-[12px] text-slate-200 leading-snug">{event.text}</div>
        </div>
      )
    case 'fulltime':
      return <Banner text={`Final · ${event.score[0]}-${event.score[1]}`} tone="neutral" />
    case 'goal':
      return (
        <div className={`rounded-xl border px-3 py-2 animate-pop-in ${
          isMine ? 'border-emerald-500/60 bg-emerald-500/15' : 'border-rose-500/60 bg-rose-500/15'
        }`}>
          <div className="text-[10px] tabular-nums text-slate-400">{event.minute}′</div>
          <div className="font-extrabold text-sm">
            <Icon name="ball" className="w-4 h-4 inline-block mr-1 align-[-3px]" />
            ¡GOL de {event.scorer}!{event.technique ? ` (${event.technique})` : ''}
          </div>
          <div className="text-xs text-slate-300 tabular-nums">{event.score[0]} – {event.score[1]}</div>
        </div>
      )
    case 'burst':
      return <Banner text={event.text} tone="burst" />
    case 'spirit':
      return <Banner text={event.text} tone="burst" icon="spirit" />
    case 'save':
      return <Line minute={event.minute} text={event.text} accent={isMine ? '#22c55e' : '#94a3b8'} />
    case 'turnover':
      return <Line minute={event.minute} text={event.text} accent="#64748b" />
    case 'exhausted':
      return <Line minute={event.minute} text={event.text} accent="#f97316" icon="tired" />
    case 'possession':
      return <Line minute={event.minute} text={event.text} accent={isMine ? '#38bdf8' : '#475569'} />
    case 'duel': {
      const el = event.element ? ELEMENT_INFO[event.element] : null
      return (
        <Line
          minute={event.minute}
          text={event.text}
          accent={event.success ? (isMine ? '#22c55e' : '#f43f5e') : '#64748b'}
          badge={el && event.effectiveness !== 1
            ? `${event.effectiveness > 1 ? '×1.35' : '×0.78'}`
            : undefined}
        />
      )
    }
    default:
      return null
  }
}

function Line({ minute, text, accent, badge, icon }: {
  minute: number
  text: string
  accent: string
  badge?: string
  icon?: string
}) {
  return (
    <div className="flex gap-2 items-start animate-fade-in">
      <span className="text-[10px] tabular-nums text-slate-600 w-7 shrink-0 pt-0.5">{minute}′</span>
      <span className="w-0.5 shrink-0 self-stretch rounded-full" style={{ background: accent }} />
      <span className="text-[12px] text-slate-300 leading-snug flex-1">
        {icon && <Icon name={icon} className="w-3.5 h-3.5 inline-block mr-1 align-[-3px]" style={{ color: accent }} />}
        {text}
        {badge && <span className="ml-1.5 text-[10px] font-bold" style={{ color: accent }}>{badge}</span>}
      </span>
    </div>
  )
}

function Banner({ text, tone, icon }: { text: string; tone: 'neutral' | 'burst'; icon?: string }) {
  return (
    <div className={`flex items-center justify-center gap-1.5 text-center text-[11px] font-extrabold uppercase tracking-widest py-1.5 rounded-lg my-1 ${
      tone === 'burst' ? 'text-amber-200 bg-amber-500/15 border border-amber-500/40 animate-pop-in' : 'text-slate-500 bg-slate-800/60'
    }`}>
      {icon && <Icon name={icon} className="w-4 h-4 shrink-0" />}
      {text}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Jugada clave
// ---------------------------------------------------------------------------

function DecisionPanel({
  decision, match, onPick,
}: {
  decision: NonNullable<MatchState['decision']>
  match: MatchState
  onPick: (id: string) => void
}) {
  const actor = actorByUid(match, decision.actorUid)
  const rival = actorByUid(match, decision.rivalUid)
  return (
    <div className="shrink-0 border-t border-amber-500/40 bg-slate-900 p-3 safe-bottom animate-pop-in">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[10px] tabular-nums text-amber-300 font-bold">{decision.minute}′</span>
        <span className="text-sm font-extrabold text-amber-200">{decision.headline}</span>
      </div>

      {/* Cara a cara: quién decide y contra quién. El texto solo daba nombres,
          y con 22 jugadores en el campo un nombre no basta para reconocer a
          nadie. */}
      <div className="mb-2 flex items-center gap-2">
        <Mugshot actor={actor} name={decision.actorName} />
        <div className="text-center px-1">
          <div className="text-[10px] font-extrabold text-slate-500">VS</div>
          <div className="text-[9px] text-slate-500 whitespace-nowrap">
            {decision.mode === 'ataque' ? 'ataca' : 'para el tiro'}
          </div>
        </div>
        <Mugshot actor={rival} name={decision.rivalName} right />
      </div>
      <div className="flex flex-col gap-1.5 max-h-[38svh] overflow-y-auto no-scrollbar">
        {decision.options.map((o) => {
          const el = o.element ? ELEMENT_INFO[o.element] : null
          const isBurst = o.id === 'burst'
          return (
            <button
              key={o.id}
              onClick={() => !o.disabled && onPick(o.id)}
              disabled={!!o.disabled}
              className={`w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${
                isBurst
                  ? 'border-amber-400/70 bg-amber-500/20 animate-pulse'
                  : 'border-slate-700 bg-slate-800/70'
              }`}
              style={el && !isBurst ? { borderColor: `${el.color}66` } : undefined}
            >
              {/* Los pases enseñan la cara del que recibe: la gracia de pasar
                  es elegir a QUIÉN, y eso no se lee en una lista de nombres. */}
              {o.id.startsWith('pass:') && (() => {
                const mate = actorByUid(match, o.id.slice(5))
                return mate ? <Mugshot actor={mate} name={mate.name} tiny /> : null
              })()}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[13px] truncate" style={el && !isBurst ? { color: el.color } : undefined}>
                  {o.label}
                </div>
                <div className="text-[10px] text-slate-400">{o.disabled ?? o.detail}</div>
              </div>
              <Odds option={o} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Retrato + nombre + elemento. Se usa en el cara a cara de la jugada clave y en
 * las opciones de pase.
 */
export function Mugshot({ actor, name, right, tiny }: {
  actor?: Actor
  name: string
  right?: boolean
  tiny?: boolean
}) {
  const info = ELEMENT_INFO[actor?.element ?? 'aire']
  const size = tiny ? 'w-8 h-8' : 'w-11 h-11'
  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${tiny ? '' : 'flex-1'} ${right ? 'flex-row-reverse text-right' : ''}`}>
      <div
        className={`${size} shrink-0 rounded-full overflow-hidden border-2 grid place-items-center bg-slate-800`}
        style={{ borderColor: info.color }}
      >
        <ImgFallback
          src={portraitUrl(actor?.baseId ?? '')}
          className="w-full h-full object-cover"
          alt={name}
          fallback={<span className="text-[10px] font-extrabold" style={{ color: info.color }}>
            {name.slice(0, 2).toUpperCase()}
          </span>}
        />
      </div>
      {!tiny && (
        <div className="min-w-0">
          <div className="text-[12px] font-bold truncate">{name}</div>
          <div className="text-[10px] flex items-center gap-1" style={{ color: info.color }}>
            <Icon name={info.icon} className="w-3 h-3" />
            {info.label}
            {actor && <span className="text-slate-500"> · {actor.pt} PT</span>}
          </div>
        </div>
      )}
    </div>
  )
}
