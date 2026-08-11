// CORTE DE SUPERTÉCNICA: la pantalla que se come el partido cuando alguien
// lanza una técnica, con su imagen real y su nombre.
//
// Es lo que hace que una supertécnica se sienta como tal. El motor no sabe nada
// de esto: la pantalla del partido mira los eventos que van llegando y, cuando
// ve una técnica, la enseña aquí un segundo antes de seguir con la narración.
import { useEffect, useState } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { getTechnique, TECHNIQUES } from '@/data/inazuma/techniques'
import { ELEMENT_ICON, techniqueImage } from '@/ui/inazuma/Glyphs'
import type { MatchEvent } from '@/engine/inazuma/types'

/** Cuánto se queda en pantalla. Corto a propósito: no interrumpe el ritmo. */
const HOLD_MS = 1150

export interface CutIn {
  /** Clave única para reiniciar la animación aunque se repita la técnica. */
  key: number
  name: string
  id: string | null
  mine: boolean
}

/**
 * Saca de un evento la técnica que hay que enseñar, si la hay. La comparación
 * es por NOMBRE porque es lo que traen los eventos; se resuelve al catálogo
 * para poder pintar la imagen.
 */
export function cutInFrom(event: MatchEvent, mineSide: 'home' | 'away', seq: number): CutIn | null {
  const named = (name: string | undefined, mine: boolean): CutIn | null => {
    if (!name) return null
    const tech = getTechnique(idOf(name)) ?? findByName(name)
    return { key: seq, name, id: tech?.id ?? null, mine }
  }
  switch (event.kind) {
    case 'duel':
      return named(event.technique, event.side === mineSide)
    case 'goal':
      return named(event.technique, event.side === mineSide)
    case 'save':
      return named(event.technique, event.side === mineSide)
    case 'penalty':
      return named(event.technique, event.side === mineSide)
    default:
      return null
  }
}

const idOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

/** Índice nombre → id, construido una vez: el catálogo no cambia en runtime. */
const BY_NAME = new Map(TECHNIQUES.map((t) => [t.name.toLowerCase(), t.id]))
function findByName(name: string) {
  const id = BY_NAME.get(name.toLowerCase())
  return id ? getTechnique(id) : undefined
}

/** Id de una técnica a partir del nombre que traen los eventos del motor. */
export function techniqueIdByName(name: string): string | null {
  return (getTechnique(idOf(name)) ?? findByName(name))?.id ?? null
}

export default function TechniqueCutIn({ cut, onDone }: { cut: CutIn | null; onDone: () => void }) {
  const [shown, setShown] = useState<CutIn | null>(null)

  useEffect(() => {
    if (!cut) return
    setShown(cut)
    const t = setTimeout(() => { setShown(null); onDone() }, HOLD_MS)
    return () => clearTimeout(t)
  }, [cut, onDone])

  if (!shown) return null
  const tech = shown.id ? getTechnique(shown.id) : undefined
  const info = ELEMENT_INFO[tech?.element ?? 'aire']

  return (
    <div
      key={shown.key}
      className="absolute inset-0 z-[60] grid place-items-center pointer-events-none animate-cutin"
    >
      {/* Bandas diagonales: el recurso de toda la vida del anime. */}
      <div
        className="absolute inset-x-0 h-32"
        style={{
          background: `linear-gradient(90deg, transparent, ${info.color}55 20%, ${info.color}aa 50%, ${info.color}55 80%, transparent)`,
          transform: 'skewY(-6deg)',
        }}
      />
      <div className="relative flex flex-col items-center gap-1">
        <div
          className="w-28 h-28 rounded-2xl overflow-hidden border-4 grid place-items-center bg-slate-950 animate-pop-in"
          style={{ borderColor: info.color, boxShadow: `0 0 28px ${info.color}` }}
        >
          <ImgFallback
            src={shown.id ? techniqueImage(shown.id) : ''}
            alt={shown.name}
            className="w-full h-full object-cover"
            fallback={<Icon name={ELEMENT_ICON[tech?.element ?? 'aire']} className="w-14 h-14" style={{ color: info.color }} />}
          />
        </div>
        <div
          className="px-3 py-1 rounded-full text-sm font-extrabold uppercase tracking-wider bg-slate-950/85 border"
          style={{ color: info.color, borderColor: `${info.color}88` }}
        >
          {shown.name}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">
          {shown.mine ? '¡vuestra!' : 'del rival'}
        </div>
      </div>
    </div>
  )
}
