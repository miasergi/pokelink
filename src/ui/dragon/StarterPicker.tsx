// Elección de INICIAL, con el peso que tiene: se empieza la aventura con un
// solo luchador —como el inicial de Pokémon— y el equipo se hace por el camino,
// así que esta pantalla es la primera decisión de verdad de la partida.
//
// Por eso no es una lista: es una carta grande del elegido con sus atributos,
// su carácter y sus técnicas, y una fila de caras abajo para ir comparando
// antes de comprometerse.
import { useState } from 'react'
import Icon from '@/ui/components/Icon'
import { getFighter, STARTER_PITCH, STARTERS } from '@/data/dragon/fighters'
import { getTechnique } from '@/data/dragon/techniques'
import { getForm } from '@/data/dragon/transformations'
import { getTrait, TRAIT_BY_FIGHTER } from '@/data/dragon/personalities'
import { getArc } from '@/data/dragon/sagas'
import { START_LEVEL, TEAM_MAX } from '@/engine/dragon/run'
import { maxHp, statsAt } from '@/engine/dragon/roster'
import type { StatKey } from '@/engine/dragon/types'
import { Avatar, Header } from './Bits'

const STAT_ROWS: { k: StatKey; label: string; icon: string }[] = [
  { k: 'poder', label: 'Poder', icon: 'swords' },
  { k: 'ki', label: 'Ki', icon: 'spark' },
  { k: 'defensa', label: 'Defensa', icon: 'shield' },
  { k: 'velocidad', label: 'Velocidad', icon: 'boot' },
  { k: 'aguante', label: 'Aguante', icon: 'heal' },
]

export default function StarterPicker({ arc, onPick, onBack }: {
  arc: string
  onPick: (id: string) => void
  onBack: () => void
}) {
  const [sel, setSel] = useState<string>(STARTERS[0])
  const d = getFighter(sel)!
  const s = statsAt(d.base, START_LEVEL)
  const rasgo = getTrait(TRAIT_BY_FIGHTER[d.id] ?? '')
  // Escala común a TODOS los iniciales: si cada carta se normalizase con su
  // propio máximo, todos parecerían igual de buenos y la elección sería a ciegas.
  const tope = Math.max(
    ...STARTERS.flatMap((id) => {
      const st = statsAt(getFighter(id)!.base, START_LEVEL)
      return STAT_ROWS.map((r) => st[r.k])
    }),
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Elige a tu guerrero"
        sub={`${getArc(arc).name} · empiezas solo con él`}
        onBack={onBack}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
        <div
          className="rounded-3xl p-4 animate-pop-in"
          style={{
            background: `radial-gradient(120% 80% at 50% 0%, ${d.color}33, transparent 60%), #0f172a`,
            boxShadow: `inset 0 0 0 1.5px ${d.color}66`,
          }}
        >
          <div className="flex items-center gap-3">
            <Avatar name={d.name} color={d.color} size={84} baseId={d.id} />
            <div className="min-w-0">
              <div className="font-black text-lg leading-tight">{d.name}</div>
              <div className="text-[11.5px] text-slate-400 capitalize">
                {d.style} · {d.lineage} · Nv.{START_LEVEL}
              </div>
              <div className="text-[11.5px] text-slate-300 leading-snug mt-1">
                {STARTER_PITCH[d.id] ?? ''}
              </div>
            </div>
          </div>

          <div className="space-y-1 mt-3">
            {STAT_ROWS.map((r) => (
              <div key={r.k} className="flex items-center gap-2">
                <Icon name={r.icon} className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="text-[10.5px] text-slate-400 w-16 shrink-0">{r.label}</span>
                <div className="flex-1 rounded-full bg-slate-800 overflow-hidden" style={{ height: 7 }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${(s[r.k] / tope) * 100}%`, background: d.color }}
                  />
                </div>
                <span className="text-[10.5px] tabular-nums text-slate-300 w-7 text-right shrink-0">
                  {Math.round(s[r.k])}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-0.5">
              <Icon name="lifebuoy" className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="text-[10.5px] text-slate-400 w-16 shrink-0">PS</span>
              <span className="text-[10.5px] tabular-nums text-slate-300">{maxHp(s.aguante)}</span>
            </div>
          </div>

          {rasgo && (
            <div className="mt-3 rounded-xl bg-purple-500/10 px-2.5 py-1.5" style={{ boxShadow: 'inset 0 0 0 1px #a78bfa44' }}>
              <div className="text-[11px] font-bold text-purple-300">{rasgo.name}</div>
              <div className="text-[10.5px] text-slate-400 leading-snug">{rasgo.desc}</div>
            </div>
          )}

          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Empieza sabiendo</div>
            <div className="flex flex-wrap gap-1">
              {d.techniques.map((t) => {
                const tec = getTechnique(t)
                if (!tec) return null
                return (
                  <span key={t} className="text-[10.5px] rounded-lg bg-slate-800 px-2 py-0.5">
                    {tec.name} <span className="text-sky-300">· {tec.cost} ki</span>
                  </span>
                )
              })}
            </div>
          </div>

          {!!d.forms?.length && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                Puede llegar a despertar
              </div>
              <div className="flex flex-wrap gap-1">
                {d.forms.map((id) => (
                  <span key={id} className="text-[10.5px] rounded-lg bg-amber-500/15 text-amber-200 px-2 py-0.5">
                    {getForm(id)?.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-[11.5px] text-slate-500 px-1">
          Irás encontrando aliados por el camino hasta {TEAM_MAX}. La primera
          casilla siempre ofrece uno, así que no estarás solo mucho tiempo.
        </p>
      </div>

      {/* La fila de caras: comparar sin perder de vista la carta grande */}
      <div className="shrink-0 border-t border-slate-800 px-2 py-2">
        <div className="flex gap-1.5 justify-center">
          {STARTERS.map((id) => {
            const f = getFighter(id)!
            const activo = id === sel
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSel(id)}
                className="rounded-xl p-0.5 transition active:scale-95"
                style={{
                  boxShadow: activo ? `0 0 0 2px ${f.color}, 0 0 14px ${f.color}66` : '0 0 0 1px #ffffff14',
                  opacity: activo ? 1 : 0.6,
                }}
                aria-label={f.name}
              >
                <Avatar name={f.name} color={f.color} size={44} baseId={f.id} />
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => onPick(sel)}
          className="w-full mt-2 rounded-xl py-3 font-extrabold text-slate-900 active:scale-[0.98] transition"
          style={{ background: d.color }}
        >
          Empezar con {d.name}
        </button>
      </div>
    </div>
  )
}
