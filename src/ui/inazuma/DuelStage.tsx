// ESCENARIO DE DUELO: el cara a cara que se planta encima del partido cada vez
// que hay una interacción de verdad (regate contra bloqueo, tiro contra
// parada) y la cuenta EN ORDEN: entra el atacante con su técnica, entra el
// defensor con la suya, pausa, y el sello del desenlace.
//
// Sustituye al antiguo corte de técnica suelta: enseñaba QUÉ se lanzaba pero
// no contra quién ni cómo acababa, y con dos técnicas seguidas se solapaba
// todo. Aquí el partido está PARADO mientras dura (la cola de revelado del
// store no avanza hasta que el escenario ha tenido su tiempo).
import { useEffect, useRef, useState } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { getTechnique, TECHNIQUES } from '@/data/inazuma/techniques'
import { Crest, ELEMENT_ICON, rarityBorder, techniqueImage } from '@/ui/inazuma/Glyphs'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import type { Technique } from '@/engine/inazuma/types'


export interface StageSide {
  name: string
  baseId?: string
  /** Rareza 1-4: colorea el marco del retrato. */
  rarity?: number
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
  /** Escudos de cada bando, para saber QUIÉN ataca y quién defiende. */
  attackerCrest?: string
  defenderCrest?: string
  kind: 'regate' | 'tiro' | 'penalti' | 'pase'
}

const idOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const BY_NAME = new Map(TECHNIQUES.map((t) => [t.name.toLowerCase(), t.id]))

/** Técnica del catálogo a partir del nombre que traen los eventos del motor. */
export function techniqueByName(name: string | undefined): Technique | undefined {
  if (!name) return undefined
  return getTechnique(idOf(name)) ?? (BY_NAME.has(name.toLowerCase()) ? getTechnique(BY_NAME.get(name.toLowerCase())!) : undefined)
}

/**
 * LÍNEA DE TIEMPO por clase de duelo (fases):
 *  0 atacante · 1 defensor + CHOQUE · 2 PROTAGONISTA a pantalla grande (la
 *  técnica en foto gigante, o la acción a pelo, con la foto y el nombre del
 *  que la hace) · y en los TIROS: 3 cinemática de la PARADA del portero con
 *  la barra de suspense cargando ENCIMA · 4 desenlace (sello de paradón, o
 *  cierre y celebración con el balón perforando la red).
 * El regate resuelve en la fase 2 (el protagonista ES el ganador del duelo).
 */
const TL = {
  pase: { defender: 500, end: 1700 },
  regate: { defender: 600, show: 1500, end: 3400 },
  tiro: { defender: 600, show: 1450, keeper: 2700, outcome: 3800, endGoal: 3950, endSave: 5400 },
} as const

export default function DuelStage({ stage, onDone }: { stage: StageData | null; onDone: () => void }) {
  const [shown, setShown] = useState<StageData | null>(null)
  const [phase, setPhase] = useState(0)
  // `onDone` entra por ref: si estuviera en las deps del efecto, un padre que
  // lo pase inline (identidad nueva en cada render) reiniciaría el escenario a
  // mitad — el duelo se veía DOS veces. La animación solo depende del duelo.
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!stage) return
    setShown(stage)
    setPhase(0)
    const shooting = stage.kind === 'tiro' || stage.kind === 'penalti'
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))
    if (stage.kind === 'pase') {
      at(TL.pase.defender, () => setPhase(1))
      at(TL.pase.end, () => { setShown(null); onDoneRef.current() })
    } else if (!shooting) {
      at(TL.regate.defender, () => setPhase(1))
      at(TL.regate.show, () => setPhase(2))
      at(TL.regate.end, () => { setShown(null); onDoneRef.current() })
    } else {
      at(TL.tiro.defender, () => setPhase(1))
      at(TL.tiro.show, () => setPhase(2))
      at(TL.tiro.keeper, () => setPhase(3))
      at(TL.tiro.outcome, () => setPhase(4))
      // El GOL no se cuenta aquí: el escenario cierra y la celebración (con la
      // red perforada) toma el relevo. La parada sí: sello sobre el paradón.
      at(stage.attackerWins ? TL.tiro.endGoal : TL.tiro.endSave, () => { setShown(null); onDoneRef.current() })
    }
    return () => timers.forEach(clearTimeout)
  }, [stage])

  if (!shown) return null
  const atkTech = techniqueByName(shown.attacker.techName)
  const defTech = techniqueByName(shown.defender.techName)
  const shooting = shown.kind === 'tiro' || shown.kind === 'penalti'

  // CADA CLASE DE DUELO CON SU CARA: sin el rótulo (y su color), un regate
  // contra un bloqueo y un disparo contra el portero se veían idénticos.
  const kindBanner = shown.kind === 'regate'
    ? { text: 'DUELO POR EL BALÓN', color: '#38bdf8' }
    : shown.kind === 'penalti'
      ? { text: '¡PENALTI!', color: '#f59e0b' }
      : shown.kind === 'pase'
        ? { text: 'PASE AL HUECO', color: '#22c55e' }
        : { text: '¡DISPARO A PUERTA!', color: '#f43f5e' }

  const winnerMine = shown.attackerWins ? shown.attackerMine : !shown.attackerMine
  const resultColor = winnerMine ? '#22c55e' : '#f43f5e'

  // El PROTAGONISTA de la fase 2: en el regate, el GANADOR del duelo con lo
  // que hizo; en el tiro, el que dispara (el desenlace aún no se sabe).
  const star = shooting || shown.attackerWins
    ? { side: shown.attacker, tech: atkTech, crest: shown.attackerCrest, action: shooting ? '¡DISPARO!' : '¡REGATE!' }
    : { side: shown.defender, tech: defTech, crest: shown.defenderCrest, action: shown.kind === 'regate' ? '¡ENTRADA!' : '¡BLOQUEO!' }

  return (
    <div key={shown.key} className="absolute inset-0 z-[60] pointer-events-none">
      <div className="absolute inset-0 bg-slate-950/70 animate-fade-in" />
      {/* TINTE por clase de duelo: azul el regate, rojo el disparo, ámbar el
          penalti. El color se lee antes que el texto. */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: `radial-gradient(circle at 50% 42%, ${kindBanner.color}2e, transparent 72%)` }}
      />
      <div
        className="absolute inset-x-0 top-0 h-1 animate-fade-in"
        style={{ background: kindBanner.color }}
      />

      {/* FASES 0-1: el cara a cara (queda de fondo cuando entra el grande). */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 transition-opacity duration-300 ${phase >= 2 ? 'opacity-15' : ''}`}>
        <div
          className="rounded-full border-2 px-4 py-1 text-[12px] font-black uppercase tracking-widest animate-pop-in"
          style={{ color: kindBanner.color, borderColor: kindBanner.color, background: 'rgba(2,6,23,.85)' }}
        >
          {kindBanner.text}
        </div>
        <Fighter
          side={shown.attacker}
          tech={atkTech}
          label={shown.kind === 'pase' ? 'pasa' : shown.kind === 'regate' ? 'ataca' : 'dispara'}
          crest={shown.attackerCrest}
          plain={shown.kind === 'pase'}
        />

        {/* VS y el defensor entran DESPUÉS: el orden cuenta la jugada. En el
            pase no hay «contra»: el segundo es el COMPAÑERO que recibe. */}
        {phase >= 1 && (
          <>
            <div className="relative text-xl font-black text-white/70 animate-pop-in leading-none">
              {shown.kind === 'pase' ? '→' : 'VS'}
              {/* El CHOQUE: un fogonazo cuando las dos propuestas se cruzan. */}
              {shown.kind !== 'pase' && (
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full animate-clash-pop"
                  style={{ background: `radial-gradient(circle, #ffffffcc, ${kindBanner.color}55 55%, transparent 70%)` }} />
              )}
            </div>
            <Fighter
              side={shown.defender}
              tech={defTech}
              label={shown.kind === 'pase' ? 'recibe' : shown.kind === 'regate' ? 'defiende' : 'bajo palos'}
              crest={shown.defenderCrest}
              plain={shown.kind === 'pase'}
              right
            />
          </>
        )}
      </div>

      {/* FASE 2: el PROTAGONISTA a pantalla grande — su técnica en foto
          gigante (o la acción a pelo) con SU retrato y el nombre de lo que
          hace. En el tiro, el que dispara. */}
      {phase === 2 && shown.kind !== 'pase' && (
        <Showcase
          side={star.side}
          tech={star.tech}
          crest={star.crest}
          fallbackAction={star.action}
          color={kindBanner.color}
          stamp={!shooting ? {
            text: shown.attackerWins ? '¡SE ESCAPA!' : '¡BALÓN ROBADO!',
            color: resultColor,
            crest: shown.attackerWins ? shown.attackerCrest : shown.defenderCrest,
          } : undefined}
        />
      )}
      {/* El regate mantiene su desenlace en pantalla hasta el cierre. */}
      {phase > 2 && !shooting && shown.kind !== 'pase' && (
        <Showcase
          side={star.side}
          tech={star.tech}
          crest={star.crest}
          fallbackAction={star.action}
          color={kindBanner.color}
          stamp={{
            text: shown.attackerWins ? '¡SE ESCAPA!' : '¡BALÓN ROBADO!',
            color: resultColor,
            crest: shown.attackerWins ? shown.attackerCrest : shown.defenderCrest,
          }}
        />
      )}

      {/* FASES 3-4 (tiros): la cinemática de LA PARADA — el portero con su
          técnica en grande — y la barra de suspense cargando ENCIMA mientras
          tanto. El desenlace cae sobre ella: sello de paradón, o cierre (la
          red la perfora la celebración de gol). */}
      {shooting && phase >= 3 && (
        <>
          <Showcase
            side={shown.defender}
            tech={defTech}
            crest={shown.defenderCrest}
            fallbackAction="¡PARADA!"
            color="#22c55e"
            stamp={phase >= 4 && !shown.attackerWins
              ? { text: '¡PARADÓN!', color: resultColor, crest: shown.defenderCrest }
              : undefined}
          />
          {phase === 3 && (
            <div className="absolute inset-x-8 bottom-[10%] z-10 flex flex-col items-center gap-1.5">
              <div className="text-lg font-black uppercase tracking-widest text-white animate-pulse drop-shadow">¿ENTRA?</div>
              <div className="w-full max-w-xs h-3 rounded-full bg-slate-950/85 border border-white/25 overflow-hidden">
                <div className="h-full rounded-full animate-suspense" style={{ background: 'linear-gradient(90deg,#38bdf8,#fbbf24,#f43f5e)' }} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * El momento estrella A PANTALLA GRANDE: la foto de la técnica ocupando el
 * centro (o el icono de la acción si va a pelo), el nombre de lo que hace en
 * letras gigantes y, si el duelo ya se resuelve aquí, el sello del desenlace.
 */
function Showcase({ side, tech, crest, fallbackAction, color, stamp }: {
  side: StageSide
  tech?: Technique
  crest?: string
  /** Rótulo si no hay técnica: la acción a pelo («¡REGATE!», «¡PARADA!»…). */
  fallbackAction: string
  color: string
  stamp?: { text: string; color: string; crest?: string }
}) {
  const info = tech ? ELEMENT_INFO[tech.element] : null
  const glow = info?.color ?? color
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 animate-pop-in">
      {/* LA FOTO, en grande de verdad — con el RETRATO y el NOMBRE del que la
          hace asomados al recuadro (antes solo un rótulo pequeño arriba). */}
      <div
        className="relative w-[min(72vw,19rem)] aspect-square rounded-3xl border-4 grid place-items-center bg-slate-950"
        style={{ borderColor: glow, boxShadow: `0 0 60px ${glow}88, 0 0 120px ${glow}44` }}
      >
        <div className="absolute inset-0 rounded-[1.25rem] overflow-hidden">
          {tech ? (
            <ImgFallback
              src={techniqueImage(tech.id)}
              alt={tech.name}
              className="w-full h-full object-cover animate-showcase-zoom"
              fallback={<Icon name={ELEMENT_ICON[tech.element]} className="w-1/2 h-1/2 m-auto mt-[25%]" style={{ color: glow }} />}
            />
          ) : (
            <div className="w-full h-full grid place-items-center animate-showcase-zoom"
              style={{ background: `radial-gradient(circle at 50% 45%, ${glow}33, #020617 75%)` }}>
              <Icon name={KIND_FALLBACK_ICON[fallbackAction] ?? 'bolt'} className="w-1/2 h-1/2" style={{ color: glow }} />
            </div>
          )}
        </div>
        {/* El JUGADOR, asomado a la esquina del recuadro. */}
        <div className="absolute -top-5 -left-3 flex items-center gap-1.5">
          <div
            className="relative w-14 h-14 rounded-full overflow-hidden border-[3px] bg-slate-900 shadow-xl"
            style={{ borderColor: side.rarity === 4 ? 'transparent' : side.rarity ? rarityBorder(side.rarity) : glow }}
          >
            <ImgFallback
              src={side.baseId ? portraitUrl(side.baseId) : ''}
              alt={side.name}
              className="w-full h-full object-cover object-top"
              fallback={<span className="grid place-items-center w-full h-full text-sm font-extrabold text-white">
                {side.name.slice(0, 2).toUpperCase()}
              </span>}
            />
            {side.rarity === 4 && <span className="mc-ring rounded-full" />}
          </div>
          {crest && <Crest teamId={crest} className="w-6 h-6 drop-shadow" />}
        </div>
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 max-w-[90%] truncate px-3 py-0.5 rounded-full bg-slate-950/95 border border-white/25 text-[13px] font-extrabold text-white shadow-lg">
          {side.name}
        </span>
      </div>
      {/* El NOMBRE de lo que hace, gigante. */}
      <div
        className="max-w-full px-4 py-1 rounded-2xl bg-slate-950/85 border-2 text-center text-2xl font-black uppercase tracking-wide leading-tight truncate"
        style={{ color: glow, borderColor: `${glow}aa`, textShadow: `0 0 18px ${glow}` }}
      >
        {tech ? `¡${tech.name}!` : fallbackAction}
      </div>
      {stamp && (
        <div
          className="px-5 py-1.5 rounded-2xl border-4 bg-slate-950/90 text-2xl font-black uppercase tracking-wider animate-goal flex items-center gap-2"
          style={{ color: stamp.color, borderColor: stamp.color, transform: 'rotate(-4deg)' }}
        >
          {stamp.crest && <Crest teamId={stamp.crest} className="w-7 h-7" />}
          {stamp.text}
        </div>
      )}
    </div>
  )
}

/** Icono para la acción SIN técnica del protagonista. */
const KIND_FALLBACK_ICON: Record<string, string> = {
  '¡REGATE!': 'dribble',
  '¡ENTRADA!': 'shield',
  '¡BLOQUEO!': 'shield',
  '¡DISPARO!': 'shoot',
  '¡PARADA!': 'glove',
}

/** Un lado del duelo: retrato + nombre + su técnica (imagen real) o la acción simple. */
function Fighter({ side, tech, label, right, crest, plain }: {
  side: StageSide
  tech?: Technique
  label: string
  right?: boolean
  /** Escudo del equipo del luchador, en grande a su lado. */
  crest?: string
  /** Sin hueco de técnica (los pases no llevan): retrato y nombre a secas. */
  plain?: boolean
}) {
  const info = tech ? ELEMENT_INFO[tech.element] : null
  return (
    <div className={`flex items-center gap-3 w-full max-w-sm ${right ? 'flex-row-reverse animate-slide-left' : 'animate-slide-right'}`}>
      {crest && <Crest teamId={crest} className="w-9 h-9 shrink-0 drop-shadow" />}
      <div className="relative shrink-0">
        <div
          className="relative w-16 h-16 rounded-full overflow-hidden border-4 bg-slate-900 shadow-xl"
          // Legendario = anillo multicolor animado, no el borde rosa plano.
          style={{ borderColor: side.rarity === 4 ? 'transparent' : side.rarity ? rarityBorder(side.rarity) : (info?.color ?? '#64748b') }}
        >
          <ImgFallback
            src={side.baseId ? portraitUrl(side.baseId) : ''}
            alt={side.name}
            className="w-full h-full object-cover object-top"
            fallback={<span className="grid place-items-center w-full h-full text-base font-extrabold text-white">
              {side.name.slice(0, 2).toUpperCase()}
            </span>}
          />
          {side.rarity === 4 && <span className="mc-ring rounded-full" />}
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
      ) : plain ? null : (
        <div className="shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-white/20 grid place-items-center text-[10px] font-bold text-white/40 text-center px-1">
          sin
          <br />
          técnica
        </div>
      )}
    </div>
  )
}

