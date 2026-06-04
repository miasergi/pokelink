import type { MapNode } from '@/engine/run/types'
import { Button, ImgFallback } from './kit'
import Sprite from './Sprite'
import TypeBadge from './TypeBadge'
import { TYPES, typeEffectiveness } from '@/data/typechart'
import { getSpecies } from '@/data'
import { aceSprite } from './nodeImage'

const CLASS_ES: Record<string, string> = {
  gym: 'Líder de Gimnasio', elite: 'Alto Mando', champion: 'Campeón', rival: 'Rival', trainer: 'Entrenador',
}

export default function BossPreview({
  node, onFight, onPrepare, onClose,
}: {
  node: MapNode
  onFight: () => void
  onPrepare: () => void
  onClose: () => void
}) {
  if (node.content.kind !== 'trainer') return null
  const { trainer, team } = node.content
  const specialty = trainer.specialtyType
  const weakTo = specialty ? TYPES.filter((t) => typeEffectiveness(t, [specialty]) > 1) : []

  return (
    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl border-t border-slate-700 p-5 animate-pop-in max-h-[88%] overflow-y-auto no-scrollbar"
        style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.98), rgba(15,23,42,0.99))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          {trainer.sprite && (
            <ImgFallback
              src={trainer.sprite}
              alt={trainer.name}
              className="w-20 h-20 object-contain drop-shadow-lg"
              style={{ imageRendering: 'pixelated' }}
              fallback={<img src={aceSprite(node)} alt="" className="w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }} />}
            />
          )}
          <div className="flex-1">
            <div className="text-xs text-slate-400">{CLASS_ES[trainer.trainerClass] ?? 'Entrenador'}</div>
            <div className="text-2xl font-extrabold">{trainer.name}</div>
            {specialty && <div className="mt-1"><TypeBadge type={specialty} /></div>}
          </div>
        </div>

        {trainer.quote && <p className="text-sm text-slate-300 italic mt-3">“{trainer.quote}”</p>}

        <div className="mt-4">
          <div className="text-xs font-bold text-slate-400 mb-1.5">Su equipo ({team.length})</div>
          <div className="grid grid-cols-3 gap-2">
            {team.map((mon, i) => {
              const sp = getSpecies(mon.speciesId)
              return (
                <div key={i} className="rounded-xl bg-slate-900/60 p-1.5 flex flex-col items-center border border-slate-700/50">
                  <Sprite speciesId={mon.speciesId} variant="front" className="w-12 h-12 object-contain" />
                  <div className="text-[10px] font-semibold truncate w-full text-center">{sp.displayName}</div>
                  <div className="text-[9px] text-slate-400">Nv.{mon.level}</div>
                </div>
              )
            })}
          </div>
        </div>

        {weakTo.length > 0 && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
            <div className="text-xs font-bold text-emerald-300 mb-1.5">💡 Débil ante</div>
            <div className="flex flex-wrap gap-1">
              {weakTo.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Lleva Pokémon de estos tipos para tener ventaja.</p>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-5">
          <Button full variant="primary" onClick={onFight}>⚔ ¡Combatir!</Button>
          <Button full variant="secondary" onClick={onPrepare}>👥 Preparar equipo</Button>
          <Button full variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
        <p className="text-[11px] text-slate-500 text-center mt-2">Tu equipo se curará por completo antes del combate.</p>
      </div>
    </div>
  )
}
