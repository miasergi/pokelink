// VISOR DE SUPERTÉCNICA: la hoja que se abre al tocar cualquier estampa de
// técnica en el modo. Imagen en grande, clase, elemento, potencia y coste —
// y si la abre su DUEÑO, los valores EFECTIVOS con sus Mejoras (V2, V3…)
// junto a los base, para que se entienda qué está pagando y qué está pegando.
import { createPortal } from 'react-dom'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { KIND_LABEL } from '@/data/inazuma/techniques'
import { TECH_LEVEL_BONUS, techniqueCostFor } from '@/engine/inazuma/roster'
import { COMBO_COST_MULT, COMBO_MULT, COMBO_MULT_AFINIDAD, comboOf } from '@/data/inazuma/combos'
import { getPlayerBase } from '@/data/inazuma/players'
import { ComboMark, ELEMENT_ICON, KindIcon, techniqueImage, useTechSheet } from '@/ui/inazuma/Glyphs'

export default function TechniqueSheet() {
  const { tech, holder, close } = useTechSheet()
  if (!tech) return null

  const info = ELEMENT_INFO[tech.element]
  const lv = holder?.techLevels?.[tech.id] ?? 0
  const power = lv > 0 ? Math.round(tech.power * (1 + lv * TECH_LEVEL_BONUS)) : tech.power
  const cost = holder ? techniqueCostFor(holder, tech) : tech.cost

  return createPortal(
    <div className="fixed inset-0 z-[96] bg-black/80 backdrop-blur-sm grid place-items-center p-5" onClick={close}>
      <div
        className="relative w-full max-w-sm rounded-3xl border-2 bg-slate-900 p-4 animate-pop-in"
        style={{ borderColor: `${info.color}88`, boxShadow: `0 0 40px ${info.color}44` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="absolute top-2 right-2 z-10 grid place-items-center w-7 h-7 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 active:scale-95"
        >
          <Icon name="x" className="w-4 h-4" />
        </button>

        {/* LA IMAGEN, en grande. */}
        <div
          className="mx-auto w-56 h-56 rounded-2xl overflow-hidden border-2 grid place-items-center bg-slate-950"
          style={{ borderColor: `${info.color}66` }}
        >
          <ImgFallback
            src={techniqueImage(tech.id)}
            alt={tech.name}
            className="w-full h-full object-cover"
            fallback={<Icon name={ELEMENT_ICON[tech.element]} className="w-20 h-20" style={{ color: info.color }} />}
          />
        </div>

        <div className="mt-3 text-center">
          <div className="text-lg font-extrabold" style={{ color: info.color }}>
            {tech.name}
            {lv > 0 && <span className="ml-1.5 text-amber-300">V{lv + 1}</span>}
          </div>
          {tech.desc && <p className="text-[11px] text-slate-400 italic mt-0.5">{tech.desc}</p>}
        </div>

        {/* Clase · elemento · potencia · coste, en fichas grandes. */}
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <Stat label="Clase">
            <KindIcon kind={tech.kind} className="w-4 h-4 text-slate-300" />
            <span className="capitalize">{KIND_LABEL[tech.kind]}</span>
          </Stat>
          <Stat label="Elemento">
            <Icon name={ELEMENT_ICON[tech.element]} className="w-4 h-4" style={{ color: info.color }} />
            <span style={{ color: info.color }}>{info.label}</span>
          </Stat>
          <Stat label="Potencia">
            <span className="tabular-nums font-extrabold">{power}</span>
            {lv > 0 && <span className="text-[10px] text-slate-500">(base {tech.power})</span>}
          </Stat>
          <Stat label="Coste">
            <span className="tabular-nums font-extrabold text-sky-300">{cost} PT</span>
            {lv > 0 && cost !== tech.cost && <span className="text-[10px] text-slate-500">(base {tech.cost})</span>}
          </Stat>
        </div>

        {/* TÉCNICA COMBINADA: con quién se lanza y el plus de AFINIDAD. */}
        {(() => {
          const combo = comboOf(tech.id)
          if (!combo) return null
          const canon = combo.members.map((m) => getPlayerBase(m).name).join(' + ')
          return (
            <div className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-200">
                <ComboMark className="w-4 h-4" /> TÉCNICA COMBINADA ({combo.members.length} jugadores)
              </div>
              <p className="mt-1 text-[10px] text-amber-100/80 leading-snug">
                Se lanza con CUALQUIER compañero del campo (+{Math.round((COMBO_MULT - 1) * 100)} % de potencia).
                Con sus canónicos — <b>{canon}</b> — la AFINIDAD la sube al máximo
                (+{Math.round((COMBO_MULT_AFINIDAD - 1) * 100)} %). El coste total es un {Math.round((COMBO_COST_MULT - 1) * 100)} %
                mayor y SE REPARTE entre los que la lanzan (todos pagan su parte).
                La pareja preferida se elige en el vestuario.
              </p>
            </div>
          )
        })()}

        <p className="mt-2 text-[10px] text-slate-500 leading-snug text-center">
          En el duelo, la potencia multiplica el atributo del jugador que la lanza
          (y el elemento compara contra la respuesta del rival).
          {lv > 0 && ' Las Mejoras suben la potencia +25 % y abaratan el coste −15 % por nivel.'}
        </p>
      </div>
    </div>,
    document.body,
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[13px] font-bold">{children}</div>
    </div>
  )
}
