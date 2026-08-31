// LA TANDA DE PENALTIS, versión moderna: una escena de CARRERILLA (lanzador
// contra portero, cara a cara, sin desenlace a la vista) y el MARCADOR de la
// tanda por puntos (gol, fallo, pendiente) construido SOLO con lo ya contado
// — nada de leer el motor en vivo, que destriparía el resultado.
import { ImgFallback } from '@/ui/components/kit'
import { PENALTY_ROUNDS, playerSide } from '@/engine/inazuma/match'
import { techniqueByName } from '@/ui/inazuma/DuelStage'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { TechniqueBadge } from '@/ui/inazuma/Glyphs'
import Icon from '@/ui/components/Icon'
import type { MatchEvent, MatchState } from '@/engine/inazuma/types'

export interface PenaltyFx {
  key: number
  round: number
  mine: boolean
  shooter: { name: string; baseId?: string }
  keeper: { name: string; baseId?: string }
  tech?: string
  power?: number
}

/** Retrato grande de un protagonista del penalti. */
function Face({ name, baseId, label, color }: { name: string; baseId?: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-20 h-20 rounded-2xl overflow-hidden border-2 bg-slate-900 grid place-items-center"
        style={{ borderColor: color, boxShadow: `0 0 22px ${color}66` }}
      >
        <ImgFallback
          src={portraitUrl(baseId ?? '')}
          className="w-full h-full object-cover object-top"
          alt={name}
          fallback={<span className="text-xl font-black text-slate-400">{name.slice(0, 2).toUpperCase()}</span>}
        />
      </div>
      <div className="text-[12px] font-extrabold text-slate-100">{name.split(' ')[0]}</div>
      <div className="text-[8px] uppercase tracking-widest text-slate-400">{label}</div>
    </div>
  )
}

/**
 * La ESCENA de la carrerilla: se pinta al revelarse `penaltyKick` y la retira
 * el veredicto. No dice nada del desenlace — solo quién contra quién.
 */
export function PenaltyScene({ fx }: { fx: PenaltyFx }) {
  const tech = fx.tech ? techniqueByName(fx.tech) : undefined
  return (
    <div key={fx.key} className="absolute inset-0 z-[58] grid place-items-center pointer-events-none">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] animate-fade-in" />
      <div className="relative flex flex-col items-center gap-2.5 animate-pop-in px-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-black">
          Tanda de penaltis · lanzamiento {fx.round}
        </div>
        <div className="flex items-center gap-5">
          <Face name={fx.shooter.name} baseId={fx.shooter.baseId} label="lanza" color={fx.mine ? '#34d399' : '#f87171'} />
          <span className="text-lg font-black text-slate-500">VS</span>
          <Face name={fx.keeper.name} baseId={fx.keeper.baseId} label="bajo palos" color={fx.mine ? '#f87171' : '#34d399'} />
        </div>
        {tech && (
          <div
            className="flex items-center gap-2 rounded-xl border px-2.5 py-1.5 bg-slate-950/85"
            style={{ borderColor: ELEMENT_INFO[tech.element].color }}
          >
            <TechniqueBadge tech={tech} size={26} />
            <span className="text-[12px] font-extrabold" style={{ color: ELEMENT_INFO[tech.element].color }}>
              {fx.tech}
            </span>
            {fx.power != null && (
              <span className="text-[11px] font-black tabular-nums text-amber-300">{fx.power} <span className="text-[8px] text-slate-400 font-bold">POT</span></span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * El MARCADOR de la tanda: un punto por lanzamiento (verde = gol, rojo = fallo,
 * hueco = pendiente), fila por equipo. Se alimenta del FEED revelado: enseña
 * exactamente lo contado, ni un penalti más.
 */
export function ShootoutBoard({ feed, match, myName, theirName }: {
  feed: MatchEvent[]
  match: MatchState
  myName: string
  theirName: string
}) {
  const mine = playerSide(match)
  const kicks = feed.filter((e): e is Extract<MatchEvent, { kind: 'penalty' }> => e.kind === 'penalty')
  const mineKicks = kicks.filter((e) => e.side === mine).map((e) => e.scored)
  const theirKicks = kicks.filter((e) => e.side !== mine).map((e) => e.scored)
  // En muerte súbita la tanda crece: siempre se enseña al menos un hueco más.
  const slots = Math.max(PENALTY_ROUNDS, Math.max(mineKicks.length, theirKicks.length) + (match.phase === 'finished' ? 0 : 1))
  const row = (name: string, results: boolean[], goals: number) => (
    <div className="flex items-center gap-1.5">
      <span className="w-20 truncate text-[10px] font-extrabold text-slate-200">{name}</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: slots }).map((_, i) => {
          const r = results[i]
          return r === undefined ? (
            <span key={i} className="w-3 h-3 rounded-full border border-slate-600 bg-slate-800/60" />
          ) : r ? (
            <span key={i} className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-200/70" style={{ boxShadow: '0 0 6px rgba(52,211,153,.7)' }} />
          ) : (
            <span key={i} className="grid place-items-center w-3 h-3 rounded-full bg-rose-500/90 border border-rose-300/70">
              <Icon name="x" className="w-2 h-2 text-white" />
            </span>
          )
        })}
      </div>
      <span className="ml-auto text-[13px] font-black tabular-nums text-slate-100">{goals}</span>
    </div>
  )
  const mineGoals = mineKicks.filter(Boolean).length
  const theirGoals = theirKicks.filter(Boolean).length
  return (
    <div className="mx-2 mt-1.5 rounded-xl border border-amber-500/40 bg-slate-950/85 px-2.5 py-1.5 flex flex-col gap-1">
      <div className="text-[8px] uppercase tracking-[0.25em] text-amber-300/90 font-black text-center">Tanda de penaltis</div>
      {row(myName, mineKicks, mineGoals)}
      {row(theirName, theirKicks, theirGoals)}
    </div>
  )
}
