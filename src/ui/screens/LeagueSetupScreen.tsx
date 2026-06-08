import { useEffect, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { loadMeta, type BestRun } from '@/persistence/db'
import { getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'
import Icon from '@/ui/components/Icon'
import { formatDuration } from '@/ui/components/RunTimer'
import { pokemonSprite } from '@/ui/components/nodeImage'

const DIFF_ES: Record<string, string> = { normal: 'Normal', hard: 'Difícil', nuzlocke: 'Nuzlocke' }

/** Elegir uno de tus equipos campeones para disputar la Liga Pokémon. */
export default function LeagueSetupScreen() {
  const { back, startLeague, alias } = useGame()
  const [wins, setWins] = useState<BestRun[]>([])
  useEffect(() => {
    void loadMeta().then((m) => setWins((m.bestRuns ?? []).filter((r) => r.won && (r.team?.length ?? 0) > 0)))
  }, [])

  return (
    <div className="flex flex-col flex-1">
      <TopBar title={<span className="inline-flex items-center gap-2"><Icon name="trophy" className="w-5 h-5" /> Liga Pokémon</span>} left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
        <p className="text-sm text-slate-300 text-center">
          Elige el <b>equipo campeón</b> con el que disputarás el torneo. Tus Pokémon se subirán a <b>nivel 100</b>
          y competirás contra 31 rivales (líderes, Alto Mando, campeones y personajes del anime).
        </p>

        {wins.length === 0 ? (
          <p className="text-center text-slate-500 text-sm mt-8">No tienes equipos campeones todavía. Gana una partida para desbloquear la Liga.</p>
        ) : (
          wins.map((r, i) => (
            <button
              key={i}
              onClick={() => startLeague(r.team!.map((m) => structuredClone(m)), alias || 'Tú', pokemonSprite(r.team![0].speciesId))}
              className="rounded-2xl border border-slate-700 bg-slate-800/60 p-3 text-left active:scale-[0.98] transition"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="font-bold flex items-center gap-1.5">{r.region}<span className="text-[10px] bg-amber-500 text-black px-1.5 rounded-full font-black">CAMPEÓN</span></div>
                <div className="text-emerald-300 text-xs font-bold inline-flex items-center gap-1"><Icon name="timer" className="w-3.5 h-3.5" /> {formatDuration(r.durationMs)}</div>
              </div>
              <div className="text-[10px] text-slate-400 mb-2">{r.mode} · {DIFF_ES[r.difficulty] ?? r.difficulty}</div>
              <div className="flex gap-1.5 flex-wrap">
                {(r.team ?? []).map((m) => (
                  <div key={m.uid} className="flex flex-col items-center w-12">
                    <Sprite speciesId={m.speciesId} shiny={m.shiny} className="w-10 h-10 object-contain" />
                    <span className="text-[8px] text-slate-400 truncate w-full text-center">{getSpecies(m.speciesId).displayName}</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] font-bold text-fuchsia-300 mt-2">Elegir este equipo ›</div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
