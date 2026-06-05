import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { GENERATIONS } from '@/data/generations'

export default function GenSelectScreen() {
  const { navigate, back } = useGame()
  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Elige región" left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {GENERATIONS.map((g) => (
            <button
              key={g.gen}
              disabled={!g.rostersReady}
              onClick={() => navigate('modeSelect', { gen: g.gen })}
              className={`rounded-2xl p-4 border text-center transition active:scale-[0.98] ${g.rostersReady ? '' : 'opacity-40'} flex flex-col items-center justify-center min-h-[120px]`}
              style={{
                borderColor: `${g.accent}66`,
                background: `radial-gradient(circle at 50% 0%, ${g.accent}22, rgba(15,23,42,0.6) 70%)`,
              }}
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Generación {g.gen}</div>
              <div className="text-2xl font-black mt-1" style={{ color: g.accent, textShadow: `0 2px 12px ${g.accent}55` }}>
                {g.region}
              </div>
              {!g.rostersReady && <div className="text-[10px] text-slate-500 mt-1">Próximamente</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
