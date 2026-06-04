import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar } from '@/ui/components/kit'
import { getItem } from '@/data/items'

export default function ItemScreen() {
  const { run, screen, doPickItem } = useGame()
  const nodeId = screen.params?.nodeId as string
  if (!run) return null
  const node = run.map.nodes[nodeId]
  if (node.content.kind !== 'item') return null

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="¡Tesoro encontrado!" />
      <div className="flex-1 p-4 flex flex-col gap-3">
        <p className="text-slate-400 text-sm text-center">Elige un objeto para llevarte.</p>
        {node.content.choices.map((id) => {
          const item = getItem(id)
          return (
            <Card key={id} className="p-3.5" onClick={() => doPickItem(nodeId, id)}>
              <div className="flex items-center gap-3">
                {item.sprite && <img src={item.sprite} alt="" className="w-10 h-10 shrink-0" />}
                <div className="flex-1">
                  <div className="font-bold">{item.name}</div>
                  <div className="text-xs text-slate-400">{item.description}</div>
                </div>
                <span className="text-emerald-400 font-bold">Coger ›</span>
              </div>
            </Card>
          )
        })}
        <Button full variant="ghost" onClick={() => doPickItem(nodeId, '__skip__')}>
          No coger nada
        </Button>
      </div>
    </div>
  )
}
