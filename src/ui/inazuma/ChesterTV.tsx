// LA TELE DEL PARTIDO: Chester Horse comentando desde su cabina, en un
// recuadro tipo cámara de streamer. Reacciona a lo que pasa (temblor y zoom
// en los goles, flash en las paradas, borde del elemento en las técnicas) y
// cuando salta una supertécnica enseña SU imagen de la wiki con nombre y
// potencia. Sustituye al ticker de texto: el partido se cuenta AQUÍ.
import { useEffect, useRef, useState } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import { techniqueByName } from '@/ui/inazuma/DuelStage'
import { techVideo } from '@/data/inazuma/tech-videos'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import type { MatchEvent } from '@/engine/inazuma/types'

const BASE = import.meta.env.BASE_URL

type Mood = 'calma' | 'tension' | 'euforia' | 'drama'

/** Qué dice Chester y con qué cara. FRASES CORTAS: el partido cambia rápido
 * y los párrafos del motor no daban tiempo a leerse.
 *
 * VARIEDAD: cada situación tiene varias formas de contarse y se elige una de
 * forma DETERMINISTA por evento (minuto + protagonistas) — mismas frases en
 * cada re-render, distintas a lo largo del partido. Sin esto, Chester sonaba
 * a contestador automático. */
function chester(e: MatchEvent | undefined, prev?: MatchEvent): { text: string; mood: Mood } {
  if (!e) return { text: '¡Muy buenas! Chester Horse desde la cabina.', mood: 'calma' }
  const text = 'text' in e && typeof e.text === 'string' && e.text ? e.text : ''
  const first = (n: string) => n.split(' ')[0]
  // Semilla estable del evento: minuto y largo del texto bastan para variar.
  const va = (opts: string[]): string => opts[Math.abs(e.minute * 7 + text.length) % opts.length]
  switch (e.kind) {
    case 'kickoff': return {
      text: va([
        '¡Rueda el balón! Chester Horse, con ustedes.',
        '¡Arranca el partido! Aquí Chester Horse, en cabina.',
        '¡En pie todo el mundo, que esto ya está en marcha!',
      ]),
      mood: 'calma',
    }
    // Si el portero INTENTÓ una técnica y no bastó, se dice: gastó sus PT y
    // sin mención parecía que la parada nunca había existido.
    case 'goal': return {
      text: e.keeperTech
        ? va([
          `¡GOOOOOL de ${first(e.scorer)}! ¡Ni la ${e.keeperTech} de ${first(e.keeper ?? '')} la para!`,
          `¡La ${e.keeperTech} de ${first(e.keeper ?? '')} no basta! ¡GOOOOOL de ${first(e.scorer)}!`,
          `¡GOL, GOL, GOOOL! ¡${first(e.scorer)} rompe la ${e.keeperTech} de ${first(e.keeper ?? '')}!`,
        ])
        : va([
          `¡GOOOOOL de ${first(e.scorer)}!${e.technique ? ` ¡${e.technique}!` : ''}`,
          `¡GOL, GOL, GOOOL de ${first(e.scorer)}!`,
          `¡${first(e.scorer)} la manda a la red! ¡GOOOOOL!`,
          `¡Balón dentro! ¡GOOOOOL de ${first(e.scorer)}!${e.technique ? ` ¡Menuda ${e.technique}!` : ''}`,
        ]),
      mood: 'euforia',
    }
    // El portero SACA su técnica: aún no se sabe si basta. Puro drama.
    case 'keeperTry': return {
      text: va([
        `¡${first(e.keeper)} saca su ${e.technique}!`,
        `¡${e.technique}! ${first(e.keeper)} se juega el tipo.`,
        `¡${first(e.keeper)} responde con su ${e.technique}!`,
      ]),
      mood: 'drama',
    }
    // El CHUT lejano se canta ANTES del cruce de la defensa.
    case 'longshotKick': return {
      text: e.technique
        ? va([
          `¡${first(e.shooter)} dispara desde lejos con ${e.technique}!`,
          `¡${e.technique} desde tres cuartos! ${first(e.shooter)} se atreve.`,
          `¡${first(e.shooter)} lo prueba de lejos! ¡${e.technique}!`,
        ])
        : va([
          `¡${first(e.shooter)} lo intenta desde lejos!`,
          `¡Pelotazo de ${first(e.shooter)} desde su casa!`,
        ]),
      mood: 'tension',
    }
    case 'save': return {
      text: e.technique
        // La técnica ya se contó en su momento (keeperTry): esto es el
        // VEREDICTO a secas.
        ? va([
          `¡LA PARA! ¡Enorme ${first(e.keeper)}!`,
          `¡La saca ${first(e.keeper)}! ¡Qué manos!`,
          `¡Imposible marcar ahí! ¡${first(e.keeper)} la atrapa!`,
        ])
        : va([
          `¡${first(e.keeper)} la para!`,
          `¡Buenas manos de ${first(e.keeper)}!`,
          `¡${first(e.keeper)} dice que no!`,
        ]),
      mood: 'drama',
    }
    // La CARRERILLA: pura tensión, sin adelantar nada.
    case 'penaltyKick': return {
      text: e.technique
        ? va([
          `Penalti ${e.round}: ¡${first(e.shooter)} arma su ${e.technique}!`,
          `¡${first(e.shooter)} toma carrerilla con ${e.technique}! ${first(e.keeper)} bajo palos…`,
          `Se hace el silencio: ${first(e.shooter)} y su ${e.technique} contra ${first(e.keeper)}.`,
        ])
        : va([
          `Penalti ${e.round}: lanza ${first(e.shooter)}. ${first(e.keeper)} bajo palos…`,
          `Se hace el silencio en el estadio: ${first(e.shooter)} toma carrerilla…`,
        ]),
      mood: 'tension',
    }
    // El VEREDICTO del penalti: ahora sí, a gritarlo.
    case 'penalty': return {
      text: e.scored
        ? va([
          `¡GOOOOOL! ¡${first(e.shooter)} no falla!`,
          `¡Dentro! ¡${first(e.shooter)}, infalible desde los once metros!`,
          `¡La clava en la escuadra ${first(e.shooter)}!`,
        ])
        : va([
          `¡LA SACA ${first(e.keeper).toUpperCase()}! ¡Qué paradón!`,
          `¡${first(e.keeper)} se hace GIGANTE y la detiene!`,
          `¡Increíble! ¡${first(e.keeper)} le niega el gol a ${first(e.shooter)}!`,
        ]),
      mood: e.scored ? 'euforia' : 'drama',
    }
    case 'duel': {
      if (e.step === 'definicion' && !e.intercept) {
        // Continuación de un tiro lejano ROZADO: el chut ya se cantó — aquí
        // solo se sigue el vuelo (re-anunciar el disparo lo contaba doble).
        if (prev?.kind === 'duel' && prev.intercept === true && prev.success) {
          return {
            text: va([
              '¡Y aun así el balón sigue volando hacia la puerta!',
              '¡El balón llega vivo al área! ¿Qué hará el portero?',
            ]),
            mood: 'tension',
          }
        }
        return {
          text: e.technique
            ? va([
              `¡${first(e.attacker)} dispara con ${e.technique}!`,
              `¡${e.technique}! Dispara ${first(e.attacker)}.`,
              `¡Allá va ${first(e.attacker)} con su ${e.technique}!`,
            ])
            : va([`¡Dispara ${first(e.attacker)}!`, `¡${first(e.attacker)} arma la pierna!`]),
          mood: 'tension',
        }
      }
      if (e.intercept) {
        return {
          text: e.success
            ? va([
              `¡El tiro pasa rozando a ${first(e.defender)}!`,
              `¡${first(e.defender)} llega a tocarlo… pero el balón sigue!`,
            ])
            : va([
              `¡${first(e.defender)} bloquea${e.counter ? ` con ${e.counter}` : ''}!`,
              `¡Se cruza ${first(e.defender)}${e.counter ? ` con su ${e.counter}` : ''} y la saca!`,
            ]),
          mood: 'tension',
        }
      }
      // Duelo de campo: regate contra corte, en una línea.
      return {
        text: e.success
          ? va([
            `¡${first(e.attacker)} regatea${e.technique ? ` con ${e.technique}` : ''} a ${first(e.defender)}!`,
            `¡${first(e.attacker)} se va de ${first(e.defender)}${e.technique ? ` con su ${e.technique}` : ''}!`,
            `¡Qué recorte de ${first(e.attacker)}!${e.technique ? ` ¡${e.technique}!` : ''} ${first(e.defender)} se queda atrás.`,
          ])
          : va([
            `¡${first(e.defender)} corta${e.counter ? ` con ${e.counter}` : ''} a ${first(e.attacker)}!`,
            `¡${first(e.defender)} le roba la cartera a ${first(e.attacker)}${e.counter ? ` con su ${e.counter}` : ''}!`,
            `¡Por ahí no! ${first(e.defender)} frena a ${first(e.attacker)}${e.counter ? ` con ${e.counter}` : ''}.`,
          ]),
        mood: 'calma',
      }
    }
    // Una LESIÓN: mala noticia, cara de circunstancias.
    case 'injury': return { text, mood: 'drama' }
    case 'halftime': return {
      text: va(['Descanso. Un respiro, que falta hace.', 'Al vestuario. Toca recomponerse.']),
      mood: 'calma',
    }
    case 'fulltime': return {
      text: va(['¡Y hasta aquí el partido, amigos!', '¡Pitido final! Se acabó lo que se daba.']),
      mood: 'calma',
    }
    case 'tactic': return { text, mood: 'tension' }
    default: return { text, mood: 'calma' }
  }
}

export default function ChesterTV({ feed, clock }: { feed: MatchEvent[]; clock: number }) {
  const last = feed[feed.length - 1]
  const { text, mood } = chester(last, feed[feed.length - 2])

  // LA TÉCNICA EN PANTALLA: al contarse un evento con supertécnica, la tele
  // corta a su imagen 2.6 s y vuelve a Chester.
  const [tech, setTech] = useState<{ name: string; key: number; power?: number } | null>(null)
  // PLANO DE GOL: al marcar, la tele corta al balón reventando la red.
  const [golCam, setGolCam] = useState<{ key: number } | null>(null)
  // PLANO DE PARADA: el portero con la pelota atrapada, al cantar el paradón.
  // Si no tiene ese fotograma, `portrait` marca la caída a su RETRATO.
  const [saveCam, setSaveCam] = useState<{ key: number; baseId: string; portrait?: boolean } | null>(null)
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
      setSaveCam(null)
      const key = feed.length
      setGolCam({ key })
      setTimeout(() => setGolCam((s) => (s?.key === key ? null : s)), 3400)
      return
    }
    // PARADA: el plano del portero con la pelota atrapada (si tiene foto).
    if (e?.kind === 'save' && e.keeperBaseId) {
      const key = feed.length
      setSaveCam({ key, baseId: e.keeperBaseId })
      setTimeout(() => setSaveCam((s) => (s?.key === key ? null : s)), 2600)
      // La imagen de la técnica se deja viva por debajo: si la foto del
      // portero no carga, la tele cae a ella sin hueco en negro.
    }
    // Tras un cruce SUPERADO, el duelo con el portero es el MISMO disparo:
    // no se vuelve a cortar a la imagen del tiro.
    const grazedPrev = prev?.kind === 'duel' && prev.intercept === true && prev.success
    const name = e?.kind === 'duel'
      ? (grazedPrev ? undefined : e.step === 'definicion' && !e.intercept
        ? e.technique
        : e.intercept
          // El chut ya enseñó su imagen (longshotKick): en el cruce solo
          // corta al BLOQUEO si lo hay; el roce se queda con Chester.
          ? (e.success ? undefined : e.counter)
          // Duelo de campo: SOLO la técnica del GANADOR — la frase de Chester
          // narra al que gana, y enseñar la del perdedor era «una imagen que
          // no toca» (se veía el regate mientras se contaba el corte).
          : (e.success ? e.technique : e.counter))
      // El MOMENTO del portero: su técnica en imagen ANTES del veredicto.
      // La parada posterior ya no re-corta (la imagen sería la misma).
      : e?.kind === 'keeperTry'
        ? e.technique
        // El CHUT lejano: la imagen del tiro sale al chutar, no al cruce.
        : e?.kind === 'longshotKick'
          ? e.technique
        : e?.kind === 'save'
          ? (prev?.kind === 'keeperTry' ? undefined : e.technique)
          // La imagen de la técnica sale con la CARRERILLA; el veredicto ya
          // no re-corta (sería la misma imagen, y con spoiler de ritmo).
          : e?.kind === 'penaltyKick'
            ? e.technique
            : undefined
    // La potencia EFECTIVA que viaja con el evento (mejoras y bonos de combo
    // incluidos): es la que se rotula bajo la imagen.
    const power = e?.kind === 'duel'
      ? (name === e.technique ? e.power : name === e.counter ? e.counterPower : undefined)
      : e?.kind === 'keeperTry' || e?.kind === 'longshotKick' || e?.kind === 'penaltyKick'
        ? e.power
        : undefined
    if (!name) {
      // Sin imagen propia: la PARADA deja respirar a la del intento del
      // portero (se va sola a los 2.6 s, «un pelín más»); cualquier otro
      // evento corta a Chester AL MOMENTO — una imagen jamás sobrevive a la
      // reanudación del juego.
      if (e?.kind !== 'save') { setTech(null); setGolCam(null); setSaveCam(null) }
      return
    }
    const key = feed.length
    setTech({ name, key, power })
    setGolCam(null)
    setSaveCam(null)
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
                src={`${BASE}inazuma/gol.jpg`}
                // El fotograma trae BANDAS NEGRAS de cine arriba y abajo: el
                // zoom del 125 % las deja fuera del encuadre.
                className="w-full h-full object-cover scale-125"
                alt="¡GOL!"
                fallback={<span className="grid place-items-center w-full h-full text-lg font-black text-amber-300">¡GOOOL!</span>}
              />
            </div>
          ) : saveCam ? (
            <div key={`save-${saveCam.key}-${saveCam.portrait ? 'p' : 'f'}`} className="absolute inset-0 animate-pop-in">
              {/* La FOTO DEL PARADÓN: el portero con la pelota atrapada. Si
                  este portero no tiene fotograma, cae a su RETRATO (busto
                  centrado, no un recorte); y si tampoco hay retrato, el
                  segundo error tira el plano y la tele sigue con lo suyo. */}
              <img
                src={`${BASE}inazuma/${saveCam.portrait ? 'players' : 'keepers'}/${saveCam.baseId}.png`}
                className={`w-full h-full ${saveCam.portrait ? 'object-contain p-1' : 'object-cover'}`}
                alt="¡Parada!"
                onError={() => setSaveCam((s) => (s && !s.portrait ? { ...s, portrait: true } : null))}
              />
            </div>
          ) : techInfo ? (
            <div key={tech!.key} className="absolute inset-0 animate-pop-in">
              {/* Con VÍDEO de la técnica cuando lo hay (streaming del CDN de
                  inazumo): la tele enseña la supertécnica DE VERDAD. La
                  imagen queda DEBAJO como póster y respaldo si el vídeo
                  falla o aún carga. */}
              <ImgFallback
                src={`${BASE}inazuma/techniques/${techInfo.id}.png`}
                className="absolute inset-0 w-full h-full object-cover"
                alt={techInfo.name}
                fallback={<span className="grid place-items-center w-full h-full text-[10px] font-bold text-slate-400 px-1 text-center">{techInfo.name}</span>}
              />
              {techVideo(techInfo.id) && (
                <video
                  src={techVideo(techInfo.id)}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = 'none' }}
                />
              )}
              {/* Nombre y POTENCIA EFECTIVA bien visibles: «no veo su
                  potencia» era feedback literal del playtest. */}
              <span
                className="absolute inset-x-0 bottom-0 px-1 py-0.5 flex items-center justify-center gap-1 bg-slate-950/85"
                style={{ color: ELEMENT_INFO[techInfo.element].color }}
              >
                <span className="text-[8px] font-extrabold uppercase tracking-wide truncate">{techInfo.name}</span>
                <span className="shrink-0 text-[10px] font-black tabular-nums text-amber-300">{tech?.power ?? techInfo.power}</span>
                <span className="shrink-0 text-[7px] font-bold uppercase text-slate-400">pot</span>
              </span>
            </div>
          ) : (
            <ImgFallback
              src={`${BASE}inazuma/chester.png`}
              className={`w-full h-full object-cover ${mood === 'euforia' ? 'tv-zoom' : mood === 'drama' ? 'tv-blink' : ''}`}
              alt="Chester Horse"
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
            <span className="text-[8px] uppercase tracking-widest text-slate-500 truncate">Chester Horse · comentarista</span>
          </div>
          <p key={feed.length} className="mt-1 text-[12px] leading-snug text-slate-200 font-semibold line-clamp-3 animate-fade-in">
            {text || 'El balón circula. Se mastica la tensión, señores.'}
          </p>
        </div>
      </div>
    </div>
  )
}
