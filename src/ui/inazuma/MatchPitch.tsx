// EL CAMPO: mapa en vivo de la posesión durante el partido.
//
// La narración cuenta lo que pasa, pero no DÓNDE pasa ni quién es quién. Este
// panel enseña las tres cosas que el texto no puede: la zona en la que está el
// balón, la cara del que lo lleva y la del que tiene enfrente.
//
// No calcula nada: lee `match.chain` (el eslabón vivo de la posesión) y lo
// dibuja. Si el motor cambia el número de eslabones, aquí solo hay que tocar
// `STEP_X`.
import { useRef } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import { Pic } from '@/ui/inazuma/Glyphs'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { actorByUid, playerSide, sideOf } from '@/engine/inazuma/match'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import type { Actor, ChainState, ChainStep, MatchState } from '@/engine/inazuma/types'

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

export default function MatchPitch({ match, frozen }: { match: MatchState; frozen?: boolean }) {
  // Entre posesión y posesión el motor deja `chain` a null. Si el campo se
  // vaciara en cada hueco, parpadearía sin parar; se mantiene la última.
  //
  // Y mientras una ANIMACIÓN cuenta un duelo (`frozen`), el campo NO avanza:
  // el motor ya va por la siguiente jugada, y mover el balón aquí destripaba
  // el desenlace por debajo del escenario.
  const last = useRef<ChainState | null>(null)
  if (!frozen && match.chain) last.current = match.chain
  const chain = frozen ? last.current : (match.chain ?? last.current)
  if (!chain) return null

  const mine = playerSide(match)
  const attacking = sideOf(match, chain.side)
  const carrier = actorByUid(match, chain.carrier)
  const marker = actorByUid(match, chain.defenderUid)
  if (!carrier || !marker) return null

  // Tú siempre atacas hacia la derecha, ataque tuyo o no: si el campo se diera
  // la vuelta a cada robo, no habría forma de leerlo de un vistazo.
  const iAttack = chain.side === mine
  const x = iAttack ? STEP_X[chain.step] : 100 - STEP_X[chain.step]
  // Separación amplia a propósito: con 13 puntos los dos retratos se pisaban en
  // la zona de tres cuartos y no se leía ni un nombre.
  const defX = iAttack ? Math.min(88, x + 22) : Math.max(12, x - 22)

  return (
    <div className="shrink-0 px-3 pt-2">
      <div
        className="relative rounded-xl border border-emerald-900/70 overflow-hidden"
        style={{
          // En pantallas cortas (móviles apaisados, iPhone SE) 92 px fijos se
          // comían la narración. Se encoge con la ventana pero nunca tanto que
          // los retratos dejen de leerse.
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

        {/* Zona y quién ataca, en UNA línea: dos rótulos (arriba y abajo) se
            comían el sitio de los retratos. */}
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-bold uppercase tracking-widest text-white/75">
          {STEP_ZONE[chain.step]} · ataca {attacking.name.replace('Instituto ', '')}
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
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300"
      style={{ left: `${x}%`, opacity: dim ? 0.8 : 1 }}
    >
      <div className="relative">
        <div
          className="w-9 h-9 rounded-full overflow-hidden border-2 grid place-items-center bg-slate-900"
          style={{ borderColor: info.color, boxShadow: ball ? `0 0 10px ${info.color}` : undefined }}
        >
          <ImgFallback
            src={portraitUrl(actor.baseId)}
            className="w-full h-full object-cover object-top"
            alt={actor.name}
            fallback={<span className="text-[10px] font-extrabold" style={{ color: info.color }}>
              {actor.name.slice(0, 2).toUpperCase()}
            </span>}
          />
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
