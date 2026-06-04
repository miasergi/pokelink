import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar } from '@/ui/components/kit'
import { GENERATIONS } from '@/data/generations'
import TypeBadge from '@/ui/components/TypeBadge'

export default function GenSelectScreen() {
  const { navigate, back } = useGame()
  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Elige región" left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-4 grid gap-3 no-scrollbar">
        {GENERATIONS.map((g) => (
          <Card
            key={g.gen}
            className={`p-3.5 ${g.rostersReady ? '' : 'opacity-60'}`}
            onClick={
              g.rostersReady
                ? () => navigate('starterSelect', { mode: 'generation', gen: g.gen })
                : undefined
            }
            style={{ borderColor: g.rostersReady ? `${g.accent}55` : undefined }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Generación {g.gen}</div>
                <div className="font-extrabold text-lg" style={{ color: g.accent }}>
                  {g.region}
                </div>
              </div>
              {g.rostersReady ? (
                <span className="text-emerald-400 text-sm font-bold">Jugable ›</span>
              ) : (
                <span className="text-slate-500 text-xs font-bold">Próximamente</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {g.gymTypes.slice(0, 8).map((t, i) => (
                <TypeBadge key={`${t}-${i}`} type={t} size="sm" />
              ))}
            </div>
          </Card>
        ))}
        <p className="text-center text-xs text-slate-500 mt-2">
          Más regiones con rosters reales llegarán pronto.
        </p>
      </div>
    </div>
  )
}
