import { useEffect, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button } from '@/ui/components/kit'
import { APP_VERSION } from '@/version'
import { CHANGELOG } from '@/data/changelog'
import AccountModal from '@/ui/components/AccountModal'
import Sprite from '@/ui/components/Sprite'
import RunTeamModal from '@/ui/components/RunTeamModal'
import { formatDuration } from '@/ui/components/RunTimer'
import { ACHIEVEMENT_BY_ID } from '@/data/achievements'
import { dailyChallenge } from '@/engine/run/daily'
import { STARTERS_BY_GEN } from '@/data/starters'
import { GENERATIONS } from '@/data/generations'
import { getSpecies } from '@/data'
import { loadMeta, type BestRun } from '@/persistence/db'
import TypeBadge from '@/ui/components/TypeBadge'

/** Fecha local (YYYY-MM-DD) de un timestamp, igual que `dailyChallenge`. */
function localDateStr(ms: number): string {
  const dt = new Date(ms)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default function HomeScreen() {
  const { navigate, hasSavedRun, resumeRun, cloudUser, pet, newAchievements, clearNewAchievements, startRun } = useGame()
  const [account, setAccount] = useState(false)
  const [dailyOpen, setDailyOpen] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const [dailyWins, setDailyWins] = useState<BestRun[]>([])
  const [viewRun, setViewRun] = useState<BestRun | null>(null)
  const today = dailyChallenge().date
  // Carga las runs con las que ya ganaste el reto de HOY (al abrir el modal).
  // Incluye una detección retroactiva: partidas ganadas hoy con la misma región e
  // inicial que el reto (para victorias anteriores a la etiqueta `daily`).
  useEffect(() => {
    if (!dailyOpen) return
    const d = dailyChallenge()
    const dRegion = GENERATIONS.find((g) => g.gen === d.gen)?.region
    const dStarters = STARTERS_BY_GEN[d.gen] ?? STARTERS_BY_GEN[1]
    const dStarter = dStarters[d.seed % dStarters.length]
    void loadMeta().then((m) => setDailyWins((m.bestRuns ?? []).filter((r) => r.won && (
      r.daily === today ||
      (!r.daily && r.region === dRegion && r.starterId === dStarter && localDateStr(r.date) === today)
    ))))
  }, [dailyOpen, today])
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
        <button
          onClick={() => setNewsOpen(true)}
          className="mt-1 mx-auto flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 active:scale-95 transition"
        >
          📜 Novedades · <span className="text-slate-600">{APP_VERSION}</span>
        </button>
      </div>

      {account && <AccountModal onClose={() => setAccount(false)} />}

      {/* Novedades: cambios de las últimas 3 versiones */}
      {newsOpen && (
        <div className="absolute inset-0 z-[75] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setNewsOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4 animate-pop-in max-h-[85%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="text-center shrink-0">
              <div className="text-3xl">📜</div>
              <div className="font-extrabold text-lg">Novedades</div>
              <p className="text-[11px] text-slate-400">Lo que hemos tocado en las últimas versiones</p>
            </div>
            <div className="mt-3 overflow-y-auto no-scrollbar flex flex-col gap-4 pr-1">
              {CHANGELOG.slice(0, 3).map((e) => (
                <div key={e.version}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-extrabold text-red-400">{e.version}</span>
                    <span className="text-sm font-bold text-slate-200">{e.title}</span>
                    <span className="text-[10px] text-slate-500 ml-auto">{e.date}</span>
                  </div>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {e.changes.map((c, i) => (
                      <li key={i} className="flex gap-2 text-[12px] text-slate-300 leading-snug">
                        <span className="text-red-400/70 shrink-0">›</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <Button variant="primary" full className="mt-3 shrink-0" onClick={() => setNewsOpen(false)}>Entendido</Button>
          </div>
        </div>
      )}

      {/* Reto diario: info + inicial fijo, igual para todos */}
      {dailyOpen && (() => {
        const d = dailyChallenge()
        const region = GENERATIONS.find((g) => g.gen === d.gen)?.region ?? 'Kanto'
        const starters = STARTERS_BY_GEN[d.gen] ?? STARTERS_BY_GEN[1]
        const starterId = starters[d.seed % starters.length]
        const sp = getSpecies(starterId)
        const playDaily = () => { setDailyOpen(false); startRun({ gen: d.gen, pools: [d.gen], random: false, starterId, difficulty: 'normal', seed: d.seed, daily: d.date }) }
        const won = dailyWins.length > 0
        return (
          <div className="absolute inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setDailyOpen(false)}>
            <div className="w-full max-w-sm rounded-3xl border border-fuchsia-500/50 bg-slate-900 p-4 animate-pop-in text-center" onClick={(e) => e.stopPropagation()}>
              <div className="text-3xl">🗓️</div>
              <div className="font-extrabold text-fuchsia-300 text-lg">Reto diario · {d.date}</div>

              {won ? (
                <>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 px-3 py-2 text-sm mt-2 mb-1">
                    ✅ <b>¡Ya completaste el reto de hoy!</b>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">{dailyWins.length === 1 ? 'Lo conseguiste con esta partida' : 'Lo conseguiste con estas partidas'} (toca para ver el equipo):</p>
                  <div className="flex flex-col gap-2 mb-3">
                    {dailyWins.map((r, i) => (
                      <button key={i} onClick={() => setViewRun(r)} className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800/60 p-2 active:scale-[0.98] transition">
                        <div className="flex items-center gap-1">
                          {(r.team ?? []).slice(0, 6).map((m) => <Sprite key={m.uid} speciesId={m.speciesId} shiny={m.shiny} className="w-7 h-7 object-contain" />)}
                        </div>
                        <span className="text-emerald-300 font-bold text-sm whitespace-nowrap shrink-0">⏱ {formatDuration(r.durationMs)} ›</span>
                      </button>
                    ))}
                  </div>
                  <Button variant="primary" full onClick={playDaily}>🔁 Volver a jugar</Button>
                  <button className="text-xs text-slate-500 mt-2" onClick={() => setDailyOpen(false)}>Cerrar</button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-300 mt-1">El <b>mismo desafío para todo el mundo hoy</b>: misma región, mismo mapa (semilla fija) y mismo inicial. Dificultad <b>Normal</b>. ¡Compite por el mejor tiempo en el ranking «Hoy»!</p>
                  <div className="my-3 flex items-center justify-center gap-3 rounded-2xl bg-slate-800 p-3">
                    <Sprite speciesId={starterId} className="w-16 h-16 object-contain" />
                    <div className="text-left">
                      <div className="text-[11px] text-slate-400 uppercase tracking-wide">Región {region}</div>
                      <div className="font-bold">{sp.displayName}</div>
                      <div className="flex gap-1 mt-0.5">{sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
                    </div>
                  </div>
                  <Button variant="primary" full onClick={playDaily}>¡Aceptar el reto!</Button>
                  <button className="text-xs text-slate-500 mt-2" onClick={() => setDailyOpen(false)}>Ahora no</button>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* Detalle del equipo de una partida diaria ganada */}
      {viewRun && <RunTeamModal run={viewRun} onClose={() => setViewRun(null)} />}

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
