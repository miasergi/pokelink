// LA TELE DEL PARTIDO: Chester Horley comentando desde su cabina, en un
// recuadro tipo cámara de streamer. Reacciona a lo que pasa (temblor y zoom
// en los goles, flash en las paradas, borde del elemento en las técnicas) y
// cuando salta una supertécnica enseña SU imagen de la wiki con nombre y
// potencia. Sustituye al ticker de texto: el partido se cuenta AQUÍ.
import { useEffect, useRef, useState } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import { techniqueByName } from '@/ui/inazuma/DuelStage'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import type { MatchEvent } from '@/engine/inazuma/types'

const BASE = import.meta.env.BASE_URL

type Mood = 'calma' | 'tension' | 'euforia' | 'drama'

/** Qué dice Chester y con qué cara, según el último evento contado. */
function chester(e: MatchEvent | undefined): { text: string; mood: Mood } {
  if (!e) return { text: '¡Muy buenas! Les habla Chester Horley desde la cabina. ¡Esto está a punto de empezar!', mood: 'calma' }
  const text = 'text' in e && typeof e.text === 'string' && e.text ? e.text : ''
  switch (e.kind) {
    case 'kickoff': return { text: '¡Rueda el balón! Chester Horley, con ustedes.', mood: 'calma' }
    case 'goal': return { text: text || '¡GOOOOOL!', mood: 'euforia' }
    case 'save': return { text, mood: 'drama' }
    case 'penalty': return { text, mood: 'tension' }
    case 'duel': return { text, mood: e.step === 'definicion' ? 'tension' : 'calma' }
    case 'halftime': return { text: 'Descanso. Un respiro, que falta hace.', mood: 'calma' }
    case 'fulltime': return { text: '¡Y hasta aquí el partido, amigos!', mood: 'calma' }
    case 'tactic': return { text, mood: 'tension' }
    default: return { text, mood: 'calma' }
  }
}

export default function ChesterTV({ feed, clock }: { feed: MatchEvent[]; clock: number }) {
  const last = feed[feed.length - 1]
  const { text, mood } = chester(last)

  // LA TÉCNICA EN PANTALLA: al contarse un evento con supertécnica, la tele
  // corta a su imagen 2.6 s y vuelve a Chester.
  const [tech, setTech] = useState<{ name: string; key: number } | null>(null)
  const seen = useRef(0)
  useEffect(() => {
    if (feed.length === seen.current) return
    seen.current = feed.length
    const e = feed[feed.length - 1]
    const name = e?.kind === 'duel'
      ? e.technique ?? e.counter
      : e?.kind === 'save' || e?.kind === 'penalty'
        ? e.technique
        : undefined
    if (!name) return
    const key = feed.length
    setTech({ name, key })
    const t = setTimeout(() => setTech((s) => (s?.key === key ? null : s)), 2600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.length])

  const techInfo = tech ? techniqueByName(tech.name) : undefined
  const accent = techInfo ? ELEMENT_INFO[techInfo.element].color : mood === 'euforia' ? '#fbbf24' : mood === 'drama' ? '#f87171' : mood === 'tension' ? '#f59e0b' : '#334155'

  return (
    <div className="shrink-0 px-2 pt-1.5">
      <div
        key={mood === 'euforia' ? `gol-${feed.length}` : 'tv'}
        className={`relative flex h-[106px] rounded-2xl border-2 bg-slate-950 overflow-hidden transition-colors ${mood === 'euforia' ? 'tv-shake' : ''}`}
        style={{ borderColor: accent, boxShadow: `0 0 18px ${accent}44` }}
      >
        {/* LA PANTALLA: Chester (o la técnica, cuando salta una). */}
        <div className="relative w-[168px] shrink-0 overflow-hidden bg-slate-900">
          {techInfo ? (
            <div key={tech!.key} className="absolute inset-0 animate-pop-in">
              <ImgFallback
                src={`${BASE}inazuma/techniques/${techInfo.id}.png`}
                className="w-full h-full object-cover"
                alt={techInfo.name}
                fallback={<span className="grid place-items-center w-full h-full text-[10px] font-bold text-slate-400 px-1 text-center">{techInfo.name}</span>}
              />
              <span
                className="absolute inset-x-0 bottom-0 px-1 py-0.5 text-center text-[8px] font-extrabold uppercase tracking-wide bg-slate-950/85 truncate"
                style={{ color: ELEMENT_INFO[techInfo.element].color }}
              >
                {techInfo.name} · {techInfo.power}
              </span>
            </div>
          ) : (
            <ImgFallback
              src={`${BASE}inazuma/chester.png`}
              className={`w-full h-full object-cover ${mood === 'euforia' ? 'tv-zoom' : mood === 'drama' ? 'tv-blink' : ''}`}
              alt="Chester Horley"
              fallback={<span className="grid place-items-center w-full h-full text-2xl font-black text-slate-500">CH</span>}
            />
          )}
          {/* Scanlines + chip EN DIRECTO: la textura de tele. */}
          <span className="absolute inset-0 pointer-events-none opacity-25" style={{ background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.5) 2px 3px)' }} />
          <span className="absolute top-1 left-1 inline-flex items-center gap-1 rounded-sm bg-slate-950/85 px-1 py-[1px] text-[7px] font-extrabold uppercase tracking-widest text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Directo
          </span>
        </div>

        {/* EL COMENTARIO: lo que antes contaba el ticker, con voz propia. */}
        <div className="flex-1 min-w-0 px-2.5 py-1.5 flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-black tabular-nums" style={{ color: accent === '#334155' ? '#94a3b8' : accent }}>
              {Math.min(120, Math.max(0, Math.floor(clock)))}&apos;
            </span>
            <span className="text-[8px] uppercase tracking-widest text-slate-500 truncate">Chester Horley · comentarista</span>
          </div>
          <p key={feed.length} className="mt-0.5 text-[11px] leading-snug text-slate-200 font-semibold line-clamp-3 animate-fade-in">
            {text || 'El balón circula. Se mastica la tensión, señores.'}
          </p>
        </div>
      </div>
    </div>
  )
}
