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
import { useEffect, useState } from 'react'
import { actorByUid, playerSide, sideOf, otherSide } from '@/engine/inazuma/match'
import { TEAM_BY_ID } from '@/data/inazuma/teams'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { ELEMENT_ICON, Pic, rarityBorder } from '@/ui/inazuma/Glyphs'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import type { Actor, ChainStep, MatchEvent, MatchState } from '@/engine/inazuma/types'

/**
 * Ruido determinista en [-1, 1] por (jugador, latido, canal): el «jogging»
 * táctico de cada uno. Determinista para que un re-render no teletransporte.
 */
function noise(uid: string, beat: number, k: number): number {
  let h = (2166136261 ^ (beat * 101 + k * 17)) >>> 0
  for (const ch of uid) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  h = h >>> 0
  return ((h % 1000) / 1000) * 2 - 1
}

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

export default function LivePitch({ match, feed, current, myCrest, theirCrest }: {
  match: MatchState
  feed: MatchEvent[]
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

  // EL LATIDO TÁCTICO: cada ~1.6 s el equipo recibe su instrucción y DESLIZA
  // hacia ella. El movimiento es POR LÍNEAS con dirección clara (atacar =
  // empujar, defender = replegar), no un onduleo individual — «los jugadores
  // ondean en vez de tener una decisión clara» fue el reporte.
  const [beat, setBeat] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setBeat((b) => b + 1), 1600)
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

  const ballX = step != null ? (iAttack ? STEP_X[step] : 100 - STEP_X[step]) : 50

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
    return push * dir * deep
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

  const clampX = (x: number) => Math.max(4, Math.min(96, x))
  const clampY = (y: number) => Math.max(7, Math.min(93, y))

  /** Posición FINAL de un jugador este instante. */
  const spotOf = (a: Actor, isMine: boolean): Spot => {
    const base = (isMine ? myAnchor : theirAnchor).get(a.uid) ?? { x: 50, y: 50 }
    if (a.uid === carrierUid) {
      // El del balón, en el punto del eslabón, con un AMAGO por latido (el
      // regateador no se queda clavado). Los porteros no abandonan el área.
      if (a.position === 'POR') return base
      return { x: clampX(ballX + noise(a.uid, beat, 4) * 1.5), y: base.y * 0.6 + 20 }
    }
    if (a.uid === markerUid) {
      // Su marcador le sale al paso: entre el balón y SU portería.
      if (a.position === 'POR') return base
      return { x: clampX(ballX + (isMine ? -7 : 7)), y: base.y * 0.6 + 20 }
    }
    // El portero apenas se pasea por su área.
    if (a.position === 'POR') {
      return { x: base.x, y: Math.max(34, Math.min(66, base.y + noise(a.uid, beat, 2) * 3)) }
    }
    // APOYO: acude hacia el balón, un paso por detrás, a dar línea de pase.
    if (supportUids.has(a.uid)) {
      return {
        x: clampX(ballX + (isMine ? -9 : 9) + noise(a.uid, beat, 1) * 1.5),
        y: clampY(50 + (base.y - 50) * 0.45),
      }
    }
    // GEGENPRESSING: el equipo que acaba de perder el balón se echa encima
    // del punto de pérdida durante un latido — presión tras pérdida.
    if (pressSide != null && ((pressSide === mine) === isMine)) {
      return {
        x: clampX(base.x + (ballX - base.x) * 0.35 + noise(a.uid, beat, 1) * 1.2),
        y: clampY(base.y + (50 - base.y) * 0.18 + noise(a.uid, beat, 2) * 2),
      }
    }
    const isAtkTeam = atkSide != null && (atkSide === mine) === isMine
    // OLA DE DESMARQUES: en cada latido, UNA línea del equipo atacante
    // aprieta un paso extra (DEF → MED → DEL, por turnos).
    const lineIdx = ({ DEF: 0, MED: 1, DEL: 2 } as Record<string, number>)[a.position] ?? 0
    const wave = isAtkTeam && beat % 3 === lineIdx ? (isMine ? 3.5 : -3.5) : 0
    // BANDAS Y BLOQUE: atacando, los de banda se ABREN hacia su banda;
    // defendiendo, el bloque se CIERRA hacia el centro (más aún con candado).
    const defMood = isMine ? myMood : theirMood
    const wing = atkSide == null
      ? 0
      : isAtkTeam
        ? (base.y < 30 ? -4 : base.y > 70 ? 4 : 0)
        : (base.y < 50 ? 3 : -3) * (defMood === 'candado' ? 1.5 : 1)
    return {
      x: clampX(base.x + rowPush(a, isMine) + wave + noise(a.uid, beat, 1) * 1.2),
      y: clampY(base.y + wing + noise(a.uid, beat, 2) * 2.2),
    }
  }

  // Punto del balón: en los pies del que lo lleva… y CIRCULANDO: sin decisión
  // ni cinemática encima, cada tercer latido el balón visita a un apoyo y
  // vuelve (un dame-y-ven cosmético — el partido nunca se queda en seco).
  const circulateTo = !current && beat % 3 === 2 && supportUids.size
    ? [...supportUids][0]
    : null
  const ballHolderUid = circulateTo ?? carrierUid
  const ballCarrier = ballHolderUid ? actorByUid(match, ballHolderUid) : null
  const carrierSpot = ballCarrier
    ? spotOf(ballCarrier, myActors.some((a) => a.uid === ballCarrier.uid))
    : null
  const ball = carrierSpot
    ? { x: carrierSpot.x + (iAttack ? 2.5 : -2.5), y: carrierSpot.y + 5 }
    : { x: 50 + noise('ball', beat, 1) * 2, y: 50 + noise('ball', beat, 2) * 3 }

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
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-[22%]" style={{ background: home.color }} />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-[22%]" style={{ background: away.color }} />

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
              {myActors.map((a) => (
                <LiveDot key={a.uid} actor={a} spot={spotOf(a, true)} teamColor={mineBg} crest={myCrest}
                  carrier={a.uid === carrierUid} marker={a.uid === markerUid} />
              ))}
              {theirActors.map((a) => (
                <LiveDot key={a.uid} actor={a} spot={spotOf(a, false)} teamColor={theirBg} crest={theirCrest}
                  carrier={a.uid === carrierUid} marker={a.uid === markerUid} />
              ))}
            </>
          )
        })()}

        {/* EL BALÓN, con su propia transición: los pases se ven volar. */}
        <div
          className="absolute z-30 w-4 h-4 -ml-2 -mt-2 transition-all duration-700 ease-out pointer-events-none"
          style={{ left: `${ball.x}%`, top: `${ball.y}%` }}
        >
          <Pic name="ball" className="w-4 h-4 drop-shadow animate-ball-bob" />
        </div>
      </div>
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
  // VIDA: variante y desfase de deriva POR JUGADOR (hash del uid), y la
  // transición de posición con un pelín de retardo distinto en cada uno para
  // que los movimientos de equipo ondulen en vez de ir en bloque. Los de la
  // jugada van sin retardo: su movimiento es la noticia.
  let h = 0
  for (const ch of actor.uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const drift = ['live-drift-a', 'live-drift-b', 'live-drift-c'][h % 3]
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 transition-all ease-in-out"
      style={{
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        zIndex: active ? 20 : 10,
        // Los de la jugada, rápidos y sin retardo; el resto desliza LARGO
        // (cubre el latido táctico casi entero: carrera CONTINUA, sin el
        // «se para todo en seco» entre latidos).
        transitionDuration: active ? '600ms' : '1500ms',
        transitionDelay: active ? '0ms' : `${(h % 5) * 70}ms`,
      }}
    >
      <div className={`flex flex-col items-center ${drift}`} style={{ animationDelay: `-${(h % 37) / 10}s` }}>
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
