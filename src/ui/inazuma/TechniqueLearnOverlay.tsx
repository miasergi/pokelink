// ¡NUEVA SUPERTÉCNICA! La animación de aprendizaje: cuando un jugador cruza
// su umbral de nivel y despierta un paso de su cadena, se anuncia a pantalla
// — el equivalente a la evolución del modo Pokémon. La cola vive en el store
// (`learnFx`) y se enseña de una en una; tocar pasa a la siguiente.
import { useEffect } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { getTechnique } from '@/data/inazuma/techniques'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { TechIcons } from '@/ui/inazuma/Glyphs'
import { play } from '@/utils/sfx'

const BASE = import.meta.env.BASE_URL

export default function TechniqueLearnOverlay() {
  const fx = useInazuma((s) => s.learnFx[0])
  const clearLearnFx = useInazuma((s) => s.clearLearnFx)
  useEffect(() => {
    if (fx) play('supertecnica')
  }, [fx?.uid, fx?.techId])
  if (!fx) return null
  const tech = getTechnique(fx.techId)
  if (!tech) return null
  const info = ELEMENT_INFO[tech.element]

  return (
    <div
      className="absolute inset-0 z-[85] bg-black/80 backdrop-blur-sm grid place-items-center p-4"
      onClick={clearLearnFx}
    >
      <div
        className="w-full max-w-xs rounded-3xl border-2 bg-slate-900 p-4 text-center animate-pop-in"
        style={{ borderColor: info.color, boxShadow: `0 0 40px ${info.color}55` }}
      >
        <div className="text-[10px] uppercase tracking-[0.25em] font-extrabold" style={{ color: info.color }}>
          ¡Nueva supertécnica!
        </div>

        {/* El alumno y lo aprendido, cara a cara. */}
        <div className="mt-3 flex items-center justify-center gap-3">
          <span className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-600 bg-slate-950 shrink-0">
            <ImgFallback
              src={portraitUrl(fx.baseId)}
              className="w-full h-full object-cover object-top"
              alt={fx.playerName}
              fallback={<span className="grid place-items-center w-full h-full font-black">{fx.playerName.slice(0, 2).toUpperCase()}</span>}
            />
          </span>
          <Icon name="arrowRight" className="w-5 h-5 text-slate-500 shrink-0" />
          <span
            className="w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 fx-charge"
            style={{ borderColor: info.color }}
          >
            <ImgFallback
              src={`${BASE}inazuma/techniques/${tech.id}.png`}
              className="w-full h-full object-cover"
              alt={tech.name}
              fallback={<span className="grid place-items-center w-full h-full text-[9px] font-bold px-1">{tech.name}</span>}
            />
          </span>
        </div>

        <div className="mt-3 text-sm font-bold text-slate-100">
          ¡{fx.playerName} ha aprendido…
        </div>
        <div
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-black uppercase tracking-wide"
          style={{ color: info.color, borderColor: `${info.color}88`, background: `${info.color}14` }}
        >
          <TechIcons tech={tech} className="w-4 h-4" />
          {tech.name}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          {tech.kind} · {info.label} · potencia <b className="text-amber-300">{tech.power}</b>
        </div>

        <div className="mt-3 text-[10px] text-slate-500">Toca para continuar</div>
      </div>
    </div>
  )
}
