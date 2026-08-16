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
  /** Si el balón NO va a la portería sino a un jugador (el que se cruza). */
  toUid?: string
  /** Marcador de la TANDA (solo penaltis): se planta en grande en escena. */
  shootoutScore?: [number, number]
  kind: 'regate' | 'tiro' | 'penalti' | 'pase' | 'bloqueo'
}

const idOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const BY_NAME = new Map(TECHNIQUES.map((t) => [t.name.toLowerCase(), t.id]))

/**
 * Técnica del catálogo a partir del nombre que traen los eventos del motor.
 * Los nombres pueden llegar con la VERSIÓN de la Mejora («Mano Celestial V2»):
 * se recorta para buscar en el catálogo, pero el nombre que se PINTA conserva
 * la versión (lo compone `withName`).
 */
export function techniqueByName(name: string | undefined): Technique | undefined {
  if (!name) return undefined
  const clean = name.replace(/\s+V\d+$/, '')
  const found = getTechnique(idOf(clean))
    ?? (BY_NAME.has(clean.toLowerCase()) ? getTechnique(BY_NAME.get(clean.toLowerCase())!) : undefined)
  // Se devuelve con el NOMBRE tal cual vino: si el jugador la lleva mejorada,
  // la cinemática tiene que cantar «V2».
  return found && found.name !== name ? { ...found, name } : found
}

/** Colores de camiseta del equipo del escudo: el REBORDE de la cinemática. */
function kitOf(crest: string | undefined): [string, string] | undefined {
  return crest ? TEAM_BY_ID.get(crest)?.kit : undefined
}

/**
 * LÍNEA DE TIEMPO por clase de duelo (fases). YA NO HAY CARA A CARA: el «VS»
 * paraba el partido para contar algo que la propia acción ya cuenta. Lo que
 * queda es la FOTO GRANDE de lo que se hace:
 *  · regate/bloqueo: 0 la supertécnica (o la acción) del que gana el duelo,
 *    con el sello del desenlace.
 *  · tiro/penalti: 0 la supertécnica del que dispara · 1 VUELO (el escenario
 *    se aparta y el balón en llamas viaja POR EL CÉSPED) · 2 la parada del
 *    portero con la barra de suspense · 3 desenlace.
 * Tiempos holgados A PROPÓSITO: el playtest cantó que las técnicas «se
 * esfumaban» antes de poder leerlas.
 */
const TL = {
  pase: { end: 1200 },
  regate: { end: 2400 },
  tiro: { flight: 1900, keeper: 3300, outcome: 4700, endGoal: 4850, endSave: 6300 },
  // El CRUCE de un defensa: el balón viaja hasta él (el escenario se aparta y
  // se ve por el césped), lanza su bloqueo y se resuelve. NO lleva la foto del
  // tirador: esa ya se vio, y repetirla era lo que hacía que el disparo
  // pareciera contarse dos veces.
  bloqueo: { block: 1200, outcome: 2500, end: 3700 },
} as const

export default function DuelStage({ stage, onDone, onFlight }: {
  stage: StageData | null
  onDone: () => void
  /** Avisa cuando el balón viaja: el CÉSPED lo pinta, no el escenario. */
  onFlight?: (active: boolean) => void
}) {
  const [shown, setShown] = useState<StageData | null>(null)
  const [phase, setPhase] = useState(0)
  // `onDone` entra por ref: si estuviera en las deps del efecto, un padre que
  // lo pase inline (identidad nueva en cada render) reiniciaría el escenario a
  // mitad — el duelo se veía DOS veces. La animación solo depende del duelo.
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const onFlightRef = useRef(onFlight)
  onFlightRef.current = onFlight
  // Si el escenario muere a mitad del vuelo (partido saltado), el césped no
  // se queda con el balón ardiendo para siempre.
  useEffect(() => () => onFlightRef.current?.(false), [])

  useEffect(() => {
    if (!stage) return
    setShown(stage)
    setPhase(0)
    const shooting = stage.kind === 'tiro' || stage.kind === 'penalti'
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))
    if (stage.kind === 'bloqueo') {
      // Fase 0: EL BALÓN VUELA hasta el que se cruza (lo pinta el césped).
      onFlightRef.current?.(true)
      at(TL.bloqueo.block, () => { setPhase(1); onFlightRef.current?.(false) })
      at(TL.bloqueo.outcome, () => setPhase(2))
      at(TL.bloqueo.end, () => { setShown(null); onDoneRef.current() })
    } else if (stage.kind === 'pase') {
      at(TL.pase.end, () => { setShown(null); onDoneRef.current() })
    } else if (!shooting) {
      at(TL.regate.end, () => { setShown(null); onDoneRef.current() })
    } else {
      // El VUELO se avisa fuera: el césped pinta el balón en llamas mientras
      // el escenario se quita de en medio.
      at(TL.tiro.flight, () => { setPhase(1); onFlightRef.current?.(true) })
      at(TL.tiro.keeper, () => { setPhase(2); onFlightRef.current?.(false) })
      at(TL.tiro.outcome, () => setPhase(3))
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
  const kindBanner = shown.kind === 'bloqueo'
    ? { text: '¡SE CRUZA EN LA TRAYECTORIA!', color: '#f59e0b' }
    : shown.kind === 'regate'
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

  // Durante el VUELO el escenario DESAPARECE: el balón en llamas lo pinta el
  // césped, y taparlo con un velo negro sería contarlo dos veces.
  if ((shooting && phase === 1) || (shown.kind === 'bloqueo' && phase === 0)) {
    return <div key={shown.key} />
  }

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
      {shown.kind === 'penalti' && (
        <div className="absolute inset-0 animate-fade-in pointer-events-none">
          <GoalNet className="absolute inset-x-0 top-[6%] mx-auto w-[86%] opacity-40" />
          {shown.shootoutScore && (
            <div className="absolute top-[4%] left-1/2 -translate-x-1/2 px-4 py-1 rounded-2xl border-2 border-amber-400/80 bg-slate-950/90 text-2xl font-black tabular-nums text-amber-200 shadow-lg">
              {shown.shootoutScore[0]} – {shown.shootoutScore[1]}
            </div>
          )}
        </div>
      )}

      {/* El RÓTULO de la clase de lance, arriba: dice de qué va esto sin
          robarle la pantalla a la foto grande. */}
      <div className="absolute inset-x-0 top-3 flex justify-center">
        <div
          className="rounded-full border-2 px-4 py-1 text-[12px] font-black uppercase tracking-widest animate-pop-in"
          style={{ color: kindBanner.color, borderColor: kindBanner.color, background: 'rgba(2,6,23,.85)' }}
        >
          {kindBanner.text}
        </div>
      </div>

      {/* FASE 0: la SUPERTÉCNICA (o la acción) a pantalla grande, con el
          retrato del que la hace, el reborde con los colores de SU equipo y
          el nombre DENTRO de la imagen. En los regates y bloqueos, además, el
          sello del desenlace: es todo lo que dura el lance. */}
      {phase === 0 && shown.kind !== 'pase' && (
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

      {/* EL CRUCE: la supertécnica del defensa que se pone en la trayectoria,
          y si el balón se queda ahí o se le escapa. */}
      {shown.kind === 'bloqueo' && phase >= 1 && (
        <Showcase
          side={shown.defender}
          tech={defTech}
          crest={shown.defenderCrest}
          fallbackAction="¡BLOQUEO!"
          color={kindBanner.color}
          stamp={phase >= 2
            ? shown.attackerWins
              ? { text: '¡SE LE ESCAPA!', color: resultColor, crest: shown.attackerCrest }
              : { text: '¡BALÓN BLOQUEADO!', color: resultColor, crest: shown.defenderCrest }
            : undefined}
        />
      )}

      {/* FASES 2-3 (tiros): la cinemática de LA PARADA — el portero con su
          técnica en grande — y la barra de suspense cargando ENCIMA mientras
          tanto. El desenlace cae sobre ella: sello de paradón, o cierre (la
          red la perfora la celebración de gol). */}
      {shooting && phase >= 2 && (
        <>
          <Showcase
            side={shown.defender}
            tech={defTech}
            crest={shown.defenderCrest}
            fallbackAction="¡PARADA!"
            color="#22c55e"
            stamp={phase >= 3 && !shown.attackerWins
              ? { text: '¡PARADÓN!', color: resultColor, crest: shown.defenderCrest }
              : undefined}
          />
          {phase === 2 && (
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
