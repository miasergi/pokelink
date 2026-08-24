// Previa de una casilla ANTES de entrar. Es un modal encima del tablero, no
// una pantalla aparte: así no pierdes de vista el mapa al mirar qué hay en una
// casilla, y cerrar es un gesto en vez de una navegación.
//
// Aquí se explica QUÉ ES cada tipo de casilla y QUÉ TE LLEVAS, que es lo que
// hace que elegir camino sea una decisión y no una lotería.
import Icon from '@/ui/components/Icon'
import { getFighter } from '@/data/dragon/fighters'
import { getMaster } from '@/data/dragon/sagas'
import { getTechnique } from '@/data/dragon/techniques'
import { getForm } from '@/data/dragon/transformations'
import { avgLevel, TEAM_MAX, type DragonSave, type MapNode } from '@/engine/dragon/run'
import { Avatar } from './Bits'
import { NODE_META } from './MapBoard'

/** Lo que te llevas de cada casilla, en una línea. */
function rewardText(n: MapNode, save: DragonSave): string {
  switch (n.kind) {
    case 'combate': return `+4 niveles a todo el equipo y dinero`
    case 'elite': return `+6 niveles, más dinero y mejor botín`
    case 'jefe': return `+6 niveles y el paso a la saga siguiente`
    case 'entreno': return `+${n.levels ?? 3} niveles al más rezagado, sin pelear`
    case 'reclutar': return save.team.length < TEAM_MAX
      ? 'Un luchador nuevo para el equipo'
      : `El equipo está lleno (${TEAM_MAX}): aquí no ganas nada`
    case 'tienda': return 'Comprar objetos con lo que llevas encima'
    case 'descanso': return 'El equipo recupera buena parte de la vida'
    case 'bola': return `Una Bola de Dragón (${save.balls}/7)`
    case 'maestro': return 'Aprender una técnica nueva o mejorar una que ya sabes'
  }
}

export default function NodePreview({ node, save, onEnter, onClose }: {
  node: MapNode
  save: DragonSave
  onEnter: () => void
  onClose: () => void
}) {
  const meta = NODE_META[node.kind]
  const pelea = node.kind === 'combate' || node.kind === 'elite' || node.kind === 'jefe'
  const media = avgLevel(save)
  const gap = node.level != null ? node.level - media : 0
  const recluta = node.recruit ? getFighter(node.recruit) : undefined
  const maestro = node.master ? getMaster(node.master) : undefined
  const lleno = node.kind === 'reclutar' && save.team.length >= TEAM_MAX

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-3"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm max-h-[88svh] overflow-y-auto overscroll-contain rounded-3xl border bg-slate-900 p-4 animate-pop-in"
        style={{ borderColor: `${meta.color}66` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 grid place-items-center w-7 h-7 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 active:scale-95"
          aria-label="Cerrar"
        >
          <Icon name="x" className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <span
            className="grid place-items-center rounded-2xl shrink-0"
            style={{ width: 52, height: 52, background: `${meta.color}22` }}
          >
            <Icon name={meta.icon} className="w-7 h-7" style={{ color: meta.color }} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: meta.color }}>
              {meta.label}
            </div>
            <div className="font-extrabold text-base leading-tight truncate">{node.label}</div>
            <div className="text-[11.5px] text-slate-400 leading-snug mt-0.5">{node.desc}</div>
          </div>
        </div>

        {/* A quién te enfrentas */}
        {pelea && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {(node.enemies ?? []).map((id, i) => {
                const d = getFighter(id)
                if (!d) return null
                return (
                  <div key={`${id}-${i}`} className="flex items-center gap-2 rounded-xl bg-slate-800/70 p-1.5 pr-2.5">
                    <Avatar name={d.name} color={d.color} size={36} baseId={d.id} />
                    <div>
                      <div className="text-[12.5px] font-bold leading-tight">{d.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{d.style}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 border ${
                gap > 4 ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                  : gap > 1 ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                    : 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
              }`}>
                Nivel {node.level} · tu equipo {media}
              </span>
              {!!node.phases?.length && (
                <span className="text-[11px] font-bold rounded-full px-2 py-0.5 border border-rose-500/60 bg-rose-500/20 text-rose-200">
                  {node.phases.length + 1} formas
                </span>
              )}
            </div>
            {!!node.phases?.length && (
              <p className="text-[11px] text-slate-500 leading-snug">
                No cae a la primera: {node.phases.map((p) => getForm(p)?.name).filter(Boolean).join(' → ')}.
              </p>
            )}
          </div>
        )}

        {/* Quién se ofrece */}
        {recluta && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-800/70 p-2.5">
            <Avatar name={recluta.name} color={recluta.color} size={44} baseId={recluta.id} />
            <div className="min-w-0">
              <div className="font-bold text-[13px]">{recluta.name}</div>
              <div className="text-[10.5px] text-slate-400 capitalize">{recluta.style} · {recluta.lineage}</div>
              <div className="text-[10.5px] text-sky-300 truncate">
                {recluta.techniques.map((t) => getTechnique(t)?.name).filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        )}

        {maestro && (
          <div className="mt-3 rounded-xl bg-slate-800/70 p-2.5">
            <div className="font-bold text-[13px] text-cyan-300">{maestro.name}</div>
            <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{maestro.desc}</div>
            <div className="text-[10.5px] text-slate-500 mt-1">
              Enseña: {maestro.teaches.map((t) => getTechnique(t)?.name).filter(Boolean).join(', ')}
            </div>
          </div>
        )}

        <div className={`mt-3 rounded-xl border px-3 py-2 text-[12px] ${
          lleno ? 'bg-amber-500/10 border-amber-600/40 text-amber-200'
            : 'bg-slate-800/70 border-slate-700 text-emerald-300'
        }`}>
          <Icon name={lleno ? 'warning' : 'gift'} className="w-3.5 h-3.5 inline-block mr-1 align-[-2px]" />
          {rewardText(node, save)}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold text-slate-300 active:scale-95 transition"
          >
            Atrás
          </button>
          <button
            type="button"
            onClick={onEnter}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-extrabold active:scale-[0.97] transition"
            style={{ background: meta.color, color: '#0f172a' }}
          >
            {pelea ? '¡Adelante!' : node.kind === 'tienda' ? 'Entrar' : node.kind === 'maestro' ? 'Escuchar' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}
