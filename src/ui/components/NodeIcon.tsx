import type { NodeType } from '@/engine/run/types'
import { NodeTypeIcon, IconCheck } from './icons'

export const NODE_META: Record<NodeType, { label: string; color: string }> = {
  battle: { label: 'Salvaje', color: '#94a3b8' },
  trainer: { label: 'Entrenador', color: '#38bdf8' },
  catch: { label: 'Captura', color: '#f87171' },
  item: { label: 'Objeto', color: '#c084fc' },
  shop: { label: 'Tienda', color: '#34d399' },
  event: { label: 'Evento', color: '#fbbf24' },
  heal: { label: 'Centro Pokémon', color: '#f472b6' },
  rival: { label: 'Rival', color: '#fb923c' },
  gym: { label: 'Gimnasio', color: '#fcd34d' },
  elite: { label: 'Alto Mando', color: '#c084fc' },
  champion: { label: 'Campeón', color: '#fde047' },
}

export default function NodeIcon({
  type, size = 44, active, cleared, dim,
}: {
  type: NodeType
  size?: number
  active?: boolean
  cleared?: boolean
  dim?: boolean
}) {
  const meta = NODE_META[type]
  const isBoss = type === 'gym' || type === 'elite' || type === 'champion' || type === 'rival'
  const iconSize = Math.round(size * (isBoss ? 0.62 : 0.54))
  return (
    <div
      className={`grid place-items-center rounded-full border-2 transition ${
        active ? 'animate-pulse ring-4 ring-red-400/50' : ''
      } ${dim ? 'opacity-30' : ''}`}
      style={{
        width: size,
        height: size,
        borderColor: cleared ? '#475569' : meta.color,
        background: cleared
          ? '#1e293b'
          : `radial-gradient(circle at 50% 35%, ${meta.color}33, ${meta.color}14)`,
        boxShadow: active ? `0 0 16px ${meta.color}99` : 'none',
        color: cleared ? '#64748b' : meta.color,
      }}
    >
      {cleared ? (
        <IconCheck size={Math.round(size * 0.5)} />
      ) : (
        <NodeTypeIcon type={type} size={iconSize} className="drop-shadow" />
      )}
    </div>
  )
}
