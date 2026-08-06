import { useState } from 'react'
import type { MapNode, NodeType } from '@/engine/run/types'
import { nodeImage, aceSprite, POKEBALL } from './nodeImage'
import { IconCheck, NodeTypeIcon } from './icons'

export const NODE_META: Record<NodeType, { label: string; color: string }> = {
  battle: { label: 'Salvaje', color: '#94a3b8' },
  trainer: { label: 'Entrenador', color: '#38bdf8' },
  catch: { label: 'Captura', color: '#f87171' },
  item: { label: 'Objeto', color: '#c084fc' },
  shop: { label: 'Tienda', color: '#34d399' },
  event: { label: 'Evento', color: '#fbbf24' },
  trade: { label: 'Intercambio', color: '#22d3ee' },
  heal: { label: 'Centro Pokémon', color: '#f472b6' },
  rival: { label: 'Rival', color: '#fb923c' },
  legendary: { label: 'Legendario', color: '#a78bfa' },
  gym: { label: 'Gimnasio', color: '#fcd34d' },
  elite: { label: 'Alto Mando', color: '#c084fc' },
  champion: { label: 'Campeón', color: '#fde047' },
}

export default function NodeIcon({
  node, size = 46, active, cleared, dim,
}: {
  node: MapNode
  size?: number
  active?: boolean
  cleared?: boolean
  dim?: boolean
}) {
  const [stage, setStage] = useState<0 | 1 | 2>(0)
  const meta = NODE_META[node.type]
  const isBoss = node.type === 'gym' || node.type === 'elite' || node.type === 'champion' || node.type === 'rival' || node.type === 'legendary'
  const isTrainer = node.type === 'gym' || node.type === 'elite' || node.type === 'champion' || node.type === 'rival' || node.type === 'trainer'
  const img = nodeImage(node)
  const fallbackUrl = isTrainer ? aceSprite(node) : null
  const src = stage === 0 ? img.url : fallbackUrl
  // La Poké Ball se ve un poco más pequeña dentro del nodo (más margen).
  const isPokeball = img.url === POKEBALL
  const imgSize = Math.round(size * (isBoss ? 1.12 : isPokeball ? 0.68 : 0.94))

  return (
    <div
      className={`relative grid place-items-center rounded-full transition ${
        active ? 'ring-4 ring-red-400/50' : ''
      } ${dim ? 'opacity-40' : ''}`}
      style={{
        width: size,
        height: size,
        border: `2px solid ${cleared ? '#94a3b8' : meta.color}`,
        // Ficha CLARA, no oscura: el tablero ahora es el terreno del bioma
        // (hierba, arena, nieve...) y sobre un suelo claro un círculo oscuro
        // parecía un agujero. Así se lee como una ficha puesta sobre el mapa.
        background: cleared
          ? 'rgba(226,232,240,0.55)'
          : `radial-gradient(circle at 50% 34%, #ffffff, ${meta.color}22 78%, ${meta.color}44)`,
        // Sombra proyectada: asienta la ficha sobre el terreno en vez de flotar.
        boxShadow: active
          ? `0 0 18px ${meta.color}, 0 2px 4px rgba(0,0,0,0.45)`
          : isBoss
            ? `0 0 10px ${meta.color}aa, 0 2px 4px rgba(0,0,0,0.45)`
            : '0 2px 4px rgba(0,0,0,0.35)',
      }}
    >
      {stage < 2 && src ? (
        <img
          src={src}
          alt={meta.label}
          onError={() => setStage((s) => (s === 0 && fallbackUrl ? 1 : 2))}
          draggable={false}
          className={`object-contain ${cleared ? 'grayscale opacity-40' : 'drop-shadow'}`}
          style={{
            width: imgSize,
            height: imgSize,
            imageRendering: img.pixel ? 'pixelated' : 'auto',
            marginTop: img.pixel ? -2 : 0,
          }}
        />
      ) : (
        <NodeTypeIcon type={node.type} size={Math.round(size * 0.54)} className="drop-shadow" />
      )}

      {cleared && (
        <span
          className="absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-emerald-600 text-white"
          style={{ width: size * 0.42, height: size * 0.42 }}
        >
          <IconCheck size={size * 0.28} />
        </span>
      )}
    </div>
  )
}
