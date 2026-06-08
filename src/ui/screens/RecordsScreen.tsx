import { useEffect, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar } from '@/ui/components/kit'
import { loadMeta, type MetaRecord, type BestRun } from '@/persistence/db'
import { ALL_SPECIES } from '@/data'
import Sprite from '@/ui/components/Sprite'
import { formatDuration } from '@/ui/components/RunTimer'
import RunTeamModal from '@/ui/components/RunTeamModal'
import Icon from '@/ui/components/Icon'

const DEX_TOTAL = ALL_SPECIES.length
const DIFF_ES: Record<string, string> = { normal: 'Normal', hard: 'Difícil', nuzlocke: 'Nuzlocke' }

export default function RecordsScreen() {
  const { back, navigate } = useGame()
  const [meta, setMeta] = useState<MetaRecord | null>(null)
  const [selRun, setSelRun] = useState<BestRun | null>(null)
  useEffect(() => {
    void loadMeta().then(setMeta)
  }, [])

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Récords" left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
        {!meta ? (
          <div className="text-center text-slate-500 mt-10">Cargando…</div>
        ) : (
          <>
            <Card className="p-3.5 flex items-center justify-between active:scale-[0.99] transition" style={{ borderColor: '#f59e0b66' }} onClick={() => navigate('leaderboard')}>
              <div>
                <div className="font-bold text-amber-300 inline-flex items-center gap-1.5"><Icon name="trophy" className="w-5 h-5" /> Ranking online de Glory Runs</div>
                <div className="text-xs text-slate-400">Mejores tiempos de todos los jugadores</div>
              </div>
              <span className="text-slate-500 text-2xl">›</span>
            </Card>

            <Card className="p-3.5 flex items-center justify-between active:scale-[0.99] transition" onClick={() => navigate('achievements')}>
              <div>
                <div className="font-bold inline-flex items-center gap-1.5"><Icon name="achievement" className="w-5 h-5" /> Logros y compañero</div>
                <div className="text-xs text-slate-400">Logros, recompensa de Pokédex y mascota</div>
              </div>
              <span className="text-slate-500 text-2xl">›</span>
            </Card>

            <Card className="p-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <Stat label="Partidas" value={meta.totals.runs} />
                <Stat label="Victorias" value={meta.totals.wins} />
                <Stat label="Gimnasios" value={meta.totals.gymsDefeated} />
                <Stat label="Capturados" value={meta.totals.pokemonCaught} />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">Pokédex</span>
                <span className="text-sm text-slate-400">
                  {meta.pokedexCaught.length} / {DEX_TOTAL} ({Math.round((meta.pokedexCaught.length / DEX_TOTAL) * 100)}%)
                  {meta.pokedexShiny.length > 0 && <span className="text-amber-300 ml-2">✨ {meta.pokedexShiny.length}</span>}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${(meta.pokedexCaught.length / DEX_TOTAL) * 100}%` }} />
              </div>
            </Card>

            {/* Glory Runs: mejores tiempos de partidas COMPLETADAS */}
            {(() => {
              const glory = meta.bestRuns.filter((r) => r.won && r.durationMs > 0).sort((a, b) => a.durationMs - b.durationMs).slice(0, 5)
              if (!glory.length) return null
              return (
                <div>
                  <div className="text-sm font-bold text-amber-300 mb-1.5 px-1 inline-flex items-center gap-1.5"><Icon name="trophy" className="w-4 h-4" /> Glory Runs (mejores tiempos)</div>
                  <div className="flex flex-col gap-2">
                    {glory.map((r, i) => (
                      <Card key={i} className="p-2.5 flex items-center gap-3 active:scale-[0.99] transition" style={{ borderColor: i === 0 ? '#f59e0b66' : undefined }} onClick={() => setSelRun(r)}>
                        <div className="text-lg font-black w-6 text-center" style={{ color: i === 0 ? '#fbbf24' : '#64748b' }}>{i + 1}</div>
                        <Sprite speciesId={r.starterId} variant="front" className="w-9 h-9 object-contain" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm">{r.region} <span className="text-[10px] text-slate-400">· {DIFF_ES[r.difficulty] ?? r.difficulty}</span></div>
                          <div className="text-[11px] text-slate-400">{r.mode} {r.team && <span className="text-sky-300">· ver equipo ›</span>}</div>
                        </div>
                        <div className="text-emerald-300 font-extrabold tabular-nums">⏱ {formatDuration(r.durationMs)}</div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })()}

            <div>
              <div className="text-sm font-bold text-slate-300 mb-1.5 px-1">Partidas recientes</div>
              {meta.bestRuns.length === 0 && <p className="text-xs text-slate-500 px-1">Aún no has terminado ninguna partida.</p>}
              <div className="flex flex-col gap-2">
                {meta.bestRuns.slice(0, 12).map((r, i) => (
                  <Card key={i} className={`p-2.5 flex items-center gap-3 ${r.team ? 'active:scale-[0.99] transition' : ''}`} onClick={r.team ? () => setSelRun(r) : undefined}>
                    <Sprite speciesId={r.starterId} variant="front" className="w-10 h-10 object-contain" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm flex items-center gap-2">
                        {r.region}
                        {r.won && <span className="text-[10px] bg-amber-500 text-black px-1.5 rounded-full font-black">CAMPEÓN</span>}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {r.mode} · {DIFF_ES[r.difficulty] ?? r.difficulty} · {r.gymsDefeated}/8 gim. · {r.eliteDefeated}/4 A.M.{r.durationMs > 0 && ` · ⏱ ${formatDuration(r.durationMs)}`}
                      </div>
                    </div>
                    {r.team && <span className="text-slate-500 text-xl shrink-0">›</span>}
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      {selRun && <RunTeamModal run={selRun} onClose={() => setSelRun(null)} />}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-extrabold tabular-nums">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}
