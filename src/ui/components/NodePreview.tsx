import type { MapNode } from '@/engine/run/types'
import { Button, ImgFallback } from './kit'
import Sprite from './Sprite'
import TypeBadge from './TypeBadge'
import { getSpecies } from '@/data'
import { nodeImage, aceSprite } from './nodeImage'
import { nodeDifficulty, isCombatNode } from '@/engine/run/difficulty'
import type { PokemonType } from '@/types'

const CLASS_ES: Record<string, string> = {
  gym: 'Líder de Gimnasio', elite: 'Alto Mando', champion: 'Campeón', rival: 'Rival', trainer: 'Entrenador',
}
const SIMPLE: Partial<Record<string, { title: string; desc: string }>> = {
  battle: { title: 'Hierba alta', desc: 'Aparecerá un Pokémon salvaje. El Pokémon no se ve hasta que entras.' },
  catch: { title: 'Captura', desc: 'Un Pokémon salvaje quiere unirse a tu equipo. Podrás añadirlo o cambiarlo por otro.' },
  item: { title: 'Objeto', desc: 'Elige 1 de 3 objetos para tu mochila.' },
  shop: { title: 'Tienda', desc: 'Compra objetos (pociones, revivir, objetos de batalla...) con tu dinero.' },
  heal: { title: 'Centro Pokémon', desc: 'Cura por completo los PS de todo tu equipo. Gratis.' },
  event: { title: 'Evento', desc: 'Un encuentro inesperado en el camino. Puede salir bien... o no.' },
  trade: { title: 'Intercambio', desc: 'Cambia un Pokémon por otro aleatorio de primera etapa con +3 niveles (cuesta dinero).' },
}
const REWARD: Partial<Record<string, string>> = {
  battle: '+1 nivel a todo tu equipo',
  trainer: '+2 niveles a tu equipo + dinero',
  rival: '+2 niveles + dinero',
  catch: 'un Pokémon nuevo para tu equipo',
  item: '1 objeto a elegir',
  event: 'sorpresa (objeto, dinero o Pokémon)',
  trade: 'un Pokémon nuevo (+3 niveles)',
  gym: '+2 niveles + medalla + objeto raro + dinero',
  elite: '+3 niveles + objeto raro',
  champion: '+3 niveles · ¡completar la región!',
  legendary: '+2 niveles · ¡capturas al legendario!',
}

export default function NodePreview({
  node, canEnter = true, onEnter, onClose, partyAvgLevel = 0, difficulty = 'normal',
}: {
  node: MapNode
  canEnter?: boolean
  onEnter: () => void
  onClose: () => void
  partyAvgLevel?: number
  difficulty?: string
}) {
  const content = node.content
  const isTrainer = content.kind === 'trainer'
  const trainer = content.kind === 'trainer' ? content.trainer : null
  const team = content.kind === 'trainer' ? content.team : []
  const isBoss = ['gym', 'elite', 'champion', 'rival'].includes(node.type)
  const img = nodeImage(node)

  // Debilidades (gimnasios/Alto Mando con tipo especialidad)
  const specialty = trainer?.specialtyType

  // Tipos presentes en el equipo del entrenador (para planificar)
  const teamTypes = [...new Set(team.flatMap((m) => getSpecies(m.speciesId).types))] as PokemonType[]
  const minLvl = team.length ? Math.min(...team.map((m) => m.level)) : node.enemyLevel
  const maxLvl = team.length ? Math.max(...team.map((m) => m.level)) : node.enemyLevel
  const simple = SIMPLE[node.type]
  const money = trainer
    ? trainer.reward.money
    : node.type === 'battle'
      ? 20 + node.enemyLevel * 6
      : node.type === 'legendary'
        ? 2000
        : 0

  return (
    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl border border-slate-700 p-5 animate-pop-in max-h-[90%] overflow-y-auto no-scrollbar shadow-2xl"
        style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.98), rgba(15,23,42,0.99))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center gap-3">
          {isTrainer && trainer?.sprite ? (
            <ImgFallback src={trainer.sprite} alt={trainer.name} className="w-20 h-20 object-contain drop-shadow-lg"
              style={{ imageRendering: 'pixelated' }}
              fallback={<img src={aceSprite(node)} alt="" className="w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }} />} />
          ) : (
            <img src={img.url} alt="" className="w-16 h-16 object-contain" style={{ imageRendering: img.pixel ? 'pixelated' : 'auto' }} />
          )}
          <div className="flex-1">
            {isTrainer && <div className="text-xs text-slate-400">{CLASS_ES[node.type] ?? 'Entrenador'}</div>}
            <div className="text-2xl font-extrabold">{trainer?.name ?? simple?.title ?? 'Casilla'}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {specialty && <TypeBadge type={specialty} />}
              <span className="text-xs text-slate-400">
                {team.length
                  ? `${team.length} Pokémon · Nv. ${minLvl}-${maxLvl}`
                  : node.type === 'battle'
                    ? `Nv. ~${node.enemyLevel}`
                    : ''}
              </span>
            </div>
          </div>
        </div>

        {trainer?.quote && <p className="text-sm text-slate-300 italic mt-3">“{trainer.quote}”</p>}
        {simple && <p className="text-sm text-slate-300 mt-3">{simple.desc}</p>}

        {/* Aviso de dificultad (cualquier enemigo más fuerte de lo normal) */}
        {(() => {
          if (!isCombatNode(node)) return null
          const d = nodeDifficulty(node, partyAvgLevel, difficulty)
          if (d.tier === 0 && !node.risky) return null
          return (
            <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 border" style={{ background: `${d.color}1a`, borderColor: `${d.color}66` }}>
              <span className="text-base font-black tabular-nums" style={{ color: d.color }}>{'★'.repeat(Math.max(1, d.tier))}</span>
              <div>
                <div className="text-[11px] font-bold" style={{ color: d.color }}>
                  Dificultad: {d.tier === 0 ? 'Equilibrado' : d.label}
                  {d.delta > 0 && <span className="text-slate-300"> · +{d.delta} niveles sobre tu equipo</span>}
                </div>
                {node.risky && <div className="text-sm text-slate-200">Combate arriesgado: <b>doble dinero</b> y un <b>objeto garantizado</b>.</div>}
              </div>
            </div>
          )
        })()}

        {/* Recompensa */}
        {REWARD[node.type] && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2">
            <span className="text-lg">🎁</span>
            <div>
              <div className="text-[11px] text-amber-300 font-bold">Recompensa</div>
              <div className="text-sm">
                {REWARD[node.type]}
                {money > 0 && <span className="text-amber-300 font-bold"> · +{money.toLocaleString('es')} ₽</span>}
              </div>
            </div>
          </div>
        )}

        {/* Coste del intercambio */}
        {content.kind === 'trade' && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2">
            <span className="text-lg">💸</span>
            <div className="text-sm">Cuesta <b className="text-rose-300">{content.cost.toLocaleString('es')} ₽</b></div>
          </div>
        )}

        {/* Equipo del entrenador */}
        {isTrainer && (
          <div className="mt-4">
            <div className="text-xs font-bold text-slate-400 mb-1.5">{isBoss ? 'Su equipo' : 'Lleva Pokémon de tipo'}</div>
            {isBoss ? (
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
            ) : (
              <div className="flex flex-wrap gap-1">{teamTypes.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-2 mt-5">
          {canEnter ? (
            <Button full variant="primary" onClick={onEnter}>
              {isTrainer ? '⚔ ¡Combatir!' : node.type === 'heal' ? '➕ Curar equipo' : 'Entrar ›'}
            </Button>
          ) : (
            <div className="text-center text-xs text-slate-400 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2">
              🔒 {node.cleared ? 'Ya has pasado por aquí.' : 'No conectada a tu posición. Solo puedes entrar por un camino enlazado.'}
            </div>
          )}
          <Button full variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  )
}
