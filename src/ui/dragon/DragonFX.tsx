// ESPECTÁCULO DEL COMBATE DRAGON BALL — todo procedural (SVG + CSS), ni una
// imagen nueva.
//
// El combate ya se contaba bien, pero se contaba SOLO con texto: la
// transformación, el choque de rayos y el KO —los tres momentos que definen el
// modo— eran una línea más del log. Aquí se les da cuerpo, con el mismo enfoque
// que `TechniqueFX` en Inazuma: figuras dibujadas con divs y SVG, animadas con
// keyframes que ya viven en `index.css` (o los `dg-*` añadidos para esto).
//
// REGLAS que se respetan a rajatabla:
//   · El motor NO se toca. Esto se engancha al ÚLTIMO evento revelado
//     (`battle.log[revealed - 1]`), que es justo lo que el jugador acaba de
//     leer, así que la imagen y el texto van sincronizados por construcción.
//   · Los overlays son DECORATIVOS: `pointer-events-none` y se quitan solos con
//     un temporizador. Nunca bloquean la decisión ni el ticker — si un efecto
//     fallara, el combate sigue.
//   · Móvil primero: porcentajes, nada de medir el DOM, sin dependencias.
//   · `prefers-reduced-motion`: se apagan la sacudida y los enjambres de
//     partículas; el fogonazo y los números siguen, que son la información.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Battle, Side } from '@/engine/dragon/types'

// Duraciones de cada pieza. Van aquí y no en el CSS porque el temporizador de
// JS que retira el overlay tiene que durar EXACTAMENTE lo mismo.
const TRANSFORM_MS = 1750
const CLASH_MS = 1700
const FAINT_MS = 1050
const FLOAT_MS = 1250
const AURA_MS = 1100

interface FloatFx {
  key: number
  side: Side
  /** Texto ya formateado («128», «¡148!», «+40»). */
  text: string
  crit: boolean
  heal: boolean
  /** Desvío horizontal para que dos golpes seguidos no se pisen. */
  dx: number
}
interface TransformFx { key: number; side: Side; name: string; who: string; color: string }
interface ClashFx { key: number; winner: Side | 'empate'; margin: number; colorA: string; colorR: string }
interface FaintFx { key: number; side: Side; color: string }
interface AuraFx { key: number; side: Side; color: string }
interface ShakeFx { n: number; amp: number; ms: number }

export interface DragonFXState {
  /** Estilo que sacude el contenido del combate (va en el envoltorio). */
  shakeStyle: CSSProperties
  floats: FloatFx[]
  transform: TransformFx | null
  clash: ClashFx | null
  faint: FaintFx | null
  aura: AuraFx | null
}

/**
 * Dónde vive cada bando EN EL ESCENARIO: el rival al fondo a la derecha y tú
 * delante a la izquierda (ver la escena de `BattleView`). Los efectos se anclan
 * ahí para que el daño salga SOBRE quien lo encaja.
 *
 * Son porcentajes de la pantalla ENTERA, no del escenario: la capa de efectos
 * cubre todo el combate. Si algún día cambia la altura de la escena, estos
 * cuatro números son lo único que hay que retocar.
 */
const ANCHOR: Record<Side, { x: number; y: number }> = {
  aliado: { x: 24, y: 31 },
  rival: { x: 76, y: 17 },
}
/** Dónde se encuentran los dos rayos: justo entre los dos luchadores. */
const CLASH_Y = 24

function anchorY(side: Side): number {
  return ANCHOR[side].y
}
function anchorX(side: Side): number {
  return ANCHOR[side].x
}

/** Si el sistema pide menos movimiento, se recorta. Envuelto porque jsdom (los
    tests de humo) puede no traer `matchMedia` y esto es puro adorno. */
function reducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  } catch {
    return false
  }
}

/**
 * Traduce el último evento revelado en efectos. Es un hook (y no un componente)
 * porque la SACUDIDA DE PANTALLA tiene que aplicarse al contenido del combate,
 * que vive en `BattleView`; el resto se pinta con `DragonFXLayer`.
 */
export function useDragonFX(battle: Battle | null, revealed: number): DragonFXState {
  const [floats, setFloats] = useState<FloatFx[]>([])
  const [transform, setTransform] = useState<TransformFx | null>(null)
  const [clash, setClash] = useState<ClashFx | null>(null)
  const [faint, setFaint] = useState<FaintFx | null>(null)
  const [aura, setAura] = useState<AuraFx | null>(null)
  const [shake, setShake] = useState<ShakeFx | null>(null)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const seq = useRef(0)
  const shakeN = useRef(0)
  // Último índice ya procesado: el store reemplaza el objeto `battle` en cada
  // latido, así que el efecto se dispara más veces que eventos hay. Sin este
  // guardia, el mismo golpe pintaba dos números.
  const last = useRef(-1)

  // Al desmontar (salir del combate a mitad de una explosión) no puede quedar
  // ni un temporizador vivo tocando estado de un componente muerto.
  useEffect(() => () => {
    for (const t of timers.current) clearTimeout(t)
    timers.current = []
  }, [])

  useEffect(() => {
    if (!battle) { last.current = -1; return }
    // Combate nuevo (o rebobinado): se reengancha sin disparar nada.
    if (revealed <= last.current) { last.current = revealed; return }
    last.current = revealed
    const e = battle.log[revealed - 1]
    if (!e) return

    const reduced = reducedMotion()
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.current = timers.current.filter((x) => x !== t)
        fn()
      }, ms)
      timers.current.push(t)
    }
    const shakeIt = (amp: number, ms: number) => {
      if (reduced) return
      const n = ++shakeN.current
      setShake({ n, amp, ms })
      // Se limpia solo si nadie ha pedido otra sacudida por encima.
      later(() => setShake((s) => (s && s.n === n ? null : s)), ms)
    }
    const whoIn = (uid: string) => [...battle.allies, ...battle.enemies].find((c) => c.uid === uid)
    const float = (side: Side, text: string, opts: { crit?: boolean; heal?: boolean } = {}) => {
      const key = ++seq.current
      setFloats((f) => [
        // Tope de seguridad: con ×2 y técnicas multigolpe se acumulan rápido.
        ...f.slice(-5),
        { key, side, text, crit: !!opts.crit, heal: !!opts.heal, dx: ((key % 5) - 2) * 5 },
      ])
      later(() => setFloats((f) => f.filter((x) => x.key !== key)), FLOAT_MS)
    }

    switch (e.t) {
      case 'damage': {
        float(e.side, e.crit ? `¡${e.amount}!` : `${e.amount}`, { crit: e.crit })
        // El crítico se NOTA: la pantalla acusa el golpe.
        if (e.crit) shakeIt(4, 420)
        break
      }
      case 'heal':
        float(e.side, `+${e.amount}`, { heal: true })
        break
      case 'transform': {
        const c = whoIn(e.uid)
        setTransform({
          key: ++seq.current,
          side: e.side,
          name: e.name,
          who: c?.name ?? '',
          color: c?.color ?? '#fbbf24',
        })
        shakeIt(3.5, 900)
        later(() => setTransform(null), TRANSFORM_MS)
        break
      }
      case 'clash': {
        const a = battle.allies[battle.active]
        const r = battle.enemies[battle.enemyActive]
        setClash({
          key: ++seq.current,
          winner: e.winner,
          margin: Math.max(0, Math.min(1, e.margin)),
          colorA: a?.color ?? '#38bdf8',
          colorR: r?.color ?? '#f43f5e',
        })
        // La sacudida llega cuando la esfera revienta, no al empezar el pulso.
        later(() => shakeIt(5, 620), 950)
        later(() => setClash(null), CLASH_MS)
        break
      }
      case 'faint': {
        const c = whoIn(e.uid)
        setFaint({ key: ++seq.current, side: e.side, color: c?.color ?? '#f87171' })
        shakeIt(7, 640)
        later(() => setFaint(null), FAINT_MS)
        break
      }
      case 'action': {
        // Cargar ki es la jugada más repetida del modo y no se veía nada.
        if (e.kind === 'cargar') {
          const c = whoIn(e.uid)
          setAura({ key: ++seq.current, side: e.side, color: c?.color ?? '#38bdf8' })
          later(() => setAura(null), AURA_MS)
        }
        break
      }
      default:
        break
    }
  }, [battle, revealed])

  // La sacudida alterna entre dos keyframes IDÉNTICOS: cambiar el nombre de la
  // animación la reinicia de verdad, sin remontar el árbol (remontar mataría el
  // scroll del relato y el estado de los retratos).
  const shakeStyle: CSSProperties = shake
    ? {
      animation: `${shake.n % 2 ? 'dg-shake-b' : 'dg-shake-a'} ${shake.ms}ms ease-in-out both`,
      ['--dg-amp' as string]: `${shake.amp}px`,
    }
    : {}

  return { shakeStyle, floats, transform, clash, faint, aura }
}

// ---------------------------------------------------------------------------
// Las piezas
// ---------------------------------------------------------------------------

/**
 * Número de daño (o de cura) subiendo sobre quien lo encaja.
 * OJO con el anidamiento: `fx-dmg` anima `transform`, así que el centrado
 * horizontal tiene que ir en un envoltorio o la animación se lo come.
 */
function DamageFloat({ f }: { f: FloatFx }) {
  const color = f.heal ? '#4ade80' : f.crit ? '#fca5a5' : '#f87171'
  return (
    <div
      className="absolute -translate-x-1/2"
      style={{ left: `${anchorX(f.side) + f.dx}%`, top: `${anchorY(f.side)}%` }}
    >
      <div className="fx-dmg">
        <span
          className="block font-black tabular-nums leading-none"
          style={{
            color,
            fontSize: f.crit ? 34 : 22,
            textShadow: `0 2px 0 #0009, 0 0 12px ${color}aa`,
            WebkitTextStroke: f.crit ? '1px #7f1d1d' : undefined,
          }}
        >
          {f.text}
        </span>
        {f.crit && (
          <span className="block text-center text-[9px] font-black tracking-widest text-amber-300">
            CRÍTICO
          </span>
        )}
      </div>
    </div>
  )
}

/** Aura de carga de ki: el suelo se enciende y las chispas suben. */
function AuraFlash({ fx }: { fx: AuraFx }) {
  const reduced = reducedMotion()
  return (
    <div
      className="absolute"
      style={{ left: `${anchorX(fx.side)}%`, top: `${anchorY(fx.side)}%`, width: 170, height: 170, marginLeft: -85, marginTop: -85 }}
    >
      <span
        className="absolute inset-0 rounded-full blur-md dg-aura"
        style={{ background: `radial-gradient(circle, #ffffffaa 0%, ${fx.color}aa 38%, transparent 70%)` }}
      />
      {!reduced && Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          className="absolute bottom-2 fx-float-up"
          style={{ left: `${10 + i * 13}%`, animationDelay: `-${i * 0.18}s` }}
        >
          <span
            className="block rounded-full blur-[1px]"
            style={{ width: 5 + (i % 3) * 3, height: 5 + (i % 3) * 3, background: `radial-gradient(circle, #fff, ${fx.color})` }}
          />
        </span>
      ))}
    </div>
  )
}

/**
 * LA TRANSFORMACIÓN. El momento del juego: fogonazo, columna de aura que
 * revienta alrededor del luchador, anillos de onda, rayos convergentes y el
 * nombre de la forma entrando en grande.
 */
function TransformOverlay({ fx }: { fx: TransformFx }) {
  const reduced = reducedMotion()
  const c = fx.color
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* El fogonazo que ciega media pantalla. */}
      <div className="absolute inset-0 animate-inazuma-flash" style={{ background: '#fff7d6' }} />
      {/* Todo lo demás nace del luchador: ahora que está PLANTADO en un sitio
          concreto del escenario, la columna sale de sus pies y no del centro. */}
      <div className="absolute" style={{ left: `${anchorX(fx.side)}%`, top: `${anchorY(fx.side)}%` }}>
        {/* La COLUMNA de energía: sube del suelo y se estrecha al cielo. */}
        <span
          className="absolute dg-pillar blur-md"
          style={{
            left: -46, top: -300, width: 92, height: 340,
            background: `linear-gradient(to top, ${c}f2, ${c}88 45%, transparent)`,
          }}
        />
        {/* El AURA que estalla. */}
        <span
          className="absolute dg-aura blur-sm"
          style={{
            left: -110, top: -110, width: 220, height: 220,
            background: `radial-gradient(circle, #ffffffcc 0%, ${c}cc 34%, transparent 70%)`,
          }}
        />
        {/* Ondas de choque. */}
        {[0, 1, 2].map((i) => (
          <span
            key={`r${i}`}
            className="absolute rounded-full border-2 dg-ring"
            style={{ left: -60, top: -60, width: 120, height: 120, borderColor: c, animationDelay: `${i * 0.18}s` }}
          />
        ))}
        {/* Rayos que CONVERGEN en él: la energía se le viene encima. */}
        {!reduced && Array.from({ length: 10 }, (_, i) => (
          <span
            key={`c${i}`}
            className="absolute fx-converge h-[3px] w-12 rounded-full"
            style={{
              ['--fx-a' as string]: `${i * 36}deg`,
              background: `linear-gradient(to left, ${c}, transparent)`,
              animationDelay: `-${i * 0.08}s`,
            }}
          />
        ))}
        {/* Cascotes que levantan el vuelo alrededor. */}
        {!reduced && Array.from({ length: 6 }, (_, i) => (
          <span
            key={`p${i}`}
            className="absolute fx-float-up"
            style={{ left: `${-70 + i * 26}px`, top: 20, animationDelay: `-${i * 0.24}s` }}
          >
            <span
              className="block"
              style={{ width: 6, height: 8, background: c, clipPath: 'polygon(50% 0%, 100% 70%, 20% 100%)' }}
            />
          </span>
        ))}
      </div>
      {/* EL NOMBRE DE LA FORMA, en grande. */}
      <div className="absolute inset-x-0 top-[40%] flex flex-col items-center gap-1 px-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/80 animate-pop-in">
          {fx.who}
        </div>
        <div
          className="animate-goal text-center text-3xl font-black uppercase leading-none tracking-wide"
          style={{ color: '#fff', textShadow: `0 0 20px ${c}, 0 0 44px ${c}, 0 3px 0 #0009` }}
        >
          {fx.name}
        </div>
      </div>
    </div>
  )
}

/**
 * EL CHOQUE DE RAYOS. Dos haces —el tuyo desde abajo, el del rival desde
 * arriba— y la esfera de choque en medio, que se DESPLAZA hacia el perdedor
 * tanto como diga el margen. Si es empate se queda clavada y revienta.
 */
function ClashOverlay({ fx }: { fx: ClashFx }) {
  const reduced = reducedMotion()
  // Empuje en % de la altura del overlay: hacia arriba si ganas tú (le comes el
  // terreno al rival), hacia abajo si gana él. El margen manda en cuánto.
  const dir = fx.winner === 'empate' ? 0 : fx.winner === 'aliado' ? -1 : 1
  const push = dir * (6 + fx.margin * 14)
  const winColor = fx.winner === 'rival' ? fx.colorR : fx.colorA
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Los dos haces, apuntando al centro. */}
      <span
        className="absolute left-1/2 -translate-x-1/2 dg-beam-up blur-[2px]"
        style={{
          bottom: 0, height: `${100 - CLASH_Y}%`, width: fx.winner === 'aliado' ? 44 : 28,
          background: `linear-gradient(to top, ${fx.colorA}00, ${fx.colorA} 30%, #fff)`,
        }}
      />
      <span
        className="absolute left-1/2 -translate-x-1/2 dg-beam-down blur-[2px]"
        style={{
          top: 0, height: `${CLASH_Y}%`, width: fx.winner === 'rival' ? 44 : 28,
          background: `linear-gradient(to bottom, ${fx.colorR}00, ${fx.colorR} 30%, #fff)`,
        }}
      />
      {/* EL PUNTO DE CONTACTO viaja hacia el perdedor (`dg-drift` anima `top`,
          no `transform`, para dejar el transform libre a lo que lleva dentro).
          La esfera, las chispas y el estallido cuelgan de él, así que todos
          acaban exactamente donde acaba el pulso. */}
      <span
        className="absolute left-1/2 dg-drift"
        style={{
          top: `${CLASH_Y}%`, width: 116, height: 116, marginLeft: -58, marginTop: -58,
          ['--dg-from' as string]: `${CLASH_Y}%`,
          ['--dg-top' as string]: `${CLASH_Y + push}%`,
        }}
      >
        <span
          className="absolute inset-0 rounded-full dg-clash blur-[1px]"
          style={{ background: `radial-gradient(circle, #fff 0%, #fff 26%, ${winColor}dd 52%, transparent 72%)` }}
        />
        {!reduced && Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 fx-converge h-[2px] w-10 rounded-full"
            style={{
              ['--fx-a' as string]: `${i * 45 + 22}deg`,
              background: 'linear-gradient(to left, #fff, transparent)',
              animationDelay: `-${i * 0.07}s`,
            }}
          />
        ))}
        {/* Y el estallido final, ya con el veredicto puesto. */}
        <span
          className="absolute rounded-full dg-boom"
          style={{
            left: -42, top: -42, width: 200, height: 200,
            background: `radial-gradient(circle, #ffffffee, ${winColor}88 45%, transparent 70%)`,
          }}
        />
      </span>
    </div>
  )
}

/** KO: impacto seco sobre el que cae y la pantalla que se apaga un instante. */
function FaintOverlay({ fx }: { fx: FaintFx }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Se hace de noche alrededor del que se desploma. */}
      <div
        className="absolute inset-0 dg-ko-dark"
        style={{ background: `radial-gradient(circle at 50% ${anchorY(fx.side)}%, transparent 8%, #020617 78%)` }}
      />
      <div className="absolute" style={{ left: `${anchorX(fx.side)}%`, top: `${anchorY(fx.side)}%` }}>
        {/* La ESTRELLA del impacto: un golpe seco, no una explosión bonita. */}
        <svg viewBox="0 0 100 100" className="dg-impact w-40 h-40 -ml-20 -mt-20" style={{ filter: `drop-shadow(0 0 12px ${fx.color})` }}>
          <path
            d="M50 2 L61 34 L92 22 L70 48 L98 62 L64 64 L72 96 L50 72 L28 96 L36 64 L2 62 L30 48 L8 22 L39 34 Z"
            fill="#fff"
            opacity=".92"
          />
          <path
            d="M50 18 L57 40 L78 33 L63 49 L82 58 L59 59 L64 79 L50 63 L36 79 L41 59 L18 58 L37 49 L22 33 L43 40 Z"
            fill={fx.color}
          />
        </svg>
      </div>
    </div>
  )
}

/**
 * La capa entera. Va SIEMPRE por encima del combate y SIEMPRE sin capturar
 * toques: mientras hay una explosión en pantalla se puede seguir decidiendo.
 */
export function DragonFXLayer({ fx }: { fx: DragonFXState }) {
  const { floats, transform, clash, faint, aura } = fx
  if (!floats.length && !transform && !clash && !faint && !aura) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden" aria-hidden>
      {aura && <AuraFlash key={aura.key} fx={aura} />}
      {clash && <ClashOverlay key={clash.key} fx={clash} />}
      {faint && <FaintOverlay key={faint.key} fx={faint} />}
      {transform && <TransformOverlay key={transform.key} fx={transform} />}
      {floats.map((f) => <DamageFloat key={f.key} f={f} />)}
    </div>
  )
}

export default DragonFXLayer
