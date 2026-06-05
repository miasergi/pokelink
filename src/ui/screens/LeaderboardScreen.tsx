import { useEffect, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar } from '@/ui/components/kit'
import { cloudEnabled, fetchLeaderboard, currentUser, type GloryRow } from '@/persistence/supabase'
import { formatDuration } from '@/ui/components/RunTimer'
import { GENERATIONS } from '@/data/generations'

const DIFFS = [
  { id: '', label: 'Todas' },
  { id: 'normal', label: 'Normal' },
  { id: 'hard', label: 'Difícil' },
  { id: 'nuzlocke', label: 'Nuzlocke' },
]

export default function LeaderboardScreen() {
  const { back } = useGame()
  const [region, setRegion] = useState<string>('')
  const [difficulty, setDifficulty] = useState<string>('')
  const [rows, setRows] = useState<GloryRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const me = currentUser()

  useEffect(() => {
    let alive = true
    setLoading(true)
    void fetchLeaderboard({ region: region || undefined, difficulty: difficulty || undefined, limit: 100 }).then((r) => {
      if (alive) { setRows(r); setLoading(false) }
    })
    return () => { alive = false }
  }, [region, difficulty])

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="🏆 Ranking Glory Runs" left={<Button variant="ghost" onClick={back}>‹</Button>} />

      <div className="p-2.5 flex flex-col gap-2 border-b border-slate-800">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button onClick={() => setRegion('')} className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${region === '' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'}`}>Todas</button>
          {GENERATIONS.map((g) => (
            <button key={g.gen} onClick={() => setRegion(g.region)} className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${region === g.region ? 'text-white' : 'bg-slate-800 text-slate-300'}`} style={{ background: region === g.region ? g.accent : undefined }}>{g.region}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {DIFFS.map((d) => (
            <button key={d.id} onClick={() => setDifficulty(d.id)} className={`px-3 py-1 rounded-full text-xs font-bold ${difficulty === d.id ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{d.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {!cloudEnabled() ? (
          <p className="text-center text-slate-500 text-sm mt-10">El ranking online necesita la nube configurada.</p>
        ) : loading ? (
          <div className="text-center text-slate-500 mt-10">Cargando ranking…</div>
        ) : !rows || rows.length === 0 ? (
          <p className="text-center text-slate-500 text-sm mt-10">Aún no hay partidas ganadas registradas.{'\n'}¡Sé el primero en completar una región!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r, i) => {
              const mine = me && r.user_id === me.id
              return (
                <Card key={r.id} className={`p-2.5 flex items-center gap-3 ${mine ? 'ring-1 ring-emerald-400/60' : ''}`} style={{ borderColor: i < 3 ? ['#fbbf24', '#cbd5e1', '#d97706'][i] + '88' : undefined }}>
                  <div className="text-lg font-black w-7 text-center" style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : i === 2 ? '#d97706' : '#64748b' }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{r.alias || 'Anónimo'} {mine && <span className="text-[9px] bg-emerald-500 text-black px-1 rounded-full font-black">TÚ</span>}</div>
                    <div className="text-[11px] text-slate-400 truncate">{r.region} · {r.mode} · {DIFF_ES(r.difficulty)}</div>
                  </div>
                  <div className="text-emerald-300 font-extrabold tabular-nums shrink-0">⏱ {formatDuration(r.duration_ms)}</div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function DIFF_ES(d: string): string {
  return d === 'hard' ? 'Difícil' : d === 'nuzlocke' ? 'Nuzlocke' : 'Normal'
}
