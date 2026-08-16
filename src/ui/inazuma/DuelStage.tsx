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
import { TEAM_BY_ID } from '@/data/inazuma/teams'
import { Crest, ELEMENT_ICON, rarityBorder, TechIcons, techniqueImage } from '@/ui/inazuma/Glyphs'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import type { Element, Technique } from '@/engine/inazuma/types'


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
  /** Probabilidad real del atacante (0-1): la barra de suspense la enseña. */
  chance?: number
  /** Elemento del disparo (técnica o tirador): tiñe las LLAMAS del balón. */
  element?: Element
  /** Marcador de la TANDA (solo penaltis): se planta en grande en escena. */
  shootoutScore?: [number, number]
  kind: 'regate' | 'tiro' | 'penalti' | 'pase'
}

const idOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const BY_NAME = new Map(TECHNIQUES.map((t) => [t.name.toLowerCase(), t.id]))

/** Técnica del catálogo a partir del nombre que traen los eventos del motor. */
export function techniqueByName(name: string | undefined): Technique | undefined {
  if (!name) return undefined
  return getTechnique(idOf(name)) ?? (BY_NAME.has(name.toLowerCase()) ? getTechnique(BY_NAME.get(name.toLowerCase())!) : undefined)
}

/** Colores de camiseta del equipo del escudo: el REBORDE de la cinemática. */
function kitOf(crest: string | undefined): [string, string] | undefined {
  return crest ? TEAM_BY_ID.get(crest)?.kit : undefined
}

/**
 * LÍNEA DE TIEMPO por clase de duelo (fases):
 *  0 atacante · 1 defensor + CHOQUE · 2 PROTAGONISTA a pantalla grande (la
 *  técnica en foto gigante, o la acción a pelo, con la foto y el nombre del
 *  que la hace) · y en los TIROS: 3 el BALÓN volando a puerta envuelto en
 *  llamas de su elemento · 4 cinemática de la PARADA del portero con la barra
 *  de suspense cargando ENCIMA · 5 desenlace (sello de paradón, o cierre y
 *  celebración con el balón perforando la red).
 * El regate resuelve en la fase 2 (el protagonista ES el ganador del duelo).
 * Tiempos holgados A PROPÓSITO: el playtest cantó que las técnicas «se
 * esfumaban» antes de poder leerlas.
 */
const TL = {
  pase: { defender: 500, end: 1700 },
  regate: { defender: 600, show: 1600, end: 3900 },
  tiro: { defender: 650, show: 1600, flight: 3400, keeper: 4550, outcome: 5950, endGoal: 6100, endSave: 7800 },
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
      at(TL.tiro.flight, () => setPhase(3))
      at(TL.tiro.keeper, () => setPhase(4))
      at(TL.tiro.outcome, () => setPhase(5))
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

  // Las LLAMAS del balón: el elemento de la técnica de tiro, o el del tirador.
  const shotElement: Element | undefined = atkTech?.element ?? shown.element
  const flameColor = shotElement ? ELEMENT_INFO[shotElement].color : kindBanner.color

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

      {/* ESCENOGRAFÍA DE PENALTI: la portería de frente con su red, el punto
          de penalti y la tanda en grande — que se sienta la ceremonia, no un
          lance más del juego. */}
      {shown.kind === 'penalti' && phase !== 3 && (
        <div className="absolute inset-0 animate-fade-in pointer-events-none">
          <GoalNet className="absolute inset-x-0 top-[6%] mx-auto w-[86%] opacity-45" />
          {shown.shootoutScore && (
            <div className="absolute top-[4%] left-1/2 -translate-x-1/2 px-4 py-1 rounded-2xl border-2 border-amber-400/80 bg-slate-950/90 text-2xl font-black tabular-nums text-amber-200 shadow-lg">
              {shown.shootoutScore[0]} – {shown.shootoutScore[1]}
            </div>
          )}
        </div>
      )}

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
          gigante (o la acción a pelo) con SU retrato, el reborde con los
          colores de SU equipo y el nombre DENTRO de la imagen. */}
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

      {/* FASE 3 (tiros): EL BALÓN VUELA A PUERTA envuelto en llamas del color
          del elemento del disparo. El disparo ya se ha visto; la parada aún
          no: este es el viaje entre las dos. */}
      {shooting && phase === 3 && (
        <BallFlight color={flameColor} shooter={shown.attacker.name} />
      )}

      {/* FASES 4-5 (tiros): la cinemática de LA PARADA — el portero con su
          técnica en grande — y la barra de suspense cargando ENCIMA mientras
          tanto. El desenlace cae sobre ella: sello de paradón, o cierre (la
          red la perfora la celebración de gol). */}
      {shooting && phase >= 4 && (
        <>
          <Showcase
            side={shown.defender}
            tech={defTech}
            crest={shown.defenderCrest}
            fallbackAction="¡PARADA!"
            color="#22c55e"
            stamp={phase >= 5 && !shown.attackerWins
              ? { text: '¡PARADÓN!', color: resultColor, crest: shown.defenderCrest }
              : undefined}
          />
          {phase === 4 && (
            <div className="absolute inset-x-8 bottom-[10%] z-10 flex flex-col items-center gap-1.5">
              <div className="text-lg font-black uppercase tracking-widest text-white animate-pulse drop-shadow">
                ¿ENTRA?
                {/* La probabilidad REAL del disparo (stats + técnica + elemento
                    + fatiga + racha): que el desenlace nunca parezca un dado
                    sin reglas. */}
                {shown.chance != null && (
                  <span className="ml-2 text-amber-300">{Math.round(shown.chance * 100)} %</span>
                )}
              </div>
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

/** La portería de frente con su red: escenografía compartida (penalti y vuelo). */
function GoalNet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 300" className={className}>
      <path d="M30 250V40h360v210" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
      <g stroke="rgba(255,255,255,.4)" strokeWidth="1.6" fill="none">
        {Array.from({ length: 15 }, (_, i) => (
          <path key={`v${i}`} d={`M${44 + i * 24} 44 Q ${44 + i * 24} 150 ${50 + i * 22.8} 246`} />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <path key={`h${i}`} d={`M34 ${50 + i * 26} Q 210 ${58 + i * 28} 386 ${50 + i * 26}`} />
        ))}
      </g>
      <circle cx="210" cy="282" r="6" fill="rgba(255,255,255,.5)" />
    </svg>
  )
}

/**
 * EL VIAJE DEL BALÓN: tras la técnica de tiro, el balón sale disparado hacia
 * la portería del fondo envuelto en llamas del color del elemento del disparo
 * (fuego rojo, bosque verde, aire azul, montaña ocre). Encoge según se aleja:
 * perspectiva de andar por casa, pero se LEE.
 */
function BallFlight({ color, shooter }: { color: string; shooter: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none animate-fade-in">
      <GoalNet className="absolute inset-x-0 top-[8%] mx-auto w-[72%] opacity-40" />
      {/* El balón (con su estela y su aura de llamas) vuela de abajo arriba. */}
      <div className="absolute left-1/2 top-[16%] animate-ball-flight">
        <div className="relative w-16 h-16">
          {/* Aura de llamas: dos capas desfasadas que parpadean. */}
          <div
            className="absolute -inset-6 rounded-full blur-md animate-flame-flicker"
            style={{ background: `radial-gradient(circle, ${color}e6, ${color}66 55%, transparent 78%)` }}
          />
          <div
            className="absolute -inset-2 rounded-full blur-[3px]"
            style={{ background: `radial-gradient(circle, #ffffff88, ${color}bb 65%, transparent 85%)` }}
          />
          {/* Estela: cono de fuego que queda POR DEBAJO del balón que sube. */}
          <div
            className="absolute left-1/2 top-[65%] -translate-x-1/2 w-10 h-32 blur-md"
            style={{ background: `linear-gradient(to bottom, ${color}cc, ${color}44 55%, transparent)` }}
          />
          {/* El balón. */}
          <div
            className="relative w-full h-full rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #ffffff, #cbd5e1 62%, #64748b)',
              boxShadow: 'inset -5px -7px 12px rgba(0,0,0,.4)',
            }}
          />
        </div>
      </div>
      <div
        className="absolute inset-x-0 bottom-[14%] text-center text-xl font-black uppercase tracking-widest drop-shadow animate-pop-in"
        style={{ color, textShadow: `0 0 18px ${color}` }}
      >
        ¡Allá va el disparo de {shooter}!
      </div>
    </div>
  )
}

/**
 * El momento estrella A PANTALLA GRANDE: la foto de la técnica ocupando el
 * centro con el REBORDE en los colores del equipo del que la hace, el nombre
 * de lo que lanza INTEGRADO dentro de la propia imagen (banda inferior) y, si
 * el duelo ya se resuelve aquí, el sello del desenlace.
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
  // El REBORDE del recuadro son los colores de la camiseta del equipo del que
  // la usa (con el brillo elemental por detrás). Sin kit, el color elemental.
  const kit = kitOf(crest)
  const frame = kit ? `linear-gradient(135deg, ${kit[0]} 0%, ${kit[0]} 42%, ${kit[1]} 58%, ${kit[1]} 100%)` : glow
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 animate-pop-in">
      {/* LA FOTO, en grande de verdad, enmarcada con la camiseta del equipo. */}
      <div
        className="relative w-[min(74vw,20rem)] aspect-square rounded-3xl p-[5px]"
        style={{ background: frame, boxShadow: `0 0 60px ${glow}88, 0 0 120px ${glow}44` }}
      >
        <div className="relative w-full h-full rounded-[1.15rem] overflow-hidden bg-slate-950">
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
          {/* El NOMBRE de lo que hace, DENTRO de la imagen: banda inferior con
              su clase y su elemento delante. Ya no hay rótulo suelto que se
              esfume fuera del cuadro. */}
          <div
            className="absolute inset-x-0 bottom-0 px-3 pt-8 pb-2 text-center"
            style={{ background: 'linear-gradient(to top, rgba(2,6,23,.94) 40%, rgba(2,6,23,.6) 70%, transparent)' }}
          >
            <div
              className="text-[21px] font-black uppercase tracking-wide leading-tight truncate"
              style={{ color: glow, textShadow: `0 0 16px ${glow}` }}
            >
              {tech && <TechIcons tech={tech} className="w-5 h-5 mr-1.5" />}
              {tech ? `¡${tech.name}!` : fallbackAction}
            </div>
          </div>
        </div>
        {/* El JUGADOR, asomado a la esquina del recuadro: retrato, escudo y
            nombre (el nombre grande de dentro es el de la TÉCNICA). */}
        <div className="absolute -top-5 -left-3 flex items-center gap-1.5 max-w-[95%]">
          <div
            className="relative shrink-0 w-14 h-14 rounded-full overflow-hidden border-[3px] bg-slate-900 shadow-xl"
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
          {crest && <Crest teamId={crest} className="w-6 h-6 shrink-0 drop-shadow" />}
          <span className="min-w-0 truncate px-2.5 py-0.5 rounded-full bg-slate-950/95 border border-white/25 text-[12px] font-extrabold text-white shadow-lg">
            {side.name}
          </span>
        </div>
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
            className="max-w-[8.5rem] inline-flex items-center gap-1 truncate px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-950/85 border"
            style={{ color: info!.color, borderColor: `${info!.color}88` }}
          >
            <TechIcons tech={tech} className="w-2.5 h-2.5" />
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
