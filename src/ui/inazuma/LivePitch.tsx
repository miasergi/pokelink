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
import { useSettings } from '@/state/settingsStore'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { rarityBorder, SvgBall } from '@/ui/inazuma/Glyphs'
import { techniqueByName } from '@/ui/inazuma/DuelStage'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import type { Actor, ChainStep, Element, MatchEvent, MatchState } from '@/engine/inazuma/types'

/** Color de las LLAMAS del disparo: el de su elemento (o blanco si va a pelo). */
function flameOf(el: Element | undefined): string {
  return el ? ELEMENT_INFO[el].color : '#e2e8f0'
}

/** Velocidad del balón en el rondo (% de campo por segundo). */
const RONDO_BALL_SPEED = 29
/** El toque de control al recibir (s): recibir, mirar, soltar. */
const RONDO_CONTROL_S = 0.55

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

/**
 * LA LEY DE VELOCIDAD MÁXIMA. Cada ficha y el balón tienen una posición
 * MOSTRADA que persigue a su objetivo a velocidad limitada, tick a tick.
 * Con esto los teletransportes y los barridos son IMPOSIBLES por
 * construcción: da igual qué discontinuidad ocurra (cambio de posesión,
 * cambio de campo al descanso, volver a la pestaña, jugada nueva) — nada en
 * el campo puede moverse más rápido que su tope. Es lo que hace un motor de
 * juego de verdad, en vez de confiar en transiciones CSS con duraciones
 * calculadas (que era la fuente inagotable de «lagazos»).
 */
const PLAYER_SPEED = 13 // % de campo por segundo (trote normal)
const ACTIVE_SPEED = 20 // el portador y su marcador (carrera)
const BALL_PURSUIT_SPEED = 38 // el balón: por encima del pie, por debajo del rayo

export default function LivePitch({ match, feed, current, myCrest, theirCrest, flight, flowing }: {
  match: MatchState
  feed: MatchEvent[]
  /**
   * DISPARO EN VUELO: el balón sale de los pies del que tira y viaja a la
   * portería contraria envuelto en llamas del color de su elemento. Lo activa
   * la cinemática del tiro entre la supertécnica y la parada.
   */
  flight?: { key: number; element?: Element; mine: boolean; landed?: boolean; toUid?: string } | null
  /**
   * true cuando el partido CORRE (ni decisión ni cinemática en pantalla). Es
   * lo que mantiene vivo el césped entre jugada y jugada: sin esto, el
   * emparejamiento pegajoso de las esperas del cronómetro congelaba la
   * circulación y «pasaban los minutos sin moverse nada».
   */
  flowing?: boolean
  /** Emparejamiento en pantalla (decisión o cinemática), si lo hay. */
  current?: { attackerUid: string; defenderUid: string; step: ChainStep; side: 'home' | 'away'; longShot?: boolean } | null
  /** Escudos: van de FONDO en la ficha de cada jugador (en vez del color). */
  myCrest?: string
  theirCrest?: string
}) {
  const showNames = useSettings((st) => st.inazumaPitchNames)
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
    const t = setInterval(() => setNow((n) => n + 1), 50)
    return () => clearInterval(t)
  }, [])

  // Posiciones MOSTRADAS (perseguidor). El dt se capa a 120 ms: si la pestaña
  // estuvo dormida, al volver nadie se teletransporta — caminan a su sitio.
  const shownPos = useRef(new Map<string, Spot>())
  const lastTickAt = useRef(Date.now())
  const nowMs = Date.now()
  const dt = Math.min(0.12, Math.max(0, (nowMs - lastTickAt.current) / 1000))
  lastTickAt.current = nowMs
  const pursue = (key: string, target: Spot, speed: number): Spot => {
    const cur = shownPos.current.get(key)
    if (!cur) { shownPos.current.set(key, target); return target }
    const dx = target.x - cur.x
    const dy = target.y - cur.y
    const d = Math.hypot(dx, dy)
    const step = speed * dt
    const next = d <= step || d === 0 ? target : { x: cur.x + (dx / d) * step, y: cur.y + (dy / d) * step }
    shownPos.current.set(key, next)
    return next
  }

  // El último DUELO revelado manda sobre dónde está el balón; si DESPUÉS hay
  // un PASE revelado, el balón vuela a los pies del receptor (sin cinemática:
  // el vuelo se ve aquí). Un gol o un saque cierran la jugada.
  let duel: { attackerUid: string; defenderUid: string; step: ChainStep; side: 'home' | 'away'; success?: boolean; longShot?: boolean } | null = null
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
  const rawCarrierUid = !current && passTo ? passTo : shown?.attackerUid ?? null
  const rawMarkerUid = shown?.defenderUid ?? null
  let carrierUid = rawCarrierUid
  let markerUid: string | null = rawMarkerUid
  let step: ChainStep | null = shown?.step ?? null
  let atkSide = shown?.side ?? null
  const myAnchor = anchors(home.keeper, home.defs, home.mids, home.fwds, true)
  const theirAnchor = anchors(away.keeper, away.defs, away.mids, away.fwds, false)

  // PROGRESO DE LA JUGADA: 0 al revelarse el evento, 1 unos segundos después.
  // Es el motor del movimiento continuo — sin él, entre evento y evento el
  // campo se queda congelado y parece un juego por turnos.
  // La referencia es la JUGADA (quién ataca, en qué eslabón y con quién), no
  // el número de eventos: si se reinicia con cada línea de narración, el
  // bloque pega un tirón hacia atrás cada dos por tres — eso era buena parte
  // de los «movimientos antinaturales».
  const playKey = `${shown?.side ?? '-'}|${shown?.step ?? '-'}|${rawCarrierUid ?? '-'}|${rawMarkerUid ?? '-'}`
  const startedAt = useRef({ key: '', t: 0 })
  if (startedAt.current.key !== playKey) {
    startedAt.current = { key: playKey, t: Date.now() }
  }
  const elapsed = Date.now() - startedAt.current.t
  // `now` solo está para forzar el re-render del reloj; el valor real es el
  // tiempo transcurrido.
  void now
  const ease = (t: number) => 1 - (1 - t) * (1 - t)
  const phase = elapsed / PHASE_MS
  const progress = ease(Math.max(0, Math.min(1, phase)))
  // Tiempo (EN SEGUNDOS) que llevamos esperando al siguiente evento. Antes
  // iba en unidades de PHASE_MS por un despiste y toda la vida entre jugadas
  // corría 2.6 veces más lenta de lo diseñado.
  const holdSec = Math.max(0, (elapsed - PHASE_MS) / 1000)

  const lastBallLogical = useRef<Spot>({ x: 50, y: 50 })
  // ATURDIMIENTO tras perder un duelo: de uid a su ventana de recuperación.
  const stunRef = useRef(new Map<string, { from: number; until: number }>())
  if (stunRef.current.size > 24) {
    for (const [uid, w] of stunRef.current) if (nowMs > w.until) stunRef.current.delete(uid)
  }
  const stunned = (uid: string) => {
    const w = stunRef.current.get(uid)
    return !!w && nowMs >= w.from && nowMs < w.until
  }
  // LA TÉCNICA EN EL CÉSPED, versión roguelike: nada de animaciones grandes —
  // el BALÓN se tiñe del color del elemento y una placa canta nombre y
  // potencia. La imagen de la técnica la enseña la tele de Chester arriba.
  // (Las animaciones procedurales de TechniqueFX siguen en el repo, ancladas
  // al escenario de penaltis, por si algún día vuelve el modo cinemático.)
  const techTag = useRef<{
    key: number
    until: number
    name: string
    power: number
    color: string
    uid: string
  } | null>(null)
  const techSeen = useRef(0)
  {
    const last = feed[feed.length - 1]
    if (feed.length !== techSeen.current) {
      techSeen.current = feed.length
      // Tras un cruce SUPERADO (tiro lejano que pasa rozando), el duelo con
      // el portero es la CONTINUACIÓN del mismo disparo: sin placa repetida.
      const prev = feed[feed.length - 2]
      const grazedPrev = prev?.kind === 'duel' && prev.intercept === true && prev.success
      if (last?.kind === 'duel' && (last.technique || last.counter) && !grazedPrev) {
        // La placa es de la técnica QUE DECIDE: en el disparo la del tirador
        // (la parada tendrá la suya al llegar), en el duelo de campo la del
        // ganador, en el cruce la del bloqueador si corta.
        const name = last.step === 'definicion' && !last.intercept
          ? last.technique ?? last.counter
          : (last.success ? last.technique ?? last.counter : last.counter ?? last.technique)
        const uid = name === last.technique ? last.attackerUid : last.defenderUid
        const t = name ? techniqueByName(name) : undefined
        if (t) {
          techTag.current = { key: feed.length, until: nowMs + 2000, name: t.name, power: t.power, color: ELEMENT_INFO[t.element].color, uid }
        }
      } else if (last?.kind === 'save' && last.technique) {
        const t = techniqueByName(last.technique)
        if (t) techTag.current = { key: feed.length, until: nowMs + 2000, name: t.name, power: t.power, color: ELEMENT_INFO[t.element].color, uid: last.keeperUid }
      }
      // El que PIERDE un duelo de campo queda ATURDIDO, con técnica o sin ella.
      if (last?.kind === 'duel' && last.step !== 'definicion' && !last.intercept) {
        const loser = last.success ? last.defenderUid : last.attackerUid
        stunRef.current.set(loser, { from: nowMs + 500, until: nowMs + 4200 })
      }
    }
  }
  const tagActive = techTag.current !== null && nowMs < techTag.current.until

  // LA CHISPA del duelo de campo: al revelarse un regate/corte, un fogonazo
  // EN EL PUNTO donde está el balón. Sin ella, esos duelos pasaban sin que se
  // viera dónde ni entre quiénes.
  const spark = useRef<{ key: number; at: Spot; mine: boolean; until: number } | null>(null)
  const sparkSeen = useRef(0)
  {
    const last = feed[feed.length - 1]
    if (feed.length !== sparkSeen.current && last?.kind === 'duel' && last.step !== 'definicion' && !last.intercept) {
      sparkSeen.current = feed.length
      const winnerMine = (last.side === mine) === last.success
      spark.current = { key: feed.length, at: { ...lastBallLogical.current }, mine: winnerMine, until: nowMs + 1000 }
    }
  }

  // Reloj del RONDO: anclado al evento que DEFINE la posesión (robo, parada,
  // gol, saque). La cadena solo se reinicia cuando el balón cambia de manos
  // de verdad — y SIEMPRE arranca DESDE DONDE ESTÁ EL BALÓN en ese instante:
  // cualquier otra cosa era un giro fantasma en mitad del vuelo.
  const rondoAnchor = useRef({ idx: -2, t: nowMs, from: { x: 50, y: 50 } })
  const rondoStateFor = (idx: number): { sec: number; from: Spot } => {
    if (rondoAnchor.current.idx !== idx) {
      rondoAnchor.current = { idx, t: nowMs, from: { ...lastBallLogical.current } }
    }
    return { sec: Math.max(0, (nowMs - rondoAnchor.current.t) / 1000), from: rondoAnchor.current.from }
  }

  // EL RONDO: la capa que faltaba para que esto sea una SIMULACIÓN y no un
  // juego por turnos. El motor genera ~16 jugadas por partido, así que entre
  // una y otra pasan varios minutos en los que NO HAY nada que contar — y el
  // campo se quedaba en foto («un ordenador decide que hay jugada en el 7»).
  // Ahora, en cuanto la jugada contada termina, el equipo con el balón LO
  // MUEVE de verdad: sale desde la defensa, pasa por los medios y sube hasta
  // los delanteros, un pase cada ~1.3 s, y vuelta a empezar desde atrás.
  // Todo determinista, sin ruido: cada pase es a un compañero concreto.
  // EL BLOQUE SIGUE AL BALÓN: todo el equipo (menos el portero) se desplaza
  // con la pelota. El que ataca SUBE el bloque entero hacia campo rival (la
  // defensa pisa el centro, los medios campo contrario); el que defiende
  // PRESIONA arriba si el balón está lejos o repliega si lo tiene encima.
  // Esto es lo que mezcla a los dos equipos en el mismo trozo de césped —
  // sin ello cada equipo vivía en su mitad y no había huecos que crear.
  const ballFieldX = lastBallLogical.current.x
  const blockDX = (isMine: boolean, attacking: boolean): number => {
    const local = isMine ? ballFieldX : 100 - ballFieldX
    const sh = attacking
      ? Math.max(-6, Math.min(22, (local - 48) * 0.5))
      : Math.max(-8, Math.min(14, (local - 52) * 0.45))
    return sh * (isMine ? 1 : -1)
  }

  let buildup = false
  // La posición EXACTA del balón durante el rondo, interpolada a cada frame.
  let rondoBall: Spot | null = null
  // RECEPCIÓN AL PIE y DESMARQUES: quién va a recibir el pase (y cuánto le
  // queda al balón en el aire), y desde qué línea sale el pase — el fútbol
  // sin balón de los otros nueve se decide con esto.
  let rondoRecvUid: string | null = null
  let rondoRecvK = 0
  let rondoFromPos: string | null = null
  // Sin jugada viva en pantalla, el rondo entra YA (al saque inicial no hay
  // nada que asentar y el campo se quedaba muerto del minuto 1 al 6).
  if (flowing && !tagActive && !flight && (holdSec > 0.2 || shown == null)) {
    // ¿De quién es el balón AHORA? Del último evento que lo diga.
    let possession: 'home' | 'away' | null = null
    // Tras parada o gol, el balón LO TIENE EL PORTERO: el rondo empieza en
    // sus guantes, no en el círculo central.
    let fromKeeper = false
    let fromCenter = false
    // Índice del evento que DEFINE la posesión: es el ancla del rondo. Si el
    // ancla fuera «cualquier evento nuevo» (como antes), cada línea de
    // narración re-sembraba la cadena a mitad de vuelo y el balón CAMBIABA DE
    // DIRECCIÓN sin que nadie lo tocara.
    let possIdx = -1
    // El GANADOR del último duelo: si la posesión viene de ganar un regate o
    // un corte, la circulación arranca de sus pies y va HACIA ADELANTE.
    let winnerUid: string | null = null
    for (let i = feed.length - 1; i >= 0; i--) {
      const e = feed[i]
      if (e.kind === 'turnover') { possession = e.side; possIdx = i; break }
      if (e.kind === 'save') { possession = e.side; fromKeeper = true; possIdx = i; break }
      if (e.kind === 'duel') { possession = e.success ? e.side : otherSide(e.side); winnerUid = e.success ? e.attackerUid : e.defenderUid; possIdx = i; break }
      if (e.kind === 'goal') { possession = otherSide(e.side); fromCenter = true; possIdx = i; break } // saca de centro el que encajó
      if (e.kind === 'possession') { possession = e.side; possIdx = i; break }
      if (e.kind === 'kickoff') { possession = 'home'; fromCenter = true; possIdx = i; break }
      if (e.kind === 'halftime') { possession = 'away'; fromCenter = true; possIdx = i; break }
    }
    if (possession) {
      const posSide = sideOf(match, possession)
      // Defensas → medios → delanteros y vuelta: la salida de balón de manual
      // (reciclar hacia atrás también es fútbol).
      // Saque de centro: el delantero toca atrás desde el círculo y la salida
      // sigue por los medios. Parada: empieza en los guantes del portero.
      // Y POR LAS BANDAS: dentro de cada línea se ordena por banda alternando
      // el sentido (defensa por la izquierda, medios hacia la derecha,
      // delanteros de vuelta): el balón ZIGZAGUEA por el ancho del campo en
      // vez de subir siempre por el pasillo central.
      const posMineSide = possession === mine
      const anchorsOf = posMineSide ? myAnchor : theirAnchor
      const laneOf = (a: Actor) => anchorsOf.get(a.uid)?.y ?? 50
      const porBandas = (line: Actor[], invertir: boolean) =>
        [...line].sort((a, b) => (invertir ? laneOf(b) - laneOf(a) : laneOf(a) - laneOf(b)))
      const defsW = porBandas(posSide.defs, false)
      const midsW = porBandas(posSide.mids, true)
      const fwdsW = porBandas(posSide.fwds, false)
      // IDA Y VUELTA: defensas → medios → delanteros → y RECICLAJE por los
      // medios de vuelta. Antes el ciclo cerraba con un pelotazo del último
      // delantero al primer defensa cruzando todo el campo — el pase «al
      // centro con muchísimos jugadores» que no entendía nadie.
      const vuelta = [...midsW].reverse()
      // PASE FILTRADO: en posesiones alternas, el último defensa se salta la
      // línea de medios con un balón directo al delantero de BANDA (que sale
      // a buscarlo) — la circulación no siempre es de manual.
      const filtrado = defsW.length > 0 && fwdsW.length > 0 && possIdx % 2 === 1
      let seqRaw = fromCenter
        ? [...fwdsW.slice(0, 1), ...vuelta, ...defsW, ...midsW, ...fwdsW, ...vuelta]
        : fromKeeper
          ? [posSide.keeper, ...defsW, ...midsW, ...fwdsW, ...vuelta]
          : filtrado
            ? [...defsW, fwdsW[0], ...midsW, ...fwdsW, ...vuelta]
            : [...defsW, ...midsW, ...fwdsW, ...vuelta]
      // POSESIÓN GANADA EN UN DUELO: la jugada sigue DESDE EL GANADOR y hacia
      // su ataque — nada de ganar el regate y pasarla atrás. El defensa que
      // roba abre a los medios; el medio que gana busca a los delanteros; el
      // delantero que regatea combina con el otro punta.
      const wA = winnerUid ? [...posSide.defs, ...posSide.mids, ...posSide.fwds].find((a) => a.uid === winnerUid) : undefined
      if (wA) {
        // TRIÁNGULO LOCAL: el ganador del duelo retiene con sus DOS apoyos
        // más cercanos (con preferencia hacia adelante). La jugada se queda
        // donde está — nada de reciclar el campo entero hacia atrás justo
        // después de ganar un regate, que agobiaba.
        const anchorW = anchorsOf.get(wA.uid) ?? { x: 50, y: 50 }
        const apoyos = [...posSide.defs, ...posSide.mids, ...posSide.fwds]
          .filter((a) => a.uid !== wA.uid)
          .map((a) => {
            const an = anchorsOf.get(a.uid) ?? { x: 50, y: 50 }
            const haciaDelante = posMineSide ? an.x - anchorW.x : anchorW.x - an.x
            return { a, d: Math.hypot(an.x - anchorW.x, an.y - anchorW.y) - Math.max(0, haciaDelante) * 0.5 }
          })
          .sort((x, y) => x.d - y.d)
          .slice(0, 2)
          .map((x) => x.a)
        seqRaw = [wA, ...apoyos]
      }
      // Sin pases de un jugador a sí mismo (líneas de un solo hombre).
      const order: Actor[] = []
      for (const a of seqRaw) if (order.length === 0 || order[order.length - 1].uid !== a.uid) order.push(a)
      if (order.length > 1 && order[0].uid === order[order.length - 1].uid) order.pop()
      if (order.length >= 2) {
        buildup = true
        atkSide = possession
        step = 'construccion'
        // Sin marcador: el duelo aún no ha llegado — esto es el viaje.
        markerUid = null

        // EL BALÓN NUNCA SE PARA. La posesión es una CADENA CONTINUA de
        // pases: cada tramo dura exactamente lo que el balón tarda en
        // recorrerlo a velocidad constante, más un toque de control al
        // recibir. En cada instante (cada frame) se sabe en qué tramo va y en
        // qué punto del vuelo está — nada de «cada 1.3 s salta al siguiente».
        const posMine = possession === mine
        const anchorMap = posMine ? myAnchor : theirAnchor
        // El punto de cada eslabón es DONDE SE PINTA al que recibe (su paso
        // al frente incluido): antes el balón volaba al ancla «teórica» y el
        // jugador estaba dibujado en otro sitio — «se la pasan sin tocarla».
        const spotAt = (a: Actor) => {
          const b = anchorMap.get(a.uid) ?? { x: 50, y: 50 }
          if (a.position === 'POR') return b
          return { x: Math.max(4, Math.min(96, b.x + blockDX(posMine, true) + (posMine ? 2 : -2))), y: b.y }
        }
        const st = rondoStateFor(possIdx)
        // TRAMO DE ENTRADA (fuera del bucle): el balón viaja desde donde ESTÁ
        // (o desde el círculo central en los saques) hasta el primer eslabón.
        const entryFrom = fromCenter ? { x: 50, y: 50 } : st.from
        const first = spotAt(order[0])
        const entryFlight = Math.max(0.25, Math.hypot(first.x - entryFrom.x, first.y - entryFrom.y) / RONDO_BALL_SPEED)
        const entry = entryFlight + RONDO_CONTROL_S

        if (st.sec < entry) {
          const k = Math.min(1, st.sec / entryFlight)
          rondoBall = {
            x: entryFrom.x + (first.x - entryFrom.x) * k,
            y: entryFrom.y + (first.y - entryFrom.y) * k,
          }
          carrierUid = order[0].uid
          rondoRecvUid = order[0].uid
          rondoRecvK = k
        } else {
          // EL BUCLE: pases entre jugadores, sin puntos fantasma dentro.
          const legs: { from: Actor; to: Actor; flight: number; total: number }[] = []
          let cycle = 0
          for (let i = 0; i < order.length; i++) {
            const from = order[i]
            const to = order[(i + 1) % order.length]
            const A = spotAt(from)
            const B = spotAt(to)
            const flight = Math.max(0.25, Math.hypot(B.x - A.x, B.y - A.y) / RONDO_BALL_SPEED)
            legs.push({ from, to, flight, total: flight + RONDO_CONTROL_S })
            cycle += flight + RONDO_CONTROL_S
          }
          let t = (st.sec - entry) % cycle
          let leg = legs[0]
          for (const l of legs) { if (t < l.total) { leg = l; break } t -= l.total }
          const A = spotAt(leg.from)
          const B = spotAt(leg.to)
          const k = Math.min(1, t / leg.flight)
          rondoBall = { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k }
          // Mientras vuela, el balón «es» del que lo soltó; al llegar, del
          // que lo recibe (que ya está dando el paso para controlarlo).
          carrierUid = k >= 1 ? leg.to.uid : leg.from.uid
          rondoFromPos = leg.from.position
          if (k < 1) { rondoRecvUid = leg.to.uid; rondoRecvK = k }
        }
      }
    }
  }
  const iAttack = atkSide === mine

  // El balón AVANZA dentro de su zona mientras dura la jugada (y retrocede un
  // pelín al empezar, que es como se gana un metro antes de atacar).
  // Tiro LEJANO: el disparo sale desde tres cuartos de campo, no desde el
  // borde del área — si no, el delantero «aparecía delante» de repente.
  const longShot = shown?.longShot === true
  const zone = step == null ? 50 : longShot && step === 'definicion' ? STEP_X.penetracion : STEP_X[step]
  const zoneFrom = step != null ? zone - ZONE_RUN : 50
  const zoneTo = step != null ? zone + ZONE_RUN : 50
  const rawBallX = zoneFrom + (zoneTo - zoneFrom) * progress
  let ballX = step == null ? 50 : iAttack ? rawBallX : 100 - rawBallX
  if (rondoBall) {
    // Rondo: el balón está donde está — todo lo demás bascula siguiéndolo.
    ballX = rondoBall.x
  }

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
  const pressSide = !buildup && lastEv?.kind === 'turnover' ? lastEv.side : null

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
    return push * dir * deep * (0.55 + 0.45 * progress) * (buildup ? 0.55 : 1)
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

  const ballHolderUid = carrierUid

  const ballCarrierRef = carrierUid ? actorByUid(match, carrierUid) ?? null : null
  const clampX = (x: number) => Math.max(4, Math.min(96, x))
  const clampY = (y: number) => Math.max(7, Math.min(93, y))

  // CARRIL DEL BALÓN: la banda por la que va la jugada. Es la referencia de
  // la BASCULACIÓN — el bloque se desplaza hacia el balón, como en el fútbol
  // de verdad. Sustituye al onduleo aleatorio que había antes: cada
  // desplazamiento tiene ahora un porqué.
  const carrierAnchor = ballHolderUid
    ? (myAnchor.get(ballHolderUid) ?? theirAnchor.get(ballHolderUid))
    : undefined
  const ballLane = rondoBall ? rondoBall.y : carrierAnchor ? carrierAnchor.y * 0.6 + 20 : 50

  // PRESIÓN EN EL RONDO: el defensor más cercano al balón SALE a presionar al
  // portador — nada de mirar de lejos pivotando. Al circular el balón, el que
  // presiona VA CAMBIANDO: la presión rota como en un rondo de verdad, y el
  // hueco que deja a su espalda es de quien lo sepa atacar.
  let presserUid: string | null = null
  let coverUid: string | null = null
  if (buildup && atkSide != null) {
    const defIsMine = atkSide !== mine
    const defAnchorMap = defIsMine ? myAnchor : theirAnchor
    let best = Infinity
    let second = Infinity
    for (const a of defIsMine ? myActors : theirActors) {
      if (a.position === 'POR') continue
      const an = defAnchorMap.get(a.uid) ?? { x: 50, y: 50 }
      const d = Math.hypot(an.x - ballX, an.y - ballLane)
      if (d < best) { second = best; coverUid = presserUid; best = d; presserUid = a.uid }
      else if (d < second) { second = d; coverUid = a.uid }
    }
  }

  // CAMBIO DE CAMPO tras el descanso, como en los partidos de verdad: toda la
  // geometría se calcula igual y se ESPEJA solo al pintar (jugadores, balón y
  // porterías) cuando el descanso ya se contó.
  const secondHalf = feed.some((e) => e.kind === 'halftime')
  // Cambiar de campo es GIRAR EL CAMPO 180°, no reflejarlo: si solo se espeja
  // la horizontal, el extremo izquierdo aparece de extremo derecho. Se espejan
  // las dos coordenadas.
  const mx = (x: number) => (secondHalf ? 100 - x : x)
  const my = (y: number) => (secondHalf ? 100 - y : y)

  // CAMPO EN VERTICAL: tu portería ABAJO, la rival ARRIBA (tras el descanso,
  // al revés). La geometría lógica no cambia — x sigue siendo el avance hacia
  // la portería rival y `y` la banda — solo cambia cómo se proyecta:
  //   pantalla.izquierda = banda · pantalla.arriba = 100 − avance.
  const toScreen = (p: Spot): Spot => ({ x: my(p.y), y: 100 - mx(p.x) })
  const fromScreen = (p: Spot): Spot => ({ x: mx(100 - p.y), y: my(p.x) })

  /** Posición FINAL de un jugador este instante. */
  const spotOf = (a: Actor, isMine: boolean): Spot => {
    const base = (isMine ? myAnchor : theirAnchor).get(a.uid) ?? { x: 50, y: 50 }
    if (a.uid === carrierUid) {
      if (a.position === 'POR') return base
      // En el RONDO cada uno recibe EN SU SITIO (un paso al frente): así los
      // pases se ven volar entre posiciones reales y nadie corretea.
      if (buildup) {
        return { x: clampX(base.x + blockDX(isMine, true) + (isMine ? 2 : -2)), y: base.y }
      }
      // El del balón CONDUCE desde donde estaba hacia el punto del eslabón:
      // a mitad de camino de su ancla, no plantado en la zona. Antes se le
      // colocaba directamente en `ballX` y al cambiar el portador el nuevo
      // cruzaba el campo entero de un tirón — el «teletransporte».
      return {
        x: clampX(base.x + (ballX - base.x) * (0.45 + 0.3 * progress)),
        y: clampY(base.y + (base.y * 0.6 + 20 - base.y) * 0.7),
      }
    }
    // RECEPCIÓN AL PIE: el que va a recibir SALE al encuentro del pase y
    // llega justo cuando llega el balón — se acabó recibir sin tocarla.
    if (buildup && a.uid === rondoRecvUid && a.position !== 'POR') {
      const tx = clampX(base.x + blockDX(isMine, true) + (isMine ? 2 : -2))
      const k = Math.min(1, rondoRecvK * 1.15)
      return { x: clampX(base.x + (tx - base.x) * k), y: clampY(base.y) }
    }
    if (a.uid === markerUid) {
      // Su marcador le sale al paso: entre el balón y SU portería, y le va
      // COMIENDO terreno según avanza la jugada (de ahí la sensación de
      // persecución en vez de dos fichas pegadas desde el primer fotograma).
      if (a.position === 'POR') return base
      const gap = 11 - 5 * progress
      // Persigue el punto REAL del portador (la misma cuenta de arriba), no
      // la zona abstracta: si no, el balón y su marcador iban a sitios
      // distintos y no se entendía a quién marcaba.
      const cSpot = (() => {
        const c = ballCarrierRef?.uid === carrierUid ? ballCarrierRef : null
        if (!c) return { x: ballX, y: 50 }
        const cBase = (myActors.some((x) => x.uid === c.uid) ? myAnchor : theirAnchor).get(c.uid) ?? { x: 50, y: 50 }
        return {
          x: cBase.x + (ballX - cBase.x) * (0.45 + 0.3 * progress),
          y: cBase.y + (cBase.y * 0.6 + 20 - cBase.y) * 0.7,
        }
      })()
      return { x: clampX(cSpot.x + (isMine ? -gap : gap)), y: clampY(cSpot.y) }
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
    // EL PRESIONADOR del rondo: sale de su sitio hacia el portador, tapando
    // el lado de su propia portería. Los duelos que se ven venir.
    if (buildup && a.uid === presserUid) {
      const gx = ballX + (isMine ? -5 : 5)
      return {
        x: clampX(base.x + (gx - base.x) * 0.6),
        y: clampY(base.y + (ballLane - base.y) * 0.6),
      }
    }
    // LA COBERTURA: el segundo más cercano se coloca por detrás del que
    // presiona, tapando el pase al hueco. Presión de verdad, en pareja.
    if (buildup && a.uid === coverUid) {
      const gx = ballX + (isMine ? -12 : 12)
      return {
        x: clampX(base.x + (gx - base.x) * 0.45),
        y: clampY(base.y + (ballLane - base.y) * 0.45),
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
        ? (base.y < 30 ? -7 : base.y > 70 ? 7 : 0)
        : (base.y < 50 ? 3 : -3) * (defMood === 'candado' ? 1.5 : 1)
    // BASCULACIÓN: el bloque se desliza hacia el carril del balón. El que
    // defiende bascula MÁS (hay que taparle el camino) que el que ataca.
    const slide = atkSide == null ? 0 : (ballLane - base.y) * (isAtkTeam ? 0.12 : 0.26)
    // DESMARQUES: el fútbol sin balón. Con la bola en los medios, los
    // delanteros ROMPEN al espacio; con la bola atrás, bajan a mostrarse;
    // cuando la tienen los delanteros, los medios LLEGAN por detrás. Todo
    // atado a dónde está el balón — movimiento con porqué, nada de onduleo.
    let desmarque = 0
    let desmarqueY = 0
    if (buildup && isAtkTeam && rondoFromPos) {
      const dir = isMine ? 1 : -1
      if (a.position === 'DEL') {
        // Con la bola en los medios, el delantero ROMPE en diagonal hacia el
        // carril del balón (ataca el hueco que deja el que sale a presionar).
        if (rondoFromPos === 'MED') { desmarque = 7 * dir; desmarqueY = (ballLane - base.y) * 0.22 }
        else if (rondoFromPos === 'DEF') desmarque = -3 * dir
      } else if (a.position === 'MED') {
        desmarque = (rondoFromPos === 'DEL' ? 5 : rondoFromPos === 'POR' ? -2 : 0) * dir
      } else if (a.position === 'DEF') {
        if (rondoFromPos === 'POR') desmarque = 2 * dir
        // El LATERAL se incorpora por su banda cuando el balón circula por
        // los medios: doblan por fuera, como los carrileros de verdad.
        else if (rondoFromPos === 'MED' && (base.y <= 32 || base.y >= 68)) desmarque = 4.5 * dir
      }
    }
    // Y EL BLOQUE ENTERO con el balón: la base de que los dos equipos
    // compartan césped en vez de vivir cada uno en su mitad. (El portero ya
    // retornó arriba — aquí solo llegan jugadores de campo.)
    const bloque = atkSide != null ? blockDX(isMine, isAtkTeam) : 0
    return {
      x: clampX(base.x + bloque + rowPush(a, isMine) + desmarque),
      y: clampY(base.y + wing + slide + desmarqueY),
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
  let ball = rondoBall
    ?? (carrierSpot
      ? { x: carrierSpot.x + (iAttack ? 2.5 : -2.5), y: carrierSpot.y + 5 }
      : { x: 50, y: 50 })
  // Mientras una técnica está en pantalla sin jugada escenificada (la parada
  // del portero, p. ej.), el balón se queda EN LOS PIES del protagonista —
  // el rondo espera a que el momento termine.
  if (tagActive && !rondoBall && !carrierSpot) {
    const star = actorByUid(match, techTag.current!.uid)
    if (star) ball = spotOf(star, myActors.some((a) => a.uid === star.uid))
  }

  // El balón también obedece la ley: persigue su objetivo a tope constante.
  const ballPx = pursue('ball', toScreen(ball), BALL_PURSUIT_SPEED)
  // Y se recuerda su posición MOSTRADA (deshecho el espejo): es el punto de
  // partida de la siguiente cadena del rondo — todo viaje del balón empieza
  // exactamente donde el balón SE VE, no donde «debería» estar.
  lastBallLogical.current = fromScreen(ballPx)

  // El que se cruza en la trayectoria (si lo hay): el balón muere en sus pies.
  const blocker = flight?.toUid ? actorByUid(match, flight.toUid) : null
  const blockerSpot = blocker
    ? (() => {
      const isMine = myActors.some((a) => a.uid === blocker.uid)
      const sp = spotOf(blocker, isMine)
      return toScreen(sp)
    })()
    : null

  const danger = step === 'definicion'

  return (
    <div className="relative flex-1 min-h-0 mx-2 my-1.5">
      <div
        className="absolute inset-0 rounded-2xl border border-emerald-900/70 overflow-hidden"
        style={{ background: 'repeating-linear-gradient(0deg, #14532d 0 9%, #166534 9% 18%)' }}
      >
        {/* líneas del campo (VERTICAL: porterías arriba y abajo) */}
        <div className="absolute inset-2 border-2 border-white/20 rounded-sm" />
        <div className="absolute top-1/2 left-2 right-2 h-px bg-white/20" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20 w-[26%] aspect-square" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 border-2 border-t-0 border-white/20 h-[13%] w-[44%]" />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 border-2 border-b-0 border-white/20 h-[13%] w-[44%]" />
        {/* ARRIBA la portería que atacas; ABAJO la tuya (giradas al descanso). */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1.5 w-[22%]" style={{ background: secondHalf ? home.color : away.color }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1.5 w-[22%]" style={{ background: secondHalf ? away.color : home.color }} />

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
                  <LiveDot key={a.uid} actor={a}
                    spot={pursue(a.uid, toScreen(s), a.uid === carrierUid || a.uid === markerUid ? ACTIVE_SPEED : PLAYER_SPEED)}
                    teamColor={mineBg} crest={myCrest}
                    carrier={a.uid === carrierUid} marker={a.uid === markerUid} showNames={showNames}
                    stunned={stunned(a.uid)} />
                )
              })}
              {theirActors.map((a) => {
                const s = spotOf(a, false)
                return (
                  <LiveDot key={a.uid} actor={a}
                    spot={pursue(a.uid, toScreen(s), a.uid === carrierUid || a.uid === markerUid ? ACTIVE_SPEED : PLAYER_SPEED)}
                    teamColor={theirBg} crest={theirCrest}
                    carrier={a.uid === carrierUid} marker={a.uid === markerUid} showNames={showNames}
                    stunned={stunned(a.uid)} />
                )
              })}
            </>
          )
        })()}

        {/* LA TÉCNICA EN EL BALÓN: halo del color del elemento alrededor de
            la pelota + placa con nombre y potencia. Lo demás lo cuenta la
            tele de Chester — el césped queda limpio. */}
        {techTag.current && tagActive && (
          <div
            key={techTag.current.key}
            className="absolute z-[38] pointer-events-none"
            style={{ left: `${ballPx.x}%`, top: `${ballPx.y}%` }}
          >
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full blur-[5px] animate-flame-flicker"
              style={{ background: `radial-gradient(circle, ${techTag.current.color}e0, ${techTag.current.color}55 55%, transparent 75%)` }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 top-3 whitespace-nowrap rounded-full border bg-slate-950/90 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide animate-tech-pop"
              style={{ color: techTag.current.color, borderColor: `${techTag.current.color}88` }}
            >
              {techTag.current.name} <span className="text-amber-300">{techTag.current.power}</span>
            </div>
          </div>
        )}

        {/* LA CHISPA del duelo de campo: fogonazo en el punto del choque. */}
        {spark.current && nowMs < spark.current.until && (
          <div
            key={spark.current.key}
            className="absolute z-[26] pointer-events-none"
            style={{ left: `${toScreen(spark.current.at).x}%`, top: `${toScreen(spark.current.at).y}%` }}
          >
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full animate-clash-pop"
              style={{ background: `radial-gradient(circle, #ffffffd9, ${spark.current.mine ? '#34d399' : '#f87171'}66 55%, transparent 72%)` }}
            />
            <Icon
              name="spark"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 drop-shadow"
              style={{ color: spark.current.mine ? '#34d399' : '#f87171' }}
            />
          </div>
        )}

        {/* ¿ENTRA? El porcentaje real del disparo, enseñado en el MOMENTO DE
            LA VERDAD: mientras el balón vuela y el portero intenta pararlo —
            no antes, que con el tirador no significaba nada. */}
        {flight && !flight.toUid && (() => {
          let chance: number | null = null
          for (let i = feed.length - 1; i >= 0 && i >= feed.length - 4; i--) {
            const e = feed[i]
            if (e.kind === 'duel' && e.step === 'definicion' && typeof e.chance === 'number') { chance = e.chance; break }
          }
          if (chance == null) return null
          const p = toScreen({ x: flight.mine ? 88 : 12, y: 24 })
          return (
            <div
              className="absolute z-[39] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-tech-pop"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <span className="px-2 py-0.5 rounded-full border border-amber-400/70 bg-slate-950/90 text-[10px] font-black uppercase tracking-wider text-amber-300">
                ¿Entra? {Math.round(chance * 100)}%
              </span>
            </div>
          )
        })()}

        {/* EL BALÓN, con su propia transición: los pases se ven volar. Y si
            hay DISPARO en vuelo, sale ardiendo hacia la portería rival. */}
        {flight ? (
          <ShotBall
            key={flight.key}
            from={toScreen(ball)}
            // Si alguien se cruza, el balón se PARA EN ÉL; si no, va a la
            // portería contraria. Así se entiende de dónde sale el bloqueo.
            to={blockerSpot ?? toScreen({ x: flight.mine ? 95 : 5, y: 50 })}
            color={flameOf(flight.element)}
            // Ya llegó: se queda EN LA PORTERÍA mientras se resuelve la
            // parada. Antes volvía a los pies del que había disparado.
            landed={flight.landed}
          />
        ) : (
          <div
            className="absolute z-30 w-4 h-4 -ml-2 -mt-2 pointer-events-none"
            style={{
              left: `${ballPx.x}%`,
              top: `${ballPx.y}%`,
              // El perseguidor ya garantiza la velocidad: esto solo alisa
              // los pasos del tick de 50 ms.
              transition: 'left 80ms linear, top 80ms linear',
            }}
          >
            <SvgBall className="w-4 h-4 drop-shadow animate-ball-bob" />
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
function ShotBall({ from, to, color, landed }: {
  from: Spot
  to: Spot
  color: string
  /** El balón YA llegó: se queda en la portería y las llamas se apagan. */
  landed?: boolean
}) {
  // La estela va SIEMPRE por detrás del sentido del vuelo (campo vertical:
  // sube o baja; con desvíos, la que toque).
  const up = to.y <= from.y
  // Primer fotograma en el ORIGEN y, al siguiente, al destino: así la
  // transición de CSS tiene de dónde salir (si se monta ya en el destino no
  // hay animación que valga).
  const [at, setAt] = useState(landed ? to : from)
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
        className={`absolute -inset-3 rounded-full blur-[6px] transition-opacity duration-500 ${landed ? 'opacity-0' : 'animate-flame-flicker'}`}
        style={{ background: `radial-gradient(circle, ${color}dd, ${color}55 55%, transparent 75%)` }}
      />
      {/* La estela, por detrás del sentido del vuelo. */}
      <span
        className={`absolute left-1/2 -translate-x-1/2 w-3 h-14 blur-[4px] transition-opacity duration-500 ${landed ? 'opacity-0' : ''}`}
        style={{
          [up ? 'top' : 'bottom']: '55%',
          background: `linear-gradient(${up ? 'to bottom' : 'to top'}, ${color}dd, transparent)`,
        }}
      />
      <SvgBall className="relative w-4 h-4 drop-shadow" />
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
function LiveDot({ actor, spot, teamColor, crest, carrier, marker, showNames, dim, stunned }: {
  actor: Actor
  spot: Spot
  teamColor: string
  /** Escudo del equipo: el FONDO del retrato (si no hay, el color). */
  crest?: string
  carrier?: boolean
  marker?: boolean
  /** Ajuste: nombre bajo cada jugador (apagado por defecto). */
  showNames?: boolean
  /** FOCO DE JUGADA: los que no pintan nada en el lance se atenúan. */
  dim?: boolean
  /** Perdió un duelo hace nada: parpadea y se queda apagado, recuperándose. */
  stunned?: boolean
}) {
  const info = ELEMENT_INFO[actor.element]
  const active = carrier || marker
  const ring = actor.rarity === 4 ? 'transparent' : actor.rarity ? rarityBorder(actor.rarity) : '#334155'
  // Anillo de recursos: PT a la derecha (0→180°), aguante a la izquierda
  // (180→360°). `conic-gradient` desde arriba, en el sentido del reloj.
  const ptDeg = Math.max(0, Math.min(1, actor.pt / Math.max(1, actor.ptMax))) * 180
  const aguDeg = Math.max(0, Math.min(1, actor.stamina / 100)) * 180
  const gauge = `conic-gradient(#38bdf8 0deg ${ptDeg}deg, rgba(2,6,23,.55) ${ptDeg}deg 180deg, rgba(2,6,23,.55) 180deg ${360 - aguDeg}deg, #22c55e ${360 - aguDeg}deg 360deg)`
  // La VELOCIDAD ya la garantiza el perseguidor de LivePitch (tope por tick):
  // aquí solo se alisan los pasos del tick de 50 ms. Nada de duraciones
  // calculadas ni retardos — eran la fuente de los tirones.
  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${stunned ? 'fx-stun' : ''}`}
      style={{
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        zIndex: active ? 20 : 10,
        opacity: stunned ? 0.55 : dim ? 0.4 : 1,
        filter: stunned ? 'grayscale(.8)' : dim ? 'grayscale(.6)' : undefined,
        transition: 'left 80ms linear, top 80ms linear, opacity .3s ease, filter .3s ease',
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
      {/* SOLO el nombre, y solo si lo pides en Ajustes (o eres protagonista
          del lance). El icono de elemento se quitó: era ruido — el color ya
          vive en el anillo y en las fichas, y así el partido se LEE mejor. */}
      {(showNames || active) && (
        <span className={`mt-0.5 inline-flex items-center max-w-[62px] rounded px-1 leading-tight ${
          active ? 'bg-black/75 text-white text-[8px] font-bold' : 'bg-black/50 text-white/85 text-[7px] font-bold'
        }`}>
          <span className="truncate">{actor.name.split(' ')[0]}</span>
        </span>
      )}
      </div>
    </div>
  )
}
