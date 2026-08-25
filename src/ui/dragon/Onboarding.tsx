// Explicación de las reglas la primera vez que entras. Mismo patrón que el
// onboarding de Inazuma (localStorage + se puede volver a abrir desde el
// título), y por el mismo motivo: este modo tiene DOS cosas que no se deducen
// mirando —la economía de ki y qué es cada casilla del mapa— y sin contarlas
// el jugador va a ciegas.
import { useState } from 'react'
import Icon from '@/ui/components/Icon'
import { KI_CHARGE, KI_GUARD, KI_PUNCH } from '@/engine/dragon/battle'
import { NODE_META } from './MapBoard'
import type { NodeKind } from '@/engine/dragon/run'

const KEY = 'dragon:onboarded'

export function shouldShowOnboarding(): boolean {
  try {
    return typeof localStorage !== 'undefined' && !localStorage.getItem(KEY)
  } catch { return false }
}

export function markOnboarded(seen = true): void {
  try {
    if (seen) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch { /* da igual */ }
}

/** Qué hace cada casilla, en una línea. Es la leyenda del mapa. */
const CASILLAS: { kind: NodeKind; desc: string }[] = [
  { kind: 'combate', desc: 'Pelea normal. Sube +4 niveles a TODO el equipo (peleen o no) y da dinero.' },
  { kind: 'elite', desc: 'Rival duro: +6 niveles y mejor botín, pero pega de verdad.' },
  { kind: 'jefe', desc: 'Cierra la saga. Tiene varias formas: no cae a la primera.' },
  { kind: 'entreno', desc: 'Niveles sin arriesgar la piel, para el más rezagado.' },
  { kind: 'reclutar', desc: 'Un luchador nuevo. La PRIMERA casilla siempre ofrece uno: empiezas solo.' },
  { kind: 'maestro', desc: 'Enseña una técnica nueva o mejora una que ya sabes (V2, V3…).' },
  { kind: 'tienda', desc: 'Objetos: los de equipo se llevan puestos, los de uso se gastan peleando.' },
  { kind: 'descanso', desc: 'Recupera buena parte de la vida. Los PS NO se curan solos entre casillas.' },
  { kind: 'bola', desc: 'Una de las siete. Al juntarlas, un deseo.' },
]

const PASOS = [
  {
    titulo: 'Todo sale del mismo ki',
    icono: 'bolt',
    cuerpo: (
      <>
        <p>
          Las técnicas, las transformaciones y empujar en un choque de rayos
          salen <b>del mismo depósito</b>. Por eso la pregunta nunca es qué
          pulsar, sino <b>cuándo gastar</b>.
        </p>
        <ul className="mt-2 space-y-1 text-[12px]">
          <li>· <b>Cuerpo a cuerpo</b>: gratis y te carga +{KI_PUNCH} de ki.</li>
          <li>· <b>Concentrar</b>: +{KI_CHARGE} de golpe, pero quedas descubierto y te pegan más fuerte.</li>
          <li>· <b>Cubrirse</b>: encajas mucho menos y ganas +{KI_GUARD}.</li>
        </ul>
        <p className="mt-2 text-amber-300">
          Una transformación DRENA ki cada turno. Si te quedas seco, se te cae
          en el peor momento.
        </p>
      </>
    ),
  },
  {
    titulo: 'Tú decides lo importante',
    icono: 'swords',
    cuerpo: (
      <>
        <p>
          Empiezas con <b>un solo luchador</b>, el que elijas. El equipo se hace
          por el camino, hasta cuatro.
        </p>
        <p className="mt-2">
          El combate corre solo y <b>para en lo que importa</b>: la jugada de
          cada asalto, el choque de rayos y el relevo cuando cae alguien.
        </p>
        <p className="mt-2">
          Cada opción trae su coste en ki y sus <b>estrellas</b> de cómo pinta.
          Arriba tienes Pausa, ×2 y Auto para los combates de trámite.
        </p>
        <p className="mt-2 text-amber-300">
          Las transformaciones no se compran: <b>se despiertan</b> peleando al
          límite. Y ganar con la vida en rojo hace más fuerte a un saiyan para
          siempre.
        </p>
        <p className="mt-2">
          Con el depósito casi lleno sale la <b className="text-rose-300">DEFINITIVA</b>:
          pega como nada, pero solo una vez por combate. Y si llevas a los dos
          de una pareja, podéis <b className="text-fuchsia-300">FUSIONAROS</b> en
          uno solo — gastas dos cuerpos por uno mucho mejor.
        </p>
      </>
    ),
  },
  {
    titulo: 'El camino lo eliges tú',
    icono: 'map',
    cuerpo: null, // este paso pinta la leyenda de casillas
  },
]

export default function DragonOnboarding({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const paso = PASOS[i]
  const ultimo = i === PASOS.length - 1

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm grid place-items-center p-3">
      <div className="w-full max-w-sm max-h-[88svh] overflow-y-auto rounded-3xl border border-amber-600/50 bg-slate-900 p-4 animate-pop-in">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center rounded-2xl shrink-0 bg-amber-500/15" style={{ width: 44, height: 44 }}>
            <Icon name={paso.icono} className="w-6 h-6 text-amber-300" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-300">
              Cómo se juega · {i + 1} de {PASOS.length}
            </div>
            <div className="font-extrabold text-base leading-tight">{paso.titulo}</div>
          </div>
        </div>

        <div className="mt-3 text-[12.5px] text-slate-300 leading-snug">
          {paso.cuerpo ?? (
            <>
              <p className="mb-2">
                El mapa va <b>de arriba abajo</b>: empiezas arriba y el jefe está
                al final. Desde donde estás solo puedes ir a las casillas
                conectadas, así que elegir ruta es parte del juego.
              </p>
              <div className="space-y-1.5">
                {CASILLAS.map(({ kind, desc }) => {
                  const meta = NODE_META[kind]
                  return (
                    <div key={kind} className="flex items-start gap-2">
                      <span
                        className="grid place-items-center rounded-full border shrink-0 mt-0.5"
                        style={{ width: 26, height: 26, borderColor: meta.color, background: `${meta.color}22` }}
                      >
                        <Icon name={meta.icon} className="w-3.5 h-3.5" style={{ color: meta.color }} />
                      </span>
                      <div className="min-w-0">
                        <span className="text-[12px] font-bold" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="text-[11.5px] text-slate-400"> · {desc}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 text-[11.5px] text-slate-500">
                Las estrellas sobre una casilla avisan de que el rival te saca
                nivel. Y toca cualquier casilla para ver qué hay antes de entrar.
              </p>
            </>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI(i - 1)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-[13px] font-bold text-slate-300 active:scale-95 transition"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={() => (ultimo ? onClose() : setI(i + 1))}
            className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-[13px] font-extrabold text-slate-900 active:scale-[0.97] transition"
          >
            {ultimo ? '¡Vamos!' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
