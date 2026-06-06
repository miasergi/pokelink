import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button } from '@/ui/components/kit'
import { APP_VERSION } from '@/version'
import AccountModal from '@/ui/components/AccountModal'
import Sprite from '@/ui/components/Sprite'
import { ACHIEVEMENT_BY_ID } from '@/data/achievements'

export default function HomeScreen() {
  const { navigate, hasSavedRun, resumeRun, cloudUser, pet, newAchievements, clearNewAchievements } = useGame()
  const [account, setAccount] = useState(false)
  return (
    <div className="flex flex-col flex-1 items-center justify-between p-6 safe-top safe-bottom relative">
      {/* Botón de nube / cuenta (arriba, centrado) */}
      <button
        onClick={() => setAccount(true)}
        className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-bold active:scale-95 transition max-w-[80%] ${cloudUser ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-800/80 text-slate-300'}`}
        aria-label="Cuenta en la nube"
      >
        ☁️ <span className="truncate">{cloudUser ? cloudUser.email : 'Iniciar sesión'}</span>
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-2 mt-10">
        {pet != null
          ? <Sprite speciesId={pet} className="w-24 h-24 object-contain animate-float drop-shadow-xl" />
          : <div className="text-6xl animate-float">⚡</div>}
        <h1 className="text-4xl font-extrabold tracking-tight text-center leading-none">
          Poké<span className="text-red-500">Rogue</span>
        </h1>
        <p className="text-slate-400 text-sm text-center max-w-[16rem]">
          Roguelike autobattler. Construye tu equipo, derrota a los gimnasios y
          conquista la Liga Pokémon.
        </p>
      </div>

      <div className="w-full flex flex-col gap-3 max-w-sm">
        {hasSavedRun && (
          <Button variant="success" full onClick={() => void resumeRun()}>
            ▶ Continuar partida
          </Button>
        )}
        <Button variant="primary" full onClick={() => navigate('genSelect')}>
          {hasSavedRun ? 'Nueva partida' : '⚔ Jugar'}
        </Button>
        <div className="grid grid-cols-3 gap-3">
          <Button variant="secondary" onClick={() => navigate('pokedex')}>
            📕 Pokédex
          </Button>
          <Button variant="secondary" onClick={() => navigate('records')}>
            🏆 Récords
          </Button>
          <Button variant="secondary" onClick={() => navigate('settings')}>
            ⚙ Ajustes
          </Button>
        </div>
        <div className="text-center text-[11px] text-slate-600 mt-1">{APP_VERSION}</div>
      </div>

      {account && <AccountModal onClose={() => setAccount(false)} />}

      {/* Aviso de logros recién conseguidos */}
      {newAchievements.length > 0 && (
        <div className="absolute inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={clearNewAchievements}>
          <div className="w-full max-w-xs rounded-3xl border border-amber-500/50 bg-slate-900 p-4 text-center animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl mb-1">🎉</div>
            <div className="font-extrabold text-amber-300 mb-2">¡Logro{newAchievements.length > 1 ? 's' : ''} desbloqueado{newAchievements.length > 1 ? 's' : ''}!</div>
            <div className="flex flex-col gap-1.5">
              {newAchievements.map((id) => {
                const a = ACHIEVEMENT_BY_ID.get(id)
                return <div key={id} className="flex items-center gap-2 text-left bg-slate-800 rounded-xl px-3 py-2"><span className="text-xl">{a?.icon ?? '🏅'}</span><span className="text-sm font-bold">{a?.title ?? id}</span></div>
              })}
            </div>
            <Button variant="primary" full className="mt-3" onClick={clearNewAchievements}>¡Genial!</Button>
          </div>
        </div>
      )}
    </div>
  )
}
