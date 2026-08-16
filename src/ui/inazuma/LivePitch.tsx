// EL PARTIDO EN VIVO: el césped COMPLETO con los 22 jugadores y el balón
// moviéndose con coherencia. Sustituye al mini-campo + narración como cuerpo
// del partido: la retransmisión se VE en el campo (el que lleva el balón
// avanza por eslabones, su marcador le sale al paso, el equipo que ataca se
// vuelca y el que defiende repliega) y las cinemáticas de duelo saltan encima
// en los momentos de verdad.
//
// REGLA DE ORO heredada del mini-campo: todo se deriva del feed REVELADO (o
// del emparejamiento de la decisión/cinemática en curso), nunca del estado
// vivo del motor — leerlo destriparía jugadas aún no contadas.
import { useEffect, useRef, useState } from 'react'
import { actorByUid, playerSide, sideOf, otherSide } from '@/engine/inazuma/match'
import { TEAM_BY_ID } from '@/data/inazuma/teams'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { ELEMENT_ICON, Pic, rarityBorder } from '@/ui/inazuma/Glyphs'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import type { Actor, ChainStep, Element, MatchEvent, MatchState } from '@/engine/inazuma/types'

/** Color de las LLAMAS del disparo: el de su elemento (o blanco si va a pelo). */
function flameOf(el: Element | undefined): string {
  return el ? ELEMENT_INFO[el].color : '#e2e8f0'
}

/**
 * Cuánto dura el AVANCE continuo de una jugada (ms). Es el tiempo en el que el
 * balón recorre su zona y el bloque acompaña, antes de quedarse esperando al
 * siguiente evento.
 */
const PHASE_MS = 2600

/** Metros (en % de ancho) que el balón recorre DENTRO de su eslabón. */
const ZONE_RUN = 7

/** Avance del balón (en % de ancho) por eslabón, atacando hacia la DERECHA. */
const STEP_X: Record<ChainStep, number> = { construccion: 38, penetracion: 60, definicion: 82 }

const STEP_ZONE: Record<ChainStep, string> = {
  construccion: 'Salida de balón',
  penetracion: 'Tres cuartos',
  definicion: 'Área',
}

interface Spot { x: number; y: number }

/** Anclas de formación de un equipo: portero + 3 líneas, repartidas en su mitad. */
function anchors(keeper: Actor, defs: Actor[], mids: Actor[], fwds: Actor[], attackRight: boolean): Map<string, Spot> {
  const out = new Map<string, Spot>()
  const X = attackRight ? { por: 7, def: 22, med: 38, del: 51 } : { por: 93, def: 78, med: 62, del: 49 }
  const place = (row: Actor[], x: number) => {
    // Escalonado alterno: sin él, las líneas de 4-5 jugadores quedaban en una
    // columna perfecta y las fichas vecinas se solapaban.
    row.forEach((a, i) => out.set(a.uid, {
      x: x + (i % 2 ? 3 : -3) * (attackRight ? 1 : -1),
      y: ((i + 1) / (row.length + 1)) * 84 + 8,
    }))
  }
  out.set(keeper.uid, { x: X.por, y: 50 })
  place(defs, X.def)
  place(mids, X.med)
  place(fwds, X.del)
  return out
}

export default function LivePitch({ match, feed, current, myCrest, theirCrest, flight }: {
  match: MatchState
  feed: MatchEvent[]
  /**
   * DISPARO EN VUELO: el balón sale de los pies del que tira y viaja a la
   * portería contraria envuelto en llamas del color de su elemento. Lo activa
   * la cinemática del tiro entre la supertécnica y la parada.
   */
  flight?: { key: number; element?: Element; mine: boolean } | null
  /** Emparejamiento en pantalla (decisión o cinemática), si lo hay. */
  current?: { attackerUid: string; defenderUid: string; step: ChainStep; side: 'home' | 'away' } | null
  /** Escudos: van de FONDO en la ficha de cada jugador (en vez del color). */
  myCrest?: string
  theirCrest?: string
}) {
  const mine = playerSide(match)
  const home = sideOf(match, mine)
  const away = sideOf(match, otherSide(mine))
  const myActors = [home.keeper, ...home.defs, ...home.mids, ...home.fwds]
  const theirActors = [away.keeper, ...away.defs, ...away.mids, ...away.fwds]

  // EL PARTIDO NO VA POR TURNOS. Antes las posiciones solo cambiaban cuando
  // llegaba un evento: todo el mundo quieto, y de golpe un salto de todos a la
  // vez. Ahora corre un RELOJ propio (~14 fps) y la jugada AVANZA sola entre
  // eventos: el balón progresa por su zona y el bloque acompaña, así que el
  // movimiento es continuo y va SIEMPRE en la dirección que cuenta la jugada.
  const [now, setNow] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setNow((n) => n + 1), 70)
    return () => clearInterval(t)
  }, [])

  // El último DUELO revelado manda sobre dónde está el balón; si DESPUÉS hay
  // un PASE revelado, el balón vuela a los pies del receptor (sin cinemática:
  // el vuelo se ve aquí). Un gol o un saque cierran la jugada.
  let duel: { attackerUid: string; defenderUid: string; step: ChainStep; side: 'home' | 'away'; success?: boolean } | null = null
  let passTo: string | null = null
  for (let i = feed.length - 1; i >= 0; i--) {
    const e = feed[i]
    if (e.kind === 'duel') { duel = e; break }
    if (e.kind === 'possession' && e.passToUid && !passTo) { passTo = e.passToUid; continue }
    if (e.kind === 'goal' || e.kind === 'kickoff') break
  }
  const shown = current ?? duel

  // Con pase posterior al duelo (y sin decisión/cinemática encima), el balón
  // lo tiene el RECEPTOR en el mismo eslabón.
  const carrierUid = !current && passTo ? passTo : shown?.attackerUid ?? null
  const markerUid = shown?.defenderUid ?? null
  const step: ChainStep | null = shown?.step ?? null
  const atkSide = shown?.side ?? null
  const iAttack = atkSide === mine

  const myAnchor = anchors(home.keeper, home.defs, home.mids, home.fwds, true)
  const theirAnchor = anchors(away.keeper, away.defs, away.mids, away.fwds, false)

  // PROGRESO DE LA JUGADA: 0 al revelarse el evento, 1 unos segundos después.
  // Es el motor del movimiento continuo — sin él, entre evento y evento el
  // campo se queda congelado y parece un juego por turnos.
  const startedAt = useRef({ len: -1, t: 0 })
  if (startedAt.current.len !== feed.length) {
    startedAt.current = { len: feed.length, t: Date.now() }
  }
  const elapsed = Date.now() - startedAt.current.t
  // `now` solo está para forzar el re-render del reloj; el valor real es el
  // tiempo transcurrido.
  void now
  const ease = (t: number) => 1 - (1 - t) * (1 - t)
  const phase = elapsed / PHASE_MS
  const progress = ease(Math.max(0, Math.min(1, phase)))
  // Y CUANDO LA JUGADA YA HA AVANZADO no se congela todo: el equipo MANTIENE
  // la posesión mientras busca el hueco. `hold` es el tiempo que llevamos
  // esperando al siguiente evento (o a que decidas), y de él sale la
  // circulación del balón — que es lo que mantiene vivo el campo.
  const hold = Math.max(0, phase - 1)

  // El balón AVANZA dentro de su zona mientras dura la jugada (y retrocede un
  // pelín al empezar, que es como se gana un metro antes de atacar).
  const zone = step != null ? STEP_X[step] : 50
  const zoneFrom = step != null ? zone - ZONE_RUN : 50
  const zoneTo = step != null ? zone + ZONE_RUN : 50
  const rawBallX = zoneFrom + (zoneTo - zoneFrom) * progress
  const ballX = step == null ? 50 : iAttack ? rawBallX : 100 - rawBallX

  // LECTURA DE PARTIDO (de lo revelado): marcador y minuto. De aquí sale el
  // ÁNIMO táctico de cada equipo en el tramo final.
  let myGoals = 0
  let theirGoals = 0
  let minute = 0
  for (const e of feed) {
    if (e.kind === 'goal') { if (e.side === mine) myGoals++; else theirGoals++ }
    if ('minute' in e && e.minute > minute) minute = e.minute
  }
  // ÁNIMO: perdiendo del 65' en adelante, el equipo SE VUELCA (ataca con más
  // gente y ni repliega); ganando, echa el CANDADO (bloque bajo y toque).
  const moodOf = (isMine: boolean): 'urgente' | 'candado' | null => {
    if (minute < 65) return null
    const diff = isMine ? myGoals - theirGoals : theirGoals - myGoals
    return diff < 0 ? 'urgente' : diff > 0 ? 'candado' : null
  }
  const myMood = moodOf(true)
  const theirMood = moodOf(false)

  // PRESIÓN TRAS PÉRDIDA: si lo último contado es un robo, el equipo que
  // acaba de perder el balón se ECHA ENCIMA un latido (gegenpressing).
  const lastEv = feed[feed.length - 1]
  const pressSide = lastEv?.kind === 'turnover' ? lastEv.side : null

  // VUELCO POR LÍNEAS: el equipo que ataca EMPUJA (más cuanto más arriba
  // juega) y el que defiende REPLIEGA hacia su portería, cada línea en
  // bloque. Con el balón en el área, el empuje se acentúa; el ÁNIMO del
  // tramo final lo amplifica o lo encoge.
  const rowPush = (a: Actor, isMine: boolean): number => {
    if (atkSide == null || a.position === 'POR') return 0
    const dir = isMine ? 1 : -1
    const attacking = (atkSide === mine) === isMine
    const deep = step === 'definicion' ? 1.35 : 1
    const mood = isMine ? myMood : theirMood
    const atkBoost = mood === 'urgente' ? 1.5 : mood === 'candado' ? 0.6 : 1
    const defBoost = mood === 'urgente' ? 0.5 : mood === 'candado' ? 1.3 : 1
    const push = attacking
      ? (({ DEF: 4, MED: 7, DEL: 10 } as Record<string, number>)[a.position] ?? 0) * atkBoost
      : (({ DEF: -4, MED: -7, DEL: -9 } as Record<string, number>)[a.position] ?? 0) * defBoost
    // El bloque ACOMPAÑA a la jugada: arranca a media subida y termina de
    // meterse según avanza el balón. Antes el empuje era un valor fijo por
    // evento y todo el equipo daba un salto seco al revelarse cada duelo.
    return push * dir * deep * (0.55 + 0.45 * progress)
  }

  // APOYOS CON PROPÓSITO: los compañeros del portador más cercanos al balón
  // ACUDEN a dar línea de pase (TRES si el equipo va a la desesperada).
  const supportUids = new Set<string>()
  if (atkSide != null && carrierUid) {
    const atkTeamMine = atkSide === mine
    const atkMood = atkTeamMine ? myMood : theirMood
    const anchorOf = (a: Actor) => (atkTeamMine ? myAnchor : theirAnchor).get(a.uid) ?? { x: 50, y: 50 }
    ;(atkTeamMine ? myActors : theirActors)
      .filter((a) => a.uid !== carrierUid && a.uid !== markerUid && a.position !== 'POR')
      .map((a) => ({ a, d: Math.abs(anchorOf(a).x - ballX) + Math.abs(anchorOf(a).y - 50) * 0.6 }))
      .sort((x, y) => x.d - y.d)
      .slice(0, atkMood === 'urgente' ? 3 : 2)
      .forEach((x) => supportUids.add(x.a.uid))
  }

  // CIRCULACIÓN: el balón va rotando entre el que lo lleva y sus apoyos, un
  // toque cada ~1.1 s, mientras no haya cinemática ni decisión en pantalla.
  // Sin esto el campo se quedaba congelado entre evento y evento y el partido
  // parecía ir por turnos.
  const supportList = [...supportUids]
  const circulateTo = !current && supportList.length
    ? (() => {
      const slot = Math.floor(hold / 1.1) % (supportList.length + 1)
      return slot === 0 ? null : supportList[slot - 1]
    })()
    : null
  const ballHolderUid = circulateTo ?? carrierUid

  const clampX = (x: number) => Math.max(4, Math.min(96, x))
  const clampY = (y: number) => Math.max(7, Math.min(93, y))

  // CARRIL DEL BALÓN: la banda por la que va la jugada. Es la referencia de
  // la BASCULACIÓN — el bloque se desplaza hacia el balón, como en el fútbol
  // de verdad. Sustituye al onduleo aleatorio que había antes: cada
  // desplazamiento tiene ahora un porqué.
  const carrierAnchor = ballHolderUid
    ? (myAnchor.get(ballHolderUid) ?? theirAnchor.get(ballHolderUid))
    : undefined
  const ballLane = carrierAnchor ? carrierAnchor.y * 0.6 + 20 : 50

  // CAMBIO DE CAMPO tras el descanso, como en los partidos de verdad: toda la
  // geometría se calcula igual y se ESPEJA solo al pintar (jugadores, balón y
  // porterías) cuando el descanso ya se contó.
  const secondHalf = feed.some((e) => e.kind === 'halftime')
  // Cambiar de campo es GIRAR EL CAMPO 180°, no reflejarlo: si solo se espeja
  // la horizontal, el extremo izquierdo aparece de extremo derecho. Se espejan
  // las dos coordenadas.
  const mx = (x: number) => (secondHalf ? 100 - x : x)
  const my = (y: number) => (secondHalf ? 100 - y : y)

  /** Posición FINAL de un jugador este instante. */
  const spotOf = (a: Actor, isMine: boolean): Spot => {
    const base = (isMine ? myAnchor : theirAnchor).get(a.uid) ?? { x: 50, y: 50 }
    if (a.uid === carrierUid) {
      // El del balón, en el punto del eslabón, con un AMAGO por latido (el
      // regateador no se queda clavado). Los porteros no abandonan el área.
      if (a.position === 'POR') return base
      return { x: clampX(ballX), y: base.y * 0.6 + 20 }
    }
    if (a.uid === markerUid) {
      // Su marcador le sale al paso: entre el balón y SU portería, y le va
      // COMIENDO terreno según avanza la jugada (de ahí la sensación de
      // persecución en vez de dos fichas pegadas desde el primer fotograma).
      if (a.position === 'POR') return base
      const gap = 11 - 5 * progress
      return { x: clampX(ballX + (isMine ? -gap : gap)), y: base.y * 0.6 + 20 }
    }
    // El portero apenas se pasea por su área.
    if (a.position === 'POR') {
      // Se coloca en el palo por el que viene el balón: achica ángulo.
      return { x: base.x, y: Math.max(34, Math.min(66, 50 + (ballLane - 50) * 0.45)) }
    }
    // APOYO: acude hacia el balón, un paso por detrás, a dar línea de pase.
    if (supportUids.has(a.uid)) {
      // Va LLEGANDO a dar la línea de pase: sale de su sitio y acude, no
      // aparece ya colocado.
      const tx = ballX + (isMine ? -9 : 9)
      const ty = 50 + (base.y - 50) * 0.45
      return {
        x: clampX(base.x + (tx - base.x) * (0.45 + 0.55 * progress)),
        y: clampY(base.y + (ty - base.y) * (0.45 + 0.55 * progress)),
      }
    }
    // GEGENPRESSING: el equipo que acaba de perder el balón se echa encima
    // del punto de pérdida durante un latido — presión tras pérdida.
    if (pressSide != null && ((pressSide === mine) === isMine)) {
      return {
        x: clampX(base.x + (ballX - base.x) * 0.35),
        y: clampY(base.y + (ballLane - base.y) * 0.3),
      }
    }
    const isAtkTeam = atkSide != null && (atkSide === mine) === isMine
    // BANDAS Y BLOQUE: atacando, los de banda se ABREN hacia su banda;
    // defendiendo, el bloque se CIERRA hacia el centro (más aún con candado).
    const defMood = isMine ? myMood : theirMood
    const wing = atkSide == null
      ? 0
      : isAtkTeam
        ? (base.y < 30 ? -4 : base.y > 70 ? 4 : 0)
        : (base.y < 50 ? 3 : -3) * (defMood === 'candado' ? 1.5 : 1)
    // BASCULACIÓN: el bloque se desliza hacia el carril del balón. El que
    // defiende bascula MÁS (hay que taparle el camino) que el que ataca.
    const slide = atkSide == null ? 0 : (ballLane - base.y) * (isAtkTeam ? 0.12 : 0.26)
    return {
      x: clampX(base.x + rowPush(a, isMine)),
      y: clampY(base.y + wing + slide),
    }
  }

  // Punto del balón: en los pies del que lo lleva… y CIRCULANDO: cuando la
  // jugada ya ha avanzado y no hay decisión ni cinemática encima, el balón se
  // apoya un momento en un compañero y vuelve (el dame-y-ven de toda la vida:
  // el partido nunca se queda en seco esperando al siguiente evento).
  const ballCarrier = ballHolderUid ? actorByUid(match, ballHolderUid) : null
  const carrierSpot = ballCarrier
    ? spotOf(ballCarrier, myActors.some((a) => a.uid === ballCarrier.uid))
    : null
  const ball = carrierSpot
    ? { x: carrierSpot.x + (iAttack ? 2.5 : -2.5), y: carrierSpot.y + 5 }
    : { x: 50, y: 50 }

  const danger = step === 'definicion'

  return (
    <div className="relative flex-1 min-h-0 mx-2 my-1.5">
      <div
        className="absolute inset-0 rounded-2xl border border-emerald-900/70 overflow-hidden"
        style={{ background: 'repeating-linear-gradient(90deg, #14532d 0 9%, #166534 9% 18%)' }}
      >
        {/* líneas del campo */}
        <div className="absolute inset-2 border-2 border-white/20 rounded-sm" />
        <div className="absolute left-1/2 top-2 bottom-2 w-px bg-white/20" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20 w-[18%] aspect-square" />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 border-2 border-l-0 border-white/20 w-[13%] h-[44%]" />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 border-2 border-r-0 border-white/20 w-[13%] h-[44%]" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-[22%]" style={{ background: secondHalf ? away.color : home.color }} />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-[22%]" style={{ background: secondHalf ? home.color : away.color }} />

        {/* rótulo de zona */}
        <div className={`absolute top-1 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-950/60 ${
          danger ? (iAttack ? 'text-emerald-300 animate-pulse' : 'text-rose-300 animate-pulse') : 'text-white/75'
        }`}>
          {step == null
            ? 'Medio campo'
            : danger
              ? '¡OCASIÓN DE GOL!'
              : `${STEP_ZONE[step]} · ataca ${sideOf(match, atkSide!).name.replace('Instituto ', '')}`}
        </div>

        {/* El ÁNIMO del tramo final, dicho en voz alta: se entiende POR QUÉ
            el campo se inclina como se inclina. */}
        {(myMood || theirMood) && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-950/70 text-amber-200/90">
            {myMood === 'urgente'
              ? `¡${home.name.replace('Instituto ', '')} se vuelca a por el partido!`
              : myMood === 'candado'
                ? `${home.name.replace('Instituto ', '')} echa el candado`
                : theirMood === 'urgente'
                  ? `¡${away.name.replace('Instituto ', '')} se vuelca a por el partido!`
                  : `${away.name.replace('Instituto ', '')} echa el candado`}
          </div>
        )}

        {/* LOS 22: cada uno hacia su sitio con transición — el movimiento.
            El fondo del retrato lleva LOS COLORES DEL EQUIPO (el del escudo,
            en degradado tipo camiseta), con el escudo encima. */}
        {(() => {
          const jersey = (crest: string | undefined, fallback: string) => {
            // Los colores de la CAMISETA del equipo (Raimon amarillo/azul,
            // Royal verde/rojo…); sin kit definido, su color de escudo.
            const team = crest ? TEAM_BY_ID.get(crest) : undefined
            const [c1, c2] = team?.kit ?? [team?.color ?? fallback, 'rgba(15,23,42,0.55)']
            return `linear-gradient(135deg, ${c1} 0%, ${c1} 48%, ${c2} 100%)`
          }
          const mineBg = jersey(myCrest, home.color)
          const theirBg = jersey(theirCrest, away.color)
          return (
            <>
              {myActors.map((a) => {
                const s = spotOf(a, true)
                return (
                  <LiveDot key={a.uid} actor={a} spot={{ x: mx(s.x), y: my(s.y) }} teamColor={mineBg} crest={myCrest}
                    carrier={a.uid === carrierUid} marker={a.uid === markerUid} />
                )
              })}
              {theirActors.map((a) => {
                const s = spotOf(a, false)
                return (
                  <LiveDot key={a.uid} actor={a} spot={{ x: mx(s.x), y: my(s.y) }} teamColor={theirBg} crest={theirCrest}
                    carrier={a.uid === carrierUid} marker={a.uid === markerUid} />
                )
              })}
            </>
          )
        })()}

        {/* EL BALÓN, con su propia transición: los pases se ven volar. Y si
            hay DISPARO en vuelo, sale ardiendo hacia la portería rival. */}
        {flight ? (
          <ShotBall
            key={flight.key}
            from={{ x: mx(ball.x), y: my(ball.y) }}
            to={{ x: mx(flight.mine ? 95 : 5), y: 50 }}
            color={flameOf(flight.element)}
            mine={secondHalf ? !flight.mine : flight.mine}
          />
        ) : (
          <div
            className="absolute z-30 w-4 h-4 -ml-2 -mt-2 transition-all duration-700 ease-out pointer-events-none"
            style={{ left: `${mx(ball.x)}%`, top: `${my(ball.y)}%` }}
          >
            <Pic name="ball" className="w-4 h-4 drop-shadow animate-ball-bob" />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * EL DISPARO POR EL CÉSPED: el balón sale de los pies del tirador y viaja
 * hasta la portería contraria envuelto en llamas de su elemento.
 *
 * Se animan `left`/`top` (que SÍ son porcentajes del campo) en vez de un
 * `transform: translate(%)`: los porcentajes de `translate` van sobre el
 * tamaño del propio balón (16 px), así que el «viaje» eran cuatro píxeles y
 * parecía que la pelota se quedaba quieta con su color encima.
 */
function ShotBall({ from, to, color, mine }: {
  from: Spot
  to: Spot
  color: string
  /** Dirección del disparo: coloca la estela por detrás del balón. */
  mine: boolean
}) {
  // Primer fotograma en el ORIGEN y, al siguiente, al destino: así la
  // transición de CSS tiene de dónde salir (si se monta ya en el destino no
  // hay animación que valga).
  const [at, setAt] = useState(from)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAt(to)))
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div
      className="absolute z-30 w-4 h-4 -ml-2 -mt-2 pointer-events-none"
      style={{
        left: `${at.x}%`,
        top: `${at.y}%`,
        // El latigazo: sale rápido y llega frenando.
        transition: 'left 1.15s cubic-bezier(.16,.8,.36,1), top 1.15s cubic-bezier(.16,.8,.36,1)',
      }}
    >
      <span
        className="absolute -inset-3 rounded-full blur-[6px] animate-flame-flicker"
        style={{ background: `radial-gradient(circle, ${color}dd, ${color}55 55%, transparent 75%)` }}
      />
      {/* La estela va SIEMPRE por detrás, según hacia dónde se dispara. */}
      <span
        className="absolute top-1/2 -translate-y-1/2 h-3 w-14 blur-[4px]"
        style={{
          [mine ? 'right' : 'left']: '55%',
          background: `linear-gradient(${mine ? 'to left' : 'to right'}, ${color}dd, transparent)`,
        }}
      />
      <Pic name="ball" className="relative w-4 h-4 drop-shadow" />
    </div>
  )
}

/**
 * Un jugador sobre el césped, con TODO lo suyo encima:
 *  - fondo del retrato = color de su EQUIPO;
 *  - borde interior = RAREZA (anillo animado si es Legendario);
 *  - anillo exterior partido: mitad derecha AZUL = PT que le queda, mitad
 *    izquierda VERDE = aguante (se vacían de arriba abajo);
 *  - debajo, su elemento y su nombre.
 */
function LiveDot({ actor, spot, teamColor, crest, carrier, marker }: {
  actor: Actor
  spot: Spot
  teamColor: string
  /** Escudo del equipo: el FONDO del retrato (si no hay, el color). */
  crest?: string
  carrier?: boolean
  marker?: boolean
}) {
  const info = ELEMENT_INFO[actor.element]
  const active = carrier || marker
  const ring = actor.rarity === 4 ? 'transparent' : actor.rarity ? rarityBorder(actor.rarity) : '#334155'
  // Anillo de recursos: PT a la derecha (0→180°), aguante a la izquierda
  // (180→360°). `conic-gradient` desde arriba, en el sentido del reloj.
  const ptDeg = Math.max(0, Math.min(1, actor.pt / Math.max(1, actor.ptMax))) * 180
  const aguDeg = Math.max(0, Math.min(1, actor.stamina / 100)) * 180
  const gauge = `conic-gradient(#38bdf8 0deg ${ptDeg}deg, rgba(2,6,23,.55) ${ptDeg}deg 180deg, rgba(2,6,23,.55) 180deg ${360 - aguDeg}deg, #22c55e ${360 - aguDeg}deg 360deg)`
  // Retardo mínimo por jugador (hash del uid) SOLO para que la línea no
  // arranque como un bloque de plástico. Nada de deriva perpetua: cada
  // desplazamiento responde a la jugada, no a una animación de adorno.
  let h = 0
  for (const ch of actor.uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 transition-all ease-in-out"
      style={{
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        zIndex: active ? 20 : 10,
        // El destino ahora se MUEVE solo (la jugada avanza sin parar), así que
        // la transición ya no tiene que cubrir un latido entero: es un
        // suavizado corto. Con los 1500 ms de antes, cada ficha iba un segundo
        // y medio por detrás de su sitio y el campo se veía a destiempo.
        transitionDuration: active ? '260ms' : '520ms',
        transitionDelay: active ? '0ms' : `${(h % 4) * 25}ms`,
      }}
    >
      <div className="flex flex-col items-center">
      {/* anillo exterior de PT/AGU */}
      <div
        className={`rounded-full p-[3px] transition-all ${active ? 'scale-110' : ''}`}
        style={{ background: gauge, boxShadow: carrier ? `0 0 10px ${info.color}` : undefined }}
      >
        {/* borde de rareza + retrato sobre el ESCUDO del equipo (o su color) */}
        <div
          className={`relative rounded-full overflow-hidden border-2 grid place-items-center ${active ? 'w-8 h-8' : 'w-7 h-7'}`}
          style={{ borderColor: ring, background: teamColor }}
        >
          {crest && (
            <img
              src={`${import.meta.env.BASE_URL}inazuma/teams/${crest}.png`}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover opacity-90"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <ImgFallback
            src={portraitUrl(actor.baseId)}
            className="relative w-full h-full object-cover object-top"
            alt={actor.name}
            fallback={<span className="relative text-[9px] font-extrabold text-white">
              {actor.name.slice(0, 2).toUpperCase()}
            </span>}
          />
          {actor.rarity === 4 && <span className="mc-ring rounded-full" />}
        </div>
      </div>
      {/* elemento + nombre, SIEMPRE */}
      <span className={`mt-0.5 inline-flex items-center gap-0.5 max-w-[62px] rounded px-1 leading-tight ${
        active ? 'bg-black/75 text-white text-[8px] font-bold' : 'bg-black/50 text-white/85 text-[7px] font-bold'
      }`}>
        <Icon name={ELEMENT_ICON[actor.element]} className={active ? 'w-2.5 h-2.5 shrink-0' : 'w-2 h-2 shrink-0'} style={{ color: info.color }} />
        <span className="truncate">{actor.name.split(' ')[0]}</span>
      </span>
      </div>
    </div>
  )
}
