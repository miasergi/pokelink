// Piezas comunes del modo Dragon Ball: cartas de luchador, barras y el
// scouter. Los retratos los baja `npm run fetch-dragon`, pero SIEMPRE hay
// caída a una carta con las iniciales sobre el color del personaje — igual que
// en Inazuma, el modo se juega entero aunque no se haya descargado nada.
import { useEffect, useState } from 'react'
import Icon from '@/ui/components/Icon'
import { getForm } from '@/data/dragon/transformations'
import { combatantPL, fighterMaxHp, fighterPL, formatPL } from '@/engine/dragon/roster'
import type { Combatant, Fighter } from '@/engine/dragon/types'

/** Degradado de fondo por escenario. Cada saga tiene el suyo. */
export const SCENES: Record<string, string> = {
  yermo: 'radial-gradient(90% 60% at 70% 8%, #fb923c22, transparent 60%), linear-gradient(#1c1917, #0b1220)',
  namek: 'radial-gradient(90% 60% at 30% 8%, #22d3ee2b, transparent 60%), linear-gradient(#052e2b, #0b1220)',
  ciudad: 'radial-gradient(90% 60% at 60% 8%, #38bdf824, transparent 60%), linear-gradient(#0f172a, #0b1220)',
  templo: 'radial-gradient(90% 60% at 40% 8%, #f472b625, transparent 60%), linear-gradient(#2e1065, #0b1220)',
}

export function sceneBg(scene: string): string {
  return SCENES[scene] ?? SCENES.yermo
}

// ---------------------------------------------------------------------------
// EL ESCENARIO DEL COMBATE
// ---------------------------------------------------------------------------

/**
 * Cómo se ve cada saga cuando se pelea EN ella. Los degradados de `SCENES` son
 * fondo de pantalla (mapa, tienda, equipo): planos a propósito, porque encima
 * van listas y texto. Aquí no: el combate necesita HORIZONTE y SUELO, que es lo
 * que convierte una hoja de cálculo en un sitio donde dos tíos se pegan.
 *
 * Nada de imágenes: el perfil del horizonte es un `path` de SVG sobre un lienzo
 * `0 0 400 120` con la línea de tierra en y=120, y el suelo son líneas que huyen
 * a un punto de fuga. Cambiar de saga es cambiar cuatro colores y un path.
 */
export interface SceneOrb {
  color: string
  /** Diámetro en píxeles. */
  size: number
  /** Posición en % del escenario. */
  x: number
  y: number
}

export interface SceneLook {
  /** Degradado del cielo (ocupa todo el escenario). */
  sky: string
  /** Degradado del suelo (de la línea del horizonte para abajo). */
  ground: string
  /** Tinta de las siluetas del fondo y de las líneas de fuga del suelo. */
  ink: string
  /** Color del ambiente: polvo, esporas, chispas, pétalos. */
  mote: string
  /** Astros del fondo. Namek tiene tres soles y se le nota. */
  orbs: SceneOrb[]
  /** Perfil del horizonte. */
  ridge: string
}

export const SCENE_LOOK: Record<string, SceneLook> = {
  // Páramo al atardecer: mesetas peladas y polvo naranja. La saga Saiyan.
  yermo: {
    sky: 'linear-gradient(#fcd34d 0%, #f97316 24%, #9a3412 52%, #431407 100%)',
    ground: 'linear-gradient(#7c2d12, #2a1108)',
    ink: '#2a1206',
    mote: '#fed7aa',
    orbs: [{ color: '#fde68a', size: 62, x: 72, y: 24 }],
    ridge: 'M0 120 L0 92 L26 70 L54 78 L70 56 L96 66 L118 42 L140 62 L168 52 L196 74 '
      + 'L214 58 L244 82 L268 64 L292 80 L318 60 L344 78 L368 66 L400 86 L400 120 Z',
  },
  // Namek: cielo verde perpetuo, agujas vegetales y tres soles que no se ponen.
  namek: {
    sky: 'linear-gradient(#a3e635 0%, #22d3ee 22%, #0e7490 54%, #022c22 100%)',
    ground: 'linear-gradient(#0f766e, #052e24)',
    ink: '#04241d',
    mote: '#bbf7d0',
    orbs: [
      { color: '#bef264', size: 44, x: 22, y: 18 },
      { color: '#fef08a', size: 26, x: 40, y: 12 },
      { color: '#7dd3fc', size: 20, x: 82, y: 22 },
    ],
    ridge: 'M0 120 L0 100 L18 96 L30 50 L42 96 L60 92 L74 28 L88 92 L112 88 L124 58 '
      + 'L136 88 L164 94 L180 42 L196 94 L228 90 L242 64 L256 90 L292 96 L306 36 '
      + 'L320 96 L348 92 L362 68 L376 92 L400 98 L400 120 Z',
  },
  // Ciudad de noche: rascacielos recortados contra el resplandor urbano.
  ciudad: {
    sky: 'linear-gradient(#38bdf8 0%, #1e3a8a 26%, #0f172a 66%, #020617 100%)',
    ground: 'linear-gradient(#1e293b, #020617)',
    ink: '#020617',
    mote: '#7dd3fc',
    orbs: [{ color: '#e2e8f0', size: 34, x: 74, y: 16 }],
    ridge: 'M0 120 L0 78 L22 78 L22 52 L44 52 L44 86 L68 86 L68 38 L88 38 L88 66 '
      + 'L112 66 L112 28 L134 28 L134 72 L158 72 L158 48 L186 48 L186 82 L212 82 '
      + 'L212 34 L236 34 L236 68 L262 68 L262 46 L288 46 L288 80 L316 80 L316 56 '
      + 'L342 56 L342 74 L370 74 L370 42 L400 42 L400 120 Z',
  },
  // Templo sobre las nubes: cielo violeta y un mar de algodón por horizonte.
  templo: {
    sky: 'linear-gradient(#f0abfc 0%, #a78bfa 24%, #5b21b6 58%, #1e1b4b 100%)',
    ground: 'linear-gradient(#4c1d95, #1e1b4b)',
    ink: '#2e1065',
    mote: '#f5d0fe',
    orbs: [{ color: '#fbcfe8', size: 48, x: 28, y: 20 }],
    ridge: 'M0 120 L0 96 Q20 76 44 88 Q60 60 88 74 Q108 54 132 72 Q152 58 176 78 '
      + 'Q200 56 226 76 Q248 60 272 80 Q296 64 322 82 Q346 68 370 86 Q386 78 400 92 L400 120 Z',
  },
}

export function sceneLook(scene: string): SceneLook {
  return SCENE_LOOK[scene] ?? SCENE_LOOK.yermo
}

/** Posiciones fijas (no aleatorias: nada de repintar distinto en cada render). */
const MOTES: [number, number, number][] = [
  [8, 82, 0], [21, 68, 1.4], [34, 88, 2.9], [46, 74, 0.7],
  [58, 90, 3.6], [69, 70, 2.1], [80, 86, 4.4], [91, 76, 1.1], [27, 94, 5.2],
]

/**
 * EL ESCENARIO, entero y procedural: cielo, astros, DOS capas de horizonte (la
 * de atrás pálida y alta, la de delante espejada y oscura — parallax barato que
 * da profundidad de verdad), el suelo con sus líneas de fuga, la bruma que
 * separa uno de otro y el polvo del ambiente.
 */
export function SceneBackdrop({ scene }: { scene: string }) {
  const s = sceneLook(scene)
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: s.sky }} />

      {/* Astros. Van difuminados para que no parezcan pegatinas. */}
      {s.orbs.map((o, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${o.x}%`, top: `${o.y}%`,
            width: o.size, height: o.size, marginLeft: -o.size / 2, marginTop: -o.size / 2,
            background: `radial-gradient(circle, #ffffffee 0%, ${o.color} 42%, ${o.color}00 72%)`,
          }}
        />
      ))}

      {/* Horizonte lejano: más pálido y más alto (está más lejos). */}
      <svg
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0"
        style={{ top: '22%', height: '38%', opacity: 0.42 }}
      >
        <path d={s.ridge} fill={s.ink} />
      </svg>
      {/* Horizonte cercano: el MISMO perfil espejado, para que no se note que
          es el mismo dibujo, y a plena tinta. */}
      <svg
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0"
        style={{ top: '34%', height: '26%' }}
      >
        <path d={s.ridge} fill={s.ink} transform="translate(400 0) scale(-1 1)" />
      </svg>

      {/* La BRUMA de la línea del horizonte: es lo que hace que el fondo
          parezca lejos y no un recorte pegado sobre el suelo. */}
      <div
        className="absolute inset-x-0"
        style={{ top: '50%', height: '14%', background: `linear-gradient(to bottom, transparent, ${s.mote}40, transparent)` }}
      />

      {/* EL SUELO, con sus líneas huyendo al punto de fuga. */}
      <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ top: '58%', background: s.ground }}>
        <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <g stroke={s.ink} strokeWidth="1.2" opacity="0.4" fill="none">
            {/* Las que huyen: todas nacen del punto de fuga, justo encima. */}
            {Array.from({ length: 13 }, (_, i) => (
              <path key={`v${i}`} d={`M200 -14 L${i * 57 - 170} 210`} />
            ))}
            {/* Las transversales, apretándose hacia el fondo. */}
            {Array.from({ length: 8 }, (_, i) => {
              const y = 200 * ((i + 1) / 8) ** 2.4
              return <path key={`h${i}`} d={`M0 ${y.toFixed(1)} L400 ${y.toFixed(1)}`} />
            })}
          </g>
        </svg>
      </div>

      {/* Ambiente: motas subiendo. Se apagan con `prefers-reduced-motion`. */}
      {MOTES.map(([x, y, delay], i) => (
        <span
          key={`m${i}`}
          className="absolute rounded-full dg-mote"
          style={{
            left: `${x}%`, top: `${y}%`,
            width: 3 + (i % 3), height: 3 + (i % 3),
            background: s.mote, animationDelay: `-${delay}s`, opacity: 0,
          }}
        />
      ))}

      {/* Viñeta: oscurece los bordes para que las barras y el relato se lean
          encima del escenario sin necesidad de una caja opaca. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 78% at 50% 42%, transparent 38%, rgba(2,6,23,.72) 100%)' }}
      />
    </div>
  )
}

/**
 * Retrato del luchador. Los baja `npm run fetch-dragon` a public/dragon/
 * fighters/<baseId>.png. Si falta uno, `Avatar` cae a la carta de iniciales y
 * no se rompe nada — por eso el modo se puede jugar entero sin descargar nada.
 */
export function portraitUrl(baseId: string): string {
  return `${import.meta.env.BASE_URL}dragon/fighters/${baseId}.png`
}

/**
 * Retrato de un luchador YA TRANSFORMADO. Vive aparte (`dragon/forms/`) porque
 * no todas las combinaciones existen: si falta, `Avatar` cae al retrato normal
 * y de ahí a las iniciales, así que transformarse nunca deja un hueco.
 */
export function formPortraitUrl(baseId: string, form: string): string {
  return `${import.meta.env.BASE_URL}dragon/forms/${baseId}__${form}.png`
}

/** Inicial(es) del nombre, para la carta sin retrato. */
export function initials(name: string): string {
  const parts = name.replace(/[()]/g, '').split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, color, size = 44, form, baseId }: {
  name: string
  color: string
  size?: number
  form?: string
  /** Con esto se pinta el retrato; sin él, las iniciales. */
  baseId?: string
}) {
  // Dos caídas encadenadas: retrato de la forma → retrato normal → iniciales.
  // `key` en el <img> fuerza a React a recrearlo al cambiar de forma; sin eso
  // el `onError` de un retrato roto se quedaba pegado y el luchador perdía la
  // cara al transformarse.
  const [falla, setFalla] = useState<Record<string, boolean>>({})
  const src = baseId
    ? (form && !falla[`${baseId}__${form}`] ? formPortraitUrl(baseId, form)
      : !falla[baseId] ? portraitUrl(baseId) : null)
    : null
  return (
    <div
      className="relative grid place-items-center rounded-xl font-black shrink-0 overflow-hidden"
      style={{
        width: size, height: size,
        background: `linear-gradient(150deg, ${color}, ${color}66)`,
        color: '#0b1220',
        fontSize: size * 0.36,
        // El aura de la transformación se ve DESDE FUERA de la carta: es la
        // señal de que algo ha cambiado, y tiene que leerse de un vistazo.
        boxShadow: form ? `0 0 0 2px #fde047, 0 0 18px 2px ${color}` : `0 0 0 1px #ffffff1a`,
      }}
    >
      {src ? (
        <img
          key={src}
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setFalla((f) => ({
            ...f,
            [form && src.includes('/forms/') ? `${baseId}__${form}` : String(baseId)]: true,
          }))}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        initials(name)
      )}
    </div>
  )
}

/**
 * Barra de equipo SIEMPRE a la vista, como el `SquadBar` de Inazuma: quién
 * llevas y cómo está, sin entrar en ninguna pantalla. Los huecos libres se
 * pintan también, que es como se ve el tope sin explicarlo.
 */
export function TeamStrip({ team, max, onOpen }: {
  team: Fighter[]
  max: number
  onOpen: () => void
}) {
  const huecos = Math.max(0, max - team.length)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-1.5 px-3 py-2 active:bg-slate-800/50 transition"
    >
      {team.map((f) => {
        const hpMax = fighterMaxHp(f)
        const frac = Math.max(0, f.hp) / hpMax
        return (
          <div key={f.uid} className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="relative shrink-0">
                <Avatar
                  name={f.name}
                  color={f.color}
                  size={26}
                  baseId={f.baseId}
                  form={f.forms.length ? f.forms[0] : undefined}
                />
                {/* EL NIVEL, encima de la cara. Es el número que más miras en
                    un rogue —para saber si te llega para la siguiente casilla—
                    y estaba escondido dentro de la pantalla de equipo. */}
                <span
                  className="absolute -bottom-1 -right-1 rounded px-0.5 text-[7.5px] font-black tabular-nums leading-tight"
                  style={{ background: '#0b1220', color: f.color, boxShadow: '0 0 0 1px #00000080' }}
                >
                  {f.level}
                </span>
              </span>
              <span className={`text-[9.5px] font-semibold truncate ${f.hp <= 0 ? 'text-red-400 line-through' : ''}`}>
                {f.name.replace('Son ', '')}
              </span>
            </div>
            <div className="w-full rounded-full bg-slate-900 overflow-hidden mt-0.5" style={{ height: 4 }}>
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${frac * 100}%`, background: hpColor(frac) }}
              />
            </div>
          </div>
        )
      })}
      {Array.from({ length: huecos }, (_, i) => (
        <div key={`h-${i}`} className="flex-1 min-w-0 opacity-40">
          <div className="flex items-center gap-1">
            <span
              className="grid place-items-center rounded-lg border border-dashed border-slate-600 shrink-0"
              style={{ width: 26, height: 26 }}
            >
              <Icon name="plus" className="w-3 h-3 text-slate-600" />
            </span>
            <span className="text-[9.5px] text-slate-600 truncate">libre</span>
          </div>
          <div className="w-full rounded-full bg-slate-900 mt-0.5" style={{ height: 4 }} />
        </div>
      ))}
    </button>
  )
}

/** Ficha diminuta para el banquillo rival de una emboscada. */
export function MiniFighter({ c, withName }: { c: Combatant; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-950/70 pl-1 pr-1.5 py-0.5">
      <Avatar name={c.name} color={c.color} size={18} baseId={c.baseId} />
      {/* Tu banquillo SÍ lleva nombre: hay que saber quién espera turno. El del
          rival no, que ahí lo que importa es cuántos quedan. */}
      {withName && <span className="text-[9px] font-semibold text-slate-200 max-w-[4.5rem] truncate">{c.name}</span>}
      <span className="text-[9px] text-slate-400 tabular-nums">{Math.round(c.hp)}</span>
    </span>
  )
}

export function Bar({ value, max, color, height = 8, label }: {
  value: number
  max: number
  color: string
  height?: number
  label?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
          <span>{label}</span>
          <span className="tabular-nums">{Math.max(0, Math.round(value))}/{Math.round(max)}</span>
        </div>
      )}
      <div className="w-full rounded-full bg-slate-800 overflow-hidden" style={{ height }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

/** Color de la barra de PS: verde → ámbar → rojo. Se lee sin leer números. */
export function hpColor(frac: number): string {
  if (frac > 0.5) return 'linear-gradient(90deg,#22c55e,#4ade80)'
  if (frac > 0.22) return 'linear-gradient(90deg,#f59e0b,#fbbf24)'
  return 'linear-gradient(90deg,#dc2626,#f87171)'
}

export const KI_COLOR = 'linear-gradient(90deg,#0ea5e9,#7dd3fc)'

/**
 * El scouter. El número es cosmético (ver `powerLevel`) pero es la lectura
 * emocional del juego: cuando pasa de 9.000 el aparato echa humo.
 */
/** El dinero del juego, con su moneda. */
export function Zeni({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${className}`}>
      <Icon name="coin" className="w-3 h-3" />{n.toLocaleString('es-ES')}
    </span>
  )
}

export function Scouter({ pl, compact }: { pl: number; compact?: boolean }) {
  const revienta = pl > 9000
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono tabular-nums ${compact ? 'text-[10px] px-1' : 'text-xs px-1.5 py-0.5'}`}
      style={{
        background: revienta ? '#7f1d1d' : '#0f172a',
        color: revienta ? '#fca5a5' : '#7dd3fc',
        boxShadow: `inset 0 0 0 1px ${revienta ? '#dc2626' : '#1e40af'}`,
      }}
      title={revienta ? '¡El scouter no da para más!' : 'Nivel de combate'}
    >
      {formatPL(pl)}
    </span>
  )
}

/** Ficha de un luchador del equipo, fuera del combate. */
export function FighterRow({ f, plScale, onClick, selected, right }: {
  f: Fighter
  /** Teatro del scouter, ya resuelto por quien conoce el arco. */
  plScale: number
  onClick?: () => void
  selected?: boolean
  right?: React.ReactNode
}) {
  const max = fighterMaxHp(f)
  const ko = f.hp <= 0
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center gap-2.5 rounded-xl p-2 text-left transition-colors ${
        selected ? 'bg-slate-700/70' : 'bg-slate-800/60'
      } ${onClick ? 'active:bg-slate-700' : ''} ${ko ? 'opacity-45' : ''}`}
      style={{ boxShadow: selected ? `inset 0 0 0 1.5px ${f.color}` : undefined }}
    >
      <Avatar name={f.name} color={f.color} size={40} baseId={f.baseId} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-sm truncate">{f.name}</span>
          <span className="text-[10px] text-slate-400 shrink-0">Nv.{f.level}</span>
          {f.zenkai > 1 && (
            <span className="text-[9px] text-orange-300 shrink-0" title="Zenkai acumulado">
              ×{f.zenkai.toFixed(2)}
            </span>
          )}
        </div>
        <div className="mt-1">
          <Bar value={f.hp} max={max} color={hpColor(f.hp / max)} height={6} />
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Scouter pl={fighterPL(f, plScale)} compact />
          {ko && <span className="text-[10px] text-red-400">Fuera de combate</span>}
          {!!f.forms.length && (
            <span className="text-[9px] text-amber-300 truncate">
              {f.forms.map((id) => getForm(id)?.name).filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </div>
      {right}
    </button>
  )
}

/**
 * Barra de combate CON PESO. La de 5-7 píxeles se perdía; esta se ve, y además
 * cuenta el golpe: el trozo que acabas de perder se queda un instante como un
 * FANTASMA y luego se cae. Así se lee cuánto te han quitado, no solo cuánto te
 * queda — que es la diferencia entre un número y una emoción.
 */
export function Gauge({ value, max, color, height = 10, ghost = '#fca5a5' }: {
  value: number
  max: number
  color: string
  height?: number
  /** Color del trozo que se está perdiendo. */
  ghost?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  const [rastro, setRastro] = useState(pct)
  useEffect(() => {
    // Al subir (curas, ki que se recarga) el fantasma acompaña sin retraso: lo
    // que hay que dramatizar es lo que se PIERDE.
    if (pct >= rastro) { setRastro(pct); return }
    const t = setTimeout(() => setRastro(pct), 420)
    return () => clearTimeout(t)
  }, [pct, rastro])
  return (
    <div
      className="w-full rounded-full overflow-hidden relative"
      style={{ height, background: '#020617', boxShadow: 'inset 0 0 0 1px #ffffff26' }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${rastro}%`, background: ghost, opacity: 0.7 }}
      />
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
      {/* Brillo superior: le da volumen a la barra sin costar nada. */}
      <div
        className="absolute inset-x-0 top-0 rounded-full pointer-events-none"
        style={{ height: Math.max(2, height / 3), background: 'linear-gradient(to bottom, #ffffff3d, transparent)' }}
      />
    </div>
  )
}

/**
 * EL LUCHADOR PLANTADO EN LA ESCENA. Los retratos de la wiki vienen mezclados:
 * unos son recortes con transparencia y otros traen su propio fondo, así que el
 * pie de la imagen se DESVANECE con una máscara — el que trae fondo no corta en
 * seco contra el suelo y los dos parecen igual de plantados ahí.
 *
 * La TRANSFORMACIÓN se ve aquí, y mientras dure: aura latiendo alrededor y
 * lenguas de fuego subiendo. El estallido de `DragonFX` es el momento; esto es
 * el estado.
 */
export function StageFighter({ c, size, flip, delay = 0 }: {
  c: Combatant
  /** Anchura en píxeles; el alto sale de ella (los retratos son de cuerpo entero). */
  size: number
  /** Espeja el retrato para que mire hacia el rival. */
  flip?: boolean
  /** Desfase del balanceo, para que los dos no respiren a la vez. */
  delay?: number
}) {
  // TRANSFORMADO SE VE: si existe el retrato de la forma, se usa ese. Dos
  // caídas encadenadas (forma → normal → iniciales) con un mapa de fallos,
  // porque con un solo booleano el fallo de una fuente tumbaba a la otra.
  const [falla, setFalla] = useState<Record<string, boolean>>({})
  const formSrc = c.form ? formPortraitUrl(c.baseId, c.form) : null
  const baseSrc = portraitUrl(c.baseId)
  const stageSrc = formSrc && !falla[formSrc] ? formSrc : (!falla[baseSrc] ? baseSrc : null)
  const form = c.form ? getForm(c.form) : undefined
  const h = Math.round(size * 1.5)
  const ko = c.fainted || c.hp <= 0
  return (
    <div className="relative" style={{ width: size, height: h }}>
      {/* SOMBRA en el suelo: sin ella el luchador flota en el vacío. */}
      <span
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          bottom: -3, width: size * 0.86, height: size * 0.2,
          background: 'radial-gradient(ellipse, rgba(2,6,23,.65), transparent 70%)',
        }}
      />

      {form && !ko && (
        <>
          {/* El AURA, latiendo TODO el rato que dure la forma. */}
          <span
            className="absolute dg-form-aura rounded-[50%] blur-md pointer-events-none"
            style={{
              left: '50%', top: '4%', width: size * 1.5, height: h * 0.98,
              marginLeft: -(size * 1.5) / 2, opacity: 0.7,
              background: `radial-gradient(ellipse, #fef9c3aa 0%, ${c.color}99 44%, transparent 72%)`,
            }}
          />
          {/* …y sus llamas, que es lo que canta «esto sigue encendido». */}
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="absolute bottom-1 dg-flame rounded-full blur-[1px] pointer-events-none"
              style={{
                left: `${12 + i * 19}%`, width: 5, height: 16,
                background: `linear-gradient(to top, #fde047, ${c.color}00)`,
                animationDelay: `-${i * 0.22}s`,
              }}
            />
          ))}
        </>
      )}

      <div
        className="absolute inset-0 dg-idle"
        style={{ animationDelay: `-${delay}s` }}
      >
        <div
          className="w-full h-full"
          style={{
            transform: flip ? 'scaleX(-1)' : undefined,
            filter: ko
              ? 'grayscale(1) brightness(.5)'
              : `drop-shadow(0 6px 10px rgba(2,6,23,.7))${form ? ` drop-shadow(0 0 12px ${c.color})` : ''}`,
            opacity: ko ? 0.45 : 1,
          }}
        >
          {stageSrc ? (
            <img
              key={stageSrc}
              src={stageSrc}
              alt={c.name}
              onError={() => setFalla((f) => ({ ...f, [stageSrc]: true }))}
              draggable={false}
              className="w-full h-full object-contain object-bottom"
              style={{
                // El pie se difumina: así el retrato «entra» en el suelo del
                // escenario en vez de terminar en un canto recto.
                maskImage: 'linear-gradient(to top, transparent 0%, #000 12%)',
                WebkitMaskImage: 'linear-gradient(to top, transparent 0%, #000 12%)',
              }}
            />
          ) : (
            // Sin retrato descargado: la carta de iniciales, del tamaño del
            // luchador, para que la escena no se quede coja.
            <div
              className="w-full h-full grid place-items-center rounded-2xl font-black"
              style={{
                background: `linear-gradient(150deg, ${c.color}, ${c.color}55)`,
                color: '#0b1220', fontSize: size * 0.42,
                boxShadow: 'inset 0 0 0 1px #ffffff1f',
              }}
            >
              {initials(c.name)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Las constantes vitales de un combatiente, en un panel legible SOBRE el
 * escenario: quién es, de qué nivel, en qué forma va y cómo lleva PS y ki. Se
 * planta en la esquina CONTRARIA a su dueño, como en los combates de Pokémon:
 * así la barra no le tapa la cara a nadie.
 */
export function VitalStrip({ c, plScale, align = 'left', extra }: {
  c: Combatant
  /** Teatro del scouter, ya resuelto por quien conoce el arco. */
  plScale: number
  align?: 'left' | 'right'
  /** Banquillo u otra coletilla, alineada con el panel. */
  extra?: React.ReactNode
}) {
  const form = c.form ? getForm(c.form) : undefined
  const right = align === 'right'
  return (
    <div
      className="rounded-xl px-2 py-1.5"
      style={{ background: 'rgba(2,6,23,.66)', backdropFilter: 'blur(2px)', boxShadow: 'inset 0 0 0 1px #ffffff1f' }}
    >
      <div className={`flex items-center gap-1.5 min-w-0 ${right ? 'flex-row-reverse' : ''}`}>
        <span className="font-bold text-[13px] truncate flex-1 min-w-0" style={{ textAlign: right ? 'right' : 'left' }}>
          {c.name}
        </span>
        <span className="text-[10px] text-slate-300 shrink-0 tabular-nums">Nv.{c.level}</span>
        <Scouter pl={combatantPL(c, plScale)} compact />
      </div>
      {form && (
        <div
          className="text-[10px] font-black uppercase tracking-wide truncate text-amber-300"
          style={{ textAlign: right ? 'right' : 'left', textShadow: `0 0 10px ${c.color}` }}
        >
          {form.name}
        </div>
      )}
      <div className="mt-1 space-y-1">
        <Gauge value={c.hp} max={c.hpMax} color={hpColor(c.hp / c.hpMax)} height={11} />
        <Gauge value={c.ki} max={c.kiMax} color={KI_COLOR} height={6} ghost="#0369a1" />
      </div>
      <div className={`flex items-center gap-1.5 mt-1 flex-wrap ${right ? 'justify-end' : ''}`}>
        <span className="text-[10px] text-slate-300 tabular-nums">
          {Math.max(0, Math.round(c.hp))}/{Math.round(c.hpMax)} PS · {Math.round(c.ki)} ki
        </span>
        {c.guarding && <span className="text-[10px] text-sky-300">En guardia</span>}
        {c.exposed && <span className="text-[10px] text-red-300">Descubierto</span>}
        {c.stunned && <span className="text-[10px] text-yellow-300">Aturdido</span>}
      </div>
      {extra}
    </div>
  )
}

/** Cabecera común: título a la izquierda y lo que haga falta a la derecha. */
export function Header({ title, sub, onBack, right }: {
  title: string
  sub?: string
  onBack?: () => void
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 shrink-0">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 grid place-items-center rounded-lg bg-slate-800 active:bg-slate-700 text-slate-300 active:scale-95 transition"
          aria-label="Volver"
        >
          <Icon name="arrowRight" className="w-4 h-4 rotate-180" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{title}</div>
        {sub && <div className="text-[11px] text-slate-400 truncate">{sub}</div>}
      </div>
      {right}
    </div>
  )
}
