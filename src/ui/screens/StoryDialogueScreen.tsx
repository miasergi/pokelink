import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { SonoroWave } from '@/ui/components/SonoroBadge'
import { SONORO_GRADIENT } from '@/data/story/sonoro'
import { CHAPTERS } from '@/data/story/chapters'

/** Cinemática de diálogos del Modo Historia (pre-jefe y outro del capítulo). */
export default function StoryDialogueScreen() {
  const { storyScene, storySceneDone } = useGame()
  const [line, setLine] = useState(0)
  const [finished, setFinished] = useState(false)
  if (!storyScene) return null
  const { lines, kind } = storyScene
  const l = lines[Math.min(line, lines.length - 1)]
  const last = line >= lines.length - 1
  const advance = () => {
    if (!last) { setLine((i) => i + 1); return }
    if (kind === 'outro') setFinished(true) // muestra la tarjeta de capítulo completado
    else storySceneDone() // pre-jefe -> empieza el combate
  }

  // --- Capítulo completado (tras el outro) ---
  if (finished) {
    const ch = CHAPTERS[0]
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6 gap-4 text-center relative overflow-hidden"
        style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(124,58,237,0.22), rgba(2,6,23,0.96) 60%)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{ backgroundImage: SONORO_GRADIENT }} />
        <SonoroWave className="w-16 h-16 text-fuchsia-300 animate-float" />
        <div className="text-[11px] uppercase tracking-[0.25em] text-fuchsia-300/80 font-bold relative">Capítulo completado</div>
        <div className="text-3xl font-black relative" style={{ backgroundImage: SONORO_GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{ch.subtitle}</div>
        <p className="text-sm text-slate-300 max-w-xs relative">Has cruzado el Archipiélago de Niebla. El ferry te lleva hacia lo prohibido… y algo en la isla ya ha notado tu llegada.</p>
        <Button variant="primary" className="mt-2 relative" onClick={storySceneDone}>
          <span className="inline-flex items-center justify-center gap-1.5">Continuar <Icon name="arrowRight" className="w-4 h-4" /></span>
        </Button>
        <div className="text-[11px] text-slate-500 relative">Próximamente: Capítulo 2 — La Costa Prohibida</div>
      </div>
    )
  }

  // --- Diálogo ---
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
          <div className="mt-auto pt-2 text-right text-[11px] text-slate-500 animate-pulse">
            {last ? (kind === 'outro' ? 'Continuar ›' : '¡Al combate! ›') : 'Toca para continuar ›'}
          </div>
        </div>
      </div>
    </div>
  )
}
