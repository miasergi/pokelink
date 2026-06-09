import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { getSpecies } from '@/data'
import Sprite from '@/ui/components/Sprite'
import Icon from '@/ui/components/Icon'
import TypeBadge from '@/ui/components/TypeBadge'
import SonoroBadge, { SonoroWave } from '@/ui/components/SonoroBadge'
import { SONORO_GRADIENT } from '@/data/story/sonoro'
import { CHAPTERS, KANTO_STARTERS } from '@/data/story/chapters'

type Phase = 'hub' | 'intro' | 'starter'

export default function StoryScreen() {
  const { back, startRun } = useGame()
  const chapter = CHAPTERS[0]
  const [phase, setPhase] = useState<Phase>('hub')
  const [line, setLine] = useState(0)
  const [starter, setStarter] = useState<number | null>(null)

  // --- Cinemática de introducción ---
  if (phase === 'intro') {
    const l = chapter.intro[line]
    const last = line >= chapter.intro.length - 1
    const advance = () => (last ? setPhase('starter') : setLine((i) => i + 1))
    return (
      <div className="flex flex-col flex-1 relative overflow-hidden select-none" onClick={advance}
        style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(124,58,237,0.18), rgba(2,6,23,0.96) 60%)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: SONORO_GRADIENT }} />
        <div className="flex-1 grid place-items-center p-6">
          <SonoroWave className="w-16 h-16 text-fuchsia-400/30 animate-pulse" />
        </div>
        <div className="p-4 safe-bottom">
          <div className="max-w-md mx-auto rounded-2xl border border-slate-700 bg-slate-900/95 p-4 min-h-[120px] flex flex-col">
            {l.speaker && <div className="text-[11px] font-black uppercase tracking-wide text-fuchsia-300 mb-1">{l.speaker}</div>}
            <p className={`text-sm leading-relaxed ${l.glitch ? 'glitch-text text-slate-100' : 'text-slate-200'}`}>{l.text}</p>
            <div className="mt-auto pt-2 text-right text-[11px] text-slate-500 animate-pulse">{last ? 'Elegir compañero ›' : 'Toca para continuar ›'}</div>
          </div>
        </div>
      </div>
    )
  }

  // --- Elegir inicial (Kanto, de momento) ---
  if (phase === 'starter') {
    return (
      <div className="flex flex-col flex-1">
        <TopBar title="Elige a tu compañero" left={<Button variant="ghost" onClick={() => setPhase('intro')}>‹</Button>} />
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
          <p className="text-sm text-slate-300 text-center">Será tu primer aliado en la travesía hacia Mistery Island.</p>
          <div className="grid grid-cols-1 gap-3">
            {KANTO_STARTERS.map((id) => {
              const sp = getSpecies(id)
              const sel = starter === id
              return (
                <button key={id} onClick={() => setStarter(id)}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${sel ? 'border-fuchsia-400 bg-fuchsia-500/10' : 'border-slate-700 bg-slate-800/60'}`}>
                  <Sprite speciesId={id} className="w-16 h-16 object-contain" />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold">{sp.displayName}</div>
                    <div className="flex gap-1 mt-1">{sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
                  </div>
                  {sel && <Icon name="check" className="w-5 h-5 text-fuchsia-300" />}
                </button>
              )
            })}
          </div>
          <Button full variant="primary" className="mt-1" disabled={starter === null}
            onClick={() => starter !== null && startRun({ gen: chapter.gen, pools: [chapter.gen], random: false, starterId: starter, difficulty: 'normal' })}>
            <span className="inline-flex items-center justify-center gap-1.5"><Icon name="play" className="w-4 h-4" /> ¡Zarpar!</span>
          </Button>
        </div>
      </div>
    )
  }

  // --- Hub del capítulo ---
  return (
    <div className="flex flex-col flex-1">
      <TopBar title={<span className="inline-flex items-center gap-2"><SonoroWave className="w-5 h-5 text-fuchsia-300" /> Modo Historia</span>} left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
        {/* Misterio: la isla prohibida */}
        <div className="rounded-2xl border border-fuchsia-500/40 p-4 text-center relative overflow-hidden"
          style={{ background: 'radial-gradient(120% 120% at 50% 0%, rgba(124,58,237,0.22), rgba(2,6,23,0.7) 70%)' }}>
          <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{ backgroundImage: SONORO_GRADIENT }} />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.25em] text-fuchsia-300/80 font-bold">Entrada prohibida</div>
            <div className="text-2xl font-black mt-1" style={{ backgroundImage: SONORO_GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>MISTERY ISLAND</div>
            <p className="text-[11px] text-slate-300 mt-1">Experimentos prohibidos. Un tipo que no debería existir.</p>
          </div>
        </div>

        {/* Tarjeta del Capítulo 1 */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-400 font-bold">{chapter.title}</div>
          <div className="text-xl font-extrabold mb-2">{chapter.subtitle}</div>
          <p className="text-sm text-slate-300">{chapter.synopsis}</p>
          <Button full variant="primary" className="mt-3" onClick={() => { setLine(0); setPhase('intro') }}>
            <span className="inline-flex items-center justify-center gap-1.5"><Icon name="play" className="w-4 h-4" /> Comenzar capítulo</span>
          </Button>
        </div>

        {/* El tipo Sonoro (teaser) */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
          <div className="flex items-center gap-2 mb-1.5"><SonoroBadge /> <span className="text-[11px] text-slate-400">tipo artificial</span></div>
          <p className="text-[12px] text-slate-300">Un tipo nacido en los laboratorios de la isla, no en la naturaleza. Sus frecuencias destrozan a los Pokémon… pero su inestabilidad puede volverse en su contra. Aún no ha sido liberado: lo descubrirás más adentro.</p>
        </div>
      </div>
    </div>
  )
}
