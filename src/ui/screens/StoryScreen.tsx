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
import { EXPERIMENTS, ROLE_ES, type Experiment, type ExpType } from '@/data/story/experiments'
import type { PokemonType } from '@/types'

type Phase = 'hub' | 'intro' | 'starter'

function ResultBadge({ t }: { t: ExpType }) {
  return t === 'sonoro' ? <SonoroBadge size="sm" /> : <TypeBadge type={t as PokemonType} size="sm" />
}

function DossierModal({ onClose }: { onClose: () => void }) {
  const roles: Experiment['role'][] = ['prototipo', 'modificado', 'inestable']
  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92%] overflow-y-auto no-scrollbar rounded-3xl border border-fuchsia-500/40 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-extrabold inline-flex items-center gap-1.5"><SonoroWave className="w-5 h-5 text-fuchsia-300" /> Dossier clasificado</div>
          <button className="text-slate-400 px-1" onClick={onClose}><Icon name="x" className="w-5 h-5" /></button>
        </div>
        <p className="text-[11px] text-slate-400 mb-2">Pokémon capturados por los científicos para inyectarles el gen del tipo Sonoro.</p>
        {roles.map((role) => (
          <div key={role} className="mb-3">
            <div className="text-[11px] font-black uppercase tracking-wide text-fuchsia-300 mb-1 px-0.5">{ROLE_ES[role]}</div>
            <div className="flex flex-col gap-1.5">
              {EXPERIMENTS.filter((e) => e.role === role).map((e) => (
                <div key={e.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-2 flex gap-2">
                  <Sprite speciesId={e.id} className="w-12 h-12 object-contain shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 flex-wrap text-[10px] text-slate-400">
                      {e.original.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
                      <Icon name="arrowRight" className="w-3 h-3 text-slate-500" />
                      {e.result.map((t, i) => <ResultBadge key={i} t={t} />)}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">{e.lore}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StoryScreen() {
  const { back, startRun, storyCompleted } = useGame()
  const [phase, setPhase] = useState<Phase>('hub')
  const [chapterId, setChapterId] = useState<number>(1)
  const chapter = CHAPTERS.find((c) => c.id === chapterId) ?? CHAPTERS[0]
  const [line, setLine] = useState(0)
  const [starter, setStarter] = useState<number | null>(null)
  const [dossier, setDossier] = useState(false)
  const unlocked = (id: number) => id === 1 || storyCompleted.includes(id - 1)

  // --- Cinemática de introducción ---
  if (phase === 'intro') {
    const l = chapter.intro[line]
    const last = line >= chapter.intro.length - 1
    const advance = () => (last ? setPhase('starter') : setLine((i) => i + 1))
    return (
      <div className="flex flex-col flex-1 relative overflow-hidden select-none" onClick={advance}
        style={{ background: `linear-gradient(rgba(2,6,23,0.55), rgba(2,6,23,0.85)), url(${chapter.bg}) center/cover` }}>
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
      <div className="flex flex-col flex-1" style={{ background: `linear-gradient(rgba(2,6,23,0.66), rgba(2,6,23,0.88)), url(${chapter.bg}) center/cover` }}>
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
            onClick={() => starter !== null && startRun({ gen: chapter.gen, pools: [chapter.gen], random: false, starterId: starter, difficulty: 'normal', story: chapter.id })}>
            <span className="inline-flex items-center justify-center gap-1.5"><Icon name="play" className="w-4 h-4" /> ¡Zarpar!</span>
          </Button>
        </div>
      </div>
    )
  }

  // --- Hub del capítulo ---
  return (
    <div className="flex flex-col flex-1" style={{ background: `linear-gradient(rgba(2,6,23,0.62), rgba(2,6,23,0.86)), url(${chapter.bg}) center/cover` }}>
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

        {/* Lista de capítulos */}
        {CHAPTERS.map((ch) => {
          const open = unlocked(ch.id)
          const done = storyCompleted.includes(ch.id)
          return (
            <div key={ch.id} className={`rounded-2xl border p-4 ${open ? 'border-slate-700 bg-slate-800/60' : 'border-slate-800 bg-slate-900/50 opacity-70'}`}>
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wide text-slate-400 font-bold">{ch.title}</div>
                {done && <span className="text-[10px] font-black bg-emerald-500 text-black px-1.5 rounded-full inline-flex items-center gap-1"><Icon name="check" className="w-3 h-3" /> COMPLETADO</span>}
                {!open && <span className="text-slate-500 inline-flex items-center gap-1 text-[11px]"><Icon name="lock" className="w-3.5 h-3.5" /> Bloqueado</span>}
              </div>
              <div className="text-xl font-extrabold mb-2">{ch.subtitle}</div>
              <p className="text-sm text-slate-300">{ch.synopsis}</p>
              {open ? (
                <Button full variant="primary" className="mt-3" onClick={() => { setChapterId(ch.id); setStarter(null); setLine(0); setPhase('intro') }}>
                  <span className="inline-flex items-center justify-center gap-1.5"><Icon name="play" className="w-4 h-4" /> {done ? 'Volver a jugar' : 'Comenzar capítulo'}</span>
                </Button>
              ) : (
                <div className="mt-3 text-[11px] text-slate-500 inline-flex items-center gap-1.5"><Icon name="lock" className="w-3.5 h-3.5" /> Completa el {CHAPTERS.find((c) => c.id === ch.id - 1)?.title ?? 'capítulo anterior'} para desbloquearlo.</div>
              )}
            </div>
          )
        })}

        {/* El tipo Sonoro (teaser) */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
          <div className="flex items-center gap-2 mb-1.5"><SonoroBadge /> <span className="text-[11px] text-slate-400">tipo artificial</span></div>
          <p className="text-[12px] text-slate-300">Un tipo nacido en los laboratorios de la isla, no en la naturaleza. Sus frecuencias destrozan a los Pokémon… pero su inestabilidad puede volverse en su contra. Aún no ha sido liberado: lo descubrirás más adentro.</p>
          <Button full variant="secondary" className="mt-2.5 !py-2" onClick={() => setDossier(true)}>
            <span className="inline-flex items-center justify-center gap-1.5"><Icon name="scroll" className="w-4 h-4" /> Dossier de experimentos</span>
          </Button>
        </div>
      </div>
      {dossier && <DossierModal onClose={() => setDossier(false)} />}
    </div>
  )
}
