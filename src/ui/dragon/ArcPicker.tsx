// Elección de ARCO. Con las trece sagas metidas, una aventura completa son
// más de setenta casillas y varias horas: obligar a eso sería un mal favor.
// Aquí eliges por dónde quieres jugar, y la curva de niveles se recalcula
// sola según cuántos tramos tenga el arco (ver `sagaLevels`).
import Icon from '@/ui/components/Icon'
import { ARCS, bossLevel, getSaga, sagaLevels } from '@/data/dragon/sagas'
import { getFighter } from '@/data/dragon/fighters'
import { BOSS_LAYER } from '@/engine/dragon/run'
import { Avatar, Header } from './Bits'

export default function ArcPicker({ onPick, onBack }: {
  onPick: (arcId: string) => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="¿Qué historia juegas?" sub="Cada arco es una aventura completa" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2.5">
        {ARCS.map((arc) => {
          const sagas = arc.sagas.map((id) => getSaga(id))
          const casillas = arc.sagas.length * (BOSS_LAYER + 1)
          const final = sagas[sagas.length - 1]
          const jefeFinal = getFighter(final.boss.id)
          return (
            <button
              key={arc.id}
              type="button"
              onClick={() => onPick(arc.id)}
              className="w-full text-left rounded-2xl p-3 active:scale-[0.99] transition"
              style={{
                background: `radial-gradient(120% 80% at 0% 0%, ${arc.color}22, transparent 60%), #0f172a`,
                boxShadow: `inset 0 0 0 1.5px ${arc.color}66`,
              }}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-1 min-w-0">
                  <div className="font-black text-[15px] leading-tight" style={{ color: arc.color }}>
                    {arc.name}
                  </div>
                  <div className="text-[11px] text-slate-400">{arc.subtitle}</div>
                </div>
                {jefeFinal && (
                  <Avatar name={jefeFinal.name} color={jefeFinal.color} size={44} baseId={jefeFinal.id} />
                )}
              </div>

              <p className="text-[11.5px] text-slate-300 leading-snug mt-2">{arc.desc}</p>

              {/* Los tramos, en orden: se ve de un vistazo por dónde pasas */}
              <div className="flex flex-wrap gap-1 mt-2">
                {sagas.map((s, i) => (
                  <span
                    key={s.id}
                    className="text-[9.5px] rounded-lg px-1.5 py-0.5"
                    style={{ background: `${s.color}22`, color: s.color }}
                  >
                    {i + 1}. {s.name}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2.5 mt-2 text-[10.5px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Icon name="map" className="w-3 h-3" />~{casillas} casillas
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="chartUp" className="w-3 h-3" />
                  Nv.{sagaLevels(0)[0]} → {bossLevel(arc.sagas.length - 1)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="skull" className="w-3 h-3" />{arc.sagas.length} jefes
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
