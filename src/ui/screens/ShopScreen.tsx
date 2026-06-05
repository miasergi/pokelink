import { useGame } from '@/state/gameStore'
import { Button, Card, money, TopBar } from '@/ui/components/kit'
import { getItem } from '@/data/items'

export default function ShopScreen() {
  const { run, screen, doBuy, doLeaveShop } = useGame()
  const nodeId = screen.params?.nodeId as string
  if (!run) return null
  const node = run.map.nodes[nodeId]
  if (node.content.kind !== 'shop') return null
  // La Megapiedra solo se vende a partir de la 7ª medalla.
  const canBuyMega = run.stats.gymsDefeated >= 7
  // Nuzlocke: prohibido comprar pociones/objetos de curación.
  const noHeal = run.difficulty === 'nuzlocke'
  const stock = [...new Set(node.content.stock)].filter((id) => {
    if (id === 'mega-stone' && !canBuyMega) return false
    if (noHeal && (getItem(id).category === 'heal' || getItem(id).category === 'revive')) return false
    return true
  })

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Tienda"
        right={<span className="text-amber-300 font-bold text-sm pr-1">{money(run.money)}</span>}
      />
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 grid gap-2.5 no-scrollbar">
        {stock.map((id) => {
          const item = getItem(id)
          const owned = run.inventory[id] || 0
          const afford = run.money >= item.price
          return (
            <Card key={id} className="p-3">
              <div className="flex items-start gap-3">
                {item.sprite && <img src={item.sprite} alt="" className="w-10 h-10 shrink-0" style={{ imageRendering: 'pixelated' }} />}
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">
                    {item.name}
                    {owned > 0 && <span className="text-[10px] text-slate-400 ml-1">×{owned}</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-2">{item.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-extrabold text-sm ${afford ? 'text-amber-300' : 'text-rose-400'}`}>{money(item.price)}</div>
                </div>
              </div>
              <Button
                full
                variant={afford ? 'primary' : 'secondary'}
                disabled={!afford}
                onClick={() => doBuy(id, item.price)}
                className="!py-2 mt-2"
              >
                {afford ? 'Comprar' : 'Sin dinero suficiente'}
              </Button>
            </Card>
          )
        })}
      </div>
      <div className="p-4 safe-bottom">
        <Button full variant="success" onClick={() => doLeaveShop(nodeId)}>
          Salir de la tienda ›
        </Button>
      </div>
    </div>
  )
}
