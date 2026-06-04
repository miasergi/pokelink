import { useMemo, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { ALL_SPECIES, getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import { STAT_ES, typeGradient } from '@/ui/theme/types'

export default function PokedexScreen() {
  const { back } = useGame()
  const [gen, setGen] = useState<number | 'all'>(1)
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<number | null>(null)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL_SPECIES.filter(
      (s) =>
        (gen === 'all' || s.generation === gen) &&
        (!q || s.displayName.toLowerCase().includes(q) || String(s.id) === q),
    )
  }, [gen, query])

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Pokédex" left={<Button variant="ghost" onClick={back}>‹</Button>} />

      <div className="p-2.5 flex flex-col gap-2 border-b border-slate-800">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o número…"
          className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-red-400"
        />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {(['all', 1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGen(g)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${gen === g ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'}`}
            >
              {g === 'all' ? 'Todas' : `Gen ${g}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 no-scrollbar">
        <div className="grid grid-cols-3 gap-2">
          {list.map((s) => (
            <button
              key={s.id}
              onClick={() => setDetail(s.id)}
              className="rounded-2xl p-2 flex flex-col items-center border border-slate-700/60 active:scale-[0.97] transition"
              style={{ background: 'rgba(15,23,42,0.6)' }}
            >
              <span className="text-[9px] text-slate-500 self-start">#{String(s.id).padStart(4, '0')}</span>
              <Sprite speciesId={s.id} variant="front" className="w-16 h-16 object-contain" />
              <span className="text-[11px] font-semibold truncate w-full text-center">{s.displayName}</span>
            </button>
          ))}
        </div>
        {list.length === 0 && <p className="text-center text-slate-500 text-sm mt-8">Sin resultados.</p>}
      </div>

      {detail !== null && <DetailModal id={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function DetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const sp = getSpecies(id)
  return (
    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl border-t border-slate-700 p-5 animate-pop-in"
        style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.98), rgba(15,23,42,0.98))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl p-3 text-center mb-3" style={{ background: typeGradient(sp.types) }}>
          <Sprite speciesId={id} className="w-32 h-32 object-contain mx-auto" />
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold">{sp.displayName}</h3>
          <span className="text-slate-400 text-sm">#{String(sp.id).padStart(4, '0')} · Gen {sp.generation}</span>
        </div>
        <div className="flex gap-1 mt-1">{sp.types.map((t) => <TypeBadge key={t} type={t} />)}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-sm">
          {(['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-slate-400 w-16 text-xs">{STAT_ES[k]}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-red-400" style={{ width: `${Math.min(100, (sp.baseStats[k] / 200) * 100)}%` }} />
              </div>
              <span className="w-8 text-right tabular-nums text-xs font-bold">{sp.baseStats[k]}</span>
            </div>
          ))}
        </div>
        {sp.evolutions.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-slate-400">Evoluciona a:</span>
            {sp.evolutions.map((e) => (
              <span key={e.toId} className="flex items-center gap-1">
                <Sprite speciesId={e.toId} variant="front" className="w-8 h-8" />
                {getSpecies(e.toId).displayName}
              </span>
            ))}
          </div>
        )}
        <Button full variant="secondary" className="mt-4" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  )
}
