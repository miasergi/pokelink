// ESCENARIO DE DUELO: el cara a cara que se planta encima del partido cada vez
// que hay una interacción de verdad (regate contra bloqueo, tiro contra
// parada) y la cuenta EN ORDEN: entra el atacante con su técnica, entra el
// defensor con la suya, pausa, y el sello del desenlace.
//
// Sustituye al antiguo corte de técnica suelta: enseñaba QUÉ se lanzaba pero
// no contra quién ni cómo acababa, y con dos técnicas seguidas se solapaba
// todo. Aquí el partido está PARADO mientras dura (la cola de revelado del
// store no avanza hasta que el escenario ha tenido su tiempo).
import { useEffect, useState } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { getTechnique, TECHNIQUES } from '@/data/inazuma/techniques'
import { ELEMENT_ICON, techniqueImage } from '@/ui/inazuma/Glyphs'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import type { Technique } from '@/engine/inazuma/types'

/** Duración total del escenario. El hold del store para estos eventos es mayor. */
const STAGE_MS = 3300
/** Cuándo entra cada fase (ms desde que aparece). */
const T_DEFENDER = 650
const T_RESULT = 1750

export interface StageSide {
  name: string
  baseId?: string
  /** Nombre de la técnica usada; sin él se pinta la acción simple. */
  techName?: string
}

export interface StageData {
  /** Clave única: reinicia la animación aunque se repita el duelo. */
  key: number
  attacker: StageSide
  defender: StageSide
  attackerWins: boolean
  /** true si el ATACANTE es tuyo (colorea el sello). */
  attackerMine: boolean
  kind: 'regate' | 'tiro' | 'penalti'
}

const idOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const BY_NAME = new Map(TECHNIQUES.map((t) => [t.name.toLowerCase(), t.id]))

/** Técnica del catálogo a partir del nombre que traen los eventos del motor. */
export function techniqueByName(name: string | undefined): Technique | undefined {
  if (!name) return undefined
  return getTechnique(idOf(name)) ?? (BY_NAME.has(name.toLowerCase()) ? getTechnique(BY_NAME.get(name.toLowerCase())!) : undefined)
}

export default function DuelStage({ stage, onDone }: { stage: StageData | null; onDone: () => void }) {
  const [shown, setShown] = useState<StageData | null>(null)
  const [phase, setPhase] = useState(0) // 0 atacante · 1 defensor · 2 desenlace

  useEffect(() => {
    if (!stage) return
    setShown(stage)
    setPhase(0)
    const t1 = setTimeout(() => setPhase(1), T_DEFENDER)
    const t2 = setTimeout(() => setPhase(2), T_RESULT)
    const t3 = setTimeout(() => { setShown(null); onDone() }, STAGE_MS)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [stage, onDone])

  if (!shown) return null
  const atkTech = techniqueByName(shown.attacker.techName)
  const defTech = techniqueByName(shown.defender.techName)

  const result = shown.attackerWins
    ? (shown.kind === 'regate' ? '¡SE ESCAPA!' : '¡SUPERA AL PORTERO!')
    : (shown.kind === 'regate' ? '¡BALÓN ROBADO!' : '¡PARADÓN!')
  const winnerMine = shown.attackerWins ? shown.attackerMine : !shown.attackerMine
  const resultColor = winnerMine ? '#22c55e' : '#f43f5e'

  return (
    <div key={shown.key} className="absolute inset-0 z-[60] pointer-events-none">
      <div className="absolute inset-0 bg-slate-950/70 animate-fade-in" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
        <Fighter side={shown.attacker} tech={atkTech} label={shown.kind === 'regate' ? 'ataca' : 'dispara'} />

        {/* VS y el defensor entran DESPUÉS: el orden cuenta la jugada. */}
        {phase >= 1 && (
          <>
            <div className="text-xl font-black text-white/70 animate-pop-in leading-none">VS</div>
            <Fighter
              side={shown.defender}
              tech={defTech}
              label={shown.kind === 'regate' ? 'defiende' : 'bajo palos'}
              right
            />
          </>
        )}

        {phase >= 2 && (
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-fit px-5 py-2 rounded-2xl border-4 bg-slate-950/90 text-2xl font-black uppercase tracking-wider animate-goal"
            style={{ color: resultColor, borderColor: resultColor, transform: 'rotate(-5deg)' }}
          >
            {result}
          </div>
        )}
      </div>
    </div>
  )
}

/** Un lado del duelo: retrato + nombre + su técnica (imagen real) o la acción simple. */
function Fighter({ side, tech, label, right }: {
  side: StageSide
  tech?: Technique
  label: string
  right?: boolean
}) {
  const info = tech ? ELEMENT_INFO[tech.element] : null
  return (
    <div className={`flex items-center gap-3 w-full max-w-sm ${right ? 'flex-row-reverse animate-slide-left' : 'animate-slide-right'}`}>
      <div className="relative shrink-0">
        <div
          className="w-16 h-16 rounded-full overflow-hidden border-4 bg-slate-900 shadow-xl"
          style={{ borderColor: info?.color ?? '#64748b' }}
        >
          <ImgFallback
            src={side.baseId ? portraitUrl(side.baseId) : ''}
            alt={side.name}
            className="w-full h-full object-cover object-top"
            fallback={<span className="grid place-items-center w-full h-full text-base font-extrabold text-white">
              {side.name.slice(0, 2).toUpperCase()}
            </span>}
          />
        </div>
      </div>
      <div className={`min-w-0 flex-1 ${right ? 'text-right' : ''}`}>
        <div className="text-[13px] font-extrabold text-white truncate">{side.name}</div>
        <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
      </div>
      {/* La técnica, con su imagen real y su nombre; sin técnica, la acción a pelo. */}
      {tech ? (
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div
            className="w-24 h-24 rounded-2xl overflow-hidden border-4 grid place-items-center bg-slate-950"
            style={{ borderColor: info!.color, boxShadow: `0 0 22px ${info!.color}` }}
          >
            <ImgFallback
              src={techniqueImage(tech.id)}
              alt={tech.name}
              className="w-full h-full object-cover"
              fallback={<Icon name={ELEMENT_ICON[tech.element]} className="w-10 h-10" style={{ color: info!.color }} />}
            />
          </div>
          <span
            className="max-w-[7.5rem] truncate px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-950/85 border"
            style={{ color: info!.color, borderColor: `${info!.color}88` }}
          >
            {tech.name}
          </span>
        </div>
      ) : (
        <div className="shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-white/20 grid place-items-center text-[10px] font-bold text-white/40 text-center px-1">
          sin
          <br />
          técnica
        </div>
      )}
    </div>
  )
}

