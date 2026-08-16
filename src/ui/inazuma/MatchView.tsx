// Retransmisión del partido: marcador, narración jugada a jugada y el panel de
// decisión cuando el motor se para a preguntarte.
//
// La UI NO calcula nada: solo pinta los `MatchEvent` que emite el motor y manda
// de vuelta el id de la opción elegida. Mismo reparto de responsabilidades que
// `BattleScreen` en el roguelike Pokémon.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { useSettings } from '@/state/settingsStore'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import Odds from '@/ui/inazuma/Odds'
import LivePitch from '@/ui/inazuma/LivePitch'
import DuelStage, { type StageData } from '@/ui/inazuma/DuelStage'
import GoalOverlay from '@/ui/inazuma/GoalOverlay'
import HalftimePanel from '@/ui/inazuma/HalftimePanel'
import { Crest, KindIcon, Pic, rarityBorder } from '@/ui/inazuma/Glyphs'
import { teamDisplay } from '@/data/inazuma/teams'
import { actorByUid, playerSide, sideOf, otherSide } from '@/engine/inazuma/match'
import { Meter, portraitUrl, staminaColor } from '@/ui/inazuma/PlayerCard'
import { ImgFallback } from '@/ui/components/kit'
import type { Actor, ChainStep, Element, MatchEvent, MatchState, Technique } from '@/engine/inazuma/types'

export default function MatchView() {
  const {
    match, feed, playing, speed, autoPlay, save, matchNode,
    setPlaying, setSpeed, setAutoPlay, decide, finishMatch, pauseAtHalftime, simulateMatch,
  } = useInazuma()
  const simMatch = useSettings((s) => s.inazumaSimMatch)
  const bottom = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<StageData | null>(null)
  // Último emparejamiento pintado en el césped (ver más abajo: pegajoso).
  const stickyPair = useRef<{ attackerUid: string; defenderUid: string; step: ChainStep; side: 'home' | 'away'; longShot?: boolean } | null>(null)

  // El RITMO lo marca el store: el feed llega ya revelado de uno en uno, con
  // el motor parado hasta que cada momento tuvo su tiempo en pantalla. Aquí
  // solo se reacciona al último evento: escenario de duelo o celebración.
  const [gol, setGol] = useState<{ scorer: string; mine: boolean; key: number; teamId?: string } | null>(null)
  // FLASH de duelo de campo (regate/corte): informa SIN parar el juego.
  const [flash, setFlash] = useState<{ key: number; text: string; color: string } | null>(null)
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 950)
    return () => clearTimeout(t)
  }, [flash])
  const clearGol = useCallback(() => setGol(null), [])
  const clearStage = useCallback(() => { setStage(null); setShotFlight(null) }, [])
  // DISPARO EN VUELO: la cinemática avisa y el CÉSPED pinta el balón ardiendo
  // camino de la portería (antes viajaba dentro de la propia cinemática).
  const [shotFlight, setShotFlight] = useState<{ key: number; element?: Element; mine: boolean; landed?: boolean } | null>(null)
  const stageRef = useRef<StageData | null>(null)
  stageRef.current = stage
  const onFlight = useCallback((active: boolean) => {
    const st = stageRef.current
    // Al terminar el vuelo el balón NO desaparece: se queda EN LA PORTERÍA
    // mientras se resuelve la parada. Antes volvía de golpe a los pies del que
    // había disparado, que era justo lo que se veía raro.
    if (active) setShotFlight(st ? { key: st.key, element: st.element, mine: st.attackerMine } : null)
    else setShotFlight((f) => (f ? { ...f, landed: true } : null))
  }, [])
  // Escudo del que marca: el tuyo o el del instituto rival de esta casilla.
  const crestOf = (mine: boolean) => (mine ? teamDisplay(save ?? {}).crestId : matchNode?.teamId)
  // Cada evento se ESCENIFICA una sola vez. El objeto `match` cambia de
  // identidad en cada latido del ticker y el efecto se re-ejecutaba con el
  // mismo evento: el escenario se reiniciaba y los duelos «se repetían».
  const staged = useRef(0)
  useEffect(() => {
    if (!match || !feed.length) return
    if (staged.current === feed.length) return
    staged.current = feed.length
    // SIMULANDO no se escenifica nada: el feed llega de golpe y estos efectos
    // montaban una última cinemática suelta encima del resultado.
    if (useSettings.getState().inazumaSimMatch) return
    const last = feed[feed.length - 1]
    const mine = playerSide(match)
    if (last.kind === 'goal') {
      const isMine = last.side === mine
      setGol({ scorer: last.scorer, mine: isMine, key: feed.length, teamId: crestOf(isMine) })
    } else if (last.kind === 'penalty') {
      // El penalti es un duelo en sí mismo: escenario, y si entra, celebración.
      setStage({
        key: feed.length,
        attacker: { name: last.shooter, baseId: actorByUid(match, last.shooterUid)?.baseId, rarity: actorByUid(match, last.shooterUid)?.rarity, techName: last.technique },
        defender: { name: last.keeper, baseId: actorByUid(match, last.keeperUid)?.baseId, rarity: actorByUid(match, last.keeperUid)?.rarity },
        attackerWins: last.scored,
        attackerMine: last.side === mine,
        attackerCrest: crestOf(last.side === mine),
        defenderCrest: crestOf(last.side !== mine),
        shootoutScore: last.shootout,
        kind: 'penalti',
      })
      if (last.scored) {
        // La celebración espera a que el escenario cuente el lanzamiento: si
        // saltara a la vez, el gol se sabría antes de ver el penalti. El timer
        // NO se limpia en el cleanup: con el guard de arriba ya no hay
        // re-ejecuciones que lo dupliquen, y limpiarlo lo mataba antes de
        // disparar (el gol de penalti no salía nunca).
        const isMine = last.side === mine
        setTimeout(
          () => setGol({ scorer: last.shooter, mine: isMine, key: feed.length, teamId: crestOf(isMine) }),
          1900,
        )
      }
    } else if (last.kind === 'duel' && last.step === 'definicion') {
      // Cinemática SOLO en los DISPAROS (y penaltis): los duelos de regate
      // vs bloqueo NO paran el partido — se resuelven con un FLASH sobre el
      // césped (la técnica ganadora, o «¡REGATE!»/«¡CORTE!» a pelo).
      setStage({
        key: feed.length,
        attacker: { name: last.attacker, baseId: actorByUid(match, last.attackerUid)?.baseId, rarity: actorByUid(match, last.attackerUid)?.rarity, techName: last.technique },
        defender: { name: last.defender, baseId: actorByUid(match, last.defenderUid)?.baseId, rarity: actorByUid(match, last.defenderUid)?.rarity, techName: last.counter },
        attackerWins: last.success,
        attackerMine: last.side === mine,
        attackerCrest: crestOf(last.side === mine),
        defenderCrest: crestOf(last.side !== mine),
        chance: last.chance,
        // Elemento del disparo (técnica o tirador): las llamas del balón.
        element: last.element,
        kind: 'tiro',
      })
    } else if (last.kind === 'duel') {
      // Duelo de campo (regate contra bloqueo). CON SUPERTÉCNICA se enseña la
      // foto grande de la que GANA el duelo — sin el cara a cara, que era lo
      // que sobraba. SIN técnica no hay nada que enseñar: un flash y el juego
      // sigue sin pararse.
      const winnerTech = last.success ? last.technique : last.counter
      const winnerMine = (last.side === mine) === last.success
      if (winnerTech) {
        setStage({
          key: feed.length,
          attacker: { name: last.attacker, baseId: actorByUid(match, last.attackerUid)?.baseId, rarity: actorByUid(match, last.attackerUid)?.rarity, techName: last.technique },
          defender: { name: last.defender, baseId: actorByUid(match, last.defenderUid)?.baseId, rarity: actorByUid(match, last.defenderUid)?.rarity, techName: last.counter },
          attackerWins: last.success,
          attackerMine: last.side === mine,
          attackerCrest: crestOf(last.side === mine),
          defenderCrest: crestOf(last.side !== mine),
          kind: 'regate',
        })
      } else {
        setFlash({
          key: feed.length,
          text: last.success ? '¡REGATE!' : '¡CORTE!',
          color: winnerMine ? '#34d399' : '#f87171',
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.length])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [feed.length])

  // La retransmisión NO revela nada más mientras una cinemática (duelo, pase,
  // gol) está en pantalla: revelar por debajo movía el césped a mitad de
  // animación y dejaba cinemáticas encadenadas.
  const setUiBusy = useInazuma((s) => s.setUiBusy)
  const busy = stage !== null || gol !== null
  useEffect(() => {
    setUiBusy(busy)
    return () => setUiBusy(false)
  }, [busy, setUiBusy])

  if (!match) return null
  const mine = sideOf(match, playerSide(match))
  const theirs = sideOf(match, otherSide(playerSide(match)))
  // AL DÍA: todo lo que el motor generó ya se contó en pantalla. El panel
  // final y el de decisión esperan a esto — el motor acaba (o pregunta) con
  // eventos aún por revelar, y saltar antes destripaba el marcador final o
  // pisaba la animación en curso.
  const caughtUp = feed.length >= match.events.length
  const finished = match.phase === 'finished' && caughtUp && stage === null && gol === null

  // CONGELACIÓN: mientras el escenario del duelo o la celebración están en
  // pantalla, nada de lo de debajo avanza. El motor ya sabe el desenlace, pero
  // la narración, el campo y las barras de Ruptura esperan a que la animación
  // termine de contarlo — si no, el partido «seguía por debajo».
  const frozen = stage !== null || gol !== null
  // La línea de un duelo dice quién ganó: no aparece hasta que su escenario
  // acaba (el escenario se llavea con feed.length, así que basta con ocultar
  // la última línea mientras ese escenario viva).
  const shownFeed = stage && stage.key === feed.length ? feed.slice(0, -1) : feed

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <DuelStage stage={stage} onDone={clearStage} onFlight={onFlight} />
      <HalftimePanel />
      <Scoreboard
        match={match}
        feed={feed}
        myTeamId={teamDisplay(save ?? {}).crestId}
        rivalTeamId={matchNode?.kind === 'jefe' || matchNode?.kind === 'final' ? matchNode?.teamId : undefined}
        frozen={frozen}
      />
      {/* EL PARTIDO EN VIVO: el césped completo con los 22 y el balón es el
          cuerpo de la pantalla. Lee el feed YA CONTADO (sin la línea en
          animación): leer el motor en vivo destriparía la siguiente jugada. */}
      {!finished && (() => {
        // El césped pinta SIEMPRE lo mismo que el primer plano: si hay
        // decisión, su emparejamiento; si hay cinemática de duelo, ESE duelo
        // (sin desenlace); si no, el último contado.
        const stagedEv = stage && stage.key === feed.length ? feed[feed.length - 1] : null
        let current: { attackerUid: string; defenderUid: string; step: ChainStep; side: 'home' | 'away'; longShot?: boolean } | null
          = match.phase === 'decision' && match.decision && caughtUp && !frozen
          ? {
            attackerUid: match.decision.mode === 'ataque' ? match.decision.actorUid : match.decision.rivalUid,
            defenderUid: match.decision.mode === 'ataque' ? match.decision.rivalUid : match.decision.actorUid,
            step: match.decision.step,
            side: match.decision.mode === 'ataque' ? playerSide(match) : otherSide(playerSide(match)),
            // Si la jugada viene de un tiro lejano, el que dispara sigue en
            // tres cuartos: el campo tiene que pintarlo ahí desde ya.
            longShot: match.chain?.longShot === true,
          }
          : stagedEv?.kind === 'duel'
            ? { attackerUid: stagedEv.attackerUid, defenderUid: stagedEv.defenderUid, step: stagedEv.step, side: stagedEv.side, longShot: stagedEv.longShot }
            : null
        // PEGAJOSO: entre elegir la opción y revelarse el duelo (o entre dos
        // cinemáticas) el emparejamiento quedaba a null un instante y el campo
        // RETROCEDÍA al duelo anterior para volver enseguida — el vaivén
        // «hacia atrás y hacia adelante». Mientras haya jugada en resolución
        // (eventos sin revelar o animación en pantalla), se mantiene el último.
        if (current) stickyPair.current = current
        else if (!caughtUp || frozen) current = stickyPair.current
        else stickyPair.current = null
        return (
          <div className="relative flex-1 min-h-0 flex flex-col">
            <LivePitch
              match={match}
              feed={shownFeed}
              current={current}
              myCrest={teamDisplay(save ?? {}).crestId}
              theirCrest={matchNode?.kind === 'jefe' || matchNode?.kind === 'final' ? matchNode?.teamId : undefined}
              flight={shotFlight}
            />
            {/* FLASH del duelo de campo: grande, breve y sin parar nada. */}
            {flash && (
              <div key={flash.key} className="absolute inset-x-0 top-[38%] z-30 flex justify-center pointer-events-none">
                <span
                  className="px-4 py-1 rounded-2xl border-2 bg-slate-950/85 text-xl font-black uppercase tracking-wider animate-goal"
                  style={{ color: flash.color, borderColor: flash.color, transform: 'rotate(-4deg)' }}
                >
                  {flash.text}
                </span>
              </div>
            )}
          </div>
        )
      })()}

      {/* TICKER: las dos últimas jugadas contadas, sin robarle sitio al campo.
          ALTURA FIJA: con altura libre, pasar de 1 a 2 líneas (o a un banner
          de gol) estiraba y encogía el césped a cada acción. */}
      {!finished && (
        <div className="shrink-0 h-[4.4rem] overflow-hidden px-3 pb-1 flex flex-col justify-end gap-1">
          {shownFeed.slice(-2).map((e, i) => (
            <EventLine key={`${shownFeed.length}-${i}`} event={e} isMine={eventIsMine(match, e)} />
          ))}
          <div ref={bottom} />
        </div>
      )}

      {/* ¡GOL! La celebración para el partido un instante: sin ella, el gol
          pasaba tan deprisa como un regate cualquiera. */}
      {gol && (
        <GoalOverlay
          key={gol.key}
          scorer={gol.scorer}
          mine={gol.mine}
          teamId={gol.teamId}
          onDone={clearGol}
        />
      )}

      {/* Panel de decisión o controles. La decisión espera a estar AL DÍA y
          sin animación en pantalla: el motor pregunta con eventos aún por
          contar, y el panel (con su jugada y su rival) los destripaba.
          El panel va POR ENCIMA del césped (overlay): antes entraba en el
          flujo y el campo se agrandaba/achicaba con cada decisión. */}
      {match.phase === 'decision' && match.decision && caughtUp && !frozen ? (
        <div className="absolute inset-x-0 bottom-0 z-40 max-h-[62svh] overflow-y-auto rounded-t-2xl shadow-[0_-12px_30px_rgba(0,0,0,.5)]">
          <DecisionPanel decision={match.decision} match={match} onPick={decide} />
        </div>
      ) : finished ? (
        <div className="p-3 safe-bottom border-t border-slate-800 bg-slate-900/90 max-h-[76svh] overflow-y-auto">
          <div className="text-center mb-2">
            <div className="text-3xl font-extrabold tabular-nums">{mine.goals} – {theirs.goals}</div>
            <div className={`text-sm font-bold ${
              match.result === 'win' ? 'text-emerald-300' : match.result === 'draw' ? 'text-amber-300' : 'text-rose-300'
            }`}>
              {match.result === 'win' ? '¡Victoria!' : match.result === 'draw' ? 'Empate' : 'Derrota'}
            </div>
          </div>
          {/* Qué se lleva cada uno: niveles por participación. */}
          <div className="mb-2 text-center text-[11px] text-slate-300">
            <span className="text-emerald-300 font-bold">+4 niveles</span> a los que jugaron ·{' '}
            <span className="text-sky-300 font-bold">+2</span> al banquillo
          </div>
          <MatchSummary match={match} />
          <Button variant="primary" full className="mt-2" onClick={finishMatch}>Ir al vestuario</Button>
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
            onClick={() => {
              const on = !useSettings.getState().inazumaSimMatch
              useSettings.getState().toggleInazumaSimMatch()
              if (on) simulateMatch()
            }}
            className={`rounded-xl border px-3 py-3 text-xs font-bold ${
              simMatch ? 'border-sky-500/60 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
            title="Simula el resto del partido (y los siguientes) al instante"
          >
            SIM
          </button>
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

function Scoreboard({ match, feed, myTeamId, rivalTeamId, frozen }: {
  match: MatchState
  feed: MatchEvent[]
  myTeamId?: string
  rivalTeamId?: string
  frozen?: boolean
}) {
  const mineSide = playerSide(match)
  const mine = sideOf(match, mineSide)
  const theirs = sideOf(match, otherSide(mineSide))

  // La Ruptura sube al GANAR un duelo: si la barra se moviera durante la
  // animación, contaría el desenlace antes de tiempo. Congelada mientras haya
  // escenario o celebración en pantalla.
  const burstRef = useRef({ mine: 0, theirs: 0, mineTurns: 0, theirsTurns: 0 })
  if (!frozen) {
    burstRef.current = {
      mine: mine.burst, theirs: theirs.burst,
      mineTurns: mine.burstTurns, theirsTurns: theirs.burstTurns,
    }
  }
  const burst = burstRef.current

  // El minuto también sale de lo REVELADO: el del motor va jugadas por delante.
  let minute = 0
  for (const e of feed) if ('minute' in e && e.minute > minute) minute = e.minute

  // El marcador se saca de lo REVELADO, no del motor: el motor ya sabe el gol
  // mientras el escenario del tiro aún se está contando, y ver moverse el
  // marcador antes de tiempo destripaba el desenlace.
  let score: [number, number] = [0, 0]
  let shootout: [number, number] | null = null
  let stage: 'reglamentario' | 'prorroga' | 'penaltis' = 'reglamentario'
  for (const e of feed) {
    if ((e.kind === 'goal' || e.kind === 'halftime' || e.kind === 'fulltime') && e.score) score = e.score
    if (e.kind === 'penalty') shootout = e.shootout
    if (e.kind === 'stage') stage = e.stage
  }
  const myGoals = mineSide === 'home' ? score[0] : score[1]
  const theirGoals = mineSide === 'home' ? score[1] : score[0]

  return (
    <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 pt-2 pb-2">
      <div className="flex items-center gap-2">
        <TeamBadge name={mine.name} color={mine.color} teamId={myTeamId} />
        <div className="text-center px-2">
          <div className="text-2xl font-extrabold tabular-nums leading-none">{myGoals} – {theirGoals}</div>
          <div className="text-[10px] text-slate-400 tabular-nums mt-0.5">min. {minute}′</div>
        </div>
        <TeamBadge name={theirs.name} color={theirs.color} teamId={rivalTeamId} right />
      </div>
      {/* La tanda tiene su propio marcador, también sacado de lo revelado. */}
      {stage !== 'reglamentario' && (
        <div className="mt-1 text-center text-[10px] font-bold uppercase tracking-widest text-amber-300">
          {stage === 'prorroga' && !shootout ? 'Prórroga' : (() => {
            if (!shootout) return 'Penaltis'
            const my = mineSide === 'home' ? shootout[0] : shootout[1]
            const yours = mineSide === 'home' ? shootout[1] : shootout[0]
            return `Penaltis · ${my} – ${yours}`
          })()}
        </div>
      )}
      {/* Barras de Ruptura. Con la Supervibración activa, el rótulo del centro
          cuenta las acciones gratis que quedan: antes había que adivinarlo. */}
      <div className="mt-1.5 flex items-center gap-2">
        <BurstBar value={burst.mine} turns={burst.mineTurns} color="#f59e0b" />
        <span className={`text-[9px] uppercase tracking-widest shrink-0 ${
          burst.mineTurns > 0 || burst.theirsTurns > 0 ? 'text-amber-300 font-extrabold animate-pulse' : 'text-slate-600'
        }`}>
          {burst.mineTurns > 0
            ? `¡Supervibración! quedan ${burst.mineTurns}`
            : burst.theirsTurns > 0
              ? `Rival vibrando · ${burst.theirsTurns}`
              : 'Ruptura'}
        </span>
        <BurstBar value={burst.theirs} turns={burst.theirsTurns} color="#64748b" flip />
      </div>
    </div>
  )
}

function TeamBadge({ name, color, teamId, right }: { name: string; color: string; teamId?: string; right?: boolean }) {
  return (
    <div className={`flex-1 min-w-0 flex items-center gap-1.5 ${right ? 'flex-row-reverse text-right' : ''}`}>
      {/* El escudo acompaña SIEMPRE al nombre; la barrita de color queda de
          respaldo para equipos sin escudo (las pachangas de barrio). */}
      {teamId
        ? <Crest teamId={teamId} className="w-6 h-6" />
        : <span className="w-2.5 h-6 rounded-sm shrink-0" style={{ background: color }} />}
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
            <Pic name="ball" className="w-4 h-4 inline-block mr-1 align-[-3px]" />
            ¡GOL de {event.scorer}!{event.technique ? ` (${event.technique})` : ''}
          </div>
          <div className="text-xs text-slate-300 tabular-nums">{event.score[0]} – {event.score[1]}</div>
        </div>
      )
    case 'burst':
      return <Banner text={event.text} tone="burst" />
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
  // La CLASE de acción que se decide, para su icono: tiro/regate atacando,
  // parada/bloqueo defendiendo.
  const panelKind: Technique['kind'] = decision.mode === 'ataque'
    ? (decision.step === 'definicion' ? 'tiro' : 'regate')
    : (decision.step === 'definicion' ? 'parada' : 'bloqueo')
  return (
    <div className="shrink-0 border-t border-amber-500/40 bg-slate-900 p-3 safe-bottom animate-pop-in">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] tabular-nums text-amber-300 font-bold">{decision.minute}′</span>
        <KindIcon kind={panelKind} className="w-4 h-4 text-amber-200" />
        <span className="text-sm font-extrabold text-amber-200">{decision.headline}</span>
      </div>

      {/* Defendiendo, la jugada SE VE VENIR: la técnica que el atacante va a
          lanzar (elección determinista del motor, no una estimación). Sin esto
          no había forma de saber si merecía gastar una parada cara. */}
      {decision.mode === 'defensa' && decision.rivalTech !== undefined && (
        <div
          className="mb-2 flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1"
          style={decision.rivalTechElement ? { borderColor: `${ELEMENT_INFO[decision.rivalTechElement].color}88` } : undefined}
        >
          <KindIcon
            kind={decision.step === 'definicion' ? 'tiro' : 'regate'}
            className="w-3.5 h-3.5 shrink-0 text-rose-300"
          />
          <span className="text-[11px] text-slate-300 min-w-0 truncate">
            {decision.rivalTech ? (
              <>
                {decision.rivalName} arma{' '}
                {decision.rivalTechElement && (
                  <Icon
                    name={ELEMENT_INFO[decision.rivalTechElement].icon}
                    className="w-3 h-3 inline-block align-[-2px] mr-0.5"
                    style={{ color: ELEMENT_INFO[decision.rivalTechElement].color }}
                  />
                )}
                <b style={decision.rivalTechElement ? { color: ELEMENT_INFO[decision.rivalTechElement].color } : undefined}>
                  ¡{decision.rivalTech}!
                </b>
              </>
            ) : (
              <>{decision.rivalName} llega sin técnica.</>
            )}
          </span>
        </div>
      )}

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
      <div className="flex flex-col gap-1.5 max-h-[38svh] overflow-y-auto">
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
              {/* Icono de lo que ES la opción: la acción, un pase, la barra. */}
              {!o.id.startsWith('pass:') && (
                <KindIcon
                  kind={panelKind}
                  className={`w-4 h-4 shrink-0 ${isBurst ? 'text-amber-200' : 'text-slate-400'}`}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[13px] truncate" style={el && !isBurst ? { color: el.color } : undefined}>
                  {el && !isBurst && (
                    <Icon name={el.icon} className="w-3 h-3 inline-block align-[-2px] mr-1" style={{ color: el.color }} />
                  )}
                  {o.label}
                </div>
                <div className="text-[10px] text-slate-400">
                  {o.disabled ?? (o.id.startsWith('pass:')
                    ? 'El pase llega SIEMPRE; el que recibe elige su jugada'
                    : o.detail)}
                </div>
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
      {/* El borde del retrato cuenta la RAREZA (como en el césped y el duelo);
          el elemento ya va en el icono y el rótulo de al lado. El multicolor
          lleva su anillo animado de verdad, no un borde rosa. */}
      <div
        className={`relative ${size} shrink-0 rounded-full overflow-hidden border-2 grid place-items-center bg-slate-800`}
        style={{ borderColor: actor?.rarity === 4 ? 'transparent' : actor?.rarity ? rarityBorder(actor.rarity) : info.color }}
      >
        <ImgFallback
          src={portraitUrl(actor?.baseId ?? '')}
          className="w-full h-full object-cover object-top"
          alt={name}
          fallback={<span className="text-[10px] font-extrabold" style={{ color: info.color }}>
            {name.slice(0, 2).toUpperCase()}
          </span>}
        />
        {actor?.rarity === 4 && <span className="mc-ring rounded-full" />}
      </div>
      {!tiny && (
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold truncate">{name}</div>
          <div className="text-[10px] flex items-center gap-1" style={{ color: info.color }}>
            <Icon name={info.icon} className="w-3 h-3" />
            {info.label}
          </div>
          {/* PT y aguante A LA VISTA al decidir: sin esto parecía que las
              supertécnicas eran infinitas (las tuyas y las del rival). */}
          {actor && (
            <div className="mt-0.5 flex flex-col gap-0.5">
              <Meter value={actor.pt} max={actor.ptMax} color="#38bdf8" label="PT" />
              <Meter value={actor.stamina} max={100} color={staminaColor(actor.stamina)} label="AGU" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}


/**
 * RESUMEN del partido, calculado de la retransmisión completa: tiros, paradas,
 * duelos, posesiones y técnicas de cada lado, más el jugador del partido.
 */
function MatchSummary({ match }: { match: MatchState }) {
  const mineSide = playerSide(match)
  const rows: { label: string; a: number; b: number }[] = []
  const count = (fn: (e: MatchEvent, mine: boolean) => boolean) => [
    match.events.filter((e) => fn(e, true)).length,
    match.events.filter((e) => fn(e, false)).length,
  ] as const

  const isMine = (e: MatchEvent, want: boolean) => 'side' in e && (e.side === mineSide) === want
  const [tA, tB] = count((e, m) => e.kind === 'duel' && e.step === 'definicion' && isMine(e, m))
  const [sA, sB] = count((e, m) => e.kind === 'save' && isMine(e, m))
  const [dA, dB] = count((e, m) => e.kind === 'duel' && (e.success ? isMine(e, m) : isMine(e, !m)))
  const [pA, pB] = count((e, m) => e.kind === 'possession' && isMine(e, m))
  const [qA, qB] = count((e, m) => e.kind === 'duel' && ((m && isMine(e, true) && !!e.technique)
    || (m && isMine(e, false) && !!e.counter)
    || (!m && isMine(e, false) && !!e.technique)
    || (!m && isMine(e, true) && !!e.counter)))
  rows.push({ label: 'Tiros', a: tA, b: tB })
  rows.push({ label: 'Paradas', a: sA, b: sB })
  rows.push({ label: 'Duelos ganados', a: dA, b: dB })
  rows.push({ label: 'Posesiones', a: pA, b: pB })
  rows.push({ label: 'Supertécnicas', a: qA, b: qB })

  // Jugador del partido (por UID): goles ×3 + duelos ganados + paradas.
  const score = new Map<string, number>()
  for (const e of match.events) {
    if (e.kind === 'goal') score.set(e.scorerUid, (score.get(e.scorerUid) ?? 0) + 3)
    if (e.kind === 'duel') {
      const winner = e.success ? e.attackerUid : e.defenderUid
      score.set(winner, (score.get(winner) ?? 0) + 1)
    }
    if (e.kind === 'save') score.set(e.keeperUid, (score.get(e.keeperUid) ?? 0) + 1)
  }
  const mvpUid = [...score.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  // GOLES con su ASISTENCIA: el último pase de la misma posesión que acabó en
  // los pies del goleador. Se busca hacia atrás y se corta en cualquier
  // frontera de posesión (robo, gol, saque o una posesión nueva sin pase).
  const assistFor = (goalIndex: number, scorerUid: string): string | null => {
    for (let i = goalIndex - 1; i >= 0; i--) {
      const e = match.events[i]
      if (e.kind === 'turnover' || e.kind === 'goal' || e.kind === 'kickoff') return null
      if (e.kind === 'possession') {
        if (e.passToUid === scorerUid && e.passFromUid) return e.passFromUid
        if (!e.passFromUid) return null
      }
    }
    return null
  }
  const goals = match.events
    .map((e, i) => ({ e, i }))
    .filter((x): x is { e: Extract<MatchEvent, { kind: 'goal' }>; i: number } => x.e.kind === 'goal')
    .map((x) => ({ ...x.e, assistUid: assistFor(x.i, x.e.scorerUid) }))
  const myGoals = goals.filter((g) => g.side === mineSide)
  const theirGoals = goals.filter((g) => g.side !== mineSide)

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 text-center mb-1.5">
        Estadísticas del partido
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((r) => {
          const max = Math.max(r.a, r.b, 1)
          return (
            <div key={r.label} className="grid grid-cols-[2rem_1fr_7rem_1fr_2rem] items-center gap-1.5">
              <span className={`text-[12px] font-extrabold tabular-nums text-right ${r.a >= r.b ? 'text-emerald-300' : 'text-slate-400'}`}>{r.a}</span>
              <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden rotate-180">
                <div className="h-full bg-emerald-500/70" style={{ width: `${(r.a / max) * 100}%` }} />
              </div>
              <span className="text-[10px] uppercase tracking-wide text-slate-500 text-center">{r.label}</span>
              <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div className="h-full bg-rose-500/70" style={{ width: `${(r.b / max) * 100}%` }} />
              </div>
              <span className={`text-[12px] font-extrabold tabular-nums ${r.b >= r.a ? 'text-rose-300' : 'text-slate-400'}`}>{r.b}</span>
            </div>
          )
        })}
      </div>

      {/* MVP PRIMERO (con 8 goles quedaba bajo el pliegue y «no salía»). */}
      {mvpUid && (
        <div className="mt-2">
          <div className="text-[9px] uppercase tracking-widest text-amber-300 font-extrabold text-center mb-1">
            Jugador del partido
          </div>
          <ScorerCard match={match} uid={mvpUid} mvp mine={!!actorByUid(match, mvpUid) && [sideOf(match, mineSide)].some((s) => [s.keeper, ...s.defs, ...s.mids, ...s.fwds].some((a) => a.uid === mvpUid))} />
        </div>
      )}

      {/* GOLEADORES con su tarjeta (foto, minuto y asistencia si la hubo),
          cada bando en su lado. */}
      {goals.length > 0 && (
        <>
          <div className="mt-2 text-[9px] uppercase tracking-widest text-slate-500 text-center">Goles</div>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            <div className="flex flex-col gap-1">
              {myGoals.map((g, i) => <ScorerCard key={`m${i}`} match={match} uid={g.scorerUid} minute={g.minute} assistUid={g.assistUid} mine />)}
            </div>
            <div className="flex flex-col gap-1">
              {theirGoals.map((g, i) => <ScorerCard key={`t${i}`} match={match} uid={g.scorerUid} minute={g.minute} assistUid={g.assistUid} />)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Tarjeta de goleador/MVP: retrato con anillo de rareza (el color del borde
 * YA cuenta la rareza — sin etiqueta), posición, elemento, el minuto del gol
 * y la ASISTENCIA si la hubo (o la estrella del MVP).
 */
function ScorerCard({ match, uid, minute, assistUid, mine, mvp }: {
  match: MatchState
  uid: string
  minute?: number
  assistUid?: string | null
  mine?: boolean
  mvp?: boolean
}) {
  const a = actorByUid(match, uid)
  if (!a) return null
  const info = ELEMENT_INFO[a.element]
  const tier = a.rarity ?? 1
  const assist = assistUid ? actorByUid(match, assistUid) : null
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${
      mvp ? 'border-amber-500/60 bg-amber-500/10' : mine ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'
    }`}>
      <div
        className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden border-2 grid place-items-center bg-slate-900"
        style={{ borderColor: tier === 4 ? 'transparent' : rarityBorder(tier) }}
      >
        <ImgFallback
          src={portraitUrl(a.baseId)}
          className="w-full h-full object-cover object-top"
          alt={a.name}
          fallback={<span className="text-[10px] font-extrabold">{a.name.slice(0, 2).toUpperCase()}</span>}
        />
        {tier === 4 && <span className="mc-ring rounded-full" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold truncate">{a.name}</div>
        <div className="flex items-center gap-1 text-[9px] text-slate-400">
          <span className="font-extrabold text-slate-300">{a.position}</span>
          <Icon name={info.icon} className="w-2.5 h-2.5" style={{ color: info.color }} />
        </div>
        {assist && (
          <div className="text-[9px] text-sky-300/90 truncate">asist. {assist.name}</div>
        )}
      </div>
      {minute != null && (
        <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-extrabold tabular-nums text-slate-300">
          <Pic name="ball" className="w-3 h-3" />{minute}′
        </span>
      )}
      {mvp && <Icon name="star" className="w-4 h-4 shrink-0 text-amber-300" />}
    </div>
  )
}
