// EL CAMPO: mapa de la posesión durante el partido.
//
// La narración cuenta lo que pasa, pero no DÓNDE pasa ni quién es quién. Este
// panel enseña las tres cosas que el texto no puede: la zona en la que está el
// balón, la cara del que lo lleva y la del que tiene enfrente.
//
// REGLA DE ORO: se pinta desde el feed REVELADO, nunca desde `match.chain`.
// El motor resuelve la posesión entera de golpe y su `chain` ya va DOS duelos
// por delante de lo que se está contando — leerlo aquí enseñaba el siguiente
// emparejamiento («Steve vs Mark Evans») con el duelo anterior aún en
// animación: el desenlace, destripado. El último duelo revelado ES la verdad
// de la pantalla.
import { actorByUid, playerSide, sideOf } from '@/engine/inazuma/match'
import { ImgFallback } from '@/ui/components/kit'
import { Pic, rarityBorder } from '@/ui/inazuma/Glyphs'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import type { Actor, ChainStep, MatchEvent, MatchState } from '@/engine/inazuma/types'

/**
 * Avance del balón, en % del ancho del campo, para el equipo que ataca hacia la
 * DERECHA. Coincide con los tres eslabones del motor: sacar el balón, romper la
 * defensa y definir.
 */
const STEP_X: Record<ChainStep, number> = {
  construccion: 30,
  penetracion: 54,
  definicion: 79,
}

const STEP_ZONE: Record<ChainStep, string> = {
  construccion: 'Salida de balón',
  penetracion: 'Tres cuartos',
  definicion: 'Área',
}

const STEPS: ChainStep[] = ['construccion', 'penetracion', 'definicion']

export default function MatchPitch({ match, feed, current }: {
  match: MatchState
  feed: MatchEvent[]
  /**
   * El emparejamiento de la DECISIÓN en pantalla, si la hay: el campo pinta a
   * los MISMOS dos que el panel de abajo (leer solo el feed dejaba arriba a
   * los del duelo anterior — «me aparecen jugadores diferentes»).
   */
  current?: { attackerUid: string; defenderUid: string; step: ChainStep; side: 'home' | 'away' } | null
}) {
  // El último DUELO revelado manda: quién llevaba el balón, contra quién y en
  // qué zona. Entre duelos (posesiones, goles…) se mantiene el último.
  let duel: Extract<MatchEvent, { kind: 'duel' }> | null = null
  for (let i = feed.length - 1; i >= 0; i--) {
    const e = feed[i]
    if (e.kind === 'duel') { duel = e; break }
    // Un gol o un saque CIERRAN la jugada: campo limpio hasta el próximo duelo.
    if (e.kind === 'goal' || e.kind === 'kickoff') break
  }
  const shown = current
    ? { attackerUid: current.attackerUid, defenderUid: current.defenderUid, step: current.step, side: current.side, success: false }
    : duel
  if (!shown) return null

  const mine = playerSide(match)
  const attacking = sideOf(match, shown.side)
  const carrier = actorByUid(match, shown.attackerUid)
  const marker = actorByUid(match, shown.defenderUid)
  if (!carrier || !marker) return null

  // Tú siempre atacas hacia la derecha, ataque tuyo o no: si el campo se diera
  // la vuelta a cada robo, no habría forma de leerlo de un vistazo.
  const iAttack = shown.side === mine
  const x = iAttack ? STEP_X[shown.step] : 100 - STEP_X[shown.step]
  const defX = iAttack ? Math.min(88, x + 22) : Math.max(12, x - 22)

  // Progreso de la jugada: eslabones superados. Con decisión a la vista, el
  // eslabón EN JUEGO; sin ella, el último contado (+1 si se ganó).
  const reached = STEPS.indexOf(shown.step) + (shown.success ? 1 : 0)
  const danger = reached >= STEPS.length || (current != null && shown.step === 'definicion')

  return (
    <div className="shrink-0 px-3 pt-2">
      <div
        className="relative rounded-xl border border-emerald-900/70 overflow-hidden"
        style={{
          height: 'clamp(70px, 13svh, 92px)',
          background: 'repeating-linear-gradient(90deg, #14532d 0 26px, #166534 26px 52px)',
        }}
      >
        {/* líneas: áreas y círculo central */}
        <div className="absolute inset-1 border border-white/25 rounded-sm" />
        <div className="absolute left-1/2 top-1 bottom-1 w-px bg-white/25" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25"
          style={{ width: 34, height: 34 }} />
        <div className="absolute left-1 top-1/2 -translate-y-1/2 border border-white/25"
          style={{ width: 22, height: 52 }} />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 border border-white/25"
          style={{ width: 22, height: 52 }} />

        {/* porterías, con el color de cada equipo */}
        <Goal color={sideOf(match, mine).color} side="left" />
        <Goal color={sideOf(match, mine === 'home' ? 'away' : 'home').color} side="right" />

        {/* el que defiende, un paso por detrás */}
        <Face actor={marker} x={defX} label="marca" dim />
        {/* el que lleva el balón */}
        <Face actor={carrier} x={x} label="balón" ball />

        {/* Zona y quién ataca, en UNA línea, con el progreso de la jugada. */}
        <div className={`absolute top-0.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap text-[8px] font-bold uppercase tracking-widest ${
          danger
            ? (iAttack ? 'text-emerald-300 animate-pulse' : 'text-rose-300 animate-pulse')
            : 'text-white/75'
        }`}>
          <span className="flex items-center gap-0.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  reached > i ? (iAttack ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-white/25'
                }`}
              />
            ))}
          </span>
          {danger ? '¡OCASIÓN DE GOL!' : STEP_ZONE[shown.step]} · ataca {attacking.name.replace('Instituto ', '')}
        </div>
      </div>
    </div>
  )
}

function Goal({ color, side }: { color: string; side: 'left' | 'right' }) {
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{ width: 4, height: 30, background: color }}
    />
  )
}

/** Retrato en el césped, con el nombre debajo y el color de su elemento. */
function Face({ actor, x, label, ball, dim }: {
  actor: Actor
  x: number
  label: string
  ball?: boolean
  dim?: boolean
}) {
  const info = ELEMENT_INFO[actor.element]
  return (
    <div
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
      style={{ left: `${x}%`, opacity: dim ? 0.8 : 1 }}
    >
      <div className="relative">
        <div
          className="relative w-9 h-9 rounded-full overflow-hidden border-2 grid place-items-center bg-slate-900"
          style={{
            // Legendario = anillo multicolor animado, no el rosa plano.
            borderColor: actor.rarity === 4 ? 'transparent' : actor.rarity ? rarityBorder(actor.rarity) : info.color,
            boxShadow: ball ? `0 0 10px ${info.color}` : undefined,
          }}
        >
          <ImgFallback
            src={portraitUrl(actor.baseId)}
            className="w-full h-full object-cover object-top"
            alt={actor.name}
            fallback={<span className="text-[10px] font-extrabold" style={{ color: info.color }}>
              {actor.name.slice(0, 2).toUpperCase()}
            </span>}
          />
          {actor.rarity === 4 && <span className="mc-ring rounded-full" />}
        </div>
        {ball && <Pic name="ball" className="absolute -bottom-1 -right-1.5 w-4 h-4 drop-shadow" />}
      </div>
      {/* Solo el nombre de pila: el apellido no cabe sin taparlo todo. */}
      <span className="mt-0.5 max-w-[64px] truncate rounded px-1 text-[8px] font-bold bg-black/60 text-white leading-tight">
        {actor.name.split(' ')[0]}
      </span>
      <span className="text-[7px] uppercase tracking-wider text-white/70 leading-none">{label}</span>
    </div>
  )
}
