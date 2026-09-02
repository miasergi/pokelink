// Retransmisión del partido: marcador, narración jugada a jugada y el panel de
// decisión cuando el motor se para a preguntarte.
//
// La UI NO calcula nada: solo pinta los `MatchEvent` que emite el motor y manda
// de vuelta el id de la opción elegida. Mismo reparto de responsabilidades que
// `BattleScreen` en el roguelike Pokémon.
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { useSettings } from '@/state/settingsStore'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import Odds from '@/ui/inazuma/Odds'
import LivePitch from '@/ui/inazuma/LivePitch'
import ChesterTV from '@/ui/inazuma/ChesterTV'
import DuelStage, { type StageData } from '@/ui/inazuma/DuelStage'
import GoalOverlay from '@/ui/inazuma/GoalOverlay'
import HalftimePanel from '@/ui/inazuma/HalftimePanel'
import { InjuryBanner } from '@/ui/inazuma/InjuryOverlay'
import { PenaltyScene, ShootoutBoard, type PenaltyFx } from '@/ui/inazuma/ShootoutScene'
import { Crest, KindIcon, rarityBorder, SvgBall } from '@/ui/inazuma/Glyphs'
import { teamDisplay } from '@/data/inazuma/teams'
import { getTactic } from '@/data/inazuma/tactics'
import { actorByUid, playerSide, sideOf, otherSide } from '@/engine/inazuma/match'
import { Meter, portraitUrl, staminaColor } from '@/ui/inazuma/PlayerCard'
import { ImgFallback } from '@/ui/components/kit'
import type { Actor, ChainStep, Element, MatchEvent, MatchState, Technique } from '@/engine/inazuma/types'

export default function MatchView() {
  const {
    match, feed, playing, speed, autoPlay, save, matchNode, clock,
    halftimeSubsSummary, clearHalftimeSubsSummary, halftimeBreak,
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
  // CINEMÁTICA de filosofía encendida: fogonazo con su icono y su nombre.
  const [tacticFx, setTacticFx] = useState<{ key: number; id: string; name: string; mine: boolean } | null>(null)
  // ¡LESIÓN!: overlay grande con el retrato y la cruz — se retira solo.
  const [injuryFx, setInjuryFx] = useState<{ key: number; name: string; baseId?: string } | null>(null)
  // PENALTI en carrerilla: la escena de lanzador contra portero (sin
  // desenlace); la retira el evento del veredicto.
  const [penaltyFx, setPenaltyFx] = useState<PenaltyFx | null>(null)
  useEffect(() => {
    if (!injuryFx) return
    const t = setTimeout(() => setInjuryFx(null), 2000)
    return () => clearTimeout(t)
  }, [injuryFx])
  useEffect(() => {
    if (!tacticFx) return
    const t = setTimeout(() => setTacticFx(null), 1700)
    return () => clearTimeout(t)
  }, [tacticFx])
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 1350)
    return () => clearTimeout(t)
  }, [flash])
  const clearGol = useCallback(() => setGol(null), [])
  const clearStage = useCallback(() => { setStage(null); setShotFlight(null) }, [])
  // DISPARO EN VUELO: la cinemática avisa y el CÉSPED pinta el balón ardiendo
  // camino de la portería (antes viajaba dentro de la propia cinemática).
  const [shotFlight, setShotFlight] = useState<
    { key: number; element?: Element; mine: boolean; landed?: boolean; toUid?: string } | null
  >(null)
  const stageRef = useRef<StageData | null>(null)
  stageRef.current = stage
  const onFlight = useCallback((active: boolean) => {
    const st = stageRef.current
    // Al terminar el vuelo el balón NO desaparece: se queda EN LA PORTERÍA
    // mientras se resuelve la parada. Antes volvía de golpe a los pies del que
    // había disparado, que era justo lo que se veía raro.
    if (active) setShotFlight(st ? { key: st.key, element: st.element, mine: st.attackerMine, toUid: st.toUid } : null)
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
    // El MISMO factor que usa el ticker para encoger los holds: los tiempos
    // del vuelo tienen que encoger igual o el balón y el portero se desfasan.
    const f = speed >= 1000 ? 1 : speed >= 400 ? 0.6 : 0.42
    if (last.kind === 'goal') {
      // La celebración entra YA: el momento del portero fue el evento
      // anterior (keeperTry) — retrasarla solo dejaba ver el campo
      // recolocándose al centro por debajo.
      const isMine = last.side === mine
      setShotFlight(null)
      setGol({ scorer: last.scorer, mine: isMine, key: feed.length, teamId: crestOf(isMine) })
    } else if (last.kind === 'keeperTry') {
      // EL MOMENTO DEL PORTERO: el balón se queda EN LA PORTERÍA durante todo
      // el momento (con el vuelo aún vivo, el rondo no arranca y el campo no
      // se mueve). Lo recoge el veredicto: la parada al segundo, el gol al
      // instante bajo su celebración.
    } else if (last.kind === 'penaltyKick') {
      // LA CARRERILLA: escena de lanzador contra portero, SIN desenlace (la
      // cinemática vieja lo enseñaba todo de golpe — puro spoiler). El
      // veredicto llega en su propio evento y la retira.
      setPenaltyFx({
        key: feed.length,
        round: last.round,
        mine: last.side === mine,
        shooter: { name: last.shooter, baseId: actorByUid(match, last.shooterUid)?.baseId },
        keeper: { name: last.keeper, baseId: actorByUid(match, last.keeperUid)?.baseId },
        tech: last.technique,
        power: last.power,
      })
    } else if (last.kind === 'penalty') {
      // EL VEREDICTO: fuera la escena, y al momento la celebración (gol) o el
      // rótulo del paradón. Sin retardos artificiales: este evento ES la
      // revelación.
      setPenaltyFx(null)
      const isMine = last.side === mine
      if (last.scored) {
        setGol({ scorer: last.shooter, mine: isMine, key: feed.length, teamId: crestOf(isMine) })
      } else {
        setFlash({
          key: feed.length,
          text: `¡PARADA DE ${last.keeper.split(' ')[0].toUpperCase()}!`,
          color: isMine ? '#f87171' : '#34d399',
        })
      }
    } else if (last.kind === 'injury') {
      // ¡LESIÓN! Overlay grande con retrato y cruz (el flash pasaba
      // desapercibido) — y el césped lo saca a la banda.
      setInjuryFx({ key: feed.length, name: last.player, baseId: actorByUid(match, last.playerUid)?.baseId })
    } else if (last.kind === 'tactic') {
      // Filosofía ENCENDIDA: su cinemática de activación.
      setTacticFx({ key: feed.length, id: last.tactic, name: last.name, mine: last.side === mine })
    } else if (last.kind === 'duel' && last.intercept) {
      // EL CRUCE de un defensa en la trayectoria: SIN pantallas. El balón vuela
      // por el césped HASTA ÉL y su bloqueo brota ahí mismo (LivePitch pinta el
      // FX de la técnica anclado al jugador).
      const key = feed.length
      setShotFlight({ key, element: last.element, mine: last.side === mine, toUid: last.defenderUid })
      setTimeout(() => setShotFlight((fl) => (fl && fl.key === key ? { ...fl, landed: true } : fl)), Math.round(1000 * f))
      // Solo si el BLOQUEO triunfa se recoge el balón aquí: con el tiro
      // ROZADO el vuelo se queda vivo hasta que el mano a mano lo continúa —
      // recogerlo hacía que el balón volviera a los pies del tirador y la
      // cinemática del césped «se repitiera».
      if (!last.success) {
        setTimeout(() => setShotFlight((fl) => (fl && fl.key === key ? null : fl)), Math.round(2300 * f))
      }
    } else if (last.kind === 'duel' && last.step === 'definicion') {
      // DISPARO sin pantalla grande: la supertécnica brota sobre el tirador EN
      // EL CÉSPED (LivePitch) y el balón sale ardiendo hacia la portería. La
      // parada o el gol llegan como siguiente evento, también sobre el césped.
      const key = feed.length
      const prev = feed[feed.length - 2]
      const grazed = prev?.kind === 'duel' && prev.intercept === true && prev.success
      if (grazed) {
        // El tiro ROZÓ al que se cruzó: el balón CONTINÚA desde el bloqueador
        // hacia la portería, sin volver a cargar desde el tirador.
        setShotFlight({ key, element: last.element, mine: last.side === mine })
        setTimeout(() => setShotFlight((fl) => (fl && fl.key === key ? { ...fl, landed: true } : fl)), Math.round(1400 * f))
      } else {
        // La técnica CARGA (se materializa en el césped) antes de que el balón
        // salga; el vuelo dura lo suyo y el portero NO responde hasta que llega.
        setTimeout(() => setShotFlight((fl) => (fl?.key === key ? fl : { key, element: last.element, mine: last.side === mine })), Math.round(1600 * f))
        setTimeout(() => setShotFlight((fl) => (fl && fl.key === key ? { ...fl, landed: true } : fl)), Math.round(3300 * f))
      }
    } else if (last.kind === 'save') {
      // La parada: el FX del portero sale anclado a él en el césped; el balón
      // deja de verse en la portería en cuanto la parada «cuenta». Y se CANTA
      // — sin el rótulo no quedaba claro si aquello había entrado o no.
      setTimeout(() => setShotFlight(null), Math.round(1000 * f))
      const keeperMine = last.side === mine
      const first = last.keeper.split(' ')[0].toUpperCase()
      setTimeout(() => setFlash({
        key: feed.length,
        text: `¡PARADA DE ${first}!`,
        color: keeperMine ? '#34d399' : '#f87171',
      }), Math.round(1100 * f))
    } else if (last.kind === 'turnover' || last.kind === 'possession') {
      // Continuidad: si quedara un balón de disparo pintado, se recoge.
      setShotFlight(null)
    } else if (last.kind === 'duel') {
      // Duelo de campo (regate contra bloqueo). CON supertécnica, el FX brota
      // sobre cada jugador en el propio césped (LivePitch); SIN técnica, un
      // flash y la CHISPA del choque. El partido no se tapa nunca.
      const winnerMine = (last.side === mine) === last.success
      const winnerFirst = (last.success ? last.attacker : last.defender).split(' ')[0].toUpperCase()
      const label = last.success ? `¡REGATE DE ${winnerFirst}!` : `¡CORTE DE ${winnerFirst}!`
      if (!last.technique && !last.counter) {
        setFlash({ key: feed.length, text: label, color: winnerMine ? '#34d399' : '#f87171' })
      } else {
        // Con técnica, el rótulo espera a que las técnicas se materialicen y
        // llegue el VEREDICTO (destello del ganador, apagón del perdedor).
        setTimeout(() => setFlash({ key: feed.length, text: label, color: winnerMine ? '#34d399' : '#f87171' }), Math.round(800 * f))
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

      {/* CAMBIOS DEL DESCANSO, a la vista ANTES de reanudar: los tuyos y los
          del rival. La narración sola pasaba desapercibida. */}
      {halftimeSubsSummary && (
        <div className="absolute inset-0 z-[75] bg-black/75 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4 animate-pop-in">
            <div className="text-center text-[10px] uppercase tracking-widest text-slate-500">Descanso</div>
            <div className="text-center font-extrabold text-lg mb-3">Cambios de la segunda parte</div>
            <div className="flex flex-col gap-1.5 mb-4">
              {halftimeSubsSummary.map((c, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${
                    c.mine ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'
                  }`}
                >
                  {/* ENTRA: retrato con su rareza, nombre y nivel. */}
                  <div
                    className="relative w-11 h-11 shrink-0 rounded-full overflow-hidden border-2 grid place-items-center bg-slate-900"
                    style={{ borderColor: (c.inRarity ?? 1) === 4 ? 'transparent' : rarityBorder(c.inRarity ?? 1) }}
                  >
                    <ImgFallback
                      src={c.inBaseId ? portraitUrl(c.inBaseId) : ''}
                      className="w-full h-full object-cover object-top"
                      alt={c.inName}
                      fallback={<span className="text-[10px] font-extrabold">{c.inName.slice(0, 2).toUpperCase()}</span>}
                    />
                    {(c.inRarity ?? 1) === 4 && <span className="mc-ring rounded-full" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] uppercase tracking-widest font-extrabold text-emerald-300">Entra</div>
                    <div className="text-[13px] font-bold truncate">
                      {c.inName}
                      {c.inLevel != null && <span className="ml-1 text-[10px] text-slate-400">Nv.{c.inLevel}</span>}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{c.teamName}</div>
                  </div>
                  {/* SALE: retrato apagado. */}
                  <div className="text-right">
                    <div className="text-[9px] uppercase tracking-widest font-extrabold text-rose-300/90">Sale</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[88px]">{c.outName}</div>
                  </div>
                  <div className="relative w-8 h-8 shrink-0 rounded-full overflow-hidden border border-slate-700 grid place-items-center bg-slate-900 opacity-60 grayscale">
                    <ImgFallback
                      src={c.outBaseId ? portraitUrl(c.outBaseId) : ''}
                      className="w-full h-full object-cover object-top"
                      alt={c.outName}
                      fallback={<span className="text-[9px] font-extrabold">{c.outName.slice(0, 2).toUpperCase()}</span>}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button variant="primary" full onClick={clearHalftimeSubsSummary}>¡Segunda parte!</Button>
          </div>
        </div>
      )}
      <HalftimePanel />
      {/* LA TELE: Chester Horse comenta el partido desde su cabina, con la
          imagen de cada supertécnica cuando salta una. Sustituye al ticker. */}
      {!finished && <ChesterTV feed={shownFeed} clock={clock} />}
      <Scoreboard
        match={match}
        feed={feed}
        myTeamId={teamDisplay(save ?? {}).crestId}
        rivalTeamId={matchNode?.kind === 'jefe' || matchNode?.kind === 'final' ? matchNode?.teamId : undefined}
        frozen={frozen}
        clock={clock}
      />
      {/* EL MARCADOR DE LA TANDA: un punto por lanzamiento (verde/rojo/hueco),
          construido solo con lo ya contado — se entiende de un vistazo por
          dónde va la tanda y a quién le toca. */}
      {match.stage === 'penaltis' && !finished && (
        <ShootoutBoard
          feed={shownFeed}
          match={match}
          myName={sideOf(match, playerSide(match)).name}
          theirName={sideOf(match, otherSide(playerSide(match))).name}
        />
      )}
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
              // El césped sigue VIVO mientras el partido corre. OJO: lo que
              // congela es el PANEL de decisión EN PANTALLA, no la fase del
              // motor — el motor entra en «decision» nada más generar la
              // siguiente jugada, o sea AL PRINCIPIO de la espera de varios
              // minutos… y con la condición vieja el rondo no corría nunca en
              // modo dinámico (por eso «seguía igual»).
              // …y tampoco durante el DESCANSO ni con el panel de cambios:
              // el balón no rueda mientras los equipos están en el vestuario.
              // Y SOLO con el feed AL DÍA: con eventos aún por revelar, el
              // rondo se colaba entre dos duelos de la misma jugada y el balón
              // «iba hacia atrás y hacia adelante» sin que nadie lo tocara.
              flowing={caughtUp && !(match.phase === 'decision' && !frozen) && stage === null && gol === null
                && !halftimeBreak && !halftimeSubsSummary}
            />
            {/* FILOSOFÍA ENCENDIDA: el fogonazo de activación. */}
            {tacticFx && (() => {
              const t = getTactic(tacticFx.id)
              if (!t) return null
              return (
                <div key={tacticFx.key} className="absolute inset-0 z-[45] grid place-items-center pointer-events-none">
                  <div className="absolute inset-0 animate-inazuma-flash" style={{ background: `radial-gradient(circle, ${t.color}55, transparent 70%)` }} />
                  <div className="animate-cutin flex flex-col items-center gap-2">
                    <span
                      className="grid place-items-center w-20 h-20 rounded-3xl border-4 animate-flame-flicker"
                      style={{ borderColor: t.color, background: `${t.color}22`, boxShadow: `0 0 40px ${t.color}aa` }}
                    >
                      <Icon name={t.icon} className="w-11 h-11" style={{ color: t.color }} />
                    </span>
                    <span
                      className="px-4 py-1 rounded-2xl bg-slate-950/90 border-2 text-xl font-black uppercase tracking-wider"
                      style={{ color: t.color, borderColor: t.color, textShadow: `0 0 16px ${t.color}` }}
                    >
                      ¡{t.name}!
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-300">
                      {tacticFx.mine ? 'táctica especial encendida' : 'el rival la enciende'}
                    </span>
                  </div>
                </div>
              )
            })()}

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

      {/* ¡GOL! La celebración para el partido un instante: sin ella, el gol
          pasaba tan deprisa como un regate cualquiera. */}
      {/* ¡LESIÓN!: el retrato con su cruz, en grande — se retira solo. */}
      {injuryFx && <InjuryBanner key={injuryFx.key} name={injuryFx.name} baseId={injuryFx.baseId} />}

      {/* PENALTI: la carrerilla, cara a cara y sin desenlace. */}
      {penaltyFx && <PenaltyScene fx={penaltyFx} />}

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
      {match.phase === 'decision' && match.decision && caughtUp && !frozen && !autoPlay ? (
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

function TacticsSheet({ mine, theirs, mineName, theirName, onClose }: {
  mine: string[]
  theirs: string[]
  mineName: string
  theirName: string
  onClose: () => void
}) {
  const bloque = (ids: string[], nombre: string, propias: boolean) => !ids.length ? null : (
    <div className="mb-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
        {propias ? `Tu equipo · ${nombre}` : `Rival · ${nombre}`}
      </div>
      <div className="flex flex-col gap-1.5">
        {ids.map((id) => {
          const t = getTactic(id)
          if (!t) return null
          return (
            <div key={id} className="flex items-start gap-2.5 rounded-xl border px-2.5 py-2"
              style={{ borderColor: `${t.color}55`, background: `${t.color}0d` }}>
              <span className="grid place-items-center w-8 h-8 shrink-0 rounded-lg border" style={{ borderColor: `${t.color}88`, background: `${t.color}1a` }}>
                <Icon name={t.icon} className="w-4.5 h-4.5" style={{ color: t.color }} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-extrabold" style={{ color: t.color }}>{t.name}</span>
                <span className="block text-[11px] text-slate-300 leading-snug">{t.desc}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
  // POR PORTAL: la cabecera del marcador tiene blur y stacking propio, y la
  // hoja se quedaba atrapada dentro — ilegible, tapando el marcador y sin
  // manera fiable de cerrarla.
  return createPortal(
    <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4 max-h-[80svh] overflow-y-auto animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 grid place-items-center w-8 h-8 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 active:scale-95"
        >
          <Icon name="x" className="w-4.5 h-4.5" />
        </button>
        <div className="text-center font-extrabold text-lg mb-1">Tácticas especiales en juego</div>
        <p className="text-[11px] text-slate-400 text-center mb-3 leading-snug">
          Se ENCIENDEN con su barra llena y cambian CÓMO se resuelve el partido
          durante unas acciones. La armada se elige en el vestuario.
        </p>
        {bloque(mine, mineName, true)}
        {bloque(theirs, theirName, false)}
        <Button variant="primary" full onClick={onClose}>Cerrar</Button>
      </div>
    </div>,
    document.body,
  )
}

function Scoreboard({ match, feed, myTeamId, rivalTeamId, frozen, clock }: {
  match: MatchState
  feed: MatchEvent[]
  myTeamId?: string
  rivalTeamId?: string
  frozen?: boolean
  /** Cronómetro del partido (minutos): corre a 1 por segundo real. */
  clock: number
}) {
  const mineSide = playerSide(match)
  const mine = sideOf(match, mineSide)
  const theirs = sideOf(match, otherSide(mineSide))
  const [showTactics, setShowTactics] = useState(false)

  // La Ruptura sube al GANAR un duelo: si la barra se moviera durante la
  // animación, contaría el desenlace antes de tiempo. Congelada mientras haya
  // escenario o celebración en pantalla.
  const burstRef = useRef<{
    mine: number; theirs: number; mineTurns: number; theirsTurns: number
    mineTactic: { id: string; turns: number } | null
    theirsTactic: { id: string; turns: number } | null
  }>({ mine: 0, theirs: 0, mineTurns: 0, theirsTurns: 0, mineTactic: null, theirsTactic: null })
  if (!frozen) {
    burstRef.current = {
      mine: mine.burst, theirs: theirs.burst,
      mineTurns: mine.burstTurns, theirsTurns: theirs.burstTurns,
      mineTactic: mine.tacticActive ?? null, theirsTactic: theirs.tacticActive ?? null,
    }
  }
  const burst = burstRef.current

  // EL CRONÓMETRO manda: corre a un minuto por segundo real y se para en las
  // cinemáticas. Se respeta el suelo de lo ya revelado por si el reloj se
  // quedara corto (simulación instantánea, saltos de tramo…).
  let revealed = 0
  for (const e of feed) if ('minute' in e && e.minute > revealed) revealed = e.minute
  const minute = Math.max(Math.floor(clock), revealed)

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

  // LOS GOLEADORES, de lo revelado: cada gol con su autor y su minuto, bajo
  // el equipo que lo marcó — el marcador cuenta el partido, no solo el número.
  const myScorers: { scorer: string; minute: number }[] = []
  const theirScorers: { scorer: string; minute: number }[] = []
  for (const e of feed) {
    if (e.kind !== 'goal') continue
    ;(e.side === mineSide ? myScorers : theirScorers).push({ scorer: e.scorer, minute: e.minute })
  }

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
      {/* Goleador y minuto bajo su equipo (los tuyos a la izquierda, los del
          rival a la derecha), como en el croquis del marcador de la tele. */}
      {(myScorers.length > 0 || theirScorers.length > 0) && (
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {myScorers.map((g, i) => (
              <div key={i} className="flex items-center gap-1 text-[9px] text-slate-300 leading-tight">
                <SvgBall className="w-2.5 h-2.5 shrink-0 opacity-80" />
                <span className="truncate font-bold">{g.scorer}</span>
                <span className="tabular-nums text-slate-500 shrink-0">{g.minute}′</span>
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            {theirScorers.map((g, i) => (
              <div key={i} className="flex flex-row-reverse items-center gap-1 text-[9px] text-slate-400 leading-tight">
                <SvgBall className="w-2.5 h-2.5 shrink-0 opacity-60" />
                <span className="truncate font-bold">{g.scorer}</span>
                <span className="tabular-nums text-slate-500 shrink-0">{g.minute}′</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* LAS FILOSOFÍAS de los DOS equipos: la tuya acumulada y la canónica
          del rival. TOCAR la fila abre la hoja que explica qué hace cada una
          (el `title` del ratón no existe en el móvil y nadie sabía qué eran). */}
      {(!!(mine.tactics ?? []).length || !!(theirs.tactics ?? []).length) && (
        <button
          onClick={() => setShowTactics(true)}
          className="mt-1.5 w-full flex items-center justify-center gap-1 flex-wrap active:scale-[0.99] transition"
        >
          {(mine.tactics ?? []).map((id) => {
            const t = getTactic(id)
            if (!t) return null
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide"
                style={{ borderColor: `${t.color}88`, background: `${t.color}1a`, color: t.color }}
              >
                <Icon name={t.icon} className="w-2.5 h-2.5" />
                {t.name}
              </span>
            )
          })}
          {!!(theirs.tactics ?? []).length && (
            <span className="inline-flex items-center gap-1">
              <span className="text-[8px] uppercase tracking-widest text-slate-600">vs</span>
              {(theirs.tactics ?? []).map((id) => {
                const t = getTactic(id)
                if (!t) return null
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-600/70 bg-slate-800/60 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-400"
                  >
                    <Icon name={t.icon} className="w-2.5 h-2.5" />
                    {t.name}
                  </span>
                )
              })}
            </span>
          )}
          <Icon name="question" className="w-3 h-3 text-slate-600" />
        </button>
      )}

      {showTactics && (
        <TacticsSheet
          mine={mine.tactics ?? []}
          theirs={theirs.tactics ?? []}
          mineName={mine.name}
          theirName={theirs.name}
          onClose={() => setShowTactics(false)}
        />
      )}

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
      {/* Barras de Ruptura, CADA UNA EN SU LADO con su propio rótulo (del
          croquis del playtest): la tuya a la izquierda y la del rival a la
          derecha, cada una contando su estado — el rótulo único del centro
          mezclaba a los dos equipos y no se sabía de quién hablaba. */}
      <div className="mt-1.5 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <BurstBar value={burst.mine} turns={burst.mineTurns} tactic={burst.mineTactic} color="#f59e0b" />
          <div className={`mt-0.5 text-[8px] uppercase tracking-wider truncate ${
            burst.mineTactic || burst.mineTurns > 0 || burst.mine >= 100
              ? 'text-amber-300 font-extrabold animate-pulse' : 'text-slate-600'
          }`}>
            {burst.mineTactic
              ? <><Icon name="flame" className="inline w-3 h-3 -mt-0.5 mr-0.5 text-orange-400" />{`${getTactic(burst.mineTactic.id)?.name ?? 'Táctica'} · ${burst.mineTactic.turns}`}</>
              : burst.mineTurns > 0
                ? `¡Supervibración! quedan ${burst.mineTurns}`
                // LLENA: se dice claro qué toca hacer — era el gran «¿y esto
                // para qué sirve?» del playtest.
                : burst.mine >= 100
                  ? '¡LISTA! Actívala en tu próxima jugada'
                  : 'Táctica especial'}
          </div>
        </div>
        <div className="flex-1 min-w-0 text-right">
          <BurstBar value={burst.theirs} turns={burst.theirsTurns} tactic={burst.theirsTactic} color="#64748b" flip />
          <div className={`mt-0.5 text-[8px] uppercase tracking-wider truncate ${
            burst.theirsTactic || burst.theirsTurns > 0 ? 'text-orange-300 font-extrabold animate-pulse' : 'text-slate-600'
          }`}>
            {burst.theirsTactic
              ? <>{`${getTactic(burst.theirsTactic.id)?.name ?? 'Filosofía'} · ${burst.theirsTactic.turns}`}<Icon name="flame" className="inline w-3 h-3 -mt-0.5 ml-0.5 text-orange-400" /></>
              : burst.theirsTurns > 0
                ? `Vibrando · quedan ${burst.theirsTurns}`
                : burst.theirs >= 100
                  ? 'Rival a punto de encenderla'
                  : 'Táctica del rival'}
          </div>
        </div>
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

function BurstBar({ value, turns, tactic, color, flip }: {
  value: number
  turns: number
  /** Filosofía ENCENDIDA: la barra arde mientras se consume. */
  tactic?: { id: string; turns: number } | null
  color: string
  flip?: boolean
}) {
  const active = turns > 0
  const fire = !!tactic
  // Ardiendo, la barra se VACÍA con los usos que quedan: se ve consumirse.
  const width = fire ? (tactic!.turns / 7) * 100 : active ? 100 : value
  // LLENA y sin gastar: parpadea — en tu siguiente jugada clave saldrán los
  // botones para quemarla (Supervibración o tu Filosofía). Antes no había
  // ninguna señal y la barra «no se entendía».
  const ready = !active && !fire && value >= 100
  return (
    <div className={`flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden ${flip ? 'rotate-180' : ''}`}>
      <div
        className={`h-full rounded-full transition-all ${active || fire || ready ? 'animate-flame-flicker' : ''}`}
        style={{
          width: `${width}%`,
          background: fire
            ? 'linear-gradient(90deg, #f97316, #ef4444, #fbbf24)'
            : active || ready ? '#fbbf24' : color,
        }}
      />
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
  // Los TIROS no cuentan el cruce de un defensa: ese lance es un bloqueo, no
  // un disparo a puerta más.
  const [tA, tB] = count((e, m) => e.kind === 'duel' && e.step === 'definicion' && !e.intercept && isMine(e, m))
  // BLOQUEOS: disparos cortados por un defensa que se cruza en la trayectoria.
  // Se apuntan al equipo que DEFIENDE, que es quien los hace.
  const [bA, bB] = count((e, m) => e.kind === 'duel' && !!e.intercept && !e.success && isMine(e, !m))
  const [sA, sB] = count((e, m) => e.kind === 'save' && isMine(e, m))
  const [dA, dB] = count((e, m) => e.kind === 'duel' && (e.success ? isMine(e, m) : isMine(e, !m)))
  const [pA, pB] = count((e, m) => e.kind === 'possession' && isMine(e, m))
  const [qA, qB] = count((e, m) => e.kind === 'duel' && ((m && isMine(e, true) && !!e.technique)
    || (m && isMine(e, false) && !!e.counter)
    || (!m && isMine(e, false) && !!e.technique)
    || (!m && isMine(e, true) && !!e.counter)))
  rows.push({ label: 'Tiros', a: tA, b: tB })
  rows.push({ label: 'Paradas', a: sA, b: sB })
  rows.push({ label: 'Disparos bloqueados', a: bA, b: bB })
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
          <SvgBall className="w-3 h-3" />{minute}′
        </span>
      )}
      {mvp && <Icon name="star" className="w-4 h-4 shrink-0 text-amber-300" />}
    </div>
  )
}
