import { useEffect, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar } from '@/ui/components/kit'
import { loadMeta, type MetaRecord } from '@/persistence/db'
import { ALL_SPECIES } from '@/data'
import Sprite from '@/ui/components/Sprite'

const DEX_TOTAL = ALL_SPECIES.length

export default function RecordsScreen() {
  const { back } = useGame()
  const [meta, setMeta] = useState<MetaRecord | null>(null)
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
                <span className="text-sm text-slate-400">{meta.pokedexCaught.length} / {DEX_TOTAL}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${(meta.pokedexCaught.length / DEX_TOTAL) * 100}%` }} />
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {meta.pokedexCaught.slice(0, 24).map((id) => (
                  <Sprite key={id} speciesId={id} variant="front" className="w-8 h-8 object-contain" />
                ))}
              </div>
            </Card>

            <div>
              <div className="text-sm font-bold text-slate-300 mb-1.5 px-1">Mejores partidas</div>
              {meta.bestRuns.length === 0 && <p className="text-xs text-slate-500 px-1">Aún no has terminado ninguna partida.</p>}
              <div className="flex flex-col gap-2">
                {meta.bestRuns.slice(0, 10).map((r, i) => (
                  <Card key={i} className="p-2.5 flex items-center gap-3">
                    <Sprite speciesId={r.starterId} variant="front" className="w-10 h-10 object-contain" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm flex items-center gap-2">
                        {r.region}
                        {r.won && <span className="text-[10px] bg-amber-500 text-black px-1.5 rounded-full font-black">CAMPEÓN</span>}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {r.mode === 'all' ? 'Todos' : 'Generación'} · {r.gymsDefeated}/8 gimnasios · {r.eliteDefeated}/4 Alto Mando
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
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
