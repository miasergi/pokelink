import { useEffect, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar } from '@/ui/components/kit'
import { loadMeta } from '@/persistence/db'
import { ACHIEVEMENTS } from '@/data/achievements'
import { getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'

export default function AchievementsScreen() {
  const { back, pet, setPet } = useGame()
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  const [caught, setCaught] = useState<number[]>([])
  const [picking, setPicking] = useState(false)
  useEffect(() => { void loadMeta().then((m) => { setUnlocked(new Set(m.achievements)); setCaught(m.pokedexCaught) }) }, [])

  const done = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Logros" left={<Button variant="ghost" onClick={back}>‹</Button>} right={<span className="text-amber-300 font-bold text-sm pr-1">{done}/{ACHIEVEMENTS.length}</span>} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
        {/* Compañero */}
        <Card className="p-3 flex items-center gap-3">
          <div className="w-14 h-14 grid place-items-center rounded-xl bg-slate-800 shrink-0">
            {pet != null ? <Sprite speciesId={pet} className="w-12 h-12 object-contain" /> : <span className="text-2xl">🐾</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold">Compañero</div>
            <div className="text-xs text-slate-400">{pet != null ? getSpecies(pet).displayName + ' te acompaña en Inicio.' : 'Elige un Pokémon capturado como compañero.'}</div>
          </div>
          <Button variant="secondary" className="!py-2" onClick={() => setPicking(true)}>{pet != null ? 'Cambiar' : 'Elegir'}</Button>
        </Card>

        {/* Pokédex */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="font-bold">📕 Pokédex</div>
            <div className="text-amber-300 font-bold text-sm">{caught.length} especies</div>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Especies distintas capturadas a lo largo de tus partidas.</div>
        </Card>

        {/* Logros */}
        <div className="grid grid-cols-1 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const got = unlocked.has(a.id)
            return (
              <Card key={a.id} className={`p-3 flex items-center gap-3 ${got ? '' : 'opacity-45'}`} style={got ? { borderColor: '#f59e0b66' } : undefined}>
                <span className="text-2xl shrink-0">{got ? a.icon : '🔒'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{a.title} {got && <span className="text-[9px] bg-amber-500 text-black px-1.5 rounded-full font-black">✓</span>}</div>
                  <div className="text-xs text-slate-400">{a.desc}</div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Selector de compañero */}
      {picking && (
        <div className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center p-3" onClick={() => setPicking(false)}>
          <div className="w-full max-w-md max-h-[88%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-extrabold">Elige compañero</div>
              <button className="text-slate-400 text-2xl px-1" onClick={() => setPicking(false)}>✕</button>
            </div>
            {caught.length === 0 ? <p className="text-xs text-slate-500 py-6 text-center">Captura Pokémon para elegir compañero.</p> : (
              <div className="grid grid-cols-4 gap-2">
                {pet != null && <button onClick={() => { void setPet(null); setPicking(false) }} className="rounded-xl border border-slate-700 bg-slate-800 p-1 grid place-items-center text-[10px] text-slate-400">Quitar</button>}
                {[...caught].sort((a, b) => a - b).map((id) => (
                  <button key={id} onClick={() => { void setPet(id); setPicking(false) }} className={`rounded-xl border p-1 active:scale-95 ${pet === id ? 'border-amber-400' : 'border-slate-700'}`} style={{ background: 'rgba(15,23,42,0.6)' }}>
                    <Sprite speciesId={id} className="w-12 h-12 object-contain mx-auto" />
                    <div className="text-[8px] truncate text-center">{getSpecies(id).displayName}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
