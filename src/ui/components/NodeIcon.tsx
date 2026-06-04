import type { NodeType } from '@/engine/run/types'

export const NODE_META: Record<NodeType, { icon: string; label: string; color: string }> = {
  battle: { icon: '⚔️', label: 'Salvaje', color: '#64748b' },
  trainer: { icon: '🧢', label: 'Entrenador', color: '#0ea5e9' },
  catch: { icon: '🔴', label: 'Captura', color: '#ef4444' },
  item: { icon: '🎁', label: 'Objeto', color: '#a855f7' },
  shop: { icon: '🛒', label: 'Tienda', color: '#22c55e' },
  event: { icon: '❓', label: 'Evento', color: '#eab308' },
  heal: { icon: '➕', label: 'Centro Pokémon', color: '#f472b6' },
  rival: { icon: '😎', label: 'Rival', color: '#f97316' },
  gym: { icon: '🏅', label: 'Gimnasio', color: '#fbbf24' },
  elite: { icon: '👑', label: 'Alto Mando', color: '#c084fc' },
  champion: { icon: '🏆', label: 'Campeón', color: '#fde047' },
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
  return (
    <div
      className={`grid place-items-center rounded-full border-2 transition ${
        active ? 'animate-pulse ring-4 ring-red-400/50' : ''
      } ${dim ? 'opacity-30' : ''}`}
      style={{
        width: size,
        height: size,
        borderColor: cleared ? '#475569' : meta.color,
        background: cleared ? '#1e293b' : `${meta.color}22`,
        boxShadow: active ? `0 0 16px ${meta.color}88` : 'none',
      }}
    >
      <span style={{ fontSize: isBoss ? size * 0.5 : size * 0.42 }}>
        {cleared ? '✓' : meta.icon}
      </span>
    </div>
  )
}
