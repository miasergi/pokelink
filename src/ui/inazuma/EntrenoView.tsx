// LA RUEDA DE ENTRENAMIENTO: la casilla que sustituye a las pachangas.
// Cinco planes con decisión de verdad — y con DIENTES: entrenar cansa, y
// agotarse LESIONA (la misma regla que en el partido). El riesgo se enseña
// ANTES de elegir, como el «¿Entra? %» del disparo. Aquí NUNCA caen medallas
// de rareza — esas solo salen de tiendas, casillas de objeto y partidos.
import { useState } from 'react'
import { Button, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { getPlayerBase } from '@/data/inazuma/players'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { ELEMENT_ICON, InjuryCross, rarityBorder } from '@/ui/inazuma/Glyphs'
import { rarityOf } from '@/engine/inazuma/roster'
import { ELEMENT_INFO, elementMultiplier } from '@/engine/inazuma/elements'
import { ELEMENTS, type Element } from '@/engine/inazuma/types'

const PLANES = [
  {
    id: 'uno' as const,
    icon: 'flame',
    color: '#f87171',
    title: 'Intensivo a uno',
    desc: 'Elige a UN jugador: +5 niveles… y −50 de aguante. Si acaba a cero, LESIÓN.',
  },
  {
    id: 'experto' as const,
    icon: 'bolt',
    color: '#c084fc',
    title: 'Intensivo experto (elemental)',
    desc: '+1 nivel a todos y +1 EXTRA a los del elemento elegido. Cansa un 20-35 %. Riesgo de lesión: 0 % los suyos · 10 % neutros · 20 % el elemento débil.',
  },
  {
    id: 'normal' as const,
    icon: 'ball',
    color: '#34d399',
    title: 'Entrenamiento de equipo',
    desc: '+1 nivel a todos. Cansa un 10-20 % y un 5 % de riesgo de lesión.',
  },
  {
    id: 'recuperacion' as const,
    icon: 'heal',
    color: '#38bdf8',
    title: 'Recuperación total',
    desc: 'Aguante y PT al máximo para toda la plantilla. Las LESIONES no: eso es cosa del fisio.',
  },
  {
    id: 'fisio' as const,
    icon: 'medal',
    color: '#fb7185',
    title: 'Fisio especial',
    desc: 'Recupera a UN jugador lesionado (vuelve con algo de aguante).',
  },
]

export default function EntrenoView() {
  const { save, resolveEntreno } = useInazuma()
  // Los planes con segundo paso: víctima del intensivo, elemento del experto
  // o lesionado del fisio.
  const [step, setStep] = useState<null | 'uno' | 'experto' | 'fisio'>(null)
  if (!save) return null
  const lesionados = save.roster.filter((p) => p.injured)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2">
        <div className="font-extrabold text-sm">Rueda de entrenamiento</div>
        <div className="text-[11px] text-slate-400">
          {step === 'uno' ? '¿Quién se lleva el machaque? +5 niveles, −50 de aguante.'
            : step === 'experto' ? '¿De qué elemento es la sesión? Los suyos brillan; el resto arriesga.'
              : step === 'fisio' ? '¿A quién recupera el fisio?'
                : 'Elige el plan del día. Solo uno — y agotarse LESIONA.'}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-2">
        {!step && PLANES.map((plan) => {
          const disabled = plan.id === 'fisio' && !lesionados.length
          return (
            <button
              key={plan.id}
              disabled={disabled}
              onClick={() => (plan.id === 'uno' || plan.id === 'experto' || plan.id === 'fisio'
                ? setStep(plan.id)
                : resolveEntreno(plan.id))}
              className={`rounded-2xl border p-3 text-left transition active:scale-[0.99] ${disabled ? 'opacity-40' : ''}`}
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
                  <div className="font-extrabold text-sm" style={{ color: plan.color }}>
                    {plan.title}
                    {plan.id === 'fisio' && lesionados.length > 0 && (
                      <span className="ml-1.5 text-[10px] text-rose-300">({lesionados.length} en la enfermería)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">{plan.desc}</div>
                </div>
              </div>
            </button>
          )
        })}
        {!step && lesionados.length > 0 && (
          <p className="text-[10px] text-rose-300/80 leading-snug">
            Los lesionados no entrenan ni suben de nivel: fisio, o esperar al final del próximo partido oficial.
          </p>
        )}

        {/* PASO 2 del EXPERTO: elegir el elemento de la sesión, viendo el
            RIESGO que corre cada uno de los tuyos con esa elección. */}
        {step === 'experto' && (
          <>
            {ELEMENTS.map((el) => {
              const info = ELEMENT_INFO[el]
              const sanos = save.roster.filter((p) => !p.injured)
              const riesgoDe = (pel: Element) => (pel === el ? 0 : elementMultiplier(el, pel) > 1 ? 20 : 10)
              const conRiesgo = sanos.filter((p) => riesgoDe(getPlayerBase(p.baseId).element) > 0).length
              const beneficiados = sanos.length - conRiesgo
              return (
                <button
                  key={el}
                  onClick={() => { resolveEntreno('experto', undefined, el); setStep(null) }}
                  className="rounded-2xl border p-3 text-left transition active:scale-[0.99]"
                  style={{ borderColor: `${info.color}55`, background: `${info.color}12` }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon name={ELEMENT_ICON[el]} className="w-7 h-7 shrink-0" style={{ color: info.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm" style={{ color: info.color }}>Sesión de {info.label}</div>
                      <div className="text-[10px] text-slate-400 leading-snug">
                        {beneficiados} de los tuyos a doble nivel y sin riesgo · {conRiesgo} arriesgan lesión
                      </div>
                    </div>
                  </div>
                  {/* Quién arriesga cuánto, cara a cara. */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {sanos.map((p) => {
                      const b = getPlayerBase(p.baseId)
                      const r = riesgoDe(b.element)
                      return (
                        <span
                          key={p.uid}
                          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${
                            r === 0 ? 'border-emerald-500/50 text-emerald-300'
                              : r === 10 ? 'border-slate-600 text-slate-400'
                                : 'border-rose-500/60 text-rose-300'
                          }`}
                        >
                          {b.name.split(' ')[0]} {r === 0 ? '+2' : `${r}%`}
                        </span>
                      )
                    })}
                  </div>
                </button>
              )
            })}
            <Button variant="ghost" full onClick={() => setStep(null)}>Mejor otro plan</Button>
          </>
        )}

        {(step === 'uno' || step === 'fisio') && (
          <>
            {(step === 'fisio' ? lesionados : save.roster.filter((p) => !p.injured)).map((p) => {
              const b = getPlayerBase(p.baseId)
              const r = rarityOf(p)
              const quedaria = Math.max(0, Math.round(p.stamina) - 50)
              return (
                <button
                  key={p.uid}
                  onClick={() => { resolveEntreno(step, p.uid); setStep(null) }}
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
                    {p.injured && <InjuryCross className="absolute -top-0.5 -right-0.5 w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold truncate">{b.name}</div>
                    {step === 'uno'
                      ? <div className="text-[10px] text-slate-400">Nv.{p.level} → <b className="text-emerald-300">Nv.{p.level + 5}</b> · {b.position}</div>
                      : <div className="text-[10px] text-rose-300">Lesionado · el fisio lo deja disponible</div>}
                  </div>
                  {step === 'uno' && (
                    <div className="text-right shrink-0">
                      <div className="text-[9px] uppercase tracking-wide text-slate-500">Aguante</div>
                      <div className="text-[12px] font-bold tabular-nums">
                        {Math.round(p.stamina)} → <span className={quedaria <= 0 ? 'text-rose-400 font-extrabold' : 'text-rose-300'}>{quedaria}</span>
                      </div>
                      {quedaria <= 0 && <div className="text-[9px] font-extrabold text-rose-400">¡SE LESIONARÍA!</div>}
                    </div>
                  )}
                </button>
              )
            })}
            <Button variant="ghost" full onClick={() => setStep(null)}>Mejor otro plan</Button>
          </>
        )}
      </div>
    </div>
  )
}
