import type { Difficulty } from '@/engine/run/types'

export const DIFFS: { id: Difficulty; label: string; desc: string }[] = [
  { id: 'normal', label: 'Normal', desc: 'Equilibrado. Los Pokémon suben de nivel por casilla (+1 salvaje, +2 entrenador, +5 jefes) y puedes llegar 5 niveles por encima del próximo jefe. Perder un combate = fin de la partida.' },
  { id: 'hard', label: 'Difícil', desc: 'Los enemigos llevan hasta +3 niveles y aparecen especies más fuertes antes. Con tope, como mucho IGUALAS el nivel del jefe: nunca vas por encima.' },
  { id: 'nuzlocke', label: 'Nuzlocke', desc: 'La MISMA dificultad de combate que Difícil, pero si un Pokémon se debilita lo PIERDES para siempre. A cambio eliges cuántas vidas quieres: cada vida te deja perder un combate y seguir adelante.' },
]

/**
 * Dificultad + tope de nivel. Vive en la pantalla de configuración de la
 * partida (no en la de elegir inicial) para que todo lo que define la run se
 * decida en el mismo sitio, antes de escoger compañero.
 */
export default function RunOptions({
  difficulty, onDifficulty, freeLevel, onFreeLevel, lives, onLives,
}: {
  difficulty: Difficulty
  onDifficulty: (d: Difficulty) => void
  freeLevel: boolean
  onFreeLevel: (v: boolean) => void
  lives: number
  onLives: (n: number) => void
}) {
  return (
    <>
      <div>
        <div className="text-xs font-bold text-slate-400 mb-1.5">Dificultad</div>
        <div className="grid grid-cols-3 gap-2">
          {DIFFS.map((d) => (
            <button
              key={d.id}
              onClick={() => onDifficulty(d.id)}
              className={`rounded-xl py-2 text-sm font-bold transition ${
                difficulty === d.id ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">{DIFFS.find((d) => d.id === difficulty)?.desc}</p>
      </div>

      {/* Vidas: solo tienen sentido en Nuzlocke, que es donde la muerte es
          permanente y perder un combate acabaría la run de golpe. */}
      {difficulty === 'nuzlocke' && (
        <div>
          <div className="text-xs font-bold text-slate-400 mb-1.5">Vidas</div>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => onLives(n)}
                className={`rounded-xl py-2 text-sm font-bold transition ${lives === n ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                {n === 0 ? '☠' : n}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {lives === 0
              ? 'Sin vidas: Nuzlocke puro. El primer combate perdido acaba la partida.'
              : `${lives} ${lives === 1 ? 'vida' : 'vidas'}: puedes perder ${lives} ${lives === 1 ? 'combate' : 'combates'} y seguir. Los Pokémon caídos se pierden igual, para siempre.`}
          </p>
        </div>
      )}

      <div>
        <div className="text-xs font-bold text-slate-400 mb-1.5">Nivel de tu equipo</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onFreeLevel(false)}
            className={`rounded-xl py-2 text-sm font-bold transition ${!freeLevel ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            Con tope
          </button>
          <button
            onClick={() => onFreeLevel(true)}
            className={`rounded-xl py-2 text-sm font-bold transition ${freeLevel ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            Nivel libre
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          {freeLevel
            ? 'Sin límite: tus Pokémon pueden subir hasta el nivel 100 cuando quieras. Puedes sobrelevelear y arrasar, pero el mérito de ganar también baja.'
            : difficulty === 'normal'
              ? 'No pasas de 5 niveles por encima del próximo jefe. Evita sobrelevelear y mantiene el reto parejo toda la run.'
              : difficulty === 'hard'
                ? 'Tu tope es EXACTAMENTE el nivel del as del próximo jefe: puedes igualarlo, nunca superarlo.'
                : 'Tu tope queda 1 nivel POR DEBAJO del as del próximo jefe: llegas siempre en desventaja.'}
        </p>
      </div>
    </>
  )
}
