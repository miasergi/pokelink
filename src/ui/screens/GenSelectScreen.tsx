import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { GENERATIONS } from '@/data/generations'

export default function GenSelectScreen() {
  const { navigate, back } = useGame()
  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Elige región" left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {/* Modo Sorpresa: configura TODO al azar (región, Pokémon, random, monolocke). */}
        <button
          onClick={() => navigate('randomSetup')}
          className="w-full mb-3 rounded-2xl p-4 border text-left transition active:scale-[0.98] flex items-center gap-3"
          style={{ borderColor: 'rgba(217,70,239,0.5)', background: 'linear-gradient(135deg, rgba(217,70,239,0.22), rgba(15,23,42,0.7))' }}
        >
          <div className="text-3xl">🎲</div>
          <div className="flex-1">
            <div className="font-extrabold text-fuchsia-200">Modo Sorpresa</div>
            <div className="text-[11px] text-slate-300">Región, Pokémon, Random y Monolocke elegidos al azar. Tú decides si empezar.</div>
          </div>
          <span className="text-fuchsia-300 font-bold">›</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          {GENERATIONS.map((g) => (
            <button
              key={g.gen}
              disabled={!g.rostersReady}
              onClick={() => navigate('modeSelect', { gen: g.gen })}
              className={`relative overflow-hidden rounded-2xl p-4 border text-center transition active:scale-[0.98] ${g.rostersReady ? '' : 'opacity-40'} flex flex-col items-center justify-center min-h-[120px]`}
              style={{
                borderColor: `${g.accent}66`,
                // Mapa de la región (si existe en public/regions) bajo un oscurecido
                // con el color de la región para que el texto se lea siempre.
                backgroundImage: `linear-gradient(180deg, ${g.accent}22, rgba(15,23,42,0.68) 55%, rgba(15,23,42,0.9)), url(${import.meta.env.BASE_URL}regions/gen${g.gen}.webp)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-300 drop-shadow">Generación {g.gen}</div>
              <div className="text-2xl font-black mt-1" style={{ color: g.accent, textShadow: `0 2px 14px ${g.accent}, 0 1px 4px #000` }}>
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
