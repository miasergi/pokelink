import { useGame } from '@/state/gameStore'
import { Card, TopBar } from '@/ui/components/kit'
import { EVENTS, EVENT_ICONS } from '@/engine/run/nodes'

export default function EventScreen() {
  const { run, screen, doEvent } = useGame()
  const nodeId = screen.params?.nodeId as string
  if (!run) return null
  const node = run.map.nodes[nodeId]
  if (node.content.kind !== 'event') return null
  const def = EVENTS[node.content.eventId]
  const tone = def.tone === 'good' ? '#34d39933' : def.tone === 'bad' ? '#f43f5e33' : '#64748b33'

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Evento" />
      <div className="flex-1 p-5 flex flex-col items-center justify-center gap-5">
        <div className="w-28 h-28 rounded-3xl grid place-items-center text-6xl shadow-lg" style={{ background: `radial-gradient(circle at 50% 35%, ${tone}, rgba(15,23,42,0.6))`, border: `1px solid ${tone}` }}>
          {EVENT_ICONS[node.content.eventId] ?? '❓'}
        </div>
        <h2 className="text-xl font-extrabold text-center">{def.title}</h2>
        <p className="text-slate-300 text-center text-sm max-w-sm">{def.description}</p>
        <div className="w-full max-w-sm flex flex-col gap-3 mt-2">
          {def.options.map((opt, i) => (
            <Card key={i} className="p-3.5" onClick={() => doEvent(nodeId, i)}>
              <div className="font-bold">{opt.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{opt.description}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
