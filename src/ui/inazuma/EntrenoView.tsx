// LA RUEDA DE ENTRENAMIENTO: la casilla que sustituye a las pachangas.
// Cuatro planes con decisión de verdad: machacar a uno, cargar al equipo,
// rodar suave o recuperar. Aquí NUNCA caen medallas de rareza — esas solo
// salen de tiendas, casillas de objeto y partidos.
import { useState } from 'react'
import { Button, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { getPlayerBase } from '@/data/inazuma/players'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { rarityBorder } from '@/ui/inazuma/Glyphs'
import { rarityOf } from '@/engine/inazuma/roster'

const PLANES = [
  {
    id: 'uno' as const,
    icon: 'flame',
    color: '#f87171',
    title: 'Intensivo a uno',
    desc: 'Elige a UN jugador: +5 niveles… y acaba con el aguante al 50 %.',
  },
  {
    id: 'equipo' as const,
    icon: 'whistle',
    color: '#fbbf24',
    title: 'Intensivo de equipo',
    desc: '+2 niveles a TODOS, a cambio de un 25 % de aguante de cada uno.',
  },
  {
    id: 'suave' as const,
    icon: 'ball',
    color: '#34d399',
    title: 'Rondo suave',
    desc: '+1 nivel a todos. Nadie se cansa.',
  },
  {
    id: 'recuperacion' as const,
    icon: 'heal',
    color: '#38bdf8',
    title: 'Recuperación total',
    desc: 'Aguante y PT al máximo para toda la plantilla. Hoy no se suda.',
  },
]

export default function EntrenoView() {
  const { save, resolveEntreno } = useInazuma()
  // El intensivo a uno pide VÍCTIMA: segundo paso con la plantilla delante.
  const [picking, setPicking] = useState(false)
  if (!save) return null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2">
        <div className="font-extrabold text-sm">Rueda de entrenamiento</div>
        <div className="text-[11px] text-slate-400">
          {picking ? '¿Quién se lleva el machaque? +5 niveles, −50 de aguante.' : 'Elige el plan del día. Solo uno.'}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-2">
        {!picking && PLANES.map((plan) => (
          <button
            key={plan.id}
            onClick={() => (plan.id === 'uno' ? setPicking(true) : resolveEntreno(plan.id))}
            className="rounded-2xl border p-3 text-left transition active:scale-[0.99]"
            style={{ borderColor: `${plan.color}55`, background: `linear-gradient(130deg, ${plan.color}1c, rgba(15,23,42,.9) 60%)` }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-10 h-10 shrink-0 grid place-items-center rounded-xl border"
                style={{ borderColor: `${plan.color}66`, background: `${plan.color}22` }}
              >
                <Icon name={plan.icon} className="w-5 h-5" style={{ color: plan.color }} />
              </span>
              <div className="min-w-0">
                <div className="font-extrabold text-sm" style={{ color: plan.color }}>{plan.title}</div>
                <div className="text-[11px] text-slate-400 leading-snug">{plan.desc}</div>
              </div>
            </div>
          </button>
        ))}

        {picking && (
          <>
            {save.roster.map((p) => {
              const b = getPlayerBase(p.baseId)
              const r = rarityOf(p)
              return (
                <button
                  key={p.uid}
                  onClick={() => resolveEntreno('uno', p.uid)}
                  className="flex items-center gap-2.5 rounded-2xl border border-slate-700 bg-slate-800/60 p-2 text-left transition active:scale-[0.99]"
                >
                  <span
                    className="relative w-11 h-11 shrink-0 rounded-full overflow-hidden border-2 grid place-items-center bg-slate-900"
                    style={{ borderColor: r === 4 ? 'transparent' : rarityBorder(r) }}
                  >
                    <ImgFallback
                      src={portraitUrl(b.id)}
                      className="w-full h-full object-cover object-top"
                      fallback={<span className="text-[10px] font-extrabold">{b.name.slice(0, 2).toUpperCase()}</span>}
                    />
                    {r === 4 && <span className="mc-ring rounded-full" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold truncate">{b.name}</div>
                    <div className="text-[10px] text-slate-400">Nv.{p.level} → <b className="text-emerald-300">Nv.{p.level + 5}</b> · {b.position}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] uppercase tracking-wide text-slate-500">Aguante</div>
                    <div className="text-[12px] font-bold tabular-nums">
                      {Math.round(p.stamina)} → <span className="text-rose-300">{Math.max(0, Math.round(p.stamina) - 50)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
            <Button variant="ghost" full onClick={() => setPicking(false)}>Mejor otro plan</Button>
          </>
        )}
      </div>
    </div>
  )
}
