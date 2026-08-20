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

/** Qué dice Chester y con qué cara. FRASES CORTAS: el partido cambia rápido
 * y los párrafos del motor no daban tiempo a leerse. */
function chester(e: MatchEvent | undefined): { text: string; mood: Mood } {
  if (!e) return { text: '¡Muy buenas! Chester Horley desde la cabina.', mood: 'calma' }
  const text = 'text' in e && typeof e.text === 'string' && e.text ? e.text : ''
  const first = (n: string) => n.split(' ')[0]
  switch (e.kind) {
    case 'kickoff': return { text: '¡Rueda el balón! Chester Horley, con ustedes.', mood: 'calma' }
    // Si el portero INTENTÓ una técnica y no bastó, se dice: gastó sus PT y
    // sin mención parecía que la parada nunca había existido.
    case 'goal': return {
      text: e.keeperTech
        ? `¡GOOOOOL de ${first(e.scorer)}! ¡Ni la ${e.keeperTech} de ${first(e.keeper ?? '')} la para!`
        : `¡GOOOOOL de ${first(e.scorer)}!${e.technique ? ` ¡${e.technique}!` : ''}`,
      mood: 'euforia',
    }
    // El portero SACA su técnica: aún no se sabe si basta. Puro drama.
    case 'keeperTry': return { text: `¡${first(e.keeper)} saca su ${e.technique}!`, mood: 'drama' }
    case 'save': return {
      text: e.technique
        // La técnica ya se contó en su momento (keeperTry): esto es el
        // VEREDICTO a secas.
        ? `¡LA PARA! ¡Enorme ${first(e.keeper)}!`
        : `¡${first(e.keeper)} la para!`,
      mood: 'drama',
    }
    case 'penalty': return { text, mood: 'tension' }
    case 'duel': {
      if (e.step === 'definicion' && !e.intercept) {
        return { text: e.technique ? `¡${first(e.attacker)} dispara con ${e.technique}!` : `¡Dispara ${first(e.attacker)}!`, mood: 'tension' }
      }
      if (e.intercept) {
        return {
          text: e.success
            ? `¡El tiro pasa rozando a ${first(e.defender)}!`
            : `¡${first(e.defender)} bloquea${e.counter ? ` con ${e.counter}` : ''}!`,
          mood: 'tension',
        }
      }
      // Duelo de campo: regate contra corte, en una línea.
      return {
        text: e.success
          ? `¡${first(e.attacker)} regatea${e.technique ? ` con ${e.technique}` : ''} a ${first(e.defender)}!`
          : `¡${first(e.defender)} corta${e.counter ? ` con ${e.counter}` : ''} a ${first(e.attacker)}!`,
        mood: 'calma',
      }
    }
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
  // PLANO DE GOL: al marcar, la tele corta a Chester en pleno éxtasis.
  const [golCam, setGolCam] = useState<{ key: number } | null>(null)
  const seen = useRef(0)
  useEffect(() => {
    if (feed.length === seen.current) return
    seen.current = feed.length
    const e = feed[feed.length - 1]
    const prev = feed[feed.length - 2]
    // GOL: el plano de la celebración PISA cualquier imagen anterior (la del
    // intento del portero incluida) y dura lo que dura la celebración.
    if (e?.kind === 'goal') {
      setTech(null)
      const key = feed.length
      setGolCam({ key })
      setTimeout(() => setGolCam((s) => (s?.key === key ? null : s)), 3400)
      return
    }
    // Tras un cruce SUPERADO, el duelo con el portero es el MISMO disparo:
    // no se vuelve a cortar a la imagen del tiro.
    const grazedPrev = prev?.kind === 'duel' && prev.intercept === true && prev.success
    const name = e?.kind === 'duel'
      ? (grazedPrev ? undefined : e.step === 'definicion' && !e.intercept
        ? e.technique
        : e.intercept
          ? (e.success ? e.technique : e.counter ?? e.technique)
          : (e.success ? e.technique ?? e.counter : e.counter ?? e.technique))
      // El MOMENTO del portero: su técnica en imagen ANTES del veredicto.
      // La parada posterior ya no re-corta (la imagen sería la misma).
      : e?.kind === 'keeperTry'
        ? e.technique
        : e?.kind === 'save'
          ? (prev?.kind === 'keeperTry' ? undefined : e.technique)
          : e?.kind === 'penalty'
            ? e.technique
            : undefined
    if (!name) {
      // Sin imagen propia: la PARADA deja respirar a la del intento del
      // portero (se va sola a los 2.6 s, «un pelín más»); cualquier otro
      // evento corta a Chester AL MOMENTO — una imagen jamás sobrevive a la
      // reanudación del juego.
      if (e?.kind !== 'save') { setTech(null); setGolCam(null) }
      return
    }
    const key = feed.length
    setTech({ name, key })
    setGolCam(null)
    // OJO: SIN cleanup. Si el timer se limpiara al llegar el siguiente
    // evento (como hacía), una imagen cuyo evento retiene menos de 2.6 s se
    // quedaba PILLADA para siempre — el guard por `key` ya evita que un
    // timer viejo borre una imagen más nueva.
    setTimeout(() => setTech((s) => (s?.key === key ? null : s)), 2600)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.length])

  const techInfo = tech ? techniqueByName(tech.name) : undefined
  const accent = techInfo ? ELEMENT_INFO[techInfo.element].color : mood === 'euforia' ? '#fbbf24' : mood === 'drama' ? '#f87171' : mood === 'tension' ? '#f59e0b' : '#334155'

  return (
    <div className="shrink-0 px-2 pt-1.5">
      <div
        key={mood === 'euforia' ? `gol-${feed.length}` : 'tv'}
        className={`relative flex h-[120px] rounded-2xl border-2 bg-slate-950 overflow-hidden transition-colors ${mood === 'euforia' ? 'tv-shake' : ''}`}
        style={{ borderColor: accent, boxShadow: `0 0 18px ${accent}44` }}
      >
        {/* LA PANTALLA: Chester (o la técnica, cuando salta una; o el PLANO
            DE GOL, con Chester en éxtasis, cuando el balón entra). */}
        <div className="relative w-[190px] shrink-0 overflow-hidden bg-slate-900">
          {golCam ? (
            <div key={`gol-${golCam.key}`} className="absolute inset-0 animate-pop-in">
              <ImgFallback
                src={`${BASE}inazuma/chester-gol.png`}
                // Chester sale en el TERCIO DERECHO del fotograma: se encuadra
                // ahí (object-right) para que el éxtasis no quede recortado.
                className="w-full h-full object-cover object-right tv-zoom"
                alt="¡GOL!"
                fallback={<span className="grid place-items-center w-full h-full text-lg font-black text-amber-300">¡GOOOL!</span>}
              />
            </div>
          ) : techInfo ? (
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
          <p key={feed.length} className="mt-1 text-[12px] leading-snug text-slate-200 font-semibold line-clamp-3 animate-fade-in">
            {text || 'El balón circula. Se mastica la tensión, señores.'}
          </p>
        </div>
      </div>
    </div>
  )
}
