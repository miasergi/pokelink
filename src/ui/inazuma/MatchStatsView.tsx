// VISTA STATS del partido: el modo «sala de máquinas» que sustituye al césped
// cuando lo pides desde la botonera. Las dos plantillas sobre el campo con los
// números VIVOS de cada jugador (PT, aguante y su participación: goles,
// asistencias, tiros, paradas, duelos), una barra profesional de posesión con
// la posición del balón, y los totales del partido estilo mánager.
//
// REGLA DE ORO heredada del césped: todo sale del feed REVELADO y de los
// actores del partido — nada de leer jugadas aún no contadas.
import { playerSide, sideOf, otherSide } from '@/engine/inazuma/match'
import { TEAM_BY_ID } from '@/data/inazuma/teams'
import { ImgFallback } from '@/ui/components/kit'
import { Crest, InjuryCross, SvgBall } from '@/ui/inazuma/Glyphs'
import { portraitUrl, staminaColor } from '@/ui/inazuma/PlayerCard'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import type { Actor, ChainStep, MatchEvent, MatchState, Side } from '@/engine/inazuma/types'

/** Avance del balón (en % de campo) por eslabón — el mismo mapa del césped. */
const STEP_X: Record<ChainStep, number> = { construccion: 38, penetracion: 60, definicion: 82 }
const STEP_ZONE: Record<ChainStep, string> = {
  construccion: 'salida de balón',
  penetracion: 'tres cuartos',
  definicion: '¡en el área!',
}

interface Tally {
  goals: number; assists: number; shots: number; saves: number; duelsW: number; duelsL: number; techs: number
}
const zero = (): Tally => ({ goals: 0, assists: 0, shots: 0, saves: 0, duelsW: 0, duelsL: 0, techs: 0 })

export default function MatchStatsView({ match, feed, myCrest, theirCrest }: {
  match: MatchState
  feed: MatchEvent[]
  myCrest?: string
  theirCrest?: string
}) {
  const mineSide = playerSide(match)
  const mine = sideOf(match, mineSide)
  const theirs = sideOf(match, otherSide(mineSide))

  // ------------------------------------------------------------------
  // PARTICIPACIÓN por jugador y TOTALES por equipo, del feed revelado.
  // ------------------------------------------------------------------
  const tally = new Map<string, Tally>()
  const of = (uid: string): Tally => {
    if (!tally.has(uid)) tally.set(uid, zero())
    return tally.get(uid)!
  }
  const totals = {
    mine: { shots: 0, duelsW: 0, saves: 0, techs: 0, poss: 0 },
    theirs: { shots: 0, duelsW: 0, saves: 0, techs: 0, poss: 0 },
  }
  const bucket = (side: Side) => (side === mineSide ? totals.mine : totals.theirs)
  for (const e of feed) {
    if (e.kind === 'goal') {
      of(e.scorerUid).goals++
      if (e.assistUid) of(e.assistUid).assists++
    } else if (e.kind === 'save') {
      if (e.keeperUid) { of(e.keeperUid).saves++; bucket(e.side).saves++ }
      if (e.technique && e.keeperUid) of(e.keeperUid).techs++
    } else if (e.kind === 'keeperTry') {
      of(e.keeperUid).techs++
    } else if (e.kind === 'longshotKick') {
      of(e.shooterUid).shots++
      bucket(e.side).shots++
      if (e.technique) { of(e.shooterUid).techs++; bucket(e.side).techs++ }
    } else if (e.kind === 'duel') {
      if (e.technique) { of(e.attackerUid).techs++; bucket(e.side).techs++ }
      if (e.counter) { of(e.defenderUid).techs++; bucket(otherSide(e.side)).techs++ }
      if (e.step === 'definicion' && !e.intercept) {
        of(e.attackerUid).shots++
        bucket(e.side).shots++
      } else {
        const winner = e.success ? e.attackerUid : e.defenderUid
        const loser = e.success ? e.defenderUid : e.attackerUid
        of(winner).duelsW++
        of(loser).duelsL++
        bucket(e.success ? e.side : otherSide(e.side)).duelsW++
      }
    } else if (e.kind === 'possession') {
      bucket(e.side).poss++
    }
  }

  // ------------------------------------------------------------------
  // POSESIÓN Y BALÓN: quién la tiene y por dónde anda, de lo revelado.
  // ------------------------------------------------------------------
  let possession: Side = mineSide
  let zone: ChainStep | null = null
  for (let i = feed.length - 1; i >= 0; i--) {
    const e = feed[i]
    if (e.kind === 'turnover' || e.kind === 'possession' || e.kind === 'save') { possession = e.side; break }
    if (e.kind === 'duel') { possession = e.success ? e.side : otherSide(e.side); zone = e.step; break }
    if (e.kind === 'goal') { possession = otherSide(e.side); break }
    if (e.kind === 'kickoff') { possession = 'home'; break }
    if (e.kind === 'halftime') { possession = 'away'; break }
  }
  // Sin duelo fresco, el balón se pinta en el círculo central de quien la tiene.
  const rawX = zone ? STEP_X[zone] : 50
  const ballX = possession === mineSide ? rawX : 100 - rawX
  const posTeam = possession === mineSide ? mine : theirs
  const posCrest = possession === mineSide ? myCrest : theirCrest
  const kit = (posCrest ? TEAM_BY_ID.get(posCrest)?.kit : undefined) ?? [posTeam.color, '#0f172a']

  // Reparto de posesión estimado (por jugadas de posesión reveladas).
  const possTotal = totals.mine.poss + totals.theirs.poss
  const minePoss = possTotal ? Math.round((totals.mine.poss / possTotal) * 100) : 50

  const zoneLabel = zone
    ? `${posTeam.name.replace('Instituto ', '')} · ${STEP_ZONE[zone]}`
    : `${posTeam.name.replace('Instituto ', '')} mueve el balón`

  return (
    <div className="relative flex-1 min-h-0 mx-2 my-1 flex flex-col gap-1.5 overflow-y-auto overscroll-contain">
      {/* LA POSESIÓN, a lo grande: el recuadro con los colores del club que
          tiene el balón, y la barra de campo con el balón donde está. */}
      <div
        className="shrink-0 rounded-2xl border border-slate-700/70 overflow-hidden"
        style={{ background: `linear-gradient(105deg, ${kit[0]}cc 0%, ${kit[0]}cc 36%, ${kit[1]}cc 38%, ${kit[1]}cc 100%)` }}
      >
        <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-950/35">
          {posCrest
            ? <Crest teamId={posCrest} className="w-9 h-9 drop-shadow" />
            : <span className="w-9 h-9 rounded-full border border-white/40" style={{ background: posTeam.color }} />}
          <div className="min-w-0 flex-1">
            <div className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-white/75">Posesión</div>
            <div className="text-sm font-black text-white truncate drop-shadow-[0_1px_0_rgba(0,0,0,.5)]">{posTeam.name}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-black tabular-nums text-white drop-shadow-[0_1px_0_rgba(0,0,0,.5)]">
              {possession === mineSide ? minePoss : 100 - minePoss}%
            </div>
            <div className="text-[8px] uppercase tracking-widest text-white/75">del partido</div>
          </div>
        </div>
        {/* La barra de campo: tu portería a la izquierda, la rival a la
            derecha, y el balón latiendo donde está la jugada. */}
        <div className="relative h-7 mx-3 mb-2 mt-1 rounded-lg border border-white/25 bg-emerald-950/60 overflow-hidden">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/20" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/20" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-white/25" />
          <div className="absolute inset-y-1 left-1 w-1 rounded-full" style={{ background: mine.color }} />
          <div className="absolute inset-y-1 right-1 w-1 rounded-full" style={{ background: theirs.color }} />
          {/* El balón, con transición suave al cambiar de zona. */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-[left] duration-700 ease-out"
            style={{ left: `${ballX}%` }}
          >
            <SvgBall className="w-4 h-4 drop-shadow animate-ball-bob" />
          </div>
          <span className="absolute right-1.5 bottom-0 text-[7px] uppercase tracking-widest text-white/60">{zoneLabel}</span>
        </div>
      </div>

      {/* TOTALES del partido, cara a cara. */}
      <div className="shrink-0 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-1.5 grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-0.5 items-center">
        {([
          ['Posesión', `${minePoss}%`, `${100 - minePoss}%`],
          ['Goles', String(mine.goals), String(theirs.goals)],
          ['Tiros', String(totals.mine.shots), String(totals.theirs.shots)],
          ['Duelos ganados', String(totals.mine.duelsW), String(totals.theirs.duelsW)],
          ['Paradas', String(totals.mine.saves), String(totals.theirs.saves)],
          ['Supertécnicas', String(totals.mine.techs), String(totals.theirs.techs)],
        ] as const).map(([label, a, b]) => (
          <StatRow key={label} label={label} a={a} b={b} />
        ))}
      </div>

      {/* LAS DOS PLANTILLAS con sus números vivos. */}
      <SquadPanel side={mine} crest={myCrest} tally={tally} mineRow />
      <SquadPanel side={theirs} crest={theirCrest} tally={tally} />
    </div>
  )
}

function StatRow({ label, a, b }: { label: string; a: string; b: string }) {
  const na = parseInt(a, 10)
  const nb = parseInt(b, 10)
  const winA = Number.isFinite(na) && Number.isFinite(nb) && na > nb
  const winB = Number.isFinite(na) && Number.isFinite(nb) && nb > na
  return (
    <>
      <span className={`text-right text-[11px] font-extrabold tabular-nums ${winA ? 'text-amber-300' : 'text-slate-200'}`}>{a}</span>
      <span className="text-center text-[8px] uppercase tracking-widest text-slate-500">{label}</span>
      <span className={`text-left text-[11px] font-extrabold tabular-nums ${winB ? 'text-amber-300' : 'text-slate-200'}`}>{b}</span>
    </>
  )
}

/** La plantilla EN CAMPO de un equipo, con los números vivos de cada uno. */
function SquadPanel({ side, crest, tally, mineRow }: {
  side: ReturnType<typeof sideOf>
  crest?: string
  tally: Map<string, Tally>
  mineRow?: boolean
}) {
  const actors: Actor[] = [side.keeper, ...side.defs, ...side.mids, ...side.fwds]
  return (
    <div className="shrink-0 rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-slate-800/80 bg-slate-900/60">
        {crest
          ? <Crest teamId={crest} className="w-5 h-5" />
          : <span className="w-3 h-5 rounded-sm" style={{ background: side.color }} />}
        <span className="text-[11px] font-extrabold truncate">{side.name}</span>
        <span className={`ml-auto text-[8px] uppercase tracking-widest ${mineRow ? 'text-amber-300/80' : 'text-slate-500'}`}>
          {mineRow ? 'tu once' : 'su once'}
        </span>
      </div>
      {/* Cabecera de columnas, una sola vez. */}
      <div className="grid grid-cols-[minmax(0,1.6fr)_1fr_1fr_repeat(4,minmax(20px,0.35fr))] gap-x-1.5 items-center px-2.5 pt-1 text-[7px] uppercase tracking-wider text-slate-600">
        <span />
        <span>PT</span>
        <span>Aguante</span>
        <span className="text-center">G/A</span>
        <span className="text-center">Tir</span>
        <span className="text-center">Par</span>
        <span className="text-center">Duelos</span>
      </div>
      <div className="px-2.5 pb-1.5">
        {actors.map((a) => {
          const t = tally.get(a.uid) ?? zero()
          const info = ELEMENT_INFO[a.element]
          return (
            <div
              key={a.uid}
              className={`grid grid-cols-[minmax(0,1.6fr)_1fr_1fr_repeat(4,minmax(20px,0.35fr))] gap-x-1.5 items-center py-[3px] border-b border-slate-900 last:border-0 ${a.injured ? 'opacity-60' : ''}`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="relative w-6 h-6 shrink-0 rounded-md overflow-hidden border border-slate-700 bg-slate-900">
                  <ImgFallback
                    src={portraitUrl(a.baseId)}
                    className="w-full h-full object-cover object-top"
                    alt={a.name}
                    fallback={<span className="grid place-items-center w-full h-full text-[8px] font-bold" style={{ color: info.color }}>{a.name.slice(0, 2)}</span>}
                  />
                  {a.injured && <InjuryCross className="absolute -top-0.5 -right-0.5 w-3 h-3" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold leading-tight truncate">{a.name.split(' ')[0]}</span>
                  <span className="block text-[7px] leading-tight text-slate-500">{a.position}</span>
                </span>
              </span>
              <MiniBar value={a.pt} max={Math.max(1, a.ptMax)} color="#38bdf8" text={`${a.pt}`} />
              <MiniBar value={a.stamina} max={100} color={staminaColor(a.stamina)} text={`${Math.round(a.stamina)}`} />
              <span className="text-center text-[10px] font-bold tabular-nums">
                {t.goals > 0 || t.assists > 0
                  ? <span className="text-emerald-300">{t.goals}/{t.assists}</span>
                  : <span className="text-slate-600">–</span>}
              </span>
              <Num v={t.shots} />
              <Num v={t.saves} />
              <span className="text-center text-[10px] tabular-nums">
                {t.duelsW + t.duelsL > 0
                  ? <><span className="font-bold text-emerald-300">{t.duelsW}</span><span className="text-slate-600">-</span><span className="text-rose-300">{t.duelsL}</span></>
                  : <span className="text-slate-600">–</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Num({ v }: { v: number }) {
  return (
    <span className={`text-center text-[10px] font-bold tabular-nums ${v > 0 ? 'text-slate-200' : 'text-slate-600'}`}>
      {v > 0 ? v : '–'}
    </span>
  )
}

/** Barra fina con su número al lado: PT y aguante en una sola línea. */
function MiniBar({ value, max, color, text }: { value: number; max: number; color: string; text: string }) {
  return (
    <span className="flex items-center gap-1 min-w-0">
      <span className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
        <span className="block h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
      </span>
      <span className="shrink-0 text-[8px] tabular-nums text-slate-400 w-5 text-right">{text}</span>
    </span>
  )
}
