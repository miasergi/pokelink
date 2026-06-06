import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button } from '@/ui/components/kit'
import { APP_VERSION } from '@/version'
import AccountModal from '@/ui/components/AccountModal'
import Sprite from '@/ui/components/Sprite'
import { ACHIEVEMENT_BY_ID } from '@/data/achievements'
import { dailyChallenge } from '@/engine/run/daily'
import { STARTERS_BY_GEN } from '@/data/starters'
import { GENERATIONS } from '@/data/generations'
import { getSpecies } from '@/data'
import TypeBadge from '@/ui/components/TypeBadge'

export default function HomeScreen() {
  const { navigate, hasSavedRun, resumeRun, cloudUser, pet, newAchievements, clearNewAchievements, startRun } = useGame()
  const [account, setAccount] = useState(false)
  const [dailyOpen, setDailyOpen] = useState(false)
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
        <Button variant="secondary" full onClick={() => setDailyOpen(true)}>
          🗓️ Reto diario
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

      {/* Reto diario: info + inicial fijo, igual para todos */}
      {dailyOpen && (() => {
        const d = dailyChallenge()
        const region = GENERATIONS.find((g) => g.gen === d.gen)?.region ?? 'Kanto'
        const starters = STARTERS_BY_GEN[d.gen] ?? STARTERS_BY_GEN[1]
        const starterId = starters[d.seed % starters.length]
        const sp = getSpecies(starterId)
        return (
          <div className="absolute inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setDailyOpen(false)}>
            <div className="w-full max-w-sm rounded-3xl border border-fuchsia-500/50 bg-slate-900 p-4 animate-pop-in text-center" onClick={(e) => e.stopPropagation()}>
              <div className="text-3xl">🗓️</div>
              <div className="font-extrabold text-fuchsia-300 text-lg">Reto diario · {d.date}</div>
              <p className="text-sm text-slate-300 mt-1">El <b>mismo desafío para todo el mundo hoy</b>: misma región, mismo mapa (semilla fija) y mismo inicial. Dificultad <b>Normal</b>. ¡Compite por el mejor tiempo en el ranking «Hoy»!</p>
              <div className="my-3 flex items-center justify-center gap-3 rounded-2xl bg-slate-800 p-3">
                <Sprite speciesId={starterId} className="w-16 h-16 object-contain" />
                <div className="text-left">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wide">Región {region}</div>
                  <div className="font-bold">{sp.displayName}</div>
                  <div className="flex gap-1 mt-0.5">{sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
                </div>
              </div>
              <Button variant="primary" full onClick={() => { setDailyOpen(false); startRun({ gen: d.gen, pools: [d.gen], random: false, starterId, difficulty: 'normal', seed: d.seed, daily: d.date }) }}>¡Aceptar el reto!</Button>
              <button className="text-xs text-slate-500 mt-2" onClick={() => setDailyOpen(false)}>Ahora no</button>
            </div>
          </div>
        )
      })()}

      {/* Aviso de logros recién conseguidos */}
      {newAchievements.length > 0 && (
        <div className="absolute inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={clearNewAchievements}>
          <div className="w-full max-w-xs rounded-3xl border border-amber-500/50 bg-slate-900 p-4 text-center animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl mb-1">🎉</div>
            <div className="font-extrabold text-amber-300 mb-2">¡Logro{newAchievements.length > 1 ? 's' : ''} desbloqueado{newAchievements.length > 1 ? 's' : ''}!</div>
            <div className="flex flex-col gap-1.5">
              {newAchievements.map((id) => {
                const a = ACHIEVEMENT_BY_ID.get(id)
                return (
                  <div key={id} className="flex items-center gap-2.5 text-left bg-slate-800 rounded-xl px-3 py-2">
                    <span className="text-2xl shrink-0">{a?.icon ?? '🏅'}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{a?.title ?? id}</div>
                      <div className="text-[11px] text-slate-400">{a?.desc ?? ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <Button variant="primary" full className="mt-3" onClick={clearNewAchievements}>¡Genial!</Button>
          </div>
        </div>
      )}
    </div>
  )
}
